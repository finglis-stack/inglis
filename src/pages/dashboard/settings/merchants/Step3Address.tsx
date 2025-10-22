import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewMerchant } from '@/context/NewMerchantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';

const Step3Address = () => {
  const navigate = useNavigate();
  const { merchantData, updateMerchant } = useNewMerchant();
  const { t } = useTranslation('dashboard');
  const [address, setAddress] = useState(merchantData.address || {});

  const handleChange = (e) => {
    setAddress({ ...address, [e.target.id]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMerchant({ address });
    navigate('/dashboard/settings/merchants/new/step-4');
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="street">{t('personalSteps.address')}</Label>
          <Input id="street" value={address.street || ''} onChange={handleChange} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="city">{t('personalSteps.city')}</Label>
            <Input id="city" value={address.city || ''} onChange={handleChange} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="province">{t('personalSteps.province')}</Label>
            <Input id="province" value={address.province || ''} onChange={handleChange} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="postalCode">{t('personalSteps.postalCode')}</Label>
            <Input id="postalCode" value={address.postalCode || ''} onChange={handleChange} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="country">{t('personalSteps.country')}</Label>
            <Input id="country" value={address.country || ''} onChange={handleChange} />
          </div>
        </div>
      </div>
      <div className="flex justify-between mt-8">
        <Button variant="outline" type="button" onClick={() => navigate('../step-2')}>{t('sharedSteps.previous')}</Button>
        <Button type="submit">{t('sharedSteps.next')}</Button>
      </div>
    </form>
  );
};

export default Step3Address;