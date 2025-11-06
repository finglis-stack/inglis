import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const CreditBureau = () => {
  const { t } = useTranslation('credit-bureau');

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-grow">
        <section className="py-20 text-center bg-white">
          <div className="container px-4 md:px-6">
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{t('hero.title')}</h1>
            <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">{t('hero.subtitle')}</p>
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