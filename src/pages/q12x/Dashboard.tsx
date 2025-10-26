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
  const [summaryData, setSummaryData] = useState<any[]>([]);
  const [balanceData, setBalanceData] = useState<any[]>([]);
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
          supabase.rpc('get_merchant_balance_summary_by_currency', { p_merchant_id: merchantData.id }),
          supabase.rpc('get_merchant_balance_by_currency', { p_merchant_id: merchantData.id })
        ]);

        if (summaryRes.error) {
          showError(`Erreur lors de la récupération du résumé : ${summaryRes.error.message}`);
        } else {
          setSummaryData(summaryRes.data || []);
        }

        if (balanceRes.error) {
          showError(`Erreur lors de la récupération du solde : ${balanceRes.error.message}`);
        } else {
          setBalanceData(balanceRes.data || []);
        }
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('fr-CA', { style: 'currency', currency }).format(amount);
  };

  const allCurrencies = [...new Set([...summaryData.map(s => s.currency), ...balanceData.map(b => b.currency)])];

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

      {loading ? (
        <div className="grid gap-6 md:grid-cols-3">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : allCurrencies.length > 0 ? (
        <div className="space-y-6">
          {allCurrencies.map(currency => {
            const summary = summaryData.find(s => s.currency === currency) || { today_revenue: 0, in_transit_balance: 0 };
            const balance = balanceData.find(b => b.currency === currency) || { total_balance: 0 };
            return (
              <div key={currency}>
                <h2 className="text-xl font-semibold mb-4">{t('dashboard.balancesByCurrency')} ({currency})</h2>
                <div className="grid gap-6 md:grid-cols-3">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t('dashboard.todayRevenue')}</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(summary.today_revenue, currency)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t('dashboard.availableBalance')}</CardTitle>
                      <Banknote className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(balance.total_balance, currency)}</div>
                      <p className="text-xs text-muted-foreground">{t('dashboard.availableBalanceDesc')}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">{t('dashboard.inTransitBalance')}</CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{formatCurrency(summary.in_transit_balance, currency)}</div>
                      <p className="text-xs text-muted-foreground">{t('dashboard.inTransitBalanceDesc')}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p>Aucune donnée financière à afficher.</p>
      )}
    </div>
  );
};

export default Q12xDashboard;