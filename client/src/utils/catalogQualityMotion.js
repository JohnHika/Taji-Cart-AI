export const getCatalogQualityMotion = (reduceMotion, index = 0) => {
  if (reduceMotion) {
    return { initial: false };
  }

  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: 0.18,
      delay: Math.min(index * 0.03, 0.15),
      ease: 'easeOut',
    },
  };
};
