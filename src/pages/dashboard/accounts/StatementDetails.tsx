import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, PlusCircle, AlertTriangle, Lock, Share2, FileDown } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PDFDownloadLink } from '@react-pdf/renderer';
import StatementPDF from '@/components/dashboard/accounts/StatementPDF';

const RecordPaymentDialog = ({ cardId, onPaymentSuccess }) => {
  const { t } = useTranslation('dashboard');
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      showError(t('accounts.invalidPaymentAmount'));
      return;
    }
    const { error } = await supabase.rpc('process_transaction', {
      p_card_id: cardId,
      p_amount: paymentAmount,
      p_type: 'payment',
      p_description: t('accounts.paymentReceived'),
    });
    if (error) {
      showError(`${t('accounts.paymentError')}: ${error.message}`);
      return;
    }
    showSuccess(t('accounts.paymentSuccess'));
    onPaymentSuccess();
    setOpen(false);
    setAmount('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><PlusCircle className="mr-2 h-4 w-4" />{t('accounts.makePayment')}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('accounts.makePayment')}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">{t('amount', { ns: 'common' })}</Label>
            <Input id="amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="col-span-3" />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handlePayment} disabled={loading}>{loading ? '...' : t('accounts.pay')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const StatementDetails = () => {
  const { accountId, statementId } = useParams();
  const { t } = useTranslation(['dashboard', 'common']);
  const [statement, setStatement] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [cardId, setCardId] = useState<string | null>(null);
  const [currentStatementId, setCurrentStatementId] = useState<string | null>(null);
  const [account, setAccount] = useState<any>(null);
  const [institution, setInstitution] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const fetchDetails = async () => {
    if (!statementId || !accountId) return;
    setLoading(true);

    const { data: accountData, error: accountError } = await supabase.from('credit_accounts')
      .select('card_id, current_statement_id, id, profile_id, interest_rate, cash_advance_rate, currency, credit_limit')
      .eq('id', accountId).single();
    if (accountError) {
      showError("Impossible de trouver la carte associée.");
    } else {
      setCardId(accountData.card_id);
      setCurrentStatementId(accountData.current_statement_id);
      setAccount(accountData);
    }

    const { data: profileData } = await supabase.from('profiles')
      .select('id, type, full_name, legal_name, email, institution_id')
      .eq('id', accountData?.profile_id).single();
    setProfile(profileData || null);

    const { data: institutionData } = await supabase.from('institutions')
      .select('id, name, address, city, country, phone_number')
      .single();
    setInstitution(institutionData || null);

    const { data: statementData, error: statementError } = await supabase
      .from('statements')
      .select('*')
      .eq('id', statementId)
      .single();
    if (statementError) {
      showError(t('accounts.statementNotFound'));
      setLoading(false);
      return;
    }
    setStatement(statementData);

    const { data: transactionsData, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('statement_id', statementId)
      .order('created_at', { ascending: true });
    if (transactionsError) {
      showError(t('accounts.transactionError'));
    } else {
      setTransactions(transactionsData);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statementId, accountId]);

  const handleCloseStatement = async () => {
    if (!accountId) return;
    const { error } = await supabase.rpc('close_current_statement', { p_account_id: accountId });
    if (error) {
      showError(`Erreur lors de la fermeture du relevé: ${error.message}`);
      return;
    }
    showSuccess('Relevé fermé avec succès !');
    await fetchDetails();
  };

  const getPaymentStatus = (s: any) => {
    const now = new Date();
    if (s.is_paid_in_full || (s.closing_balance > 0 && s.total_payments >= s.closing_balance)) {
      return { text: t('accounts.statementPaid'), variant: 'default' as 'default', className: '' };
    }
    if (now > new Date(s.payment_due_date) && s.total_payments < s.minimum_payment) {
      return { text: 'Défaut de paiement', variant: 'destructive' as 'destructive', className: '' };
    }
    if (s.total_payments >= s.minimum_payment && s.closing_balance > 0) {
      return { text: t('accounts.minimumPaid'), variant: 'default' as 'default', className: 'bg-green-600 hover:bg-green-700' };
    }
    if (s.total_payments > 0 && s.total_payments < s.closing_balance) {
      return { text: 'Payé partiellement', variant: 'secondary' as 'secondary', className: '' };
    }
    return { text: t('accounts.statementUnpaid'), variant: 'secondary' as 'secondary', className: '' };
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(amount);
  const interestCharged = transactions.filter(tx => tx.type === 'interest_charge').reduce((sum, tx) => sum + tx.amount, 0);

  const handleSendSecureLink = async () => {
    if (!statement) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('https://bsmclnbeywqosuhijhae.supabase.co/functions/v1/send-statement-link', {
        body: { statement_id: statement.id }
      });
      if (error) throw error;
      showSuccess('Lien sécurisé envoyé par e-mail.');
    } catch (e: any) {
      showError(e?.message || 'Erreur lors de l’envoi du lien.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!statement) {
    return <p>{t('accounts.statementNotFound')}</p>;
  }

  return (
    <div className="space-y-6">
      <Link to={`/dashboard/accounts/credit/${accountId}`} className="flex items-center text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('newTransaction.backToAccount')}
      </Link>
      <Card>
        <CardHeader className="flex flex-row justify-between items-start">
          <div>
            <CardTitle className="flex items-center gap-2">
              {t('accounts.statementDetailsTitle')}
              {statement.is_closed && (
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="uppercase font-bold">Fermé</Badge>
                  <Badge variant={getPaymentStatus(statement).variant} className={getPaymentStatus(statement).className}>
                    {getPaymentStatus(statement).text}
                  </Badge>
                </div>
              )}
            </CardTitle>
            <CardDescription>
              {t('accounts.statementDetailsPeriod', { 
                start: new Date(statement.statement_period_start).toLocaleDateString('fr-CA'), 
                end: new Date(statement.statement_period_end).toLocaleDateString('fr-CA') 
              })}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {cardId && <RecordPaymentDialog cardId={cardId} onPaymentSuccess={fetchDetails} />}
            {currentStatementId === statement.id && !statement.is_closed && (
              <Button variant="outline" onClick={handleCloseStatement}>
                <Lock className="mr-2 h-4 w-4" />
                Fermer le relevé
              </Button>
            )}
            <Button variant="outline" onClick={handleSendSecureLink} disabled={sending}>
              <Share2 className="mr-2 h-4 w-4" />
              {sending ? 'Envoi...' : 'Envoyer lien sécurisé'}
            </Button>
            <PDFDownloadLink
              document={
                <StatementPDF
                  institution={institution}
                  profile={profile}
                  account={account}
                  statement={statement}
                  transactions={transactions}
                  interestCharged={interestCharged}
                />
              }
              fileName={`Releve_${accountId}_${statement.id}.pdf`}
            >
              {({ loading: pdfLoading }) => (
                <Button variant="outline">
                  <FileDown className="mr-2 h-4 w-4" />
                  {pdfLoading ? 'Préparation...' : 'Télécharger PDF'}
                </Button>
              )}
            </PDFDownloadLink>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {statement.carried_over_to_statement_id && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Paiement en Retard</AlertTitle>
              <AlertDescription>
                Le paiement minimum n'a pas été reçu à temps. Le montant dû a été reporté sur le <Link to={`/dashboard/accounts/credit/${accountId}/statements/${statement.carried_over_to_statement_id}`} className="underline font-semibold">relevé suivant</Link>.
              </AlertDescription>
            </Alert>
          )}
          {statement.minimum_payment_carried_over > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Montant Reporté</AlertTitle>
              <AlertDescription>
                Ce relevé inclut un montant de {formatCurrency(statement.minimum_payment_carried_over)} reporté du relevé précédent pour paiement minimum non effectué.
              </AlertDescription>
            </Alert>
          )}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground">{t('accounts.statementOpeningBalance')}</p>
              <p className="text-lg font-bold">{formatCurrency(statement.opening_balance)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground">{t('accounts.statementNewBalance')}</p>
              <p className="text-lg font-bold">{formatCurrency(statement.closing_balance)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground">Intérêts facturés</p>
              <p className="text-lg font-bold">{formatCurrency(interestCharged)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground">{t('accounts.statementMinimumPayment')}</p>
              <p className="text-lg font-bold">{formatCurrency(statement.minimum_payment)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground">{t('accounts.statementDueDate')}</p>
              <p className="text-lg font-bold">{new Date(statement.payment_due_date).toLocaleDateString('fr-CA')}</p>
            </div>
          </div>

          <h3 className="font-semibold mb-2">{t('transactions.title')}</h3>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('date', { ns: 'common' })}</TableHead>
                <TableHead>{t('description', { ns: 'common' })}</TableHead>
                <TableHead>{t('type', { ns: 'common' })}</TableHead>
                <TableHead className="text-right">{t('amount', { ns: 'common' })}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map(tx => (
                <TableRow key={tx.id}>
                  <TableCell>{new Date(tx.created_at).toLocaleDateString('fr-CA')}</TableCell>
                  <TableCell>{tx.description}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{tx.type.replace('_', ' ')}</Badge></TableCell>
                  <TableCell className={`text-right font-mono ${tx.type === 'payment' ? 'text-green-600' : ''}`}>
                    {tx.type === 'payment' ? '-' : ''}{formatCurrency(tx.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="text-right font-bold">{t('accounts.statementNewBalance')}</TableCell>
                <TableCell className="text-right font-bold">{formatCurrency(statement.closing_balance)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default StatementDetails;