import { useJsApiLoader, GoogleMap, Marker } from '@react-google-maps/api';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AlertCircle } from 'lucide-react';

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
  const { data, error } = await supabase.functions.invoke('get-google-maps-key');
  if (error) {
    const functionError = await error.context.json();
    throw new Error(functionError.error || 'Impossible de récupérer la clé d\'API Google Maps.');
  }
  if (!data.apiKey) {
    throw new Error('La clé API Google Maps n\'a pas été retournée par la fonction serveur.');
  }
  return data.apiKey;
};

const ErrorDisplay = ({ message }: { message: string }) => (
  <div className="h-[250px] w-full rounded-lg bg-red-50 border border-red-200 flex flex-col items-center justify-center text-center p-4">
    <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
    <p className="text-sm font-semibold text-red-800">Erreur de carte</p>
    <p className="text-xs text-red-700">{message}</p>
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
    return <ErrorDisplay message={`Erreur de chargement du script Google Maps: ${loadError.message}`} />;
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
      zoom={18}
      tilt={45}
      mapTypeId="satellite"
      options={{
        disableDefaultUI: true,
        zoomControl: true,
        heading: 90,
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
    retry: false,
  });

  if (isLoadingApiKey) {
    return <Skeleton className="h-[250px] w-full rounded-lg" />;
  }

  if (isError) {
    return <ErrorDisplay message={error.message} />;
  }

  // Nous avons maintenant une clé API valide, nous pouvons donc rendre le composant de la carte.
  return <MapWithKey apiKey={apiKey!} latitude={latitude} longitude={longitude} />;
};

export default TransactionMap;