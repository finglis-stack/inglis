import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const Cards = () => {
  const { t } = useTranslation();
  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{t('dashboard.cards.title')}</h1>
        <Button asChild>
          <Link to="/dashboard/cards/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            {t('dashboard.cards.addCard')}
          </Link>
        </Button>
      </div>
      <p className="mt-4 text-muted-foreground">{t('dashboard.cards.subtitle')}</p>
    </div>
  );
};
export default Cards;