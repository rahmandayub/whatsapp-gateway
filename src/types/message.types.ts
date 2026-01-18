export interface MessagePayload {
    to: string;
    message?: string;
    type?: 'image' | 'video' | 'document' | 'audio';
    mediaUrl?: string;
    caption?: string;
    fileObj?: {
        path: string;
        mimetype: string;
        originalname: string;
    };
    templateName?: string;
    variables?: Record<string, string>;
}
