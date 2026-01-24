import React, { useEffect, useMemo, useState } from 'react';
import MobileLayout from '@/components/mobile/MobileLayout';
import { Button } from '@/components/ui/button';
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
    <div className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden">
      <img
        src={src}
        alt=""
        className="w-full h-full object-cover"
        loading="eager"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2">
        <h2 className="text-xl font-light tracking-wide text-white">{title}</h2>
        <p className="text-sm text-white/80">{desc}</p>
      </div>
    </div>
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
          'Thème sombre cohérent, en français ou anglais.'
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
    <MobileLayout
      title="Inglis Dominion"
      headerRight={
        <Button variant="ghost" size="sm" onClick={finish} className="rounded-xl bg-white/5 text-white hover:bg-white/10">
          {t('skip', 'Passer')}
        </Button>
      }
    >
      <div className="flex-1 flex flex-col gap-6">
        <Slide {...slides[index]} />

        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {slides.map((_, i) => (
              <span
                key={i}
                className={`h-1 w-6 rounded-full transition-all ${i === index ? 'bg-white/80' : 'bg-white/20'}`}
              />
            ))}
          </div>

          <Button onClick={onNext} className="rounded-xl bg-white/10 text-white hover:bg-white/20 px-5 h-10">
            {index < slides.length - 1 ? t('next', 'Suivant') : t('start', 'Commencer')}
          </Button>
        </div>
      </div>
    </MobileLayout>
  );
};

export default MobileOnboarding;