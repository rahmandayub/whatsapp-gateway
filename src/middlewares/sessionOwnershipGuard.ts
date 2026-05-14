import { Response, NextFunction } from 'express';
import { SessionRepository } from '../repositories/SessionRepository.js';
import { CombinedAuthRequest } from './combinedAuth.js';

const sessionRepo = new SessionRepository();

export async function sessionOwnershipGuard(
    req: CombinedAuthRequest,
    res: Response,
    next: NextFunction,
) {
    const sessionId = Array.isArray(req.params.sessionId)
        ? req.params.sessionId[0]
        : req.params.sessionId;

    if (!sessionId) {
        return res
            .status(400)
            .json({ status: 'error', message: 'Session ID required' });
    }

    // Admin can access any session
    if (req.admin) {
        return next();
    }

    // API key must own the session
    if (!req.apiKey) {
        return res
            .status(401)
            .json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        const session = await sessionRepo.findById(sessionId);
        if (!session) {
            // Return 404 to avoid leaking existence of sessions owned by others
            return res
                .status(404)
                .json({ status: 'error', message: 'Session not found' });
        }

        if (session.api_key_id !== req.apiKey.id) {
            return res
                .status(404)
                .json({ status: 'error', message: 'Session not found' });
        }

        // Attach session info for downstream use
        (req as unknown as Record<string, unknown>).sessionInfo = session;

        next();
    } catch {
        return res
            .status(500)
            .json({ status: 'error', message: 'Internal server error' });
    }
}
