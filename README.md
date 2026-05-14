# WhatsApp Gateway API

A secure, multi-tenant WhatsApp Gateway API built with Node.js, Express, and Baileys. Supports multiple WhatsApp sessions with strict API-key-based ownership isolation.

## 🚀 Features

- **Multi-tenant API Key Architecture**: Per-tenant API keys with isolated session ownership
- **Admin Console**: Web interface for managing API keys and viewing all sessions
- **Multi-session Support**: Manage multiple WhatsApp accounts concurrently with UUID-based internal identifiers
- **Session Ownership**: Sessions are bound to API keys; cross-tenant access is impossible
- **Webhooks**: HMAC-signed real-time notifications for incoming messages and delivery status
- **Media Support**: Send images, videos, documents, and audio
- **Message Queuing**: High-performance asynchronous message processing with Redis & BullMQ
- **Audit Logging**: Track admin and API key actions

## 🛠 Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Docker](https://www.docker.com/) & Docker Compose
- [Git](https://git-scm.com/)

## ⚙️ Configuration

1. **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd whatsapp-gateway
    ```

2. **Install dependencies:**

    ```bash
    npm install
    cd frontend && npm install && cd ..
    ```

3. **Run the interactive setup script:**

    ```bash
    npm run configure:fresh
    ```

    This will:
    - Generate secure credentials (admin password, JWT secret, master API key, webhook signing secret)
    - Write `.env` with Docker Compose-compatible escaping
    - Optionally start Docker infrastructure (`docker compose up -d --build`)
    - Wait for PostgreSQL to be ready
    - Run database migrations automatically

    After setup, just run:

    ```bash
    npm run backend:dev
    ```

## 🔐 Authentication

### Admin Access

The built-in web admin console uses username/password authentication with JWT cookies (`httpOnly`, `Secure`, `SameSite=Strict`). Admin endpoints are under `/api/v1/admin/*`.

### API Access

All messaging endpoints require a valid API key via the `X-API-Key` header. API keys are created and managed via the admin console. Each key can own multiple sessions, and sessions are strictly isolated per key.

### Master API Key

A master API key (set in `.env`) can also be used via the `X-Admin-Key` header to access admin endpoints programmatically.

## 🏗 Infrastructure (Docker)

```bash
# Start PostgreSQL and Redis
docker compose up -d

# Stop
docker compose down
```

## 🏃 Running the Application

### Development

```bash
# Terminal 1: Backend
npm run backend:dev

# Terminal 2: Frontend
npm run frontend:dev
```

### Production

```bash
npm run build
npm start
```

### Database Migrations

```bash
npm run migrate:up
```

## 📚 API Documentation

Detailed API usage is documented in [docs/api_usage.md](docs/api_usage.md).

## 🔒 Security Notes

- Redis and PostgreSQL bind to `127.0.0.1` by default in Docker Compose.
- Webhooks are signed with HMAC-SHA256 when `WEBHOOK_SIGNING_SECRET` is configured.
- HTTPS-only webhooks are enforced in production (`NODE_ENV=production`).
- Rate limits are split: stricter for public endpoints, default for API routes.
- The app supports reverse proxy setups via `TRUST_PROXY`.
