import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import HostedPaymentForm from '@/pages/HostedPaymentForm';

const PublicCheckoutPage = () => {
  const { checkoutId } = useParams();
  const navigate = useNavigate();
  const [checkout, setCheckout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [variableAmount, setVariableAmount] = useState('');

  useEffect(() => {
    const fetchCheckout = async () => {
      if (!checkoutId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('checkouts')
        .select('*, merchant_accounts(name)')
        .eq('id', checkoutId)
        .single();

      if (error || !data) {
        showError("Ce lien de paiement est invalide ou n'existe plus.");
        // Optionnel: rediriger vers une page d'erreur
      } else {
        setCheckout(data);
      }
      setLoading(false);
    };
    fetchCheckout();
  }, [checkoutId]);

  useEffect(() => {
    const handleMessage = async (event: MessageEvent) => {
      if (event.data.type === 'inglis-dominium-token') {
        setProcessing(true);
        try {
          const amount = checkout.is_amount_variable ? parseFloat(variableAmount) : checkout.amount;
          if (isNaN(amount) || amount <= 0) {
            throw new Error("Montant invalide.");
          }

          const { error } = await supabase.functions.invoke('process-checkout-payment', {
            body: {
              checkoutId: checkout.id,
              card_token: event.data.token,
              amount: amount,
            }
          });

          if (error) {
            const functionError = await error.context.json();
            throw new Error(functionError.error || "Le paiement a échoué.");
          }

          showSuccess("Paiement réussi !");
          if (checkout.success_url) {
            window.location.href = checkout.success_url;
          }
        } catch (err) {
          showError(err.message);
          if (checkout.cancel_url) {
            window.location.href = checkout.cancel_url;
          }
        } finally {
          setProcessing(false);
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [checkout, variableAmount]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"><Skeleton className="h-96 w-full max-w-md" /></div>;
  }

  if (!checkout) {
    return <div className="text-center p-8">Lien de paiement non trouvé.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <h1 className="text-2xl font-bold font-mono text-gray-900">Q12x</h1>
          <CardTitle>{checkout.merchant_accounts.name}</CardTitle>
          <CardDescription>{checkout.description}</CardDescription>
        </CardHeader>
        <CardContent>
          {checkout.is_amount_variable ? (
            <div className="mb-4">
              <Label htmlFor="amount">Montant à payer</Label>
              <Input id="amount" type="number" value={variableAmount} onChange={(e) => setVariableAmount(e.target.value)} placeholder="0.00" />
            </div>
          ) : (
            <div className="text-center mb-4">
              <p className="text-sm text-muted-foreground">Montant</p>
              <p className="text-3xl font-bold">{new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(checkout.amount)}</p>
            </div>
          )}
          
          {processing ? (
            <div className="flex flex-col items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
              <p className="mt-4 text-muted-foreground">Traitement du paiement...</p>
            </div>
          ) : (
            <HostedPaymentForm />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PublicCheckoutPage;