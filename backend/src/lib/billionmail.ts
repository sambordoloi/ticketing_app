import https from 'https';
import http from 'http';

interface BillionMailResponse {
  success: boolean;
  code: number;
  msg: string;
  data: unknown;
}

function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<BillionMailResponse> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const payload = JSON.stringify(body);
    const isHttps = parsed.protocol === 'https:';

    const options: https.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: `${parsed.pathname}${parsed.search}`,
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': Buffer.byteLength(payload),
      },
    };

    if (isHttps && process.env.BILLIONMAIL_TLS_INSECURE === 'true') {
      options.rejectUnauthorized = false;
    }

    const request = (isHttps ? https : http).request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data) as BillionMailResponse;
          if (!res.statusCode || res.statusCode >= 400 || !json.success) {
            reject(new Error(json.msg || `BillionMail API error (${res.statusCode})`));
            return;
          }
          resolve(json);
        } catch (err) {
          reject(err);
        }
      });
    });

    request.on('error', reject);
    request.write(payload);
    request.end();
  });
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

  await postJson(
    `${baseUrl}/api/batch_mail/api/send`,
    {
      'Content-Type': 'application/json',
      'X-API-Key': params.apiKey,
    },
    body
  );
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
