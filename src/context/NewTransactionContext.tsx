import React, { createContext, useContext, useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';

const NewTransactionContext = createContext(null);

export const NewTransactionProvider = () => {
  const [transactionData, setTransactionData] = useState(() => {
    try {
      const item = window.localStorage.getItem('newTransactionFormData');
      return item ? JSON.parse(item) : {};
    } catch (error) {
      console.error(error);
      return {};
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('newTransactionFormData', JSON.stringify(transactionData));
    } catch (error) {
      console.error(error);
    }
  }, [transactionData]);

  const updateTransaction = (data) => {
    setTransactionData((prev) => ({ ...prev, ...data }));
  };

  const resetTransaction = () => {
    setTransactionData({});
    window.localStorage.removeItem('newTransactionFormData');
  };

  return (
    <NewTransactionContext.Provider value={{ transactionData, updateTransaction, resetTransaction }}>
      <Outlet />
    </NewTransactionContext.Provider>
  );
};

export const useNewTransaction = () => {
  const context = useContext(NewTransactionContext);
  if (!context) {
    throw new Error('useNewTransaction must be used within a NewTransactionProvider');
  }
  return context;
};