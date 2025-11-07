import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const CreditBureau = () => {
  const { t } = useTranslation('credit-bureau');

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header isTransparent />
      <main className="flex-grow">
        <section 
          className="relative py-24 md:py-40 lg:py-48 text-center text-white overflow-hidden bg-cover bg-center"
          style={{ backgroundImage: "url('/credit-bureau-hero.jpg')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/70 to-black/40" />
          <div className="container relative px-4 md:px-6">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-shadow-lg">{t('hero.title')}</h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg md:text-xl text-gray-200 text-shadow">{t('hero.subtitle')}</p>
          </div>
        </section>

        <section className="py-20 bg-secondary">
          <div className="container px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>{t('features.reporting.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t('features.reporting.description')}</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>{t('features.pulling.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t('features.pulling.description')}</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>{t('features.consent.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t('features.consent.description')}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="container px-4 md:px-6 text-center">
            <h2 className="text-3xl font-bold">{t('cta.title')}</h2>
            <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">{t('cta.subtitle')}</p>
            <Button size="lg" className="mt-8">{t('cta.button')}</Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default CreditBureau;