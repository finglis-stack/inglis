import React, { createContext, useContext, useState } from 'react';

const PublicOnboardingContext = createContext<any>(null);

export const PublicOnboardingProvider = ({ children, formConfig }) => {
  const [formData, setFormData] = useState({});

  const updateData = (data: any) => {
    setFormData(prev => ({ ...prev, ...data }));
  };

  const resetData = () => {
    setFormData({});
  };

  return (
    <PublicOnboardingContext.Provider value={{ formConfig, formData, updateData, resetData }}>
      {children}
    </PublicOnboardingContext.Provider>
  );
};

export const usePublicOnboarding = () => {
  const context = useContext(PublicOnboardingContext);
  if (!context) {
    throw new Error('usePublicOnboarding must be used within a PublicOnboardingProvider');
  }
  return context;
};