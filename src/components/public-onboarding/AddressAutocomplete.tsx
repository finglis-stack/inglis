import { useState, useRef, useCallback, useMemo } from 'react';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, MapPin, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const fetchMapsApiKey = async (): Promise<string> => {
  console.log('[AddressAutocomplete] Fetching Google Maps API Key...');
  
  const { data, error } = await supabase.functions.invoke('get-google-maps-key', {
    method: 'POST', 
  });
  
  // Erreur réseau ou système (ex: fonction introuvable, erreur 500 qui a échappé au try/catch)
  if (error) {
    console.error('[AddressAutocomplete] System Error:', error);
    throw new Error(error.message || 'Erreur de communication avec le serveur.');
  }
  
  // Erreur logique renvoyée par notre fonction (ex: clé manquante)
  if (data && data.error) {
    console.error('[AddressAutocomplete] Config Error:', data.error);
    throw new Error(data.error);
  }
  
  if (!data || !data.apiKey) {
    console.error('[AddressAutocomplete] Empty response:', data);
    throw new Error('La clé API reçue est vide.');
  }
  
  return data.apiKey;
};

interface AddressAutocompleteProps {
  onAddressSelect: (address: any | null) => void;
  initialAddress: any | null;
}

// IMPORTANT: Définir les bibliothèques à l'extérieur pour éviter le rechargement
const LIBRARIES: "places"[] = ["places"];

const MapAutocomplete = ({ apiKey, onAddressSelect, initialAddress }: { apiKey: string, onAddressSelect: (addr: any) => void, initialAddress: any }) => {
  const { t } = useTranslation('public-onboarding');
  
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-places-script',
    googleMapsApiKey: apiKey,
    libraries: LIBRARIES,
    preventGoogleFontsLoading: true,
  });

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<any | null>(initialAddress);

  const onPlaceChanged = useCallback(() => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      
      if (!place.geometry) {
        return;
      }

      const addressComponents = place.address_components;
      if (addressComponents) {
        const getComponent = (type: string) => addressComponents.find(c => c.types.includes(type))?.long_name || '';
        const getShortComponent = (type: string) => addressComponents.find(c => c.types.includes(type))?.short_name || '';
        
        const streetNumber = getComponent('street_number');
        const route = getComponent('route');
        
        const structuredAddress = {
          street: streetNumber && route ? `${streetNumber} ${route}` : (route || place.name || ''),
          city: getComponent('locality') || getComponent('postal_town') || getComponent('sublocality'),
          province: getComponent('administrative_area_level_1'),
          postalCode: getComponent('postal_code'),
          country: getComponent('country'),
          countryCode: getShortComponent('country'),
          formatted_address: place.formatted_address,
          location: {
            lat: place.geometry.location?.lat(),
            lng: place.geometry.location?.lng()
          }
        };
        
        setSelectedAddress(structuredAddress);
        onAddressSelect(structuredAddress);
      }
    }
  }, [autocomplete, onAddressSelect]);

  const handleReset = () => {
    setSelectedAddress(null);
    onAddressSelect(null);
  };

  if (loadError) {
    return (
      <div className="text-sm text-destructive border border-destructive/30 bg-destructive/10 p-3 rounded-md">
        <p className="font-semibold">Erreur Google Maps SDK</p>
        <p>{loadError.message}</p>
      </div>
    );
  }

  if (!isLoaded) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (selectedAddress) {
    return (
      <div className="p-4 border rounded-md bg-muted/50 space-y-2 relative group">
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
          <div className="flex-grow">
            <p className="font-medium text-foreground">{selectedAddress.street}</p>
            <p className="text-sm text-muted-foreground">{selectedAddress.city}, {selectedAddress.province} {selectedAddress.postalCode}</p>
            <p className="text-sm text-muted-foreground">{selectedAddress.country}</p>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleReset} 
            className="h-8 text-muted-foreground hover:text-destructive"
          >
            Modifier
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Autocomplete
      onLoad={(ac) => setAutocomplete(ac)}
      onPlaceChanged={onPlaceChanged}
      fields={['address_components', 'geometry', 'formatted_address', 'name']}
      types={['address']}
    >
      <Input
        type="text"
        placeholder={t('personal_info.address_placeholder') || "Commencez à taper votre adresse..."}
        className="w-full"
        autoComplete="off"
      />
    </Autocomplete>
  );
};

export const AddressAutocomplete = ({ onAddressSelect, initialAddress }: AddressAutocompleteProps) => {
  const { data: apiKey, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['google-maps-api-key'],
    queryFn: fetchMapsApiKey,
    staleTime: Infinity,
    gcTime: Infinity,
    retry: 1,
  });

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (isError) {
    return (
      <div className="flex flex-col gap-2">
        <div className="text-sm text-destructive flex items-center gap-2 p-2 border border-destructive/20 rounded bg-destructive/5">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Erreur de configuration</p>
            <p className="text-xs">{error instanceof Error ? error.message : String(error)}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="w-fit">
          <RefreshCw className="h-3 w-3 mr-2" /> Réessayer
        </Button>
      </div>
    );
  }

  if (!apiKey) {
    return <div className="text-sm text-muted-foreground">Clé API non disponible.</div>;
  }

  return <MapAutocomplete apiKey={apiKey} onAddressSelect={onAddressSelect} initialAddress={initialAddress} />;
};