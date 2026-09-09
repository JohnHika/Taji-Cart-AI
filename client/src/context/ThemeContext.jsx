import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  // Lazy-init from the persisted choice -- without this, every fresh page
  // load/reload silently reset to light regardless of what was saved below,
  // since the effect writes 'light' back to localStorage the instant it
  // runs with the (previously always-false) initial state.
  const [darkMode, setDarkMode] = useState(() => (
    typeof window !== 'undefined' && localStorage.getItem('theme') === 'dark'
  ));

  // Update localStorage and document class when theme changes
  useEffect(() => {
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(prev => !prev);
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
