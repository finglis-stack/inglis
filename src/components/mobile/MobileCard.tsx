import React from 'react';
import { cn } from '@/lib/utils';

type MobileCardProps = {
  programName?: string;
  maskedNumber: string;
  expiryDisplay?: string;
  cardType?: 'credit' | 'debit';
  cardImageUrl?: string | null;
  className?: string;
};

const MobileCard = ({
  programName = 'Inglis Dominion',
  maskedNumber,
  expiryDisplay = 'MM/AA',
  cardType = 'debit',
  cardImageUrl,
  className,
}: MobileCardProps) => {
  const hasImage = !!cardImageUrl;

  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden w-full h-40 text-white",
        className
      )}
    >
      {hasImage ? (
        <img
          src={cardImageUrl as string}
          alt={programName}
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-700" />
      )}

      <div className="relative z-10 p-4 h-full flex flex-col justify-between text-white/90">
        <div className="flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-widest text-white/90">
            {programName}
          </div>
          <div className="text-[10px] px-2 py-0.5 rounded-full bg-white/15 text-white/90 capitalize">
            {cardType}
          </div>
        </div>

        <div className="text-lg tracking-wider font-light">
          {maskedNumber}
        </div>

        <div className="flex items-center justify-between text-xs text-white/90">
          <div>Exp: {expiryDisplay}</div>
          <div className="text-[11px]">Inglis • Wallet</div>
        </div>
      </div>
    </div>
  );
};

export default MobileCard;