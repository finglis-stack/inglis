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
import { supabase } from '@/integrations/supabase/client';
import { Search, Loader2, CheckCircle } from 'lucide-react';

const Step1Details = () => {
  const { t } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const { transactionData, updateTransaction } = useNewTransaction();
  
  const [amount, setAmount] = useState(transactionData.amount || '');
  const [captureOption, setCaptureOption] = useState(transactionData.captureOption || 'now');
  const [captureHours, setCaptureHours] = useState(transactionData.captureHours || [1]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState(transactionData.selectedMerchant || null);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    const { data, error } = await supabase
      .from('merchant_accounts')
      .select('id, name')
      .ilike('name', `%${searchQuery}%`)
      .limit(10);
    
    if (error) {
      showError(error.message);
    } else {
      setSearchResults(data);
    }
    setSearchLoading(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showError(t('newTransaction.invalidAmount'));
      return;
    }
    if (!selectedMerchant) {
      showError(t('newTransaction.invalidDescription'));
      return;
    }
    
    const finalCaptureHours = captureOption === 'now' ? 0 : captureHours[0];
    
    updateTransaction({ 
      amount: parsedAmount, 
      description: selectedMerchant.name,
      merchantId: selectedMerchant.id,
      selectedMerchant,
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
        <Label htmlFor="merchant-search">{t('newTransaction.merchantName')}</Label>
        {selectedMerchant ? (
          <div className="flex items-center justify-between p-3 border rounded-md bg-muted">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="font-medium">{selectedMerchant.name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedMerchant(null)}>Changer</Button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <Input id="merchant-search" placeholder={t('users.searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              <Button type="button" onClick={handleSearch} disabled={searchLoading}>
                {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            {searchResults.length > 0 && (
              <ul className="border rounded-md max-h-40 overflow-y-auto">
                {searchResults.map((merchant: any) => (
                  <li 
                    key={merchant.id} 
                    onClick={() => {
                      setSelectedMerchant(merchant);
                      setSearchResults([]);
                      setSearchQuery('');
                    }}
                    className="p-2 hover:bg-muted cursor-pointer"
                  >
                    {merchant.name}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
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
              {t('newTransaction.later')} ({t('newTransaction.hold')})
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
        <Button type="submit">{t('next', { ns: 'common' })}</Button>
      </div>
    </form>
  );
};

export default Step1Details;