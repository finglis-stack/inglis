import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Loader2, CheckCircle, Clock } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';

const Domains = () => {
  const [domains, setDomains] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState('');
  const [adding, setAdding] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const fetchDomains = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('custom_domains').select('*').order('created_at', { ascending: false });
    if (error) showError(error.message);
    else setDomains(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchDomains();
  }, []);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setAdding(true);
    try {
      const { error } = await supabase.functions.invoke('add-custom-domain', {
        body: { domain: newDomain },
      });
      if (error) {
        const functionError = await error.context.json();
        throw new Error(functionError.error || "Une erreur est survenue.");
      }
      showSuccess("Domaine ajouté. Veuillez configurer vos DNS.");
      setNewDomain('');
      fetchDomains();
    } catch (err) {
      showError(err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleVerifyDomain = async (domainName: string) => {
    setVerifyingId(domainName);
    try {
      const { data, error } = await supabase.functions.invoke('verify-custom-domain', {
        body: { domain: domainName },
      });
      if (error) {
        const functionError = await error.context.json();
        throw new Error(functionError.error || "Erreur de vérification.");
      }
      if (data.verified) {
        showSuccess("Domaine vérifié avec succès !");
      } else {
        showError("La vérification a échoué. Assurez-vous que vos DNS sont corrects et attendez quelques minutes.");
      }
      fetchDomains();
    } catch (err) {
      showError(err.message);
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Domaines Personnalisés</h1>
      <p className="text-muted-foreground">Configurez un domaine personnalisé pour vos formulaires d'intégration.</p>

      <Card>
        <CardHeader>
          <CardTitle>Ajouter un domaine</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddDomain} className="flex gap-2">
            <Input placeholder="ex: apply.votrebanque.com" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} />
            <Button type="submit" disabled={adding}>
              {adding && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ajouter
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vos domaines</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domaine</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={3} className="text-center">Chargement...</TableCell></TableRow>
              ) : domains.length > 0 ? (
                domains.map(domain => (
                  <>
                    <TableRow key={domain.id}>
                      <TableCell className="font-medium">{domain.domain_name}</TableCell>
                      <TableCell>
                        {domain.status === 'verified' ? (
                          <Badge className="bg-green-600 hover:bg-green-700"><CheckCircle className="h-3 w-3 mr-1" />Vérifié</Badge>
                        ) : (
                          <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />En attente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {domain.status === 'pending' && (
                          <Button variant="outline" size="sm" onClick={() => handleVerifyDomain(domain.domain_name)} disabled={verifyingId === domain.domain_name}>
                            {verifyingId === domain.domain_name && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Vérifier
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                    {domain.status === 'pending' && domain.verification_data && (
                      <TableRow>
                        <TableCell colSpan={3}>
                          <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>Action requise</AlertTitle>
                            <AlertDescription className="text-xs font-mono space-y-2">
                              <p>Veuillez ajouter l'enregistrement DNS suivant chez votre registraire de domaine :</p>
                              {domain.verification_data.map((rec, i) => (
                                <div key={i} className="p-2 bg-muted rounded">
                                  <p>Type: {rec.type}</p>
                                  <p>Name: {rec.name || '@'}</p>
                                  <p>Value: {rec.value}</p>
                                </div>
                              ))}
                            </AlertDescription>
                          </Alert>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              ) : (
                <TableRow><TableCell colSpan={3} className="text-center h-24">Aucun domaine configuré.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Domains;