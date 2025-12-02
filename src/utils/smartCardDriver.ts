/**
 * Utilitaire minimaliste pour communiquer avec un lecteur de carte à puce via WebUSB.
 * Implémente une version simplifiée du protocole CCID (Chip Card Interface Device).
 */

// Commandes APDU standard pour les cartes mémoires type SLE4442 via un lecteur PC/SC générique
const APDU = {
  READ_BINARY: [0xFF, 0xB0, 0x00],
  UPDATE_BINARY: [0xFF, 0xD0, 0x00],
  VERIFY_PSC: [0xFF, 0x20, 0x00, 0x00, 0x03, 0xFF, 0xFF, 0xFF], // Code par défaut FF FF FF
};

export interface SmartCardDevice {
  device: USBDevice;
  interfaceNumber: number;
  endpointIn: number;
  endpointOut: number;
}

export class SmartCardManager {
  private device: USBDevice | null = null;
  private interfaceNumber: number = 0;
  private endpointIn: number = 0;
  private endpointOut: number = 0;
  private seq: number = 0;

  /**
   * Demande à l'utilisateur de sélectionner un périphérique USB
   */
  async connect(): Promise<boolean> {
    try {
      // Filtre générique pour les lecteurs de cartes ou connexion sans filtre
      this.device = await navigator.usb.requestDevice({ filters: [] });
      
      await this.device.open();
      
      // Sélectionner la configuration (généralement 1)
      await this.device.selectConfiguration(1);
      
      // Trouver l'interface CCID (Smart Card)
      // Class Code 0x0B = Smart Card
      const interfaceCandidate = this.device.configuration?.interfaces.find(i => 
        i.alternates[0].interfaceClass === 0x0B
      ) || this.device.configuration?.interfaces[0];

      if (!interfaceCandidate) {
        throw new Error("Aucune interface compatible trouvée.");
      }

      this.interfaceNumber = interfaceCandidate.interfaceNumber;
      await this.device.claimInterface(this.interfaceNumber);

      // Trouver les endpoints (In/Out)
      const endpoints = interfaceCandidate.alternates[0].endpoints;
      this.endpointIn = endpoints.find(e => e.direction === 'in')?.endpointNumber || 0;
      this.endpointOut = endpoints.find(e => e.direction === 'out')?.endpointNumber || 0;

      console.log(`Connecté: ${this.device.productName}`);
      return true;
    } catch (error) {
      console.error("Erreur de connexion USB:", error);
      return false;
    }
  }

  /**
   * Construit une trame CCID (PC_to_RDR_XfrBlock)
   */
  private buildCcidFrame(apdu: Uint8Array): Uint8Array {
    this.seq++;
    const length = apdu.length;
    
    const header = new Uint8Array([
      0x6F,             // Message Type: PC_to_RDR_XfrBlock
      length & 0xFF,    // Length (LSB)
      (length >> 8) & 0xFF, // Length
      (length >> 16) & 0xFF, // Length
      (length >> 24) & 0xFF, // Length (MSB)
      0x00,             // Slot
      this.seq,         // Seq
      0x00,             // BWI
      0x00, 0x00        // Level Parameter
    ]);

    const frame = new Uint8Array(header.length + apdu.length);
    frame.set(header);
    frame.set(apdu, header.length);
    return frame;
  }

  /**
   * Envoie une commande et attend la réponse
   */
  async transmit(apdu: number[] | Uint8Array): Promise<Uint8Array> {
    if (!this.device) throw new Error("Périphérique non connecté");

    const commandFrame = this.buildCcidFrame(new Uint8Array(apdu));
    
    // Envoyer
    await this.device.transferOut(this.endpointOut, commandFrame);

    // Recevoir (On attend le header CCID 10 octets + données)
    // Pour simplifier, on lit 64 octets (taille standard d'un paquet USB)
    const result = await this.device.transferIn(this.endpointIn, 64);
    
    if (!result.data) throw new Error("Pas de réponse du lecteur");

    // Décoder la réponse CCID (RDR_to_PC_DataBlock starts usually with 0x80)
    const view = new DataView(result.data.buffer);
    const dataLength = view.getUint32(1, true); // Little endian length at offset 1
    
    // Les données réelles commencent à l'offset 10 (header CCID)
    const responseData = new Uint8Array(result.data.buffer, 10, dataLength);
    
    return responseData;
  }

  /**
   * SLE4442: Vérifie le code de sécurité (PSC)
   * Par défaut FF FF FF
   */
  async verifyPsc(): Promise<boolean> {
    // Commande standard PC/SC pour vérifier SLE4442: FF 20 00 00 03 FF FF FF
    const response = await this.transmit(APDU.VERIFY_PSC);
    // Si succès, SW1 SW2 est souvent 90 00
    return this.checkSuccess(response);
  }

  /**
   * SLE4442: Écrit des données
   * On écrit dans la mémoire principale (Main Memory, adresse 32 à 255)
   * pour éviter d'écraser la zone protégée par erreur.
   */
  async writeData(address: number, data: Uint8Array): Promise<boolean> {
    // Max 255 bytes, offset > 32
    if (address < 32) throw new Error("Protection: Écriture interdite sous l'adresse 32");
    
    const len = data.length;
    // Commande: FF D0 00 [Addr] [Len] [Data...]
    const cmd = new Uint8Array(5 + len);
    cmd.set(APDU.UPDATE_BINARY.slice(0, 3), 0);
    cmd[3] = address;
    cmd[4] = len;
    cmd.set(data, 5);

    const response = await this.transmit(cmd);
    return this.checkSuccess(response);
  }

  private checkSuccess(sw: Uint8Array): boolean {
    if (sw.length < 2) return false;
    const sw1 = sw[sw.length - 2];
    const sw2 = sw[sw.length - 1];
    return sw1 === 0x90 && sw2 === 0x00;
  }

  async disconnect() {
    if (this.device && this.device.opened) {
      await this.device.close();
    }
  }
}

/**
 * Convertit une chaine en tableau d'octets pour l'écriture
 */
export const stringToBytes = (str: string): Uint8Array => {
  return new TextEncoder().encode(str);
};

/**
 * Formate les données de la carte pour l'encodage
 */
export const prepareCardData = (cardNumber: string, name: string, expiry: string): Uint8Array => {
  // Création d'un format simple TLV ou JSON stringifié
  // Pour SLE4442 (256 octets), on reste simple: format JSON
  const data = JSON.stringify({
    n: cardNumber.replace(/\s/g, ''),
    h: name.substring(0, 20), // Max length
    e: expiry
  });
  return stringToBytes(data);
};