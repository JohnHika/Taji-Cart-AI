import { renderAccountNoticeEmail } from './emailTemplates.js';

const verifyEmailTemplate = ({ name, url }) =>
  renderAccountNoticeEmail({
    name,
    title: name ? `Welcome, ${name}!` : 'Welcome to Nawiri Hair Kenya!',
    intro:
      'Thank you for joining Nawiri Hair Kenya — your destination for premium wigs, weaves, braids, and extensions that blend quality, class, and affordability. Confirm your email address to activate your account and start shopping.',
    highlights: [
      'Browse and order from our full collection of premium hair products.',
      'Earn loyalty points on every purchase and redeem them for exclusive discounts.',
      'Get early access to new arrivals and member-only deals delivered to your inbox.',
    ],
    ctaLabel: 'Verify my email address',
    ctaUrl: url,
    supportingText:
      'Button not working? Copy and paste the link below into your browser. This link expires in 24 hours.',
    footerNote: 'If you did not create a Nawiri Hair Kenya account, you can safely ignore this email.',
  });

export default verifyEmailTemplate;
