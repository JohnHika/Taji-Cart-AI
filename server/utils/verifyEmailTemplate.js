import { renderAccountNoticeEmail } from './emailTemplates.js';

const verifyEmailTemplate = ({ name, url }) =>
  renderAccountNoticeEmail({
    name,
    title: 'Confirm your email address',
    intro:
      'Welcome to Nawiri Hair Kenya. Please confirm your email address to protect your account and activate secure sign-in.',
    highlights: [
      'Email verification is required before you can sign in with your password.',
      'The verification link expires automatically for your safety.',
      'Once confirmed, you will receive account and order updates at this address.',
    ],
    ctaLabel: 'Verify email address',
    ctaUrl: url,
    supportingText:
      'If the button does not open, copy and paste the verification link into your browser.',
  });

export default verifyEmailTemplate
