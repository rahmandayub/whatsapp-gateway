import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { ApiKeyRepository } from '../repositories/ApiKeyRepository.js';
import { logger } from '../utils/logger.js';

const apiKeyRepo = new ApiKeyRepository();

export interface ApiKeyAuthRequest extends Request {
  apiKey?: {
    id: string;
    prefix: string;
    name: string;
  };
}

export async function apiKeyAuth(req: ApiKeyAuthRequest, res: Response, next: NextFunction) {
  const apiKeyHeader = req.headers['x-api-key'] as string;

  if (!apiKeyHeader) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized: Missing API key' });
  }

  if (apiKeyHeader.length < 10) {
    return res.status(401).json({ status: 'error', message: 'Unauthorized: Invalid API key format' });
  }

  const hash = crypto.createHash('sha256').update(apiKeyHeader).digest('hex');

  try {
    const record = await apiKeyRepo.findByHash(hash);
    if (!record) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized: Invalid API key' });
    }

    if (record.revoked_at) {
      return res.status(401).json({ status: 'error', message: 'Unauthorized: API key revoked' });
    }

    // Attach to request
    req.apiKey = {
      id: record.id,
      prefix: record.prefix,
      name: record.name,
    };

    // Update last_used_at asynchronously (don't block)
    apiKeyRepo.updateLastUsedAt(record.id).catch(() => {});

    next();
  } catch (err) {
    logger.error({ err }, 'API key auth lookup failed');
    return res.status(500).json({ status: 'error', message: 'Internal server error' });
  }
}
