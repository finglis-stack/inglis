import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const CardIssuance = () => {
  const { t } = useTranslation('card-issuance');

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header isTransparent />
      <main className="flex-grow">
        <section 
          className="relative py-24 md:py-40 lg:py-48 text-center text-white overflow-hidden bg-cover bg-center"
          style={{ backgroundImage: "url('/card-issuance-hero.jpg')" }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/70 to-black/40" />
          <div className="container relative px-4 md:px-6">
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter text-shadow-lg">{t('hero.title')}</h1>
            <p className="mx-auto mt-6 max-w-3xl text-lg md:text-xl text-gray-200 text-shadow">{t('hero.subtitle')}</p>
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
            <Card className="max-w-4xl mx-auto shadow-lg">
              <CardHeader>
                <CardTitle>{t('technical.structure_title')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gradient-to-br from-gray-800 to-black rounded-xl p-6 text-white font-mono shadow-lg mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xl font-bold">Inglis Dominion</span>
                    <img src="/logo.png" alt="Logo" className="h-8 opacity-80" />
                  </div>
                  <div className="text-2xl md:text-3xl tracking-widest mb-6 flex flex-wrap gap-x-2">
                    <span>LT</span>
                    <span>000000</span>
                    <span>QZ</span>
                    <span>0000000</span>
                    <span>7</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>VALID THRU 06/28</span>
                    <span>CVV 915</span>
                  </div>
                </div>
                <p className="text-center text-sm text-muted-foreground mb-8">{t('technical.structure_desc')}</p>
                <Accordion type="single" collapsible defaultValue="initials">
                  <AccordionItem value="initials">
                    <AccordionTrigger>{t('technical.initials_title')}</AccordionTrigger>
                    <AccordionContent>{t('technical.initials_desc')}</AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="issuer">
                    <AccordionTrigger>{t('technical.issuer_title')}</AccordionTrigger>
                    <AccordionContent>{t('technical.issuer_desc')}</AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="random_letters">
                    <AccordionTrigger>{t('technical.random_letters_title')}</AccordionTrigger>
                    <AccordionContent>{t('technical.random_letters_desc')}</AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="unique_id">
                    <AccordionTrigger>{t('technical.unique_id_title')}</AccordionTrigger>
                    <AccordionContent>{t('technical.unique_id_desc')}</AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="check_digit">
                    <AccordionTrigger>{t('technical.luhn_title')}</AccordionTrigger>
                    <AccordionContent className="space-y-2">
                      <p>{t('technical.luhn_desc')}</p>
                      <p className="font-mono bg-gray-100 p-2 rounded text-xs">{t('technical.luhn_result')}</p>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
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