# Inglis Dominion & Q12x - Infrastructure de Paiement propriétaire

> **Développeur Principal :** Félix Inglis-Chevarie, Léa
> **Statut du Projet :** Opérationnel. Remplacement complet des réseaux de paiement traditionnels (Visa/Mastercard) via une architecture propriétaire et indépendante sous format private loop ouvert aux marchands.

---

## Introduction

Bienvenue dans la documentation officielle d'Inglis Dominion. Bien plus qu'une simple application, il s'agit d'un écosystème financier complet et autonome. 

L'objectif de cette infrastructure est de remplacer les réseaux de paiement traditionnels par une architecture moderne, ouverte et affranchie des frais d'interchange abusifs. Ce projet gère l'intégralité du cycle de vie de la monnaie numérique : de l'émission sécurisée de la carte bancaire jusqu'au traitement du paiement chez le marchand, en passant par une détection de fraude en temps réel propulsée par l'intelligence artificielle.

Ce monorepo contient trois applications distinctes qui communiquent de manière asynchrone et sécurisée via une base de données PostgreSQL unifiée.

---

## Architecture du Système

Le projet repose sur trois piliers architecturaux majeurs :

1. **Inglis Dominion (Côté Émetteur / Issuer) :** Le centre de commande dédié aux institutions financières et aux Fintechs pour la gestion et l'émission des cartes.
2. **Q12x (Côté Acquéreur / Acquirer) :** Le processeur de paiement conçu pour les commerçants (alternative à Stripe).
3. **Le Moteur d'Onboarding (Côté Client) :** Le portail public automatisé pour l'acquisition de nouveaux clients et la demande de cartes.

---

## 1. Inglis Dominion : La Plateforme d'Émission (Issuer)

Véritable centre névralgique pour les institutions financières, ce module permet la gestion intégrale des programmes de cartes et du portefeuille client.

### Gestion des Programmes de Cartes
L'institution dispose d'une flexibilité totale pour concevoir des produits financiers sur mesure :
* **Types de produits :** Cartes de crédit, de débit ou hybrides.
* **Configuration financière :** Paramétrage des taux d'intérêt, délais de grâce, limites de crédit et structures de frais (annuels ou par transaction).
* **Design & Personnalisation :** Déclinaisons visuelles des cartes physiques et virtuelles par image.
* **BIN (Bank Identification Number) :** Gestion de BINs partagés ou dédiés pour optimiser le routage des transactions dans le système propriétaire.

### Système de PAN Alphanumérique et Algorithme de Luhn
Nous avons développé une implémentation propriétaire de numéros de compte principal (PAN) sur 18 caractères alphanumériques. Cette approche augmente considérablement l'entropie et la robustesse du système, tout en permettant une vérification locale rapide.

**Structure du PAN (18 caractères) :**
* 2 lettres : Initiales de l'utilisateur (ex. "AB").
* 6 chiffres : BIN (issuer_id) du programme financier.
* 2 lettres : Bloc aléatoire de sécurité ("random_letters").
* 7 chiffres : Identifiant unique aléatoire ("unique_identifier").
* 1 chiffre : Somme de contrôle (Check digit) validée par Luhn.

**Fonctionnement du Luhn Alphanumérique :**
* Les lettres (A–Z) sont converties en valeurs numériques (A=10, B=11, ..., Z=35).
* L'algorithme de Luhn (modulo 10) est appliqué sur la base numérique des 17 premiers caractères.
* Le "check digit" final est calculé via la formule `(somme * 9) % 10`.
* Cette logique est implémentée côté backend (`supabase/functions/create-card` et `suspend-card`) et côté frontend (`src/lib/utils.ts` via `validateLuhnAlphanumeric`).

**Avantages du modèle Alphanumérique :**
* Entropie massive prévenant les collisions, tout en conservant la structure BIN pour le routage interbancaire.
* Validation locale instantanée évitant les requêtes API inutiles lors d'erreurs de saisie.
* Capacité théorique d'environ 6,76 milliards de PAN distincts par utilisateur et par BIN.

