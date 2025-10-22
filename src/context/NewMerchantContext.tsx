import React, { createContext, useContext, useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';

const NewMerchantContext = createContext(null);

export const NewMerchantProvider = () => {
  const [merchantData, setMerchantData] = useState(() => {
    try {
      const item = window.localStorage.getItem('newMerchantFormData');
      return item ? JSON.parse(item) : {};
    } catch (error) {
      console.error(error);
      return {};
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('newMerchantFormData', JSON.stringify(merchantData));
    } catch (error) {
      console.error(error);
    }
  }, [merchantData]);

  const updateMerchant = (data) => {
    setMerchantData((prev) => ({ ...prev, ...data }));
  };

  const resetMerchant = () => {
    setMerchantData({});
    window.localStorage.removeItem('newMerchantFormData');
  };

  return (
    <NewMerchantContext.Provider value={{ merchantData, updateMerchant, resetMerchant }}>
      <Outlet />
    </NewMerchantContext.Provider>
  );
};

export const useNewMerchant = () => {
  const context = useContext(NewMerchantContext);
  if (!context) {
    throw new Error('useNewMerchant must be used within a NewMerchantProvider');
  }
  return context;
};