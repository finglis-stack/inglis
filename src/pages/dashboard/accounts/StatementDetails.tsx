import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft } from 'lucide-react';
import { showError } from '@/utils/toast';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';

const StatementDetails = () => {
  const { accountId, statementId } = useParams();
  const { t } = useTranslation(['dashboard', 'common']);
  const [statement, setStatement] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!statementId) return;
      setLoading(true);

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
    fetchDetails();
  }, [statementId, t]);

  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!statement) {
    return <p>{t('accounts.statementNotFound')}</p>;
  }

  const formatCurrency = (amount: number) => new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(amount);

  return (
    <div className="space-y-6">
      <Link to={`/dashboard/accounts/credit/${accountId}`} className="flex items-center text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('newTransaction.backToAccount')}
      </Link>
      <Card>
        <CardHeader>
          <CardTitle>{t('accounts.statementDetailsTitle')}</CardTitle>
          <CardDescription>
            {t('accounts.statementDetailsPeriod', { 
              start: new Date(statement.statement_period_start).toLocaleDateString('fr-CA'), 
              end: new Date(statement.statement_period_end).toLocaleDateString('fr-CA') 
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-center">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground">{t('accounts.statementOpeningBalance')}</p>
              <p className="text-lg font-bold">{formatCurrency(statement.opening_balance)}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-muted-foreground">{t('accounts.statementNewBalance')}</p>
              <p className="text-lg font-bold">{formatCurrency(statement.closing_balance)}</p>
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