import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Copy, Check, Trash2, Loader2, Edit } from 'lucide-react';
import { Link } from 'react-router-dom';
import { showError, showSuccess } from '@/utils/toast';
import { Badge } from '@/components/ui/badge';
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

const OnboardingFormsSettings = () => {
  const [forms, setForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchForms = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('onboarding_forms').select('*');
      if (error) showError(error.message);
      else setForms(data);
      setLoading(false);
    };
    fetchForms();
  }, []);

  const copyUrl = (formId: string) => {
    const isLocal = window.location.hostname === 'localhost';
    const url = isLocal 
      ? `${window.location.origin}/apply/${formId}`
      : `https://appy.inglisdominion.ca/${formId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(formId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (formId: string) => {
    setDeletingId(formId);
    try {
      const { error } = await supabase.from('onboarding_forms').delete().eq('id', formId);
      if (error) throw error;
      setForms(forms.filter(f => f.id !== formId));
      showSuccess("Formulaire supprimé avec succès.");
    } catch (err) {
      showError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Formulaires d'Intégration</h1>
          <p className="text-muted-foreground">Créez et gérez les formulaires publics pour l'acquisition de nouveaux clients.</p>
        </div>
        <Button asChild>
          <Link to="/dashboard/settings/forms/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Créer un formulaire
          </Link>
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Vos formulaires</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Lien</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center">Chargement...</TableCell></TableRow>
              ) : forms.length > 0 ? (
                forms.map(form => (
                  <TableRow key={form.id}>
                    <TableCell className="font-medium">{form.name || 'Formulaire sans nom'}</TableCell>
                    <TableCell><Badge variant={form.is_active ? 'default' : 'secondary'}>{form.is_active ? 'Actif' : 'Inactif'}</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => copyUrl(form.id)}>
                        {copiedId === form.id ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/dashboard/settings/forms/edit/${form.id}`}>
                          <Edit className="h-4 w-4" />
                        </Link>
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={deletingId === form.id}>
                            {deletingId === form.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Supprimer ce formulaire ?</AlertDialogTitle>
                            <AlertDialogDescription>Cette action est irréversible. Le lien public deviendra inaccessible.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuler</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(form.id)}>Confirmer</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="text-center h-24">Aucun formulaire créé.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingFormsSettings;