import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export const CTA = () => {
  const { t } = useTranslation('landing');

  return (
    <section className="py-20 bg-gradient-to-r from-primary to-blue-800 text-white">
      <div className="container px-4 md:px-6 text-center">
        <h2 className="text-4xl font-bold tracking-tight">{t('cta.title')}</h2>
        <p className="text-blue-200 mt-4 max-w-2xl mx-auto">{t('cta.subtitle')}</p>
        <Button size="lg" className="mt-8 bg-white text-black hover:bg-gray-200">{t('cta.button')}</Button>
      </div>
    </section>
  );
};