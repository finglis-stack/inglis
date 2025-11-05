import { supabase } from '@/integrations/supabase/client';

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
 * Utilise une Edge Function proxy pour éviter les problèmes CORS et HTTPS
 * 
 * @param ipAddress - L'adresse IP à géolocaliser
 * @param fields - Les champs à récupérer (optionnel, ignoré car l'Edge Function récupère tous les champs)
 * @returns Les données de géolocalisation ou null en cas d'erreur
 */
export const getIpGeolocation = async (
  ipAddress: string,
  fields?: string[]
): Promise<IpGeolocationData | null> => {
  try {
    console.log('Fetching geolocation via Edge Function for IP:', ipAddress);
    
    const { data, error } = await supabase.functions.invoke('get-ip-geolocation', {
      body: { ipAddress }
    });
    
    if (error) {
      console.error('Edge Function invocation error:', error);
      return null;
    }
    
    if (!data) {
      console.error('No data returned from Edge Function');
      return null;
    }
    
    if (data.status !== 'success') {
      console.warn('Geolocation failed or unavailable:', data.message || 'Unknown reason');
      return null;
    }
    
    console.log('Geolocation successful:', data);
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
  const data = await getIpGeolocation(ipAddress);
  
  if (!data || !data.lat || !data.lon) {
    console.warn('No coordinates available for IP:', ipAddress);
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
  const data = await getIpGeolocation(ipAddress);
  
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