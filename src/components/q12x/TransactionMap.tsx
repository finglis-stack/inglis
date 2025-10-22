import { useJsApiLoader, GoogleMap, Marker } from '@react-google-maps/api';
import { Skeleton } from '@/components/ui/skeleton';

const containerStyle = {
  width: '100%',
  height: '250px',
  borderRadius: '0.5rem',
};

interface TransactionMapProps {
  latitude: number;
  longitude: number;
}

const TransactionMap = ({ latitude, longitude }: TransactionMapProps) => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const center = {
    lat: latitude,
    lng: longitude,
  };

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