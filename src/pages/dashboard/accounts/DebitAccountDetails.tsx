import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, DollarSign, CreditCard, User, Download, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { showError } from '@/utils/toast';

const DebitAccountDetails = () => {
  const { accountId } = useParams();
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAccountDetails = async () => {
      if (!accountId) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('debit_accounts')
        .select(`
          *,
          cards(*, card_programs(program_name)),
          profiles(full_name, legal_name, type)
        `)
        .eq('id', accountId)
        .single();

      if (error) {
        showError(`Erreur: ${error.message}`);
        setAccount(null);
      } else {
        setAccount(data);
      }
      setLoading(false);
    };

    fetchAccountDetails();
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
            <Button><Upload className="mr-2 h-4 w-4" /> Déposer des fonds</Button>
            <Button variant="outline"><Download className="mr-2 h-4 w-4" /> Retirer des fonds</Button>
            <Button variant="destructive">Bloquer le compte</Button>
          </CardContent>
        </Card>
      </div>

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
      </div>
    </div>
  );
};

export default DebitAccountDetails;