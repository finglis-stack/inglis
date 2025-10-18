import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNewTransaction } from '@/context/NewTransactionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { showError } from '@/utils/toast';

const Step1Details = () => {
  const navigate = useNavigate();
  const { transactionData, updateTransaction } = useNewTransaction();
  
  const [amount, setAmount] = useState(transactionData.amount || '');
  const [description, setDescription] = useState(transactionData.description || '');

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
    updateTransaction({ amount: parsedAmount, description });
    navigate(`../step-2`);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="amount">Montant de la transaction</Label>
        <Input id="amount" type="number" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Description (Marchand)</Label>
        <Input id="description" placeholder="Ex: Café Central" value={description} onChange={(e) => setDescription(e.target.value)} required />
      </div>
      <div className="flex justify-end mt-8">
        <Button type="submit">Suivant</Button>
      </div>
    </form>
  );
};

export default Step1Details;