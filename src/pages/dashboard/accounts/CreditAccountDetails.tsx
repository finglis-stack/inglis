import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, PlusCircle, RefreshCw, FileText, Loader2, MoreHorizontal, Ban, Shield, User, CreditCard, Calendar, Clock, Lock, Eye, Usb } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { showError, showSuccess } from '@/utils/toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import CreditAccountAccessLog from '@/components/dashboard/accounts/CreditAccountAccessLog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useCreditAccountBalance } from '@/hooks/useCreditAccountBalance';
import { useTranslation } from 'react-i18next';
import { cn, getFunctionError } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardPreview } from '@/components/dashboard/CardPreview';
import { Progress } from "@/components/ui/progress";
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PhysicalCardEncoder } from '@/components/dashboard/cards/PhysicalCardEncoder';
import CardSuspensionLog from '@/components/dashboard/cards/CardSuspensionLog';

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
  
  // États pour la sécurité du numéro de carte
  const [isCardNumberVisible, setIsCardNumberVisible] = useState(false);
  const [isOtpDialogOpen, setIsOtpDialogOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  
  // État pour l'encodage physique
  const [showPhysicalEncoder, setShowPhysicalEncoder] = useState(false);

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
      .select(`
        *,
        cards(*, card_programs(program_name, card_type, card_color, card_image_url)),
        profiles(full_name, legal_name, type, email, phone)
      `)
      .eq('id', accountId)
      .single();

    if (accountError) {
      showError(`${t('accounts.error')}: ${accountError.message}`);
      setLoading(false);
      return;
    }
    setAccount(accountData);

    // Check session storage for previous verification
    if (sessionStorage.getItem(`card_reveal_${accountData.card_id}`)) {
      setIsCardNumberVisible(true);
    }

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

  const handleRevealCard = async () => {
    if (isCardNumberVisible) return;
    
    setIsSendingOtp(true);
    try {
      const { error } = await supabase.functions.invoke('send-admin-otp');
      if (error) throw new Error(getFunctionError(error));
      
      setIsOtpDialogOpen(true);
      showSuccess("Un code de vérification a été envoyé à votre adresse courriel.");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Erreur lors de l'envoi du code.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    setIsVerifyingOtp(true);
    try {
      const { data, error } = await supabase.functions.invoke('verify-admin-otp', {
        body: { code: otp }
      });

      if (error) throw new Error(getFunctionError(error));

      if (data.success) {
        setIsCardNumberVisible(true);
        sessionStorage.setItem(`card_reveal_${account.card_id}`, 'true');
        setIsOtpDialogOpen(false);
        showSuccess("Numéro de carte déverrouillé pour cette session.");
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : "Code invalide.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const getStatementStatus = (statement: any) => {
    if (statement.is_closed) {
      return { text: 'Fermé', variant: 'destructive' as 'destructive', className: 'uppercase font-bold' };
    }
    const unbilledPayments = transactions
      .filter(tx => tx.type === 'payment')
      .reduce((sum, tx) => sum + tx.amount, 0);

    let totalPaymentsMade = statement.total_payments;

    if (statement.id !== account.current_statement_id) {
      const nextStatement = statements.find(s => s.id === statement.carried_over_to_statement_id);
      if (nextStatement) {
        totalPaymentsMade += nextStatement.total_payments;
      }
    } else {
      totalPaymentsMade += unbilledPayments;
    }

    if (statement.is_paid_in_full || (statement.closing_balance > 0 && totalPaymentsMade >= statement.closing_balance)) {
      return { text: t('accounts.statementPaid'), variant: 'default' as 'default', className: '' };
    }
    if (new Date() > new Date(statement.payment_due_date) && totalPaymentsMade < statement.minimum_payment) {
      return { text: 'Défaut de paiement', variant: 'destructive' as 'destructive', className: '' };
    }
    if (totalPaymentsMade >= statement.minimum_payment && statement.closing_balance > 0) {
      return { text: t('accounts.minimumPaid'), variant: 'default' as 'default', className: 'bg-green-600 hover:bg-green-700' };
    }
    return { text: t('accounts.statementUnpaid'), variant: 'secondary' as 'secondary', className: '' };
  };

  if (loading) return <Skeleton className="h-screen w-full" />;
  if (!account) return <div>{t('accounts.accountNotFound')}</div>;

  const profileName = account.profiles.type === 'personal' ? account.profiles.full_name : account.profiles.legal_name;
  
  // Construction du numéro de carte
  const fullCardNumber = `${account.cards.user_initials} ${account.cards.issuer_id} ${account.cards.random_letters} ${account.cards.unique_identifier} ${account.cards.check_digit}`;
  const maskedCardNumber = `${account.cards.user_initials} ${account.cards.issuer_id} ${account.cards.random_letters} ****${account.cards.unique_identifier.slice(-3)} ${account.cards.check_digit}`;
  
  const currentBalance = balanceData?.current_balance || 0;
  const creditLimit = account.credit_limit || 1;
  const utilization = Math.min(100, Math.max(0, (currentBalance / creditLimit) * 100));

  // Formatage de la date d'expiration
  const formatExpiry = (dateStr: string) => {
    if (!dateStr) return "MM/YY";
    // On suppose le format YYYY-MM-DD de la base de données
    const [year, month] = dateStr.split('-');
    return `${month}/${year.slice(-2)}`;
  };

  const cardExpiry = formatExpiry(account.cards.expires_at);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <Link to="/dashboard/cards" className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('accounts.backToCards')}
        </Link>
        <div className="flex items-center gap-2">
           <span className="text-sm text-muted-foreground">Dernière mise à jour: {secondsUntilRefresh}s</span>
           <Button variant="ghost" size="icon" onClick={() => refetchBalance()} disabled={balanceLoading}>
             <RefreshCw className={`h-4 w-4 ${balanceLoading ? 'animate-spin' : ''}`} />
           </Button>
           <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions administratives</DropdownMenuLabel>
              <DropdownMenuItem onClick={handleGenerateStatement} disabled={isGeneratingStatement}>
                  {isGeneratingStatement ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                  <span>{t('accounts.generateStatement')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" asChild>
                  <Link to={`/dashboard/cards/${account.cards.id}/suspend`}>
                    <Ban className="mr-2 h-4 w-4" />
                    <span className="font-medium">{t('accounts.blockAccount')}</span>
                  </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-96 flex-shrink-0">
          <div className="relative">
            <CardPreview
              programName={account.cards.card_programs.program_name}
              cardType={account.cards.card_programs.card_type}
              cardColor={account.cards.card_programs.card_color}
              cardImageUrl={account.cards.card_programs.card_image_url}
              userName={profileName}
              showCardNumber={true}
              cardNumber={fullCardNumber}
              expiryDate={cardExpiry}
              overlayCardNumber={true}
              blurCardNumber={!isCardNumberVisible}
            />
          </div>
        </div>
          <div className="mt-4 flex justify-center gap-2">
             <Badge variant="outline" className="text-xs">{account.currency}</Badge>
             <Badge variant={account.status === 'active' ? 'default' : 'destructive'}>{account.status}</Badge>
          </div>
          
          {isCardNumberVisible && (
            <div className="mt-4 flex justify-center">
              <Button variant="outline" className="w-full border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700" onClick={() => setShowPhysicalEncoder(true)}>
                <Usb className="mr-2 h-4 w-4" />
                Encoder carte physique
              </Button>
            </div>
          )}
        </div>

        <div className="flex-1 space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('accounts.accountOf', { name: profileName })}</h1>
            <p className="text-muted-foreground">ID Compte: <span className="font-mono">{account.id}</span></p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{t('accounts.currentBalance')}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold">
                  {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: account.currency }).format(currentBalance)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                sur {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: account.currency }).format(creditLimit)}
              </p>
              <div className="pt-2">
                <div className="flex justify-between text-xs mb-1">
                  <span>Utilisation</span>
                  <span className={utilization > 80 ? "text-red-500 font-bold" : ""}>{utilization.toFixed(1)}%</span>
                </div>
                <Progress value={utilization} className="h-2" />
              </div>
            </div>

            <div className="space-y-1">
               <p className="text-sm font-medium text-muted-foreground">{t('accounts.availableCredit')}</p>
               <p className="text-4xl font-bold text-green-600">
                  {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: account.currency }).format(balanceData?.available_credit ?? 0)}
               </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-4">
            <Button asChild size="lg" className="shadow-sm">
              <Link to={`/dashboard/accounts/credit/${accountId}/new-transaction`}>
                <PlusCircle className="mr-2 h-5 w-5" />
                {t('accounts.addDebit')}
              </Link>
            </Button>
            <div className="flex items-center gap-2 bg-muted/40 p-1 rounded-lg border">
              <Input 
                type="number" 
                placeholder="0.00" 
                value={paymentAmount} 
                onChange={(e) => setPaymentAmount(e.target.value)} 
                className="w-32 border-0 focus-visible:ring-0 h-9 bg-transparent"
              />
              <Button onClick={handlePayment} variant="secondary" size="sm">
                {t('accounts.pay')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Tabs defaultValue="transactions" className="w-full mt-8">
        <TabsList className="w-full justify-start border-b bg-transparent p-0 h-auto rounded-none">
          <TabsTrigger value="transactions" className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            Transactions
            <Badge variant="secondary" className="ml-2 text-xs">{transactions.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="statements" className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            Relevés
          </TabsTrigger>
          <TabsTrigger value="details" className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            Détails & Titulaire
          </TabsTrigger>
          <TabsTrigger value="security" className="px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            Sécurité & Accès
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="transactions" className="space-y-6">
            {pendingAuthCount > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 p-2 rounded-full">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-orange-900">Autorisations en attente</h4>
                    <p className="text-sm text-orange-700">{pendingAuthCount} transaction(s) nécessitent une action.</p>
                  </div>
                </div>
                <Button asChild variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-100 hover:text-orange-800">
                  <Link to={`/dashboard/accounts/credit/${accountId}/pending-authorizations`}>
                    Gérer
                  </Link>
                </Button>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Transactions non facturées</CardTitle>
                <CardDescription>Liste des transactions depuis le dernier relevé.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('date', { ns: 'common' })}</TableHead>
                      <TableHead>{t('description', { ns: 'common' })}</TableHead>
                      <TableHead>{t('type', { ns: 'common' })}</TableHead>
                      <TableHead>{t('status', { ns: 'common' })}</TableHead>
                      <TableHead className="text-right">{t('amount', { ns: 'common' })}</TableHead>
                    </TableRow>
                  </TableHeader>
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
          </TabsContent>

          <TabsContent value="statements">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{t('accounts.statementsHistory')}</CardTitle>
                    <CardDescription>Historique complet des relevés générés.</CardDescription>
                  </div>
                  <Button onClick={handleGenerateStatement} disabled={isGeneratingStatement} variant="outline">
                    {isGeneratingStatement ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                    {t('accounts.generateStatement')}
                  </Button>
                </div>
              </CardHeader>
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
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <Card>
                 <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> {t('accounts.associatedCard')}</CardTitle></CardHeader>
                 <CardContent className="space-y-4">
                   <div>
                     <p className="text-sm text-muted-foreground mb-1">Numéro de carte</p>
                     <div className={cn("font-mono text-lg bg-muted p-2 rounded text-center transition-all", !isCardNumberVisible && "blur-sm select-none")}>
                        {fullCardNumber}
                     </div>
                     {!isCardNumberVisible && (
                       <div className="mt-2 flex justify-center">
                         <Button
                           onClick={handleRevealCard}
                           className="bg-black/50 hover:bg-black/70 text-white backdrop-blur-md border border-white/20"
                           disabled={isSendingOtp}
                         >
                           {isSendingOtp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                           Voir le numéro
                         </Button>
                       </div>
                     )}
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Programme</p>
                        <p className="font-medium">{account.cards.card_programs.program_name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Statut</p>
                        <Badge variant={account.cards.status === 'active' ? 'default' : 'destructive'}>{account.cards.status}</Badge>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Expiration</p>
                        <p className="font-medium">{cardExpiry}</p>
                      </div>
                   </div>
                 </CardContent>
               </Card>

               <Card>
                 <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> {t('accounts.accountHolder')}</CardTitle></CardHeader>
                 <CardContent className="space-y-4">
                   <div>
                      <p className="text-sm text-muted-foreground">Nom complet</p>
                      <p className="font-semibold text-lg">{profileName}</p>
                   </div>
                   <div className="grid grid-cols-2 gap-4">
                     <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p>{account.profiles.email || 'N/A'}</p>
                     </div>
                     <div>
                        <p className="text-sm text-muted-foreground">Téléphone</p>
                        <p>{account.profiles.phone || 'N/A'}</p>
                     </div>
                   </div>
                   <Button variant="outline" className="w-full" asChild>
                     <Link to={`/dashboard/users/profile/${account.profile_id}`}>{t('accounts.viewFullProfile')}</Link>
                   </Button>
                 </CardContent>
               </Card>

               <Card className="md:col-span-2">
                 <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Configuration Financière</CardTitle></CardHeader>
                 <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                       <p className="text-sm text-muted-foreground">Cycle de facturation</p>
                       <p className="font-medium">Jour {account.billing_cycle_anchor_day} du mois</p>
                    </div>
                    <div>
                       <p className="text-sm text-muted-foreground">Taux d'intérêt (Achats)</p>
                       <p className="font-medium">{account.interest_rate}%</p>
                    </div>
                    <div>
                       <p className="text-sm text-muted-foreground">Taux d'intérêt (Avances)</p>
                       <p className="font-medium">{account.cash_advance_rate}%</p>
                    </div>
                 </CardContent>
               </Card>
             </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <div className="grid grid-cols-1 gap-6">
               <CreditAccountAccessLog logs={accessLogs} className="w-full" />
               
               <CardSuspensionLog cardId={account.cards.id} className="w-full" showUnblock status={account.cards.status} />
               
               <Card>
                 <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" /> Paramètres de sécurité</CardTitle></CardHeader>
                 <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Le compte est actuellement <span className="font-bold text-foreground">{account.status === 'active' ? 'actif' : 'inactif'}</span> et sécurisé.
                      Aucune activité suspecte majeure n'a été détectée récemment.
                    </p>
                    <Button variant="destructive">
                      <Ban className="mr-2 h-4 w-4" />
                      {t('accounts.blockAccount')}
                    </Button>
                 </CardContent>
               </Card>
            </div>
          </TabsContent>
        </div>
      </Tabs>
      
      <Dialog open={isOtpDialogOpen} onOpenChange={setIsOtpDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vérification d'identité</DialogTitle>
            <DialogDescription>
              Pour afficher le numéro de carte complet, veuillez entrer le code à 6 chiffres envoyé à votre adresse courriel.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center py-4">
            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <div className="w-4" />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsOtpDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleVerifyOtp} disabled={otp.length !== 6 || isVerifyingOtp}>
              {isVerifyingOtp && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Vérifier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPhysicalEncoder} onOpenChange={setShowPhysicalEncoder}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Encodage Carte Physique</DialogTitle>
            <DialogDescription>
              Cette action va écrire les informations de la carte sur la puce SLE4442 insérée dans le lecteur.
            </DialogDescription>
          </DialogHeader>
          <PhysicalCardEncoder 
            cardData={{
              cardNumber: fullCardNumber,
              holderName: profileName,
              expiryDate: cardExpiry
            }}
            onSuccess={() => {
              // Optionnel : Fermer le dialogue après succès ou laisser l'utilisateur le faire
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CreditAccountDetails;