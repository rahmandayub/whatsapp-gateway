# Security Audit Report — WhatsApp Gateway API & Admin Frontend

**Date:** 2026-05-14  
**Scope:** Backend (Express API), Frontend (React SPA), Deployment Config (Docker Compose)  
**Methodology:** Static code analysis + architecture review

---

## Severity Legend

- **CRITICAL** — Can be exploited immediately; leads to data breach, account takeover, or system compromise.
- **HIGH** — Significant security risk; exploitable with moderate effort or could be chained with other issues.
- **MEDIUM** — Security weakness that may facilitate attacks under specific conditions.
- **LOW** — Best-practice violation or informational finding.

---

## CRITICAL

### 1. Single Shared API Key with No Authorization Model
- **Location:** `src/middlewares/authMiddleware.ts:8`
- **Description:** The system uses a single static `API_KEY` from environment variables. There is no concept of users, roles, or per-session ownership. Any caller who possesses the one API key can perform **all** operations: create/delete any session, send messages from any session, read all message logs, and manage all templates.
- **Impact:** Complete loss of access control. Leaked key = full system compromise.
- **Related:** `.env.example:10` (weak default key)

### 2. API Key Stored in Browser localStorage
- **Location:** `frontend/src/context/AuthContext.tsx:18–23`
- **Description:** The frontend stores the API key in `localStorage` (`WA_GATEWAY_API_KEY`). This is accessible to any XSS payload, malicious browser extensions, or scripts running on the same origin.
- **Impact:** Key theft via XSS or compromised dependency. No HttpOnly cookie alternative exists.

### 3. Redis Exposed Without Authentication
- **Location:** `docker-compose.yml:17–24`, `src/config/redis.ts:8–12`
- **Description:** Redis container is exposed on the default port (`6379`) with **no password** and **no protected mode**. The `redis.ts` config reads an optional `REDIS_PASSWORD` but the compose file does not set one.
- **Impact:** Anyone with network access to the Redis instance can read all queued messages (phone numbers, message content, file paths), manipulate job queues, or flush the entire store.

### 4. PostgreSQL Exposed with Weak Default Credentials
- **Location:** `docker-compose.yml:4–15`, `.env.example:2–3`
- **Description:** PostgreSQL is exposed on host port `5433` with default credentials `postgres:postgres`. The `.env.example` encourages these weak defaults.
- **Impact:** Database compromise = full access to sessions, templates, message logs, and webhook URLs.

### 5. QR Code Data Sent to External Third-Party Service
- **Location:** `frontend/src/pages/SessionsPage.tsx:73`
- **Description:** When the backend-generated QR image is unavailable, the frontend falls back to `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(res.qr)}`. The raw WhatsApp QR authentication string is sent to an external, untrusted service.
- **Impact:** WhatsApp session takeover if the third party logs or intercepts the QR data. Privacy breach.

### 6. No Session Ownership Verification
- **Location:** `src/services/session/SessionManager.ts:47–77` (startSession only); `src/controllers/sessionController.ts:14–253`
- **Description:** `startSession` checks webhook URL mismatch, but **all other session operations** (`stop`, `logout`, `sendMessage`, `getMessageLog`, `getQR`, `getStatus`) perform **no ownership checks**. Any authenticated client can control any session.
- **Impact:** Any API consumer can hijack, delete, or send messages from any WhatsApp session.

### 7. Metrics and Health Endpoints Publicly Accessible
- **Location:** `src/routes/metricsRoutes.ts:1–16`, `src/routes/healthRoutes.ts:1–78`, `src/app.ts:66–69`
- **Description:** `/metrics` (Prometheus metrics including system memory, CPU, active session counts) and `/health/ready` (database status, Redis status, memory usage, uptime, session counts) are **unauthenticated**.
- **Impact:** Information disclosure. Attackers can enumerate system state, active sessions, and infrastructure health without credentials.

### 8. Identical Rate Limit for Public and Authenticated Routes
- **Location:** `src/app.ts:37–40`, `src/app.ts:64`
- **Description:** A single rate limiter (`max: 3000` per 15 minutes ≈ 3 req/sec) is applied globally. Public endpoints (`/health`, `/metrics`, `/docs`) share the same limit as authenticated API routes.
- **Impact:** An attacker can exhaust the shared rate limit by hitting public endpoints, causing DoS for legitimate API consumers.

---

## HIGH

### 9. CORS Enabled for All Origins
- **Location:** `src/app.ts:60`
- **Description:** `app.use(cors())` without origin restriction allows any website to make cross-origin requests. While the API key is header-based (not cookie-based), this still means any origin can probe the API if the key is known or leaked.
- **Impact:** Widens attack surface for cross-origin abuse, especially if the API key is ever exposed client-side or via referrer headers.

