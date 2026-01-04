# Inglis Dominion & Q12x - L'Infrastructure de Paiement du Futur

> **Créé par :** Félix Inglis-Chevarie (Sec 4)
> **Statut :** Remplacement complet de Visa/Mastercard codé entre deux cours de math. 🚀

---

## 🌟 Introduction

Bienvenue dans la documentation officielle d'**Inglis Dominion**. Ce n'est pas juste une application, c'est un écosystème financier complet. 

Le but ? Remplacer les réseaux de paiement traditionnels (comme Visa ou Mastercard) par une architecture moderne, ouverte et sans frais d'interchange abusifs. Ce projet gère tout le cycle de vie de la monnaie numérique : de l'émission de la carte bancaire jusqu'au paiement chez le marchand, en passant par la détection de fraude par intelligence artificielle.

Ce monorepo contient **trois applications distinctes** qui communiquent ensemble via une base de données PostgreSQL unifiée.

---

## 🏗️ Architecture du Système

Le projet est divisé en trois piliers majeurs :

1.  **Inglis Dominion (Côté Émetteur)** : Le tableau de bord pour les banques et les Fintechs pour émettre des cartes.
2.  **Q12x (Côté Acquéreur/Marchand)** : Le processeur de paiement (style Stripe) pour les commerçants.
3.  **Le Moteur d'Onboarding (Côté Client)** : Le système public pour que les gens demandent des cartes.

---

## 1. Inglis Dominion : La Plateforme d'Émission (Issuer)

C'est le "QG" des institutions financières. C'est ici que la banque gère ses programmes de cartes et ses clients.

### 💳 Gestion des Programmes de Cartes
L'institution peut créer des produits financiers sur mesure :
*   **Types de cartes :** Crédit, Débit, ou Hybride.
*   **Configuration financière :** Définition des taux d'intérêt, délais de grâce, limites de crédit, et frais (annuels ou par transaction).
*   **Design :** Personnalisation visuelle des cartes (Or Rose, Noir Métal, etc.).
*   **BIN (Bank Identification Number) :** Gestion des BINs partagés ou dédiés pour le routage des transactions.

#### 🧮 Système de PAN alphanumérique et Luhn (conception maison)
Nous avons conçu un PAN de 18 caractères alphanumériques validé par Luhn, pour augmenter l’entropie et la robustesse tout en gardant une vérification locale simple et rapide.

- Structure du PAN (18 caractères) :
  - 2 lettres: initiales de l’utilisateur (extraites du nom, ex. “AB”).
  - 6 chiffres: BIN (issuer_id) du programme.
  - 2 lettres: bloc aléatoire “random_letters”.
  - 7 chiffres: identifiant aléatoire “unique_identifier”.
  - 1 chiffre: check digit Luhn.
  - Total: 2 + 6 + 2 + 7 + 1 = 18.

- Luhn alphanumérique (implémentation):
  - Les lettres A–Z sont converties en chiffres via A→10, B→11, …, Z→35; les chiffres 0–9 restent inchangés.
  - On applique ensuite Luhn (mod 10) sur la base numérique des 17 premiers caractères; le check digit final est (sum*9) % 10.
  - Implémentations dans le code:
    - Génération: convertAlphanumericToNumeric + calculateLuhn dans supabase/functions/create-card et supabase/functions/suspend-card.
    - Validation front: validateLuhnAlphanumeric dans src/lib/utils.ts vérifie longueur 18, conversion alphanumérique puis Luhn.

- Pourquoi alphanumérique:
  - Entropie accrue et collisions rarissimes, tout en gardant le BIN pour le routage.
  - Vérification locale immédiate (Luhn) des erreurs de saisie sans appeler une API.
  - Lisibilité humaine (initiales visibles) mais masquage naturel du bloc sensible (****XYZ) côté affichage.

- Espace des possibilités par utilisateur (par BIN):
  - random_letters: 26^2 = 676 combinaisons.
  - unique_identifier: 10^7 = 10 000 000 combinaisons.
  - Le check digit est déterminé par la base, donc nombre de PAN distincts ≈ 676 × 10^7 = 6 760 000 000 par utilisateur et par BIN.
  - Avec plusieurs BINs/programmes, l’espace s’agrège par BIN.

- Unicité et réémission:
  - À la création et à la réémission, on régénère random_letters et unique_identifier, calcule le check digit et vérifie l’absence de collision sur (issuer_id, random_letters, unique_identifier).
  - La réémission conserve les initiales et le BIN, met à jour la date d’expiration (+4 ans), et journalise l’action (raison, description, auteur).
  - L’ancien PAN est rendu inactif (statut “blocked” ou “reissue” selon l’action), assurant traçabilité complète.

