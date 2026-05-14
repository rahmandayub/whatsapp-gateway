import { useState } from 'react';
import { useSessions } from '../hooks/useSessions';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { usePolling } from '../hooks/usePolling';
import { toast } from 'sonner';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Skeleton } from '../components/ui/skeleton';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '../components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../components/ui/table';
import { ScrollArea } from '../components/ui/scroll-area';
import {
    Smartphone,
    Plus,
    Play,
    Square,
    Trash2,
    QrCode,
    CheckCircle2,
} from 'lucide-react';

function StatusBadge({ status }: { status: string }) {
    const variantMap: Record<
        string,
        'default' | 'secondary' | 'destructive' | 'outline'
    > = {
        CONNECTED: 'default',
        SCANNING_QR: 'secondary',
        CONNECTING: 'secondary',
        STOPPED: 'destructive',
        DISCONNECTED: 'destructive',
    };
    return <Badge variant={variantMap[status] || 'outline'}>{status}</Badge>;
}

function QRDialog({
    sessionId,
    open,
    onClose,
}: {
    sessionId: string;
    open: boolean;
    onClose: () => void;
}) {
    const apiCall = useApi();
    const [qrImage, setQrImage] = useState('');
    const [isConnected, setIsConnected] = useState(false);

    const fetchQR = async () => {
        const res = await apiCall(`/sessions/${sessionId}/qr`);
        if (!res) return;
        if (res.qrImage) {
            setQrImage(res.qrImage);
        } else if (res.status === 'CONNECTED') {
            setIsConnected(true);
            toast.success('Session connected!');
            setTimeout(onClose, 1200);
        }
    };

    usePolling(fetchQR, 3000, open);

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Scan QR Code</DialogTitle>
                    <DialogDescription>
                        Scan with WhatsApp to connect {sessionId}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center py-4">
                    {isConnected ? (
                        <div className="flex flex-col items-center gap-3 py-6">
                            <CheckCircle2 className="h-12 w-12 text-green-500" />
                            <p className="text-green-600 font-medium">
                                Connected!
                            </p>
                        </div>
                    ) : qrImage ? (
                        <img
                            src={qrImage}
                            alt="QR Code"
                            className="rounded-lg border"
                        />
                    ) : (
                        <div className="flex flex-col items-center gap-3 py-6">
                            <Skeleton className="h-48 w-48 rounded-lg" />
                            <p className="text-sm text-muted-foreground">
                                Loading QR code...
                            </p>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function CreateSessionDialog({
    open,
    onClose,
    onCreate,
}: {
    open: boolean;
    onClose: () => void;
    onCreate: (sessionId: string, webhookUrl: string) => Promise<void>;
}) {
    const [sessionId, setSessionId] = useState('');
    const [webhookUrl, setWebhookUrl] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!sessionId.trim()) {
            toast.error('Session ID is required');
            return;
        }
        setIsSubmitting(true);
        try {
            await onCreate(sessionId.trim(), webhookUrl.trim());
            setSessionId('');
            setWebhookUrl('');
            onClose();
            toast.success('Session created! Please wait for QR code.');
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : 'Failed to create session',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New Session</DialogTitle>
                    <DialogDescription>
                        Create a new WhatsApp session
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="session-id">Session ID</Label>
                        <Input
                            id="session-id"
                            value={sessionId}
                            onChange={(e) => setSessionId(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === 'Enter' && handleSubmit()
                            }
                            placeholder="e.g. business-account-1"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="webhook">Webhook URL (optional)</Label>
                        <Input
                            id="webhook"
                            type="url"
                            value={webhookUrl}
                            onChange={(e) => setWebhookUrl(e.target.value)}
                            placeholder="https://your-server.com/webhook"
                        />
                    </div>
                </div>
                <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Creating...' : 'Create'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function SessionsPage() {
    const { isAuthenticated } = useAuth();
    const {
        sessions,
        fetchSessions,
        createSession,
        resumeSession,
        stopSession,
        deleteSession,
    } = useSessions(isAuthenticated);

    const [showCreate, setShowCreate] = useState(false);
    const [qrSessionId, setQrSessionId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    const handleResume = async (sessionId: string) => {
        await resumeSession(sessionId);
        await fetchSessions();
    };

    const handleStop = async (sessionId: string) => {
        await stopSession(sessionId);
        await fetchSessions();
    };

    const handleDelete = async (sessionId: string) => {
        if (confirmDelete === sessionId) {
            await deleteSession(sessionId);
            setConfirmDelete(null);
            await fetchSessions();
            toast.success('Session deleted');
        } else {
            setConfirmDelete(sessionId);
            setTimeout(() => setConfirmDelete(null), 3000);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Sessions
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Manage your connected WhatsApp instances
                    </p>
                </div>
                <Button onClick={() => setShowCreate(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Session
                </Button>
            </div>

            {sessions.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Smartphone className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">
                            No active sessions found. Start by creating one.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card size="flush">
                    <ScrollArea className="w-full">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Session</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>WhatsApp ID</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sessions.map((session) => (
                                    <TableRow key={session.sessionId}>
                                        <TableCell className="font-medium">
                                            {session.sessionId}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge
                                                status={session.status}
                                            />
                                        </TableCell>
                                        <TableCell className="text-muted-foreground font-mono text-xs">
                                            {session.whatsappId
                                                ? session.whatsappId
                                                      .split(':')[0]
                                                      .split('@')[0]
                                                : '—'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {session.status ===
                                                    'SCANNING_QR' && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            setQrSessionId(
                                                                session.sessionId,
                                                            )
                                                        }
                                                    >
                                                        <QrCode className="h-4 w-4" />
                                                    </Button>
                                                )}
                                                {(session.status ===
                                                    'STOPPED' ||
                                                    session.status ===
                                                        'DISCONNECTED') && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            handleResume(
                                                                session.sessionId,
                                                            )
                                                        }
                                                    >
                                                        <Play className="h-4 w-4 text-green-600" />
                                                    </Button>
                                                )}
                                                {session.status !== 'STOPPED' &&
                                                    session.status !==
                                                        'DISCONNECTED' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() =>
                                                                handleStop(
                                                                    session.sessionId,
                                                                )
                                                            }
                                                        >
                                                            <Square className="h-4 w-4 text-amber-600" />
                                                        </Button>
                                                    )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        handleDelete(
                                                            session.sessionId,
                                                        )
                                                    }
                                                    className={
                                                        confirmDelete ===
                                                        session.sessionId
                                                            ? 'text-destructive bg-destructive/10'
                                                            : ''
                                                    }
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </Card>
            )}

            <CreateSessionDialog
                open={showCreate}
                onClose={() => setShowCreate(false)}
                onCreate={async (id, webhook) => {
                    await createSession(id, webhook);
                    await fetchSessions();
                }}
            />

            {qrSessionId && (
                <QRDialog
                    sessionId={qrSessionId}
                    open={!!qrSessionId}
                    onClose={() => setQrSessionId(null)}
                />
            )}
        </div>
    );
}
