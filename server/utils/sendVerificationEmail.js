import jwt from 'jsonwebtoken';
import sendEmail from '../config/sendEmail.js';
import verifyEmailTemplate from './verifyEmailTemplate.js';

export const buildEmailVerificationToken = (user) =>
  jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      purpose: 'verify-email',
    },
    process.env.JWT_SECRET || 'fallback-secret',
    { expiresIn: '24h' }
  );

export const sendVerificationEmail = async (user) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const token = buildEmailVerificationToken(user);
  const verifyUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(
    user.email
  )}`;

  return sendEmail({
    sendTo: user.email,
    subject: 'Verify your Nawiri Hair Kenya email address',
    html: verifyEmailTemplate({
      name: user.name,
      url: verifyUrl,
    }),
  });
};
