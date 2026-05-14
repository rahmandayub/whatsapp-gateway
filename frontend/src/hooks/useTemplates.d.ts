import type { Template } from '../types/api';
export declare function useTemplates(enabled: boolean): {
    templates: Template[];
    fetchTemplates: () => Promise<void>;
    refetchTemplates: () => Promise<void>;
    createTemplate: (template: {
        name: string;
        content: string;
        category?: string;
    }) => Promise<import("../types/api").ApiResponse | null>;
    deleteTemplate: (name: string) => Promise<import("../types/api").ApiResponse | null>;
    sendTemplate: (sessionId: string, to: string, templateName: string, variables: Record<string, string>) => Promise<import("../types/api").ApiResponse | null>;
};
