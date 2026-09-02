import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

// Outbound mail is best-effort and optional. When SMTP_HOST / SMTP_USER /
// SMTP_PASS are all set (a real provider - Gmail app password, SendGrid,
// Mailgun, ...) a message is sent; otherwise it is logged and nothing is
// sent. Same shape as the Supabase-Storage fallback in uploads.routes.ts: a
// fresh local checkout works with zero configuration, production opts in.
const smtpConfigured = Boolean(env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS);

const transport = smtpConfigured
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT ?? 587,
      secure: (env.SMTP_PORT ?? 587) === 465,
      auth: { user: env.SMTP_USER as string, pass: env.SMTP_PASS as string },
    })
  : null;

const fromAddress = env.SMTP_FROM || env.SMTP_USER || env.CONTACT_EMAIL;

export interface MailInput {
  to: string;
  subject: string;
  text: string;
  replyTo?: string;
}

/**
 * Send an email. Never throws - a mail failure must not fail the request that
 * triggered it (the contact message is already saved to the database and the
 * admins are already notified in-app by the time this runs). Returns whether
 * a message was actually handed to a transport.
 */
export async function sendMail(input: MailInput): Promise<boolean> {
  if (!transport) {
    console.log(
      `[email] not sent (SMTP not configured) - to=${input.to} subject=${JSON.stringify(input.subject)}`,
    );
    return false;
  }

  try {
    await transport.sendMail({
      from: fromAddress,
      to: input.to,
      subject: input.subject,
      text: input.text,
      replyTo: input.replyTo,
    });
    return true;
  } catch (err) {
    console.error('[email] send failed:', err);
    return false;
  }
}
