import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, MapPin, Repeat } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { showError } from '@/utils/toast';
import TransactionMap from '@/components/q12x/TransactionMap';
import { useTranslation } from 'react-i18next';
import { getIpCoordinates } from '@/utils/ipGeolocation';

const Q12xTransactionDetails = () => {
  const { t } = useTranslation('q12x');
  const { id } = useParams();
  const navigate = useNavigate();
  const [transaction, setTransaction] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [location, setLocation] = useState<any>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTransaction = async () => {
      if (!id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          debit_accounts(
            id,
            cards(
              id,
              user_initials,
              issuer_id,
              random_letters,
              unique_identifier,
              check_digit,
              card_programs(
                id,
                program_name,
                institutions(
                  id,
                  name
                )
              )
            )
          ),
          credit_accounts(
            id,
            cards(
              id,
              user_initials,
              issuer_id,
              random_letters,
              unique_identifier,
              check_digit,
              card_programs(
                id,
                program_name,
                institutions(
                  id,
                  name
                )
              )
            )
          ),
          merchant_accounts(
            id,
            name
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        showError('Transaction non trouvée');
        navigate(-1);
      } else {
        setTransaction(data);
      }
      setLoading(false);
    };
    fetchTransaction();
  }, [id, navigate]);

  useEffect(() => {
    if (transaction?.ip_address) {
      const fetchLocation = async () => {
        setLocationLoading(true);
        setLocationError(null);
        try {
          const coords = await getIpCoordinates(transaction.ip_address);
          if (coords) {
            setLocation(coords);
          } else {
            setLocationError(t('transactionDetails.geolocationUnavailable'));
          }
        } catch (error) {
          console.error('Erreur de géolocalisation:', error);
          setLocationError(t('transactionDetails.geolocationError'));
        } finally {
          setLocationLoading(false);
        }
      };
      fetchLocation();
    }
  }, [transaction, t]);

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!transaction) {
    return (
      <div className="p-8">
        <p>Transaction non trouvée</p>
      </div>
    );
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
            <div>
              <p className="text-sm text-muted-foreground">{t('transactionDetails.description')}</p>
              <p className="text-lg">{transaction.description}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Statut</p>
              <Badge variant={
                transaction.status === 'completed' || transaction.status === 'captured' ? 'default' :
                transaction.status === 'authorized' ? 'secondary' :
                transaction.status === 'cancelled' || transaction.status === 'expired' ? 'destructive' :
                'outline'
              } className="capitalize">
                {transaction.status === 'captured' ? 'Capturée' : 
                 transaction.status === 'completed' ? 'Complétée' :
                 transaction.status === 'authorized' ? 'Autorisée' :
                 transaction.status === 'cancelled' ? 'Annulée' :
                 transaction.status === 'expired' ? 'Expirée' :
                 transaction.status}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Type</p>
              <p className="capitalize">
                {transaction.type === 'purchase' ? 'Achat' :
                 transaction.type === 'payment' ? 'Paiement' :
                 transaction.type === 'cash_advance' ? 'Avance de fonds' :
                 transaction.type}
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('transactionDetails.cardUsed')}</p>
              <p className="font-mono">{cardNumber}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('transactionDetails.cardIssuer')}</p>
              <p>{issuerName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Marchand</p>
              <p>{transaction.merchant_accounts?.name || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('transactionDetails.date')}</p>
              <p>{new Date(transaction.created_at).toLocaleString('fr-CA')}</p>
            </div>
            {transaction.exchange_rate && (
              <div className="bg-gray-50 border p-4 rounded-lg">
                <h4 className="font-semibold text-sm flex items-center gap-2"><Repeat className="h-4 w-4" /> Conversion de devise</h4>
                <p className="text-sm mt-2">Montant payé par le client : {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: transaction.currency }).format(transaction.amount)}</p>
                <p className="text-xs text-muted-foreground">Taux de change appliqué : 1 {transaction.original_currency} = {transaction.exchange_rate.toFixed(4)} {transaction.currency}</p>
              </div>
            )}
          </div>
          {transaction.ip_address && (
            <div className="md:col-span-2">
              <h4 className="font-semibold flex items-center gap-2 mb-2">
                <MapPin className="h-4 w-4" /> {t('transactionDetails.geolocation')}
              </h4>
              {locationLoading ? (
                <Skeleton className="h-[250px] w-full rounded-lg" />
              ) : location && location.lat && location.lon ? (
                <TransactionMap latitude={location.lat} longitude={location.lon} />
              ) : (
                <div className="h-[250px] w-full rounded-lg bg-gray-100 flex items-center justify-center text-center p-4">
                  <p className="text-sm text-muted-foreground">
                    {locationError || t('transactionDetails.geolocationUnavailable')}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Q12xTransactionDetails;