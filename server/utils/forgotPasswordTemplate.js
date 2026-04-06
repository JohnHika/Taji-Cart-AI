import { renderAccountNoticeEmail } from './emailTemplates.js';

const forgotPasswordTemplate = ({ name, otp }) =>
  renderAccountNoticeEmail({
    name,
    title: 'Your password reset code',
    intro:
      'We received a request to reset your Nawiri Hair Kenya password. Use the one-time code below to continue.',
    infoRows: [
      { label: 'Verification code', value: otp },
      { label: 'Validity', value: '1 hour' },
    ],
    highlights: [
      'Enter this code exactly as shown on the password reset screen.',
      'If you did not request a password reset, you can ignore this email and keep your account safe.',
    ],
  });

export default forgotPasswordTemplate
