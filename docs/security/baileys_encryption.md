# Security Enhancement Report — Baileys Auth State Encryption

**Project:** WhatsApp Gateway
**Date:** 17 Mei 2026
**Scope:** Implementasi Finding #15 dari Security Audit — Enkripsi WhatsApp Auth State
**Build Status:** `npm run lint` ✅ `npm run build` ✅

---

## Ringkasan

Enkripsi auth state WhatsApp (`creds.json`, key files, session files) telah berhasil diimplementasikan menggunakan **AES-256-GCM**. File sensitif sekarang dienkripsi at-rest, sehingga compromise filesystem tidak langsung означает semua session WhatsApp terekspos.

**Status:** ✅ Selesai — Semua CRITICAL finding teratasi

---

##背景 (Background)

Finding #15 dari security audit awal:

> WhatsApp Auth State Stored Unencrypted on Disk
> Lokasi: `src/services/session/SessionManager.ts`
> Dampak: Jika server di-compromise, semua WhatsApp sessions langsung terekspos

**Severity: CRITICAL**

---

## Arsitektur Implementasi

### File Utama

| File | Deskripsi |
|------|-----------|
| `src/services/session/EncryptedAuthState.ts` | Custom auth state wrapper dengan enkripsi AES-256-GCM |

### File Terkait (Modifikasi)

| File | Perubahan |
|------|-----------|
| `src/services/session/SessionManager.ts` | Menggunakan `EncryptedAuthState` menggantikan `useMultiFileAuthState` |
| `.env.example` | Tambah `AUTH_STATE_ENCRYPT` |
| `security/enhancement_report.md` | Update status Finding #15 → ✅ Selesai |

---

## Cara Kerja

### Encryption Flow

```whatsapp-gateway/src/services/session/EncryptedAuthState.ts#L1-30
┌─────────────────────────────────────────────────────────────┐
│                    EncryptedAuthState                       │
├─────────────────────────────────────────────────────────────┤
│  Files dienkripsi:                                           │
│  - creds.json          (authentication credentials)         │
│  - session-*.json      (session data)                        │
│  - app-state-sync-key-*.json  (state sync keys)             │
│  - identity-key-*.json        (identity keys)               │
│  - device-list-*.json         (registered devices)          │
│  - lid-mapping-*.json         (LID mappings)                │
│  - pre-keys-*.json            (E2EE pre-keys)               │
├─────────────────────────────────────────────────────────────┤
│  Format: v1:<iv_b64>:<tag_b64>:<ciphertext_b64>            │
│  Key: AES-256-GCM dari KEY_ENCRYPTION_SECRET               │
└─────────────────────────────────────────────────────────────┘
```

### Read Flow

```whatsapp-gateway/src/services/session/EncryptedAuthState.ts#L155-178
1. Check file exists → return null jika tidak ada (graceful skip)
2. If encrypted (v1: prefix):
   a. Decrypt ciphertext → plaintext
   b. JSON.parse with BufferJSON.reviver (Buffer/Uint8Array restoration)
3. If plaintext:
   a. JSON.parse with BufferJSON.reviver
```

### Write Flow

```whatsapp-gateway/src/services/session/EncryptedAuthState.ts#L180-192
1. JSON.stringify with BufferJSON.replacer (Buffer serialization)
2. If shouldEncrypt(file) && ENCRYPTION_ENABLED:
   a. Generate random 16-byte IV
   b. AES-256-GCM encrypt → ciphertext
   c. Store: v1:<iv>:<tag>:<ciphertext>
3. Else: store plaintext
```

### Auto-Migration

```whatsapp-gateway/src/services/session/EncryptedAuthState.ts#L221-237
- On startup, detect unencrypted files
- Parse with BufferJSON.reviver (data integrity)
- Re-serialize with BufferJSON.replacer
- Encrypt and overwrite
- Log: "Migrating auth file to encrypted format"
```

---

## Environment Variable

| Variable | Default | Deskripsi |
|----------|---------|-----------|
| `KEY_ENCRYPTION_SECRET` | **REQUIRED** | 64 hex chars (32 bytes) untuk AES-256-GCM |
| `AUTH_STATE_ENCRYPT` | `true` | Set `false` to disable encryption (NOT recommended) |

### Setup

```bash
# Generate KEY_ENCRYPTION_SECRET
openssl rand -hex 32

# Example .env
KEY_ENCRYPTION_SECRET=<64-hex-chars>
AUTH_STATE_ENCRYPT=true
```

