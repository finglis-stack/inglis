import React from 'react';
import MobileLayout from '@/components/mobile/MobileLayout';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { MobileWalletProvider, useMobileWallet } from '@/context/MobileWalletContext';
import MobileCard from '@/components/mobile/MobileCard';

const WalletContent = () => {
  const { t } = useTranslation('common');
  const { cards, removeCard } = useMobileWallet();
  const navigate = useNavigate();

  return (
    <MobileLayout
      title="Portefeuille"
      headerRight={
        <Button
          onClick={() => navigate('/mobile/add-card')}
          size="sm"
          className="rounded-xl bg-white/10 text-white hover:bg-white/20 px-4 h-9"
        >
          Ajouter
        </Button>
      }
    >
      <div className="space-y-6">
        {cards.length === 0 && (
          <div className="rounded-2xl border border-white/10 p-6 text-center bg-white/5 text-white/80">
            <div className="text-sm">Aucune carte enregistrée pour le moment.</div>
            <Button
              onClick={() => navigate('/mobile/add-card')}
              className="mt-4 w-full rounded-xl bg-white/10 text-white hover:bg-white/20 h-10"
            >
              Ajouter votre première carte
            </Button>
          </div>
        )}

        {cards.length > 0 && (
          <>
            <div className="overflow-x-auto no-scrollbar">
              <div className="flex gap-4">
                {cards.map((c) => (
                  <div key={c.token} className="min-w-[280px]">
                    <MobileCard
                      programName={c.programName || 'Inglis Dominion'}
                      cardType={(c.cardType as 'credit' | 'debit') || 'debit'}
                      maskedNumber={c.maskedNumber}
                      expiryDisplay={c.expiryDisplay}
                      cardImageUrl={c.cardImageUrl || undefined}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {cards.map((c) => (
                <div key={c.token} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between text-sm text-white/70">
                    <div>
                      {c.programName || 'Carte'} · {c.cardType === 'credit' ? 'Crédit' : 'Débit'}
                    </div>
                    <button
                      className="text-red-300 hover:text-red-200 underline-offset-2 hover:underline"
                      onClick={() => removeCard(c.token)}
                    >
                      {t('cancel', 'Supprimer')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </MobileLayout>
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