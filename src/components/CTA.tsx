import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export const CTA = () => {
  const { t } = useTranslation();

  return (
    <section className="py-20">
      <div className="container px-4 md:px-6 text-center">
        <h2 className="text-3xl font-bold">{t('cta.title')}</h2>
        <p className="text-muted-foreground mt-2 max-w-lg mx-auto">{t('cta.subtitle')}</p>
        <Button size="lg" className="mt-8">{t('cta.button')}</Button>
      </div>
    </section>
  );
};