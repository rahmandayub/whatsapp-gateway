import dotenv from 'dotenv';

dotenv.config();

// Docker Compose .env parser uses $$ for literal $.
// Unescape $$ -> $ so Node.js gets the correct values.
for (const [key, value] of Object.entries(process.env)) {
    if (value && value.includes('$$')) {
        process.env[key] = value.replace(/\$\$/g, '$');
    }
}
