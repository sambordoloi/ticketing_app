# Ticketing App

A Jira-like project management and ticketing application built with React, Node.js, PostgreSQL, and Docker. Create projects, manage issues on a Kanban board, and invite team members via email.

## Features

- **Project Management** — Create projects with unique keys (e.g., PROJ, DEMO)
- **Kanban Board** — Drag-and-drop issues across To Do, In Progress, In Review, and Done
- **Issue Tracking** — Tasks, bugs, stories, and epics with priority levels
- **Comments** — Discuss issues with threaded comments
- **User Invitations** — Invite team members by email with role-based access (Admin/Member)
- **Email Notifications** — Invitation emails sent via SMTP (Mailpit for development)
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
| **API** | http://localhost:3001 |
| **Mailpit** (view emails) | http://localhost:8025 |

### Demo Login

- **Email:** admin@ticketing.local
- **Password:** admin123

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
5. In development, view emails at http://localhost:8025

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

## Email Configuration

### Development (default)

Mailpit captures all outgoing emails. No configuration needed.

### Production

Set these environment variables in `docker-compose.yml` or `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=noreply@yourdomain.com
APP_URL=https://your-app-domain.com
JWT_SECRET=your-secure-random-secret
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Backend | Node.js, Express, TypeScript, Prisma |
| Database | PostgreSQL 16 |
| Auth | JWT |
| Email | Nodemailer |
| Dev Email | Mailpit |

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
