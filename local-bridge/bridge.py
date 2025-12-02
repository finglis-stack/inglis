import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
from smartcard.System import readers
from smartcard.util import toHexString, toBytes

app = Flask(__name__)
CORS(app)  # Autoriser les requêtes depuis le navigateur (localhost:8080)

# Commandes APDU pour SLE4442
CMD_VERIFY_PSC = [0xFF, 0x20, 0x00, 0x00, 0x03, 0xFF, 0xFF, 0xFF]
CMD_UPDATE_MAIN_MEM = [0xFF, 0xD0, 0x00]

def get_reader():
    """Récupère le premier lecteur disponible"""
    r = readers()
    if len(r) == 0:
        raise Exception("Aucun lecteur de carte détecté.")
    return r[0]

def encode_card_data(card_number, name, expiry):
    """Prépare les données binaires (Même logique que le frontend)"""
    # Formatage
    clean_num = ''.join(filter(str.isalnum, card_number))[:18]
    clean_exp = expiry.replace('/', '')[:4]
    clean_name = name[:30]

    # Encodage
    data_bytes = []
    data_bytes.append(0x1D) # Magic Byte
    data_bytes.extend(clean_num.encode('utf-8'))
    data_bytes.extend(clean_exp.encode('utf-8'))
    data_bytes.extend(clean_name.encode('utf-8'))
    
    return data_bytes

@app.route('/status', methods=['GET'])
def status():
    """Vérifie si le pont est en ligne et si un lecteur est là"""
    try:
        r = readers()
        reader_name = str(r[0]) if len(r) > 0 else None
        return jsonify({
            "status": "online", 
            "reader": reader_name,
            "ready": len(r) > 0
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)})

@app.route('/write', methods=['POST'])
def write_card():
    connection = None
    try:
        data = request.json
        print(f"Reçu demande d'écriture pour: {data.get('holderName')}")
        
        # 1. Connexion
        reader = get_reader()
        connection = reader.createConnection()
        connection.connect()
        print(f"Connecté à: {reader}")

        # 2. Vérification du Code PIN Carte (PSC) - Par défaut FFFFFF
        data_psc, sw1, sw2 = connection.transmit(CMD_VERIFY_PSC)
        if not (sw1 == 0x90 and sw2 == 0x00):
            raise Exception(f"Échec vérification PSC (Carte verrouillée ?). Status: {sw1:02X} {sw2:02X}")
        print("PSC Vérifié OK.")

        # 3. Préparation des données
        payload = encode_card_data(
            data.get('cardNumber', ''),
            data.get('holderName', ''),
            data.get('expiryDate', '')
        )

        # 4. Écriture (Adresse 32 / 0x20)
        # Commande: FF D0 00 [ADDR] [LEN] [DATA...]
        apdu = CMD_UPDATE_MAIN_MEM + [0x20, len(payload)] + payload
        
        response, sw1, sw2 = connection.transmit(apdu)
        if not (sw1 == 0x90 and sw2 == 0x00):
             raise Exception(f"Erreur d'écriture. Status: {sw1:02X} {sw2:02X}")

        print("Écriture terminée avec succès.")
        return jsonify({"success": True})

    except Exception as e:
        print(f"Erreur: {e}")
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if connection:
            try: connection.disconnect()
            except: pass

if __name__ == '__main__':
    print("--- PONT INGLIS DOMINION DÉMARRÉ SUR LE PORT 5000 ---")
    print("En attente de requêtes du navigateur...")
    app.run(port=5000)