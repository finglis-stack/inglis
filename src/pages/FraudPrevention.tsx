import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldCheck, Fingerprint, Network, Activity } from "lucide-react";
import { useTranslation } from "react-i18next";
import SampleRiskChart from "@/components/landing/SampleRiskChart";
import SampleBehavioralChart from "@/components/landing/SampleBehavioralChart";

const FraudPrevention = () => {
  const { t } = useTranslation('fraud-prevention');

  const layers = [
    { icon: <Fingerprint className="h-8 w-8 text-primary" />, title: t('layers.device.title'), description: t('layers.device.description') },
    { icon: <Activity className="h-8 w-8 text-primary" />, title: t('layers.behavioral.title'), description: t('layers.behavioral.description') },
    { icon: <Network className="h-8 w-8 text-primary" />, title: t('layers.velocity.title'), description: t('layers.velocity.description') },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-grow">
        <section className="py-20 text-center bg-white">
          <div className="container px-4 md:px-6">
            <ShieldCheck className="h-16 w-16 mx-auto text-primary mb-6" />
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">{t('hero.title')}</h1>
            <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">{t('hero.subtitle')}</p>
          </div>
        </section>

        <section className="py-20 bg-secondary">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight">{t('layers.title')}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
              {layers.map((layer, index) => (
                <div key={index} className="flex flex-col items-center text-center">
                  <div className="flex items-center justify-center h-16 w-16 rounded-xl bg-primary/10 mb-6">{layer.icon}</div>
                  <h3 className="text-xl font-semibold">{layer.title}</h3>
                  <p className="text-muted-foreground mt-2">{layer.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="container px-4 md:px-6 grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-4">
              <h2 className="text-3xl font-bold">{t('charts.risk.title')}</h2>
              <p className="text-muted-foreground">{t('charts.risk.description')}</p>
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>{t('charts.risk.chartTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <SampleRiskChart />
                </CardContent>
              </Card>
            </div>
            <div className="space-y-4">
              <h2 className="text-3xl font-bold">{t('charts.behavioral.title')}</h2>
              <p className="text-muted-foreground">{t('charts.behavioral.description')}</p>
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>{t('charts.behavioral.chartTitle')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <SampleBehavioralChart />
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default FraudPrevention;