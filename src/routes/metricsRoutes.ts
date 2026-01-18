import express, { Request, Response } from 'express';
import { register } from '../metrics/index.js';

const router = express.Router();

router.get('/', async (req: Request, res: Response) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        res.status(500).send(err);
    }
});

export default router;
