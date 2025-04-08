// In your valideURLConvert.js utility
export const valideURLConvert = (text) => {
  if (!text) return '';
  
  // First, limit the length to avoid extremely long URLs
  const truncatedText = text.length > 60 ? text.slice(0, 60) + '...' : text;
  
  // Replace problematic characters and spaces
  return truncatedText
    .toLowerCase()
    .replace(/[&\/\\#,+()$~%.'":*?<>{}]/g, '')  // Remove special characters
    .replace(/\s+/g, '-')                       // Replace spaces with hyphens
    .replace(/-+/g, '-')                        // Replace multiple hyphens with a single hyphen
    .trim();                                    // Remove leading/trailing whitespace
};