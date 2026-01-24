import React, { useEffect } from 'react';
import { MobileWalletProvider, useMobileWallet } from '@/context/MobileWalletContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import CardPreview from '@/components/dashboard/CardPreview';
import { Trash2, Nfc, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const WalletContent = () => {
  const { t } = useTranslation('common');
  const { cards, removeCard } = useMobileWallet();
  const navigate = useNavigate();

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
    <div
      className="min-h-screen bg-background text-foreground"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="max-w-md mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold">Inglis Dominion Wallet</h1>
          <Button onClick={() => navigate('/mobile/add-card')} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Ajouter une carte
          </Button>
        </div>

        {cards.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-6 text-center space-y-3">
              <div className="text-sm text-muted-foreground">
                Aucune carte enregistrée pour le moment.
              </div>
              <Button onClick={() => navigate('/mobile/add-card')} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter votre première carte
              </Button>
            </CardContent>
          </Card>
        )}

        {cards.length > 0 && (
          <>
            <div className="overflow-x-auto no-scrollbar">
              <div className="flex gap-4">
                {cards.map((c) => (
                  <div key={c.token} className="min-w-[280px]">
                    <CardPreview
                      programName={c.programName || 'Inglis Dominion'}
                      cardType={(c.cardType as 'credit' | 'debit') || 'debit'}
                      cardImageUrl={c.cardImageUrl || undefined}
                      imageOnly={!!c.cardImageUrl}
                      overlayCardNumber={!!c.cardImageUrl}
                      blurCardNumber={false}
                      showCardNumber
                      cardNumber={c.maskedNumber}
                      expiryDate={c.expiryDisplay}
                    />
                  </div>
                ))}
              </div>
            </div>

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
          </>
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