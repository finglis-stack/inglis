import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, DollarSign, CreditCard, User, Clock, PlusCircle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { showError } from '@/utils/toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DebitAccountAccessLog from '@/components/dashboard/accounts/DebitAccountAccessLog';
import { useDebitAccountBalance } from '@/hooks/useDebitAccountBalance';
import { useTranslation } from 'react-i18next';
import AddFundsDialog from '@/components/dashboard/accounts/AddFundsDialog';

const DebitAccountDetails = () => {
  const { t } = useTranslation('dashboard');
  const { accountId } = useParams();
  const navigate = useNavigate();
  const [account, setAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingAuthCount, setPendingAuthCount] = useState(0);

  const { data: balanceData, isLoading: balanceLoading, refetch: refetchBalance, secondsUntilRefresh } = useDebitAccountBalance(accountId!);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!accountId) return;
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('debit_account_access_logs')
          .insert({ debit_account_id: accountId, visitor_user_id: user.id });
      }

      const { data: accountData, error: accountError } = await supabase
        .from('debit_accounts')
        .select(`
          *,
          cards(*, card_programs(program_name)),
          profiles(full_name, legal_name, type)
        `)
        .eq('id', accountId)
        .single();

      if (accountError) {
        showError(`${t('accounts.error')}: ${accountError.message}`);
        setLoading(false);
        return;
      }
      setAccount(accountData);

      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('debit_account_id', accountId)
        .order('created_at', { ascending: false });
      
      if (transactionsError) {
        showError(`${t('accounts.transactionError')}: ${transactionsError.message}`);
      } else {
        setTransactions(transactionsData);
      }

      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('debit_account_id', accountId)
        .eq('status', 'authorized');
      setPendingAuthCount(count || 0);

      const { data: logsData, error: logsError } = await supabase.rpc('get_debit_account_access_logs', {
        p_account_id: accountId,
      });
      if (logsError) {
        showError(`${t('accounts.accessLogError')}: ${logsError.message}`);
      } else {
        setAccessLogs(logsData || []);
      }

      setLoading(false);
    };

    fetchDetails();
  }, [accountId, t]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full md:col-span-2" />
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!account) {
    return <div>{t('accounts.accountNotFound')}</div>;
  }

  const profileName = account.profiles.type === 'personal' ? account.profiles.full_name : account.profiles.legal_name;
  const cardNumber = `${account.cards.user_initials} ${account.cards.issuer_id} ${account.cards.random_letters} ****${account.cards.unique_identifier.slice(-3)} ${account.cards.check_digit}`;

  const currentBalance = balanceData?.current_balance || 0;

  return (
    <div className="space-y-6">
      <Link to="/dashboard/cards" className="flex items-center text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('accounts.backToCards')}
      </Link>
      
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{t('accounts.debitAccountManagement')}</h1>
          <p className="text-muted-foreground">{t('accounts.accountOf', { name: profileName })}</p>
          <p className="text-xs text-muted-foreground font-mono mt-1">ID: {account.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={account.status === 'active' ? 'default' : 'destructive'}>{account.status}</Badge>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => refetchBalance()}
            disabled={balanceLoading}
          >
            <RefreshCw className={`h-4 w-4 ${balanceLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> {t('accounts.currentBalance')}</CardTitle>
          </CardHeader>
          <CardContent>
            {balanceLoading ? (
              <Skeleton className="h-12 w-full" />
            ) : (
              <>
                <p className="text-sm text-muted-foreground mb-1">
                  <span className="text-xs">({secondsUntilRefresh}s)</span>
                </p>
                <p className="text-4xl font-bold">
                  {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(currentBalance)}
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('accounts.accountActions')}</CardTitle>
            <CardDescription>{t('accounts.accountActionsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <AddFundsDialog cardId={account.card_id} onFundsAdded={refetchBalance} />
            <Button asChild>
              <Link to={`/dashboard/accounts/debit/${accountId}/new-transaction`}>
                <PlusCircle className="mr-2 h-4 w-4" />
                {t('accounts.addDebit')}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to={`/dashboard/accounts/debit/${accountId}/pending-authorizations`}>
                <Clock className="mr-2 h-4 w-4" />
                {t('accounts.pendingAuthorizations')}
                {pendingAuthCount > 0 && (
                  <Badge variant="secondary" className="ml-2">{pendingAuthCount}</Badge>
                )}
              </Link>
            </Button>
            <Button variant="destructive">{t('accounts.blockAccount')}</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> {t('accounts.transactionHistory')}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('userProfile.date')}</TableHead>
                <TableHead>{t('accounts.description')}</TableHead>
                <TableHead>{t('userProfile.type')}</TableHead>
                <TableHead>{t('userProfile.status')}</TableHead>
                <TableHead className="text-right">{t('newTransaction.amount')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length > 0 ? (
                transactions.map((tx) => (
                  <TableRow key={tx.id} onClick={() => navigate(`/dashboard/transactions/${tx.id}`)} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>{new Date(tx.created_at).toLocaleString('fr-CA')}</TableCell>
                    <TableCell>{tx.description || 'N/A'}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{tx.type}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={
                        tx.status === 'captured' || tx.status === 'completed' ? 'default' :
                        tx.status === 'authorized' ? 'secondary' :
                        tx.status === 'expired' || tx.status === 'cancelled' ? 'destructive' :
                        'outline'
                      }>
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${tx.type === 'payment' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'payment' ? '+' : '-'}
                      {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(tx.amount)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    {t('accounts.noTransactions')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> {t('accounts.associatedCard')}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="font-mono">{cardNumber}</p>
            <p className="text-sm text-muted-foreground">{t('userProfile.program')}: {account.cards.card_programs.program_name}</p>
            <p className="text-sm text-muted-foreground">{t('accounts.cardStatus')}: <Badge variant={account.cards.status === 'active' ? 'default' : 'destructive'}>{account.cards.status}</Badge></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> {t('accounts.accountHolder')}</CardTitle></CardHeader>
          <CardContent>
            <p className="font-semibold">{profileName}</p>
            <Button variant="link" asChild className="p-0 h-auto mt-2">
              <Link to={`/dashboard/users/profile/${account.profile_id}`}>{t('accounts.viewFullProfile')}</Link>
            </Button>
          </CardContent>
        </Card>
        <DebitAccountAccessLog logs={accessLogs} className="md:col-span-2" />
      </div>
    </div>
  );
};

export default DebitAccountDetails;