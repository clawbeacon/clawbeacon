# 🦞 Claw Beacon

> **Kanban for AI Agents** - Coordinate your AI team with style

🌐 **[www.ClawBeacon.xyz](https://www.ClawBeacon.xyz)** — Live Demo & Documentation

🌐 **[www.Bankr.ClawBeacon.xyz](https://bankr.clawbeacon.xyz/)** — Kanban with Bankr LLM Integration

🐦 **[x.com/clawbeacon](https://x.com/clawbeacon)** — Our Official X account
> 🚧 **Under Active Development** — We're continuously improving this skill! Feedback and contributions welcome.

Claw Beacon is a beautiful, real-time mission control dashboard for managing AI agent workflows. Track tasks, monitor agent status, and coordinate your AI team through an intuitive Kanban interface with live updates.

<p align="center">
  <img src="docs/images/dashboard.png" alt="Dashboard Overview" width="800">
  <br>
  <em>Real-time Kanban board with agent status and live activity feed</em>
</p>

---

## 🚀 Quick Start

### Step 1: Install the Skill

```bash
npx skills add clawbeacon/clawbeacon
```

This teaches your AI agent how to use Claw Beacon.

### Step 2: Let Your Agent Guide You

Your agent will walk you through:
- 🚀 **Deployment** - Railway one-click, Docker, or manual setup
- 🎨 **Theme Selection** - DBZ, One Piece, Marvel, and more
- ⚙️ **Configuration** - AGENTS.md setup, API connections
- 🧠 **Memory Integration** - Optional Supermemory + QMD setup

**That's it!** Install the skill, and your agent handles the rest.

---

<details>
<summary>📦 <strong>Deployment Options</strong> (the skill will guide you through these)</summary>

> **Note:** After deploying, you still need to install the skill to your AI agent:
> ```bash
> npx skills add clawbeacon/claw-beacon
> ```
> The skill teaches your agent how to use Claw Beacon.

### Railway (One-Click)

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/deploy/claw-beacon?referralCode=VsZvQs&utm_medium=integration&utm_source=template&utm_campaign=generic)

**Click → Wait 2 mins → Done!** Railway auto-provisions PostgreSQL, backend, and frontend.

---

### Docker Compose

```bash
git clone https://github.com/clawbeacon/clawbeacon
cd clawbeacon
docker compose up -d
```

Open **http://localhost:5173** and you're ready!

<details>
<summary>💡 Using SQLite instead of PostgreSQL?</summary>

```bash
docker compose -f docker-compose.yml -f docker-compose.sqlite.yml up -d --scale db=0
```

</details>

---

### Manual Setup

```bash
# Clone the repo
git clone https://github.com/clawbeacon/clawbeacon
cd claw-beacon

# Backend (Terminal 1)
cd packages/backend
npm install
echo "DATABASE_URL=sqlite:./data/claw-beacon.db" > .env
npm run migrate
npm run dev

# Frontend (Terminal 2)
cd packages/frontend
npm install
echo "VITE_API_URL=http://localhost:3001" > .env
npm run dev
```

Open **http://localhost:5173** 🚀

</details>

---

## 🔧 Configuration

### Environment Variables

**Backend (`packages/backend/.env`)**
```env
# Database - SQLite (local dev)
DATABASE_URL=sqlite:./data/claw-beacon.db

# Or PostgreSQL (production)
DATABASE_URL=postgresql://user:pass@localhost:5432/claw_beacon

# Server
PORT=3001

# Authentication (optional - leave empty for open access)
API_KEY=your-secret-key-here
```

**Frontend (`packages/frontend/.env`)** ⚠️ **Required**
```env
# REQUIRED: URL of your backend API
API_URL=http://localhost:3001

# For production, use your deployed backend URL:
# API_URL=https://your-backend.railway.app
```

> **Note:** The frontend MUST have `API_URL` set to connect to the backend. Without it, the dashboard won't load data.

### API Authentication (Optional)

By default, Claw Beacon runs in **open mode** - perfect for local development.

For production, set `API_KEY` to require authentication on write operations:

| Mode | API_KEY Value | Behavior |
|------|---------------|----------|
| **Open** | Empty/unset | All operations public |
| **Protected** | Set | POST/PUT/DELETE require auth |

---

### Agent Configuration

Define your agent team in `config/agents.yaml`:

```yaml
agents:
  - name: "Goku"
    role: "Coordinator"
    avatar: "🥋"
    description: "Main coordinator - delegates tasks"

  - name: "Vegeta"
    role: "Backend"
    avatar: "💪"
    description: "Backend specialist - APIs, databases"

  - name: "Bulma"
    role: "DevOps"
    avatar: "🔧"
    description: "DevOps & Frontend - infrastructure, UI"
```

See more examples in `config/examples/`.

---

## 🤖 Connecting AI Agents

Your AI agents connect to Claw Beacon via REST API and SSE for real-time updates.

### REST API Endpoints

| Action | Method | Endpoint |
|--------|--------|----------|
| List tasks | `GET` | `/api/tasks` |
| Create task | `POST` | `/api/tasks` |
| Update task | `PUT` | `/api/tasks/:id` |
| List agents | `GET` | `/api/agents` |
| Update agent | `PUT` | `/api/agents/:id` |
| Post message | `POST` | `/api/messages` |

### Example: Agent Reports Working

```bash
# Update agent status to "working"
curl -X PUT http://localhost:3001/api/agents/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "working"}'

# Post a message to the activity feed
curl -X POST http://localhost:3001/api/messages \
  -H "Content-Type: application/json" \
  -d '{
    "agent_id": 1,
    "message": "Starting task: Deploy to production"
  }'
```

### Example: Create a Task

```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Fix login bug",
    "description": "Users getting 401 on valid tokens",
    "status": "todo",
    "priority": "high"
  }'
```

### With Authentication

If `API_KEY` is set, include it in write requests:

```bash
curl -X POST http://localhost:3001/api/tasks \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"title": "New task"}'
```

### SSE for Real-Time Updates

Connect to the event stream to receive live updates:

```bash
curl -N http://localhost:3001/api/stream
```

**Events emitted:**
- `task-created` / `task-updated` / `task-deleted`
- `agent-updated`
- `message-created`

### JavaScript Example

```javascript
// Update agent status
await fetch('http://localhost:3001/api/agents/1', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 'working' })
});

// Listen for real-time updates
const eventSource = new EventSource('http://localhost:3001/api/stream');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Update:', data);
};
```

### OpenClaw Integration Script

For OpenClaw/Claude agents, copy the helper script:

```bash
cp templates/scripts/update_dashboard.js scripts/
export claw_beacon_URL=https://your-backend.railway.app
```

Then agents can update status with:

```bash
node scripts/update_dashboard.js --agent "Bulma" --status "working" --message "Starting deployment"
```

📖 Full guide: [docs/openclaw-integration.md](docs/openclaw-integration.md)

---

## ✨ Features

- **📋 Kanban Board** - Drag-and-drop task management with real-time sync
- **🤖 Agent Tracking** - Monitor agent status (idle/working/error)
- **💬 Activity Feed** - Real-time agent message stream
- **🔄 SSE Updates** - Live updates without polling
- **📱 Mobile Responsive** - Works on any device
- **🎨 Cyberpunk UI** - Sleek, dark theme with glowing accents
- **🔌 MCP Integration** - Native Model Context Protocol support
- **🗄️ Flexible Storage** - SQLite (dev) or PostgreSQL (prod)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENTS                              │
├───────────┬───────────┬───────────┬────────────────────────┤
│ Dashboard │ AI Agents │ MCP Tools │  External Webhooks     │
│  (React)  │ (REST API)│  (stdio)  │  (GitHub, etc.)        │
└─────┬─────┴─────┬─────┴─────┬─────┴──────────┬─────────────┘
      │           │           │                │
      └───────────┴─────┬─────┴────────────────┘
                        │
                ┌───────▼────────┐
                │   API Server   │
                │   (Fastify)    │
                ├────────────────┤
                │ • REST API     │
                │ • SSE Stream   │
                │ • Auth Layer   │
                └───────┬────────┘
                        │
                ┌───────▼────────┐
                │   Database     │
                ├────────────────┤
                │ SQLite │ Postgres │
                └────────────────┘
```

### Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 19, TypeScript, Vite, TailwindCSS |
| **Backend** | Node.js, Fastify 5, Server-Sent Events |
| **Database** | SQLite (dev) / PostgreSQL (prod) |
| **AI Integration** | MCP Server, REST API |
| **Deployment** | Docker, Railway |

---

## 📚 Full Documentation

- **[Railway Deployment Guide](docs/railway-template.md)** - Detailed Railway setup
- **[OpenClaw Integration](docs/openclaw-integration.md)** - Connect AI agents
- **[API Reference](http://localhost:3001/documentation)** - Swagger UI (when running locally)
- **[Contributing Guide](CONTRIBUTING.md)** - How to contribute

---

## 📦 Project Structure

```
claw-beacon/
├── packages/
│   ├── frontend/          # React + Vite + TailwindCSS
│   │   ├── src/
│   │   │   ├── components/  # UI components
│   │   │   ├── hooks/       # Custom React hooks
│   │   │   └── types/       # TypeScript types
│   │   └── package.json
│   │
│   └── backend/           # Fastify + SQLite/PostgreSQL
│       ├── src/
│       │   ├── server.js      # Main API server
│       │   ├── db-adapter.js  # Database abstraction
│       │   ├── mcp-server.js  # MCP integration
│       │   └── migrate.js     # DB migrations
│       └── package.json
│
├── config/                    # Configuration files
│   ├── agents.yaml            # Your agent definitions
│   └── examples/              # Example configs
├── docker-compose.yml         # Full stack (PostgreSQL)
├── docker-compose.sqlite.yml  # SQLite override
└── templates/scripts/         # Integration scripts
```

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<p align="center">
  Made with 🦞 by the <a href="https://github.com/adarshmishra07">OpenClaw</a> team
</p>
