import express from 'express';
import * as sessionController from '../controllers/sessionController.js';
import {
    validate,
    validateParams,
    schemas,
} from '../middlewares/validationMiddleware.js';
import { upload } from '../config/upload.js';
import { combinedAuth } from '../middlewares/combinedAuth.js';
import { sessionOwnershipGuard } from '../middlewares/sessionOwnershipGuard.js';

const router = express.Router();

// Param validation
router.param('sessionId', validateParams(schemas.sessionIdParam));

// All routes require API key OR admin auth
router.use(combinedAuth);

router.post(
    '/start',
    validate(schemas.startSession),
    sessionController.startSession,
);
router.get('/', sessionController.getSessions);

// Routes below require ownership verification
router.use('/:sessionId', sessionOwnershipGuard);

router.get('/:sessionId/status', sessionController.getSessionStatus);
router.get('/:sessionId/qr', sessionController.getSessionQR);
router.post('/:sessionId/stop', sessionController.stopSession);
router.post('/:sessionId/logout', sessionController.logoutSession);
router.post(
    '/:sessionId/message/send/text',
    validate(schemas.sendText),
    sessionController.sendText,
);
router.post(
    '/:sessionId/message/send/media',
    validate(schemas.sendMedia),
    sessionController.sendMedia,
);
router.post(
    '/:sessionId/message/send/file',
    upload.array('files', 10),
    sessionController.sendFile,
);
router.post(
    '/:sessionId/message/send/template',
    validate(schemas.sendTemplate),
    sessionController.sendTemplate,
);
router.get('/:sessionId/messages/log', sessionController.getMessageLog);

export default router;
