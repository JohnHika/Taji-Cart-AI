/**
 * Trims trailing slashes from a string
 * @param {string} value - The string to trim
 * @returns {string} - The string without trailing slashes
 */
const trimTrailingSlash = (value = '') => value.replace(/\/$/, '');

export default trimTrailingSlash;
