import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Clock, Banknote } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { showError } from '@/utils/toast';
import { useTranslation } from 'react-i18next';

const Q12xDashboard = () => {
  const { t } = useTranslation('q12x');
  const [merchant, setMerchant] = useState<any>(null);
  const [summaryData, setSummaryData] = useState<{ today_revenue: number; in_transit_balance: number } | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: merchantData, error: merchantError } = await supabase
          .from('merchant_accounts')
          .select('id, name')
          .eq('user_id', user.id)
          .single();
        
        if (merchantError) {
          showError("Profil marchand non trouvé.");
          setLoading(false);
          return;
        }
        setMerchant(merchantData);

        const [summaryRes, balanceRes] = await Promise.all([
          supabase.rpc('get_merchant_balance_summary', { p_merchant_id: merchantData.id }).single(),
          supabase.rpc('get_merchant_balance', { p_merchant_id: merchantData.id }).single()
        ]);

        if (summaryRes.error) {
          showError(`Erreur lors de la récupération du résumé : ${summaryRes.error.message}`);
        } else {
          setSummaryData(summaryRes.data as { today_revenue: number; in_transit_balance: number });
        }

        if (balanceRes.error) {
          showError(`Erreur lors de la récupération du solde : ${balanceRes.error.message}`);
        } else {
          setBalance(balanceRes.data as number);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(amount);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">
          {t('dashboard.welcome', { name: merchant ? merchant.name : '...' })}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t('dashboard.subtitle')}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.todayRevenue')}</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-3/4" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(summaryData?.today_revenue || 0)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.availableBalance')}</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-3/4" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(balance || 0)}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {t('dashboard.availableBalanceDesc')}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.inTransitBalance')}</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-3/4" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(summaryData?.in_transit_balance || 0)}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {t('dashboard.inTransitBalanceDesc')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Q12xDashboard;