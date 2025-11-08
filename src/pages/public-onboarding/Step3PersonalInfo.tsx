import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePublicOnboarding } from '@/context/PublicOnboardingContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import { AddressAutocomplete } from '@/components/public-onboarding/AddressAutocomplete';
import { showError } from '@/utils/toast';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lock } from 'lucide-react';

const Step3PersonalInfo = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('public-onboarding');
  const { formConfig, formData, updateData } = usePublicOnboarding();

  const [pageData, setPageData] = useState({
    firstName: formData.firstName || '',
    lastName: formData.lastName || '',
    email: formData.email || '',
    phone: formData.phone || '',
    dob: formData.dob || '',
    address: formData.address || null,
    pin: formData.pin || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPageData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleAddressSelect = (address: any | null) => {
    setPageData(prev => ({ ...prev, address }));
  };

  const handlePinChange = (pin: string) => {
    setPageData(prev => ({ ...prev, pin }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageData.address) {
      showError(t('personal_info.address_required'));
      return;
    }
    if (pageData.pin.length !== 4) {
      showError(t('personal_info.pin_required'));
      return;
    }
    updateData(pageData);
    
    if (formConfig.formDetails.is_credit_bureau_enabled) {
      navigate('../step-4');
    } else {
      navigate('../step-6');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h2 className="text-xl font-semibold">{t('personal_info.title')}</h2>
      <p className="text-muted-foreground mt-1">{t('personal_info.subtitle')}</p>
      
      <div className="grid gap-4 pt-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="firstName">{t('personal_info.first_name')}</Label>
            <Input id="firstName" value={pageData.firstName} onChange={handleChange} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lastName">{t('personal_info.last_name')}</Label>
            <Input id="lastName" value={pageData.lastName} onChange={handleChange} required />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">{t('personal_info.email')}</Label>
            <Input id="email" type="email" value={pageData.email} onChange={handleChange} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">{t('personal_info.phone')}</Label>
            <Input id="phone" type="tel" value={pageData.phone} onChange={handleChange} required />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dob">{t('personal_info.dob')}</Label>
          <Input id="dob" type="date" value={pageData.dob} onChange={handleChange} required />
        </div>
        <div className="grid gap-2">
          <Label>{t('personal_info.address')}</Label>
          <AddressAutocomplete initialAddress={pageData.address} onAddressSelect={handleAddressSelect} />
        </div>
        
        <Card className="bg-gray-50/50 border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Lock className="h-5 w-5 text-muted-foreground" />
              {t('personal_info.pin_title')}
            </CardTitle>
            <CardDescription>
              {t('personal_info.pin_desc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <InputOTP id="pin" maxLength={4} value={pageData.pin} onChange={handlePinChange}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between mt-8">
        <Button variant="outline" type="button" onClick={() => navigate('../step-2')}>{t('personal_info.previous_button')}</Button>
        <Button type="submit">{t('personal_info.next_button')}</Button>
      </div>
    </form>
  );
};

export default Step3PersonalInfo;