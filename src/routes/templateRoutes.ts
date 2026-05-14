import express from 'express';
import * as templateController from '../controllers/templateController.js';
import { validate, schemas } from '../middlewares/validationMiddleware.js';
import { combinedAuth } from '../middlewares/combinedAuth.js';

const router = express.Router();

router.use(combinedAuth);

router.post(
    '/',
    validate(schemas.createTemplate),
    templateController.createTemplate,
);

router.get('/', templateController.getTemplates);

router.get('/:name', templateController.getTemplate);

router.put(
    '/:name',
    validate(schemas.updateTemplate),
    templateController.updateTemplate,
);

router.delete('/:name', templateController.deleteTemplate);

export default router;
