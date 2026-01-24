import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface CardPreviewProps {
  programName: string;
  cardType: 'credit' | 'debit';
  cardColor?: string;
  cardImageUrl?: string;
  userName?: string;
  showCardNumber?: boolean;
  cardNumber?: string;
  expiryDate?: string;
  overlayCardNumber?: boolean;
  blurCardNumber?: boolean;
  imageOnly?: boolean; // nouveau: image seule (pas d’overlay ni de textes)
}

const getInitials = (name?: string): string => {
  if (!name) return 'XX';
  const parts = name.replace(/-/g, ' ').split(' ').filter(Boolean);
  if (parts.length > 1) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (parts.length === 1 && parts[0].length >= 2) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return 'XX';
};

export const CardPreview = ({
  programName,
  cardType,
  cardColor = 'linear-gradient(to bottom right, #171717, #444444)',
  cardImageUrl,
  userName,
  showCardNumber = true,
  cardNumber,
  expiryDate,
  overlayCardNumber = false,
  blurCardNumber = false,
  imageOnly = false
}: CardPreviewProps) => {
  const { t } = useTranslation('dashboard');

  const displayName = (userName || 'LÉA TREMBLAY').toUpperCase();
  const initials = getInitials(userName || 'LÉA TREMBLAY');
  const displayCardNumber = cardNumber || `${initials} 000000 QZ 0000000 7`;
  const displayExpiry = expiryDate || "06/28";

  const useImage = !!cardImageUrl;

  if (useImage) {
    return (
      <img
        src={cardImageUrl}
        alt={programName || 'Card product'}
        className="block w-full h-auto"
      />
    );
  }

  return (
    <div
      className={cn(
        "relative rounded-2xl p-4 shadow-xl ring-1 ring-black/10 dark:ring-white/10 flex flex-col justify-between w-full aspect-[1.586] text-white overflow-hidden transition-transform duration-300 will-change-transform hover:scale-[1.01]"
      )}
      style={{ background: cardColor }}
    >
      <div className="relative z-10 flex justify-between items-start">
        <div>
          <p className="text-sm opacity-80">{programName}</p>
          <p className="text-lg font-semibold uppercase">{t(`newCardProgram.${cardType}`)}</p>
        </div>
        <img
          src="/logo.png"
          alt="Logo"
          className={cn("h-8", !cardColor.includes('fde0cf') ? "brightness-0 invert" : "")}
        />
      </div>

      <div className="relative z-10">
        {showCardNumber && (
          <>
            <div className="w-12 h-8 bg-yellow-400 rounded-md mb-2 border border-yellow-500" />
            <p className="text-2xl tracking-widest">{displayCardNumber}</p>
          </>
        )}
        <div className={cn("flex justify-between text-sm", showCardNumber && "mt-2")}>
          <span>{displayName}</span>
          <span>{displayExpiry}</span>
        </div>
      </div>
    </div>
  );
};

export default CardPreview;