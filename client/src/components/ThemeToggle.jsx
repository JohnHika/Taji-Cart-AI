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
      className={`relative flex items-center w-[56px] h-[30px] rounded-pill border transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500 ${
        darkMode
          ? 'bg-plum-900 border-plum-700'
          : 'bg-blush-100 border-brown-200'
      } ${className}`}
    >
      {/* Sun — left side, visible in light mode */}
      <span
        className="absolute left-[7px] transition-all duration-300"
        style={{ opacity: darkMode ? 0.3 : 0.6 }}
      >
        <FaSun size={11} className="text-gold-500" />
      </span>

      {/* Moon — right side, visible in dark mode */}
      <span
        className="absolute right-[7px] transition-all duration-300"
        style={{ opacity: darkMode ? 0.6 : 0.3 }}
      >
        <FaMoon size={11} className="text-plum-300" />
      </span>

      {/* Sliding knob */}
      <span
        className={`absolute top-[3px] w-[24px] h-[24px] rounded-full shadow flex items-center justify-center transition-all duration-300 ${
          darkMode
            ? 'translate-x-[28px] bg-plum-700'
            : 'translate-x-[3px] bg-white'
        }`}
      >
        {darkMode
          ? <FaMoon size={12} className="text-gold-300" />
          : <FaSun size={12} className="text-gold-500" />
        }
      </span>
    </button>
  );
};

export default ThemeToggle;
