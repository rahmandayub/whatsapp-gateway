import Joi, { Schema } from 'joi';
import { Request, Response, NextFunction } from 'express';

const validate =
    (schema: Schema) =>
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const value = await schema.validateAsync(req.body);
            req.body = value; // Update body with sanitized/validated values
            next();
        } catch (error: unknown) {
            return res.status(400).json({
                status: 'error',
                message:
                    error instanceof Error && 'details' in error
                        ? (error as { details: [{ message: string }] })
                              .details[0].message
                        : 'Validation error',
            });
        }
    };

const validateParams =
    (schema: Schema) =>
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            await schema.validateAsync(req.params);
            next();
        } catch (error: unknown) {
            return res.status(400).json({
                status: 'error',
                message:
                    error instanceof Error && 'details' in error
                        ? (error as { details: [{ message: string }] })
                              .details[0].message
                        : 'Validation error',
            });
        }
    };

const schemas = {
    startSession: Joi.object({
        name: Joi.string().min(1).max(255).optional(),
        sessionId: Joi.string().min(1).max(255).optional(),
        webhookUrl: Joi.string()
            .max(2048)
            .uri({ scheme: ['http', 'https'] })
            .allow(null, '')
            .empty('')
            .optional(),
        apiKeyId: Joi.string().uuid().optional(),
    }).or('name', 'sessionId'),
    sendText: Joi.object({
        to: Joi.string()
            .required()
            .pattern(/^[0-9]+@s\.whatsapp\.net$/)
            .message(
                '"to" must be a valid WhatsApp ID (e.g. 1234567890@s.whatsapp.net)',
            ),
        message: Joi.string().max(4096).required(),
    }),
    sendMedia: Joi.object({
        to: Joi.string()
            .required()
            .pattern(/^[0-9]+@s\.whatsapp\.net$/),
        type: Joi.string().valid('image', 'video', 'document').required(),
        mediaUrl: Joi.string().max(2048).uri().required(),
        caption: Joi.string().max(1024).allow('', null),
    }),
    createTemplate: Joi.object({
        name: Joi.string()
            .min(3)
            .max(64)
            .pattern(/^[a-zA-Z0-9_-]+$/)
            .required(),
        content: Joi.string().max(4096).required(),
        language: Joi.string().length(2).default('en'),
        category: Joi.string().optional(),
    }),
    updateTemplate: Joi.object({
        content: Joi.string().max(4096).optional(),
        language: Joi.string().length(2).optional(),
        category: Joi.string().optional(),
    }),
    sendTemplate: Joi.object({
        to: Joi.string()
            .required()
            .pattern(/^[0-9]+@s\.whatsapp\.net$/),
        templateName: Joi.string()
            .max(64)
            .pattern(/^[a-zA-Z0-9_-]+$/)
            .required(),
        variables: Joi.object()
            .pattern(Joi.string().max(64), Joi.string().max(1024))
            .max(50)
            .optional(),
    }),
    sendFile: Joi.object({
        to: Joi.string()
            .required()
            .pattern(/^[0-9]+@s\.whatsapp\.net$/)
            .message(
                '"to" must be a valid WhatsApp ID (e.g. 1234567890@s.whatsapp.net)',
            ),
        captions: Joi.array().items(Joi.string().max(1024)).max(10).optional(),
    }),
    sessionIdParam: Joi.object({
        sessionId: Joi.string().uuid({ version: 'uuidv4' }).required(),
    }),
    templateNameParam: Joi.object({
        name: Joi.string()
            .pattern(/^[a-zA-Z0-9_-]{1,64}$/)
            .required(),
    }),
};

export { validate, validateParams, schemas };
