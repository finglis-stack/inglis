# Configuration de Google Maps API

Pour afficher les cartes de géolocalisation des transactions, vous devez configurer une clé API Google Maps.

## Étapes de configuration :

### 1. Obtenir une clé API Google Maps

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Activez l'API "Maps JavaScript API"
4. Créez des identifiants (Credentials) → Clé API
5. Copiez la clé API générée

### 2. Configurer la clé dans Supabase

1. Allez dans votre projet Supabase
2. Naviguez vers **Project Settings** → **Edge Functions** → **Manage Secrets**
3. Ajoutez un nouveau secret :
   - **Nom** : `GOOGLE_MAPS_API_KEY`
   - **Valeur** : Votre clé API Google Maps

### 3. Redémarrer les Edge Functions

Après avoir ajouté le secret, les Edge Functions doivent être redéployées pour prendre en compte la nouvelle variable d'environnement.

## Sécurité

**Important** : Bien que la clé API soit exposée côté client (c'est normal pour Google Maps), vous devriez :

1. Restreindre la clé API dans Google Cloud Console :
   - Allez dans **APIs & Services** → **Credentials**
   - Cliquez sur votre clé API
   - Sous "Application restrictions", sélectionnez "HTTP referrers"
   - Ajoutez vos domaines autorisés (ex: `https://votre-domaine.com/*`)

2. Limiter les APIs autorisées :
   - Sous "API restrictions", sélectionnez "Restrict key"
   - Cochez uniquement "Maps JavaScript API"

## Limites gratuites

Google Maps offre :
- **$200 de crédit gratuit par mois**
- Environ **28,000 chargements de carte gratuits par mois**
- Au-delà, facturation à **$7 pour 1,000 chargements**

Pour un usage normal, vous ne devriez pas dépasser les limites gratuites.

## Dépannage

Si la carte ne s'affiche pas :

1. Vérifiez que `GOOGLE_MAPS_API_KEY` est bien défini dans les secrets Supabase
2. Vérifiez que l'API "Maps JavaScript API" est activée dans Google Cloud
3. Vérifiez les restrictions de la clé API (domaines autorisés)
4. Consultez la console du navigateur pour voir les erreurs éventuelles

## Alternative sans Google Maps

Si vous ne souhaitez pas utiliser Google Maps, le système affichera automatiquement :
- Les coordonnées GPS (latitude, longitude)
- Un lien pour ouvrir la localisation dans Google Maps (sans clé API requise)