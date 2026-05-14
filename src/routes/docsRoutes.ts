import express from 'express';
import swaggerUi from 'swagger-ui-express';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';
import { adminAuth } from '../middlewares/adminAuth.js';

const DOCS_PUBLIC = process.env.DOCS_PUBLIC === 'true';

const router = express.Router();
const swaggerDocument = yaml.load(
    fs.readFileSync(
        path.join(process.cwd(), 'src', 'docs', 'openapi.yaml'),
        'utf8',
    ),
) as Record<string, unknown>;

if (!DOCS_PUBLIC) {
    router.use(adminAuth);
}

router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

export default router;
