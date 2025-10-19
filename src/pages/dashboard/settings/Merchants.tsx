import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Loader2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';

const Merchants = () => {
  const { t } = useTranslation('dashboard');
  const [merchants, setMerchants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newMerchant, setNewMerchant] = useState({ name: '', account_number: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    fetchMerchants();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setNewMerchant(prev => ({ ...prev, [id]: value }));
  };

  const handleAddMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non authentifié.");

      const { data: institution, error: institutionError } = await supabase
        .from('institutions')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (institutionError) throw institutionError;

      const { error: insertError } = await supabase.from('merchant_accounts').insert({
        institution_id: institution.id,
        name: newMerchant.name,
        account_number: newMerchant.account_number,
      });

      if (insertError) throw insertError;

      showSuccess(t('merchants.new.success'));
      setIsDialogOpen(false);
      setNewMerchant({ name: '', account_number: '' });
      fetchMerchants();
    } catch (err) {
      showError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('merchants.title')}</h1>
          <p className="text-muted-foreground">{t('merchants.subtitle')}</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button><PlusCircle className="mr-2 h-4 w-4" />{t('merchants.addMerchant')}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('merchants.new.title')}</DialogTitle>
              <DialogDescription>{t('merchants.new.desc')}</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddMerchant} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">{t('merchants.new.nameLabel')}</Label>
                <Input id="name" value={newMerchant.name} onChange={handleInputChange} required />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="account_number">{t('merchants.new.accountNumberLabel')}</Label>
                <Input id="account_number" value={newMerchant.account_number} onChange={handleInputChange} required />
              </div>
              <DialogFooter>
                <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Annuler</Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isSubmitting ? t('merchants.new.creating') : t('merchants.addMerchant')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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