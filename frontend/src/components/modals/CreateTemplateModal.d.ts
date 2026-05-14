interface CreateTemplateModalProps {
    onCreate: (template: {
        name: string;
        content: string;
        category?: string;
    }) => Promise<void>;
    onClose: () => void;
}
export default function CreateTemplateModal({ onCreate, onClose }: CreateTemplateModalProps): import("react/jsx-runtime").JSX.Element;
export {};
