import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Eye, AlertCircle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { showError } from '@/utils/toast';

const Applications = () => {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApplications = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('onboarding_applications')
        .select(`
          id,
          created_at,
          status,
          profiles (
            full_name,
            legal_name,
            type
          ),
          card_programs (
            program_name
          ),
          onboarding_forms (
            auto_approve_enabled
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        showError(error.message);
      } else {
        const sortedData = data.sort((a, b) => {
          if (a.status === 'pending' && b.status !== 'pending') return -1;
          if (a.status !== 'pending' && b.status === 'pending') return 1;
          return 0;
        });
        setApplications(sortedData);
      }
      setLoading(false);
    };
    fetchApplications();
  }, []);

  const getStatusBadge = (app: any) => {
    if (app.status === 'pending' && app.onboarding_forms?.auto_approve_enabled) {
      return (
        <Badge variant="secondary" className="flex items-center gap-1 w-fit">
          <Loader2 className="h-3 w-3 animate-spin" />
          En traitement
        </Badge>
      );
    }
    switch (app.status) {
      case 'pending':
        return (
          <Badge variant="destructive" className="flex items-center gap-1 w-fit">
            <AlertCircle className="h-3 w-3" />
            {t('applications.status.pending')}
          </Badge>
        );
      case 'approved':
        return <Badge variant="default">{t('applications.status.approved')}</Badge>;
      case 'rejected':
        return <Badge variant="secondary">{t('applications.status.rejected')}</Badge>;
      default:
        return <Badge variant="outline">{app.status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('applications.title')}</h1>
        <p className="text-muted-foreground">{t('applications.subtitle')}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{t('applications.listTitle')}</CardTitle>
          <CardDescription>{t('applications.listDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('applications.colApplicant')}</TableHead>
                <TableHead>{t('applications.colProgram')}</TableHead>
                <TableHead>{t('applications.colDate')}</TableHead>
                <TableHead>{t('applications.colStatus')}</TableHead>
                <TableHead className="text-right">{t('applications.colActions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}><Skeleton className="h-6 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : applications.length > 0 ? (
                applications.map(app => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">{app.profiles?.full_name || app.profiles?.legal_name || 'N/A'}</TableCell>
                    <TableCell>{app.card_programs?.program_name || 'N/A'}</TableCell>
                    <TableCell>{new Date(app.created_at).toLocaleString('fr-CA')}</TableCell>
                    <TableCell>{getStatusBadge(app)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/dashboard/applications/${app.id}`)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center h-24">{t('applications.noApplications')}</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Applications;