import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
from smartcard.System import readers
from smartcard.util import toHexString
from smartcard.CardConnection import CardConnection

app = Flask(__name__)
CORS(app)

# Commandes
CMD_GET_DATA = [0xFF, 0xCA, 0x00, 0x00, 0x00] # Tente de lire l'UID (générique)

@app.route('/status', methods=['GET'])
def status():
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
        print("-" * 30)
        print("-> TENTATIVE DE CONNEXION...")
        
        r = readers()
        if len(r) == 0:
            raise Exception("Aucun lecteur trouvé.")
            
        reader = r[0]
        print(f"-> Lecteur : {reader}")
        
        connection = reader.createConnection()
        connection.connect()
        
        # 1. LIRE L'ATR (La "carte d'identité" de la puce)
        atr = toHexString(connection.getATR())
        print(f"-> ATR DÉTECTÉ : {atr}")
        
        # Analyse rapide de l'ATR pour SLE4442
        # Un ATR de SLE4442 ressemble souvent à : A2 13 10 91
        if atr.startswith("A2 13 10 91"):
            print("-> TYPE CARTE : SLE4442 (Correct)")
        else:
            print(f"-> TYPE CARTE : INCONNU ou CPU (Peut-être incompatible avec l'écriture simple)")

        # 2. TEST DOUX : On n'écrit pas tout de suite
        # On essaie juste une commande inoffensive pour voir si le lecteur plante
        print("-> Envoi commande test (Lecture UID)...")
        try:
            # Cette commande est moins agressive que l'écriture
            data, sw1, sw2 = connection.transmit(CMD_GET_DATA)
            print(f"-> Réponse Test : {sw1:02X} {sw2:02X}")
        except Exception as e:
            print(f"-> Le lecteur n'a pas aimé la commande test : {e}")
            raise Exception("Lecteur incompatible avec les commandes PC/SC standards.")

        # Si on arrive ici sans crash, c'est bon signe, mais on arrête là pour le diagnostic
        # car votre lecteur "Générique" ne supportera probablement pas l'écriture mémoire directe.
        
        return jsonify({
            "success": False, 
            "error": "DIAGNOSTIC SEULEMENT. ATR: " + atr + ". Le lecteur semble incompatible pour l'écriture SLE4442."
        })

    except Exception as e:
        print(f"-> ERREUR : {e}")
        return jsonify({"success": False, "error": str(e)}), 500
    finally:
        if connection:
            try: connection.disconnect()
            except: pass

if __name__ == '__main__':
    print("=== PONT DIAGNOSTIC ===")
    app.run(port=5000)