import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { showError, showSuccess } from '@/utils/toast';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const NewCheckout = () => {
  const { t } = useTranslation('q12x');
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    amount: '',
    is_amount_variable: false,
    success_url: '',
    cancel_url: '',
    currency: 'CAD',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleCheckboxChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, is_amount_variable: checked }));
  };

  const handleSelectChange = (value: string) => {
    setFormData(prev => ({ ...prev, currency: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utilisateur non authentifié.");

      const { data: merchant, error: merchantError } = await supabase
        .from('merchant_accounts')
        .select('id')
        .eq('user_id', user.id)
        .single();
      if (merchantError) throw merchantError;

      const { error: insertError } = await supabase.from('checkouts').insert({
        merchant_account_id: merchant.id,
        ...formData,
        amount: formData.is_amount_variable ? null : parseFloat(formData.amount),
      });

      if (insertError) throw insertError;

      showSuccess("Checkout créé avec succès !");
      navigate('/dashboard/checkouts');
    } catch (error) {
      showError(`Erreur : ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{t('newCheckout.title')}</CardTitle>
          <CardDescription>{t('newCheckout.desc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="name">{t('newCheckout.nameLabel')}</Label>
              <Input id="name" value={formData.name} onChange={handleChange} required />
              <p className="text-xs text-muted-foreground">{t('newCheckout.nameDesc')}</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">{t('newCheckout.descriptionLabel')}</Label>
              <Textarea id="description" value={formData.description} onChange={handleChange} />
              <p className="text-xs text-muted-foreground">{t('newCheckout.descriptionDesc')}</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2 col-span-2">
                <Label htmlFor="amount">{t('newCheckout.amountLabel')}</Label>
                <Input id="amount" type="number" value={formData.amount} onChange={handleChange} disabled={formData.is_amount_variable} required={!formData.is_amount_variable} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="currency">{t('newCheckout.currencyLabel')}</Label>
                <Select value={formData.currency} onValueChange={handleSelectChange}>
                  <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CAD">CAD</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="is_amount_variable" checked={formData.is_amount_variable} onCheckedChange={handleCheckboxChange} />
              <Label htmlFor="is_amount_variable" className="text-sm font-normal">{t('newCheckout.variableAmountLabel')}</Label>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="success_url">{t('newCheckout.successUrlLabel')}</Label>
              <Input id="success_url" type="url" placeholder="https://votresite.com/merci" value={formData.success_url} onChange={handleChange} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cancel_url">{t('newCheckout.cancelUrlLabel')}</Label>
              <Input id="cancel_url" type="url" placeholder="https://votresite.com/erreur" value={formData.cancel_url} onChange={handleChange} />
            </div>
            <div className="flex justify-end gap-4">
              <Button variant="ghost" asChild type="button"><Link to="/dashboard/checkouts">{t('newCheckout.cancelButton')}</Link></Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('newCheckout.createButton')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewCheckout;