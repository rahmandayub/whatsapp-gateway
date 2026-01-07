# API Usage Documentation

This document outlines the API endpoints available in the WhatsApp Gateway.
**Base URL:** `http://localhost:3000/api/v1` (Default)

---

## 🔐 Authentication

All API requests (except health check) require the `x-api-key` header.

- **Header:** `x-api-key: your-secret-key`

---

## 🔐 Session Management

### Start a New Session

Initiates a new WhatsApp session. Returns a session ID. You should listen to webhooks for the QR code.

- **Endpoint:** `POST /sessions/start`
- **Request Body:**
    ```json
    {
        "sessionId": "unique_session_id",
        "webhookUrl": "https://your-server.com/webhook"
    }
    ```
- **Response:**
    ```json
    {
        "status": "pending",
        "message": "Session creation initiated.",
        "sessionId": "unique_session_id"
    }
    ```
- **cURL Example:**
    ```bash
    curl -X POST http://localhost:3000/api/v1/sessions/start \
         -H "x-api-key: secret_key_123" \
         -H "Content-Type: application/json" \
         -d '{"sessionId": "test-session-1", "webhookUrl": "https://webhook.site/your-uuid"}'
    ```

### Get Session QR

Retrieve the QR code for a session (if status is `SCANNING_QR`).

- **Endpoint:** `GET /sessions/{sessionId}/qr`
- **Response:**
    ```json
    {
        "sessionId": "test-session-1",
        "status": "SCANNING_QR",
        "qr": "2@...base64_or_string..."
    }
    ```
- **cURL Example:**
    ```bash
    curl -H "x-api-key: secret_key_123" http://localhost:3000/api/v1/sessions/test-session-1/qr
    ```

### Get Session Status

Check the current status of a specific session.

- **Endpoint:** `GET /sessions/{sessionId}/status`
- **Response:**
    ```json
    {
        "sessionId": "unique_session_id",
        "status": "CONNECTED",
        "whatsappId": "1234567890@s.whatsapp.net"
    }
    ```
- **cURL Example:**
    ```bash
    curl -H "x-api-key: secret_key_123" http://localhost:3000/api/v1/sessions/test-session-1/status
    ```

### List All Sessions

Retrieve a list of all active sessions managed by the gateway.

- **Endpoint:** `GET /sessions`
- **Response:**
    ```json
    {
        "sessions": [
            { "sessionId": "session1", "status": "CONNECTED" },
            { "sessionId": "session2", "status": "SCANNING_QR" }
        ]
    }
    ```
- **cURL Example:**
    ```bash
    curl -H "x-api-key: secret_key_123" http://localhost:3000/api/v1/sessions
    ```

### Stop Session (Pause)

Disconnects the session from the WebSocket but keeps authentication data. You can reconnect later without rescanning QR.

- **Endpoint:** `POST /sessions/{sessionId}/stop`
- **Response:**
    ```json
    {
        "status": "success",
        "message": "Session stopped"
    }
    ```
- **cURL Example:**
    ```bash
    curl -X POST http://localhost:3000/api/v1/sessions/test-session-1/stop \
         -H "x-api-key: secret_key_123"
    ```

### Logout Session (Hard Delete)

Completely removes the session, deletes authentication files, and unlinks it from WhatsApp. Rescanning QR is required to connect again.

- **Endpoint:** `POST /sessions/{sessionId}/logout`
- **Response:**
    ```json
    {
        "status": "success",
        "message": "Session logged out and data cleared"
    }
    ```
- **cURL Example:**
    ```bash
    curl -X POST http://localhost:3000/api/v1/sessions/test-session-1/logout \
         -H "x-api-key: secret_key_123"
    ```

---

## 💬 Messaging

### Send Text Message

Sends a simple text message to a specific number.

- **Endpoint:** `POST /sessions/{sessionId}/message/send/text`
- **Request Body:**
    ```json
    {
        "to": "1234567890@s.whatsapp.net",
        "message": "Hello World!"
    }
    ```
- **Response:**
    ```json
    {
        "status": "success",
        "messageId": "msg_id_123",
        "timestamp": 1234567890
    }
    ```
- **cURL Example:**
    ```bash
    curl -X POST http://localhost:3000/api/v1/sessions/test-session-1/message/send/text \
         -H "x-api-key: secret_key_123" \
         -H "Content-Type: application/json" \
         -d '{"to": "628123456789@s.whatsapp.net", "message": "Hello from API!"}'
    ```

### Send Media Message

Sends an image, video, or document.

- **Endpoint:** `POST /sessions/{sessionId}/message/send/media`
- **Request Body:**
    ```json
    {
        "to": "1234567890@s.whatsapp.net",
        "type": "image",
        "caption": "Check this out",
        "mediaUrl": "https://example.com/image.png"
    }
    ```
- **cURL Example:**
    ```bash
    curl -X POST http://localhost:3000/api/v1/sessions/test-session-1/message/send/media \
         -H "x-api-key: secret_key_123" \
         -H "Content-Type: application/json" \
         -d '{
           "to": "628123456789@s.whatsapp.net",
           "type": "image",
           "caption": "Check this image",
           "mediaUrl": "https://via.placeholder.com/150"
         }'
    ```

---

## 🪝 Webhooks

Your application should expose a webhook endpoint (e.g., `POST /webhook`) to receive real-time updates.

### Payload Examples

**QR Code Event:**

```json
{
    "event": "qr_code",
    "sessionId": "session1",
    "qrCode": "data:image/png;base64,..."
}
```

**Message Received:**

```json
{
    "event": "message_received",
    "sessionId": "session1",
    "messageId": "msg_123",
    "from": "sender_jid",
    "type": "text",
    "text": "Hello there!"
}
```
