import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle } from 'lucide-react';
import { showError } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';

const Merchants = () => {
  const { t } = useTranslation('dashboard');
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMerchants = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('merchant_accounts').select('*').order('created_at', { ascending: false });
      if (error) {
        showError(error.message);
      } else {
        setMerchants(data);
      }
      setLoading(false);
    };
    fetchMerchants();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('merchants.title')}</h1>
          <p className="text-muted-foreground">{t('merchants.subtitle')}</p>
        </div>
        <Button asChild>
          <Link to="/dashboard/settings/merchants/new/step-1">
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('merchants.addMerchant')}
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('merchants.listTitle')}</CardTitle>
          <CardDescription>{t('merchants.listDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('merchants.colName')}</TableHead>
                <TableHead>{t('merchants.colAccountNumber')}</TableHead>
                <TableHead>{t('merchants.colStatus')}</TableHead>
                <TableHead>{t('merchants.colCreatedAt')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={4} className="text-center">{t('users.loading')}</TableCell></TableRow>
              ) : merchants.length > 0 ? (
                merchants.map(merchant => (
                  <TableRow key={merchant.id}>
                    <TableCell className="font-medium">{merchant.name}</TableCell>
                    <TableCell className="font-mono text-xs">{merchant.account_number}</TableCell>
                    <TableCell><Badge variant={merchant.status === 'active' ? 'default' : 'secondary'}>{merchant.status}</Badge></TableCell>
                    <TableCell>{new Date(merchant.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow><TableCell colSpan={4} className="text-center h-24">{t('merchants.noMerchants')}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Merchants;