import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useNewTransaction } from '@/context/NewTransactionContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2 } from 'lucide-react';

const Step3Review = () => {
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
        showError("Impossible de trouver le compte associé.");
        navigate(finalBackUrl);
      } else {
        setCardId(data.card_id);
      }
    };
    fetchCardId();
  }, [accountId, accountType, navigate, finalBackUrl]);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('process_transaction', {
        p_card_id: cardId,
        p_amount: transactionData.amount,
        p_type: 'purchase',
        p_description: transactionData.description,
      });

      if (error) throw error;

      showSuccess("Transaction manuelle ajoutée avec succès !");
      resetTransaction();
      navigate(finalBackUrl);
    } catch (err) {
      showError(`Erreur lors de la transaction : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Résumé de la Transaction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Montant</p>
            <p className="text-xl font-bold">{new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(transactionData.amount || 0)}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Marchand</p>
            <p>{transactionData.description}</p>
          </div>
          <div>
            <p className="text-sm font-semibold text-muted-foreground">Justification</p>
            <p className="text-sm italic bg-gray-50 p-2 rounded-md border">{transactionData.reason}</p>
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-between mt-8">
        <Button type="button" variant="outline" onClick={() => navigate('../step-2')} disabled={loading}>Précédent</Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? 'Soumission...' : 'Confirmer et Soumettre'}
        </Button>
      </div>
    </div>
  );
};

export default Step3Review;