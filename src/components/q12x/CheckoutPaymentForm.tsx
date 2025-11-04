import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle } from 'lucide-react';
import { showError } from '@/utils/toast';
import { InputOTP, InputOTPGroup } from '@/components/ui/input-otp';
import { cn, validateLuhnAlphanumeric } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useTranslation } from 'react-i18next';
import { getDeviceFingerprint } from '@/utils/deviceFingerprint';
import { behavioralAnalyzer } from '@/utils/behavioralAnalysis';

interface CheckoutPaymentFormProps {
  onSubmit: (cardDetails: any, behavioralSignals: any) => void;
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
  const { t } = useTranslation('q12x');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [pin, setPin] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [cardNumberError, setCardNumberError] = useState<string | null>(null);
  const cardNumberInputRef = useRef<HTMLInputElement>(null);

  // Refs for behavioral signals
  const panEntryStart = useRef<number | null>(null);
  const panEntryDuration = useRef<number | null>(null);
  const expiryEntryStart = useRef<number | null>(null);
  const expiryEntryDuration = useRef<number | null>(null);
  const pinEntryStart = useRef<number | null>(null);
  const pinEntryDuration = useRef<number | null>(null);
  const pinTimestamps = useRef<number[]>([]);

  // Honeypot field (hidden from users, only bots will fill it)
  const [honeypot, setHoneypot] = useState('');

  useEffect(() => {
    if (cardNumber.length === 18) {
      if (validateLuhnAlphanumeric(cardNumber)) {
        setShowDetails(true);
        setCardNumberError(null);
      } else {
        setShowDetails(false);
        setCardNumberError(t('publicCheckout.form.invalidCard'));
      }
    } else {
      setShowDetails(false);
      setCardNumberError(null);
    }
  }, [cardNumber, t]);

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (cleaned.length === 1 && !panEntryStart.current) {
      panEntryStart.current = Date.now();
    }
    if (cleaned.length <= 18) {
      setCardNumber(cleaned);
      if (cleaned.length === 18 && panEntryStart.current) {
        panEntryDuration.current = Date.now() - panEntryStart.current;
      } else {
        panEntryDuration.current = null;
      }
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length === 1 && !expiryEntryStart.current) {
      expiryEntryStart.current = Date.now();
    }
    const formatted = formatExpiry(value);
    setExpiry(formatted);
    if (formatted.length === 5 && expiryEntryStart.current) {
      expiryEntryDuration.current = Date.now() - expiryEntryStart.current;
    } else {
      expiryEntryDuration.current = null;
    }
  };

  const handlePinChange = (value: string) => {
    if (value.length > pin.length) {
      pinTimestamps.current.push(Date.now());
    } else {
      pinTimestamps.current.pop();
    }

    if (value.length === 1 && !pinEntryStart.current) {
      pinEntryStart.current = Date.now();
    }
    
    if (value.length === 4 && pinEntryStart.current) {
      pinEntryDuration.current = Date.now() - pinEntryStart.current;
    } else {
      pinEntryDuration.current = null;
    }
    setPin(value);
  };

  const handleModifyCardNumber = () => {
    setShowDetails(false);
    setTimeout(() => cardNumberInputRef.current?.focus(), 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Honeypot check
    if (honeypot !== '') {
      showError('Suspicious activity detected.');
      return;
    }

    const parsedCard = parseCardNumber(cardNumber);
    if (!parsedCard || !validateLuhnAlphanumeric(cardNumber)) {
      showError(t('publicCheckout.form.invalidCard'));
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      showError(t('publicCheckout.form.invalidExpiry'));
      return;
    }
    if (pin.length !== 4) {
      showError(t('publicCheckout.form.invalidPin'));
      return;
    }

    let pinInterDigitAvgMs = null;
    if (pinTimestamps.current.length >= 2) {
      const diffs = [];
      for (let i = 1; i < pinTimestamps.current.length; i++) {
        diffs.push(pinTimestamps.current[i] - pinTimestamps.current[i-1]);
      }
      if (diffs.length > 0) {
        pinInterDigitAvgMs = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      }
    }

    // Get device fingerprint
    const deviceFingerprint = await getDeviceFingerprint();

    // Get behavioral signals
    const behavioralSignals = behavioralAnalyzer.getSignals();

    onSubmit(
      {
        card_number: parsedCard,
        expiry_date: expiry,
        pin: pin,
      },
      {
        pan_entry_duration_ms: panEntryDuration.current,
        expiry_entry_duration_ms: expiryEntryDuration.current,
        pin_entry_duration_ms: pinEntryDuration.current,
        pin_inter_digit_avg_ms: pinInterDigitAvgMs,
        device_fingerprint: deviceFingerprint,
        behavioral_signals: behavioralSignals,
      }
    );
  };

  const isFormComplete = showDetails && /^\d{2}\/\d{2}$/.test(expiry) && pin.length === 4 && !cardNumberError;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{t('publicCheckout.form.paymentDeclinedTitle')}</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Honeypot field - hidden from real users */}
      <input
        type="text"
        name="website"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
        tabIndex={-1}
        autoComplete="off"
      />

      <div className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="card-number">{t('publicCheckout.form.cardNumber')}</Label>
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
              <Label htmlFor="expiry">{t('publicCheckout.form.expiry')}</Label>
              <Input id="expiry" placeholder="MM/AA" value={expiry} onChange={handleExpiryChange} required={showDetails} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pin">{t('publicCheckout.form.pin')}</Label>
              <InputOTP
                id="pin"
                maxLength={4}
                value={pin}
                onChange={handlePinChange}
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
          {t('publicCheckout.form.pay', { amount: new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(amount) })}
        </Button>
        {showDetails && (
          <Button variant="link" className="w-full" type="button" onClick={handleModifyCardNumber}>
            {t('publicCheckout.form.modifyCard')}
          </Button>
        )}
      </div>
    </form>
  );
};