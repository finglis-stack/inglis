import React, { createContext, useContext, useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';

const NewCardContext = createContext(null);

export const NewCardProvider = () => {
  const [cardData, setCardData] = useState(() => {
    try {
      const item = window.localStorage.getItem('newCardFormData');
      return item ? JSON.parse(item) : {};
    } catch (error) {
      console.error(error);
      return {};
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('newCardFormData', JSON.stringify(cardData));
    } catch (error) {
      console.error(error);
    }
  }, [cardData]);

  const updateCard = (data) => {
    setCardData((prev) => ({ ...prev, ...data }));
  };

  const resetCard = () => {
    setCardData({});
    window.localStorage.removeItem('newCardFormData');
  };

  return (
    <NewCardContext.Provider value={{ cardData, updateCard, resetCard }}>
      <Outlet />
    </NewCardContext.Provider>
  );
};

export const useNewCard = () => {
  const context = useContext(NewCardContext);
  if (!context) {
    throw new Error('useNewCard must be used within a NewCardProvider');
  }
  return context;
};