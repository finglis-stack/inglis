import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Palette, Rocket, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

const CardIssuance = () => {
  const { t } = useTranslation('card-issuance');

  const steps = [
    { icon: <Palette className="h-8 w-8 text-primary" />, title: t('steps.design.title'), description: t('steps.design.description') },
    { icon: <Rocket className="h-8 w-8 text-primary" />, title: t('steps.launch.title'), description: t('steps.launch.description') },
    { icon: <ShieldCheck className="h-8 w-8 text-primary" />, title: t('steps.management.title'), description: t('steps.management.description') },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-grow">
        <section className="py-20 text-center bg-white">
          <div className="container px-4 md:px-6">
            <CreditCard className="h-16 w-16 mx-auto text-primary mb-6" />
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{t('hero.title')}</h1>
            <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">{t('hero.subtitle')}</p>
          </div>
        </section>

        <section className="py-20 bg-secondary">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight">{t('steps.title')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {steps.map((step, index) => (
                <div key={index} className="flex flex-col items-center text-center">
                  <div className="flex items-center justify-center h-16 w-16 rounded-xl bg-primary/10 mb-6">{step.icon}</div>
                  <h3 className="text-xl font-semibold">{step.title}</h3>
                  <p className="text-muted-foreground mt-2">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="container px-4 md:px-6 grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold">{t('features.title')}</h2>
              <p className="text-muted-foreground mt-4">{t('features.subtitle')}</p>
              <ul className="mt-6 space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">{t('features.hybrid.title')}</h4>
                    <p className="text-sm text-muted-foreground">{t('features.hybrid.description')}</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">{t('features.virtual.title')}</h4>
                    <p className="text-sm text-muted-foreground">{t('features.virtual.description')}</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold">{t('features.api.title')}</h4>
                    <p className="text-sm text-muted-foreground">{t('features.api.description')}</p>
                  </div>
                </li>
              </ul>
            </div>
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>{t('cardTypes.title')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold">{t('cardTypes.credit.title')}</h4>
                  <p className="text-sm text-muted-foreground">{t('cardTypes.credit.description')}</p>
                </div>
                <div>
                  <h4 className="font-semibold">{t('cardTypes.debit.title')}</h4>
                  <p className="text-sm text-muted-foreground">{t('cardTypes.debit.description')}</p>
                </div>
                <div>
                  <h4 className="font-semibold">{t('cardTypes.prepaid.title')}</h4>
                  <p className="text-sm text-muted-foreground">{t('cardTypes.prepaid.description')}</p>
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

const CheckCircle = ({ className }: { className: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export default CardIssuance;