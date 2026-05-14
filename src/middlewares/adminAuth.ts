import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
export interface AuthenticatedAdminRequest extends Request {
    admin?: boolean;
}

const MASTER_API_KEY = process.env.MASTER_API_KEY;
const MASTER_API_KEY_HASH = process.env.MASTER_API_KEY_HASH;
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;

function verifyMasterKey(key: string): boolean {
    if (!key || key.length < 10) return false;
    if (MASTER_API_KEY_HASH) {
        return bcrypt.compareSync(key, MASTER_API_KEY_HASH);
    }
    if (MASTER_API_KEY) {
        return key === MASTER_API_KEY;
    }
    return false;
}

function adminAuth(
    req: AuthenticatedAdminRequest,
    res: Response,
    next: NextFunction,
) {
    // Allow via master API key header
    const adminKey = req.headers['x-admin-key'] as string;
    if (adminKey && verifyMasterKey(adminKey)) {
        req.admin = true;
        return next();
    }

    // Allow via JWT cookie
    const token = req.cookies?.admin_token;
    if (!token || !JWT_SECRET) {
        return res
            .status(401)
            .json({ status: 'error', message: 'Unauthorized' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as {
            sub: string;
            role: string;
        };
        if (decoded.role === 'admin' && decoded.sub === ADMIN_USERNAME) {
            req.admin = true;
            return next();
        }
        return res.status(403).json({ status: 'error', message: 'Forbidden' });
    } catch {
        return res
            .status(401)
            .json({ status: 'error', message: 'Unauthorized' });
    }
}

export { adminAuth };
