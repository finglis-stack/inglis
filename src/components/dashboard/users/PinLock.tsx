import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const PinLock = ({ onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const { t } = useTranslation();

  const handleSubmit = async () => {
    const isCorrect = await onUnlock(pin);
    if (!isCorrect) {
      setError(t('dashboard.userProfile.pinLockError'));
      setPin('');
    } else {
      setError('');
    }
  };

  return (
    <div className="absolute inset-0 bg-white/80 backdrop-blur-md flex items-center justify-center z-10 rounded-lg">
      <div className="bg-white p-8 rounded-lg shadow-xl text-center border">
        <Lock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h2 className="text-xl font-semibold mb-2">{t('dashboard.userProfile.pinLockTitle')}</h2>
        <p className="text-muted-foreground mb-6">{t('dashboard.userProfile.pinLockDesc')}</p>
        <div className="flex justify-center mb-4">
          <InputOTP maxLength={4} value={pin} onChange={setPin}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        <Button onClick={handleSubmit} disabled={pin.length !== 4}>{t('dashboard.userProfile.unlock')}</Button>
      </div>
    </div>
  );
};

export default PinLock;