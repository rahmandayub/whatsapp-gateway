interface CreateSessionModalProps {
    onCreate: (sessionId: string, webhookUrl: string) => Promise<void>;
    onClose: () => void;
}
export default function CreateSessionModal({ onCreate, onClose }: CreateSessionModalProps): import("react/jsx-runtime").JSX.Element;
export {};