### 10. File Upload Bypass via `text/*` MIME Type
- **Location:** `src/utils/fileValidation.ts:20–25`, `src/config/upload.ts:15–32`
- **Description:** The signature validator returns `true` for any file claiming to be `text/*` without actually checking its content. Since `text/plain` and `text/csv` are in the allowed MIME type list, an attacker can upload **any file** (renamed to `.txt` or `.csv`) and bypass both MIME and signature checks.
- **Impact:** Arbitrary file upload that passes all server-side validation. Malicious files can be queued for WhatsApp delivery.

### 11. Webhook URLs Vulnerable to SSRF via DNS Rebinding
- **Location:** `src/utils/urlValidator.ts:27–35`, `src/workers/webhookWorker.ts:19`
- **Description:** The `validateWebhookUrl` function resolves the hostname to an IP **once** and blocks private ranges. However, `fetch()` in the webhook worker may resolve the same hostname to a **different IP** later (DNS rebinding / time-of-check vs time-of-use). Additionally, the validator misses `0.0.0.0`, broadcast addresses, and certain IPv6 variants.
- **Impact:** SSRF — the gateway can be coerced to send requests to internal services (metadata endpoints, internal APIs, localhost services).

### 12. Webhooks Sent Without Authentication Signature
- **Location:** `src/workers/webhookWorker.ts:19–31`
- **Description:** Outgoing webhooks include only a `User-Agent` header and optional `X-Request-ID`. There is no HMAC signature, shared secret, or bearer token. Recipients cannot cryptographically verify that the webhook originated from this gateway.
- **Impact:** Webhook spoofing. An attacker who discovers a consumer's webhook endpoint can send fake events.

### 13. No Timeout on Webhook fetch()
- **Location:** `src/workers/webhookWorker.ts:19`
- **Description:** The `fetch()` call to webhook URLs has **no timeout**. A slow or non-responsive endpoint will hang the worker job until the OS or Node.js eventually kills the socket.
- **Impact:** Worker resource exhaustion, queue buildup, potential DoS of the webhook delivery system.

### 14. HTTP Webhooks Allowed
- **Location:** `src/utils/urlValidator.ts:12`
- **Description:** The URL validator accepts `http:` protocol. Webhooks can be sent over unencrypted HTTP.
- **Impact:** Sensitive message data (phone numbers, content, session IDs) transmitted in plaintext over the network.

### 15. WhatsApp Auth State Stored Unencrypted on Disk
- **Location:** `src/services/session/SessionManager.ts:79–84`, `src/config/paths.ts:8`
- **Description:** Baileys multi-file auth state (WhatsApp session credentials, keys) is stored as plain JSON files in `auth_info_baileys/<sessionId>/`. No encryption at rest.
- **Impact:** If the server filesystem is compromised (backup leak, unauthorized access, container escape), all WhatsApp sessions are immediately exposed.

### 16. No Audit Logging
- **Location:** Throughout controllers and services
- **Description:** There is no audit trail for destructive or sensitive operations (sending messages, deleting sessions, logging out, updating webhooks). The structured logger (`pino`) only logs errors and routine events, not WHO performed WHAT action.
- **Impact:** Inability to detect or investigate abuse. No accountability for malicious actions.

