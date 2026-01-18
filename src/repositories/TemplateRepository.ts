import pool from '../config/database.js';

interface Template {
    id: number;
    name: string;
    content: string;
    language: string;
    category?: string;
    created_at: Date;
}

export class TemplateRepository {
    async findByName(name: string): Promise<Template | null> {
        const result = await pool.query('SELECT * FROM templates WHERE name = $1', [name]);
        return result.rows[0] || null;
    }

    async findAll(): Promise<Template[]> {
        const result = await pool.query('SELECT * FROM templates ORDER BY created_at DESC');
        return result.rows;
    }

    async create(data: { name: string; content: string; language?: string; category?: string }): Promise<Template> {
        const { name, content, language = 'en', category } = data;
        const result = await pool.query(
            'INSERT INTO templates (name, content, language, category) VALUES ($1, $2, $3, $4) RETURNING *',
            [name, content, language, category]
        );
        return result.rows[0];
    }

    async update(name: string, data: { content?: string; language?: string; category?: string }): Promise<Template | null> {
        const { content, language, category } = data;

        // Build dynamic query
        const updates: string[] = [];
        const values: any[] = [name];
        let idx = 2;

        if (content !== undefined) {
            updates.push(`content = $${idx++}`);
            values.push(content);
        }
        if (language !== undefined) {
            updates.push(`language = $${idx++}`);
            values.push(language);
        }
        if (category !== undefined) {
            updates.push(`category = $${idx++}`);
            values.push(category);
        }

        if (updates.length === 0) return this.findByName(name);

        const query = `UPDATE templates SET ${updates.join(', ')} WHERE name = $1 RETURNING *`;
        const result = await pool.query(query, values);
        return result.rows[0] || null;
    }

    async delete(name: string): Promise<boolean> {
        const result = await pool.query('DELETE FROM templates WHERE name = $1', [name]);
        return (result.rowCount ?? 0) > 0;
    }
}
