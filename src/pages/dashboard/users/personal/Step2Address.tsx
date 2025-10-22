import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewUser } from '@/context/NewUserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';

const Step2Address = () => {
  const navigate = useNavigate();
  const { userData, updateUser } = useNewUser();
  const [address, setAddress] = useState(userData.address || {});
  const { t } = useTranslation();

  const handleChange = (e) => {
    setAddress({ ...address, [e.target.id]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateUser({ address });
    navigate('/dashboard/users/new/personal/step-3');
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="street">{t('dashboard.personalSteps.address')}</Label>
          <Input id="street" required value={address.street || ''} onChange={handleChange} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="city">{t('dashboard.personalSteps.city')}</Label>
            <Input id="city" required value={address.city || ''} onChange={handleChange} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="province">{t('dashboard.personalSteps.province')}</Label>
            <Input id="province" required value={address.province || ''} onChange={handleChange} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="postalCode">{t('dashboard.personalSteps.postalCode')}</Label>
            <Input id="postalCode" required value={address.postalCode || ''} onChange={handleChange} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="country">{t('dashboard.personalSteps.country')}</Label>
            <Input id="country" required value={address.country || ''} onChange={handleChange} />
          </div>
        </div>
      </div>
      <div className="flex justify-between mt-8">
        <Button variant="outline" type="button" onClick={() => navigate('/dashboard/users/new/personal/step-1')}>{t('dashboard.sharedSteps.previous')}</Button>
        <Button type="submit">{t('dashboard.sharedSteps.next')}</Button>
      </div>
    </form>
  );
};

export default Step2Address;