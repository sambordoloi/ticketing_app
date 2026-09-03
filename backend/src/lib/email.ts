import nodemailer from 'nodemailer';
import {
  isBillionMailConfigured,
  sendInvitationViaBillionMail,
  sendWelcomeViaBillionMail,
} from './billionmail';
import { buildInviteEmailHtml, buildInviteEmailText } from './inviteEmailTemplate';

function createTransporter() {
  const port = parseInt(process.env.SMTP_PORT || '587');
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port,
    secure,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
    tls: process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'false'
      ? { rejectUnauthorized: false }
      : undefined,
  });
}

const transporter = createTransporter();

export async function sendInvitationEmail(params: {
  to: string;
  inviterName: string;
  projectName: string;
  inviteUrl: string;
}) {
  if (isBillionMailConfigured()) {
    return sendInvitationViaBillionMail(params);
  }

  const { to, inviterName, projectName, inviteUrl } = params;
  const from = process.env.SMTP_FROM || 'noreply@ticketing.local';
  const appUrl = process.env.APP_URL || 'http://localhost:5173';

  await transporter.sendMail({
    from,
    to,
    subject: `${inviterName} invited you to join paysoc-jira`,
    html: buildInviteEmailHtml({ inviterName, projectName, inviteUrl, appUrl }),
    text: buildInviteEmailText({ inviterName, projectName, inviteUrl }),
  });
}

export async function sendWelcomeEmail(params: { to: string; name: string }) {
  if (isBillionMailConfigured()) {
    return sendWelcomeViaBillionMail(params);
  }

  const from = process.env.SMTP_FROM || 'noreply@ticketing.local';
  const appUrl = process.env.APP_URL || 'http://localhost:5173';

  await transporter.sendMail({
    from,
    to: params.to,
    subject: 'Welcome to paysoc-jira!',
    html: `
      <h2>Welcome, ${params.name}!</h2>
      <p>Your account has been created successfully.</p>
      <p><a href="${appUrl}">Go to paysoc-jira</a></p>
    `,
    text: `Welcome, ${params.name}! Go to ${appUrl}`,
  });
}
