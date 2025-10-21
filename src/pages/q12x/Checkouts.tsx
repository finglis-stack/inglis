import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { showError, showSuccess } from '@/utils/toast';
import { PlusCircle, Copy, Check } from 'lucide-react';

const Checkouts = () => {
  const [checkouts, setCheckouts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCheckouts = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('checkouts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        showError(error.message);
      } else {
        setCheckouts(data);
      }
      setLoading(false);
    };
    fetchCheckouts();
  }, []);

  const copyLink = (checkoutId: string) => {
    const url = `${window.location.origin}/pay/${checkoutId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(checkoutId);
    showSuccess("Lien copié !");
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Checkouts</h1>
          <p className="text-muted-foreground">Créez et gérez vos liens de paiement.</p>
        </div>
        <Button asChild>
          <Link to="/dashboard/checkouts/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Créer un Checkout
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vos Liens de Paiement</CardTitle>
          <CardDescription>Partagez ces liens pour recevoir des paiements.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Montant</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Date de création</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center">Chargement...</TableCell></TableRow>
              ) : checkouts.length > 0 ? (
                checkouts.map(checkout => (
                  <TableRow key={checkout.id}>
                    <TableCell className="font-medium">{checkout.name}</TableCell>
                    <TableCell>
                      {checkout.is_amount_variable 
                        ? <Badge variant="outline">Variable</Badge> 
                        : new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(checkout.amount)}
                    </TableCell>
                    <TableCell><Badge variant={checkout.status === 'active' ? 'default' : 'secondary'}>{checkout.status}</Badge></TableCell>
                    <TableCell>{new Date(checkout.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => copyLink(checkout.id)}>
                        {copiedId === checkout.id ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={5} className="text-center h-24">Aucun checkout créé.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Checkouts;