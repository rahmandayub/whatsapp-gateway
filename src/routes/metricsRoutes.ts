import express, { Request, Response, NextFunction } from 'express';
import { register } from '../metrics/index.js';

const METRICS_TOKEN = process.env.METRICS_TOKEN;
const METRICS_PUBLIC = process.env.METRICS_PUBLIC === 'true';

function metricsAuth(req: Request, res: Response, next: NextFunction) {
    if (METRICS_PUBLIC) {
        return next();
    }
    const auth = req.headers.authorization;
    const token = auth?.startsWith('Bearer ') ? auth.slice(7) : undefined;
    if (!METRICS_TOKEN || token !== METRICS_TOKEN) {
        return res
            .status(401)
            .json({ status: 'error', message: 'Unauthorized' });
    }
    next();
}

const router = express.Router();

router.get('/', metricsAuth, async (req: Request, res: Response) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        res.status(500).send(err);
    }
});

export default router;
