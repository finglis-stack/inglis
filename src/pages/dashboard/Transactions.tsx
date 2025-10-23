import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowUpDown, Search, ArrowLeft, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

const TRANSACTIONS_PER_PAGE = 15;

const Transactions = () => {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();

  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = Math.ceil(totalCount / TRANSACTIONS_PER_PAGE);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('search_transactions', {
        p_search_term: searchTerm,
        p_sort_by: sortBy,
        p_sort_order: sortOrder,
        p_page_size: TRANSACTIONS_PER_PAGE,
        p_page_num: currentPage,
      });

      if (error) throw error;

      setTransactions(data || []);
      setTotalCount(data && data.length > 0 ? data[0].total_count : 0);
    } catch (error) {
      showError(`Erreur lors de la récupération des transactions : ${error.message}`);
      setTransactions([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, sortBy, sortOrder, currentPage]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchTerm(searchQuery);
      setCurrentPage(1); // Reset to first page on new search
    }, 500); // Debounce search input

    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setCurrentPage(1); // Reset to first page on sort change
  };

  const SortableHeader = ({ column, label }: { column: string; label: string }) => (
    <TableHead>
      <Button variant="ghost" onClick={() => handleSort(column)}>
        {label}
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    </TableHead>
  );

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">{t('transactions.title')}</h1>
      <p className="text-muted-foreground mb-6">{t('transactions.subtitle')}</p>
      
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Historique des transactions</CardTitle>
              <CardDescription>Recherchez et filtrez toutes les transactions de votre institution.</CardDescription>
            </div>
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Rechercher par nom, UUID, carte..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHeader column="profile_name" label="Titulaire" />
                  <TableHead>Description</TableHead>
                  <SortableHeader column="amount" label="Montant" />
                  <SortableHeader column="status" label="Statut" />
                  <SortableHeader column="created_at" label="Date" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <TableRow key={tx.id} onClick={() => navigate(`/dashboard/transactions/${tx.id}`)} className="cursor-pointer">
                      <TableCell className="font-medium">{tx.profile_name}</TableCell>
                      <TableCell>{tx.description}</TableCell>
                      <TableCell className={`font-mono ${tx.type === 'payment' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'payment' ? '+' : '-'} {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(tx.amount)}
                      </TableCell>
                      <TableCell><Badge variant="outline">{tx.status}</Badge></TableCell>
                      <TableCell>{new Date(tx.created_at).toLocaleString('fr-CA')}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center h-24">
                      {t('users.noResults')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between space-x-2 py-4">
            <div className="text-sm text-muted-foreground">
              {totalCount} résultat(s) trouvé(s).
            </div>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Précédent
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => p + 1)}
                disabled={currentPage >= totalPages}
              >
                Suivant
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Transactions;