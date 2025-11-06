import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

export const Hero = () => {
  const { t } = useTranslation('landing');

  return (
    <section 
      className="relative py-24 md:py-40 lg:py-48 text-center text-white overflow-hidden bg-cover bg-center"
      style={{ backgroundImage: "url('/hero-background.jpg')" }}
    >
      <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/70 to-black/40" />
      
      <div className="container relative px-4 md:px-6">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-shadow-lg">
          {t('hero.title')}
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-lg md:text-xl text-gray-200 text-shadow">
          {t('hero.subtitle')}
        </p>
        <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
          <Button size="lg" className="bg-white text-black hover:bg-gray-200 w-full sm:w-auto" asChild>
            <Link to="/onboarding/welcome">{t('hero.ctaStart')}</Link>
          </Button>
          <Button size="lg" variant="outline" className="bg-transparent border-white text-white hover:bg-white hover:text-black w-full sm:w-auto">
            {t('hero.ctaContact')}
          </Button>
        </div>
      </div>
    </section>
  );
};