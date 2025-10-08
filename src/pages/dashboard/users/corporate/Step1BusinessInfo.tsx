import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewUser } from '@/context/NewUserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';

const Step1BusinessInfo = () => {
  const navigate = useNavigate();
  const { userData, updateUser } = useNewUser();
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    legalName: userData.legalName || '',
    operatingName: userData.operatingName || '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateUser(formData);
    navigate('/dashboard/users/new/corporate/step-2');
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="legalName">{t('dashboard.corporateSteps.legalName')}</Label>
          <Input id="legalName" required value={formData.legalName} onChange={handleChange} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="operatingName">{t('dashboard.corporateSteps.operatingName')}</Label>
          <Input id="operatingName" value={formData.operatingName} onChange={handleChange} />
        </div>
      </div>
      <div className="flex justify-end mt-8">
        <Button type="submit">{t('dashboard.sharedSteps.next')}</Button>
      </div>
    </form>
  );
};

export default Step1BusinessInfo;