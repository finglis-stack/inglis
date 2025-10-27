import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, DollarSign, CreditCard, User, Clock, PlusCircle, RefreshCw, FileText, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { showError, showSuccess } from '@/utils/toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import CreditAccountAccessLog from '@/components/dashboard/accounts/CreditAccountAccessLog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useCreditAccountBalance } from '@/hooks/useCreditAccountBalance';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const CreditAccountDetails = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const { accountId } = useParams();
  const navigate = useNavigate();
  const [account, setAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [statements, setStatements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [pendingAuthCount, setPendingAuthCount] = useState(0);
  const [isGeneratingStatement, setIsGeneratingStatement] = useState(false);

  const { data: balanceData, isLoading: balanceLoading, refetch: refetchBalance, secondsUntilRefresh } = useCreditAccountBalance(accountId!);

  const fetchAllDetails = async () => {
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
      .select(`*, cards(*, card_programs(program_name)), profiles(full_name, legal_name, type)`)
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
      .is('statement_id', null)
      .order('created_at', { ascending: false });
    
    if (transactionsError) showError(`${t('accounts.transactionError')}: ${transactionsError.message}`);
    else setTransactions(transactionsData);

    const { count } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('credit_account_id', accountId).eq('status', 'authorized');
    setPendingAuthCount(count || 0);

    const { data: statementsData, error: statementsError } = await supabase.from('statements').select('*').eq('credit_account_id', accountId).order('statement_period_end', { ascending: false });
    if (statementsError) showError(`Erreur relevés: ${statementsError.message}`);
    else setStatements(statementsData);

    const { data: logsData, error: logsError } = await supabase.rpc('get_credit_account_access_logs', { p_account_id: accountId });
    if (logsError) showError(`${t('accounts.accessLogError')}: ${logsError.message}`);
    else setAccessLogs(logsData || []);

    setLoading(false);
  };

  useEffect(() => {
    fetchAllDetails();
  }, [accountId, t]);

  const handlePayment = async () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      showError(t('accounts.invalidPaymentAmount'));
      return;
    }
    try {
      const { error } = await supabase.rpc('process_transaction', { p_card_id: account.card_id, p_amount: amount, p_type: 'payment', p_description: t('accounts.paymentReceived') });
      if (error) throw error;
      showSuccess(t('accounts.paymentSuccess'));
      setPaymentAmount('');
      refetchBalance();
      fetchAllDetails();
    } catch (error) {
      showError(`${t('accounts.paymentError')}: ${error.message}`);
    }
  };

  const handleGenerateStatement = async () => {
    setIsGeneratingStatement(true);
    try {
      const { error } = await supabase.rpc('generate_statement_for_account', { p_account_id: accountId });
      if (error) throw error;
      showSuccess(t('accounts.generateStatementSuccess'));
      await fetchAllDetails();
      await refetchBalance();
    } catch (error) {
      showError(`${t('accounts.generateStatementError')}: ${error.message}`);
    } finally {
      setIsGeneratingStatement(false);
    }
  };

  const getStatementStatus = (statement: any) => {
    const unbilledPayments = transactions
      .filter(tx => tx.type === 'payment')
      .reduce((sum, tx) => sum + tx.amount, 0);

    let totalPaymentsMade = statement.total_payments;

    // Si ce n'est pas le relevé le plus récent, il faut aussi regarder les paiements du relevé suivant
    if (statement.id !== account.current_statement_id) {
      const nextStatement = statements.find(s => s.id === statement.carried_over_to_statement_id);
      if (nextStatement) {
        totalPaymentsMade += nextStatement.total_payments;
      }
    } else {
      // Si c'est le relevé actuel, on ajoute les paiements non encore facturés
      totalPaymentsMade += unbilledPayments;
    }

    if (statement.is_paid_in_full || (statement.closing_balance > 0 && totalPaymentsMade >= statement.closing_balance)) {
      return { text: t('accounts.statementPaid'), variant: 'default' as 'default', className: '' };
    }
    if (new Date() > new Date(statement.payment_due_date) && totalPaymentsMade < statement.minimum_payment) {
      return { text: 'Impayé (Retard)', variant: 'destructive' as 'destructive', className: '' };
    }
    if (totalPaymentsMade >= statement.minimum_payment && statement.closing_balance > 0) {
      return { text: t('accounts.minimumPaid'), variant: 'default' as 'default', className: 'bg-green-600 hover:bg-green-700' };
    }
    return { text: t('accounts.statementUnpaid'), variant: 'secondary' as 'secondary', className: '' };
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

  if (!account) return <div>{t('accounts.accountNotFound')}</div>;

  const profileName = account.profiles.type === 'personal' ? account.profiles.full_name : account.profiles.legal_name;
  const cardNumber = `${account.cards.user_initials} ${account.cards.issuer_id} ${account.cards.random_letters} ****${account.cards.unique_identifier.slice(-3)} ${account.cards.check_digit}`;
  const currentStatement = statements.find(s => s.id === account.current_statement_id);

  return (
    <div className="space-y-6">
      <Link to="/dashboard/cards" className="flex items-center text-sm text-muted-foreground hover:text-primary"><ArrowLeft className="mr-2 h-4 w-4" />{t('accounts.backToCards')}</Link>
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">{t('accounts.creditAccountManagement')}</h1>
          <p className="text-muted-foreground">{t('accounts.accountOf', { name: profileName })}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{account.currency}</Badge>
          <Badge variant={account.status === 'active' ? 'default' : 'destructive'}>{account.status}</Badge>
          <Button variant="ghost" size="icon" onClick={() => refetchBalance()} disabled={balanceLoading}><RefreshCw className={`h-4 w-4 ${balanceLoading ? 'animate-spin' : ''}`} /></Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> {t('accounts.balanceAndStatement')}</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {balanceLoading ? <Skeleton className="h-24 w-full" /> : (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">{t('accounts.currentBalance')} <span className="text-xs">({secondsUntilRefresh}s)</span></p>
                  <div className="flex items-baseline"><p className="text-2xl font-bold">{new Intl.NumberFormat('fr-CA', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(balanceData?.current_balance ?? 0)}</p><span className="ml-2 font-semibold text-muted-foreground">{account.currency}</span></div>
                  <p className="text-xs text-muted-foreground">{t('accounts.on')} {new Intl.NumberFormat('fr-CA', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(account.credit_limit)} {account.currency}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('accounts.availableCredit')}</p>
                  {typeof balanceData?.available_credit === 'number' && balanceData.available_credit <= 0 ? <Badge variant="destructive">Solde zéro de disponible</Badge> : <div className="flex items-baseline text-green-600"><p className="text-lg font-semibold">{new Intl.NumberFormat('fr-CA', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(balanceData?.available_credit ?? 0)}</p><span className="ml-2 text-sm font-semibold">{account.currency}</span></div>}
                </div>
              </>
            )}
            <Separator />
            <div>
              <p className="text-sm text-muted-foreground">{t('accounts.minimumPayment')}</p>
              <div className="flex items-baseline"><p className="text-lg font-semibold">{new Intl.NumberFormat('fr-CA', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(currentStatement?.minimum_payment || 0)}</p><span className="ml-2 text-sm font-semibold text-muted-foreground">{account.currency}</span></div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('accounts.dueDate')}</p>
              <p className="text-lg font-semibold">{currentStatement ? new Date(currentStatement.payment_due_date).toLocaleDateString('fr-CA') : 'N/A'}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>{t('accounts.accountActions')}</CardTitle><CardDescription>{t('accounts.accountActionsDesc')}</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="payment" className="font-semibold">{t('accounts.makePayment')}</Label>
              <p className="text-xs text-muted-foreground">Enregistrez un paiement reçu par un moyen externe (ex: Interac, virement bancaire).</p>
              <div className="flex gap-2 mt-2"><Input id="payment" type="number" placeholder="0.00" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} /><Button onClick={handlePayment}>{t('accounts.pay')}</Button></div>
            </div>
            <Separator />
            <div>
              <h4 className="font-semibold">{t('accounts.otherActions')}</h4>
              <div className="flex flex-wrap gap-4 mt-2">
                <Button asChild><Link to={`/dashboard/accounts/credit/${accountId}/new-transaction`}><PlusCircle className="mr-2 h-4 w-4" />{t('accounts.addDebit')}</Link></Button>
                <Button asChild variant="outline"><Link to={`/dashboard/accounts/credit/${accountId}/pending-authorizations`}><Clock className="mr-2 h-4 w-4" />{t('accounts.pendingAuthorizations')}{pendingAuthCount > 0 && <Badge variant="secondary" className="ml-2">{pendingAuthCount}</Badge>}</Link></Button>
                <Button variant="secondary" onClick={handleGenerateStatement} disabled={isGeneratingStatement}>{isGeneratingStatement ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}{t('accounts.generateStatement')}</Button>
                <Button variant="destructive">{t('accounts.blockAccount')}</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> {t('accounts.statementsHistory')}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>{t('accounts.statementPeriod')}</TableHead><TableHead>{t('accounts.statementDueDate')}</TableHead><TableHead>{t('accounts.statementClosingBalance')}</TableHead><TableHead>{t('accounts.statementMinimumPayment')}</TableHead><TableHead>{t('accounts.statementStatus')}</TableHead></TableRow></TableHeader>
            <TableBody>
              {statements.length > 0 ? statements.map(s => {
                const status = getStatementStatus(s);
                return (
                  <TableRow key={s.id} onClick={() => navigate(`/dashboard/accounts/credit/${accountId}/statements/${s.id}`)} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>{new Date(s.statement_period_start).toLocaleDateString()} - {new Date(s.statement_period_end).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(s.payment_due_date).toLocaleDateString()}</TableCell>
                    <TableCell>{new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(s.closing_balance)}</TableCell>
                    <TableCell>{new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(s.minimum_payment)}</TableCell>
                    <TableCell><Badge variant={status.variant} className={cn(status.className)}>{status.text}</Badge></TableCell>
                  </TableRow>
                );
              }) : <TableRow><TableCell colSpan={5} className="text-center h-24">{t('accounts.noStatements')}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> {t('accounts.unbilledTransactions')}</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>{t('date', { ns: 'common' })}</TableHead><TableHead>{t('description', { ns: 'common' })}</TableHead><TableHead>{t('type', { ns: 'common' })}</TableHead><TableHead>{t('status', { ns: 'common' })}</TableHead><TableHead className="text-right">{t('amount', { ns: 'common' })}</TableHead></TableRow></TableHeader>
            <TableBody>
              {transactions.length > 0 ? transactions.map(tx => (
                <TableRow key={tx.id} onClick={() => navigate(`/dashboard/transactions/${tx.id}`)} className="cursor-pointer hover:bg-muted/50">
                  <TableCell>{new Date(tx.created_at).toLocaleString('fr-CA')}</TableCell>
                  <TableCell>{tx.description || 'N/A'}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{tx.type.replace('_', ' ')}</Badge></TableCell>
                  <TableCell><Badge variant={tx.status === 'captured' || tx.status === 'completed' ? 'default' : 'secondary'}>{tx.status}</Badge></TableCell>
                  <TableCell className={`text-right font-medium ${tx.type === 'payment' ? 'text-green-600' : 'text-red-600'}`}>{tx.type === 'payment' ? '-' : '+'}{new Intl.NumberFormat('fr-CA', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(tx.amount)} {tx.currency}</TableCell>
                </TableRow>
              )) : <TableRow><TableCell colSpan={5} className="text-center h-24">{t('accounts.noTransactions')}</TableCell></TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> {t('accounts.associatedCard')}</CardTitle></CardHeader>
          <CardContent className="space-y-2"><p className="font-mono">{cardNumber}</p><p className="text-sm text-muted-foreground">{t('userProfile.program')}: {account.cards.card_programs.program_name}</p><p className="text-sm text-muted-foreground">{t('accounts.cardStatus')}: <Badge variant={account.cards.status === 'active' ? 'default' : 'destructive'}>{account.cards.status}</Badge></p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> {t('accounts.accountHolder')}</CardTitle></CardHeader>
          <CardContent><p className="font-semibold">{profileName}</p><Button variant="link" asChild className="p-0 h-auto mt-2"><Link to={`/dashboard/users/profile/${account.profile_id}`}>{t('accounts.viewFullProfile')}</Link></Button></CardContent>
        </Card>
        <CreditAccountAccessLog logs={accessLogs} className="md:col-span-2" />
      </div>
    </div>
  );
};

export default CreditAccountDetails;