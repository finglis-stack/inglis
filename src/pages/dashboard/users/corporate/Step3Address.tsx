import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewUser } from '@/context/NewUserContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import { AddressAutocomplete } from '@/components/public-onboarding/AddressAutocomplete';
import { showError } from '@/utils/toast';

const Step3Address = () => {
  const navigate = useNavigate();
  const { userData, updateUser } = useNewUser();
  const { t } = useTranslation('dashboard');
  const [address, setAddress] = useState(userData.businessAddress || null);

  const handleAddressSelect = (selectedAddress: any | null) => {
    setAddress(selectedAddress);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      showError("Veuillez sélectionner une adresse valide via la recherche.");
      return;
    }
    updateUser({ businessAddress: address });
    navigate('/dashboard/users/new/corporate/step-4');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label>{t('corporateSteps.businessAddress')}</Label>
          <div className="border rounded-md p-1 bg-background">
            <AddressAutocomplete 
              initialAddress={address} 
              onAddressSelect={handleAddressSelect} 
            />
          </div>
           <p className="text-xs text-muted-foreground">Siège social (recherche Google Maps).</p>
        </div>
      </div>
      <div className="flex justify-between mt-8">
        <Button variant="outline" type="button" onClick={() => navigate('/dashboard/users/new/corporate/step-2')}>{t('sharedSteps.previous')}</Button>
        <Button type="submit" disabled={!address}>{t('sharedSteps.next')}</Button>
      </div>
    </form>
  );
};

export default Step3Address;