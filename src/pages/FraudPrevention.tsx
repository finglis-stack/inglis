import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import SampleRiskChart from "@/components/landing/SampleRiskChart";
import SampleBehavioralChart from "@/components/landing/SampleBehavioralChart";

const FraudPrevention = () => {
  const { t } = useTranslation('fraud-prevention');

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
              <h2 className="text-3xl font-bold tracking-tight">{t('layers.title')}</h2>
              <p className="text-muted-foreground mt-4 max-w-3xl mx-auto">{t('layers.subtitle')}</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>{t('layers.device.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t('layers.device.description')}</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>{t('layers.behavioral.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t('layers.behavioral.description')}</p>
                </CardContent>
              </Card>
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>{t('layers.velocity.title')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{t('layers.velocity.description')}</p>
                </CardContent>
              </Card>
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