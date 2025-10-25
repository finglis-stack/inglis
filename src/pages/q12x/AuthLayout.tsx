import React from 'react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useTranslation } from 'react-i18next';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  const { t } = useTranslation('q12x');
  return (
    <div className="min-h-screen flex bg-gray-100">
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 relative">
        <div className="absolute top-8 right-8">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-md">
          <h1 className="text-4xl font-bold font-mono text-gray-900 mb-2">Q12x</h1>
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          <p className="text-gray-500 mb-8">{subtitle}</p>
          {children}
        </div>
      </div>
      <div 
        className="hidden lg:block lg:w-1/2 bg-cover bg-center" 
        style={{ backgroundImage: "url('/q12x-background.jpg')" }}
      >
        <div className="h-full w-full bg-black/30 flex flex-col justify-end p-12 text-white">
          <h3 className="text-3xl font-bold">{t('authLayout.bgTitle')}</h3>
          <p className="mt-2 text-lg text-gray-200">{t('authLayout.bgSubtitle')}</p>
        </div>
      </div>
    </div>
  );
};