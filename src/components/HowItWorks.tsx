import { useTranslation } from "react-i18next";

export const HowItWorks = () => {
  const { t } = useTranslation('landing');

  return (
    <section id="how-it-works" className="py-20 bg-secondary">
      <div className="container px-4 md:px-6">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight">{t('howItWorks.title')}</h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">{t('howItWorks.subtitle')}</p>
        </div>
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
          <div className="relative flex flex-col items-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4 z-10">1</div>
            <h3 className="text-xl font-semibold">{t('howItWorks.step1_title')}</h3>
            <p className="text-muted-foreground mt-2">{t('howItWorks.step1_desc')}</p>
            <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-border -z-0" />
          </div>
          <div className="relative flex flex-col items-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4 z-10">2</div>
            <h3 className="text-xl font-semibold">{t('howItWorks.step2_title')}</h3>
            <p className="text-muted-foreground mt-2">{t('howItWorks.step2_desc')}</p>
            <div className="hidden md:block absolute top-8 left-0 w-full h-0.5 bg-border -z-0" />
          </div>
          <div className="relative flex flex-col items-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4 z-10">3</div>
            <h3 className="text-xl font-semibold">{t('howItWorks.step3_title')}</h3>
            <p className="text-muted-foreground mt-2">{t('howItWorks.step3_desc')}</p>
          </div>
        </div>
      </div>
    </section>
  );
};