export function buildInviteEmailHtml(params: {
  inviterName: string;
  projectName: string;
  inviteUrl: string;
  appName?: string;
  appUrl?: string;
}): string {
  const appName = params.appName || process.env.APP_NAME || 'paysoc-jira';
  const appUrl = params.appUrl || process.env.APP_URL || 'http://localhost:5173';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Invitation to ${appName}</title>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#ffffff;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td style="padding-right:8px;vertical-align:middle;">
                    <div style="width:32px;height:32px;background-color:#0052CC;border-radius:4px;display:inline-block;text-align:center;line-height:32px;color:#ffffff;font-weight:700;font-size:14px;">T</div>
                  </td>
                  <td style="vertical-align:middle;font-size:22px;font-weight:600;color:#172B4D;">${appName}</td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Headline -->
          <tr>
            <td style="padding-bottom:16px;font-size:28px;line-height:36px;font-weight:700;color:#172B4D;">
              ${params.inviterName} invited you to join them in ${appName}
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding-bottom:28px;font-size:16px;line-height:24px;color:#42526E;">
              Start planning and tracking work with ${params.inviterName} and your team on
              <strong>${params.projectName}</strong>. You can share your work and view what your team is doing.
            </td>
          </tr>
          <!-- CTA Button -->
          <tr>
            <td style="padding-bottom:40px;">
              <a href="${params.inviteUrl}"
                 style="display:inline-block;background-color:#0052CC;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:4px;">
                Accept Invite
              </a>
            </td>
          </tr>
          <!-- Divider -->
          <tr>
            <td style="padding-bottom:24px;border-top:1px solid #DFE1E6;"></td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="font-size:14px;line-height:22px;color:#42526E;">
              <strong style="color:#172B4D;">What is ${appName}?</strong><br />
              A software tool for project and issue tracking across your team. Plan, track and manage your projects.
              <a href="${appUrl}" style="color:#0052CC;text-decoration:none;">Learn more</a>
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;font-size:12px;line-height:18px;color:#6B778C;">
              This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function buildInviteEmailText(params: {
  inviterName: string;
  projectName: string;
  inviteUrl: string;
  appName?: string;
}): string {
  const appName = params.appName || process.env.APP_NAME || 'paysoc-jira';
  return `${params.inviterName} invited you to join them in ${appName}.

Start planning and tracking work with ${params.inviterName} and your team on ${params.projectName}.

Accept invite: ${params.inviteUrl}

This invitation expires in 7 days.`;
}
