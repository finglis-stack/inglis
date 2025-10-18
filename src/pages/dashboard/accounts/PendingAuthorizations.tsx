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

const PendingAuthorizations = () => {
  const { accountId } = useParams();
  const [authorizations, setAuthorizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [accountType, setAccountType] = useState<'debit' | 'credit'>('debit');

  useEffect(() => {
    const fetchAuthorizations = async () => {
      if (!accountId) return;
      setLoading(true);

      // Déterminer le type de compte
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
        showError(`Erreur: ${error.message}`);
      } else {
        setAuthorizations(data || []);
      }
      setLoading(false);
    };

    fetchAuthorizations();
  }, [accountId]);

  const handleCapture = async (transactionId: string) => {
    setProcessingId(transactionId);
    try {
      const { error } = await supabase.rpc('capture_authorization', {
        p_transaction_id: transactionId,
      });

      if (error) throw error;

      showSuccess("Autorisation capturée avec succès !");
      setAuthorizations(authorizations.filter(a => a.id !== transactionId));
    } catch (err) {
      showError(`Erreur: ${err.message}`);
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

      showSuccess("Autorisation annulée avec succès !");
      setAuthorizations(authorizations.filter(a => a.id !== transactionId));
    } catch (err) {
      showError(`Erreur: ${err.message}`);
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
    
    if (diffMs < 0) return 'Expiré';
    if (diffHours > 0) return `${diffHours}h ${diffMinutes}m`;
    return `${diffMinutes}m`;
  };

  return (
    <div className="space-y-6">
      <Link to={`/dashboard/accounts/${accountType}/${accountId}`} className="flex items-center text-sm text-muted-foreground hover:text-primary">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Retour au compte
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Autorisations en Attente
          </CardTitle>
          <CardDescription>
            Gérez les autorisations (holds) qui n'ont pas encore été capturées. Les autorisations expirent automatiquement après 4 jours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : authorizations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code d'autorisation</TableHead>
                  <TableHead>Marchand</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Autorisé le</TableHead>
                  <TableHead>Expire dans</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
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
                                  Capturer
                                </>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Capturer cette autorisation ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Le montant de {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(auth.amount)} sera définitivement débité du compte.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Annuler</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleCapture(auth.id)}>
                                Confirmer la capture
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
                              Annuler
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Annuler cette autorisation ?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Le hold sera libéré et le montant redeviendra disponible pour le client.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Retour</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleCancel(auth.id)}>
                                Confirmer l'annulation
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
              <p>Aucune autorisation en attente</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingAuthorizations;