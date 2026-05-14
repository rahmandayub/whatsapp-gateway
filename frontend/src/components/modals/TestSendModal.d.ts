import type { Template, Session } from '../../types/api';
interface TestSendModalProps {
    template: Template;
    sessions: Session[];
    onSend: (sessionId: string, to: string, templateName: string, variables: Record<string, string>) => Promise<void>;
    onClose: () => void;
}
export default function TestSendModal({ template, sessions, onSend, onClose }: TestSendModalProps): import("react/jsx-runtime").JSX.Element;
export {};
