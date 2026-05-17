# Security Audit Follow-up — Remaining Gaps

Review hasil enhancement keamanan menemukan satu regresi baru (plaintext API key di DB) dan ~14 celah lain dari audit yang belum/parsial ditangani; rencana ini menutup semuanya tanpa membongkar arsitektur yang sudah ada.

## Ringkasan Status Audit

**Sudah ditangani dengan baik:** Auth model `api_keys` + sha256 hash, JWT cookie + bcrypt admin login, `combinedAuth` + `sessionOwnershipGuard`, webhook HMAC signing, fetch timeout (30s), Redis password, Postgres bind ke 127.0.0.1, helmet CSP, `trust proxy` configurable, CORS via env, audit log untuk admin actions, `removeOnFail` dibatasi, public route diberi rate limiter terpisah, `printQRInTerminal=false`, randomized upload filenames.

**Belum/parsial — diperbaiki di rencana ini.**

---

## CRITICAL / HIGH (regresi atau belum tertutup)

### 1. `full_key` plaintext di DB (regresi baru)

- **Lokasi:** `migrations/1778755200001_add-full-key-to-api-keys.js`, `src/repositories/ApiKeyRepository.ts`, `src/controllers/adminController.ts:115-136`
- **Masalah:** Kolom `full_key TEXT` menyimpan API key apa adanya; `listApiKeys` mengembalikannya ke admin UI. Hashing jadi sia-sia bila DB bocor.
- **Fix (per pilihan user — encrypt at-rest):**
    - Tambah `src/utils/keyCrypto.ts`: AES-256-GCM dengan `KEY_ENCRYPTION_SECRET` (32-byte hex) dari env. Format simpan: `v1:<iv_b64>:<tag_b64>:<ciphertext_b64>`.
    - Migrasi baru: rename kolom jadi `encrypted_key TEXT`, tulis up-migration yang loop tiap row, enkripsi `full_key` lalu kosongkan plaintext kolom lama (atau drop). Idempoten.
    - `ApiKeyRepository.create/updateFullKey`: terima plaintext, simpan ciphertext.
    - `adminController.listApiKeys`: dekripsi on-demand sebelum dikirim ke admin (admin sudah authenticated).
    - Validasi `KEY_ENCRYPTION_SECRET` ada & ≥64 hex chars di startup; fail-fast.
    - Update `.env.example` dengan placeholder.

### 2. `regenerateApiKey` tidak update `prefix` di DB

- **Lokasi:** `src/controllers/adminController.ts:216-253`, `ApiKeyRepository.updateFullKey`
- **Masalah:** Prefix baru di-generate & dikirim ke user, tapi `updateFullKey` hanya menulis `full_key` + `key_hash`; kolom `prefix` lama tetap. Auth memang via hash (tetap jalan), tapi `findByPrefix` & UI listing menampilkan prefix lama → membingungkan + integritas data rusak.
- **Fix:** Ubah `updateFullKey` jadi `rotate(id, prefix, fullKeyEncrypted, hash)` yang juga update `prefix`.

### 3. XFF spoofing pada custom `keyGenerator` rate limiter

- **Lokasi:** `src/app.ts:43-57`
- **Masalah:** `keyGenerator` membaca `x-forwarded-for` mentah TANPA peduli `trust proxy` setting. Penyerang yang langsung hit Express (TRUST_PROXY=loopback default) bisa spoof header utk bypass rate limit.
- **Fix:** Hapus custom `keyGenerator`; biarkan `express-rate-limit` pakai `req.ip` yang sudah diresolusi via `trust proxy` Express. Hapus `validate: { trustProxy: false }`.

### 4. Legacy `authMiddleware.ts` masih ada

