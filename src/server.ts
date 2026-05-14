import path from 'path';
import express from 'express';
import { app, startServer } from './app.js';

const publicPath = path.join(process.cwd(), 'src', 'public');
app.use('/admin', express.static(publicPath));
app.use(express.static(publicPath));

// SPA Fallback - serve index.html for any non-API frontend route
// This enables React Router to handle client-side routing on refresh
app.get(/.*/, (req, res, next) => {
    if (
        req.path.startsWith('/api') ||
        req.path.startsWith('/health') ||
        req.path.startsWith('/metrics') ||
        req.path.startsWith('/docs')
    ) {
        return next();
    }
    res.sendFile(path.join(publicPath, 'index.html'));
});

startServer();
