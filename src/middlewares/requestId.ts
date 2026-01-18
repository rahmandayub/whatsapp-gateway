import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare global {
    namespace Express {
        interface Request {
            id: string;
        }
    }
}

export const requestId = (req: Request, res: Response, next: NextFunction) => {
    const id = req.headers['x-request-id'] as string || crypto.randomUUID();
    req.id = id;
    res.setHeader('X-Request-ID', id);
    next();
};
