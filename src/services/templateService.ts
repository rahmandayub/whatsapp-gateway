import { TemplateRepository } from '../repositories/TemplateRepository.js';

interface TemplateData {
    name: string;
    content: string;
    language?: string;
    category?: string;
}

interface TemplateUpdateData {
    content?: string;
    language?: string;
    category?: string;
}

interface Template {
    id: number;
    name: string;
    content: string;
    language: string;
    category?: string; // Repository returns category as optional/string
    created_at: Date;
    updated_at?: Date; // Repository might not return updated_at explicitly in my interface yet, but DB has it.
}

const templateRepo = new TemplateRepository();

const createTemplate = async (data: TemplateData) => {
    return templateRepo.create(data);
};

const getTemplateByName = async (name: string) => {
    return templateRepo.findByName(name);
};

const getAllTemplates = async () => {
    return templateRepo.findAll();
};

const updateTemplate = async (name: string, data: TemplateUpdateData) => {
    return templateRepo.update(name, data);
};

const deleteTemplate = async (name: string) => {
    const existing = await templateRepo.findByName(name);
    if (!existing) return undefined;

    await templateRepo.delete(name);
    return existing; // Return deleted object to maintain interface compatibility
};

const renderTemplate = (template: { content: string }, variables: Record<string, string> = {}): string => {
    let rendered = template.content;
    for (const [key, value] of Object.entries(variables)) {
        // Replace {{key}} with value, globally
        const regex = new RegExp(`{{${key}}}`, 'g');
        rendered = rendered.replace(regex, value);
    }
    return rendered;
};

export default {
    createTemplate,
    getTemplateByName,
    getAllTemplates,
    updateTemplate,
    deleteTemplate,
    renderTemplate,
};
