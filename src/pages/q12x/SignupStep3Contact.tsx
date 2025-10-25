import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQ12xOnboarding } from '@/context/Q12xOnboardingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';

const Step3Contact = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('q12x');
  const { onboardingData, updateData } = useQ12xOnboarding();
  const [address, setAddress] = useState(onboardingData.address || {});
  const [phoneNumber, setPhoneNumber] = useState(onboardingData.phoneNumber || '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress({ ...address, [e.target.id]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateData({ address, phoneNumber });
    navigate('/review');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="phoneNumber">{t('signup.step3.phoneLabel')}</Label>
        <Input id="phoneNumber" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="street">{t('signup.step3.addressLabel')}</Label>
        <Input id="street" value={address.street || ''} onChange={handleChange} placeholder={t('signup.step3.street')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input id="city" value={address.city || ''} onChange={handleChange} placeholder={t('signup.step3.city')} />
        <Input id="province" value={address.province || ''} onChange={handleChange} placeholder={t('signup.step3.province')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input id="postalCode" value={address.postalCode || ''} onChange={handleChange} placeholder={t('signup.step3.postalCode')} />
        <Input id="country" value={address.country || ''} onChange={handleChange} placeholder={t('signup.step3.country')} />
      </div>
      <div className="flex justify-between mt-4">
        <Button variant="outline" type="button" onClick={() => navigate('/business-info')}>{t('signup.step3.previous')}</Button>
        <Button type="submit">{t('signup.step3.next')}</Button>
      </div>
    </form>
  );
};

export default Step3Contact;