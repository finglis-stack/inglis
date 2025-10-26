import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Info, MapPin, Repeat } from 'lucide-react';
import { showError } from '@/utils/toast';
import AvailabilityCell from '@/components/q12x/AvailabilityCell';
import TransactionMap from '@/components/q12x/TransactionMap';
import { useTranslation } from 'react-i18next';

const Q12xTransactionDetails = () => {
  const { t } = useTranslation('q12x');
  const { id } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<any>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // ... (useEffect pour fetchTransaction et fetchLocation reste identique)

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!transaction) {
    // ...
  }

  const card = transaction.debit_accounts?.cards || transaction.credit_accounts?.cards;
  const cardNumber = card ? `${card.user_initials} ... ${card.unique_identifier.slice(-3)} ${card.check_digit}` : 'N/A';
  const issuerName = card?.card_programs?.institutions?.name || 'Émetteur inconnu';

  const displayAmount = transaction.original_amount || transaction.amount;
  const displayCurrency = transaction.original_currency || transaction.currency;

  return (
    <div className="space-y-6">
      <Link to="/dashboard/transactions" className="flex items-center gap-2 text-indigo-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> {t('transactionDetails.back')}
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>{t('transactionDetails.title')}</CardTitle>
          <CardDescription className="font-mono text-xs pt-2">{transaction.id}</CardDescription>
        </CardHeader>
        <CardContent className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('transactionDetails.amount')}</p>
              <p className="text-3xl font-bold">{new Intl.NumberFormat('fr-CA', { style: 'currency', currency: displayCurrency }).format(displayAmount)}</p>
            </div>
            {/* ... autres détails ... */}
          </div>
          <div className="space-y-4">
            {/* ... autres détails ... */}
            {transaction.exchange_rate && (
              <div className="bg-gray-50 border p-4 rounded-lg">
                <h4 className="font-semibold text-sm flex items-center gap-2"><Repeat className="h-4 w-4" /> Conversion de devise</h4>
                <p className="text-sm mt-2">Montant payé par le client : {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: transaction.currency }).format(transaction.amount)}</p>
                <p className="text-xs text-muted-foreground">Taux de change appliqué : 1 {transaction.original_currency} = {transaction.exchange_rate.toFixed(4)} {transaction.currency}</p>
              </div>
            )}
          </div>
          {/* ... reste du composant ... */}
        </CardContent>
      </Card>
    </div>
  );
};

export default Q12xTransactionDetails;