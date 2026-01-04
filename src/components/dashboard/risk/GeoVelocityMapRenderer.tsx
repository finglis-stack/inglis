import { useMemo } from 'react';
import { useJsApiLoader, GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import { Skeleton } from '@/components/ui/skeleton';

type LatLon = { lat: number; lon: number };

interface GeoVelocityMapRendererProps {
  apiKey: string;
  current: LatLon;
  previous?: LatLon;
}

const containerStyle = {
  width: '100%',
  height: '400px',
  borderRadius: '0.5rem',
};

const GeoVelocityMapRenderer = ({ apiKey, current, previous }: GeoVelocityMapRendererProps) => {
  const { isLoaded } = useJsApiLoader({
    id: 'geo-velocity-map',
    googleMapsApiKey: apiKey,
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

  const zoom = useMemo(() => (hasPrev ? 12 : 18), [hasPrev]);

  if (!isLoaded) {
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
      {hasPrev && previous && (
        <Marker
          position={{ lat: previous.lat, lng: previous.lon }}
          label={{ text: 'Précédent', color: '#1d4ed8', fontSize: '12px' }}
        />
      )}

      <Marker
        position={{ lat: current.lat, lng: current.lon }}
        label={{ text: 'Actuel', color: '#16a34a', fontSize: '12px' }}
      />

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

export default GeoVelocityMapRenderer;