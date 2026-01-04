import { useMemo } from 'react';
import { useJsApiLoader, GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import { Skeleton } from '@/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

type LatLon = { lat: number; lon: number };

interface GeoVelocityMapProps {
  current: LatLon;
  previous?: LatLon;
}

const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '0.5rem',
};

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

  const { isLoaded } = useJsApiLoader({
    id: 'geo-velocity-map',
    googleMapsApiKey: apiKey || '',
    preventGoogleFontsLoading: true,
  });

  const hasPrev = !!previous && (previous.lat !== current.lat || previous.lon !== current.lon);
  const center = useMemo(() => {
    if (hasPrev && previous) {
      return {
        lat: (current.lat + previous.lat) / 2,
        lng: (current.lon + previous.lon) / 2,
      };
    }
    return { lat: current.lat, lng: current.lon };
  }, [current, previous, hasPrev]);

  const zoom = useMemo(() => {
    // Zoom simple: plus éloigné si on a deux points
    return hasPrev ? 12 : 18;
  }, [hasPrev]);

  if (!apiKey || !isLoaded) {
    return <Skeleton className="h-[400px] w-full rounded-lg" />;
  }

  const path = hasPrev && previous
    ? [
        { lat: previous.lat, lng: previous.lon },
        { lat: current.lat, lng: current.lon },
      ]
    : [];

  return (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={center}
      zoom={zoom}
      options={{
        disableDefaultUI: false,
        zoomControl: true,
        streetViewControl: true,
        mapTypeControl: true,
        fullscreenControl: true,
        rotateControl: true,
        tilt: 0,
        mapTypeId: 'roadmap',
      }}
    >
      {/* Marqueur précédent (bleu) */}
      {hasPrev && previous && (
        <Marker
          position={{ lat: previous.lat, lng: previous.lon }}
          label={{ text: 'Précédent', color: '#1d4ed8', fontSize: '12px' }}
        />
      )}

      {/* Marqueur actuel (vert) */}
      <Marker
        position={{ lat: current.lat, lng: current.lon }}
        label={{ text: 'Actuel', color: '#16a34a', fontSize: '12px' }}
      />

      {/* Flèche si distance > 0 */}
      {hasPrev && previous && (
        <Polyline
          path={path}
          options={{
            strokeColor: '#1d4ed8',
            strokeOpacity: 0.9,
            strokeWeight: 4,
            icons: [
              {
                icon: {
                  path: window.google?.maps?.SymbolPath?.FORWARD_CLOSED_ARROW,
                  scale: 4,
                  strokeColor: '#1d4ed8',
                },
                offset: '100%',
              },
            ],
          }}
        />
      )}
    </GoogleMap>
  );
};

export default GeoVelocityMap;