- Affichage et masquage:
  - Le PAN est affiché au client sous forme lisible et masquée: “INITS BIN RL ****XYZ CD”.
  - Exemple d’email: concaténation des segments avec masquage du cœur numérique, tel qu’implémenté dans create-card (envoi via Resend).

### 👥 Gestion des Utilisateurs (KYC)
*   **Profils :** Supporte les particuliers (Personal) et les entreprises (Corporate).
*   **Sécurité des données :** Les informations sensibles (NAS, Adresses) sont chiffrées dans la base de données. Seuls les employés autorisés avec les bonnes permissions RLS (Row Level Security) peuvent les déchiffrer.
*   **Gestion du NIP :** Système sécurisé pour permettre aux utilisateurs de définir leur NIP de carte via un lien unique envoyé par courriel (utilisant l'API Resend).

### 🏦 Bureau de Crédit
Un bureau de crédit complet intégré côté émetteur :
*   **Pulling sécurisé avec consentement :** L’institution consulte le dossier du client (score, historique, dettes, limites) via un consentement traçable et à durée limitée, avec chiffrement et contrôle d’accès.
*   **Reporting continu :** Les comptes de crédit et l’historique de paiements sont synchronisés régulièrement et consolidés, incluant multi-comptes, multi-devises, règles de grâce et intérêts.
*   **Gouvernance & confidentialité :** Consentement horodaté, jetons temporaires, chiffrement des données sensibles, RLS et journalisation des accès garantissent une visibilité mesurée et sécurisée.
*   **Expérience unifiée :** Vue claire du profil, chronologie des mises à jour et indicateurs clés pour faciliter les décisions, sans friction pour l’utilisateur.

### 💰 Gestion des Comptes
*   **Ledger (Grand Livre) :** Suivi en temps réel des soldes (Solde comptable vs Solde disponible).
*   **Transactions :** Historique complet avec calcul automatique des intérêts.
*   **Relevés (Statements) :** Génération automatique des relevés mensuels le jour du cycle de facturation via une Edge Function planifiée.

---

## 2. Le Moteur d'Onboarding Public

Comment un client obtient-il une carte ? Via les formulaires publics intelligents.

### 📝 Formulaires Dynamiques
*   L'institution crée un formulaire dans son dashboard (ex: "Carte Étudiant").
*   Le système génère une URL publique unique (ou la lie à un domaine personnalisé, voir plus bas).
*   Le formulaire est une "Single Page Application" (SPA) fluide qui guide l'utilisateur.

### 🤖 Décision Automatisée
C'est là que la magie opère. Quand une demande est soumise :
1.  Une **Edge Function** (`process-onboarding-application`) se déclenche.
2.  Elle analyse le revenu déclaré vs les critères du programme.
3.  Elle vérifie le score de crédit (si activé).
4.  **Résultat :** Elle approuve ou rejette la demande instantanément.
5.  Si approuvé, elle crée le compte, génère le numéro de carte (avec l'algorithme de Luhn), et envoie les accès au client.

### 🌐 Gestion des Domaines Personnalisés
Grâce à l'API de Vercel intégrée dans le backend Supabase, une institution peut connecter son propre domaine (ex: `apply.mabanque.com`) directement à son formulaire d'onboarding Inglis Dominion. Le système gère la vérification DNS et le certificat SSL automatiquement.

---

## 3. Q12x : Le Processeur de Paiement (Acquirer)

C'est la partie qui remplace Stripe. C'est ce que les magasins utilisent pour se faire payer.

### 🛍️ Checkouts & Liens de Paiement
Les marchands peuvent créer des liens de paiement configurables (Montant fixe ou variable, devise, description) et les envoyer à leurs clients.

### 🔒 La Page de Paiement Hébergée
*   Conçue pour être ultra-sécurisée.
*   **Tokenisation :** Les numéros de carte ne touchent jamais le serveur du marchand. Ils sont envoyés directement à l'API Inglis Dominion qui renvoie un jeton (`tok_...`) temporaire.
*   **Honeypot :** Des champs cachés piègent les bots stupides qui essaient de remplir le formulaire.

---

## 4. Le Système de Sécurité Anti-Fraude 🛡️

C'est probablement la partie la plus complexe du code. Chaque transaction passe par un pipeline d'analyse en temps réel avant d'être approuvée.

### 🕵️‍♂️ Device Fingerprinting
On utilise une librairie pour générer une empreinte unique de l'appareil (basée sur le navigateur, l'écran, les polices, etc.).
*   Si une carte est utilisée sur un nouvel appareil inconnu -> **Risque augmente.**
*   Si l'appareil est marqué comme "Bloqué" dans le dashboard -> **Transaction rejetée.**

### 🖱️ Biométrie Comportementale
Le système enregistre comment l'utilisateur bouge sa souris et tape au clavier.
*   Mouvements de souris parfaits et linéaires ? -> **C'est un bot.**
*   Vitesse de frappe inhumaine ? -> **C'est un script.**
*   Copier-coller du numéro de carte ? -> **Suspect (souvent des cartes volées).**

### 🌍 Vélocité & Géolocalisation
*   **Vitesse :** Si 5 achats sont faits en 1 minute -> **Blocage.**
*   **Voyage Impossible :** Si une carte est utilisée à Montréal, et 10 minutes plus tard à Paris, le système calcule la distance et la vitesse nécessaire. Si c'est impossible physiquement -> **Blocage.**
*   **Analyse IP :** Détection des VPN, Proxy, et Tor via une Edge Function proxy pour éviter les bloqueurs de publicité.

### 🕸️ Réseau de Fraude (Graph)
Le système construit un graphe de connexions. Si une carte frauduleuse a touché l'IP `1.2.3.4`, toutes les autres cartes ayant touché cette IP deviennent suspectes. On peut visualiser ce réseau en 3D dans le dashboard.

### 🔧 Anti-Fraude modulable par profil
Le moteur anti-fraude est configurable finement à l’échelle du profil (personnel ou entreprise) :
- Activation/désactivation de règles par profil (fingerprinting, biométrie, géo-vélocité, IP, réseau).
- Seuils de vélocité géographique (distance minimale, vitesse très rapide, vitesse impossible).
- Fenêtre temporelle et seuils de vélocité IP (nombre de tentatives, profils/cartes uniques).
- Listes de confiance et de blocage pour appareils et adresses IP (is_trusted, is_blocked).
- Détection VPN/Proxy/Tor activable avec paramètres ajustables.
- Biométrie comportementale (vitesse de souris/clavier, copier-coller) avec seuils modulables.
- Pondération/impact par règle sur le score de risque et priorités des règles.
- Seuils pour la détection de “fraud rings” (cartes/profils reliés).

### ⛔ Blocage avec raison et réémission (PAN) automatique
- Suspension de carte avec action, raison et description, journalisée et visible dans le dashboard (traçabilité complète).
- Réémission automatique d’une carte avec un nouveau PAN (nouvelle carte) en cas de compromission; l’ancienne est désactivée et l’opération est auditée.
- Historique horodaté des décisions (qui, quand, pourquoi) accessible pour contrôle et conformité.

### 🗺️ Carte Google pour la vélocité géographique
- Affichage de 2 points et d’une flèche entre la localisation précédente et actuelle; si la distance est nulle, un seul point est affiché.
- La carte reste visible même en cas de tentative refusée grâce au recours à la dernière IP observée du profil.

### ⚙️ Chargement Google Maps fiable
- Chargement stabilisé via un renderer dédié pour éviter l’erreur “Loader must not be called again with different options”.

---

## 5. Fonctionnalités Techniques Avancées

### 📞 SVI (Système Vocal Interactif) avec Twilio
J'ai codé un système téléphonique. Un utilisateur peut appeler un numéro, entrer son numéro de carte et son NIP, et le système lui lit son solde et ses dernières transactions via *Text-to-Speech*. Le code est hébergé dans une Edge Function (`twilio-ivr`) qui répond aux webhooks de Twilio avec du XML (TwiML).

### 📲 Google Wallet (Push Provisioning)
Le système peut générer des **OPC (Opaque Payment Cards)**. C'est un payload cryptographique complexe signé avec des clés PGP qui permet d'ajouter la carte Inglis Dominion directement dans le Google Wallet d'un téléphone Android.

### ⚡ Edge Functions & Webhooks
Toute la logique lourde (création de carte, analyse de fraude, envoi d'emails) tourne sur des fonctions Serverless (Deno) chez Supabase pour une vitesse maximale et une sécurité accrue (les clés privées ne sont jamais exposées au client).

---

## 💻 Stack Technologique

*   **Frontend :** React, TypeScript, Vite.
*   **UI/UX :** Tailwind CSS, Shadcn/ui, Framer Motion (pour les anims), Recharts (pour les graphiques).
*   **Backend / Base de données :** Supabase (PostgreSQL).
*   **Sécurité :** RLS (Row Level Security) sur toutes les tables. Personne ne voit les données qu'il ne doit pas voir.
*   **Infrastructure :** Vercel (Hébergement), Cloudflare (DNS).
*   **APIs Externes :** Twilio (Téléphonie), Resend (Emails), IPGeolocation (Fraude), Google Maps (Visuel).

---

> **Note du développeur :**
> Ce projet a été réalisé entièrement par moi, Félix, étudiant de secondaire 4. Il prouve qu'on n'a pas besoin d'être une multinationale pour construire des systèmes financiers complexes. Il suffit de curiosité, de temps, et d'une bonne connexion internet. 😉