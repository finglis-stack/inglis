import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, DollarSign, CreditCard, User, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { showError } from '@/utils/toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import DebitAccountAccessLog from '@/components/DebitAccountAccessLog';

const DebitAccountDetails = () => {
  const { accountId } = useParams();
  const [account, setAccount] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetails = async () => {
      if (!accountId) return;
      setLoading(true);

      // Record access
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('debit_account_access_logs')
          .insert({ debit_account_id: accountId, visitor_user_id: user.id });
      }

      // Fetch account details
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
        showError(`Erreur: ${accountError.message}`);
        setLoading(false);
        return;
      }
      setAccount(accountData);

      // Fetch transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from('transactions')
        .select('*')
        .eq('debit_account_id', accountId)
        .order('created_at', { ascending: false });
      
      if (transactionsError) {
        showError(`Erreur lors de la récupération des transactions: ${transactionsError.message}`);
      } else {
        setTransactions(transactionsData);
      }

      // Fetch logs (including the one just added)
      const { data: logsData, error: logsError } = await supabase.rpc('get_debit_account_access_logs', {
        p_account_id: accountId,
      });
      if (logsError) {
        showError(`Erreur lors de la récupération de l'historique d'accès: ${logsError.message}`);
      } else {
        setAccessLogs(logsData || []);
      }

      setLoading(false);
    };

    fetchDetails();
  }, [accountId]);

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
    return <div>Compte non trouvé.</div>;
  }

  const profileName = account.profiles.type === 'personal' ? account.profiles.full_name : account.profiles.legal_name;
  const cardNumber = `${account.cards.user_initials} ${account.cards.issuer_id} ${account.cards.random_letters} ****${account.cards.unique_identifier.slice(-3)} ${account.cards.check_digit}`;

  return (
    <div className="space-y-6">
      <Link to="/dashboard/cards" className="flex items-center text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour à la liste des cartes
      </Link>
      
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Gestion du Compte de Débit</h1>
          <p className="text-muted-foreground">Compte de {profileName}</p>
          <p className="text-xs text-muted-foreground font-mono mt-1">ID: {account.id}</p>
        </div>
        <Badge variant={account.status === 'active' ? 'default' : 'destructive'}>{account.status}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><DollarSign className="h-5 w-5" /> Solde Actuel</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">
              {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(account.current_balance)}
            </p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Actions sur le Compte</CardTitle>
            <CardDescription>Effectuez des opérations sur ce compte de débit.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Button variant="destructive">Bloquer le compte</Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Historique des Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Montant</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.length > 0 ? (
                transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>{new Date(tx.created_at).toLocaleString('fr-CA')}</TableCell>
                    <TableCell>{tx.description || 'N/A'}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{tx.type}</Badge></TableCell>
                    <TableCell className={`text-right font-medium ${tx.type === 'payment' ? 'text-green-600' : 'text-red-600'}`}>
                      {tx.type === 'payment' ? '+' : '-'}
                      {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(tx.amount)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
                    Aucune transaction trouvée pour ce compte.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Carte Associée</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <p className="font-mono">{cardNumber}</p>
            <p className="text-sm text-muted-foreground">Programme: {account.cards.card_programs.program_name}</p>
            <p className="text-sm text-muted-foreground">Statut de la carte: <Badge variant={account.cards.status === 'active' ? 'default' : 'destructive'}>{account.cards.status}</Badge></p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" /> Titulaire du Compte</CardTitle></CardHeader>
          <CardContent>
            <p className="font-semibold">{profileName}</p>
            <Button variant="link" asChild className="p-0 h-auto mt-2">
              <Link to={`/dashboard/users/profile/${account.profile_id}`}>Voir le profil complet</Link>
            </Button>
          </CardContent>
        </Card>
        <DebitAccountAccessLog logs={accessLogs} className="md:col-span-2" />
      </div>
    </div>
  );
};

export default DebitAccountDetails;