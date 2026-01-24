import React from 'react';
import { cn } from '@/lib/utils';

type MobileCardProps = {
  programName?: string;
  maskedNumber: string;
  expiryDisplay?: string;
  cardType?: 'credit' | 'debit';
  className?: string;
};

const MobileCard = ({
  programName = 'Inglis Dominion',
  maskedNumber,
  expiryDisplay = 'MM/AA',
  cardType = 'debit',
  className,
}: MobileCardProps) => {
  return (
    <div
      className={cn(
        "relative rounded-2xl p-5 bg-gradient-to-br from-slate-800 to-slate-700 border border-white/10 shadow-lg",
        "text-white/90 w-full h-40 flex flex-col justify-between",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-white/70">
          {programName}
        </div>
        <div className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/70 capitalize">
          {cardType}
        </div>
      </div>

      <div className="text-lg tracking-wider font-light">
        {maskedNumber}
      </div>

      <div className="flex items-center justify-between text-xs text-white/70">
        <div>Exp: {expiryDisplay}</div>
        <div className="text-[11px]">Inglis • Wallet</div>
      </div>

      <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{
        background: "radial-gradient(120% 80% at 90% 10%, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0) 60%)"
      }} />
    </div>
  );
};

export default MobileCard;