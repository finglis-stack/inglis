import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewMerchant } from '@/context/NewMerchantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';

const Step1BusinessInfo = () => {
  const navigate = useNavigate();
  const { merchantData, updateMerchant } = useNewMerchant();
  const { t } = useTranslation('dashboard');
  const [formData, setFormData] = useState({
    name: merchantData.name || '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMerchant(formData);
    navigate('/dashboard/settings/merchants/new/step-2');
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="name">{t('merchants.new.nameLabel')}</Label>
          <Input id="name" required value={formData.name} onChange={handleChange} />
        </div>
      </div>
      <div className="flex justify-end mt-8">
        <Button type="submit">{t('sharedSteps.next')}</Button>
      </div>
    </form>
  );
};

export default Step1BusinessInfo;