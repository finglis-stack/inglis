import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewMerchant } from '@/context/NewMerchantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';

const Step2Registration = () => {
  const navigate = useNavigate();
  const { merchantData, updateMerchant } = useNewMerchant();
  const { t } = useTranslation('dashboard');
  const [formData, setFormData] = useState({
    business_number: merchantData.business_number || '',
    jurisdiction: merchantData.jurisdiction || '',
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    updateMerchant(formData);
    navigate('/dashboard/settings/merchants/new/step-3');
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="business_number">{t('corporateSteps.businessNumber')}</Label>
          <Input id="business_number" value={formData.business_number} onChange={handleChange} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="jurisdiction">{t('corporateSteps.jurisdiction')}</Label>
          <Input id="jurisdiction" value={formData.jurisdiction} onChange={handleChange} />
        </div>
      </div>
      <div className="flex justify-between mt-8">
        <Button variant="outline" type="button" onClick={() => navigate('../step-1')}>{t('sharedSteps.previous')}</Button>
        <Button type="submit">{t('sharedSteps.next')}</Button>
      </div>
    </form>
  );
};

export default Step2Registration;