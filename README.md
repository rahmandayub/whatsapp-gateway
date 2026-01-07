# WhatsApp Gateway API

A scalable WhatsApp Gateway API built with Node.js, Express, and Baileys. Ideally suited for handling multiple WhatsApp sessions via a RESTful interface.

## 🚀 Features (Planned)

- **Multi-session Support**: Manage multiple WhatsApp accounts concurrently.
- **RESTful API**: Simple endpoints to send messages, manage sessions, and more.
- **Webhooks**: Real-time notifications for incoming messages and delivery status.
- **Media Support**: Send images, videos, documents, and audio.
- **Swagger/OpenAPI Documentation**: (Coming soon)

## 🛠 Prerequisites

Before you begin, ensure you have the following installed:

- [Node.js](https://nodejs.org/) (v18 or higher)
- [Docker](https://www.docker.com/) & Docker Compose (for Database and Redis)
- [Git](https://git-scm.com/)

## ⚙️ Configuration

1.  **Clone the repository:**

    ```bash
    git clone <repository-url>
    cd whatsapp-gateway
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Environment Variables:**
    Copy the example environment file and configure it:

    ```bash
    cp .env.example .env
    ```

    Edit `.env` with your preferred settings:

    | Variable      | Description                                     | Default            |
    | :------------ | :---------------------------------------------- | :----------------- |
    | `PORT`        | The port the API server listens on              | `3000`             |
    | `DB_USER`     | PostgreSQL username                             | `postgres`         |
    | `DB_PASSWORD` | PostgreSQL password                             | `postgres`         |
    | `DB_NAME`     | Database name                                   | `whatsapp_gateway` |
    | `DB_HOST`     | Database host                                   | `localhost`        |
    | `REDIS_HOST`  | Redis host                                      | `localhost`        |
    | `REDIS_PORT`  | Redis port                                      | `6379`             |
    | `LOG_LEVEL`   | Logging level (fatal, error, warn, info, debug) | `info`             |

## 🏗 Infrastructure (Docker)

This project uses Docker Compose to run PostgreSQL and Redis.

**Start Services:**

```bash
docker compose up -d
```

**Stop Services:**

```bash
docker compose down
```

## 🏃 Running the Application

### Development Mode

Runs the server with `nodemon` for hot-reloading.

```bash
npm run dev
```

### Production Mode

```bash
npm start
```

### Proof of Concept (POC)

To test the core Baileys connectivity independently of the API:

```bash
node src/poc/baileys.js
```

This will display a QR code in the terminal (if `printQRInTerminal` is enabled) or log connection events.

## 📚 API Documentation

Detailed API usage is documented in [docs/api_usage.md](docs/api_usage.md).
