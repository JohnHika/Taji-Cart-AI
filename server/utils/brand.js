export const nawiriBrand = {
  companyName: 'Nawiri Hair Kenya',
  shortName: 'Nawiri Hair',
  motto: 'Blending quality, class, and affordability.',
  supportEmail: 'nawirihairke@gmail.com',
  phoneDisplay: '+254 703 862 741',
  phoneDial: '+254703862741',
  location: 'Mithoo Business Centre, Moi Ave, Nairobi',
  instagramHandle: '@nawiri_hairke',
  tiktokHandle: '@nawiri_hairke',
  instagramUrl: 'https://www.instagram.com/nawiri_hairke/',
  tiktokUrl: 'https://www.tiktok.com/@nawiri_hairke',
  websiteUrl: 'https://nawirihairke.com',
  // Permanent Cloudinary logo — always reachable in emails
  logoCloudinary: 'https://res.cloudinary.com/dtyyiitd3/image/upload/v1775674392/brand/nawiri_logo_email.jpg',
};

export const getBrandLogoUrl = () => {
  // Always return Cloudinary URL first — it is always reachable from email clients
  if (nawiriBrand.logoCloudinary) {
    return nawiriBrand.logoCloudinary;
  }

  const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
  if (!frontendUrl) return '';
  return `${frontendUrl}/images/nawiri_logo.jpeg`;
};
