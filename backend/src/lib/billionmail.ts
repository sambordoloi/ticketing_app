import { Agent } from 'node:undici';

interface BillionMailResponse {
  success: boolean;
  code: number;
  msg: string;
  data: unknown;
}

function getFetchOptions(): { dispatcher?: Agent } {
  if (process.env.BILLIONMAIL_TLS_INSECURE === 'true') {
    return { dispatcher: new Agent({ connect: { rejectUnauthorized: false } }) };
  }
  return {};
}

async function sendViaBillionMail(params: {
  apiKey: string;
  recipient: string;
  attribs?: Record<string, string>;
  addresser?: string;
}): Promise<void> {
  const baseUrl = (process.env.BILLIONMAIL_API_URL || '').replace(/\/$/, '');
  if (!baseUrl || !params.apiKey) {
    throw new Error('BillionMail API not configured');
  }

  const body: Record<string, unknown> = {
    recipient: params.recipient,
  };

  const addresser = params.addresser || process.env.BILLIONMAIL_FROM;
  if (addresser) body.addresser = addresser;

  if (params.attribs && Object.keys(params.attribs).length > 0) {
    body.attribs = params.attribs;
  }

  const res = await fetch(`${baseUrl}/api/batch_mail/api/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': params.apiKey,
    },
    body: JSON.stringify(body),
    ...getFetchOptions(),
  });

  const data = (await res.json()) as BillionMailResponse;
  if (!res.ok || !data.success) {
    throw new Error(data.msg || `BillionMail API error (${res.status})`);
  }
}

export function isBillionMailConfigured(): boolean {
  return !!(process.env.BILLIONMAIL_API_URL && process.env.BILLIONMAIL_INVITE_API_KEY);
}

export async function sendInvitationViaBillionMail(params: {
  to: string;
  inviterName: string;
  projectName: string;
  inviteUrl: string;
}) {
  await sendViaBillionMail({
    apiKey: process.env.BILLIONMAIL_INVITE_API_KEY!,
    recipient: params.to,
    attribs: {
      inviter_name: params.inviterName,
      project_name: params.projectName,
      invite_url: params.inviteUrl,
      app_url: process.env.APP_URL || 'http://localhost:5173',
    },
  });
}

export async function sendWelcomeViaBillionMail(params: { to: string; name: string }) {
  const apiKey = process.env.BILLIONMAIL_WELCOME_API_KEY || process.env.BILLIONMAIL_INVITE_API_KEY!;
  const appUrl = process.env.APP_URL || 'http://localhost:5173';

  await sendViaBillionMail({
    apiKey,
    recipient: params.to,
    attribs: {
      name: params.name,
      app_url: appUrl,
    },
  });
}
