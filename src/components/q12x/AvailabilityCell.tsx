import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AvailabilityCellProps {
  availableAt: string | null;
}

const AvailabilityCell = ({ availableAt }: AvailabilityCellProps) => {
  const { t } = useTranslation('q12x');
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!availableAt) return;

    const interval = setInterval(() => {
      const now = new Date();
      const availableDate = new Date(availableAt);
      const diff = availableDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft(t('availability.available'));
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        
        let timeString = '';
        if (hours > 0) {
            timeString += `${hours.toString().padStart(2, '0')}:`;
        }
        timeString += `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        setTimeLeft(timeString);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [availableAt, t]);

  if (!availableAt) {
    return null;
  }

  if (timeLeft === t('availability.available')) {
    return (
      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
        <CheckCircle className="h-3 w-3 mr-1" />
        {t('availability.available')}
      </Badge>
    );
  }

  return (
    <Badge variant="secondary">
      <Clock className="h-3 w-3 mr-1" />
      {timeLeft}
    </Badge>
  );
};

export default AvailabilityCell;