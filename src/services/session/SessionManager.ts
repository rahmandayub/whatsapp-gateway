import fs from "fs";
import path from "path";
import { CONFIG } from "../../config/paths.js";
import makeWASocket from "@whiskeysockets/baileys";
import pino from "pino";
import { SessionStore } from "./SessionStore.js";
import {
  SessionRepository,
  SessionRecord,
} from "../../repositories/SessionRepository.js";
import { ConnectionHandler } from "./ConnectionHandler.js";
import { WebhookDispatcher } from "../webhook/WebhookDispatcher.js";
import { logger } from "../../utils/logger.js";
import { AppError } from "../../errors/AppError.js";
import { MessageLogRepository } from "../../repositories/MessageLogRepository.js";
import { EncryptedAuthState } from "./EncryptedAuthState.js";

export class SessionManager {
  private sessionStore: SessionStore;
  private sessionRepo: SessionRepository;
  private connectionHandler: ConnectionHandler;
  private webhookDispatcher: WebhookDispatcher;
  private messageLogRepo: MessageLogRepository;

  constructor() {
    this.sessionStore = new SessionStore();
    this.sessionRepo = new SessionRepository();
    this.webhookDispatcher = new WebhookDispatcher();
    this.messageLogRepo = new MessageLogRepository();

    this.connectionHandler = new ConnectionHandler(
      this.sessionStore,
      this.sessionRepo,
      this.webhookDispatcher,
      async (sessionId: string) => {
        // Reconnection: look up DB record by UUID, then start
        const dbSession = await this.sessionRepo.findById(sessionId);
        if (dbSession) {
          await this.startSessionInternal(sessionId, dbSession);
        } else {
          logger.warn(
            { sessionId },
            "Cannot reconnect: session not found in DB",
          );
        }
      },
    );
  }

  getSession(sessionId: string) {
    return this.sessionStore.get(sessionId);
  }

  getAllSessions() {
    return this.sessionStore.getAll();
  }

  async startSession(
    apiKeyId: string,
    name: string,
    webhookUrl?: string | null,
    isAdmin?: boolean,
  ) {
    // Check if the provided name is actually a UUID (existing session ID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(name)) {
      // Try to find by ID + API key first
      const existingById = await this.sessionRepo.findByIdAndApiKey(
        name,
        apiKeyId,
      );
      if (existingById) {
        if (this.sessionStore.has(existingById.id)) {
          return {
            status: "already_active",
            message: "Session already active",
            sessionId: existingById.id,
          };
        }
        // If exists but not active, update webhook and restart
        if (webhookUrl !== undefined) {
          await this.sessionRepo.updateWebhookUrl(existingById.id, webhookUrl);
        }
        return await this.startSessionInternal(existingById.id, existingById);
      }

      // For admin: try finding by ID only (admin can resume any session)
      if (isAdmin) {
        const existingByIdOnly = await this.sessionRepo.findById(name);
        if (existingByIdOnly) {
          if (this.sessionStore.has(existingByIdOnly.id)) {
            return {
              status: "already_active",
              message: "Session already active",
              sessionId: existingByIdOnly.id,
            };
          }
          // If exists but not active, update webhook and restart
          if (webhookUrl !== undefined) {
            await this.sessionRepo.updateWebhookUrl(
              existingByIdOnly.id,
              webhookUrl,
            );
          }
          return await this.startSessionInternal(
            existingByIdOnly.id,
            existingByIdOnly,
          );
        }
      }
    }

    // Check by name
    const existing = await this.sessionRepo.findByNameAndApiKey(name, apiKeyId);
    if (existing) {
      if (this.sessionStore.has(existing.id)) {
        return {
          status: "already_active",
          message: "Session already active",
          sessionId: existing.id,
        };
      }
      // If exists but not active, update webhook and restart
      if (webhookUrl !== undefined) {
        await this.sessionRepo.updateWebhookUrl(existing.id, webhookUrl);
      }
      return await this.startSessionInternal(existing.id, existing);
    }

