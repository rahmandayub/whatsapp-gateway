import pool from '../config/database.js';

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
    category: string | null;
    created_at: Date;
    updated_at: Date;
}

const createTemplate = async (data: TemplateData): Promise<Template> => {
    const { name, content, language, category } = data;
    const query = `
        INSERT INTO templates (name, content, language, category)
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `;
    const values = [name, content, language || 'en', category];
    const { rows } = await pool.query<Template>(query, values);
    return rows[0];
};

const getTemplateByName = async (name: string): Promise<Template | undefined> => {
    const query = 'SELECT * FROM templates WHERE name = $1';
    const { rows } = await pool.query<Template>(query, [name]);
    return rows[0];
};

const getAllTemplates = async (): Promise<Template[]> => {
    const query = 'SELECT * FROM templates ORDER BY created_at DESC';
    const { rows } = await pool.query<Template>(query);
    return rows;
};

const updateTemplate = async (name: string, data: TemplateUpdateData): Promise<Template | undefined> => {
    const { content, language, category } = data;
    const query = `
        UPDATE templates
        SET content = COALESCE($1, content),
            language = COALESCE($2, language),
            category = COALESCE($3, category),
            updated_at = CURRENT_TIMESTAMP
        WHERE name = $4
        RETURNING *
    `;
    const values = [content, language, category, name];
    const { rows } = await pool.query<Template>(query, values);
    return rows[0];
};

const deleteTemplate = async (name: string): Promise<Template | undefined> => {
    const query = 'DELETE FROM templates WHERE name = $1 RETURNING *';
    const { rows } = await pool.query<Template>(query, [name]);
    return rows[0];
};

const renderTemplate = (template: Template, variables: Record<string, string> = {}): string => {
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
