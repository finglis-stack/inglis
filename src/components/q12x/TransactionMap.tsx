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
  return data.apiKey;
};

const ErrorDisplay = ({ message }: { message: string }) => (
  <div className="h-[250px] w-full rounded-lg bg-red-50 border border-red-200 flex flex-col items-center justify-center text-center p-4">
    <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
    <p className="text-sm font-semibold text-red-800">Erreur de carte</p>
    <p className="text-xs text-red-700">{message}</p>
  </div>
);

const TransactionMap = ({ latitude, longitude }: TransactionMapProps) => {
  const { data: apiKey, isLoading: isLoadingApiKey, isError, error } = useQuery({
    queryKey: ['google-maps-api-key'],
    queryFn: fetchMapsApiKey,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || '',
    preventGoogleFontsLoading: true,
  });

  const center = {
    lat: latitude,
    lng: longitude,
  };

  if (isLoadingApiKey) {
    return <Skeleton className="h-[250px] w-full rounded-lg" />;
  }

  if (isError) {
    return <ErrorDisplay message={error.message} />;
  }

  if (loadError) {
    return <ErrorDisplay message={`Erreur de chargement du script Google Maps: ${loadError.message}`} />;
  }

  if (!isLoaded) {
    return <Skeleton className="h-[250px] w-full rounded-lg" />;
  }

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={15}
      tilt={45}
      mapTypeId="satellite"
      options={{
        disableDefaultUI: true,
        zoomControl: true,
      }}
    >
      <Marker position={center} />
    </GoogleMap>
  );
};

export default TransactionMap;