import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { getFunctionError } from '@/lib/utils';

const ChangePinDialog = ({ profileId, onPinChanged }) => {
  const [open, setOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation('dashboard');

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase.functions.invoke('update-profile-pin', {
      body: {
        profile_id: profileId,
        new_pin: newPin,
      }
    });

    if (error) {
      showError(`Erreur: ${getFunctionError(error, error.message)}`);
    } else {
      showSuccess('NIP mis à jour avec succès.');
      onPinChanged(newPin);
      setOpen(false);
      setNewPin('');
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">{t('userProfile.changePinTitle')}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('userProfile.changePinTitle')}</DialogTitle>
          <DialogDescription>
            {t('userProfile.changePinDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center py-4">
          <InputOTP maxLength={4} value={newPin} onChange={setNewPin}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>{t('userProfile.cancel')}</Button>
          <Button onClick={handleSave} disabled={loading || newPin.length !== 4}>
            {loading ? t('userProfile.saving') : t('userProfile.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePinDialog;