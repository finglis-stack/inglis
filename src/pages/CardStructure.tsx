import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type CardSegment = 
  | 'initials' 
  | 'issuer' 
  | 'random_letters' 
  | 'unique_id' 
  | 'check_digit' 
  | 'expiration' 
  | 'cvv';

const CardStructure = () => {
  const { t } = useTranslation('landing');
  const [activeSegment, setActiveSegment] = useState<CardSegment | null>('initials');

  const segments: { id: CardSegment; example: string }[] = [
    { id: 'initials', example: 'LT' },
    { id: 'issuer', example: '000000' },
    { id: 'random_letters', example: 'QZ' },
    { id: 'unique_id', example: '0000000' },
    { id: 'check_digit', example: '7' },
  ];

  const handleSegmentClick = (segment: CardSegment) => {
    setActiveSegment(segment === activeSegment ? segment : segment);
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-grow container mx-auto px-4 py-12 md:py-20">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            {t('cardExplained.title')}
          </h1>
          <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
            {t('cardExplained.subtitle')}
          </p>
        </div>

        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>{t('cardExplained.cardTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Visual Card Representation */}
            <div className="bg-gradient-to-br from-gray-800 to-black rounded-xl p-6 text-white font-mono shadow-lg mb-6">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xl font-bold">Inglis Dominium</span>
                <img src="/logo.png" alt="Logo" className="h-8 opacity-80" />
              </div>
              <div className="text-2xl md:text-3xl tracking-widest mb-6 flex flex-wrap gap-x-2">
                {segments.map((seg) => (
                  <span
                    key={seg.id}
                    onClick={() => handleSegmentClick(seg.id)}
                    className={cn(
                      "cursor-pointer transition-all p-1 rounded -mx-1",
                      activeSegment === seg.id ? 'bg-blue-500 text-white' : 'hover:bg-gray-600'
                    )}
                  >
                    {seg.example}
                  </span>
                ))}
              </div>
              <div className="flex justify-between text-sm">
                <div 
                  onClick={() => handleSegmentClick('expiration')}
                  className={cn(
                    "cursor-pointer transition-all p-1 rounded -mx-1",
                    activeSegment === 'expiration' ? 'bg-blue-500 text-white' : 'hover:bg-gray-600'
                  )}
                >
                  <span>VALID THRU</span> <span className="ml-2">06/28</span>
                </div>
                <div 
                  onClick={() => handleSegmentClick('cvv')}
                  className={cn(
                    "cursor-pointer transition-all p-1 rounded -mx-1",
                    activeSegment === 'cvv' ? 'bg-blue-500 text-white' : 'hover:bg-gray-600'
                  )}
                >
                  <span>CVV</span> <span className="ml-2">915</span>
                </div>
              </div>
            </div>
            <p className="text-center text-sm text-muted-foreground mb-8">{t('cardExplained.interactiveHint')}</p>

            {/* Explanations Accordion */}
            <Accordion type="single" collapsible value={activeSegment || ""} onValueChange={(value) => setActiveSegment(value as CardSegment)}>
              <AccordionItem value="initials">
                <AccordionTrigger>{t('cardExplained.initials_title')}</AccordionTrigger>
                <AccordionContent>{t('cardExplained.initials_desc')}</AccordionContent>
              </AccordionItem>
              <AccordionItem value="issuer">
                <AccordionTrigger>{t('cardExplained.issuer_title')}</AccordionTrigger>
                <AccordionContent>
                  <p>{t('cardExplained.issuer_desc_1')}</p>
                  <ul className="list-disc pl-5 mt-2 space-y-1">
                    <li>{t('cardExplained.issuer_desc_2')}</li>
                    <li>{t('cardExplained.issuer_desc_3')}</li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="random_letters">
                <AccordionTrigger>{t('cardExplained.random_letters_title')}</AccordionTrigger>
                <AccordionContent>{t('cardExplained.random_letters_desc')}</AccordionContent>
              </AccordionItem>
              <AccordionItem value="unique_id">
                <AccordionTrigger>{t('cardExplained.unique_id_title')}</AccordionTrigger>
                <AccordionContent>{t('cardExplained.unique_id_desc')}</AccordionContent>
              </AccordionItem>
              <AccordionItem value="check_digit">
                <AccordionTrigger>{t('cardExplained.check_digit_title')}</AccordionTrigger>
                <AccordionContent className="space-y-2">
                  <p>{t('cardExplained.check_digit_desc_1')}</p>
                  <p>{t('cardExplained.check_digit_desc_2')}</p>
                  <p className="font-mono bg-gray-100 p-2 rounded">{t('cardExplained.check_digit_desc_3')}</p>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="expiration">
                <AccordionTrigger>{t('cardExplained.expiration_title')}</AccordionTrigger>
                <AccordionContent>{t('cardExplained.expiration_desc')}</AccordionContent>
              </AccordionItem>
              <AccordionItem value="cvv">
                <AccordionTrigger>{t('cardExplained.cvv_title')}</AccordionTrigger>
                <AccordionContent>{t('cardExplained.cvv_desc')}</AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-12">
          <Card>
            <CardHeader>
              <CardTitle>{t('cardExplained.summary_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{t('cardExplained.summary_desc')}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('cardExplained.combinations_title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p className="text-muted-foreground">{t('cardExplained.combinations_desc_1')}</p>
              <ul className="list-disc pl-5 font-mono text-xs">
                <li>{t('cardExplained.combinations_calc_1')}</li>
                <li>{t('cardExplained.combinations_calc_2')}</li>
                <li>{t('cardExplained.combinations_calc_3')}</li>
                <li>{t('cardExplained.combinations_calc_4')}</li>
                <li>{t('cardExplained.combinations_calc_5')}</li>
              </ul>
              <p className="font-semibold pt-2">{t('cardExplained.combinations_total_1')}</p>
              <p className="text-muted-foreground">{t('cardExplained.combinations_total_2')}</p>
              <p className="pt-2">{t('cardExplained.combinations_final')}</p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CardStructure;