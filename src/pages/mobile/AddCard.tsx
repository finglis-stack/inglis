import React, { useMemo, useState } from 'react';
import MobileLayout from '@/components/mobile/MobileLayout';
import MobileCard from '@/components/mobile/MobileCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { MobileWalletProvider, useMobileWallet } from '@/context/MobileWalletContext';
import { showError, showSuccess } from '@/utils/toast';
import { getFunctionError, validateLuhnAlphanumeric } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

type CardNumberParts = {
  initials: string;
  issuer_id: string;
  random_letters: string;
  unique_identifier: string;
  check_digit: string;
};

const normalize = (s: string) => s.replace(/\s+/g, '').toUpperCase();

// Formatter: LL 000000 LL 0000000 D
const formatPan = (raw: string) => {
  const s = normalize(raw);
  let out = '';
  let i = 0;

  while (i < s.length && out.replace(/\s/g, '').length < 2) {
    const ch = s[i++];
    if (/[A-Z]/.test(ch)) out += ch;
  }
  if (out.length === 2) out += ' ';

  let count = 0;
  while (i < s.length && count < 6) {
    const ch = s[i++];
    if (/\d/.test(ch)) { out += ch; count++; }
  }
  if (count === 6) out += ' ';

  count = 0;
  while (i < s.length && count < 2) {
    const ch = s[i++];
    if (/[A-Z]/.test(ch)) { out += ch; count++; }
  }
  if (count === 2) out += ' ';

  count = 0;
  while (i < s.length && count < 7) {
    const ch = s[i++];
    if (/\d/.test(ch)) { out += ch; count++; }
  }
  if (count === 7) out += ' ';

  while (i < s.length) {
    const ch = s[i++];
    if (/\d/.test(ch)) { out += ch; break; }
  }

  return out.trim();
};

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

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [panInput, setPanInput] = useState('');
  const [expiry, setExpiry] = useState('');

  const [pinOpen, setPinOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [tokenizing, setTokenizing] = useState(false);

  const formattedPan = useMemo(() => formatPan(panInput), [panInput]);
  const parts = useMemo(() => parsePartsFromPan(formattedPan), [formattedPan]);

  const handlePanContinue = () => {
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
    const payload = {
      card_number: parts,
      expiry_date: expiry,
      pin: pin,
    };

    try {
      const { data, error } = await supabase.functions.invoke('api-v1-tokenize-card', {
        body: payload,
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
    } finally {
      setTokenizing(false);
    }
  };

  return (
    <MobileLayout title="Ajouter une carte">
      <div className="space-y-6">
        <MobileCard
          programName="Inglis Dominion"
          maskedNumber={formattedPan || 'LT 000000 QZ 0000000 7'}
          expiryDisplay={expiry || 'MM/AA'}
          cardType="debit"
        />

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          {step === 1 && (
            <div className="space-y-4">
              <label className="text-sm text-white/70">Numéro de carte</label>
              <Input
                value={formattedPan}
                onChange={(e) => setPanInput(e.target.value)}
                placeholder="LT 000000 QZ 0000000 7"
                className="h-16 text-2xl px-4 rounded-xl bg-slate-900/60 border-slate-800 text-white placeholder:text-white/30 tracking-wider focus-visible:ring-slate-700"
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
              />
              <Button onClick={handlePanContinue} className="w-full h-12 rounded-xl bg-white/10 text-white hover:bg-white/20">
                Continuer
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <label className="text-sm text-white/70">Expiration (MM/AA)</label>
              <Input
                value={expiry}
                onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                placeholder="MM/AA"
                className="h-16 text-2xl px-4 rounded-xl bg-slate-900/60 border-slate-800 text-white placeholder:text-white/30 tracking-wider focus-visible:ring-slate-700"
                inputMode="numeric"
              />
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => setStep(1)} className="flex-1 h-12 rounded-xl bg-white/5 text-white hover:bg-white/10">
                  Retour
                </Button>
                <Button onClick={handleExpiryContinue} className="flex-1 h-12 rounded-xl bg-white/10 text-white hover:bg-white/20">
                  Continuer
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-sm text-white/80 space-y-2">
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
                <Button variant="ghost" onClick={() => setStep(2)} className="flex-1 h-12 rounded-xl bg-white/5 text-white hover:bg-white/10">
                  Retour
                </Button>
                <Button onClick={handleAcceptTerms} className="flex-1 h-12 rounded-xl bg-white/10 text-white hover:bg-white/20">
                  J&apos;accepte et continuer
                </Button>
              </div>
            </div>
          )}
        </div>

        <Dialog open={pinOpen} onOpenChange={setPinOpen}>
          <DialogContent className="sm:max-w-md bg-slate-900 border-white/10">
            <DialogHeader>
              <DialogTitle className="text-white/90 font-light">Entrer votre NIP</DialogTitle>
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
                <div className="flex items-center justify-center gap-2 text-sm text-white/70">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Tokenisation en cours...
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setPinOpen(false)} disabled={tokenizing} className="rounded-xl bg-white/5 text-white hover:bg-white/10">
                Annuler
              </Button>
              <Button onClick={submitWithPin} disabled={tokenizing || pin.length !== 4} className="rounded-xl bg-white/10 text-white hover:bg-white/20">
                {tokenizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {tokenizing ? 'Validation...' : 'Confirmer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MobileLayout>
  );
};

const AddCardPage = () => (
  <MobileWalletProvider>
    <AddCardInner />
  </MobileWalletProvider>
);

export default AddCardPage;