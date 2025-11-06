import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";

const CardIssuance = () => {
  const { t } = useTranslation('card-issuance');

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
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight">{t('process.title')}</h2>
              <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">{t('process.subtitle')}</p>
            </div>
            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
              <div className="relative flex flex-col items-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4 z-10">1</div>
                <h3 className="text-xl font-semibold">{t('process.step1_title')}</h3>
                <p className="text-muted-foreground mt-2">{t('process.step1_desc')}</p>
                <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-border -z-0" />
              </div>
              <div className="relative flex flex-col items-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4 z-10">2</div>
                <h3 className="text-xl font-semibold">{t('process.step2_title')}</h3>
                <p className="text-muted-foreground mt-2">{t('process.step2_desc')}</p>
                <div className="hidden md:block absolute top-8 left-0 w-full h-0.5 bg-border -z-0" />
              </div>
              <div className="relative flex flex-col items-center">
                <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl mb-4 z-10">3</div>
                <h3 className="text-xl font-semibold">{t('process.step3_title')}</h3>
                <p className="text-muted-foreground mt-2">{t('process.step3_desc')}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight">{t('technical.title')}</h2>
              <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">{t('technical.subtitle')}</p>
            </div>
            <Card className="shadow-lg">
              <CardContent className="p-8 grid md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">{t('technical.structure_title')}</h3>
                  <p className="text-muted-foreground">{t('technical.structure_desc')}</p>
                  <ul className="list-disc list-inside space-y-2 text-sm">
                    <li><strong>{t('technical.initials_title')}:</strong> {t('technical.initials_desc')}</li>
                    <li><strong>{t('technical.issuer_title')}:</strong> {t('technical.issuer_desc')}</li>
                    <li><strong>{t('technical.unique_id_title')}:</strong> {t('technical.unique_id_desc')}</li>
                  </ul>
                </div>
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">{t('technical.luhn_title')}</h3>
                  <p className="text-muted-foreground">{t('technical.luhn_desc')}</p>
                  <pre className="bg-gray-100 p-3 rounded-md text-xs font-mono">
                    <code>{`2129 (LT) + 000000 (Issuer) + 2635 (QZ) + 0000000 (ID) = 212900000026350000000`}</code>
                  </pre>
                  <p className="text-muted-foreground text-sm">{t('technical.luhn_result')}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default CardIssuance;