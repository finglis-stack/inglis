import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const STORAGE_KEY = 'mobile_onboarding_done';

const Slide = ({
  src,
  title,
  desc,
}: {
  src: string;
  title: string;
  desc: string;
}) => {
  return (
    <Card className="overflow-hidden border-0 shadow-none bg-transparent">
      <CardContent className="p-0">
        <div className="w-full aspect-[9/16] rounded-2xl overflow-hidden bg-muted">
          <img
            src={src}
            alt=""
            className="w-full h-full object-cover"
            loading="eager"
          />
        </div>
        <div className="mt-4 space-y-2 px-1">
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{desc}</p>
        </div>
      </CardContent>
    </Card>
  );
};

const MobileOnboarding = () => {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);

  const slides = useMemo(
    () => [
      {
        src: '/mobile-onboarding/family.jpg',
        title: t('mobile.onboarding.title1', 'Votre portefeuille Inglis Dominion'),
        desc: t(
          'mobile.onboarding.desc1',
          'Ajoutez vos cartes et utilisez-les facilement depuis votre téléphone.'
        ),
      },
      {
        src: '/mobile-onboarding/party.jpg',
        title: t('mobile.onboarding.title2', 'Simple, élégant et bilingue'),
        desc: t(
          'mobile.onboarding.desc2',
          'Interface clair/sombre selon le thème de l’OS, en français ou anglais.'
        ),
      },
      {
        src: '/mobile-onboarding/phone.jpg',
        title: t('mobile.onboarding.title3', 'Sécurisé, prêt pour le NFC'),
        desc: t(
          'mobile.onboarding.desc3',
          'Validation PIN côté serveur et compatibilité NFC à venir.'
        ),
      },
    ],
    [t]
  );

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (done === '1') {
      navigate('/mobile/wallet', { replace: true });
    }
  }, [navigate]);

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    navigate('/mobile/wallet', { replace: true });
  };

  const onNext = () => {
    if (index < slides.length - 1) {
      setIndex((i) => i + 1);
    } else {
      finish();
    }
  };

  return (
    <div
      className="min-h-screen bg-background text-foreground flex flex-col"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <div className="max-w-md mx-auto w-full px-4 py-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Inglis Dominion</div>
          <Button variant="ghost" size="sm" onClick={finish}>
            {t('skip', 'Passer')}
          </Button>
        </div>

        <div className="mt-4 flex-1">
          <Slide {...slides[index]} />
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex gap-2">
            {slides.map((_, i) => (
              <span
                key={i}
                className={`h-2 w-2 rounded-full transition-colors ${i === index ? 'bg-primary' : 'bg-muted'}`}
              />
            ))}
          </div>

          <Button onClick={onNext}>
            {index < slides.length - 1 ? t('next', 'Suivant') : t('start', 'Commencer')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MobileOnboarding;