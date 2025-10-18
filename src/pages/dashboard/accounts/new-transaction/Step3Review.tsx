import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useNewTransaction } from '@/context/NewTransactionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2, Clock, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

const Step3Review = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const { accountId } = useParams();
  const { transactionData, resetTransaction } = useNewTransaction();
  const [loading, setLoading] = useState(false);
  const [cardId, setCardId] = useState<string | null>(null);

  // Déterminer le type de compte à partir de l'URL
  const accountType = location.pathname.includes('/debit/') ? 'debit' : 'credit';
  const finalBackUrl = `/dashboard/accounts/${accountType}/${accountId}`;

  useEffect(() => {
    const fetchCardId = async () => {
      const tableName = accountType === 'credit' ? 'credit_accounts' : 'debit_accounts';
      const { data, error } = await supabase
        .from(tableName)
        .select('card_id')
        .eq('id', accountId)
        .single();

      if (error || !data) {
        showError(t('accountNotFound', { ns: 'common' }));
        navigate(finalBackUrl);
      } else {
        setCardId(data.card_id);
      }
    };
    fetchCardId();
  }, [accountId, accountType, navigate, finalBackUrl, t]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('create_authorization', {
        p_card_id: cardId,
        p_amount: transactionData.amount,
        p_description: transactionData.description,
        p_capture_delay_hours: transactionData.captureHours || 0,
      });

      if (error) throw error;

      const isImmediate = transactionData.captureHours === 0;
      showSuccess(
        isImmediate 
          ? t('newTransaction.successCapture')
          : t('newTransaction.successHold', { code: data.authorization_code })
      );
      resetTransaction();
      navigate(finalBackUrl);
    } catch (err) {
      showError(`${t('error', { ns: 'common' })}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const isImmediate = transactionData.captureHours === 0;
  const expiresAt = transactionData.captureHours > 0 
    ? new Date(Date.now() + transactionData.captureHours * 60 * 60 * 1000)
    : null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('newTransaction.transactionSummary')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">{t('newTransaction.amount')}</p>
            <p className="text-xl font-bold">{new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(transactionData.amount || 0)}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">{t('description', { ns: 'common' })}</p>
            <p>{transactionData.description}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">{t('newTransaction.captureType')}</p>
            <div className="flex items-center gap-2 mt-1">
              {isImmediate ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <Badge variant="default">{t('newTransaction.immediateCapture')}</Badge>
                </>
              ) : (
                <>
                  <Clock className="h-4 w-4 text-orange-600" />
                  <Badge variant="secondary">{t('newTransaction.authorizationHold')}</Badge>
                </>
              )}
            </div>
            {!isImmediate && (
              <p className="text-sm text-muted-foreground mt-2">
                <span dangerouslySetInnerHTML={{ __html: t('newTransaction.captureScheduled', { hours: transactionData.captureHours }) }} />
                <br />
                <span className="text-xs">{t('newTransaction.expiresOn', { date: expiresAt?.toLocaleString('fr-CA') })}</span>
              </p>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">{t('newTransaction.justification')}</p>
            <p className="text-sm italic bg-gray-50 p-2 rounded-md border">{transactionData.reason}</p>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-between mt-8">
        <Button type="button" variant="outline" onClick={() => navigate('../step-2')} disabled={loading}>{t('previous', { ns: 'common' })}</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? t('newTransaction.submitting') : (isImmediate ? t('newTransaction.confirmAndCapture') : t('newTransaction.createAuthorization'))}
        </Button>
      </div>
    </div>
  );
};

export default Step3Review;