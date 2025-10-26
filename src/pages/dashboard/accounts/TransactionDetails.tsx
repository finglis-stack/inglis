import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Clock, Hash, Globe, Calendar, MapPin, Repeat } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { showError } from '@/utils/toast';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import TransactionMap from '@/components/dashboard/transactions/TransactionMap';

const TransactionDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('dashboard');
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
        .select('*, merchant_accounts(name)')
        .eq('id', id)
        .single();

      if (error) {
        showError(t('transactions.notFound'));
        navigate(-1); // Go back to previous page
      } else {
        setTransaction(data);
      }
      setLoading(false);
    };
    fetchTransaction();
  }, [id, navigate, t]);

  useEffect(() => {
    if (transaction?.ip_address) {
      const fetchLocation = async () => {
        setLocationLoading(true);
        setLocationError(null);
        try {
          const response = await fetch(`https://ipapi.co/${transaction.ip_address}/json/`);
          const data = await response.json();
          if (data.error) {
            setLocationError('Erreur de géolocalisation');
          } else {
            setLocation(data);
          }
        } catch (e) {
          console.error("Erreur de géolocalisation:", e);
          setLocationError('Erreur de géolocalisation');
        } finally {
          setLocationLoading(false);
        }
      };
      fetchLocation();
    }
  }, [transaction]);

  if (loading) {
    return (
      <div className="space-y-6 p-8">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="p-8">
        <p>{t('transactions.notFound')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => navigate(-1)} className="flex items-center text-sm text-muted-foreground hover:text-primary px-0">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('transactions.back')}
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('transactions.transactionDetails')}</CardTitle>
          <CardDescription className="flex items-center gap-2 pt-2">
            <Hash className="h-4 w-4" /> <span className="font-mono">{transaction.id}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-4">
              <p className="text-4xl font-bold">{new Intl.NumberFormat('fr-CA', { style: 'currency', currency: transaction.currency }).format(transaction.amount)}</p>
              <p className="text-lg">{transaction.description}</p>
              <Badge variant="outline" className="capitalize">{transaction.type.replace('_', ' ')}</Badge>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground bg-gray-50 p-4 rounded-md border">
              <div className="flex items-center gap-2"><Clock className="h-4 w-4" /><span>{t('transactions.performedOn')} {new Date(transaction.created_at).toLocaleString('fr-CA')}</span></div>
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /><span>{t('transactions.authorizedOn')} {new Date(transaction.authorized_at).toLocaleString('fr-CA')}</span></div>
              <div className="flex items-center gap-2"><Globe className="h-4 w-4" /><span>{t('transactions.ipAddress')}: {transaction.ip_address || 'N/A'}</span></div>
            </div>
          </div>
          
          {transaction.exchange_rate && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2"><Repeat className="h-4 w-4" /> Conversion de devise</h4>
                <p className="text-sm text-muted-foreground">Cette transaction a été effectuée dans une devise différente.</p>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-xs font-bold uppercase text-muted-foreground">Achat original</p>
                    <p className="text-lg font-semibold">{new Intl.NumberFormat('fr-CA', { style: 'currency', currency: transaction.original_currency }).format(transaction.original_amount)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-muted-foreground">Taux de change appliqué</p>
                    <p className="text-lg font-semibold">1 {transaction.original_currency} = {transaction.exchange_rate.toFixed(4)} {transaction.currency}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {transaction.ip_address && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold flex items-center gap-2 mb-2"><MapPin className="h-4 w-4" /> Géolocalisation (approximative)</h4>
                {locationLoading ? (
                  <Skeleton className="h-[250px] w-full rounded-lg" />
                ) : location && location.latitude && location.longitude ? (
                  <TransactionMap latitude={location.latitude} longitude={location.longitude} />
                ) : (
                  <div className="h-[250px] w-full rounded-lg bg-gray-100 flex items-center justify-center text-center p-4">
                    <p className="text-sm text-muted-foreground">{locationError || 'Données de localisation non disponibles.'}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionDetails;