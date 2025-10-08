import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { PlusCircle, MoreHorizontal, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';

const Cards = () => {
  const { t } = useTranslation();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCards = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_institution_cards');

      if (error) {
        showError(`Erreur lors de la récupération des cartes : ${error.message}`);
      } else {
        setCards(data || []);
      }
      setLoading(false);
    };

    fetchCards();
  }, []);

  const getStatusVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status.toLowerCase()) {
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

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{t('dashboard.cards.title')}</h1>
        <Button asChild>
          <Link to="/dashboard/cards/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('dashboard.cards.addCard')}
          </Link>
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.cards.listTitle')}</CardTitle>
          <CardDescription>{t('dashboard.cards.listDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('dashboard.cards.colHolder')}</TableHead>
                <TableHead>{t('dashboard.cards.colProgram')}</TableHead>
                <TableHead>{t('dashboard.cards.colNumber')}</TableHead>
                <TableHead>{t('dashboard.cards.colStatus')}</TableHead>
                <TableHead>{t('dashboard.cards.colDate')}</TableHead>
                <TableHead className="text-right">{t('dashboard.cards.colActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : cards.length > 0 ? (
                cards.map((card) => (
                  <TableRow key={card.card_id}>
                    <TableCell className="font-medium">{card.profile_name}</TableCell>
                    <TableCell>{card.program_name}</TableCell>
                    <TableCell className="font-mono">{card.card_number}</TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(card.card_status)}>{card.card_status}</Badge>
                    </TableCell>
                    <TableCell>{new Date(card.card_created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {card.card_type === 'debit' && card.debit_account_id && (
                            <>
                              <DropdownMenuItem asChild>
                                <Link to={`/dashboard/accounts/debit/${card.debit_account_id}`}>
                                  <Settings className="mr-2 h-4 w-4" />
                                  Gérer le compte
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem>{t('dashboard.cards.actionView')}</DropdownMenuItem>
                          <DropdownMenuItem>{t('dashboard.cards.actionDeactivate')}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    {t('dashboard.cards.noCards')}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
export default Cards;