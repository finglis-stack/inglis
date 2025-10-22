import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { CheckoutPaymentForm } from '@/components/q12x/CheckoutPaymentForm';

const PublicCheckoutPage = () => {
  const { checkoutId } = useParams();
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
        .eq('status', 'active')
        .single();

      if (error || !data) {
        setCheckout(null);
      } else {
        setCheckout(data);
      }
      setLoading(false);
    };
    fetchCheckout();
  }, [checkoutId]);

  const handlePaymentSubmit = async (cardDetails: any) => {
    setProcessing(true);
    try {
      const amount = checkout.is_amount_variable ? parseFloat(variableAmount) : checkout.amount;
      if (isNaN(amount) || amount <= 0) {
        throw new Error("Montant invalide.");
      }

      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('api-v1-tokenize-card', {
        body: cardDetails
      });

      if (tokenError) {
        const functionError = await tokenError.context.json();
        throw new Error(functionError.error || "La carte est invalide ou les informations sont incorrectes.");
      }

      const { error: paymentError } = await supabase.functions.invoke('process-checkout-payment', {
        body: {
          checkoutId: checkout.id,
          card_token: tokenData.token,
          amount: amount,
        }
      });

      if (paymentError) {
        const functionError = await paymentError.context.json();
        throw new Error(functionError.error || "Le paiement a échoué.");
      }

      showSuccess("Paiement réussi !");
      if (checkout.success_url) {
        window.location.href = checkout.success_url;
      }
      // Afficher un message de succès si pas de redirection
    } catch (err) {
      showError(err.message);
      if (checkout.cancel_url) {
        // Ne pas rediriger en cas d'erreur pour que l'utilisateur puisse réessayer
      }
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!checkout) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 text-center">
        <div>
          <h1 className="text-2xl font-bold font-mono text-gray-900 mb-4">Q12x</h1>
          <h2 className="text-xl font-semibold text-gray-800">Lien de paiement invalide</h2>
          <p className="text-muted-foreground mt-2">Ce lien a peut-être expiré ou été désactivé.</p>
        </div>
      </div>
    );
  }

  const finalAmount = checkout.is_amount_variable ? parseFloat(variableAmount) || 0 : checkout.amount;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans">
      {/* Colonne de gauche : Résumé */}
      <div className="w-full lg:w-1/2 bg-gray-50 p-8 lg:p-12 flex flex-col justify-center">
        <div className="max-w-md mx-auto w-full">
          <h1 className="text-2xl font-bold font-mono text-gray-900 mb-6">Q12x</h1>
          <p className="text-sm text-gray-500">Payer à</p>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">{checkout.merchant_accounts.name}</h2>
          {checkout.description && <p className="text-gray-600 mb-6">{checkout.description}</p>}
          
          <div className="border-t border-b border-gray-200 py-4">
            {checkout.is_amount_variable ? (
              <div className="grid gap-2">
                <Label htmlFor="amount">Montant à payer</Label>
                <Input 
                  id="amount" 
                  type="number" 
                  value={variableAmount} 
                  onChange={(e) => setVariableAmount(e.target.value)} 
                  placeholder="0.00" 
                  className="text-lg font-semibold"
                />
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total</span>
                <span className="text-2xl font-semibold text-gray-900">
                  {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(checkout.amount)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Colonne de droite : Formulaire de paiement */}
      <div className="w-full lg:w-1/2 bg-white p-8 lg:p-12 flex items-center justify-center">
        <div className="max-w-md w-full">
          <CheckoutPaymentForm onSubmit={handlePaymentSubmit} processing={processing} amount={finalAmount} />
        </div>
      </div>
    </div>
  );
};

export default PublicCheckoutPage;