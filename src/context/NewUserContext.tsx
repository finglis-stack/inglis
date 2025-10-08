import React, { createContext, useContext, useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';

const NewUserContext = createContext(null);

export const NewUserProvider = () => {
  const [userData, setUserData] = useState(() => {
    try {
      const item = window.localStorage.getItem('newUserFormData');
      return item ? JSON.parse(item) : {};
    } catch (error) {
      console.error(error);
      return {};
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('newUserFormData', JSON.stringify(userData));
    } catch (error) {
      console.error(error);
    }
  }, [userData]);

  const updateUser = (data) => {
    setUserData((prev) => ({ ...prev, ...data }));
  };

  const resetUser = () => {
    setUserData({});
    window.localStorage.removeItem('newUserFormData');
  };

  return (
    <NewUserContext.Provider value={{ userData, updateUser, resetUser }}>
      <Outlet />
    </NewUserContext.Provider>
  );
};

export const useNewUser = () => {
  const context = useContext(NewUserContext);
  if (!context) {
    throw new Error('useNewUser must be used within a NewUserProvider');
  }
  return context;
};