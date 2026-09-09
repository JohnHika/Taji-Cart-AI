import React from 'react';

const DIMENSIONS = {
  small: { box: 'h-5 w-5', border: 'border-2' },
  medium: { box: 'h-8 w-8', border: 'border-[3px]' },
  large: { box: 'h-12 w-12', border: 'border-4' },
};

const LABEL_CLASSES = {
  small: 'text-xs',
  medium: 'text-sm',
  large: 'text-base',
};

// Two rings spinning at the same rate as each other but on top of a static
// track ring reads as more polished than a single flat ring, without an SVG
// or extra deps — matches the plum/gold brand pair used across the app.
const LoadingSpinner = ({ size = 'medium', label, fullScreen = false }) => {
  const { box, border } = DIMENSIONS[size] || DIMENSIONS.medium;

  const spinner = (
    <div className="flex flex-col items-center justify-center gap-2.5">
      <div className={`relative ${box}`}>
        <div className={`absolute inset-0 rounded-full ${border} border-plum-100 dark:border-dm-border`} />
        <div
          className={`absolute inset-0 animate-spin rounded-full ${border} border-transparent border-t-plum-700 border-r-plum-700 dark:border-t-gold-400 dark:border-r-gold-400`}
          style={{ animationDuration: '0.7s' }}
        />
      </div>
      {label && (
        <span className={`font-medium text-brown-500 dark:text-white/50 ${LABEL_CLASSES[size] || LABEL_CLASSES.medium}`}>
          {label}
        </span>
      )}
    </div>
  );

  if (!fullScreen) {
    return <div className="flex items-center justify-center">{spinner}</div>;
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      {spinner}
    </div>
  );
};

export default LoadingSpinner;
