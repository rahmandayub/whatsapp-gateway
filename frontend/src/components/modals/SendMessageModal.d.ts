import type { Session } from '../../types/api';
interface SendMessageModalProps {
    sessions: Session[];
    onClose: () => void;
    onSent: () => void;
}
export default function SendMessageModal({ sessions, onClose, onSent, }: SendMessageModalProps): import("react/jsx-runtime").JSX.Element;
export {};
