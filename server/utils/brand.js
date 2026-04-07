export const nawiriBrand = {
  companyName: 'Nawiri Hair Kenya',
  shortName: 'Nawiri Hair',
  motto: 'Blending quality, class, and affordability.',
  supportEmail: 'nawirihairke@gmail.com',
  phoneDisplay: '0703 862 741',
  phoneDial: '+254703862741',
  location: 'Mithoo Business Centre, Moi Ave',
  instagramHandle: '@nawiri_hairke',
  tiktokHandle: '@nawiri_hairke',
  instagramUrl: 'https://www.instagram.com/nawiri_hairke/',
  tiktokUrl: 'https://www.tiktok.com/@nawiri_hairke',
  websiteUrl: 'https://nawirihairke.com',
};

export const getBrandLogoUrl = () => {
  const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');

  if (!frontendUrl) {
    return '';
  }

  return `${frontendUrl}/images/nawiri_logo.jpeg`;
};
