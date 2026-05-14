import type { Template } from '../types/api';
interface TemplatesPanelProps {
    templates: Template[];
    onCreate: () => void;
    onTestSend: (template: Template) => void;
    onDelete: (name: string) => void;
}
export default function TemplatesPanel({ templates, onCreate, onTestSend, onDelete }: TemplatesPanelProps): import("react/jsx-runtime").JSX.Element;
export {};
