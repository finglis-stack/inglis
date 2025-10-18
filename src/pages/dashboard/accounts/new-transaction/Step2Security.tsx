import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewTransaction } from '@/context/NewTransactionContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { showError } from '@/utils/toast';

const Step2Security = () => {
  const navigate = useNavigate();
  const { transactionData, updateTransaction } = useNewTransaction();

  const [reason, setReason] = useState(transactionData.reason || '');
  const [securityCode, setSecurityCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');

  useEffect(() => {
    setSecurityCode(Math.floor(100000 + Math.random() * 900000).toString());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      showError("Veuillez entrer une justification pour cette transaction manuelle.");
      return;
    }
    if (enteredCode !== securityCode) {
      showError("Le code de sécurité est incorrect.");
      return;
    }
    updateTransaction({ reason });
    navigate('../step-3');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="reason">Justification de la saisie manuelle</Label>
        <Textarea id="reason" placeholder="Ex: Correction d'une erreur, test de système, etc." value={reason} onChange={(e) => setReason(e.target.value)} required />
      </div>
      <div className="grid gap-4 p-4 border rounded-md bg-gray-50">
        <Label>Confirmation de sécurité</Label>
        <p className="text-sm text-muted-foreground">Pour éviter les erreurs, veuillez recopier le code de sécurité ci-dessous.</p>
        <div className="text-center text-2xl font-bold tracking-widest bg-white p-2 border rounded-md">
          {securityCode}
        </div>
        <div className="flex justify-center">
          <InputOTP maxLength={6} value={enteredCode} onChange={setEnteredCode}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
      </div>
      <div className="flex justify-between mt-8">
        <Button type="button" variant="outline" onClick={() => navigate('..')}>Précédent</Button>
        <Button type="submit">Suivant</Button>
      </div>
    </form>
  );
};

export default Step2Security;