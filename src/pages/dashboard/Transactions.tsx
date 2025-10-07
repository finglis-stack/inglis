import { useTranslation } from 'react-i18next';

const Transactions = () => {
  const { t } = useTranslation();
  return (
    <div>
      <h1 className="text-3xl font-bold">{t('dashboard.transactions.title')}</h1>
      <p className="mt-4 text-muted-foreground">{t('dashboard.transactions.subtitle')}</p>
    </div>
  );
};
export default Transactions;