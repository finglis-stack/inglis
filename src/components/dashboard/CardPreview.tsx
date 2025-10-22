import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface CardPreviewProps {
  programName: string;
  cardType: 'credit' | 'debit';
  cardColor: string;
  userName?: string;
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

export const CardPreview = ({ programName, cardType, cardColor, userName }: CardPreviewProps) => {
  const { t } = useTranslation();
  const isLight = cardColor.includes('fde0cf'); // Simple check for rose gold

  const displayName = (userName || 'LÉA TREMBLAY').toUpperCase();
  const initials = getInitials(userName || 'LÉA TREMBLAY');

  return (
    <div 
      className={cn(
        "rounded-xl p-6 font-mono shadow-lg flex flex-col justify-between h-56 w-full",
        isLight ? 'text-gray-800' : 'text-white'
      )}
      style={{ background: cardColor }}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm opacity-80">{programName}</p>
          <p className="text-lg font-semibold uppercase">{t(`dashboard.newCardProgram.${cardType}`)}</p>
        </div>
        <img src="/logo.png" alt="Logo" className={cn("h-8", !isLight && "brightness-0 invert")} />
      </div>
      
      <div>
        <div className="w-12 h-8 bg-yellow-400 rounded-md mb-2 border border-yellow-500" />
        <p className="text-2xl tracking-widest">{initials} 000000 QZ 0000000 7</p>
        <div className="flex justify-between text-sm mt-2">
          <span>{displayName}</span>
          <span>06/28</span>
        </div>
      </div>
    </div>
  );
};