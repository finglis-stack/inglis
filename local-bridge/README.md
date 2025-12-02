# Pont Local Inglis Dominion (USB Bridge)

Ce script sert de passerelle entre le navigateur web (qui bloque l'accès direct aux cartes à puce pour des raisons de sécurité) et votre lecteur USB physique.

## 🛠️ Installation (Windows)

### 1. Installer Python
Si la commande `python` ne fonctionne pas, téléchargez Python depuis le [Microsoft Store](https://apps.microsoft.com/store/detail/python-311/9NRWMJP3717K) ou [python.org](https://www.python.org/downloads/).
> **Important :** Lors de l'installation, cochez la case **"Add Python to PATH"**.

### 2. Installer les librairies
Ouvrez votre terminal (PowerShell ou CMD) dans le dossier du projet et lancez cette commande. 
Si `pip` ne marche pas, utilisez `python -m pip` :

```powershell
python -m pip install flask flask-cors pyscard
```

### 3. Lancer le pont
Une fois installé, démarrez le service :

```powershell
python local-bridge/bridge.py
```

Vous devriez voir : `--- PONT INGLIS DOMINION DÉMARRÉ SUR LE PORT 5000 ---`

## 📱 Utilisation

1. Laissez cette fenêtre de terminal ouverte.
2. Retournez sur le Dashboard dans votre navigateur.
3. Allez dans une fiche de compte (Débit ou Crédit) -> Cliquez sur **"Encoder carte physique"**.
4. Le système détectera automatiquement le pont sur `localhost:5000`.

## ⚠️ Dépannage "No Readers found"

Si le script Python dit qu'il ne trouve pas de lecteur :
1. Vérifiez que le lecteur est branché.
2. Vérifiez que le service Windows "Smart Card" (Carte à puce) est en cours d'exécution (tapez `services.msc` dans Windows).