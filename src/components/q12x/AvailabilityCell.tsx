import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle } from 'lucide-react';

interface AvailabilityCellProps {
  availableAt: string | null;
}

const AvailabilityCell = ({ availableAt }: AvailabilityCellProps) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    if (!availableAt) return;

    const interval = setInterval(() => {
      const now = new Date();
      const availableDate = new Date(availableAt);
      const diff = availableDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft('Disponible');
        clearInterval(interval);
      } else {
        const minutes = Math.floor((diff / 1000 / 60) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [availableAt]);

  if (!availableAt) {
    return null;
  }

  if (timeLeft === 'Disponible') {
    return (
      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
        <CheckCircle className="h-3 w-3 mr-1" />
        Disponible
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