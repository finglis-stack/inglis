import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { showError } from '@/utils/toast';
import { Skeleton } from '@/components/ui/skeleton';

const CardPrograms = () => {
  const { t } = useTranslation();
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
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
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center h-24">
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