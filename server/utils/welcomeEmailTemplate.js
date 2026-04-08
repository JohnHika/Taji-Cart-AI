import { renderAccountNoticeEmail } from './emailTemplates.js';
import { nawiriBrand } from './brand.js';

const welcomeEmailTemplate = ({ name }) =>
  renderAccountNoticeEmail({
    name,
    title: name ? `Welcome, ${name}!` : 'Welcome to Nawiri Hair Kenya!',
    intro:
      'Your account is all set. You signed in with Google so there is nothing more to verify — you can start shopping right away. We are thrilled to have you as part of the Nawiri community.',
    highlights: [
      'Browse premium wigs, weaves, braids, and extensions in our full collection.',
      'You have been awarded 100 welcome loyalty points — use them on your next order.',
      'Track your orders and earn more points every time you shop.',
    ],
    ctaLabel: 'Start Shopping',
    ctaUrl: nawiriBrand.websiteUrl,
    footerNote: 'Welcome to the family. We are here whenever you need styling guidance, product advice, or order support.',
  });

export default welcomeEmailTemplate;
