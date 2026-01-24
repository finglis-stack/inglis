import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Loader2, CreditCard } from 'lucide-react';
import { MobileWalletProvider, useMobileWallet } from '@/context/MobileWalletContext';
import { showError, showSuccess } from '@/utils/toast';
import { getFunctionError } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import CardPreview from '@/components/dashboard/CardPreview';

type CardNumberParts = {
  initials: string;
  issuer_id: string;
  random_letters: string;
  unique_identifier: string;
  check_digit: string;
};

const normalize = (s: string) => s.replace(/\s+/g, '').toUpperCase();

// Formatter dynamique du PAN: LL 000000 LL 0000000 D
const formatPan = (raw: string) => {
  const s = normalize(raw);
  let out = '';
  let i = 0;

  // 2 lettres
  while (i < s.length && out.replace(/\s/g, '').length < 2) {
    const ch = s[i++];
    if (/[A-Z]/.test(ch)) out += ch;
  }
  if (out.length === 2) out += ' ';

  // 6 chiffres
  let count = 0;
  while (i < s.length && count < 6) {
    const ch = s[i++];
    if (/\d/.test(ch)) {
      out += ch;
      count++;
    }
  }
  if (count === 6) out += ' ';

  // 2 lettres
  count = 0;
  while (i < s.length && count < 2) {
    const ch = s[i++];
    if (/[A-Z]/.test(ch)) {
      out += ch;
      count++;
    }
  }
  if (count === 2) out += ' ';

  // 7 chiffres
  count = 0;
  while (i < s.length && count < 7) {
    const ch = s[i++];
    if (/\d/.test(ch)) {
      out += ch;
      count++;
    }
  }
  if (count === 7) out += ' ';

  // 1 chiffre (check digit)
  while (i < s.length) {
    const ch = s[i++];
    if (/\d/.test(ch)) {
      out += ch;
      break;
    }
  }

  return out.trim();
};

// Parse le PAN en parties structurées
const parsePartsFromPan = (panFormatted: string): CardNumberParts | null => {
  const s = normalize(panFormatted);
  const m = s.match(/^([A-Z]{2})(\d{6})([A-Z]{2})(\d{7})(\d)$/);
  if (!m) return null;
  return {
    initials: m[1],
    issuer_id: m[2],
    random_letters: m[3],
    unique_identifier: m[4],
    check_digit: m[5],
  };
};

// Luhn alphanumérique (base-36 approximé)
const luhnAlphaValid = (panFormatted: string): boolean => {
  const parts = parsePartsFromPan(panFormatted);
  if (!parts) return false;
  const withoutCheck = `${parts.initials}${parts.issuer_id}${parts.random_letters}${parts.unique_identifier}`;
  const checkDigit = parseInt(parts.check_digit, 10);
  const digits: number[] = [];

  for (const ch of withoutCheck) {
    if (/\d/.test(ch)) {
      digits.push(parseInt(ch, 10));
    } else if (/[A-Z]/.test(ch)) {
      const val = ch.charCodeAt(0) - 55; // A=10 ... Z=35
      const valStr = String(val);
      for (const d of valStr) digits.push(parseInt(d, 10));
    } else {
      return false;
    }
  }

  // Luhn classique
  let sum = 0;
  let double = true;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = digits[i];
    if (double) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
    double = !double;
  }

  const computedCheck = (10 - (sum % 10)) % 10;
  return computedCheck === checkDigit;
};

