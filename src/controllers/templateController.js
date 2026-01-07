import templateService from '../services/templateService.js';
import { logger } from '../app.js';

const createTemplate = async (req, res) => {
    try {
        const template = await templateService.createTemplate(req.body);
        res.status(201).json({
            status: 'success',
            data: { template },
        });
    } catch (error) {
        if (error.code === '23505') {
            // Unique violation
            return res.status(409).json({
                status: 'error',
                message: 'Template with this name already exists',
            });
        }
        logger.error('Error creating template:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to create template',
        });
    }
};

const getTemplates = async (req, res) => {
    try {
        const templates = await templateService.getAllTemplates();
        res.json({
            status: 'success',
            data: { templates },
        });
    } catch (error) {
        logger.error('Error fetching templates:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch templates',
        });
    }
};

const getTemplate = async (req, res) => {
    try {
        const { name } = req.params;
        const template = await templateService.getTemplateByName(name);
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
    } catch (error) {
        logger.error('Error fetching template:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to fetch template',
        });
    }
};

const updateTemplate = async (req, res) => {
    try {
        const { name } = req.params;
        const template = await templateService.updateTemplate(name, req.body);
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
    } catch (error) {
        logger.error('Error updating template:', error);
        res.status(500).json({
            status: 'error',
            message: 'Failed to update template',
        });
    }
};

const deleteTemplate = async (req, res) => {
    try {
        const { name } = req.params;
        const template = await templateService.deleteTemplate(name);
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
    } catch (error) {
        logger.error('Error deleting template:', error);
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
