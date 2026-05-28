import React from 'react';
import { FaMoon, FaSun } from 'react-icons/fa';
import { useTheme } from '../context/ThemeContext';

const ThemeToggle = ({ className = '' }) => {
  const { darkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`relative flex items-center justify-center w-10 h-10 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 ${
        darkMode
          ? 'text-plum-300 hover:bg-plum-900/20'
          : 'text-gold-500 hover:bg-blush-100'
      } ${className}`}
    >
      {darkMode ? (
        <FaMoon size={20} className="text-plum-300" />
      ) : (
        <FaSun size={20} className="text-gold-500" />
      )}
    </button>
  );
};

export default ThemeToggle;
