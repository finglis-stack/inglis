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
import { useIsMobile } from '@/hooks/use-mobile';

const Cards = () => {
  const { t } = useTranslation('dashboard');
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

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

  const renderActions = (card: any) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {card.card_type === 'debit' && card.debit_account_id && (
          <DropdownMenuItem asChild>
            <Link to={`/dashboard/accounts/debit/${card.debit_account_id}`}>
              <Settings className="mr-2 h-4 w-4" />
              {t('cards.actionManageAccount')}
            </Link>
          </DropdownMenuItem>
        )}
        {card.card_type === 'credit' && card.credit_account_id && (
          <DropdownMenuItem asChild>
            <Link to={`/dashboard/accounts/credit/${card.credit_account_id}`}>
              <Settings className="mr-2 h-4 w-4" />
              {t('cards.actionManageAccount')}
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem>{t('cards.actionView')}</DropdownMenuItem>
        <DropdownMenuItem>{t('cards.actionDeactivate')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (isMobile) {
    return (
      <div>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">{t('cards.title')}</h1>
          <Button asChild size="sm">
            <Link to="/dashboard/cards/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              {t('cards.addCard')}
            </Link>
          </Button>
        </div>
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : cards.length > 0 ? (
          <div className="space-y-4">
            {cards.map((card) => (
              <Card key={card.card_id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-base">{card.profile_name}</CardTitle>
                      <CardDescription className="text-xs">{card.program_name}</CardDescription>
                    </div>
                    {renderActions(card)}
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p className="font-mono text-xs">{card.card_number}</p>
                  <div className="flex items-center justify-between">
                    <Badge variant={getStatusVariant(card.card_status)}>{card.card_status}</Badge>
                    <p className="text-muted-foreground text-xs">
                      {new Date(card.card_created_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">{t('cards.noCards')}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{t('cards.title')}</h1>
        <Button asChild>
          <Link to="/dashboard/cards/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('cards.addCard')}
          </Link>
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>{t('cards.listTitle')}</CardTitle>
          <CardDescription>{t('cards.listDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('cards.colHolder')}</TableHead>
                <TableHead>{t('cards.colProgram')}</TableHead>
                <TableHead>{t('cards.colNumber')}</TableHead>
                <TableHead>{t('cards.colStatus')}</TableHead>
                <TableHead>{t('cards.colDate')}</TableHead>
                <TableHead className="text-right">{t('cards.colActions')}</TableHead>
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
                      {renderActions(card)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center h-24">
                    {t('cards.noCards')}
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