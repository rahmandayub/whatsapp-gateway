import { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
dotenv.config();

const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'];
    const validApiKey = process.env.API_KEY;

    if (!validApiKey) {
        console.warn(
            'API_KEY is not set in environment variables. Authentication disabled (NOT RECOMMENDED).',
        );
        return next();
    }

    if (!apiKey || apiKey !== validApiKey) {
        return res.status(401).json({
            status: 'error',
            message: 'Unauthorized: Invalid or missing API Key',
        });
    }

    next();
};

export default apiKeyAuth;
