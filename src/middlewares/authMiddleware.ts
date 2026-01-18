import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
    const validApiKey = process.env.API_KEY;

    if (!validApiKey) {
        console.error('API_KEY is not set in environment variables.');
        return res.status(503).json({
            status: 'error',
            message: 'Service Unavailable: API configuration error',
        });
    }

    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
        return res.status(401).json({
            status: 'error',
            message: 'Unauthorized: Invalid or missing API Key',
        });
    }

    // Task 1.1.3: API key format validation (min length)
    if (apiKey.length < 10) {
        return res.status(401).json({
            status: 'error',
            message: 'Unauthorized: Invalid API Key format',
        });
    }

    // Task 1.1.2: Implement timing-safe comparison
    try {
        const apiKeyBuffer = Buffer.from(apiKey);
        const validApiKeyBuffer = Buffer.from(validApiKey);

        if (apiKeyBuffer.length !== validApiKeyBuffer.length ||
            !crypto.timingSafeEqual(apiKeyBuffer, validApiKeyBuffer)) {
            return res.status(401).json({
                status: 'error',
                message: 'Unauthorized: Invalid or missing API Key',
            });
        }
    } catch (error) {
         return res.status(401).json({
            status: 'error',
            message: 'Unauthorized: Invalid or missing API Key',
        });
    }

    next();
};

export default apiKeyAuth;
