import type { Session } from '../types/api';
interface SessionsPanelProps {
    sessions: Session[];
    onCreateSession: () => void;
    onViewQR: (sessionId: string) => void;
    onResume: (sessionId: string) => void;
    onStop: (sessionId: string) => void;
    onDelete: (sessionId: string) => void;
}
export default function SessionsPanel({ sessions, onCreateSession, onViewQR, onResume, onStop, onDelete }: SessionsPanelProps): import("react/jsx-runtime").JSX.Element;
export {};
