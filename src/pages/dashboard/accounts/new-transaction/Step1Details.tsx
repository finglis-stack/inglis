import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewTransaction } from '@/context/NewTransactionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { showError } from '@/utils/toast';

const Step1Details = () => {
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
      showError("Veuillez entrer un montant valide.");
      return;
    }
    if (!description.trim()) {
      showError("Veuillez entrer une description (nom du marchand).");
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
        <Label htmlFor="amount">Montant de la transaction</Label>
        <Input id="amount" type="number" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Description (Marchand)</Label>
        <Input id="description" placeholder="Ex: Café Central" value={description} onChange={(e) => setDescription(e.target.value)} required />
      </div>
      
      <div className="grid gap-4 p-4 border rounded-md bg-gray-50">
        <Label>Délai de capture</Label>
        <RadioGroup value={captureOption} onValueChange={setCaptureOption} className="space-y-3">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="now" id="now" />
            <Label htmlFor="now" className="font-normal cursor-pointer">
              Capturer immédiatement
              <span className="block text-xs text-muted-foreground">Le montant sera débité tout de suite</span>
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="later" id="later" />
            <Label htmlFor="later" className="font-normal cursor-pointer">
              Capturer plus tard (Hold)
              <span className="block text-xs text-muted-foreground">Réserver le montant maintenant, capturer plus tard</span>
            </Label>
          </div>
        </RadioGroup>
        
        {captureOption === 'later' && (
          <div className="grid gap-3 pt-2 pl-6 border-l-2 border-primary">
            <Label htmlFor="captureHours">
              Capturer dans <strong>{captureHours[0]}</strong> heure{captureHours[0] > 1 ? 's' : ''}
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
              Maximum: 96 heures (4 jours). L'autorisation expirera automatiquement si elle n'est pas capturée.
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end mt-8">
        <Button type="submit">Suivant</Button>
      </div>
    </form>
  );
};

export default Step1Details;