const AddCardInner = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { addCard } = useMobileWallet();

  const [panInput, setPanInput] = useState('');
  const [expiry, setExpiry] = useState('');
  const [pulse, setPulse] = useState(false);

  // Dialog PIN
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [tokenizing, setTokenizing] = useState(false);

  const formattedPan = useMemo(() => formatPan(panInput), [panInput]);
  const isValidPan = useMemo(() => luhnAlphaValid(formattedPan), [formattedPan]);
  const parts = useMemo(() => parsePartsFromPan(formattedPan), [formattedPan]);

  const handlePanChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPanInput(e.target.value);
    setPulse(true);
    setTimeout(() => setPulse(false), 140);
  };

  const openPinDialog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parts || !isValidPan) {
      showError('PAN invalide');
      return;
    }
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      showError('Expiration invalide (MM/AA)');
      return;
    }
    setPinOpen(true);
  };

  const submitWithPin = async () => {
    if (pin.length !== 4) {
      showError('NIP invalide (4 chiffres)');
      return;
    }
    setTokenizing(true);
    try {
      const { data, error } = await supabase.functions.invoke('api-v1-tokenize-card', {
        body: {
          card_number: parts,
          expiry_date: expiry,
          pin: pin,
        },
      });
      if (error) throw new Error(getFunctionError(error, t('error')));

      const token: string = data?.token;
      const display = data?.display;
      if (!token) throw new Error(t('error'));

      addCard({
        token,
        maskedNumber:
          display?.masked_number ||
          `${parts.initials} ${parts.issuer_id} ${parts.random_letters} ****${parts.unique_identifier.slice(-3)} ${parts.check_digit}`,
        expiryDisplay: display?.expiry_display || expiry,
        programName: display?.program_name || undefined,
        cardType: display?.card_type,
        cardImageUrl: display?.card_image_url || null, // image produit réelle
      });

      showSuccess('Carte ajoutée');
      setPinOpen(false);
      navigate('/mobile/wallet', { replace: true });
    } catch (err) {
      if (err instanceof Error) showError(err.message);
      else showError(t('error'));
    } finally {
      setTokenizing(false);
    }
  };

  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-md mx-auto w-full px-4 py-4 space-y-6">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Ajouter une carte</h1>
        </div>

        <Card className="border-0 shadow-none bg-transparent">
          <CardContent className="p-0">
            <CardPreview
              programName="Inglis Dominion"
              cardType="debit"
              imageOnly={false}
              overlayCardNumber={false}
              blurCardNumber={false}
              showCardNumber
              cardNumber={formattedPan || 'LT 000000 QZ 0000000 7'}
              expiryDate={expiry || 'MM/AA'}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Informations carte</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={openPinDialog} className="space-y-4">
              <div className="grid gap-2">
                <Label>PAN (LL 000000 LL 0000000 D)</Label>
                <Input
                  value={formattedPan}
                  onChange={handlePanChange}
                  placeholder="LT 000000 QZ 0000000 7"
                  className={`text-lg tracking-wider ${pulse ? 'animate-pulse' : ''} transition-transform duration-150 focus:scale-[1.01]`}
                  inputMode="text"
                  autoCapitalize="characters"
                  autoComplete="off"
                />
                <div className={`text-sm ${isValidPan ? 'text-green-600' : 'text-red-600'}`}>
                  {isValidPan ? 'PAN valide (Luhn alphanumérique)' : 'PAN invalide'}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Expiration (MM/AA)</Label>
                  <Input
                    value={expiry}
                    onChange={(e) => setExpiry(e.target.value)}
                    placeholder="06/28"
                    inputMode="numeric"
                  />
                </div>
              </div>

              <Button type="submit" disabled={!isValidPan} className="w-full">
                Continuer
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Dialog PIN en dernier avec effet de chargement */}
        <Dialog open={pinOpen} onOpenChange={setPinOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Entrer votre NIP</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-2 max-w-xs mx-auto">
                <InputOTP maxLength={4} value={pin} onChange={setPin}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              {tokenizing && (
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Tokenisation en cours...
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPinOpen(false)} disabled={tokenizing}>
                Annuler
              </Button>
              <Button onClick={submitWithPin} disabled={tokenizing || pin.length !== 4}>
                {tokenizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {tokenizing ? 'Validation...' : 'Confirmer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

const AddCardPage = () => (
  <MobileWalletProvider>
    <AddCardInner />
  </MobileWalletProvider>
);

export default AddCardPage;