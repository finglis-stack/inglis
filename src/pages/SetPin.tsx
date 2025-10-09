import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2 } from 'lucide-react';

const SetPin = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) {
      setIsValidToken(false);
    } else {
      setIsValidToken(true);
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 4) {
      showError("Le NIP doit contenir 4 chiffres.");
      return;
    }
    if (pin !== confirmPin) {
      showError("Les NIP ne correspondent pas.");
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke('set-pin-from-token', {
        body: { token, pin },
      });

      if (error) {
        const functionError = await error.context.json();
        throw new Error(functionError.error || "Le lien est invalide ou a expiré.");
      }

      showSuccess("Votre NIP a été configuré avec succès !");
      navigate('/login');
    } catch (err) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isValidToken === null) {
    return <div className="flex justify-center items-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  if (!isValidToken) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Lien Invalide</CardTitle>
            <CardDescription>Ce lien de configuration de NIP est invalide ou a déjà été utilisé.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Configurez votre NIP</CardTitle>
          <CardDescription>Choisissez un NIP à 4 chiffres pour votre nouvelle carte. Ne le partagez avec personne.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-4">
              <div className="flex flex-col items-center space-y-2">
                <label htmlFor="pin">Nouveau NIP</label>
                <InputOTP id="pin" maxLength={4} value={pin} onChange={setPin}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <label htmlFor="confirmPin">Confirmez le NIP</label>
                <InputOTP id="confirmPin" maxLength={4} value={confirmPin} onChange={setConfirmPin}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {loading ? 'Sauvegarde...' : 'Sauvegarder le NIP'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default SetPin;