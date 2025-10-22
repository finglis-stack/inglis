import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewUser } from '@/context/NewUserContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';

const Step2Registration = () => {
  const navigate = useNavigate();
  const { userData, updateUser } = useNewUser();
  const { t } = useTranslation('dashboard');
  const [formData, setFormData] = useState({
    businessNumber: userData.businessNumber || '',
    jurisdiction: userData.jurisdiction || '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateUser(formData);
    navigate('/dashboard/users/new/corporate/step-3');
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="businessNumber">{t('corporateSteps.businessNumber')}</Label>
          <Input id="businessNumber" required value={formData.businessNumber} onChange={handleChange} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="jurisdiction">{t('corporateSteps.jurisdiction')}</Label>
          <Input id="jurisdiction" required value={formData.jurisdiction} onChange={handleChange} />
        </div>
      </div>
      <div className="flex justify-between mt-8">
        <Button variant="outline" type="button" onClick={() => navigate('/dashboard/users/new/corporate/step-1')}>{t('sharedSteps.previous')}</Button>
        <Button type="submit">{t('sharedSteps.next')}</Button>
      </div>
    </form>
  );
};

export default Step2Registration;