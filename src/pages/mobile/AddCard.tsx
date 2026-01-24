import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Loader2, CreditCard } from 'lucide-react';
import { MobileWalletProvider, useMobileWallet } from '@/context/MobileWalletContext';
import { showError, showSuccess } from '@/utils/toast';
import { getFunctionError, validateLuhnAlphanumeric } from '@/lib/utils';
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

// Formatter PAN: LL 000000 LL 0000000 D
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

const formatExpiry = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

const AddCardInner = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const { addCard } = useMobileWallet();

  // Étapes: 1 = PAN, 2 = Expiration, 3 = Conditions
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const [panInput, setPanInput] = useState('');
  const [expiry, setExpiry] = useState('');

  // Dialog PIN
  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [tokenizing, setTokenizing] = useState(false);

  const formattedPan = useMemo(() => formatPan(panInput), [panInput]);
  const parts = useMemo(() => parsePartsFromPan(formattedPan), [formattedPan]);

  const handlePanContinue = () => {
    // Validation silencieuse (sans messages dans le champ)
    if (!parts || !validateLuhnAlphanumeric(normalize(formattedPan))) {
      showError('Veuillez vérifier votre numéro de carte.');
      return;
    }
    setStep(2);
  };

  const handleExpiryContinue = () => {
    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      showError('Veuillez entrer une expiration au format MM/AA.');
      return;
    }
    setStep(3);
  };

  const handleAcceptTerms = () => {
    setPinOpen(true);
  };

  const submitWithPin = async () => {
    if (pin.length !== 4) {
      showError('NIP invalide (4 chiffres)');
      return;
    }
    if (!parts) {
      showError('Numéro de carte manquant.');
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
        cardImageUrl: display?.card_image_url || null,
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
          <CardContent className="pt-4">
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Input
                    value={formattedPan}
                    onChange={(e) => setPanInput(e.target.value)}
                    placeholder="Numéro de carte (ex: LT 000000 QZ 0000000 7)"
                    className="h-14 text-xl tracking-wider px-4"
                    inputMode="text"
                    autoCapitalize="characters"
                    autoComplete="off"
                  />
                </div>
                <Button onClick={handlePanContinue} className="w-full h-12 text-base">
                  Continuer
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Input
                    value={expiry}
                    onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                    placeholder="Expiration (MM/AA)"
                    className="h-14 text-xl px-4"
                    inputMode="numeric"
                  />
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-12 text-base">
                    Retour
                  </Button>
                  <Button onClick={handleExpiryContinue} className="flex-1 h-12 text-base">
                    Continuer
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>
                    En ajoutant cette carte à votre portefeuille Inglis, vous acceptez que les informations fournies
                    soient vérifiées et tokenisées de manière sécurisée. La carte peut être utilisée pour les paiements
                    au sein des services Inglis. Assurez-vous que le numéro et la date d&apos;expiration sont exacts.
                  </p>
                  <p>
                    Vous consentez également aux conditions de sécurité associées au NIP, et à la conservation locale
                    d&apos;un jeton représentant votre carte pour une utilisation rapide dans l&apos;application.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-12 text-base">
                    Retour
                  </Button>
                  <Button onClick={handleAcceptTerms} className="flex-1 h-12 text-base">
                    J&apos;accepte et continuer
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog PIN */}
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