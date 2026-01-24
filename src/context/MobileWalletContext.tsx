import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type MobileWalletCard = {
  token: string;
  maskedNumber: string;
  expiryDisplay: string;
  programName?: string;
  cardType?: 'credit' | 'debit';
  cardImageUrl?: string | null;
};

type MobileWalletContextType = {
  cards: MobileWalletCard[];
  addCard: (card: MobileWalletCard) => void;
  removeCard: (token: string) => void;
  clear: () => void;
};

const MobileWalletContext = createContext<MobileWalletContextType | undefined>(undefined);

const STORAGE_KEY = 'mobile_wallet_cards';

export const MobileWalletProvider = ({ children }: { children: React.ReactNode }) => {
  const [cards, setCards] = useState<MobileWalletCard[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCards(parsed);
        }
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
  }, [cards]);

  const addCard = (card: MobileWalletCard) => {
    setCards((prev) => {
      // Avoid duplicates by token
      if (prev.some((c) => c.token === card.token)) return prev;
      const next = [card, ...prev];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const removeCard = (token: string) => {
    setCards((prev) => {
      const next = prev.filter((c) => c.token !== token);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const clear = () => {
    setCards([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  const value = useMemo(() => ({ cards, addCard, removeCard, clear }), [cards]);

  return (
    <MobileWalletContext.Provider value={value}>
      {children}
    </MobileWalletContext.Provider>
  );
};

export const useMobileWallet = () => {
  const ctx = useContext(MobileWalletContext);
  if (!ctx) throw new Error('useMobileWallet must be used within MobileWalletProvider');
  return ctx;
};