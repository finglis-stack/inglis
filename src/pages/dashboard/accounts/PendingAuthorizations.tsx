import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTranslation } from 'react-i18next';

const PendingAuthorizations = () => {
  const { t } = useTranslation();
  const { accountId } = useParams();
  const [authorizations, setAuthorizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<'debit' | 'credit'>('debit');

  useEffect(() => {
    const fetchAuthorizations = async () => {
      if (!accountId) return;
      setLoading(true);

      const { data: debitCheck } = await supabase
        .from('debit_accounts')
        .select('id')
        .eq('id', accountId)
        .single();
      
      const isDebit = !!debitCheck;
      setAccountType(isDebit ? 'debit' : 'credit');

      const column = isDebit ? 'debit_account_id' : 'credit_account_id';
      
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq(column, accountId)
        .eq('status', 'authorized')
        .order('authorized_at', { ascending: false });

      if (error) {
        showError(`${t('dashboard.accounts.error')}: ${error.message}`);
      } else {
        setAuthorizations(data || []);
      }
      setLoading(false);
    };

    fetchAuthorizations();
  }, [accountId, t]);

  const handleCapture = async (transactionId: string) => {
    setProcessingId(transactionId);
    try {
      const { error } = await supabase.rpc('capture_authorization', {
        p_transaction_id: transactionId,
      });

      if (error) throw error;

      showSuccess(t('dashboard.accounts.captureSuccess'));
      setAuthorizations(authorizations.filter(a => a.id !== transactionId));
    } catch (err) {
      showError(`${t('dashboard.accounts.error')}: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancel = async (transactionId: string) => {
    setProcessingId(transactionId);
    try {
      const { error } = await supabase.rpc('cancel_authorization', {
        p_transaction_id: transactionId,
      });

      if (error) throw error;

      showSuccess(t('dashboard.accounts.cancelSuccess'));
      setAuthorizations(authorizations.filter(a => a.id !== transactionId));
    } catch (err) {
      showError(`${t('dashboard.accounts.error')}: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffMs < 0) return t('dashboard.accounts.expired');
    if (diffHours > 0) return `${diffHours}h ${diffMinutes}m`;
    return `${diffMinutes}m`;
  };

  return (
    <div className="space-y-6">
      <Link to={`/dashboard/accounts/${accountType}/${accountId}`} className="flex items-center text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('dashboard.newTransaction.backToAccount')}
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t('dashboard.accounts.pendingAuthTitle')}
          </CardTitle>
          <CardDescription>
            {t('dashboard.accounts.pendingAuthDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">{t('dashboard.users.loading')}</div>
          ) : authorizations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('dashboard.accounts.authorizationCode')}</TableHead>
                  <TableHead>{t('dashboard.newTransaction.merchantName')}</TableHead>
                  <TableHead>{t('dashboard.newTransaction.amount')}</TableHead>
                  <TableHead>{t('dashboard.transactions.authorizedOn')}</TableHead>
                  <TableHead>{t('dashboard.accounts.expiresIn')}</TableHead>
                  <TableHead className="text-right">{t('dashboard.users.colActions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {authorizations.map((auth) => (
                  <TableRow key={auth.id}>
                    <TableCell className="font-mono text-xs">{auth.authorization_code}</TableCell>
                    <TableCell>{auth.description}</TableCell>
                    <TableCell className="font-semibold">
                      {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(auth.amount)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(auth.authorized_at).toLocaleString('fr-CA')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {getTimeRemaining(auth.expires_at)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              size="sm" 
                              disabled={processingId === auth.id}
                            >
                              {processingId === auth.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  {t('dashboard.accounts.capture')}
                                </>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('dashboard.accounts.captureConfirmTitle')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('dashboard.accounts.captureConfirmDesc', { amount: new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(auth.amount) })}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('dashboard.userProfile.cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleCapture(auth.id)}>
                                {t('dashboard.accounts.confirmCapture')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              disabled={processingId === auth.id}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              {t('dashboard.accounts.cancel')}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t('dashboard.accounts.cancelConfirmTitle')}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {t('dashboard.accounts.cancelConfirmDesc')}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t('dashboard.userProfile.cancel')}</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleCancel(auth.id)}>
                                {t('dashboard.accounts.confirmCancel')}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('dashboard.accounts.noPendingAuth')}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingAuthorizations;