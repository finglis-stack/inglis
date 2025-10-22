import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';
import { Loader2, PlusCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AddFundsDialog = ({ cardId, onFundsAdded }) => {
  const { t } = useTranslation(['dashboard', 'common']);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddFunds = async () => {
    const depositAmount = parseFloat(amount);
    if (isNaN(depositAmount) || depositAmount <= 0) {
      showError(t('accounts.invalidDepositAmount'));
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.rpc('process_transaction', {
        p_card_id: cardId,
        p_amount: depositAmount,
        p_type: 'payment', // 'payment' on a debit account is a deposit
        p_description: t('accounts.manualDeposit'),
      });

      if (error) throw error;

      showSuccess(t('accounts.depositSuccess'));
      onFundsAdded();
      setOpen(false);
      setAmount('');
    } catch (err) {
      showError(`${t('accounts.depositError')}: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          {t('accounts.addFunds')}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('accounts.addFundsTitle')}</DialogTitle>
          <DialogDescription>{t('accounts.addFundsDesc')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="amount" className="text-right">
              {t('amount', { ns: 'common' })}
            </Label>
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="col-span-3"
              placeholder="100.00"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>{t('cancel', { ns: 'common' })}</Button>
          <Button onClick={handleAddFunds} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t('accounts.confirmDeposit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddFundsDialog;