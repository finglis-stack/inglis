import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

const ConfirmCreditPull = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleConfirm = async () => {
    setLoading(true);
    setStatus('idle');
    try {
      const { data, error } = await supabase.functions.invoke('confirm-credit-report-pull', {
        body: { token },
      });

      if (error) {
        const functionError = await error.context.json();
        throw new Error(functionError.error || "Une erreur est survenue.");
      }
      
      setStatus('success');
      setMessage(data.message);
    } catch (err) {
      setStatus('error');
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <img src="/logo-dark.png" alt="Inglis Dominium Logo" className="mx-auto h-12 mb-4" />
          <CardTitle>Autorisation de Consultation de Dossier de Crédit</CardTitle>
        </CardHeader>
        <CardContent>
          {status === 'idle' && (
            <div className="space-y-6">
              <p className="text-muted-foreground">
                En cliquant sur "Confirmer et autoriser", vous donnez votre consentement explicite à votre institution financière pour qu'elle consulte votre dossier de crédit complet via la plateforme Inglis Dominium.
              </p>
              <Button onClick={handleConfirm} className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmer et autoriser
              </Button>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
              <p>{message}</p>
              <Button asChild className="w-full"><a href="https://www.inglisdominion.ca">Fermer</a></Button>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center space-y-4">
              <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
              <p className="font-semibold">Une erreur est survenue</p>
              <p className="text-muted-foreground">{message}</p>
              <Button asChild className="w-full"><a href="https://www.inglisdominion.ca">Retour à l'accueil</a></Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmCreditPull;