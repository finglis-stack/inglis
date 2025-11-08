import { useState, useRef, useCallback } from 'react';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, MapPin } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const fetchMapsApiKey = async (): Promise<string> => {
  const { data, error } = await supabase.functions.invoke('get-google-maps-key');
  if (error) throw new Error('Impossible de récupérer la clé d\'API Google Maps.');
  if (!data || !data.apiKey) throw new Error('La clé API Google Maps n\'est pas configurée.');
  return data.apiKey;
};

interface AddressAutocompleteProps {
  onAddressSelect: (address: any | null) => void;
  initialAddress: any | null;
}

const libraries: "places"[] = ["places"];

const MapAutocomplete = ({ apiKey, onAddressSelect, initialAddress }) => {
  const { t } = useTranslation('public-onboarding');
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-autocomplete-script',
    googleMapsApiKey: apiKey,
    libraries,
    preventGoogleFontsLoading: true,
  });

  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<any | null>(initialAddress);

  const onPlaceChanged = useCallback(() => {
    if (autocomplete !== null) {
      const place = autocomplete.getPlace();
      const addressComponents = place.address_components;
      if (addressComponents) {
        const getComponent = (type: string) => addressComponents.find(c => c.types.includes(type))?.long_name || '';
        
        const structuredAddress = {
          street: `${getComponent('street_number')} ${getComponent('route')}`.trim(),
          city: getComponent('locality'),
          province: getComponent('administrative_area_level_1'),
          postalCode: getComponent('postal_code'),
          country: getComponent('country'),
        };
        setSelectedAddress(structuredAddress);
        onAddressSelect(structuredAddress);
      }
    } else {
      console.error('Autocomplete is not loaded yet!');
    }
  }, [autocomplete, onAddressSelect]);

  const handleReset = () => {
    setSelectedAddress(null);
    onAddressSelect(null);
  };

  if (loadError) {
    return <div className="text-sm text-destructive">Erreur de chargement de Google Maps.</div>;
  }

  if (!isLoaded) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (selectedAddress) {
    return (
      <div className="p-4 border rounded-md bg-muted/50 space-y-2">
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-muted-foreground mt-1 flex-shrink-0" />
          <div>
            <p className="font-medium">{selectedAddress.street}</p>
            <p className="text-sm text-muted-foreground">{selectedAddress.city}, {selectedAddress.province} {selectedAddress.postalCode}</p>
            <p className="text-sm text-muted-foreground">{selectedAddress.country}</p>
          </div>
        </div>
        <Button variant="link" size="sm" onClick={handleReset} className="p-0 h-auto">{t('personal_info.change_address')}</Button>
      </div>
    );
  }

  return (
    <Autocomplete
      onLoad={(ac) => setAutocomplete(ac)}
      onPlaceChanged={onPlaceChanged}
      fields={['address_components']}
      types={['address']}
    >
      <Input
        type="text"
        placeholder={t('personal_info.address_placeholder')}
        className="w-full"
      />
    </Autocomplete>
  );
};

export const AddressAutocomplete = ({ onAddressSelect, initialAddress }: AddressAutocompleteProps) => {
  const { data: apiKey, isLoading, isError, error } = useQuery({
    queryKey: ['google-maps-api-key'],
    queryFn: fetchMapsApiKey,
    staleTime: Infinity,
    gcTime: Infinity,
  });

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  if (isError) {
    return (
      <div className="text-sm text-destructive flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        {error.message}
      </div>
    );
  }

  return <MapAutocomplete apiKey={apiKey} onAddressSelect={onAddressSelect} initialAddress={initialAddress} />;
};