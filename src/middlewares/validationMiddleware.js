import Joi from 'joi';

const validate = (schema) => (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({
            status: 'error',
            message: error.details[0].message,
        });
    }
    next();
};

const schemas = {
    startSession: Joi.object({
        sessionId: Joi.string()
            .pattern(/^[a-zA-Z0-9-_]+$/)
            .min(3)
            .required(),
        webhookUrl: Joi.string().uri().allow(null, ''),
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
