import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, DollarSign, CreditCard, User, Clock, PlusCircle, RefreshCw, Eye, Loader2, Usb } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { showError, showSuccess } from '@/utils/toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DebitAccountAccessLog from '@/components/dashboard/accounts/DebitAccountAccessLog';
import { useDebitAccountBalance } from '@/hooks/useDebitAccountBalance';
import { useTranslation } from 'react-i18next';
import AddFundsDialog from '@/components/dashboard/accounts/AddFundsDialog';
import { Separator } from '@/components/ui/separator';
import { AddToGoogleWalletButton } from '@/components/dashboard/accounts/AddToGoogleWalletButton';
import { CardPreview } from '@/components/dashboard/CardPreview';
import { cn, getFunctionError } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { PhysicalCardEncoder } from '@/components/dashboard/cards/PhysicalCardEncoder';
import CardSuspensionLog from '@/components/dashboard/cards/CardSuspensionLog';

const DebitAccountDetails = () => {
  const { t } = useTranslation('dashboard');
  const { accountId } = useParams();
  const navigate = useNavigate();
  const [account, setAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingAuthCount, setPendingAuthCount] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState('');

  // États pour la sécurité du numéro de carte
  const [isCardNumberVisible, setIsCardNumberVisible] = useState(false);
  const [isOtpDialogOpen, setIsOtpDialogOpen] = useState(false);
  const [otp, setOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

  // État pour l'encodage physique
  const [showPhysicalEncoder, setShowPhysicalEncoder] = useState(false);

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
          cards(*, card_programs(program_name, card_type, card_color)),
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
      
      // Check session storage for previous verification
      if (sessionStorage.getItem(`card_reveal_${accountData.card_id}`)) {
        setIsCardNumberVisible(true);
      }

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

    const channel = supabase.channel(`transactions_for_debit_account_${accountId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'transactions',
          filter: `debit_account_id=eq.${accountId}`
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
      const { error } = await supabase.rpc('process_transaction', { p_card_id: account.card_id, p_amount: amount, p_type: 'payment', p_description: t('accounts.paymentReceived') });
      if (error) throw error;
      showSuccess(t('accounts.paymentSuccess'));
      setPaymentAmount('');
      refetchBalance();
    } catch (error) {
      showError(`${t('accounts.paymentError')}: ${error.message}`);
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
  
  const fullCardNumber = `${account.cards.user_initials} ${account.cards.issuer_id} ${account.cards.random_letters} ${account.cards.unique_identifier} ${account.cards.check_digit}`;
  const maskedCardNumber = `${account.cards.user_initials} ${account.cards.issuer_id} ${account.cards.random_letters} ****${account.cards.unique_identifier.slice(-3)} ${account.cards.check_digit}`;

  const currentBalance = balanceData?.current_balance;
  const availableBalance = balanceData?.available_balance;

  // Formatage de la date d'expiration
  const formatExpiry = (dateStr: string) => {
    if (!dateStr) return "MM/YY";
    const [year, month] = dateStr.split('-');
    return `${month}/${year.slice(-2)}`;
  };

  const cardExpiry = formatExpiry(account.cards.expires_at);

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
          <Badge variant="outline">{account.currency}</Badge>
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
            <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Solde du compte</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {balanceLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Solde disponible <span className="text-xs">({secondsUntilRefresh}s)</span></p>
                  <div className="flex items-baseline">
                    <p className="text-3xl font-bold text-green-600">
                      {new Intl.NumberFormat('fr-CA', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(availableBalance ?? 0)}
                    </p>
                    <span className="ml-2 font-semibold text-muted-foreground">{account.currency}</span>
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground">Solde comptable</p>
                  <div className="flex items-baseline">
                    <p className="text-xl font-semibold">
                      {new Intl.NumberFormat('fr-CA', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(currentBalance ?? 0)}
                    </p>
                    <span className="ml-2 text-sm font-semibold text-muted-foreground">{account.currency}</span>
                  </div>
                </div>
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
            <AddToGoogleWalletButton cardId={account.card_id} />
            <Button asChild variant="destructive">
              <Link to={`/dashboard/cards/${account.cards.id}/suspend`}>{t('accounts.blockAccount')}</Link>
            </Button>
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
                      {new Intl.NumberFormat('fr-CA', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(tx.amount)} {tx.currency}
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
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Numéro de carte</p>
              <div className={cn("transition-all duration-300")}>
                <CardPreview
                  programName={account.cards.card_programs.program_name}
                  cardType={account.cards.card_programs.card_type}
                  cardColor={account.cards.card_programs.card_color}
                  userName={profileName}
                  showCardNumber={true}
                  cardNumber={isCardNumberVisible ? fullCardNumber : maskedCardNumber}
                  expiryDate={cardExpiry}
                />
              </div>
              
              {!isCardNumberVisible && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                   {/* Overlay is handled inside the container div above in real render, here we use simplified structure */}
                </div>
              )}

              <div className="mt-2 text-center">
                  {!isCardNumberVisible && (
                    <Button 
                      onClick={handleRevealCard} 
                      className="bg-black/50 hover:bg-black/70 text-white backdrop-blur-md border border-white/20"
                      disabled={isSendingOtp}
                    >
                      {isSendingOtp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                      Voir le numéro
                    </Button>
                  )}
              </div>
            </div>
            
            {isCardNumberVisible && (
              <div className="mt-4 flex justify-center">
                <Button variant="outline" className="w-full border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700" onClick={() => setShowPhysicalEncoder(true)}>
                  <Usb className="mr-2 h-4 w-4" />
                  Encoder carte physique
                </Button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Programme</p>
                <p className="font-medium">{account.cards.card_programs.program_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Statut</p>
                <Badge variant={account.cards.status === 'active' ? 'default' : 'destructive'}>{account.cards.status}</Badge>
              </div>
            </div>
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
        <CardSuspensionLog cardId={account.cards.id} className="md:col-span-2" showUnblock status={account.cards.status} />
      </div>

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
              // Optionnel : Fermer le dialogue après succès
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DebitAccountDetails;