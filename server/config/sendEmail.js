import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { nawiriBrand } from '../utils/brand.js';

dotenv.config();

const smtpService = process.env.SMTP_SERVICE || process.env.MAILER_SERVICE || '';
const smtpHost = process.env.SMTP_HOST || process.env.MAILER_HOST || '';
const smtpPort = Number(process.env.SMTP_PORT || process.env.MAILER_PORT || 587);
const smtpUser =
    process.env.SMTP_USER ||
    process.env.MAILER_USER ||
    process.env.MAILER_EMAIL ||
    '';
const smtpPass =
    process.env.SMTP_PASS ||
    process.env.MAILER_PASS ||
    process.env.MAILER_PASSWORD ||
    '';
const smtpSecureRaw =
    process.env.SMTP_SECURE ||
    process.env.MAILER_SECURE ||
    (smtpPort === 465 ? 'true' : 'false');

const smtpSecure = ['true', '1', 'yes'].includes(String(smtpSecureRaw).toLowerCase());
const emailFrom = process.env.EMAIL_FROM || `${nawiriBrand.companyName} <${smtpUser || nawiriBrand.supportEmail}>`;
const replyTo = process.env.EMAIL_REPLY_TO || nawiriBrand.supportEmail;

let transporter;

const buildTransport = () => {
    if (transporter) {
        return transporter;
    }

    if (!smtpUser || !smtpPass || (!smtpService && !smtpHost)) {
        throw new Error(
            'Email provider is not configured. Set SMTP_USER, SMTP_PASS, and either SMTP_SERVICE or SMTP_HOST in the server environment.'
        );
    }

    transporter = nodemailer.createTransport(
        smtpService
            ? {
                  service: smtpService,
                  auth: {
                      user: smtpUser,
                      pass: smtpPass,
                  },
              }
            : {
                  host: smtpHost,
                  port: smtpPort,
                  secure: smtpSecure,
                  auth: {
                      user: smtpUser,
                      pass: smtpPass,
                  },
              }
    );

    return transporter;
};

const sendEmail = async ({ sendTo, subject, html }) => {
    const mailTransport = buildTransport();

    try {
        const info = await mailTransport.sendMail({
            from: emailFrom,
            to: Array.isArray(sendTo) ? sendTo : [sendTo],
            subject,
            html,
            replyTo,
        });

        return info;
    } catch (error) {
        console.error('Email send failed:', error.message);
        throw new Error(`Email delivery failed: ${error.message}`);
    }
};

export default sendEmail;

