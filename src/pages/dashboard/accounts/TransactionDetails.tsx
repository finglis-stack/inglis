import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Clock, Hash, Globe, Percent, Calendar, Info, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { showError } from '@/utils/toast';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import TransactionMap from '@/components/dashboard/transactions/TransactionMap';

const TransactionDetails = () => {
  const { t } = useTranslation('dashboard');
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
          credit_accounts (
            interest_rate,
            cash_advance_rate
          )
        `)
        .eq('id', id)
        .single();

      if (error) {
        showError(t('transactions.notFound'));
        navigate(-1);
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
            setLocationError(data.reason || 'Impossible de géolocaliser l\'adresse IP.');
          } else {
            setLocation(data);
          }
        } catch (e) {
          console.error("Erreur de géolocalisation:", e);
          setLocationError('Le service de géolocalisation est indisponible.');
        } finally {
          setLocationLoading(false);
        }
      };
      fetchLocation();
    }
  }, [transaction]);

  const getPotentialInterest = () => {
    if (!transaction || !transaction.credit_accounts || transaction.type !== 'purchase') {
      return null;
    }
    const dailyRate = (transaction.credit_accounts.interest_rate / 100) / 365;
    const interestPerDay = transaction.amount * dailyRate;
    return {
      daily: interestPerDay,
      monthly: interestPerDay * 30,
    };
  };

  const interest = getPotentialInterest();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!transaction) return null;

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
              <p className="text-4xl font-bold">{new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(transaction.amount)}</p>
              <p className="text-lg">{transaction.description}</p>
              <Badge variant="outline" className="capitalize">{transaction.type.replace('_', ' ')}</Badge>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground bg-gray-50 p-4 rounded-md border">
              <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> <span>{t('transactions.performedOn')}: {new Date(transaction.created_at).toLocaleString('fr-CA')}</span></div>
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> <span>{t('transactions.authorizedOn')}: {new Date(transaction.authorized_at).toLocaleString('fr-CA')}</span></div>
              <div className="flex items-center gap-2"><Globe className="h-4 w-4" /> <span>{t('transactions.ipAddress')}: {transaction.ip_address || 'N/A'}</span></div>
            </div>
          </div>
          
          {interest && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="font-semibold flex items-center gap-2"><Percent className="h-4 w-4" /> {t('transactions.potentialInterest')}</h4>
                <p className="text-sm text-muted-foreground">{t('transactions.interestDisclaimer', { rate: transaction.credit_accounts.interest_rate })}</p>
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <p className="text-xs font-bold uppercase text-muted-foreground">{t('transactions.perDay')}</p>
                    <p className="text-lg font-semibold">{new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(interest.daily)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase text-muted-foreground">{t('transactions.perMonth')}</p>
                    <p className="text-lg font-semibold">{new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(interest.monthly)}</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {transaction.ip_address && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2"><MapPin className="h-5 w-5" /> Géolocalisation (approximative)</h3>
                {locationLoading ? (
                  <Skeleton className="h-[250px] w-full rounded-lg" />
                ) : location && location.latitude && location.longitude ? (
                  <TransactionMap latitude={location.latitude} longitude={location.longitude} />
                ) : (
                  <div className="h-[250px] w-full rounded-lg bg-gray-100 flex items-center justify-center text-center p-4">
                    <p className="text-sm text-muted-foreground">{locationError || "Données de localisation non disponibles pour cette adresse IP."}</p>
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