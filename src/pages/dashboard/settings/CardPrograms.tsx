import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const CardPrograms = () => {
  const { t } = useTranslation();
  // Données fictives en attendant la suite
  const programs: any[] = [];

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
              {programs.length > 0 ? (
                programs.map((program) => (
                  <TableRow key={program.id}>
                    <TableCell>{program.name}</TableCell>
                    <TableCell>{program.id}</TableCell>
                    <TableCell>{program.type}</TableCell>
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