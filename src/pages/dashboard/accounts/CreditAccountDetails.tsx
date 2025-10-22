import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, DollarSign, CreditCard, User, Clock, PlusCircle, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { showError, showSuccess } from '@/utils/toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import CreditAccountAccessLog from '@/components/dashboard/accounts/CreditAccountAccessLog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useCreditAccountBalance } from '@/hooks/useCreditAccountBalance';
import { useTranslation } from 'react-i18next';

const CreditAccountDetails = () => {
  const { t } = useTranslation('dashboard');
  const { accountId } = useParams();
  const navigate = useNavigate();
  const [account, setAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [statement, setStatement] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [pendingAuthCount, setPendingAuthCount] = useState(0);

  const { data: balanceData, isLoading: balanceLoading, refetch: refetchBalance, secondsUntilRefresh } = useCreditAccountBalance(accountId!);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!accountId) return;
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('credit_account_access_logs')
          .insert({ credit_account_id: accountId, visitor_user_id: user.id });
      }

      const { data: accountData, error: accountError } = await supabase
        .from('credit_accounts')
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
        .eq('credit_account_id', accountId)
        .order('created_at', { ascending: false });
      
      if (transactionsError) {
        showError(`${t('accounts.transactionError')}: ${transactionsError.message}`);
      } else {
        setTransactions(transactionsData);
      }

      const { count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .eq('credit_account_id', accountId)
        .eq('status', 'authorized');
      setPendingAuthCount(count || 0);

      if (accountData.current_statement_id) {
        const { data: statementData, error: statementError } = await supabase
          .from('statements')
          .select('*')
          .eq('id', accountData.current_statement_id)
          .single();
        if (!statementError) setStatement(statementData);
      }

      const { data: logsData, error: logsError } = await supabase.rpc('get_credit_account_access_logs', {
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

    const channel = supabase.channel(`transactions_for_credit_account_${accountId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'transactions',
          filter: `credit_account_id=eq.${accountId}`
        },
        (payload) => {
          setTransactions((currentTransactions) => [payload.new, ...currentTransactions]);
          refetchBalance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [accountId, t, refetchBalance]);

  const handlePayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      showError(t('accounts.invalidPaymentAmount'));
      return;
    }

    try {
      const { error } = await supabase.rpc('process_transaction', {
        p_card_id: account.card_id,
        p_amount: amount,
        p_type: 'payment',
        p_description: t('accounts.paymentReceived')
      });

      if (error) throw error;

      showSuccess(t('accounts.paymentSuccess'));
      setPaymentAmount('');
      // No need to manually refetch transactions, realtime will handle it.
      refetchBalance();
    } catch (error) {
      showError(`${t('accounts.paymentError')}: ${error.message}`);
    }
  };

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

  const currentBalance = balanceData?.current_balance;
  const availableCredit = balanceData?.available_credit;

  return (
    <div className="space-y-6">
      <Link to="/dashboard/cards" className="flex items-center text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('accounts.backToCards')}
      </Link>
      
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{t('accounts.creditAccountManagement')}</h1>
          <p className="text-muted-foreground">{t('accounts.accountOf', { name: profileName })}</p>
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
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" /> {t('accounts.balanceAndStatement')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {balanceLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('accounts.currentBalance')} <span className="text-xs">({secondsUntilRefresh}s)</span>
                  </p>
                  <p className="text-2xl font-bold">
                    {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(currentBalance ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('accounts.on')} {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(account.credit_limit)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('accounts.availableCredit')}</p>
                  {typeof availableCredit === 'number' && availableCredit <= 0 ? (
                    <Badge variant="destructive">Solde zéro de disponible</Badge>
                  ) : (
                    <p className="text-lg font-semibold text-green-600">
                      {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(availableCredit ?? 0)}
                    </p>
                  )}
                </div>
              </>
            )}
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">{t('accounts.minimumPayment')}</p>
              <p className="text-lg font-semibold">{new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(statement?.minimum_payment || 0)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('accounts.dueDate')}</p>
              <p className="text-lg font-semibold">{statement ? new Date(statement.payment_due_date).toLocaleDateString('fr-CA') : 'N/A'}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{t('accounts.accountActions')}</CardTitle>
            <CardDescription>{t('accounts.accountActionsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="payment" className="font-semibold">{t('accounts.makePayment')}</Label>
              <div className="flex gap-2 mt-2">
                <Input id="payment" type="number" placeholder="0.00" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} />
                <Button onClick={handlePayment}>{t('accounts.pay')}</Button>
              </div>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold">{t('accounts.otherActions')}</h4>
              <div className="flex flex-wrap gap-4 mt-2">
                <Button asChild>
                  <Link to={`/dashboard/accounts/credit/${accountId}/new-transaction`}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {t('accounts.addDebit')}
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to={`/dashboard/accounts/credit/${accountId}/pending-authorizations`}>
                    <Clock className="mr-2 h-4 w-4" />
                    {t('accounts.pendingAuthorizations')}
                    {pendingAuthCount > 0 && (
                      <Badge variant="secondary" className="ml-2">{pendingAuthCount}</Badge>
                    )}
                  </Link>
                </Button>
                <Button variant="destructive">{t('accounts.blockAccount')}</Button>
              </div>
            </div>
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
                    <TableCell><Badge variant="outline" className="capitalize">{tx.type.replace('_', ' ')}</Badge></TableCell>
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
                      {tx.type === 'payment' ? '-' : '+'}
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
        <CreditAccountAccessLog logs={accessLogs} className="md:col-span-2" />
      </div>
    </div>
  );
};

export default CreditAccountDetails;