import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Lock } from 'lucide-react';
import { CheckoutPaymentForm } from '@/components/q12x/CheckoutPaymentForm';
import ProcessingPaymentModal from '@/components/q12x/ProcessingPaymentModal';
import { useTranslation, Trans } from 'react-i18next';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const PublicCheckoutPage = () => {
  const { checkoutId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('q12x');
  const [checkout, setCheckout] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [variableAmount, setVariableAmount] = useState('');
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

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
    setPaymentError(null);
    setShowProcessingModal(true);

    try {
      const amount = checkout.is_amount_variable ? parseFloat(variableAmount) : checkout.amount;
      if (isNaN(amount) || amount <= 0) {
        setPaymentError(t('publicCheckout.form.invalidAmount'));
        setShowProcessingModal(false);
        setProcessing(false);
        return;
      }

      const { data: tokenData, error: tokenError } = await supabase.functions.invoke('api-v1-tokenize-card', {
        body: cardDetails
      });

      if (tokenError) throw tokenError;

      const { data: paymentData, error: paymentError } = await supabase.functions.invoke('process-checkout-payment', {
        body: {
          checkoutId: checkout.id,
          card_token: tokenData.token,
          amount: amount,
        }
      });

      if (paymentError) throw paymentError;

      navigate(`/payment-success?transactionId=${paymentData.transaction.transaction_id}&amount=${amount}`);

    } catch (err) {
      setShowProcessingModal(false);
      setPaymentError(t('publicCheckout.form.paymentRefused'));
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
          <h2 className="text-xl font-semibold text-gray-800">{t('publicCheckout.invalidLink')}</h2>
          <p className="text-muted-foreground mt-2">{t('publicCheckout.invalidLinkDesc')}</p>
        </div>
      </div>
    );
  }

  const finalAmount = checkout.is_amount_variable ? parseFloat(variableAmount) || 0 : checkout.amount;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans">
      <ProcessingPaymentModal isOpen={showProcessingModal} />
      <div className="w-full lg:w-1/2 bg-gray-50 p-8 lg:p-12 flex flex-col justify-center">
        <div className="max-w-md mx-auto w-full">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold font-mono text-gray-900">Q12x</h1>
            <LanguageSwitcher />
          </div>
          <p className="text-sm text-gray-500">{t('publicCheckout.paymentTo')}</p>
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">{checkout.merchant_accounts.name}</h2>
          {checkout.description && <p className="text-gray-600 mb-6">{checkout.description}</p>}
          
          <div className="border-t border-b border-gray-200 py-4">
            {checkout.is_amount_variable ? (
              <div className="grid gap-2">
                <Label htmlFor="amount">{t('publicCheckout.amountToPay')}</Label>
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
                <span className="text-gray-600">{t('publicCheckout.total')}</span>
                <span className="text-2xl font-semibold text-gray-900">
                  {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(checkout.amount)}
                </span>
              </div>
            )}
          </div>
          <div className="mt-8 text-xs text-gray-400 flex items-center justify-center gap-2">
            <Lock className="h-3 w-3" />
            <span>{t('publicCheckout.securePayment')}</span>
          </div>
        </div>
      </div>

      <div className="w-full lg:w-1/2 bg-white p-8 lg:p-12 flex flex-col justify-center">
        <div className="max-w-md w-full mx-auto">
          <h3 className="text-xl font-semibold mb-1">{t('publicCheckout.paymentInfo')}</h3>
          <p className="text-sm text-muted-foreground mb-6">{t('publicCheckout.paymentInfoDesc')}</p>
          <CheckoutPaymentForm 
            onSubmit={handlePaymentSubmit} 
            processing={processing} 
            amount={finalAmount}
            error={paymentError}
          />
          <div className="text-center mt-6 text-xs text-gray-400">
            <p>
              <Trans
                i18nKey="publicCheckout.terms"
                t={t}
                components={[
                  <a href="#" className="underline hover:text-gray-600" />,
                  <a href="#" className="underline hover:text-gray-600" />,
                ]}
              />
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicCheckoutPage;