import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useIsMobile } from '@/hooks/use-mobile';
import { Badge } from '@/components/ui/badge';

const CardPrograms = () => {
  const { t } = useTranslation('dashboard');
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchPrograms = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('card_programs')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        showError(`Erreur lors de la récupération des programmes : ${error.message}`);
      } else {
        setPrograms(data);
      }
      setLoading(false);
    };

    fetchPrograms();
  }, []);

  const handleDeleteProgram = async (programId: string) => {
    setDeletingId(programId);
    try {
      const { error } = await supabase.functions.invoke('delete-card-program', {
        body: { program_id: programId },
      });

      if (error) {
        const functionError = await error.context.json();
        throw new Error(functionError.error || error.message);
      }

      setPrograms(programs.filter((p) => p.id !== programId));
      showSuccess("Programme supprimé avec succès !");
    } catch (err) {
      if (err instanceof Error) {
        showError(err.message);
      } else {
        showError("Une erreur inconnue est survenue.");
      }
    } finally {
      setDeletingId(null);
    }
  };

  const renderDeleteAction = (program: any) => (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" disabled={deletingId === program.id}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('cardPrograms.deleteTitle')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('cardPrograms.deleteDesc')}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('cardPrograms.deleteCancel')}</AlertDialogCancel>
          <AlertDialogAction onClick={() => handleDeleteProgram(program.id)}>
            {deletingId === program.id ? t('cardPrograms.deleteProgress') : t('cardPrograms.deleteConfirm')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (isMobile) {
    return (
      <div>
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold">{t('cardPrograms.title')}</h1>
          <Button asChild size="sm">
            <Link to="/dashboard/settings/card-programs/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              {t('cardPrograms.createProgram')}
            </Link>
          </Button>
        </div>
        {loading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : programs.length > 0 ? (
          <div className="space-y-4">
            {programs.map((program) => (
              <Card key={program.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base">{program.program_name}</CardTitle>
                    {renderDeleteAction(program)}
                  </div>
                  <CardDescription className="text-xs">{program.program_id}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between text-sm">
                  <Badge variant={program.status === 'active' ? 'default' : 'secondary'}>{program.status}</Badge>
                  <span className="capitalize text-muted-foreground">{program.card_type}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">{t('cardPrograms.noPrograms')}</p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{t('cardPrograms.title')}</h1>
        <Button asChild>
          <Link to="/dashboard/settings/card-programs/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('cardPrograms.createProgram')}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('cardPrograms.listTitle')}</CardTitle>
          <CardDescription>{t('cardPrograms.listDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('cardPrograms.colName')}</TableHead>
                <TableHead>{t('cardPrograms.colId')}</TableHead>
                <TableHead>{t('cardPrograms.colType')}</TableHead>
                <TableHead>{t('cardPrograms.colStatus')}</TableHead>
                <TableHead className="text-right">{t('cardPrograms.colActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : programs.length > 0 ? (
                programs.map((program) => (
                  <TableRow key={program.id}>
                    <TableCell className="font-medium">{program.program_name}</TableCell>
                    <TableCell>{program.program_id}</TableCell>
                    <TableCell>{program.card_type}</TableCell>
                    <TableCell>{program.status}</TableCell>
                    <TableCell className="text-right">
                      {renderDeleteAction(program)}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    {t('cardPrograms.noPrograms')}
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

export default CardPrograms;