- **Lokasi:** `src/middlewares/authMiddleware.ts`
- **Masalah:** File legacy single-shared-key auth tidak dipakai route manapun (hanya test file), tapi masih kompilasi & bisa di-import keliru. Juga pakai `console.error` (Finding #31) dan bocor pesan internal (Finding #28).
- **Fix:** Hapus file + `src/tests/middlewares/authMiddleware.test.ts`. Kalau perlu dipertahankan utk kompat, ganti `console.error` → `logger.error` dan pesan jadi generic "Service Unavailable".

### 5. Frontend QR fallback ke `api.qrserver.com` masih ada

- **Lokasi:** `frontend/src/pages/SessionsPage.tsx:73`
- **Masalah:** Walau backend selalu mengembalikan `qrImage` (data URL), fallback ke pihak ketiga membocorkan QR string WhatsApp jika ada path code yang men-trigger.
- **Fix:** Hapus cabang fallback tersebut; tampilkan placeholder error "QR tidak tersedia, refresh".

### 6. File upload bypass via `text/*` (Finding #10) belum ditutup

- **Lokasi:** `src/utils/fileValidation.ts:17-28`
- **Masalah:** Bila `fileTypeFromBuffer` tidak mengenali tipe & klaim `text/*`, fungsi return `true` tanpa cek isi → upload arbitrary biner bisa lolos rename `.txt`.
- **Fix:** Untuk klaim `text/plain`/`text/csv`: deteksi binary heuristic (cek byte non-printable di sample 4KB; >5% non-printable → tolak). Juga pakai `logger` ganti `console.error` di line 55.

### 7. Validasi panjang & pattern input (Finding #18 + #22 + #24)

- **Lokasi:** `src/middlewares/validationMiddleware.ts`, `src/routes/sessionRoutes.ts:37-41`
- **Fix:** Tambah pada Joi schemas:
    - `sendText.message`: `.max(4096)`
    - `sendMedia.caption`: `.max(1024)`, `mediaUrl`: `.max(2048)`
    - `createTemplate.name`: `.max(64).pattern(/^[a-zA-Z0-9_-]+$/)`, `content`: `.max(4096)`
    - `updateTemplate.content`: `.max(4096)`
    - `sendTemplate.templateName`: `.max(64).pattern(/^[a-zA-Z0-9_-]+$/)`, `variables`: `Joi.object().pattern(Joi.string().max(64), Joi.string().max(1024)).max(50)`
    - `startSession.webhookUrl`: `.max(2048).uri({ scheme: ['http','https'] })`
    - Tambah schema `sendFile` (untuk multipart `to`+`captions`); validasi via custom middleware setelah multer (file metadata sudah ada): `to` regex WA-id, `captions` array string `.max(1024)` element `.max(10)`.

### 8. Path param `sessionId` & `templateName` tidak divalidasi (Finding #21)

- **Lokasi:** `sessionRoutes.ts`, `templateRoutes.ts`
- **Masalah:** Non-UUID `sessionId` dilempar ke `pool.query` kolom `uuid` → 500 error & info leak. `:name` template tanpa pattern.
- **Fix:** Middleware `validateParams` Joi: `sessionId` UUID v4, `name` `^[a-zA-Z0-9_-]{1,64}$`. Pasang `router.param('sessionId', ...)` & `router.param('name', ...)`.

### 9. `/metrics`, `/health/ready`, `/docs` masih publik (Finding #7, #27)

- **Lokasi:** `src/app.ts:102-104`
- **Fix:**
    - `/metrics`: lindungi dengan `combinedAuth` ATAU env `METRICS_TOKEN` header check (umum di Prometheus). Default hanya bind ke loopback bila `METRICS_PUBLIC=false`.
    - `/health/ready`: pertahankan publik tapi **kurangi info**: hanya `status` + `dependencies` up/down, hapus `system.memory`, `uptime`, dan `sessions.*` → biarkan field internal hanya muncul kalau request authenticated.
    - `/health/live`: biarkan minimal (uptime number boleh).
    - `/docs`: lindungi dengan `combinedAuth` (admin saja) atau env flag `DOCS_PUBLIC` default false di production.

### 10. SSRF DNS rebinding & cakupan IP (Finding #11)

- **Lokasi:** `src/utils/urlValidator.ts`, `src/workers/webhookWorker.ts`
- **Fix minimal (defense-in-depth):**
    - `isPrivateIp`: tambah `0.0.0.0`, `255.255.255.255`, `100.64.0.0/10` (CGNAT), IPv6 `::`, IPv4-mapped (`::ffff:`).
    - Webhook worker: gunakan custom `dispatcher`/`Agent` (Node `undici`) dengan `connect.lookup` yang menolak IP privat saat connect-time → menutup TOCTOU rebinding.

### 11. HTTP webhook diizinkan di non-prod (Finding #14)

- **Lokasi:** `src/workers/webhookWorker.ts:30-37`
- **Fix:** Tambah env `WEBHOOK_ALLOW_HTTP` (default `false`); produksi tetap blok, dev opt-in eksplisit. `urlValidator` ikut konsisten.

### 12. Audit log tidak mencakup operasi sesi/pesan (Finding #16)

- **Lokasi:** `src/controllers/sessionController.ts`, `templateController.ts`
- **Fix:** Setelah aksi sukses, tulis audit (`actorType: 'api_key' | 'admin'`, `actorId: req.apiKey?.id ?? ADMIN_USERNAME`):
    - `SESSION_START`, `SESSION_STOP`, `SESSION_LOGOUT`
    - `MESSAGE_SEND_TEXT/MEDIA/FILE/TEMPLATE` (target = sessionId, metadata: recipient hash + length, **bukan** isi)
    - `TEMPLATE_CREATE/UPDATE/DELETE`

### 13. WhatsApp auth state unencrypted (Finding #15)

- **Lokasi:** `src/services/session/SessionManager.ts:104-115`
- **Catatan:** Implementasi penuh = wrap `useMultiFileAuthState` dgn enkripsi disk. Risiko regresi tinggi.
- **Fix minimal:** Dokumentasikan di README + verifikasi `CONFIG.AUTH_DIR` permission `0700` saat startup (`fs.chmodSync`). Mark sebagai "future work" kalau Anda tak ingin risiko sekarang. _(akan saya minta konfirmasi sebelum memilih jalur ini di implementasi)_.

---

## MEDIUM / LOW

### 14. `.env.example` weak defaults (Finding #29)

- Ganti `DB_PASSWORD=changeme`, `REDIS_PASSWORD=changeme`, `DATABASE_URL=...changeme...` → placeholder eksplisit `__REPLACE_ME__` + komentar instruksi pakai `openssl rand -hex 32`.
- Tambah `KEY_ENCRYPTION_SECRET=__REPLACE_ME__` (untuk #1).

### 15. Validasi env critical di startup

- `src/config/env.ts`: setelah `dotenv.config()`, validasi: `JWT_SECRET` (≥32 chars), `ADMIN_PASSWORD_HASH` non-empty, `KEY_ENCRYPTION_SECRET` (64 hex). Jika `NODE_ENV=production` → `process.exit(1)` saat invalid; di dev → `logger.warn`.

### 16. `verifyMasterKey` non-timing-safe fallback

- **Lokasi:** `adminAuth.ts:18-19`, `combinedAuth.ts:24-25`
- **Fix:** Hapus fallback plaintext `key === MASTER_API_KEY`; wajibkan `MASTER_API_KEY_HASH` (bcrypt). Atau jika tetap dipertahankan, gunakan `crypto.timingSafeEqual` dgn padding length-equalize.

### 17. Admin login username compare leak timing (Finding #28 spirit)

- **Lokasi:** `adminController.ts:73`
- **Fix:** Gunakan `crypto.timingSafeEqual` untuk username; selalu jalankan `bcrypt.compareSync` dummy hash bila username salah → konstanta waktu.

### 18. Frontend `index.html` minim meta security (Finding #25)

- Tambah `<meta http-equiv="Content-Security-Policy" content="default-src 'self'; ...">`, `<meta name="referrer" content="strict-origin-when-cross-origin">`.

### 19. Polling tanpa backoff (Finding #26)

- `frontend/src/hooks/usePolling.ts`: tambah exponential backoff bila callback throw (cap 30s), reset saat sukses.

### 20. `console.*` sisa

- Ganti `console.error` di `fileValidation.ts:55` (sudah dicakup #6) dan audit grep semua `console.*` di `src/` → ganti `logger.*`.

### 21. File cleanup race (Finding #20)

- `src/workers/messageWorker.ts`: tambah cron-style sweeper di startup yang menghapus file di `temp_uploads/` lebih tua dari 1 jam (atomic, hanya file). Set interval 15 menit.

### 22. Audit log pagination keamanan

- `listAuditLogs`/`listMessageLogs`: parse `limit`/`offset` dengan `Number.isFinite` + clamp; sekarang `parseInt('foo')` → `NaN` lolos ke SQL.

---

## Skema Implementasi (urutan)

1. Migration baru `1778755200002_encrypt-api-keys.js` + `keyCrypto.ts` + env validator.
2. Refactor `ApiKeyRepository`, `adminController`, `apiKeyAuth`, `combinedAuth` untuk enkripsi.
3. Hapus custom `keyGenerator`; hapus `authMiddleware.ts` legacy + tesnya.
4. Update Joi schemas + tambah `validateParams` middleware + register di routes.
5. Patch `fileValidation.ts` (binary heuristic + logger).
6. Frontend: hapus QR fallback, tambah CSP meta, polling backoff, sesuaikan toast key reveal one-time/encrypted.
7. Lindungi `/metrics`, `/docs`; minimalkan `/health/ready` payload publik.
8. Audit logging untuk operasi sesi/pesan/template.
9. Webhook worker: undici dispatcher anti-rebind + `WEBHOOK_ALLOW_HTTP` flag + tambah IP private list.
10. Sweeper temp_uploads + chmod auth_info.
11. `.env.example` cleanup + dokumentasi `KEY_ENCRYPTION_SECRET`.
12. Update `security/enhancement_report.md` status section.

## Test Strategy

- Unit: `keyCrypto` roundtrip, `urlValidator` IP edge cases, `validateFileSignature` text bypass case, validation schemas (max length).
- Integration: rate limiter ignore XFF saat trust proxy=loopback; `/metrics` 401 tanpa auth; ownership guard tetap berlaku setelah refactor.
- Manual: regenerate API key → prefix berubah di list & auth dgn key baru sukses, key lama gagal.

## Out of Scope (perlu konfirmasi terpisah)

- Enkripsi penuh Baileys auth state (#13 jalur penuh) — risiko tinggi, butuh diskusi.
- Subresource Integrity Google Fonts (#30) — minor, low priority.
- TLS untuk koneksi DB/Redis (#23) — biasanya diserahkan ke infra/operator.
