import express from 'express';
import swaggerUi from 'swagger-ui-express';
import yaml from 'js-yaml';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const swaggerDocument = yaml.load(
    fs.readFileSync(
        path.join(process.cwd(), 'src', 'docs', 'openapi.yaml'),
        'utf8',
    ),
) as any;

router.use('/', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

export default router;
