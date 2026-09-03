const TYPE_EMOJI: Record<string, string> = {
  TASK: '✅',
  BUG: '🐛',
  STORY: '📖',
  EPIC: '⚡',
};

const PRIORITY_EMOJI: Record<string, string> = {
  LOWEST: '⬇️',
  LOW: '🔵',
  MEDIUM: '🟡',
  HIGH: '🟠',
  HIGHEST: '🔴',
};

export async function sendTicketCreatedNotification(params: {
  key: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  projectName: string;
  projectKey: string;
  reporterName: string;
  assigneeName?: string;
  description?: string;
  projectUrl: string;
}) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const typeEmoji = TYPE_EMOJI[params.type] || '📋';
  const priorityEmoji = PRIORITY_EMOJI[params.priority] || '⚪';

  const payload = {
    text: `New ticket: ${params.key} — ${params.title}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `${typeEmoji} New Ticket Created`, emoji: true },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Ticket:*\n<${params.projectUrl}|${params.key}>` },
          { type: 'mrkdwn', text: `*Project:*\n${params.projectName} (${params.projectKey})` },
          { type: 'mrkdwn', text: `*Type:*\n${params.type}` },
          { type: 'mrkdwn', text: `*Priority:*\n${priorityEmoji} ${params.priority.replace('_', ' ')}` },
          { type: 'mrkdwn', text: `*Reporter:*\n${params.reporterName}` },
          { type: 'mrkdwn', text: `*Assignee:*\n${params.assigneeName || '_Unassigned_'}` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*${params.title}*` },
      },
      ...(params.description
        ? [{
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: params.description.slice(0, 300) + (params.description.length > 300 ? '...' : ''),
            },
          }]
        : []),
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'View in paysoc-jira', emoji: true },
            url: params.projectUrl,
            style: 'primary',
          },
        ],
      },
    ],
  };

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      console.error('Slack notification failed:', res.status, await res.text());
    }
  } catch (err) {
    console.error('Slack notification error:', err);
  }
}
