import { Request, Response } from 'express';
import templateService from '../services/templateService.js';
import { logger } from '../app.js';

const createTemplate = async (req: Request, res: Response) => {
    try {
        const template = await templateService.createTemplate(req.body);
        res.status(201).json({
            status: 'success',
            data: { template },
        });
    } catch (error: unknown) {
        if (
            error instanceof Error &&
            'code' in error &&
            error.code === '23505'
        ) {
            // Unique violation
            return res.status(409).json({
                status: 'error',
                message: 'Template with this name already exists',
            });
        }
        logger.error({ err: error }, 'Error creating template');
        res.status(500).json({
            status: 'error',
            message: 'Failed to create template',
        });
    }
};

const getTemplates = async (req: Request, res: Response) => {
    try {
        const templates = await templateService.getAllTemplates();
        res.json({
            status: 'success',
            data: { templates },
        });
    } catch (error: unknown) {
        logger.error({ err: error }, 'Error fetching templates');
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch templates',
        });
    }
};

const getTemplate = async (req: Request, res: Response) => {
    try {
        const { name } = req.params;
        const template = await templateService.getTemplateByName(
            Array.isArray(name) ? name[0] : name,
        );
        if (!template) {
            return res.status(404).json({
                status: 'error',
                message: 'Template not found',
            });
        }
        res.json({
            status: 'success',
            data: { template },
        });
    } catch (error: unknown) {
        logger.error({ err: error }, 'Error fetching template');
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch template',
        });
    }
};

const updateTemplate = async (req: Request, res: Response) => {
    try {
        const { name } = req.params;
        const template = await templateService.updateTemplate(
            Array.isArray(name) ? name[0] : name,
            req.body,
        );
        if (!template) {
            return res.status(404).json({
                status: 'error',
                message: 'Template not found',
            });
        }
        res.json({
            status: 'success',
            data: { template },
        });
    } catch (error: unknown) {
        logger.error({ err: error }, 'Error updating template');
        res.status(500).json({
            status: 'error',
            message: 'Failed to update template',
        });
    }
};

const deleteTemplate = async (req: Request, res: Response) => {
    try {
        const { name } = req.params;
        const template = await templateService.deleteTemplate(
            Array.isArray(name) ? name[0] : name,
        );
        if (!template) {
            return res.status(404).json({
                status: 'error',
                message: 'Template not found',
            });
        }
        res.json({
            status: 'success',
            message: 'Template deleted successfully',
        });
    } catch (error: unknown) {
        logger.error({ err: error }, 'Error deleting template');
        res.status(500).json({
            status: 'error',
            message: 'Failed to delete template',
        });
    }
};

export {
    createTemplate,
    getTemplates,
    getTemplate,
    updateTemplate,
    deleteTemplate,
};
