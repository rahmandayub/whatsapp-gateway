import fs from "fs";
import path from "path";
import crypto from "crypto";
import {
  proto,
  initAuthCreds,
  AuthenticationCreds,
  SignalKeyStore,
  BufferJSON,
} from "@whiskeysockets/baileys";
import { logger } from "../../utils/logger.js";

const KEY_ENCRYPTION_SECRET = process.env.KEY_ENCRYPTION_SECRET;
const ENCRYPTION_ENABLED = process.env.AUTH_STATE_ENCRYPT !== "false";

function getKey(): Buffer {
  if (!KEY_ENCRYPTION_SECRET) {
    throw new Error("KEY_ENCRYPTION_SECRET is not set");
  }
  if (!/^[a-f0-9]{64}$/i.test(KEY_ENCRYPTION_SECRET)) {
    throw new Error("KEY_ENCRYPTION_SECRET must be a 64-character hex string");
  }
  return Buffer.from(KEY_ENCRYPTION_SECRET, "hex");
}

export function encryptAuthFile(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  let ciphertext = cipher.update(plaintext, "utf8", "base64");
  ciphertext += cipher.final("base64");
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${ciphertext}`;
}

export function decryptAuthFile(ciphertext: string): string {
  const key = getKey();
  const parts = ciphertext.split(":");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Invalid encrypted auth file format");
  }
  const iv = Buffer.from(parts[1], "base64");
  const tag = Buffer.from(parts[2], "base64");
  const encrypted = parts[3];
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  let plaintext = decipher.update(encrypted, "base64", "utf8");
  plaintext += decipher.final("utf8");
  return plaintext;
}

function shouldEncrypt(filename: string): boolean {
  if (filename === "creds.json") return true;
  if (filename.startsWith("app-state-sync-key-")) return true;
  if (filename.startsWith("identity-key-")) return true;
  if (filename.startsWith("device-list-")) return true;
  if (filename.startsWith("lid-mapping-")) return true;
  if (filename.startsWith("pre-keys-")) return true;
  return false;
}

function isEncrypted(content: string): boolean {
  return content.startsWith("v1:");
}

function fixFileName(file: string): string {
  return file?.replace(/\//g, "__")?.replace(/:/g, "-") ?? "";
}

/**
 * EncryptedAuthState - Custom implementation of Baileys auth state that
 * encrypts sensitive files at rest using AES-256-GCM.
 *
 * Uses BufferJSON.replacer/reviver for proper Buffer/Uint8Array serialization.
 */
export class EncryptedAuthState {
  private authPath: string;
  private migrationDone = false;

  constructor(authPath: string) {
    this.authPath = authPath;
  }

  /**
   * Initialize encrypted auth state.
   * Returns a Baileys-compatible auth state object with encrypted storage.
   */
  async init() {
    if (!fs.existsSync(this.authPath)) {
      fs.mkdirSync(this.authPath, { recursive: true });
    }

    // Migrate any unencrypted files to encrypted format
    await this.migrateIfNeeded();

    // Load creds (decrypting if needed)
    // Use BufferJSON.reviver to properly deserialize Buffer values
    const credsData = await this.readData("creds.json");
    const creds: AuthenticationCreds = credsData
      ? (credsData as AuthenticationCreds)
      : initAuthCreds();

    const keys: SignalKeyStore = {
      get: async (
        type: string,
        ids: string[],
      ): Promise<Record<string, unknown>> => {
        const data: Record<string, unknown> = {};
        await Promise.all(
          ids.map(async (id) => {
            const value = await this.readData(`${type}-${id}.json`);
            if (type === "app-state-sync-key" && value) {
              data[id] = proto.Message.AppStateSyncKeyData.fromObject(value);
            } else {
              data[id] = value;
            }
          }),
        );
        return data;
      },
      set: async (
        data: Record<string, Record<string, unknown>>,
      ): Promise<void> => {
        const tasks: Promise<void>[] = [];
        for (const category in data) {
          const categoryData = data[category];
          for (const id in categoryData) {
            const value = categoryData[id];
            const file = `${category}-${id}.json`;
            tasks.push(
              value ? this.writeData(file, value) : this.removeData(file),
            );
          }
        }
        await Promise.all(tasks);
      },
    } as SignalKeyStore;

    const state = { creds, keys };

    const saveCreds = async () => {
      await this.writeData("creds.json", creds);
    };

    const result = { state, saveCreds };
    return result as {
      state: { creds: AuthenticationCreds; keys: SignalKeyStore };
      saveCreds: () => Promise<void>;
    };
  }

  private async readData(file: string): Promise<unknown> {
    const filePath = path.join(this.authPath, fixFileName(file));
    try {
      // Check if file exists first
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const content = fs.readFileSync(filePath, "utf8");
      let parsed: unknown;

      // Check if this is an encrypted file
      if (ENCRYPTION_ENABLED && shouldEncrypt(file) && isEncrypted(content)) {
        const decrypted = decryptAuthFile(content);
        // Use BufferJSON.reviver for proper Buffer deserialization
        parsed = JSON.parse(decrypted, BufferJSON.reviver);
      } else {
        // Plaintext file - use BufferJSON.reviver for consistency
        parsed = JSON.parse(content, BufferJSON.reviver);
      }

      return parsed;
    } catch (err) {
      logger.error({ err, file }, "Failed to read auth file");
      return null;
    }
  }

  private async writeData(file: string, data: unknown): Promise<void> {
    const filePath = path.join(this.authPath, fixFileName(file));

    if (ENCRYPTION_ENABLED && shouldEncrypt(file)) {
      // Use BufferJSON.replacer to properly serialize Buffer values
      const plaintext = JSON.stringify(data, BufferJSON.replacer);
      const encrypted = encryptAuthFile(plaintext);
      fs.writeFileSync(filePath, encrypted, "utf8");
    } else {
      fs.writeFileSync(
        filePath,
        JSON.stringify(data, BufferJSON.replacer),
        "utf8",
      );
    }
  }

  private async removeData(file: string): Promise<void> {
    const filePath = path.join(this.authPath, fixFileName(file));
    if (fs.existsSync(filePath)) {
      if (ENCRYPTION_ENABLED && shouldEncrypt(file)) {
        const size = fs.statSync(filePath).size;
        fs.writeFileSync(filePath, crypto.randomBytes(size));
      }
      fs.unlinkSync(filePath);
    }
  }

  /**
   * Migrate existing unencrypted session files to encrypted format.
   */
  private async migrateIfNeeded(): Promise<void> {
    if (!ENCRYPTION_ENABLED || this.migrationDone) return;

    const files = fs.readdirSync(this.authPath);
    let migrated = false;

    for (const file of files) {
      if (!shouldEncrypt(file)) continue;

      const filePath = path.join(this.authPath, file);
      if (!fs.statSync(filePath).isFile()) continue;

      const content = fs.readFileSync(filePath, "utf8");
      if (isEncrypted(content)) continue;

      logger.info({ file }, "Migrating auth file to encrypted format");
      // Parse with BufferJSON.reviver first to ensure data integrity
      const parsed = JSON.parse(content, BufferJSON.reviver);
      // Then re-serialize with replacer before encrypting
      const plaintext = JSON.stringify(parsed, BufferJSON.replacer);
      const encrypted = encryptAuthFile(plaintext);
      fs.writeFileSync(filePath, encrypted, "utf8");
      migrated = true;
    }

    if (migrated) {
      logger.info(
        { authPath: this.authPath },
        "Session auth state migrated to encrypted format",
      );
    }

    this.migrationDone = true;
  }

  /**
   * Securely delete auth directory (overwrite before delete)
   */
  static async deleteAuthDir(authPath: string): Promise<void> {
    if (!fs.existsSync(authPath)) return;

    const files = fs.readdirSync(authPath);
    for (const file of files) {
      const filePath = path.join(authPath, file);
      if (fs.statSync(filePath).isFile()) {
        if (ENCRYPTION_ENABLED && shouldEncrypt(file)) {
          const size = fs.statSync(filePath).size;
          fs.writeFileSync(filePath, crypto.randomBytes(size));
        }
        fs.unlinkSync(filePath);
      }
    }
    fs.rmdirSync(authPath);
  }
}
