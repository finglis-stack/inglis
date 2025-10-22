import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useNewUser } from '@/context/NewUserContext';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useTranslation } from 'react-i18next';

const Step4SetPin = () => {
  const navigate = useNavigate();
  const { userData, updateUser } = useNewUser();
  const [pin, setPin] = useState(userData.pin || '');
  const location = useLocation();
  const { t } = useTranslation();
  const isPersonal = location.pathname.includes('/personal/');

  const prevStepUrl = isPersonal ? '/dashboard/users/new/personal/step-3' : '/dashboard/users/new/corporate/step-3';
  const nextStepUrl = isPersonal ? '/dashboard/users/new/personal/step-5' : '/dashboard/users/new/corporate/step-5';

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin.length === 4) {
      updateUser({ pin });
      navigate(nextStepUrl);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex justify-center">
        <InputOTP maxLength={4} value={pin} onChange={setPin}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
          </InputOTPGroup>
        </InputOTP>
      </div>
      <div className="flex justify-between mt-8">
        <Button variant="outline" type="button" onClick={() => navigate(prevStepUrl)}>{t('dashboard.sharedSteps.previous')}</Button>
        <Button type="submit" disabled={pin.length !== 4}>{t('dashboard.sharedSteps.next')}</Button>
      </div>
    </form>
  );
};

export default Step4SetPin;