    const id = await this.sessionRepo.create({
      apiKeyId,
      name,
      webhookUrl,
    });
    const record = await this.sessionRepo.findById(id);
    if (!record) {
      throw new AppError(
        "Failed to create session",
        500,
        "SESSION_CREATE_ERROR",
      );
    }
    return await this.startSessionInternal(id, record);
  }

  private async startSessionInternal(
    sessionId: string,
    dbRecord: SessionRecord,
  ) {
    const authPath = path.join(CONFIG.AUTH_DIR, sessionId);
    if (!fs.existsSync(authPath)) {
      fs.mkdirSync(authPath, { recursive: true });
    }

    const { state, saveCreds } = await new EncryptedAuthState(authPath).init();

    const sock = makeWASocket({
      logger: pino({ level: "silent" }) as pino.Logger,
      printQRInTerminal: false,
      auth: state,
    });

    const existingData = this.sessionStore.get(sessionId);
    const reconnectAttempts = existingData?.reconnectAttempts || 0;

    this.sessionStore.set(sessionId, {
      sock,
      status: "CONNECTING",
      webhookUrl: dbRecord.webhook_url,
      qr: null,
      reconnectAttempts,
    });

    sock.ev.on("creds.update", saveCreds);
    sock.ev.on("connection.update", (update) =>
      this.connectionHandler.handleConnectionUpdate(sessionId, update),
    );

    sock.ev.on("messages.upsert", async ({ messages }) => {
      const sessionData = this.sessionStore.get(sessionId);
      if (!sessionData) return;

      for (const msg of messages) {
        const isFromMe = msg.key.fromMe;
        const messageContent = msg.message;
        const textContent =
          messageContent?.conversation ||
          messageContent?.extendedTextMessage?.text ||
          messageContent?.imageMessage?.caption ||
          messageContent?.videoMessage?.caption ||
          "[Media/Other]";

        try {
          await this.messageLogRepo.create({
            session_id: sessionId,
            direction: isFromMe ? "outgoing" : "incoming",
            message_id: msg.key.id || undefined,
            recipient: msg.key.remoteJid || "unknown",
            message_type: Object.keys(messageContent || {})[0] || "unknown",
            content_preview: textContent?.slice(0, 200),
            status: "sent",
          });
        } catch (err) {
          logger.error({ err }, "Failed to log message");
        }

        if (!isFromMe && sessionData.webhookUrl) {
          await this.webhookDispatcher.dispatch(
            sessionData.webhookUrl,
            "message_received",
            {
              sessionId,
              message: msg,
            },
          );
        }
      }
    });

    return {
      status: "pending",
      message: "Session initiation started",
      sessionId,
    };
  }

  async stopSession(sessionId: string, finalStatus: string = "STOPPED") {
    const session = this.sessionStore.get(sessionId);

    if (!session) {
      await this.sessionRepo.updateStatus(sessionId, finalStatus);
      return {
        status: "success",
        message: "Session stopped (was inactive)",
      };
    }

    try {
      this.sessionStore.delete(sessionId);
      const sock = session.sock as unknown as {
        end?: (arg?: unknown) => void;
      };
      if (sock.end) sock.end(undefined);
      await this.sessionRepo.updateStatus(sessionId, finalStatus);
      logger.info({ sessionId }, "Session stopped");
      return { status: "success", message: "Session stopped" };
    } catch (error: unknown) {
      this.sessionStore.delete(sessionId);
      throw new AppError(
        `Error stopping session: ${error instanceof Error ? error.message : String(error)}`,
        500,
        "STOP_ERROR",
      );
    }
  }

  async logoutSession(sessionId: string) {
    const session = this.sessionStore.get(sessionId);
    const authPath = path.join(CONFIG.AUTH_DIR, sessionId);

    try {
      if (session) {
        this.sessionStore.delete(sessionId);
        const sock = session.sock as unknown as {
          logout?: () => Promise<void>;
          end?: (arg?: unknown) => void;
        };
        if (sock.logout) await sock.logout();
        if (sock.end) sock.end(undefined);
      }

      if (fs.existsSync(authPath)) {
        await EncryptedAuthState.deleteAuthDir(authPath);
      }

      await this.sessionRepo.delete(sessionId);
      return {
        status: "success",
        message: "Session logged out and data cleared",
      };
    } catch (error: unknown) {
      if (fs.existsSync(authPath)) {
        await EncryptedAuthState.deleteAuthDir(authPath);
      }
      await this.sessionRepo.delete(sessionId);
      throw new AppError(
        `Error logging out: ${error instanceof Error ? error.message : String(error)}`,
        500,
        "LOGOUT_ERROR",
      );
    }
  }

  async restoreSessions() {
    const sessions = await this.sessionRepo.findActiveSessions();
    logger.info(`Restoring ${sessions.length} sessions...`);

    for (const session of sessions) {
      try {
        await this.startSessionInternal(session.id, session);
      } catch (err) {
        logger.error(
          { sessionId: session.id, err },
          "Failed to restore session",
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // Cleanup orphaned auth dirs at startup
  cleanupOrphanAuthDirs() {
    if (!fs.existsSync(CONFIG.AUTH_DIR)) return;
    const dirs = fs.readdirSync(CONFIG.AUTH_DIR);
    // Directories in auth_info_baileys should be UUIDs matching sessions table
    // This is best-effort; we don't delete unknown dirs automatically to be safe
    // Just log warning for now
    for (const dir of dirs) {
      const fullPath = path.join(CONFIG.AUTH_DIR, dir);
      if (fs.statSync(fullPath).isDirectory()) {
        // UUID validation regex
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(dir)) {
          logger.warn(
            { dir },
            "Orphan/legacy auth directory found (not a UUID), consider manual cleanup",
          );
        }
      }
    }
  }

  async getSessionStatus(sessionId: string) {
    const session = this.sessionStore.get(sessionId);
    if (session) {
      return {
        sessionId,
        status: session.status,
        whatsappId: session.whatsappId,
      };
    }

    const dbSession = await this.sessionRepo.findById(sessionId);
    if (dbSession) {
      return {
        sessionId,
        status: dbSession.status,
        whatsappId: dbSession.whatsapp_id,
      };
    }
    return null;
  }

  async getMessageLog(sessionId: string) {
    return this.messageLogRepo.findBySessionId(sessionId);
  }

  getQRCode(sessionId: string) {
    const session = this.sessionStore.get(sessionId);
    return session
      ? { sessionId, status: session.status, qr: session.qr }
      : null;
  }

  async getAllSessionsStatus() {
    const dbSessions = await this.sessionRepo.findAll();
    return dbSessions.map((row) => {
      const mem = this.sessionStore.get(row.id);
      return {
        sessionId: row.id,
        name: row.name,
        status: mem ? mem.status : row.status,
        whatsappId: mem ? mem.whatsappId : row.whatsapp_id,
        apiKeyId: row.api_key_id,
      };
    });
  }

  async getSessionsByApiKey(apiKeyId: string) {
    const dbSessions = await this.sessionRepo.findByApiKey(apiKeyId);
    return dbSessions.map((row) => {
      const mem = this.sessionStore.get(row.id);
      return {
        sessionId: row.id,
        name: row.name,
        status: mem ? mem.status : row.status,
        whatsappId: mem ? mem.whatsappId : row.whatsapp_id,
      };
    });
  }
}
