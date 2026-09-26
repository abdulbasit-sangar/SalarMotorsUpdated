// New service: sends transactional emails via SMTP (nodemailer).
// No email service existed in the project before this — kept minimal and
// scoped to what the password-reset flow needs.
import nodemailer from "nodemailer";

let transporter = null;

// Lazily created so a missing SMTP config doesn't crash the app at boot —
// it only surfaces when an email actually needs to be sent.
const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return transporter;
};

/**
 * Sends the password-reset OTP email to an admin.
 * Branded consistently with the "SALAR MOTORS" product name.
 */
export const sendPasswordResetOtpEmail = async ({ to, otp }) => {
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

  const subject = "Salar Motors — Password Reset Verification";

  const text = `SALAR MOTORS
Password Reset Verification

Your verification code is:

${otp}

This code expires in 1 minute.

If you did not request a password reset, you can safely ignore this email.`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
      <p style="letter-spacing: 2px; font-size: 12px; text-transform: uppercase; color: #a67c3d; margin-bottom: 4px;">Salar Motors</p>
      <h2 style="margin-top: 0;">Password Reset Verification</h2>
      <p>Your verification code is:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 16px 0;">${otp}</p>
      <p style="color: #555;">This code expires in 1 minute.</p>
      <p style="color: #888; font-size: 13px;">If you did not request a password reset, you can safely ignore this email.</p>
    </div>
  `;

  await getTransporter().sendMail({
    from: fromAddress,
    to,
    subject,
    text,
    html,
  });
};

/**
 * Sends the manager registration email-verification OTP.
 * Reuses the same transporter/config as the password-reset email —
 * no second email provider or transporter introduced.
 */
export const sendManagerVerificationOtpEmail = async ({ to, otp }) => {
  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER;

  const subject = "Salar Motors — Verify Your Manager Account Email";

  const text = `SALAR MOTORS
Manager Account Email Verification

Your verification code is:

${otp}

This code expires in 1 minute.

If you did not request a manager account, you can safely ignore this email.`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
      <p style="letter-spacing: 2px; font-size: 12px; text-transform: uppercase; color: #a67c3d; margin-bottom: 4px;">Salar Motors</p>
      <h2 style="margin-top: 0;">Verify Your Manager Account Email</h2>
      <p>Your verification code is:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 16px 0;">${otp}</p>
      <p style="color: #555;">This code expires in 1 minute.</p>
      <p style="color: #888; font-size: 13px;">If you did not request a manager account, you can safely ignore this email.</p>
    </div>
  `;

  await getTransporter().sendMail({
    from: fromAddress,
    to,
    subject,
    text,
    html,
  });
};
