import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
from smartcard.System import readers
from smartcard.util import toHexString, toBytes

app = Flask(__name__)
CORS(app)

# Commandes APDU pour SLE4442
CMD_VERIFY_PSC = [0xFF, 0x20, 0x00, 0x00, 0x03, 0xFF, 0xFF, 0xFF]
CMD_UPDATE_MAIN_MEM = [0xFF, 0xD0, 0x00]

def encode_card_data(card_number, name, expiry):
    clean_num = ''.join(filter(str.isalnum, card_number))[:18]
    clean_exp = expiry.replace('/', '')[:4]
    clean_name = name[:30]
    data_bytes = []
    data_bytes.append(0x1D)
    data_bytes.extend(clean_num.encode('utf-8'))
    data_bytes.extend(clean_exp.encode('utf-8'))
    data_bytes.extend(clean_name.encode('utf-8'))
    return data_bytes

@app.route('/status', methods=['GET'])
def status():
    try:
        # Force un nouveau scan des lecteurs à chaque requête
        r = readers()
        print(f"-> Scan demandé. Lecteurs trouvés : {r}")
        
        reader_name = str(r[0]) if len(r) > 0 else None
        return jsonify({
            "status": "online", 
            "reader": reader_name,
            "all_readers": [str(x) for x in r],
            "ready": len(r) > 0
        })
    except Exception as e:
        print(f"-> ERREUR SCAN: {e}")
        return jsonify({"status": "error", "message": str(e)})

@app.route('/write', methods=['POST'])
def write_card():
    connection = None
    try:
        data = request.json
        print(f"-> Demande d'écriture pour : {data.get('holderName')}")
        
        r = readers()
        if len(r) == 0:
            raise Exception("Lecteur perdu ou déconnecté au moment de l'écriture.")
            
        reader = r[0]
        print(f"-> Connexion au lecteur : {reader}")
        connection = reader.createConnection()
        connection.connect()
        
        data_psc, sw1, sw2 = connection.transmit(CMD_VERIFY_PSC)
        print(f"-> Vérification PSC (Code sécurité) : {sw1:02X} {sw2:02X}")
        
        if not (sw1 == 0x90 and sw2 == 0x00):
            raise Exception(f"Carte verrouillée ou type incorrect. Code retour : {sw1:02X} {sw2:02X}")

        payload = encode_card_data(
            data.get('cardNumber', ''),
            data.get('holderName', ''),
            data.get('expiryDate', '')
        )

        # Commande d'écriture
        apdu = CMD_UPDATE_MAIN_MEM + [0x20, len(payload)] + payload
        response, sw1, sw2 = connection.transmit(apdu)
        
        print(f"-> Résultat écriture : {sw1:02X} {sw2:02X}")
        
        if not (sw1 == 0x90 and sw2 == 0x00):
             raise Exception(f"Erreur lors de l'écriture. Code : {sw1:02X} {sw2:02X}")

        return jsonify({"success": True})

    except Exception as e:
        print(f"-> ERREUR CRITIQUE : {e}")
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if connection:
            try: connection.disconnect()
            except: pass

if __name__ == '__main__':
    print("=================================================")
    print("   PONT INGLIS DOMINION (MODE DIAGNOSTIC)")
    print("=================================================")
    try:
        r = readers()
        print(f"ÉTAT ACTUEL : {len(r)} lecteur(s) détecté(s) par Windows/PC-SC")
        if len(r) > 0:
            for i, reader in enumerate(r):
                print(f"  [{i}] {reader}")
        else:
            print("  [X] AUCUN LECTEUR DÉTECTÉ.")
            print("      Veuillez vérifier le Gestionnaire de périphériques.")
    except Exception as e:
        print(f"ERREUR SYSTÈME : {e}")
        print("Le service 'Smart Card' de Windows est-il démarré ?")
    print("-------------------------------------------------")
    print("Le service écoute sur http://localhost:5000 ...")
    app.run(port=5000)