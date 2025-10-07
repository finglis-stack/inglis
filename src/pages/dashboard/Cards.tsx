import { useTranslation } from 'react-i18next';

const Cards = () => {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-3xl font-bold">{t('dashboard.cards.title')}</h1>
      <p className="mt-4 text-muted-foreground">{t('dashboard.cards.subtitle')}</p>
    </div>
  );
};
export default Cards;