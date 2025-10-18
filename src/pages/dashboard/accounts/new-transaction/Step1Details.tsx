import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewTransaction } from '@/context/NewTransactionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { showError } from '@/utils/toast';
import { useTranslation } from 'react-i18next';

const Step1Details = () => {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { transactionData, updateTransaction } = useNewTransaction();
  
  const [amount, setAmount] = useState(transactionData.amount || '');
  const [description, setDescription] = useState(transactionData.description || '');
  const [captureOption, setCaptureOption] = useState(transactionData.captureOption || 'now');
  const [captureHours, setCaptureHours] = useState(transactionData.captureHours || [1]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showError(t('newTransaction.invalidAmount'));
      return;
    }
    if (!description.trim()) {
      showError(t('newTransaction.invalidDescription'));
      return;
    }
    
    const finalCaptureHours = captureOption === 'now' ? 0 : captureHours[0];
    
    updateTransaction({ 
      amount: parsedAmount, 
      description,
      captureOption,
      captureHours: finalCaptureHours
    });
    navigate(`step-2`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="amount">{t('newTransaction.transactionAmount')}</Label>
        <Input id="amount" type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">{t('accounts.description')} ({t('newTransaction.merchantName')})</Label>
        <Input id="description" placeholder={t('newTransaction.merchantPlaceholder')} value={description} onChange={(e) => setDescription(e.target.value)} required />
      </div>
      
      <div className="grid gap-4 p-4 border rounded-md bg-gray-50">
        <Label>{t('newTransaction.captureDelay')}</Label>
        <RadioGroup value={captureOption} onValueChange={setCaptureOption} className="space-y-3">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="now" id="now" />
            <Label htmlFor="now" className="font-normal cursor-pointer">
              {t('newTransaction.immediately')}
              <span className="block text-xs text-muted-foreground">{t('accounts.captureImmediatelyDesc')}</span>
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="later" id="later" />
            <Label htmlFor="later" className="font-normal cursor-pointer">
              {t('newTransaction.later')} (Hold)
              <span className="block text-xs text-muted-foreground">{t('accounts.captureLaterDesc')}</span>
            </Label>
          </div>
        </RadioGroup>
        
        {captureOption === 'later' && (
          <div className="grid gap-3 pt-2 pl-6 border-l-2 border-primary">
            <Label htmlFor="captureHours">
              {t('newTransaction.captureIn', { hours: captureHours[0] })}
            </Label>
            <Slider 
              id="captureHours" 
              min={1} 
              max={96} 
              step={1} 
              value={captureHours} 
              onValueChange={setCaptureHours}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              {t('newTransaction.captureDelayDesc')}
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end mt-8">
        <Button type="submit">{t('sharedSteps.next')}</Button>
      </div>
    </form>
  );
};

export default Step1Details;