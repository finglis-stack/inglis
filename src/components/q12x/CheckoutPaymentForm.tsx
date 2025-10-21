import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { showError } from '@/utils/toast';

interface CheckoutPaymentFormProps {
  onSubmit: (cardObject: any) => void;
  processing: boolean;
  amount: number;
}

const formatCardNumber = (value: string): string => {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const parts = [];
  if (cleaned.length > 0) parts.push(cleaned.substring(0, 2));
  if (cleaned.length > 2) parts.push(cleaned.substring(2, 8));
  if (cleaned.length > 8) parts.push(cleaned.substring(8, 10));
  if (cleaned.length > 10) parts.push(cleaned.substring(10, 17));
  if (cleaned.length > 17) parts.push(cleaned.substring(17, 18));
  return parts.join(' ');
};

const parseCardNumber = (value: string): object | null => {
  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (cleaned.length !== 18) return null;
  return {
    initials: cleaned.substring(0, 2),
    issuer_id: cleaned.substring(2, 8),
    random_letters: cleaned.substring(8, 10),
    unique_identifier: cleaned.substring(10, 17),
    check_digit: cleaned.substring(17, 18),
  };
};

export const CheckoutPaymentForm = ({ onSubmit, processing, amount }: CheckoutPaymentFormProps) => {
  const [rawValue, setRawValue] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length <= 18) {
      setRawValue(cleaned);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseCardNumber(rawValue);
    if (parsed) {
      onSubmit(parsed);
    } else {
      showError("Le numéro de carte est invalide ou incomplet.");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-2">
        <Label htmlFor="card-number">Informations de la carte</Label>
        <Input 
          id="card-number" 
          placeholder="LL NNNNNN LL NNNNNNN C" 
          value={formatCardNumber(rawValue)} 
          onChange={handleChange}
          required
          className="font-mono tracking-wider"
        />
      </div>
      <Button type="submit" className="w-full bg-gray-800 hover:bg-gray-900 text-white" disabled={processing}>
        {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Payer {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(amount)}
      </Button>
    </form>
  );
};