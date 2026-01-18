import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

export const CONFIG = {
    // Default to 'auth_info_baileys' in the root directory if not specified
    AUTH_DIR: process.env.AUTH_DIR ? path.resolve(process.env.AUTH_DIR) : path.resolve(process.cwd(), 'auth_info_baileys'),

    // Check if path is inside public directory (security check)
    isPathSecure: (targetPath: string): boolean => {
        const publicDir = path.resolve(process.cwd(), 'public');
        const resolvedPath = path.resolve(targetPath);
        return !resolvedPath.startsWith(publicDir);
    }
};
