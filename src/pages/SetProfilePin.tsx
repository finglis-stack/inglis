import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { showError } from '@/utils/toast';
import { Loader2, CheckCircle } from 'lucide-react';
import { getFunctionError } from '@/lib/utils';

const SetProfilePin = () => {
  const { token } = useParams();
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

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
      const { error } = await supabase.functions.invoke('set-profile-pin', {
        body: { token, pin },
      });

      if (error) {
        throw new Error(getFunctionError(error, "Le lien est invalide ou a expiré."));
      }

      setIsSuccess(true);
    } catch (err) {
      if (err instanceof Error) {
        showError(err.message);
      } else {
        showError("Une erreur inconnue est survenue.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-cover bg-center p-4"
      style={{ backgroundImage: "url('/set-pin-background.jpg')" }}
    >
      <Card className="w-full max-w-md bg-white/90 backdrop-blur-sm shadow-2xl">
        {isSuccess ? (
          <CardContent className="p-8 text-center flex flex-col items-center">
            <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
            <CardTitle className="text-2xl">Merci !</CardTitle>
            <CardDescription className="mt-2 text-base">
              Votre NIP de profil a été configuré avec succès.
            </CardDescription>
            <Button onClick={() => navigate('/login')} className="mt-6 w-full">
              Retourner à la connexion
            </Button>
          </CardContent>
        ) : (
          <>
            <CardHeader>
              <CardTitle>Configurez le NIP de votre profil</CardTitle>
              <CardDescription>Choisissez un NIP à 4 chiffres pour sécuriser votre profil.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-4">
                  <div className="flex flex-col items-center space-y-2">
                    <label htmlFor="pin">Nouveau NIP de profil</label>
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
          </>
        )}
      </Card>
    </div>
  );
};

export default SetProfilePin;