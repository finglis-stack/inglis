import React, { useEffect } from 'react';
import { MobileWalletProvider, useMobileWallet } from '@/context/MobileWalletContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AddCardForm } from '@/components/mobile/AddCardForm';
import { useTranslation } from 'react-i18next';
import CardPreview from '@/components/dashboard/CardPreview';
import { Trash2, Nfc } from 'lucide-react';

const WalletContent = () => {
  const { t } = useTranslation('common');
  const { cards, removeCard } = useMobileWallet();

  // Auto-match OS theme (dark / light)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      if (mq.matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-md mx-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Inglis Dominion Wallet</CardTitle>
          </CardHeader>
          <CardContent>
            <AddCardForm />
          </CardContent>
        </Card>

        {cards.length > 0 && (
          <div className="space-y-4">
            {cards.map((c) => (
              <Card key={c.token}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {c.programName || 'Carte'} · {c.cardType === 'credit' ? 'Crédit' : 'Débit'}
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      <Nfc className="h-4 w-4 mr-2" />
                      NFC (bientôt)
                    </Button>
                  </div>
                  <CardPreview
                    programName={c.programName || 'Inglis Dominion'}
                    cardType={(c.cardType as 'credit' | 'debit') || 'debit'}
                    cardImageUrl={c.cardImageUrl || undefined}
                    imageOnly={!!c.cardImageUrl}
                    overlayCardNumber={!!c.cardImageUrl}
                    blurCardNumber
                    showCardNumber
                    cardNumber={c.maskedNumber}
                    expiryDate={c.expiryDisplay}
                  />
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      {c.maskedNumber} · {c.expiryDisplay}
                    </div>
                    <Button variant="destructive" size="sm" onClick={() => removeCard(c.token)}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      {t('cancel')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const MobileWallet = () => {
  return (
    <MobileWalletProvider>
      <WalletContent />
    </MobileWalletProvider>
  );
};

export default MobileWallet;