import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle } from 'lucide-react';
import { showError } from '@/utils/toast';
import { InputOTP, InputOTPGroup } from '@/components/ui/input-otp';
import { cn, validateLuhnAlphanumeric } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface CheckoutPaymentFormProps {
  onSubmit: (cardDetails: any) => void;
  processing: boolean;
  amount: number;
  error: string | null;
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

const formatExpiry = (value: string): string => {
  const cleaned = value.replace(/[^0-9]/g, '');
  if (cleaned.length > 2) {
    return `${cleaned.substring(0, 2)}/${cleaned.substring(2, 4)}`;
  }
  return cleaned;
};

export const CheckoutPaymentForm = ({ onSubmit, processing, amount, error }: CheckoutPaymentFormProps) => {
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [pin, setPin] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [cardNumberError, setCardNumberError] = useState<string | null>(null);
  const cardNumberInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cardNumber.length === 18) {
      if (validateLuhnAlphanumeric(cardNumber)) {
        setShowDetails(true);
        setCardNumberError(null);
      } else {
        setShowDetails(false);
        setCardNumberError("Le numéro de carte est invalide.");
      }
    } else {
      setShowDetails(false);
      setCardNumberError(null);
    }
  }, [cardNumber]);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length <= 18) {
      setCardNumber(cleaned);
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatExpiry(e.target.value);
    setExpiry(formatted);
  };

  const handleModifyCardNumber = () => {
    setShowDetails(false);
    setTimeout(() => cardNumberInputRef.current?.focus(), 100);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedCard = parseCardNumber(cardNumber);
    if (!parsedCard || !validateLuhnAlphanumeric(cardNumber)) {
      showError("Le numéro de carte est invalide.");
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      showError("La date d'expiration doit être au format MM/AA.");
      return;
    }
    if (pin.length !== 4) {
      showError("Le NIP doit contenir 4 chiffres.");
      return;
    }
    onSubmit({
      card_number: parsedCard,
      expiry_date: expiry,
      pin: pin,
    });
  };

  const isFormComplete = showDetails && /^\d{2}\/\d{2}$/.test(expiry) && pin.length === 4 && !cardNumberError;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Paiement refusé</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}
      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="card-number">Numéro de carte</Label>
          <Input 
            ref={cardNumberInputRef}
            id="card-number" 
            placeholder="LL NNNNNN LL NNNNNNN C" 
            value={formatCardNumber(cardNumber)} 
            onChange={handleCardNumberChange}
            required
            className={cn("font-mono tracking-wider", cardNumberError && "border-red-500")}
          />
          {cardNumberError && <p className="text-sm text-red-500">{cardNumberError}</p>}
        </div>

        <div className={cn(
          "space-y-4 overflow-hidden transition-all duration-500 ease-in-out",
          showDetails ? "max-h-96 opacity-100 pt-4" : "max-h-0 opacity-0"
        )}>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="expiry">Expiration (MM/AA)</Label>
              <Input id="expiry" placeholder="MM/AA" value={expiry} onChange={handleExpiryChange} required={showDetails} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pin">NIP</Label>
              <InputOTP
                id="pin"
                maxLength={4}
                value={pin}
                onChange={setPin}
                render={({ slots }) => (
                  <InputOTPGroup>
                    {slots.map((slot, index) => (
                      <div
                        key={index}
                        className={cn(
                          "relative flex h-10 w-10 items-center justify-center border-y border-r border-input text-sm transition-all first:rounded-l-md first:border-l last:rounded-r-md",
                          slot.isActive && "z-10 ring-2 ring-ring ring-offset-background"
                        )}
                      >
                        {slot.char ? "•" : null}
                        {slot.isActive && <div className="pointer-events-none absolute inset-0 flex items-center justify-center"><div className="h-4 w-px animate-caret-blink bg-foreground duration-1000" /></div>}
                      </div>
                    ))}
                  </InputOTPGroup>
                )}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Button type="submit" className="w-full bg-gray-800 hover:bg-gray-900 text-white" disabled={processing || !isFormComplete}>
          {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Payer {new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(amount)}
        </Button>
        {showDetails && (
          <Button variant="link" className="w-full" type="button" onClick={handleModifyCardNumber}>
            Modifier le numéro de carte
          </Button>
        )}
      </div>
    </form>
  );
};