---

## File Format

### Before (Plaintext)

```json
{
  "noiseKey": { "public": {"type":"Buffer","data":"..."}, "private": {"type":"Buffer","data":"..."} },
  "signedIdentityKey": { ... },
  "advSecretKey": "..."
}
```

### After (Encrypted)

```
v1:MQqG77xE90G7EJWwpNTfDA==:PwrJ/oV+EIMtGYziXmV1Og==:q2liexI1eThytweo11O+YZbm8t42kuwbzBB+7X/E0SIBmElNuL2oNfbIfYspQviZClX0Eh9ntxBLy6DjDUPNWDQLJcCnZbUS+rXwSqLKrqIQsrkHSgpebJb4Kx1ofcB7dWo+ycek0Tlsk1shQ1KePbVKIVzKTHSHSp0Q+0FaVvYuglplRv9NZvIU5hBiRLBjKXm4...
```

Format: `v1:<base64(iv)>:<base64(auth_tag)>:<base64(ciphertext)>`

---

## Security Features

### 1. AES-256-GCM Encryption
- Authenticated encryption (confidentiality + integrity)
- Random IV per file write
- 16-byte authentication tag

### 2. Secure Delete
```whatsapp-gateway/src/services/session/EncryptedAuthState.ts#L194-205
- Overwrite file content with random bytes before deletion
- Prevents data recovery from disk
```

### 3. BufferJSON Compliance
```whatsapp-gateway/src/services/session/EncryptedAuthState.ts#L12-14
- Proper serialization of Buffer/Uint8Array values
- Required for WhatsApp auth state integrity
```

### 4. Graceful File Not Found
```whatsapp-gateway/src/services/session/EncryptedAuthState.ts#L155-160
- Return null if file doesn't exist
- Prevents ENOENT errors from race conditions
```

### 5. Auto-Migration
```whatsapp-gateway/src/services/session/EncryptedAuthState.ts#L221-237
- Existing plaintext sessions auto-encrypted on startup
- No manual intervention required
```

---

## Backward Compatibility

| Scenario | Behavior |
|----------|----------|
| Fresh session (scan QR) | Encrypted immediately on first save |
| Existing encrypted session | Decrypted, re-encrypted with BufferJSON on first access |
| Existing plaintext session | Auto-migrated to encrypted on startup |
| `AUTH_STATE_ENCRYPT=false` | All files stored as plaintext (NOT recommended) |
| Missing `KEY_ENCRYPTION_SECRET` | Throws error at startup |

---

## Deployment Notes

### Critical: KEY_ENCRYPTION_SECRET

1. **MUST be 64 hex characters** (32 bytes)
2. **MUST be unique per deployment** (not from .env.example)
3. **Store securely** — if lost, all sessions must be re-scanned
4. **Backup recommended** — without it, no session recovery possible

### For New Installations

```bash
# 1. Generate secret
openssl rand -hex 32

# 2. Add to .env
echo "KEY_ENCRYPTION_SECRET=$(openssl rand -hex 32)" >> .env

# 3. Start server — new sessions will be encrypted automatically
npm start
```

### For Existing Installations

```bash
# 1. Update KEY_ENCRYPTION_SECRET in .env (if not present)
# 2. Restart server
npm start

# 3. Existing sessions will be auto-migrated:
#    - Decrypted (if encrypted without BufferJSON)
#    - Re-encrypted with BufferJSON compliance
#    - Log: "Migrating auth file to encrypted format"
```

### Verify Encryption is Active

```bash
# Check a session's auth directory
ls auth_info_baileys/<session-id>/

# Files should start with "v1:" if encrypted
head -c 100 auth_info_baileys/<session-id>/creds.json
# Output should start with: v1:...
```

---

## Future Work

| Item | Priority | Notes |
|------|----------|-------|
| Key versioning with rotation support | MEDIUM | `v2:` prefix untuk re-encrypt dengan secret baru |
| Migration CLI tool | LOW | Manual re-encryption for large deployments |
| HSM/KMS integration | LOW | For enterprise key management |

---

## Changelog

| Date | Change |
|------|--------|
| 17 Mei 2026 | Initial implementation with AES-256-GCM |
| 17 Mei 2026 | Add BufferJSON for proper Buffer serialization |
| 17 Mei 2026 | Fix ENOENT graceful handling (file not found → null) |
| 17 Mei 2026 | Add session-*.json to shouldEncrypt list |

---

*Report generated: 17 Mei 2026*