import Joi, { Schema, CustomHelpers } from 'joi';
import { Request, Response, NextFunction } from 'express';
import { validateWebhookUrl } from '../utils/urlValidator.js';

// Async validation helper for Joi
const urlValidator = async (value: string, helpers: CustomHelpers) => {
    if (!value) return value; // Allow empty if allowed by Joi
    const isValid = await validateWebhookUrl(value);
    if (!isValid) {
        return helpers.error('any.invalid');
    }
    return value;
};

const validate = (schema: Schema) => async (req: Request, res: Response, next: NextFunction) => {
    try {
        const value = await schema.validateAsync(req.body);
        req.body = value; // Update body with sanitized/validated values
        next();
    } catch (error: any) {
        return res.status(400).json({
            status: 'error',
            message: error.details[0].message,
        });
    }
};

const schemas = {
    startSession: Joi.object({
        sessionId: Joi.string()
            .pattern(/^[a-zA-Z0-9-_]+$/)
            .min(3)
            .required(),
        webhookUrl: Joi.string().uri().external(urlValidator).allow(null, ''),
    }),
    sendText: Joi.object({
        to: Joi.string()
            .required()
            .pattern(/^[0-9]+@s\.whatsapp\.net$/)
            .message(
                '"to" must be a valid WhatsApp ID (e.g. 1234567890@s.whatsapp.net)',
            ),
        message: Joi.string().required(),
    }),
    sendMedia: Joi.object({
        to: Joi.string()
            .required()
            .pattern(/^[0-9]+@s\.whatsapp\.net$/),
        type: Joi.string().valid('image', 'video', 'document').required(),
        mediaUrl: Joi.string().uri().required(),
        caption: Joi.string().allow('', null),
    }),
    createTemplate: Joi.object({
        name: Joi.string().min(3).required(),
        content: Joi.string().required(),
        language: Joi.string().length(2).default('en'),
        category: Joi.string().optional(),
    }),
    updateTemplate: Joi.object({
        content: Joi.string().optional(),
        language: Joi.string().length(2).optional(),
        category: Joi.string().optional(),
    }),
    sendTemplate: Joi.object({
        to: Joi.string()
            .required()
            .pattern(/^[0-9]+@s\.whatsapp\.net$/),
        templateName: Joi.string().required(),
        variables: Joi.object().optional(),
    }),
};

export { validate, schemas };
