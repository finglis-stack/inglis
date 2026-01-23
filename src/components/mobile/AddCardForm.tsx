import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { useMobileWallet } from '@/context/MobileWalletContext';
import { showError, showSuccess } from '@/utils/toast';
import { getFunctionError } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type CardNumberParts = {
  initials: string;
  issuer_id: string;
  random_letters: string;
  unique_identifier: string;
  check_digit: string;
};

const normalize = (s: string) => s.replace(/\s+/g, '').toUpperCase();

export const AddCardForm = () => {
  const { t } = useTranslation('common');
  const { addCard } = useMobileWallet();
  const [loading, setLoading] = useState(false);

  const [initials, setInitials] = useState('');
  const [issuerId, setIssuerId] = useState('');
  const [randomLetters, setRandomLetters] = useState('');
  const [uniqueIdentifier, setUniqueIdentifier] = useState('');
  const [checkDigit, setCheckDigit] = useState('');
  const [expiry, setExpiry] = useState('');
  const [pin, setPin] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Basic field validation
    const parts: CardNumberParts = {
      initials: normalize(initials).slice(0, 2),
      issuer_id: normalize(issuerId),
      random_letters: normalize(randomLetters).slice(0, 2),
      unique_identifier: uniqueIdentifier.replace(/\D/g, ''),
      check_digit: checkDigit.replace(/\D/g, '').slice(0, 1),
    };

    if (
      parts.initials.length !== 2 ||
      parts.random_letters.length !== 2 ||
      !parts.issuer_id ||
      parts.unique_identifier.length < 4 ||
      parts.check_digit.length !== 1
    ) {
      showError(t('error'));
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('api-v1-tokenize-card', {
        body: {
          card_number: parts,
          expiry_date: expiry,
          pin: pin,
        },
      });

      if (error) {
        throw new Error(getFunctionError(error, t('error')));
      }

      const token: string = data?.token;
      const display = data?.display;

      if (!token) {
        throw new Error(t('error'));
      }

      addCard({
        token,
        maskedNumber: display?.masked_number || `${parts.initials} ${parts.issuer_id} ${parts.random_letters} ****${parts.unique_identifier.slice(-3)} ${parts.check_digit}`,
        expiryDisplay: display?.expiry_display || expiry,
        programName: display?.program_name || undefined,
        cardType: display?.card_type,
        cardImageUrl: display?.card_image_url || null,
      });

      showSuccess(t('save'));
      // Reset form
      setInitials('');
      setIssuerId('');
      setRandomLetters('');
      setUniqueIdentifier('');
      setCheckDigit('');
      setExpiry('');
      setPin('');

    } catch (err) {
      if (err instanceof Error) {
        showError(err.message);
      } else {
        showError(t('error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Initiales</Label>
          <Input value={initials} onChange={(e) => setInitials(e.target.value)} placeholder="LT" />
        </div>
        <div>
          <Label>BIN / Issuer</Label>
          <Input value={issuerId} onChange={(e) => setIssuerId(e.target.value)} placeholder="000000" />
        </div>
        <div>
          <Label>Lettres aléatoires</Label>
          <Input value={randomLetters} onChange={(e) => setRandomLetters(e.target.value)} placeholder="QZ" />
        </div>
        <div>
          <Label>Identifiant</Label>
          <Input value={uniqueIdentifier} onChange={(e) => setUniqueIdentifier(e.target.value)} placeholder="0000000" />
        </div>
        <div>
          <Label>Chiffre de contrôle</Label>
          <Input value={checkDigit} onChange={(e) => setCheckDigit(e.target.value)} placeholder="7" />
        </div>
        <div>
          <Label>Expiration (MM/AA)</Label>
          <Input value={expiry} onChange={(e) => setExpiry(e.target.value)} placeholder="06/28" />
        </div>
      </div>

      <div className="grid gap-2 max-w-xs">
        <Label>NIP</Label>
        <InputOTP maxLength={4} value={pin} onChange={setPin}>
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        {loading ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
};

export default AddCardForm;