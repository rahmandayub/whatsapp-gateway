import express from 'express';
import * as sessionController from '../controllers/sessionController.js';
import { validate, schemas } from '../middlewares/validationMiddleware.js';

const router = express.Router();

router.post(
    '/start',
    validate(schemas.startSession),
    sessionController.startSession,
);
router.get('/', sessionController.getSessions);
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

export default router;