**Sécurité, Unicité et Affichage :**
* La réémission d'une carte régénère les blocs aléatoires tout en conservant les initiales et le BIN, et prolonge l'expiration de 4 ans. L'ancien PAN est invalidé avec traçabilité complète.
* Côté interface client, le PAN est masqué pour protéger le cœur numérique (ex: `INITS BIN RL ****XYZ CD`).

### Conformité et Gestion des Utilisateurs (KYC)
* **Profils pris en charge :** Particuliers (Personal) et Entreprises (Corporate).
* **Sécurité des données sensibles :** Les informations critiques (NAS, adresses) sont chiffrées au repos dans la base de données. L'accès est strictement contrôlé par des politiques RLS (Row Level Security).
* **Gestion du NIP :** Interface sécurisée permettant aux utilisateurs de définir leur NIP via un jeton unique envoyé par courriel (intégration API Resend).

### Bureau de Crédit Intégré
Un système interne complet pour l'évaluation du risque :
* **Pulling sécurisé :** Consultation du dossier client (score, historique, dettes) conditionnée par un consentement traçable, temporaire et chiffré.
* **Reporting continu :** Synchronisation et consolidation régulières des comptes de crédit, gérant le multi-devises et le calcul des intérêts.
* **Gouvernance :** Traçabilité complète des accès (horodatage, jetons temporaires, journalisation) garantissant la confidentialité des données.

### Grand Livre (Ledger) et Comptes
* **Comptabilité en temps réel :** Suivi strict de la différence entre le solde comptable et le solde disponible.
* **Historique :** Traçabilité immuable des transactions avec calcul automatisé des intérêts.
* **Relevés (Statements) :** Génération automatique des relevés mensuels coordonnée par une Edge Function (tâche planifiée).

---

## 2. Le Moteur d'Onboarding Public

L'acquisition de clients est gérée par des flux automatisés et intelligents.

### Formulaires Dynamiques (SPA)
* L'institution configure ses formulaires d'application depuis son tableau de bord.
* Une application monopage (SPA) fluide est générée pour guider le prospect.

### Décision Automatisée et Déploiement
Lors de la soumission d'un dossier, une Edge Function (`process-onboarding-application`) prend le relais :
* Analyse croisée des revenus déclarés, des critères du programme et du score de crédit.
* Prise de décision instantanée (approbation/rejet).
* En cas d'approbation : Création du compte, génération du PAN et transmission sécurisée des accès.

### Domaines Personnalisés (White-labeling)
Grâce à l'intégration de l'API Vercel, les institutions peuvent lier leur propre domaine (ex: `apply.mabanque.com`) à notre infrastructure. La vérification DNS et le provisionnement des certificats SSL sont entièrement automatisés.

---

## 3. Q12x : Le Processeur de Paiement (Acquirer)

Q12x est l'infrastructure d'acquisition marchande permettant de traiter les encaissements en toute sécurité.

### Liens de Paiement et Checkouts
Génération de liens de paiement configurables (montant fixe/variable, devise, métadonnées) prêts à être partagés par les commerçants.

### Page de Paiement Hébergée (HPP)
* **Tokenisation avancée :** Les données de carte (PAN) ne transitent jamais par les serveurs du marchand. Elles sont directement tokenisées par l'API Inglis Dominion (génération d'un jeton `tok_...`).
* **Sécurité anti-bot :** Implémentation de champs "Honeypot" pour bloquer les scripts malveillants lors du passage en caisse.

---

## 4. Sécurité et Moteur Anti-Fraude

Chaque transaction est soumise à un pipeline d'analyse transactionnelle en temps réel, constituant le cœur sécuritaire de l'écosystème.

### Empreinte Numérique (Device Fingerprinting)
Création d'une empreinte matérielle et logicielle unique (navigateur, résolution, polices). L'utilisation d'une carte sur un appareil inconnu ou préalablement bloqué ajuste dynamiquement le score de risque ou déclenche un rejet immédiat.

