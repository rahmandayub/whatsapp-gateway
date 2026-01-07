import whatsAppService from '../services/whatsappService.js';

export const startSession = async (req, res) => {
    try {
        const { sessionId, webhookUrl } = req.body;
        if (!sessionId) {
            return res
                .status(400)
                .json({ status: 'error', message: 'sessionId is required' });
        }
        const result = await whatsAppService.startSession(
            sessionId,
            webhookUrl,
        );
        res.json(result);
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const getSessionStatus = (req, res) => {
    try {
        const { sessionId } = req.params;
        const result = whatsAppService.getSessionStatus(sessionId);
        if (!result) {
            return res
                .status(404)
                .json({ status: 'not_found', message: 'Session not found' });
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const getSessions = (req, res) => {
    try {
        const sessions = whatsAppService.getAllSessions();
        res.json({ sessions });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const stopSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const result = await whatsAppService.stopSession(sessionId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const logoutSession = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const result = await whatsAppService.logoutSession(sessionId);
        res.json(result);
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const getSessionQR = (req, res) => {
    try {
        const { sessionId } = req.params;
        const result = whatsAppService.getQRCode(sessionId);
        if (!result) {
            return res
                .status(404)
                .json({ status: 'not_found', message: 'Session not found' });
        }
        res.json(result);
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const sendText = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { to, message } = req.body;
        if (!to || !message) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing parameters: to, message',
            });
        }
        const result = await whatsAppService.sendTextMessage(
            sessionId,
            to,
            message,
        );
        res.json({ status: 'success', result });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

export const sendMedia = async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { to, type, mediaUrl, caption } = req.body;
        if (!to || !type || !mediaUrl) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing parameters: to, type, mediaUrl',
            });
        }
        const result = await whatsAppService.sendMediaMessage(
            sessionId,
            to,
            type,
            mediaUrl,
            caption,
        );
        res.json({ status: 'success', result });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
