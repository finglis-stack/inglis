import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Info } from 'lucide-react';
import { showError } from '@/utils/toast';

const Q12xTransactionDetails = () => {
  const { id } = useParams();
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransaction = async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          debit_accounts (
            cards (
              user_initials, issuer_id, random_letters, unique_identifier, check_digit,
              card_programs (
                institutions ( name )
              )
            )
          ),
          credit_accounts (
            cards (
              user_initials, issuer_id, random_letters, unique_identifier, check_digit,
              card_programs (
                institutions ( name )
              )
            )
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        console.error("Erreur de Supabase:", error);
        showError("Transaction non trouvée.");
      } else {
        setTransaction(data);
      }
      setLoading(false);
    };
    fetchTransaction();
  }, [id]);

  if (loading) {
    return <Skeleton className="h-64 w-full bg-gray-800" />;
  }

  if (!transaction) {
    return (
      <div>
        <Link to="/dashboard/transactions" className="flex items-center gap-2 text-indigo-400 hover:underline mb-4">
          <ArrowLeft className="h-4 w-4" /> Retour aux transactions
        </Link>
        <p>Transaction non trouvée.</p>
      </div>
    );
  }

  const card = transaction.debit_accounts?.cards || transaction.credit_accounts?.cards;
  const cardNumber = card ? `${card.user_initials} ${card.issuer_id} ${card.random_letters} ****${card.unique_identifier.slice(-3)} ${card.check_digit}` : 'N/A';
  const issuerName = card?.card_programs?.institutions?.name || 'Émetteur inconnu';

  return (
    <div className="space-y-6">
      <Link to="/dashboard/transactions" className="flex items-center gap-2 text-indigo-400 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Retour aux transactions
      </Link>
      <Card className="bg-gray-800 border-gray-700 text-white">
        <CardHeader>
          <CardTitle>Détails de la Transaction</CardTitle>
          <CardDescription className="font-mono text-xs text-gray-400 pt-2">{transaction.id}</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400">Montant</p>
              <p className="text-3xl font-bold">{new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(transaction.amount)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Description</p>
              <p>{transaction.description}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Date</p>
              <p>{new Date(transaction.created_at).toLocaleString('fr-CA')}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-400">Carte Utilisée</p>
              <p className="font-mono">{cardNumber}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Émetteur de la carte</p>
              <p>{issuerName}</p>
            </div>
            <div className="bg-gray-700/50 p-4 rounded-lg flex items-start gap-3">
              <Info className="h-5 w-5 text-indigo-400 mt-1 flex-shrink-0" />
              <div>
                <h4 className="font-semibold">Frais d'interchange</h4>
                <p className="text-gray-300">0,00 $</p>
                <p className="text-xs text-gray-400 mt-1">Les transactions sur le réseau Inglis Dominium n'ont aucun frais d'interchange.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Q12xTransactionDetails;