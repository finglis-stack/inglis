import { useJsApiLoader, GoogleMap, Marker } from '@react-google-maps/api';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle, MapPin } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '250px',
  borderRadius: '0.5rem',
};

interface TransactionMapProps {
  latitude: number;
  longitude: number;
}

const fetchMapsApiKey = async (): Promise<string> => {
  try {
    const { data, error } = await supabase.functions.invoke('get-google-maps-key');
    
    if (error) {
      console.error('Error fetching Google Maps API key:', error);
      throw new Error('Impossible de récupérer la clé d\'API Google Maps.');
    }
    
    if (!data || !data.apiKey) {
      throw new Error('La clé API Google Maps n\'est pas configurée.');
    }
    
    return data.apiKey;
  } catch (err) {
    console.error('Exception fetching Google Maps API key:', err);
    throw err;
  }
};

const ErrorDisplay = ({ message, latitude, longitude }: { message: string, latitude?: number, longitude?: number }) => (
  <div className="h-[250px] w-full rounded-lg bg-gray-50 border border-gray-200 flex flex-col items-center justify-center text-center p-4">
    <MapPin className="h-8 w-8 text-gray-400 mb-2" />
    <p className="text-sm font-semibold text-gray-700">Carte non disponible</p>
    <p className="text-xs text-gray-600 mt-1">{message}</p>
    {latitude && longitude && (
      <div className="mt-3 text-xs text-gray-500">
        <p>Coordonnées : {latitude.toFixed(4)}, {longitude.toFixed(4)}</p>
        <a 
          href={`https://www.google.com/maps?q=${latitude},${longitude}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 hover:underline mt-1 inline-block"
        >
          Ouvrir dans Google Maps →
        </a>
      </div>
    )}
  </div>
);

// Ce composant ne sera rendu que lorsque la clé API sera disponible.
const MapWithKey = ({ apiKey, latitude, longitude }: { apiKey: string, latitude: number, longitude: number }) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey,
    preventGoogleFontsLoading: true,
  });

  if (loadError) {
    console.error('Google Maps load error:', loadError);
    return <ErrorDisplay message="Erreur de chargement de Google Maps" latitude={latitude} longitude={longitude} />;
  }

  if (!isLoaded) {
    return <Skeleton className="h-[250px] w-full rounded-lg" />;
  }

  const center = {
    lat: latitude,
    lng: longitude,
  };

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={15}
      options={{
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: true,
        fullscreenControl: false,
      }}
    >
      <Marker position={center} />
    </GoogleMap>
  );
};

const TransactionMap = ({ latitude, longitude }: TransactionMapProps) => {
  const { data: apiKey, isLoading: isLoadingApiKey, isError, error } = useQuery({
    queryKey: ['google-maps-api-key'],
    queryFn: fetchMapsApiKey,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
    retryDelay: 1000,
  });

  if (isLoadingApiKey) {
    return <Skeleton className="h-[250px] w-full rounded-lg" />;
  }

  if (isError) {
    console.error('Error loading API key:', error);
    return <ErrorDisplay 
      message={error instanceof Error ? error.message : 'Erreur inconnue'} 
      latitude={latitude} 
      longitude={longitude} 
    />;
  }

  if (!apiKey) {
    return <ErrorDisplay 
      message="Clé API Google Maps non disponible" 
      latitude={latitude} 
      longitude={longitude} 
    />;
  }

  // Nous avons maintenant une clé API valide, nous pouvons donc rendre le composant de la carte.
  return <MapWithKey apiKey={apiKey} latitude={latitude} longitude={longitude} />;
};

export default TransactionMap;