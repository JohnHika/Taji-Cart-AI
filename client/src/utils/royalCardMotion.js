export const getRoyalCardMotion = (reduceMotion) => ({
  initial: reduceMotion ? false : { opacity: 0, y: 10 },
  whileHover: reduceMotion ? undefined : { y: -3 },
});
