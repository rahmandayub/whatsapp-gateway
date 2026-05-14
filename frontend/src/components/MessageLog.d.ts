import type { MessageLogEntry } from '../types/api';
interface MessageLogProps {
    messages: MessageLogEntry[];
    onSendMessage: () => void;
}
export default function MessageLog({ messages, onSendMessage }: MessageLogProps): import("react/jsx-runtime").JSX.Element;
export {};
