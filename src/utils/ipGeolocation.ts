/**
 * Interface pour les données de géolocalisation IP retournées par ip-api.com
 */
export interface IpGeolocationData {
  status: 'success' | 'fail';
  message?: string;
  country?: string;
  countryCode?: string;
  region?: string;
  regionName?: string;
  city?: string;
  zip?: string;
  lat?: number;
  lon?: number;
  timezone?: string;
  isp?: string;
  org?: string;
  as?: string;
  query?: string;
  mobile?: boolean;
  proxy?: boolean;
  hosting?: boolean;
}

/**
 * Récupère les données de géolocalisation pour une adresse IP
 * Utilise ip-api.com (45 requêtes/minute gratuit)
 * 
 * @param ipAddress - L'adresse IP à géolocaliser
 * @param fields - Les champs à récupérer (optionnel, par défaut tous les champs utiles)
 * @returns Les données de géolocalisation ou null en cas d'erreur
 */
export const getIpGeolocation = async (
  ipAddress: string,
  fields: string[] = ['status', 'message', 'country', 'countryCode', 'region', 'regionName', 'city', 'zip', 'lat', 'lon', 'timezone', 'isp', 'org', 'as', 'mobile', 'proxy', 'hosting', 'query']
): Promise<IpGeolocationData | null> => {
  try {
    const fieldsParam = fields.join(',');
    const response = await fetch(`http://ip-api.com/json/${ipAddress}?fields=${fieldsParam}`);
    
    if (!response.ok) {
      console.error(`IP geolocation API error: ${response.status} ${response.statusText}`);
      return null;
    }
    
    const data: IpGeolocationData = await response.json();
    
    if (data.status !== 'success') {
      console.error(`IP geolocation failed: ${data.message || 'Unknown error'}`);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching IP geolocation:', error);
    return null;
  }
};

/**
 * Récupère uniquement les coordonnées GPS pour une IP (pour Google Maps)
 * 
 * @param ipAddress - L'adresse IP à géolocaliser
 * @returns Les coordonnées { lat, lon } ou null
 */
export const getIpCoordinates = async (
  ipAddress: string
): Promise<{ lat: number; lon: number; city?: string; country?: string } | null> => {
  const data = await getIpGeolocation(ipAddress, ['status', 'message', 'lat', 'lon', 'city', 'country']);
  
  if (!data || !data.lat || !data.lon) {
    return null;
  }
  
  return {
    lat: data.lat,
    lon: data.lon,
    city: data.city,
    country: data.country
  };
};

/**
 * Vérifie si une IP est un VPN/Proxy/Hosting
 * 
 * @param ipAddress - L'adresse IP à vérifier
 * @returns true si l'IP est suspecte (VPN/Proxy/Hosting)
 */
export const isIpSuspicious = async (ipAddress: string): Promise<boolean> => {
  const data = await getIpGeolocation(ipAddress, ['status', 'message', 'proxy', 'hosting', 'org']);
  
  if (!data) {
    return false; // En cas d'erreur, on ne bloque pas
  }
  
  // Vérifier les flags proxy/hosting de ip-api.com
  if (data.proxy || data.hosting) {
    return true;
  }
  
  // Vérifier si l'organisation contient des mots-clés suspects
  if (data.org) {
    const suspiciousKeywords = ['vpn', 'proxy', 'hosting', 'datacenter', 'cloud'];
    const orgLower = data.org.toLowerCase();
    return suspiciousKeywords.some(keyword => orgLower.includes(keyword));
  }
  
  return false;
};

/**
 * Formate les données de géolocalisation pour l'affichage
 * 
 * @param data - Les données de géolocalisation
 * @returns Une chaîne formatée pour l'affichage
 */
export const formatIpLocation = (data: IpGeolocationData | null): string => {
  if (!data) {
    return 'Localisation inconnue';
  }
  
  const parts: string[] = [];
  
  if (data.city) parts.push(data.city);
  if (data.regionName) parts.push(data.regionName);
  if (data.country) parts.push(data.country);
  
  return parts.length > 0 ? parts.join(', ') : 'Localisation inconnue';
};