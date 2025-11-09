import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Info, Loader2, CheckCircle, Clock, Edit, Trash2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const renderVerificationData = (data: any) => {
  if (!data) return <p className="text-sm text-muted-foreground">Aucun enregistrement de vérification trouvé. Le domaine est peut-être déjà vérifié.</p>;
  
  const records = Array.isArray(data) ? data : [data];

  if (records.length === 0) {
    return <p className="text-sm text-muted-foreground">Aucun enregistrement de vérification trouvé. Le domaine est peut-être déjà vérifié.</p>;
  }

  return (
    <div className="space-y-3 font-mono text-xs">
      {records.map((rec, i) => (
        <div key={i} className="p-3 bg-muted rounded-md border">
          <p><strong>Type:</strong> {rec.type}</p>
          <p><strong>Nom/Hôte:</strong> {rec.domain || '@'}</p>
          <p className="break-all"><strong>Valeur/Cible:</strong> {rec.value}</p>
        </div>
      ))}
    </div>
  );
};

const Domains = () => {
  const [domains, setDomains] = useState<any[]>([]);
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDomain, setNewDomain] = useState('');
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [editingDomain, setEditingDomain] = useState<any | null>(null);
  const [verificationInfo, setVerificationInfo] = useState<any | null>(null);

  const fetchDomainsAndForms = async () => {
    setLoading(true);
    const { data: domainData, error: domainError } = await supabase.from('custom_domains').select('*, onboarding_forms(name)').order('created_at', { ascending: false });
    if (domainError) showError(domainError.message);
    else setDomains(domainData || []);

    const { data: formData, error: formError } = await supabase.from('onboarding_forms').select('id, name');
    if (formError) showError(formError.message);
    else setForms(formData || []);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchDomainsAndForms();
  }, []);

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDomain.trim()) return;
    setAdding(true);
    try {
      const { data, error } = await supabase.functions.invoke('add-custom-domain', {
        body: { domain: newDomain, formId: selectedFormId },
      });
      if (error) {
        const functionError = await error.context.json();
        throw new Error(functionError.error || "Une erreur est survenue.");
      }
      setVerificationInfo(data);
      setNewDomain('');
      setSelectedFormId(null);
      fetchDomainsAndForms();
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
        throw new Error(functionError.error || "Une erreur inattendue est survenue lors de la vérification.");
      }

      if (data.verified) {
        showSuccess("Domaine vérifié avec succès !");
        fetchDomainsAndForms();
      } else {
        setVerificationInfo(data);
        showError(`La vérification a échoué. Veuillez vérifier vos enregistrements DNS.`);
      }
    } catch (err) {
      showError(err.message);
    } finally {
      setVerifyingId(null);
    }
  };

  const handleDeleteDomain = async (domainName: string) => {
    try {
      const { error } = await supabase.functions.invoke('delete-custom-domain', {
        body: { domainName },
      });
      if (error) throw error;
      showSuccess("Domaine supprimé avec succès.");
      fetchDomainsAndForms();
    } catch (err) {
      showError(err.message);
    }
  };

  const handleUpdateDomain = async () => {
    if (!editingDomain) return;
    try {
      const { error } = await supabase.functions.invoke('update-custom-domain', {
        body: { domainId: editingDomain.id, formId: editingDomain.onboarding_form_id },
      });
      if (error) throw error;
      showSuccess("Lien du formulaire mis à jour.");
      setEditingDomain(null);
      fetchDomainsAndForms();
    } catch (err) {
      showError(err.message);
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
          <form onSubmit={handleAddDomain} className="flex flex-wrap gap-2">
            <Input placeholder="ex: apply.votrebanque.com" value={newDomain} onChange={(e) => setNewDomain(e.target.value)} className="flex-grow" />
            <Select onValueChange={setSelectedFormId} value={selectedFormId || ''}>
              <SelectTrigger className="w-[280px]"><SelectValue placeholder="Lier à un formulaire (optionnel)" /></SelectTrigger>
              <SelectContent>
                {forms.map(form => <SelectItem key={form.id} value={form.id}>{form.name}</SelectItem>)}
              </SelectContent>
            </Select>
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
                <TableHead>Formulaire Lié</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center">Chargement...</TableCell></TableRow>
              ) : domains.length > 0 ? (
                domains.map(domain => (
                  <>
                    <TableRow key={domain.id}>
                      <TableCell className="font-medium">{domain.domain_name}</TableCell>
                      <TableCell>{domain.onboarding_forms?.name || <span className="text-muted-foreground">Aucun</span>}</TableCell>
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
                        <Button variant="ghost" size="icon" onClick={() => setEditingDomain(domain)}><Edit className="h-4 w-4" /></Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Supprimer ce domaine ?</AlertDialogTitle><AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Annuler</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteDomain(domain.domain_name)}>Supprimer</AlertDialogAction></AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                    {domain.status === 'pending' && domain.verification_data && (
                      <TableRow>
                        <TableCell colSpan={4}>
                          <Alert>
                            <Info className="h-4 w-4" />
                            <AlertTitle>Action requise : Configurez vos DNS</AlertTitle>
                            <AlertDescription className="text-sm space-y-4">
                              <p>
                                Pour que votre domaine personnalisé fonctionne, vous devez ajouter les enregistrements DNS suivants chez votre registraire de domaine (là où vous avez acheté le domaine, comme GoDaddy, Namecheap, etc.).
                              </p>
                              {renderVerificationData(domain.verification_data)}
                              <p className="text-xs text-muted-foreground">
                                La propagation des DNS peut prendre de quelques minutes à plusieurs heures. Une fois les enregistrements ajoutés, revenez ici et cliquez sur "Vérifier".
                              </p>
                            </AlertDescription>
                          </Alert>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="text-center h-24">Aucun domaine configuré.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editingDomain} onOpenChange={() => setEditingDomain(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le formulaire pour {editingDomain?.domain_name}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Select onValueChange={(value) => setEditingDomain(d => ({...d, onboarding_form_id: value}))} value={editingDomain?.onboarding_form_id || ''}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un formulaire" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Aucun formulaire</SelectItem>
                {forms.map(form => <SelectItem key={form.id} value={form.id}>{form.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditingDomain(null)}>Annuler</Button>
            <Button onClick={handleUpdateDomain}>Sauvegarder</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!verificationInfo} onOpenChange={() => setVerificationInfo(null)}>
        <DialogContent className="sm:max-w-[625px]">
          <DialogHeader>
            <DialogTitle>Action requise : Configurez vos DNS</DialogTitle>
            <DialogDescription>
              Pour que votre domaine {verificationInfo?.name} fonctionne, ajoutez les enregistrements DNS suivants chez votre registraire de domaine.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Instructions</AlertTitle>
              <AlertDescription className="text-sm space-y-4">
                {renderVerificationData(verificationInfo?.verification)}
                <p className="text-xs text-muted-foreground font-sans">
                  La propagation des DNS peut prendre du temps. Vous pourrez vérifier le statut dans la liste des domaines.
                </p>
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button onClick={() => setVerificationInfo(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Domains;