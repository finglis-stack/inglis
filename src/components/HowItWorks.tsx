import { useTranslation } from "react-i18next";

export const HowItWorks = () => {
  const { t } = useTranslation();

  return (
    <section id="how-it-works" className="py-20">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold">{t('howItWorks.title')}</h2>
          <p className="text-muted-foreground mt-2">{t('howItWorks.subtitle')}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4">1</div>
            <h3 className="text-xl font-semibold">{t('howItWorks.step1_title')}</h3>
            <p className="text-muted-foreground mt-2">{t('howItWorks.step1_desc')}</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4">2</div>
            <h3 className="text-xl font-semibold">{t('howItWorks.step2_title')}</h3>
            <p className="text-muted-foreground mt-2">{t('howItWorks.step2_desc')}</p>
          </div>
          <div className="flex flex-col items-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4">3</div>
            <h3 className="text-xl font-semibold">{t('howItWorks.step3_title')}</h3>
            <p className="text-muted-foreground mt-2">{t('howItWorks.step3_desc')}</p>
          </div>
        </div>
      </div>
    </section>
  );
};