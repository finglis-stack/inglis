/**
 * Utilitaire pour communiquer avec un lecteur de carte à puce via WebUSB.
 * Implémente le protocole CCID pour les cartes SLE4442.
 */

const APDU = {
  READ_BINARY: [0xFF, 0xB0, 0x00],
  UPDATE_BINARY: [0xFF, 0xD0, 0x00],
  VERIFY_PSC: [0xFF, 0x20, 0x00, 0x00, 0x03, 0xFF, 0xFF, 0xFF], // Code FF FF FF
};

export class SmartCardManager {
  private device: USBDevice | null = null;
  private interfaceNumber: number = 0;
  private endpointIn: number = 0;
  private endpointOut: number = 0;
  private seq: number = 0;

  /**
   * Tente de se connecter au lecteur
   */
  async connect(): Promise<boolean> {
    try {
      this.device = await navigator.usb.requestDevice({ filters: [] });
      await this.device.open();
      
      // Sélection de la configuration
      if (this.device.configuration === null) {
        await this.device.selectConfiguration(1);
      }

      // On parcourt les interfaces pour trouver celle qui est libre
      // Chrome bloque souvent la classe 0x0B (SmartCard), c'est une limitation connue.
      const interfaces = this.device.configuration?.interfaces || [];
      let claimed = false;

      for (const iface of interfaces) {
        try {
          await this.device.claimInterface(iface.interfaceNumber);
          this.interfaceNumber = iface.interfaceNumber;
          
          // Recherche des endpoints
          const endpoints = iface.alternates[0].endpoints;
          this.endpointIn = endpoints.find(e => e.direction === 'in')?.endpointNumber || 0;
          this.endpointOut = endpoints.find(e => e.direction === 'out')?.endpointNumber || 0;

          if (this.endpointIn && this.endpointOut) {
            claimed = true;
            console.log(`Interface #${this.interfaceNumber} réclamée.`);
            break; 
          } else {
             await this.device.releaseInterface(this.interfaceNumber);
          }
        } catch (e) {
          console.warn(`Interface #${iface.interfaceNumber} inaccessible:`, e);
        }
      }

      if (!claimed) {
        throw new Error("Accès refusé par le navigateur (SecurityError). Chrome bloque souvent les lecteurs CCID natifs.");
      }

      return true;
    } catch (error) {
      console.error("Erreur connexion USB:", error);
      // On propage l'erreur pour que l'UI puisse afficher le mode simulation
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
    if (!this.device) throw new Error("Non connecté");
    
    await this.device.transferOut(this.endpointOut, this.buildCcidFrame(new Uint8Array(apdu)));
    const result = await this.device.transferIn(this.endpointIn, 64);
    
    if (!result.data) throw new Error("Pas de réponse");
    
    // Skip CCID header (10 bytes)
    return new Uint8Array(result.data.buffer, 10);
  }

  async verifyPsc(): Promise<boolean> {
    const res = await this.transmit(APDU.VERIFY_PSC);
    return this.checkSuccess(res);
  }

  async writeData(address: number, data: Uint8Array): Promise<boolean> {
    if (address < 32) throw new Error("Zone protégée (0-31). Écriture annulée.");
    
    // Commande UPDATE BINARY
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
    // 0x90 0x00 = Succès
    return sw[sw.length - 2] === 0x90 && sw[sw.length - 1] === 0x00;
  }

  async disconnect() {
    if (this.device?.opened) {
      try { await this.device.releaseInterface(this.interfaceNumber); } catch {}
      await this.device.close();
    }
  }
}

/**
 * Prépare les données dans un format binaire compact (compatible SLE4442)
 * Structure : [MAGIC 1B] [NUMERO 18B] [EXP 4B] [NOM VARIABLE]
 */
export const prepareCardData = (cardNumber: string, name: string, expiry: string): Uint8Array => {
  const enc = new TextEncoder();
  
  // Nettoyage
  const cleanNum = cardNumber.replace(/[^A-Z0-9]/g, '').padEnd(18, ' ').substring(0, 18); // 18 chars fixes
  const cleanExp = expiry.replace('/', '').substring(0, 4); // 4 chars (MMYY)
  const cleanName = name.substring(0, 30); // Max 30 chars
  
  // Construction du buffer
  // Magic byte 0xID (Inglis Dominion) pour reconnaitre nos cartes
  const magic = new Uint8Array([0x1D]); 
  const numBytes = enc.encode(cleanNum);
  const expBytes = enc.encode(cleanExp);
  const nameBytes = enc.encode(cleanName);

  const totalLength = magic.length + numBytes.length + expBytes.length + nameBytes.length;
  const finalBuffer = new Uint8Array(totalLength);

  let offset = 0;
  finalBuffer.set(magic, offset); offset += magic.length;
  finalBuffer.set(numBytes, offset); offset += numBytes.length;
  finalBuffer.set(expBytes, offset); offset += expBytes.length;
  finalBuffer.set(nameBytes, offset);

  return finalBuffer;
};