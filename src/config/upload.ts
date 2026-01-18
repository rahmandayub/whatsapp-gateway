import path from 'path';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';

// Configuration
export const UPLOAD_CONFIG = {
    // 16MB default limit
    MAX_FILE_SIZE: process.env.MAX_UPLOAD_SIZE ? parseInt(process.env.MAX_UPLOAD_SIZE) : 16 * 1024 * 1024,

    // Temp directory for uploads - ensure it exists
    TEMP_DIR: process.env.UPLOAD_DIR ? path.resolve(process.env.UPLOAD_DIR) : path.resolve(process.cwd(), 'temp_uploads'),

    // Allowed MIME types
    ALLOWED_MIME_TYPES: [
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/gif',
        'video/mp4',
        'video/3gpp',
        'audio/mpeg',
        'audio/mp4',
        'audio/ogg',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/plain',
        'text/csv'
    ]
};

// Ensure temp dir exists
if (!fs.existsSync(UPLOAD_CONFIG.TEMP_DIR)) {
    fs.mkdirSync(UPLOAD_CONFIG.TEMP_DIR, { recursive: true });
}

// Multer Storage - Use randomized filenames
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_CONFIG.TEMP_DIR);
    },
    filename: (req, file, cb) => {
        // Random filename to prevent overwrites and path traversal
        const uniqueSuffix = crypto.randomBytes(16).toString('hex');
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
    }
});

// Multer Instance
export const upload = multer({
    storage: storage,
    limits: {
        fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE,
    },
    fileFilter: (req, file, cb) => {
        if (UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`Invalid file type. Allowed types: ${UPLOAD_CONFIG.ALLOWED_MIME_TYPES.join(', ')}`));
        }
    }
});
