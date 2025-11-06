import React from 'react';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { Link } from 'react-router-dom';

interface OnboardingLayoutProps {
  children: React.ReactNode;
}

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex">
      <div className="w-full md:w-1/2 flex flex-col items-center p-8 relative">
        <header className="w-full max-w-md absolute top-8 flex justify-between items-center">
          <Link to="/">
            <img src="/logo-dark.png" alt="Inglis Dominion Logo" className="h-10" />
          </Link>
          <LanguageSwitcher />
        </header>
        <div className="w-full max-w-md flex flex-col justify-center flex-grow">
          {children}
        </div>
      </div>
      <div className="hidden md:block md:w-1/2 bg-cover bg-center" style={{ backgroundImage: "url('/onboarding-image.jpg')" }}>
      </div>
    </div>
  );
};