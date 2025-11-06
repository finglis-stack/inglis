import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

const ConfirmCreditConsent = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(false);
  const [autoConsent, setAutoConsent] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [institutionName, setInstitutionName] = useState('');

  const handleConfirm = async () => {
    setLoading(true);
    setStatus('idle');
    try {
      const { data, error } = await supabase.functions.invoke('confirm-credit-bureau-consent', {
        body: { token, autoConsent },
      });

      if (error) {
        const functionError = await error.context.json();
        throw new Error(functionError.error || "Une erreur est survenue.");
      }
      
      setStatus('success');
      setMessage(`Merci ! Votre consentement a été enregistré et vos informations ont été partagées avec ${data.institutionName}.`);
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
          <img src="/logo-dark.png" alt="Inglis Dominion Logo" className="mx-auto h-12 mb-4" />
          <CardTitle>Autorisation de Partage de Données</CardTitle>
        </CardHeader>
        <CardContent>
          {status === 'idle' && (
            <div className="space-y-6">
              <p className="text-muted-foreground">
                Veuillez lire attentivement et confirmer que vous autorisez le partage de vos informations de crédit.
              </p>
              <div className="p-4 bg-gray-50 rounded-md border">
                <h4 className="font-semibold">Termes de l'autorisation</h4>
                <p className="text-sm text-muted-foreground mt-2">
                  En cliquant sur "Confirmer", vous autorisez l'institution financière mentionnée dans l'e-mail à transmettre les informations relatives à vos comptes (limites de crédit, soldes, historique de paiement) au bureau de crédit. Cette action peut influencer votre cote de crédit.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="auto-consent" checked={autoConsent} onCheckedChange={(checked) => setAutoConsent(checked === true)} />
                <Label htmlFor="auto-consent" className="text-sm">
                  J'autorise cette institution à mettre à jour mes informations de crédit à l'avenir sans me demander à nouveau.
                </Label>
              </div>
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

export default ConfirmCreditConsent;