### 17. BullMQ Failed Jobs Retain Sensitive Data in Unauthenticated Redis
- **Location:** `src/queues/messageQueue.ts:13`, `src/queues/webhookQueue.ts:17`
- **Description:** Failed jobs are retained (`removeOnFail: 5000` for messages, `removeOnFail: false` for webhooks). These jobs contain phone numbers, message text, file paths, and webhook payloads. Combined with unauthenticated Redis (Finding #3), this is a data leakage risk.
- **Impact:** Sensitive PII persists indefinitely in an unprotected Redis store.

### 18. Missing Max Length on Critical Input Fields
- **Location:** `src/middlewares/validationMiddleware.ts:34–76`
- **Description:** Multiple Joi schemas lack maximum length constraints:
  - `message` (sendText): no max length
  - `content` (createTemplate): no max length
  - `templateName` (sendTemplate): no max length, no pattern
  - `webhookUrl` (startSession): no max length
  - `variables` (sendTemplate): `Joi.object().optional()` — accepts any arbitrarily large object
- **Impact:** DoS via extremely large payloads; memory exhaustion; Redis queue bloat.

---

## MEDIUM

### 19. No `trust proxy` Configuration
- **Location:** `src/app.ts:35`
- **Description:** Express is not configured with `app.set('trust proxy', ...)`. When deployed behind a reverse proxy, `req.ip` will be the proxy's IP, causing the rate limiter to count all requests as coming from one IP.
- **Impact:** Rate limiting becomes ineffective behind a reverse proxy. Legitimate users may be blocked while attackers bypass limits.

### 20. File Cleanup Race Condition
- **Location:** `src/workers/messageWorker.ts:103–119`
- **Description:** Temp files are cleaned up in `completed` and `failed` event handlers. If the worker process crashes between job processing and event emission, temp files may persist indefinitely in `temp_uploads/`.
- **Impact:** Disk space exhaustion over time. Potentially sensitive files left on disk.

### 21. No Input Validation on URL Path Parameters
- **Location:** `src/routes/sessionRoutes.ts:13–41`, `src/routes/templateRoutes.ts:13–23`
- **Description:** `sessionId` and `name` path parameters are used in controllers without Joi validation. Only `POST /sessions/start` validates `sessionId` in the body. Routes like `GET /sessions/:sessionId/status`, `POST /sessions/:sessionId/stop`, `DELETE /templates/:name` accept any value.
- **Impact:** While Express routing constrains path params to single segments (preventing path traversal), unvalidated inputs can cause unexpected behavior, 500 errors, or information leakage via error messages.

### 22. Template Name Allows Arbitrary Characters
- **Location:** `src/middlewares/validationMiddleware.ts:59–64`
- **Description:** `createTemplate` schema allows `name: Joi.string().min(3).required()` with no pattern restriction. Names like `../../../etc/passwd` are theoretically possible (though blocked by Express routing in practice).
- **Impact:** Unexpected behavior; potential log injection or display issues.

### 23. Database and Redis Connections Without TLS/SSL
- **Location:** `src/config/database.ts:9–23`, `src/config/redis.ts:14–16`
- **Description:** Neither PostgreSQL nor Redis connections are configured with SSL/TLS. If either service is on a separate host or network segment, traffic is unencrypted.
- **Impact:** Network sniffing could expose database queries, Redis commands, and queued job data.

### 24. No Validation on `captions` Field in File Upload
- **Location:** `src/controllers/sessionController.ts:173`, `src/routes/sessionRoutes.ts:28–32`
- **Description:** The `sendFile` route has **no Joi validation** for the `captions` field or the `to` field in `req.body`. The multer middleware parses the multipart body and passes these values directly to the controller.
- **Impact:** Unvalidated input passed to message queue. Could include malicious content or extremely long strings.

### 25. Frontend Missing Security Meta Tags
- **Location:** `frontend/index.html`
- **Description:** The `index.html` lacks a CSP `<meta>` tag, `Referrer-Policy` meta tag, and `X-Content-Type-Options` equivalent.
- **Impact:** While Helmet provides CSP headers for API responses, the frontend SPA's initial HTML load has no client-side CSP enforcement.

### 26. Polling Without Error Backoff
- **Location:** `frontend/src/hooks/usePolling.ts:14–19`
- **Description:** `usePolling` fires requests at a fixed interval regardless of errors. If the backend is down or returning errors, the frontend continues polling every 3–5 seconds.
- **Impact:** Unnecessary load on a recovering backend; log noise; potential accidental DoS during incidents.

---

## LOW

### 27. Swagger/OpenAPI Docs Publicly Exposed
- **Location:** `src/routes/docsRoutes.ts:1–18`, `src/app.ts:69`
- **Description:** `/docs` serves the full OpenAPI specification without authentication. This reveals the complete API surface, endpoint structure, and parameter types.
- **Impact:** Information disclosure. Simplifies reconnaissance for attackers.

### 28. Error Detail Disclosure in Auth Middleware
- **Location:** `src/middlewares/authMiddleware.ts:10–15`
- **Description:** When `API_KEY` is not set, the response is `"Service Unavailable: API configuration error"` which reveals an internal configuration problem.
- **Impact:** Minor information disclosure. Should return generic `"Service Unavailable"`.

### 29. Weak Default API Key in Example Environment
- **Location:** `.env.example:10`
- **Description:** `API_KEY=secret_key_123` is a weak, guessable default. Users may copy `.env.example` directly without changing it.
- **Impact:** Brute-force / credential guessing if the example file is used as-is.

### 30. No Subresource Integrity for External Resources
- **Location:** `src/app.ts:43–58` (CSP only)
- **Description:** External resources (Google Fonts) are permitted by CSP but loaded without Subresource Integrity (SRI) hashes.
- **Impact:** If the external CDN is compromised, malicious styles/scripts could be injected.

### 31. Console Logging Instead of Structured Logger
- **Location:** `src/middlewares/authMiddleware.ts:11`
- **Description:** Auth middleware uses `console.error()` instead of the `pino` logger used elsewhere.
- **Impact:** Inconsistent logging. May not be captured by centralized log aggregation.

---

## Summary Table

| Severity | Count | Key Concerns |
|----------|-------|--------------|
| CRITICAL | 8 | Shared API key, localStorage key, unauth Redis/Postgres, external QR leak, no ownership, public metrics/health, rate limit sharing |
| HIGH | 10 | CORS, file upload bypass, SSRF webhooks, no webhook signature, no fetch timeout, HTTP webhooks, unencrypted auth state, no audit log, Redis data retention, unbounded inputs |
| MEDIUM | 8 | No trust proxy, file cleanup race, unvalidated URL params, no TLS for DB/Redis, no caption validation, missing security meta tags, aggressive polling |
| LOW | 5 | Public docs, error disclosure, weak default key, no SRI, console logging |

**Total: 31 findings**

---

*Report generated by static code analysis. Recommendations for remediation not included per scope agreement.*
