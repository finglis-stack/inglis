import React, { createContext, useContext, useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';

const Q12xOnboardingContext = createContext(null);

export const Q12xOnboardingProvider = () => {
  const [onboardingData, setOnboardingData] = useState(() => {
    try {
      const item = window.localStorage.getItem('q12xOnboardingData');
      return item ? JSON.parse(item) : {};
    } catch (error) {
      console.error(error);
      return {};
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('q12xOnboardingData', JSON.stringify(onboardingData));
    } catch (error) {
      console.error(error);
    }
  }, [onboardingData]);

  const updateData = (data) => {
    setOnboardingData((prev) => ({ ...prev, ...data }));
  };

  const resetData = () => {
    setOnboardingData({});
    window.localStorage.removeItem('q12xOnboardingData');
  };

  return (
    <Q12xOnboardingContext.Provider value={{ onboardingData, updateData, resetData }}>
      <Outlet />
    </Q12xOnboardingContext.Provider>
  );
};

export const useQ12xOnboarding = () => {
  const context = useContext(Q12xOnboardingContext);
  if (!context) {
    throw new Error('useQ12xOnboarding must be used within a Q12xOnboardingProvider');
  }
  return context;
};