### Biométrie Comportementale
Analyse des interactions physiques de l'utilisateur avec la page de paiement :
* Détection des mouvements de souris parfaitement linéaires (typique des bots).
* Analyse de la vitesse de frappe et détection des copier-coller de numéros de carte (indicateur fort de données volées).

### Vélocité, Géolocalisation et Adresses IP
* **Vélocité transactionnelle :** Blocage automatique en cas de fréquence d'achats anormale.
* **Voyage impossible :** Calcul de la vitesse de déplacement requise entre deux transactions géographiquement distantes. Si le délai est physiquement irréalisable, la transaction est bloquée.
* **Analyse IP :** Détection d'utilisation de VPN, Proxy ou nœuds Tor via une Edge Function proxy, contournant efficacement les bloqueurs de publicité.

### Analyse de Réseau par Graphe (Fraud Rings)
Le système cartographie les connexions entre les entités. Si une carte compromise est associée à une IP spécifique, les autres cartes liées à cette même IP voient leur niveau de risque augmenter. Ce graphe relationnel est visualisable en 3D dans le tableau de bord.

### Moteur de Règles Modulable
Les paramètres anti-fraude sont configurables par l'institution pour chaque profil (personnel/entreprise) :
* Ajustement des seuils de vélocité, de distance minimale et de tolérance biométrique.
* Gestion des listes blanches/noires (appareils et IPs).
* Pondération dynamique des règles sur le score de risque global.

### Gestion Automatisée des Compromissions
* Suspension immédiate et journalisée (raison, acteur, horodatage) en cas de détection de fraude.
* Mécanisme de réémission automatique : génération d'un nouveau PAN et désactivation de l'ancienne carte sans intervention manuelle.

### Visualisation Géospatiale
* Intégration d'une interface Google Maps illustrant le vecteur (points et flèche) entre les deux dernières localisations transactionnelles.
* Rendu stabilisé via un composant dédié pour éviter les rechargements d'API non désirés.

---

## 5. Fonctionnalités Techniques Avancées

### Serveur Vocal Interactif (SVI / IVR) via Twilio
Intégration d'un système téléphonique automatisé. Les utilisateurs peuvent s'authentifier par téléphone (PAN + NIP) pour consulter leur solde et leurs dernières transactions via Text-to-Speech. La logique est opérée par une Edge Function (`twilio-ivr`) communiquant en TwiML.

### Google Wallet (Push Provisioning)
Support de la génération d'OPC (Opaque Payment Cards). Ce payload cryptographique signé par clés PGP permet l'ajout direct et sans friction de la carte Inglis Dominion dans le portefeuille Google Wallet des appareils Android.

### Architecture Serverless (Edge Functions)
L'ensemble des opérations lourdes et sensibles (génération cryptographique, moteur de fraude, communications) est déporté sur des fonctions Serverless Deno (Supabase Edge Functions), garantissant des performances optimales et l'isolation totale des clés privées.

---

## Stack Technologique

| Domaine | Technologies Utilisées |
| :--- | :--- |
| **Frontend** | React, TypeScript, Vite |
| **Interface & UX** | Tailwind CSS, Shadcn/ui, Framer Motion, Recharts |
| **Backend & Base de données** | Supabase (PostgreSQL) |
| **Sécurité des données** | RLS (Row Level Security) sur 100% des tables |
| **Infrastructure & Réseau** | Vercel (Hébergement application), Cloudflare (DNS) |
| **Intégrations & APIs** | Twilio (SVI/Téléphonie), Resend (Courriels), IPGeolocation, Google Maps |

---

> **Note du développeur :**
> Ce projet a été conçu et développé de bout en bout par des jeunes. Il démontre que la construction de systèmes financiers complexes, hautement sécurisés et performants repose davantage sur l'architecture logicielle et l'ingénierie que sur les ressources d'une multinationale.
