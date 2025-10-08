import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Wallet, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const UserAccounts = ({ cards, creditAccounts, debitAccounts, className }) => {
  const getStatusVariant = (status) => {
    switch ((status || '').toLowerCase()) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'blocked':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getCardNumber = (card) => {
    return `${card.user_initials} ${card.issuer_id} ${card.random_letters} ****${card.unique_identifier.slice(-3)} ${card.check_digit}`;
  };

  const findAccountForCard = (cardId) => {
    const creditAccount = creditAccounts.find(acc => acc.card_id === cardId);
    if (creditAccount) return { type: 'credit', ...creditAccount };
    const debitAccount = debitAccounts.find(acc => acc.card_id === cardId);
    if (debitAccount) return { type: 'debit', ...debitAccount };
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Comptes et Cartes</CardTitle>
      </CardHeader>
      <CardContent>
        {cards.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Carte</TableHead>
                <TableHead>Programme</TableHead>
                <TableHead>Compte Associé</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cards.map(card => {
                const account = findAccountForCard(card.id);
                return (
                  <TableRow key={card.id}>
                    <TableCell>
                      <p className="font-mono text-xs">{getCardNumber(card)}</p>
                      <Badge variant={getStatusVariant(card.status)} className="mt-1">{card.status}</Badge>
                    </TableCell>
                    <TableCell>{card.card_programs.program_name}</TableCell>
                    <TableCell>
                      {account ? (
                        <div className="flex items-center gap-2">
                          {account.type === 'credit' ? <CreditCard className="h-4 w-4 text-blue-500 flex-shrink-0" /> : <Wallet className="h-4 w-4 text-green-500 flex-shrink-0" />}
                          <div>
                            <p className="font-semibold capitalize">{account.type === 'credit' ? 'Crédit' : 'Débit'}</p>
                            {account.type === 'credit' ? (
                              <p className="text-xs text-muted-foreground">Limite: {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(account.credit_limit)}</p>
                            ) : (
                              <p className="text-xs text-muted-foreground">Solde: {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(account.current_balance)}</p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">Aucun compte lié</p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {account?.type === 'debit' && (
                        <Button asChild variant="outline" size="sm">
                          <Link to={`/dashboard/accounts/debit/${account.id}`}>
                            <Settings className="mr-2 h-4 w-4" /> Gérer
                          </Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune carte associée à ce profil.</p>
        )}
      </CardContent>
    </Card>
  );
};

export default UserAccounts;