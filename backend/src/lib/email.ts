import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '1025'),
  secure: false,
  auth: process.env.SMTP_USER
    ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    : undefined,
});

export async function sendInvitationEmail(params: {
  to: string;
  inviterName: string;
  projectName: string;
  inviteUrl: string;
}) {
  const { to, inviterName, projectName, inviteUrl } = params;
  const from = process.env.SMTP_FROM || 'noreply@ticketing.local';

  await transporter.sendMail({
    from,
    to,
    subject: `You've been invited to join ${projectName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #172B4D; }
          .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .header { background: #0052CC; color: white; padding: 24px; border-radius: 8px 8px 0 0; }
          .content { background: #f4f5f7; padding: 32px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #0052CC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: 600; margin: 16px 0; }
          .footer { margin-top: 24px; font-size: 12px; color: #6B778C; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin:0;">Ticketing App</h1>
          </div>
          <div class="content">
            <h2>You're invited!</h2>
            <p><strong>${inviterName}</strong> has invited you to join the project <strong>${projectName}</strong>.</p>
            <p>Click the button below to accept the invitation and create your account:</p>
            <a href="${inviteUrl}" class="button">Accept Invitation</a>
            <p class="footer">This invitation link expires in 7 days. If you didn't expect this email, you can safely ignore it.</p>
          </div>
        </div>
      </body>
      </html>
    `,
    text: `${inviterName} has invited you to join ${projectName}. Accept here: ${inviteUrl}`,
  });
}

export async function sendWelcomeEmail(params: { to: string; name: string }) {
  const from = process.env.SMTP_FROM || 'noreply@ticketing.local';
  const appUrl = process.env.APP_URL || 'http://localhost:5173';

  await transporter.sendMail({
    from,
    to: params.to,
    subject: 'Welcome to Ticketing App!',
    html: `
      <h2>Welcome, ${params.name}!</h2>
      <p>Your account has been created successfully.</p>
      <p><a href="${appUrl}">Go to Ticketing App</a></p>
    `,
    text: `Welcome, ${params.name}! Go to ${appUrl}`,
  });
}
