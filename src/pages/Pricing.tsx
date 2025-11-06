import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTranslation } from "react-i18next";
import { Separator } from "@/components/ui/separator";

const Pricing = () => {
  const { t } = useTranslation('pricing');

  const [cards, setCards] = useState(1000);
  const [transactions, setTransactions] = useState(5000);
  const [avgTransactionValue, setAvgTransactionValue] = useState(50);
  const [chargeUserFee, setChargeUserFee] = useState(false);
  const [chargeMerchantFee, setChargeMerchantFee] = useState(false);
  const [dedicatedBin, setDedicatedBin] = useState(false);

  const [monthlyCost, setMonthlyCost] = useState(0);
  const [annualCost, setAnnualCost] = useState(0);

  useEffect(() => {
    let monthly = 0;
    let annual = 0;

    if (dedicatedBin) {
      monthly += 230;
      monthly += (transactions / 1000) * 15;
    }

    if (chargeUserFee) {
      annual += cards * 15;
    }

    if (chargeMerchantFee) {
      monthly += (transactions * avgTransactionValue) * 0.005;
    }

    setMonthlyCost(monthly);
    setAnnualCost(annual);
  }, [cards, transactions, avgTransactionValue, chargeUserFee, chargeMerchantFee, dedicatedBin]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('fr-CA', { style: 'currency', currency: 'CAD' }).format(value);

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header isTransparent />
      <main className="flex-grow">
        <section 
          className="relative py-24 md:py-40 lg:py-48 text-center text-white overflow-hidden bg-cover bg-center"
          style={{ backgroundImage: "url('/pricing-hero.jpg')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/70 to-black/40" />
          <div className="container relative px-4 md:px-6">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-shadow-lg">{t('hero.title')}</h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg md:text-xl text-gray-200 text-shadow">{t('hero.subtitle')}</p>
          </div>
        </section>

        <section className="py-20 bg-white">
          <div className="container px-4 md:px-6">
            <div className="grid lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2">
                <div className="space-y-12">
                  <Card className="border-0 border-l-4 border-primary shadow-none">
                    <CardHeader>
                      <CardTitle>{t('platform.title')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-muted-foreground">
                      <p>{t('platform.issuance_desc')}</p>
                      <p>{t('platform.transaction_desc')}</p>
                      <p>{t('platform.bin_desc')}</p>
                      <p>{t('platform.fraud_desc')}</p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 border-l-4 border-primary shadow-none">
                    <CardHeader>
                      <CardTitle>{t('services.title')}</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4 text-muted-foreground">
                      <p>{t('services.kyc_desc')}</p>
                      <p>{t('services.physical_cards_desc')}</p>
                      <p>{t('services.sms_desc')}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle>{t('calculator.title')}</CardTitle>
                  <CardDescription>{t('calculator.subtitle')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>{t('calculator.cards', { count: cards })}</Label>
                    <Slider value={[cards]} onValueChange={([val]) => setCards(val)} max={10000} step={100} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('calculator.transactions', { count: transactions })}</Label>
                    <Slider value={[transactions]} onValueChange={([val]) => setTransactions(val)} max={50000} step={500} />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('calculator.avg_value', { value: formatCurrency(avgTransactionValue) })}</Label>
                    <Slider value={[avgTransactionValue]} onValueChange={([val]) => setAvgTransactionValue(val)} max={500} step={5} />
                  </div>
                  <div className="flex items-center justify-between"><Label>{t('calculator.charge_user_fee')}</Label><Switch checked={chargeUserFee} onCheckedChange={setChargeUserFee} /></div>
                  <div className="flex items-center justify-between"><Label>{t('calculator.charge_merchant_fee')}</Label><Switch checked={chargeMerchantFee} onCheckedChange={setChargeMerchantFee} /></div>
                  <div className="flex items-center justify-between"><Label>{t('calculator.dedicated_bin')}</Label><Switch checked={dedicatedBin} onCheckedChange={setDedicatedBin} /></div>
                  <Separator />
                  <div className="space-y-2">
                    <div className="flex justify-between text-lg font-semibold"><span>{t('calculator.monthly_cost')}</span><span>{formatCurrency(monthlyCost)}</span></div>
                    <div className="flex justify-between text-sm text-muted-foreground"><span>{t('calculator.annual_cost')}</span><span>{formatCurrency(annualCost)}</span></div>
                  </div>
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

export default Pricing;