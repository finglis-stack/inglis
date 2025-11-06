import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, UploadCloud, DownloadCloud, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";

const CreditBureau = () => {
  const { t } = useTranslation('credit-bureau');

  const features = [
    { icon: <UploadCloud className="h-6 w-6 text-primary" />, title: t('features.reporting.title'), description: t('features.reporting.description') },
    { icon: <DownloadCloud className="h-6 w-6 text-primary" />, title: t('features.pulling.title'), description: t('features.pulling.description') },
    { icon: <Lock className="h-6 w-6 text-primary" />, title: t('features.consent.title'), description: t('features.consent.description') },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-grow">
        <section className="py-20 text-center bg-white">
          <div className="container px-4 md:px-6">
            <FileText className="h-16 w-16 mx-auto text-primary mb-6" />
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{t('hero.title')}</h1>
            <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">{t('hero.subtitle')}</p>
          </div>
        </section>

        <section className="py-20 bg-secondary">
          <div className="container px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="text-center shadow-sm">
                  <CardHeader className="items-center">
                    <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-primary/10 mb-4">{feature.icon}</div>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
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