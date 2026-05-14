import express from 'express';
import { rateLimit } from 'express-rate-limit';
import * as adminController from '../controllers/adminController.js';
import { adminAuth } from '../middlewares/adminAuth.js';

const router = express.Router();

const loginRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { status: 'error', message: 'Too many login attempts' },
});

// Public admin login (rate limited)
router.post('/login', loginRateLimit, adminController.adminLogin);

// Protected admin routes
router.use(adminAuth);

router.post('/logout', adminController.adminLogout);
router.get('/me', adminController.adminMe);

// Admin Tokens management
router.get('/tokens', adminController.listAdminTokens);
router.post('/tokens', adminController.createAdminToken);
router.post('/tokens/:id/regenerate', adminController.regenerateAdminToken);
router.post('/tokens/:id/revoke', adminController.revokeAdminToken);
router.delete('/tokens/:id', adminController.deleteAdminToken);

// API Keys management
router.get('/api-keys', adminController.listApiKeys);
router.post('/api-keys', adminController.createApiKey);
router.post('/api-keys/:id/regenerate', adminController.regenerateApiKey);
router.post('/api-keys/:id/revoke', adminController.revokeApiKey);
router.delete('/api-keys/:id', adminController.deleteApiKey);
router.get('/api-keys/:id/sessions', adminController.getApiKeySessions);

// Audit logs
router.get('/audit-logs', adminController.listAuditLogs);

// Message logs
router.get('/message-logs', adminController.listMessageLogs);

export default router;
