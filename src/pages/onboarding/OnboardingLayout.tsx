import React from 'react';

interface OnboardingLayoutProps {
  children: React.ReactNode;
}

export const OnboardingLayout: React.FC<OnboardingLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen flex">
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
      <div className="hidden md:block md:w-1/2 bg-cover bg-center" style={{ backgroundImage: "url('/onboarding-image.jpg')" }}>
      </div>
    </div>
  );
};