import { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
    suburb?: string;
    hamlet?: string;
    county?: string;
  };
}

interface AddressAutocompleteProps {
  onAddressSelect: (address: any | null) => void;
  initialAddress: any | null;
}

const buildStructuredAddress = (result: NominatimResult) => {
  const a = result.address || {};
  const streetParts = [a.house_number, a.road].filter(Boolean);
  const street = streetParts.length ? streetParts.join(' ') : result.display_name?.split(',')[0] || '';

  const cityCandidate = a.city || a.town || a.village || a.municipality || a.suburb || a.hamlet || a.county || '';
  const province = a.state || '';
  const postalCode = a.postcode || '';
  const country = a.country || '';
  const countryCode = (a.country_code || '').toUpperCase();

  return {
    street,
    city: cityCandidate,
    province,
    postalCode,
    country,
    countryCode,
    formatted_address: result.display_name,
    location: {
      lat: Number(result.lat),
      lng: Number(result.lon),
    },
  };
};

export const AddressAutocompleteOSM = ({ onAddressSelect, initialAddress }: AddressAutocompleteProps) => {
  const { t } = useTranslation('public-onboarding');
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<any | null>(initialAddress);

  const placeholder = useMemo(
    () => t('personal_info.address_placeholder') || 'Commencez à taper votre adresse...',
    [t]
  );

  useEffect(() => {
    if (query.trim().length < 3) {
      setSuggestions([]);
      setErrorMsg(null);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      setErrorMsg(null);

      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${encodeURIComponent(query)}&limit=5`;
      fetch(url, {
        headers: {
          Accept: 'application/json',
        },
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) {
            throw new Error(`Erreur Nominatim (${res.status})`);
          }
          return res.json();
        })
        .then((data: NominatimResult[]) => {
          setSuggestions(Array.isArray(data) ? data : []);
        })
        .catch((err) => {
          if (controller.signal.aborted) return;
          setErrorMsg(err instanceof Error ? err.message : String(err));
          setSuggestions([]);
        })
        .finally(() => setLoading(false));
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleSelect = (item: NominatimResult) => {
    const structured = buildStructuredAddress(item);
    setSelectedAddress(structured);
    onAddressSelect(structured);
    setSuggestions([]);
    setQuery('');
  };

  const handleReset = () => {
    setSelectedAddress(null);
    onAddressSelect(null);
    setSuggestions([]);
    setQuery('');
    setErrorMsg(null);
  };

  if (selectedAddress) {
    return (
      <div className="p-4 border rounded-md bg-muted/50 space-y-2">
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
          <div className="flex-grow">
            <p className="font-medium text-foreground">{selectedAddress.street}</p>
            <p className="text-sm text-muted-foreground">
              {selectedAddress.city}, {selectedAddress.province} {selectedAddress.postalCode}
            </p>
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
    <div className="relative">
      <Input
        type="text"
        placeholder={placeholder}
        className="w-full"
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading && (
        <div className="mt-2">
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {errorMsg && (
        <div className="mt-2 text-xs text-destructive border border-destructive/30 bg-destructive/10 p-2 rounded">
          {errorMsg}
          <Button variant="outline" size="sm" onClick={() => setQuery(query)} className="ml-2 h-7 px-2">
            <RefreshCw className="h-3 w-3 mr-1" />
            Réessayer
          </Button>
        </div>
      )}

      {!loading && !errorMsg && suggestions.length > 0 && (
        <div className="absolute z-20 mt-2 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
          <ul className="max-h-60 overflow-auto">
            {suggestions.map((sugg, idx) => (
              <li
                key={`${sugg.lat}-${sugg.lon}-${idx}`}
                className="cursor-pointer px-3 py-2 hover:bg-muted text-sm"
                onClick={() => handleSelect(sugg)}
              >
                {sugg.display_name}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default AddressAutocompleteOSM;