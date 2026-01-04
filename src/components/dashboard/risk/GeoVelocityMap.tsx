import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import GeoVelocityMapRenderer from './GeoVelocityMapRenderer';

type LatLon = { lat: number; lon: number };

interface GeoVelocityMapProps {
  current: LatLon;
  previous?: LatLon;
}

const fetchMapsApiKey = async (): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('get-google-maps-key');
  if (error) throw new Error("Impossible de récupérer la clé d'API Google Maps.");
  if (!data || !data.apiKey) throw new Error("La clé API Google Maps n'est pas configurée.");
  return data.apiKey;
};

const GeoVelocityMap = ({ current, previous }: GeoVelocityMapProps) => {
  const { data: apiKey } = useQuery({
    queryKey: ['google-maps-api-key'],
    queryFn: fetchMapsApiKey,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
    retryDelay: 1000,
  });

  // Tant que la clé n’est pas disponible, afficher un skeleton.
  if (!apiKey) {
    return <Skeleton className="h-[400px] w-full rounded-lg" />;
  }

  // Une fois la clé disponible, monter le composant qui charge Google Maps
  return <GeoVelocityMapRenderer apiKey={apiKey} current={current} previous={previous} />;
};

export default GeoVelocityMap;