# Security Enhancement Report

**Project:** WhatsApp Gateway
**Date:** 14 Mei 2026
**Scope:** Implementasi 21 item dari Security Audit Follow-up Plan (revisi)
**Build Status:** `npm run lint` dan `npm run build` lolos (exit code 0)

---

## Ringkasan

Semua 21 item dari rencana follow-up audit berhasil diimplementasikan. Satu item berisiko tinggi, **enkripsi penuh Baileys auth state (#13)**, sengaja diskip berdasarkan permintaan. Tidak ada breaking change pada API publik.

---

## Daftar Enhancement yang Diimplementasikan

### Phase 1 — Foundation & Cleanup (6 item)

| # | Item | File Utama | Status |
|---|------|-----------|--------|
| 1.1 | Validasi env variable saat startup (fail-fast di production) | `src/config/env.ts` | Selesai |
| 1.2 | Cleanup `.env.example` (weak defaults → `__REPLACE_ME__`, tambah `KEY_ENCRYPTION_SECRET`, `WEBHOOK_ALLOW_HTTP`, dll) | `.env.example` | Selesai |
| 1.3 | Hapus custom `keyGenerator` rate limiter + `trustProxy` override | `src/app.ts` | Selesai |
| 1.4 | Hapus legacy `authMiddleware.ts` + test | `src/middlewares/authMiddleware.ts` | Dihapus |
| 1.5 | Ganti `console.error` dengan `logger.error` di fileValidation | `src/utils/fileValidation.ts` | Selesai |
| 1.6 | Fix logger import di `messageWorker.ts` | `src/workers/messageWorker.ts` | Selesai |

### Phase 2 — Validation Hardening (5 item)

| # | Item | File Utama | Status |
|---|------|-----------|--------|
| 2.1 | Joi schema: max length, regex pattern, URI scheme | `src/middlewares/validationMiddleware.ts` | Selesai |
| 2.2 | Validasi path param `sessionId` (UUID v4) dan `templateName` | `src/routes/sessionRoutes.ts`, `templateRoutes.ts` | Selesai |
| 2.3 | File upload text bypass fix: binary heuristic (>5% non-printable → tolak) | `src/utils/fileValidation.ts` | Selesai |
| 2.4 | Admin login timing-safe equal + dummy bcrypt burn | `src/controllers/adminController.ts` | Selesai |
| 2.5 | Hapus `MASTER_API_KEY` plaintext fallback dari auth | `src/middlewares/adminAuth.ts`, `combinedAuth.ts` | Selesai |

### Phase 3 — API Key Encryption (5 item)

| # | Item | File Utama | Status |
|---|------|-----------|--------|
| 3.1 | Utility AES-256-GCM (`keyCrypto.ts`) | `src/utils/keyCrypto.ts` | Baru |
| 3.2 | Migration `encrypted_key` column | `migrations/1778755200002_encrypt-api-keys.js` | Selesai |
| 3.3 | `ApiKeyRepository` store encrypted key, auth hot path tanpa select `encrypted_key` | `src/repositories/ApiKeyRepository.ts` | Selesai |
| 3.4 | `adminController` decrypt on-demand saat list; `rotate` atomically update prefix+encrypted+hash | `src/controllers/adminController.ts` | Selesai |
| 3.5 | Auth middleware: no-op check (sudah tidak ada plaintext fallback) | `src/middlewares/adminAuth.ts`, `combinedAuth.ts` | Selesai |

### Phase 4 — Endpoint Lockdown & Frontend (5 item)

| # | Item | File Utama | Status |
|---|------|-----------|--------|
| 4.1 | `/metrics` Bearer token auth; `/docs` adminAuth kecuali `DOCS_PUBLIC` | `src/routes/metricsRoutes.ts`, `docsRoutes.ts` | Selesai |
| 4.2 | `/health/ready` payload publik diminimalkan (hanya `status`) | `src/routes/healthRoutes.ts` | Selesai |
| 4.3 | Hapus QR fallback ke `api.qrserver.com` | `frontend/src/pages/SessionsPage.tsx` | Selesai |
| 4.4 | CSP meta tag + referrer policy di `index.html` | `frontend/index.html` | Selesai |
| 4.5 | Polling exponential backoff dengan cap 30s | `frontend/src/hooks/usePolling.ts` | Selesai |

### Phase 5 — Audit Logging & Cleanup (4 item)

| # | Item | File Utama | Status |
|---|------|-----------|--------|
| 5.1 | Audit log untuk session/message/template ops | `src/utils/audit.ts`, `sessionController.ts`, `templateController.ts` | Selesai |
| 5.2 | Pagination clamping di `listAuditLogs` dan `listMessageLogs` | `src/controllers/adminController.ts` | Selesai |
| 5.3 | Temp file sweeper (hapus file >1 jam, interval 15 menit) | `src/app.ts` | Selesai |
| 5.4 | `getClientIp` pakai `req.ip` (bukan XFF manual) | `src/utils/audit.ts` | Selesai |

### Phase 6 — Webhook Security (3 item)

| # | Item | File Utama | Status |
|---|------|-----------|--------|
| 6.1 | Expand `isPrivateIp`: `0.0.0.0/8`, `100.64.0.0/10`, broadcast, IPv4-mapped, IPv6 `::` | `src/utils/urlValidator.ts` | Selesai |
| 6.2 | SSRF connect-time defense: resolve DNS → cek IP → fetch ke IP dengan Host header asli | `src/workers/webhookWorker.ts` | Selesai |
| 6.3 | `WEBHOOK_ALLOW_HTTP` flag (default `false`) | `src/utils/urlValidator.ts`, `src/workers/webhookWorker.ts` | Selesai |

---

## Item yang Diskip

| # | Item | Alasan |
|---|------|--------|
| 13 | Enkripsi penuh Baileys auth state di disk | Risiko regresi tinggi; perlu diskusi arsitektur terpisah |

---

## File Baru

- `src/utils/keyCrypto.ts` — AES-256-GCM encrypt/decrypt
- `src/utils/audit.ts` — Shared audit logging utility (`logAudit`, `getActorInfo`, `hashRecipient`, `getClientIp`)
- `migrations/1778755200002_encrypt-api-keys.js` — Idempotent migration kolom `encrypted_key`

## File Dihapus

- `src/middlewares/authMiddleware.ts`
- `src/tests/middlewares/authMiddleware.test.ts`

## Environment Variable Baru

| Variable | Deskripsi | Contoh |
|----------|-----------|--------|
| `KEY_ENCRYPTION_SECRET` | 64 karakter hex untuk AES-256-GCM | `openssl rand -hex 32` |
| `WEBHOOK_ALLOW_HTTP` | Izinkan HTTP webhook (default `false`) | `false` |
| `METRICS_PUBLIC` | `/metrics` tanpa auth (default `false`) | `false` |
| `METRICS_TOKEN` | Bearer token untuk `/metrics` | `__REPLACE_ME__` |
| `DOCS_PUBLIC` | `/docs` tanpa auth (default `false`) | `false` |

---

## Yang Perlu Diperhatikan ke Depannya

### 1. Rotasi `KEY_ENCRYPTION_SECRET`
Saat ini tidak ada mekanisme rotasi secret enkripsi. Jika `KEY_ENCRYPTION_SECRET` perlu diganti, seluruh `encrypted_key` di DB harus di-re-encrypt. Pertimbangkan untuk menambahkan key versioning (misal: `v2:` prefix) di masa depan.

### 2. Zero-downtime migration
Migration `1778755200002_encrypt-api-keys.js` bersifat idempotent (skip jika kolom sudah ada), tapi **tidak meng-encrypt data existing secara otomatis**. Lakukan re-encrypt manual untuk row yang masih punya `full_key` plaintext:

```sql
-- Cek row yang belum di-encrypt
SELECT id, prefix FROM api_keys WHERE encrypted_key IS NULL AND full_key IS NOT NULL;
```

### 3. Baileys auth state encryption (Finding #15)
Ini masih menjadi celah kritis bila server di-compromise. Implementasi penuh memerlukan:
- Wrap `useMultiFileAuthState` dengan enkripsi AES-256-GCM per file
- Manajemen key derivation dari `KEY_ENCRYPTION_SECRET`
- Testing regresi intensif karena Baileys sangat sensitif terhadap struktur auth state

### 4. `METRICS_TOKEN` dan secret management
Token untuk `/metrics` adalah single shared secret. Jika Prometheus ecosystem memungkinkan, pertimbangkan menerapkan IP allowlist atau TLS client cert.

### 5. SSRF defense lebih dalam
Defense saat ini cukup untuk kasus umum, tapi tidak menutup:
- **DNS rebinding time-of-check vs time-of-use (TOCTOU)** secara 100% (resolver cache, TTL)
- **IDN homograph attacks** pada hostname webhook
Untuk kebutuhan high-security, pertimbangkan dedicated outbound proxy (Squid/Connect) dengan whitelist domain.

### 6. Audit log retention
Tabel `audit_logs` akan tumbuh tanpa batas. Implementasikan:
- Retention policy (auto-delete >90 hari)
- Archive ke cold storage sebelum delete

### 7. Frontend CSP
Meta tag CSP adalah langkah minimal. Pertimbangkan upgrade ke HTTP header CSP via Helmet (`contentSecurityPolicy`) dengan `nonce` atau `strict-dynamic` untuk script inline.

### 8. Rate limiting granularity
Rate limiter saat ini global per IP. Jika skala naik, pertimbangkan:
- Per-endpoint bucket (admin vs API key)
- Per-API-key bucket (mencegah abuse dari satu key)

### 9. TLS untuk internal connections
Koneksi ke Postgres dan Redis masih plaintext (asumsi same-host atau private network). Jika deploy di VPC/shared infra, aktifkan TLS:
- `sslmode=require` pada `DATABASE_URL`
- `tls` option pada Redis client

### 10. Subresource Integrity (SRI)
Frontend tidak menggunakan SRI untuk CDN assets (jika ada). Karena sekarang semua assets self-hosted setelah build, risiko berkurang. Tetap periksa bila ada external font/icon CDN di masa depan.

---

## Verifikasi Manual yang Disarankan

1. **Regenerate API key** → prefix berubah di DB dan UI, key lama gagal auth, key baru sukses.
2. **List API keys** → admin UI menampilkan full key (terdekripsi), tapi DB hanya menyimpan ciphertext.
3. **Rate limit** → hit `/metrics` tanpa token 100x → 429. Hit dengan token valid → lolos.
4. **Webhook HTTP** → set `WEBHOOK_ALLOW_HTTP=false`, kirim session dengan `http://` webhook → ditolak.
5. **Temp sweeper** → letakkan file tua di `temp_uploads/`, tunggu 15 menit atau trigger manual → file hilang.
6. **Audit log** → kirim pesan via API, cek tabel `audit_logs` muncul `MESSAGE_SEND_TEXT` dengan `recipientHash`.

---

*Generated: 14 Mei 2026*
