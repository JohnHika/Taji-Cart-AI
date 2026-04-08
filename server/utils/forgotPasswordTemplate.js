import { renderAccountNoticeEmail } from './emailTemplates.js';

const forgotPasswordTemplate = ({ name, otp }) =>
  renderAccountNoticeEmail({
    name,
    title: 'Reset your password',
    headerGradient: 'linear-gradient(135deg, #160a2e 0%, #2a1a4a 52%, #9b6dd4 100%)',
    intro:
      'We received a request to reset your Nawiri Hair Kenya account password. Use the one-time code below to continue. It expires in 1 hour.',
    codeBlock: otp,
    highlights: [
      'Enter this code exactly as shown on the password reset screen.',
      'This code is valid for 1 hour only.',
      'If you did not request a password reset, your account is safe — simply ignore this email.',
    ],
    footerNote: 'For your security, never share this code with anyone. Nawiri Hair Kenya will never ask for it.',
  });

export default forgotPasswordTemplate;
