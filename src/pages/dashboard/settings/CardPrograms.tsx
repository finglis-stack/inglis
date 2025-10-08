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

const CardPrograms = () => {
  const { t } = useTranslation();
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
      showError(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{t('dashboard.cardPrograms.title')}</h1>
        <Button asChild>
          <Link to="/dashboard/settings/card-programs/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('dashboard.cardPrograms.createProgram')}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.cardPrograms.listTitle')}</CardTitle>
          <CardDescription>{t('dashboard.cardPrograms.listDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('dashboard.cardPrograms.colName')}</TableHead>
                <TableHead>{t('dashboard.cardPrograms.colId')}</TableHead>
                <TableHead>{t('dashboard.cardPrograms.colType')}</TableHead>
                <TableHead>{t('dashboard.cardPrograms.colStatus')}</TableHead>
                <TableHead className="text-right">{t('dashboard.cardPrograms.colActions')}</TableHead>
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" disabled={deletingId === program.id}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>{t('dashboard.cardPrograms.deleteTitle')}</AlertDialogTitle>
                            <AlertDialogDescription>
                              {t('dashboard.cardPrograms.deleteDesc')}
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>{t('dashboard.cardPrograms.deleteCancel')}</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteProgram(program.id)}>
                              {deletingId === program.id ? t('dashboard.cardPrograms.deleteProgress') : t('dashboard.cardPrograms.deleteConfirm')}
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">
                    {t('dashboard.cardPrograms.noPrograms')}
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