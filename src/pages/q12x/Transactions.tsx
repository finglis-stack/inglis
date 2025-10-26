import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { showError } from '@/utils/toast';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import AvailabilityCell from '@/components/q12x/AvailabilityCell';
import { useTranslation } from 'react-i18next';

const TRANSACTIONS_PER_PAGE = 15;

const Q12xTransactions = () => {
  const { t } = useTranslation('q12x');
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      const from = (page - 1) * TRANSACTIONS_PER_PAGE;
      const to = from + TRANSACTIONS_PER_PAGE - 1;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: merchant, error: merchantError } = await supabase
        .from('merchant_accounts')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (merchantError || !merchant) {
        showError("Profil marchand non trouvé.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('transactions')
        .select('*, merchant_balance_ledgers(available_at)')
        .eq('merchant_account_id', merchant.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        showError(error.message);
      } else {
        setTransactions(data);
        setHasMore(data.length === TRANSACTIONS_PER_PAGE);
      }
      setLoading(false);
    };

    fetchTransactions();
  }, [page]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('transactions.title')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('transactions.table.date')}</TableHead>
                <TableHead>{t('transactions.table.description')}</TableHead>
                <TableHead>{t('transactions.table.status')}</TableHead>
                <TableHead>{t('transactions.table.availability')}</TableHead>
                <TableHead className="text-right">{t('transactions.table.amount')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center">{t('transactions.table.loading')}</TableCell></TableRow>
              ) : transactions.length > 0 ? (
                transactions.map((tx) => (
                  <TableRow
                    key={tx.id}
                    onClick={() => navigate(`/dashboard/transactions/${tx.id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell>{new Date(tx.created_at).toLocaleString('fr-CA')}</TableCell>
                    <TableCell>{tx.description}</TableCell>
                    <TableCell>
                      <Badge variant={tx.status === 'captured' || tx.status === 'completed' ? 'default' : 'secondary'}>
                        {tx.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <AvailabilityCell availableAt={tx.merchant_balance_ledgers[0]?.available_at} />
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: tx.currency }).format(tx.amount)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="text-center h-24">{t('transactions.table.noTransactions')}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex justify-end items-center gap-4 mt-4">
          <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={page === 1 || loading}>
            <ArrowLeft className="h-4 w-4 mr-2" /> {t('transactions.pagination.previous')}
          </Button>
          <span className="text-sm">{t('transactions.pagination.page', { page })}</span>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!hasMore || loading}>
            {t('transactions.pagination.next')} <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default Q12xTransactions;