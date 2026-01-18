import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError.js';
import { logger } from '../utils/logger.js';

export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    let error = err;

    if (!(error instanceof AppError)) {
        // Log unexpected errors with more detail
        logger.error({
            err: error,
            requestId: req.id,
            url: req.originalUrl,
            method: req.method
        }, 'Unexpected error occurred');

        // Convert to AppError for consistent response
        error = new AppError('Internal Server Error', 500, 'INTERNAL_SERVER_ERROR');
    } else {
        // Operational errors
        logger.warn({
            err: error,
            requestId: req.id,
            code: (error as AppError).code
        }, error.message);
    }

    const appError = error as AppError;

    res.status(appError.statusCode).json({
        status: appError.status,
        message: appError.message,
        code: appError.code,
        requestId: req.id,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
