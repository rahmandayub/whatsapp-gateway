import { Request, Response, NextFunction } from 'express';
import { metrics } from '../metrics/index.js';

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const start = process.hrtime();

    res.on('finish', () => {
        const duration = process.hrtime(start);
        const durationInSeconds = duration[0] + duration[1] / 1e9;

        const route = req.route ? req.route.path : req.path;

        metrics.httpRequestDuration.observe(
            {
                method: req.method,
                route,
                status_code: res.statusCode.toString()
            },
            durationInSeconds
        );
    });

    next();
};
