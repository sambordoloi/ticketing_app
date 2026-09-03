# paysoc-jira

A Jira-like project management application built with React, Node.js, PostgreSQL, and Docker.

## Features

- **Project Management** — Create projects with unique keys (e.g., PROJ, DEMO)
- **Kanban Board** — Drag-and-drop issues across To Do, In Progress, In Review, and Done
- **Issue Tracking** — Tasks, bugs, stories, and epics with priority levels
- **Comments** — Discuss issues with threaded comments
- **User Invitations** — Invite team members by email with role-based access (Admin/Member)
- **Email Notifications** — Invitation emails sent via BillionMail or any SMTP server
- **Slack Notifications** — Get a Slack message when a new ticket is created

## Quick Start

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose

### Run with Docker

```bash
git clone https://github.com/sambordoloi/ticketing_app.git
cd ticketing_app
docker-compose up --build
```

Once all services are running:

| Service | URL |
|---------|-----|
| **App** | http://localhost:5173 |
| **API** | http://localhost:3002 |
| **Mailpit** (dev only) | http://localhost:8025 |

### Demo Login

- **Email:** admin@ticketing.local
- **Password:** admin123

## Create Admin Users

Admin access is **per project**. The `db:create-admins` script creates user accounts (if they don't exist) and makes them **ADMIN** on every project.

### Default datacultr admins

If `ADMIN_USERS` is not set, the script creates these three users:

| Email | Name |
|-------|------|
| samyajyoti@datacultr.com | Samyajyoti |
| sujoy@datacultr.com | Sujoy |
| pushpender.singh@datacultr.com | Pushpender Singh |

**On your server** (after `docker-compose up` is running):

```bash
git pull origin main
docker-compose exec backend npm run db:create-admins
```

Default password: **`Admin@12345`** (unless you set `ADMIN_DEFAULT_PASSWORD`).

### Add anyone via environment variable

Yes — you can add **any email** without editing code:

```bash
docker-compose exec \
  -e ADMIN_USERS="alice@company.com:Alice,bob@company.com:Bob Smith" \
  -e ADMIN_DEFAULT_PASSWORD="YourSecurePassword123" \
  backend npm run db:create-admins
```

Format: `email:Display Name` — comma-separated. If you omit the name, the part before `@` is used.

### Custom password

```bash
docker-compose exec \
  -e ADMIN_DEFAULT_PASSWORD="YourSecurePassword123" \
  backend npm run db:create-admins
```

**Note:** Existing users keep their current password; only **new** accounts get this password. Promoted users get the ADMIN role on all projects.

### Requirements

- At least one project must exist (run seed or create a project first).
- Re-running the script is safe — it upserts users and promotes them to ADMIN.

## Usage

### Creating a Project

1. Sign in and click **New Project**
2. Enter a project key (uppercase, e.g., `MYAPP`) and name
3. Open the project to see the Kanban board

### Managing Issues

- Click **Create Issue** or **Add issue** in any column
- Drag issues between columns to change status
- Click an issue to edit details, assign members, or add comments

### Inviting Users

1. Open a project where you're an Admin
2. Click **Invite**
3. Enter the email address and role
4. The user receives an email with an invitation link
5. The user receives the invitation email via your mail server

## Email Configuration (BillionMail API)

The app can send emails **directly via BillionMail API** (no SMTP needed) or fall back to SMTP.

### Option A: BillionMail API (recommended)

Requires BillionMail **v4.6+**.

#### 1. Create email template in BillionMail

Copy the HTML from `billionmail-templates/invite.html` into BillionMail → **Email Templates → Create Template**.

The template matches the Jira-style invite design and uses these variables:

| Variable | Example |
|----------|---------|
| `{{.API.inviter_name}}` | Admin User (whoever clicks Invite) |
| `{{.API.project_name}}` | Demo Project |
| `{{.API.invite_url}}` | https://jira.slj15.com/accept-invite?token=... |
| `{{.API.app_url}}` | https://jira.slj15.com |

#### 2. Create API keys in BillionMail

Go to **Sending API → Create API** for each template:
- Bind the invite template → copy the API key
- Bind the welcome template → copy the API key (optional; invite key is reused if omitted)

#### 3. Configure `.env`

```env
BILLIONMAIL_API_URL=https://mail.slj15.com
BILLIONMAIL_INVITE_API_KEY=your-invite-api-key
BILLIONMAIL_WELCOME_API_KEY=your-welcome-api-key
BILLIONMAIL_FROM=noreply@slj15.com
APP_URL=https://jira.slj15.com
```

| Variable | Description |
|----------|-------------|
| `BILLIONMAIL_API_URL` | Your BillionMail server URL |
| `BILLIONMAIL_INVITE_API_KEY` | API key for the invite template |
| `BILLIONMAIL_WELCOME_API_KEY` | API key for welcome email (optional) |
| `BILLIONMAIL_FROM` | Sender address (must exist in BillionMail) |

When `BILLIONMAIL_API_URL` and `BILLIONMAIL_INVITE_API_KEY` are set, the app uses the API automatically — SMTP is not used.

#### API endpoint used

```
POST {BILLIONMAIL_API_URL}/api/batch_mail/api/send
Header: X-API-Key: {BILLIONMAIL_INVITE_API_KEY}
Body: { "recipient": "...", "attribs": { "inviter_name": "...", ... } }
```

Docs: https://www.billionmail.com/start/api_mail_guide.html

### Option B: SMTP fallback

If BillionMail API keys are not set, the app falls back to SMTP:

```env
SMTP_HOST=mail.slj15.com
SMTP_PORT=587
SMTP_USER=noreply@slj15.com
SMTP_PASS=your-mailbox-password
SMTP_FROM=noreply@slj15.com
```

### Restart

```bash
docker-compose down
docker-compose up --build -d
```

### Local development (optional Mailpit)

```bash
docker compose --profile dev up --build
```

With SMTP env pointing to Mailpit — see `.env.example`.

## Slack Configuration

Get notified in Slack whenever a new ticket is created.

### Setup

1. Go to [Slack API → Incoming Webhooks](https://api.slack.com/messaging/webhooks)
2. Create a new webhook for your workspace and pick a channel (e.g. `#tickets`)
3. Copy the webhook URL
4. Add it to your environment:

```env
SLACK_WEBHOOK_URL=<your-slack-incoming-webhook-url>
```

For Docker, either set it in a `.env` file at the project root or export it before running:

```bash
export SLACK_WEBHOOK_URL="<your-slack-incoming-webhook-url>"
docker-compose up --build
```

When someone creates a ticket, Slack receives a message with the ticket key, title, type, priority, reporter, assignee, and a link to the project board.

If `SLACK_WEBHOOK_URL` is not set, Slack notifications are silently skipped.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express, TypeScript, Prisma |
| Database | PostgreSQL 16 |
| Auth | JWT |
| Email | BillionMail API or Nodemailer SMTP |
| Dev Email | Mailpit (optional, `--profile dev`) |

## Project Structure

```
├── docker-compose.yml      # Orchestrates all services
├── backend/
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── lib/            # Email, Prisma client
│   │   └── middleware/     # Auth middleware
│   └── prisma/             # Database schema & seed
└── frontend/
    └── src/
        ├── pages/          # Login, Projects, Board
        └── components/     # Issue modal, Invite modal
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/accept-invite` | Accept email invitation |
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create project |
| POST | `/api/projects/:id/invite` | Send email invitation |
| GET | `/api/projects/:id/issues` | List issues |
| POST | `/api/projects/:id/issues` | Create issue |
| PATCH | `/api/projects/:id/issues/:issueId` | Update issue |

## License

MIT
