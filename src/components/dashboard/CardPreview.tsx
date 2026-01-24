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

  return null;
};

export default CardPreview;