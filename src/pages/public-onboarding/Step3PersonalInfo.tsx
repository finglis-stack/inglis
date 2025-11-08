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

const Step3PersonalInfo = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('public-onboarding');
  const { formConfig, formData, updateData } = usePublicOnboarding();
  const [localData, setLocalData] = useState({
    firstName: formData.firstName || '',
    lastName: formData.lastName || '',
    email: formData.email || '',
    phone: formData.phone || '',
    dob: formData.dob || '',
  });
  const [address, setAddress] = useState(formData.address || null);
  const [pin, setPin] = useState(formData.pin || '');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalData({ ...localData, [e.target.id]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) {
      showError(t('personal_info.address_required'));
      return;
    }
    if (pin.length !== 4) {
      showError(t('personal_info.pin_required'));
      return;
    }
    updateData({ ...localData, address, pin });
    
    if (formConfig.formDetails.is_credit_bureau_enabled) {
      navigate('../step-4');
    } else {
      navigate('../step-6'); // Skip to review if no credit check
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
            <Input id="firstName" value={localData.firstName} onChange={handleChange} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lastName">{t('personal_info.last_name')}</Label>
            <Input id="lastName" value={localData.lastName} onChange={handleChange} required />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">{t('personal_info.email')}</Label>
            <Input id="email" type="email" value={localData.email} onChange={handleChange} required />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="phone">{t('personal_info.phone')}</Label>
            <Input id="phone" type="tel" value={localData.phone} onChange={handleChange} required />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="dob">{t('personal_info.dob')}</Label>
          <Input id="dob" type="date" value={localData.dob} onChange={handleChange} required />
        </div>
        <div className="grid gap-2">
          <Label>{t('personal_info.address')}</Label>
          <AddressAutocomplete initialAddress={address} onAddressSelect={setAddress} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="pin">{t('personal_info.pin_label')}</Label>
          <div className="flex justify-center">
            <InputOTP id="pin" maxLength={4} value={pin} onChange={setPin}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <p className="text-xs text-muted-foreground text-center">{t('personal_info.pin_desc')}</p>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <Button variant="outline" type="button" onClick={() => navigate('../step-2')}>{t('personal_info.previous_button')}</Button>
        <Button type="submit">{t('personal_info.next_button')}</Button>
      </div>
    </form>
  );
};

export default Step3PersonalInfo;