/**
 * Utilitaire pour communiquer avec un lecteur de carte à puce via WebUSB.
 * Tente de contourner les restrictions de classe 0x0B en scannant toutes les configurations.
 */

const APDU = {
  READ_BINARY: [0xFF, 0xB0, 0x00],
  UPDATE_BINARY: [0xFF, 0xD0, 0x00],
  VERIFY_PSC: [0xFF, 0x20, 0x00, 0x00, 0x03, 0xFF, 0xFF, 0xFF],
};

export class SmartCardManager {
  private device: USBDevice | null = null;
  private interfaceNumber: number = 0;
  private endpointIn: number = 0;
  private endpointOut: number = 0;
  private seq: number = 0;

  /**
   * Tente une connexion aggressive sur toutes les configurations disponibles
   */
  async connect(): Promise<boolean> {
    try {
      this.device = await navigator.usb.requestDevice({ filters: [] });
      await this.device.open();
      
      console.log(`Périphérique ouvert: ${this.device.productName} (VID:${this.device.vendorId})`);

      // Stratégie de recherche exhaustive
      // On parcourt TOUTES les configurations, pas seulement la par défaut
      const configurations = this.device.configurations;
      
      for (const config of configurations) {
        console.log(`Tentative Configuration #${config.configurationValue}...`);
        
        try {
          await this.device.selectConfiguration(config.configurationValue);
        } catch (err) {
          console.warn(`Impossible de sélectionner config ${config.configurationValue}`, err);
          continue;
        }

        // Parcours des interfaces de cette configuration
        for (const iface of config.interfaces) {
          // On vérifie chaque 'alternate' pour trouver des endpoints valides
          for (const alternate of iface.alternates) {
            const ifaceClass = alternate.interfaceClass;
            console.log(`  > Interface #${iface.interfaceNumber} (Classe 0x${ifaceClass.toString(16)})`);

            // Chrome bloque la classe 0x0B (SmartCard) par défaut.
            // Mais on tente quand même, au cas où le driver WinUSB masquerait la classe à l'OS.
            try {
              await this.device.claimInterface(iface.interfaceNumber);
              
              // Recherche des endpoints IN et OUT
              const epIn = alternate.endpoints.find(e => e.direction === 'in');
              const epOut = alternate.endpoints.find(e => e.direction === 'out');

              if (epIn && epOut) {
                this.interfaceNumber = iface.interfaceNumber;
                this.endpointIn = epIn.endpointNumber;
                this.endpointOut = epOut.endpointNumber;
                
                console.log(`  >>> SUCCÈS ! Connecté sur Interface #${this.interfaceNumber}, EP In:${this.endpointIn}, EP Out:${this.endpointOut}`);
                return true;
              } else {
                console.log("  > Pas d'endpoints valides, libération...");
                await this.device.releaseInterface(iface.interfaceNumber);
              }
            } catch (e) {
              console.warn(`  > Echec claimInterface: ${e.message}`);
              // C'est ici que l'erreur SecurityError arrive. On l'ignore et on continue la boucle.
            }
          }
        }
      }

      throw new Error("Aucune interface accessible trouvée. Chrome bloque ce lecteur (Classe 0x0B).");

    } catch (error) {
      console.error("Erreur fatale USB:", error);
      throw error;
    }
  }

  private buildCcidFrame(apdu: Uint8Array): Uint8Array {
    this.seq++;
    const length = apdu.length;
    const header = new Uint8Array([
      0x6F, length & 0xFF, (length >> 8) & 0xFF, (length >> 16) & 0xFF, (length >> 24) & 0xFF, 
      0x00, this.seq, 0x00, 0x00, 0x00
    ]);
    const frame = new Uint8Array(header.length + apdu.length);
    frame.set(header);
    frame.set(apdu, header.length);
    return frame;
  }

  async transmit(apdu: number[] | Uint8Array): Promise<Uint8Array> {
    if (!this.device || !this.endpointOut) throw new Error("Non connecté");

    // Envoi
    await this.device.transferOut(this.endpointOut, this.buildCcidFrame(new Uint8Array(apdu)));

    // Réception (taille max 64 pour standard, ajustable)
    const result = await this.device.transferIn(this.endpointIn, 64);
    
    if (!result.data) throw new Error("Pas de réponse");
    
    // Le lecteur renvoie un header CCID (10 bytes) + les données
    // On extrait juste les données
    if (result.data.byteLength > 10) {
        return new Uint8Array(result.data.buffer, 10);
    }
    return new Uint8Array(0);
  }

  async verifyPsc(): Promise<boolean> {
    const res = await this.transmit(APDU.VERIFY_PSC);
    return this.checkSuccess(res);
  }

  async writeData(address: number, data: Uint8Array): Promise<boolean> {
    if (address < 32) throw new Error("Zone protégée.");
    
    const cmd = new Uint8Array(5 + data.length);
    cmd.set(APDU.UPDATE_BINARY.slice(0, 3), 0);
    cmd[3] = address;
    cmd[4] = data.length;
    cmd.set(data, 5);

    const res = await this.transmit(cmd);
    return this.checkSuccess(res);
  }

  private checkSuccess(sw: Uint8Array): boolean {
    if (sw.length < 2) return false;
    // SW1 SW2 = 90 00
    return sw[sw.length - 2] === 0x90 && sw[sw.length - 1] === 0x00;
  }

  async disconnect() {
    if (this.device?.opened) {
      try { await this.device.releaseInterface(this.interfaceNumber); } catch {}
      await this.device.close();
    }
  }
}

export const prepareCardData = (cardNumber: string, name: string, expiry: string): Uint8Array => {
  const enc = new TextEncoder();
  const cleanNum = cardNumber.replace(/[^A-Z0-9]/g, '').substring(0, 18);
  const cleanExp = expiry.replace('/', '').substring(0, 4);
  const cleanName = name.substring(0, 30);
  
  // Format binaire simple: [MAGIC 0x1D] [NUM] [EXP] [NOM]
  const magic = new Uint8Array([0x1D]);
  const buffer = new Uint8Array(1 + cleanNum.length + cleanExp.length + cleanName.length);
  
  let i = 0;
  buffer.set(magic, i); i += 1;
  buffer.set(enc.encode(cleanNum), i); i += cleanNum.length;
  buffer.set(enc.encode(cleanExp), i); i += cleanExp.length;
  buffer.set(enc.encode(cleanName), i);

  return buffer;
};