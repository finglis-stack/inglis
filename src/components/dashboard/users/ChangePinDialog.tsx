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

const ChangePinDialog = ({ profileId, onPinChanged }) => {
  const [open, setOpen] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ pin: newPin })
      .eq('id', profileId);

    if (error) {
      showError(`Erreur: ${error.message}`);
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
        <Button variant="outline">Modifier le NIP</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le NIP</DialogTitle>
          <DialogDescription>
            Entrez un nouveau NIP à 4 chiffres pour ce profil.
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
          <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={loading || newPin.length !== 4}>
            {loading ? 'Sauvegarde...' : 'Sauvegarder'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChangePinDialog;