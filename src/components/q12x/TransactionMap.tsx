import { useJsApiLoader, GoogleMap, Marker } from '@react-google-maps/api';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
    throw new Error('Impossible de récupérer la clé d\'API Google Maps.');
  }
  return data.apiKey;
};

const TransactionMap = ({ latitude, longitude }: TransactionMapProps) => {
  const { data: apiKey, isLoading: isLoadingApiKey } = useQuery({
    queryKey: ['google-maps-api-key'],
    queryFn: fetchMapsApiKey,
    staleTime: Infinity, // La clé ne change pas, donc on la met en cache indéfiniment
    gcTime: Infinity,
  });

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || '',
    preventGoogleFontsLoading: true,
  });

  const center = {
    lat: latitude,
    lng: longitude,
  };

  if (isLoadingApiKey || !isLoaded) {
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