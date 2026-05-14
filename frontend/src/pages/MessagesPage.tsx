import { useState, useRef } from 'react';
import { useMessageLog } from '../hooks/useMessageLog';
import { useSessions } from '../hooks/useSessions';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { toast } from 'sonner';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '../components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { Send, X } from 'lucide-react';

type Filter = 'all' | 'incoming' | 'outgoing';

interface FileItem {
    rawFile: File;
    caption: string;
    id: string;
}

function SendMessageDialog({
    open,
    onClose,
    onSent,
}: {
    open: boolean;
    onClose: () => void;
    onSent: () => void;
}) {
    const { isAuthenticated } = useAuth();
    const { sessions } = useSessions(isAuthenticated);
    const apiCall = useApi();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [sessionId, setSessionId] = useState('');
    const [to, setTo] = useState('');
    const [msgType, setMsgType] = useState<'text' | 'file'>('text');
    const [text, setText] = useState('');
    const [files, setFiles] = useState<FileItem[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const selectedSession = sessions.find((s) => s.sessionId === sessionId);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selected = Array.from(e.target.files || []);
        const newFiles = selected.map((f) => ({
            rawFile: f,
            caption: '',
            id: `${Date.now()}-${Math.random()}`,
        }));
        setFiles((prev) => [...prev, ...newFiles]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const removeFile = (id: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== id));
    };

    const updateCaption = (id: string, caption: string) => {
        setFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, caption } : f)),
        );
    };

    const handleSubmit = async () => {
        if (!sessionId) {
            toast.error('Please select a session');
            return;
        }
        if (!to.trim()) {
            toast.error('Recipient is required');
            return;
        }
        const recipient = to.includes('@')
            ? to.trim()
            : `${to.trim()}@s.whatsapp.net`;
        setIsSubmitting(true);
        try {
            if (msgType === 'text') {
                if (!text.trim()) {
                    toast.error('Message text is required');
                    setIsSubmitting(false);
                    return;
                }
                await apiCall(
                    `/sessions/${sessionId}/message/send/text`,
                    'POST',
                    {
                        to: recipient,
                        message: text,
                    },
                );
            } else {
                if (files.length === 0) {
                    toast.error('Please select files');
                    setIsSubmitting(false);
                    return;
                }
                const formData = new FormData();
                formData.append('to', recipient);
                files.forEach((f) => {
                    formData.append('files', f.rawFile);
                    formData.append('captions', f.caption);
                });
                await apiCall(
                    `/sessions/${sessionId}/message/send/file`,
                    'POST',
                    formData,
                );
            }
            toast.success('Message sent!');
            onSent();
            onClose();
            setSessionId('');
            setTo('');
            setText('');
            setFiles([]);
        } catch (err) {
            toast.error(
                err instanceof Error ? err.message : 'Failed to send message',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Send Message</DialogTitle>
                    <DialogDescription>
                        Send a message via an active session
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Session</Label>
                        <Select
                            value={sessionId}
                            onValueChange={(v) => setSessionId(v ?? '')}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a session...">
                                    {selectedSession ? (
                                        <>
                                            {selectedSession.name}
                                            {selectedSession.whatsappId &&
                                                ` - ${selectedSession.whatsappId}`}
                                        </>
                                    ) : null}
                                </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                                {sessions
                                    .filter((s) => s.status === 'CONNECTED')
                                    .map((s) => (
                                        <SelectItem
                                            key={s.sessionId}
                                            value={s.sessionId}
                                        >
                                            {s.name}
                                            {s.whatsappId &&
                                                ` - ${s.whatsappId}`}
                                        </SelectItem>
                                    ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>To</Label>
                        <Input
                            value={to}
                            onChange={(e) => setTo(e.target.value)}
                            placeholder="628123456789"
                        />
                    </div>

                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant={msgType === 'text' ? 'default' : 'outline'}
                            className="flex-1"
                            onClick={() => setMsgType('text')}
                        >
                            Text
                        </Button>
                        <Button
                            type="button"
                            variant={msgType === 'file' ? 'default' : 'outline'}
                            className="flex-1"
                            onClick={() => setMsgType('file')}
                        >
                            File
                        </Button>
                    </div>

                    {msgType === 'text' ? (
                        <div className="space-y-2">
                            <Label>Message</Label>
                            <Textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                rows={4}
                                placeholder="Type your message..."
                            />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                + Select Files
                            </Button>
                            {files.length > 0 && (
                                <div className="space-y-2">
                                    {files.map((f) => (
                                        <div
                                            key={f.id}
                                            className="flex items-center gap-2 rounded-md border p-2"
                                        >
                                            <span className="text-xs truncate flex-1">
                                                {f.rawFile.name}
                                            </span>
                                            <Input
                                                value={f.caption}
                                                onChange={(e) =>
                                                    updateCaption(
                                                        f.id,
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Caption"
                                                className="w-32 h-7 text-xs"
                                            />
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="h-7 w-7"
                                                onClick={() => removeFile(f.id)}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="flex gap-3 justify-end">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Sending...' : 'Send'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export function MessagesPage() {
    const { isAuthenticated } = useAuth();
    const { messages } = useMessageLog(isAuthenticated);
    const [filter, setFilter] = useState<Filter>('all');
    const [showSend, setShowSend] = useState(false);

    const filtered = messages.filter((m) =>
        filter === 'all' ? true : m.direction === filter,
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Messages
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Live incoming and outgoing message log
                    </p>
                </div>
                <Button onClick={() => setShowSend(true)}>
                    <Send className="h-4 w-4 mr-2" />
                    Quick Send
                </Button>
            </div>

            <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
                <TabsList>
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="incoming">Incoming</TabsTrigger>
                    <TabsTrigger value="outgoing">Outgoing</TabsTrigger>
                </TabsList>
            </Tabs>

            <Card size="flush">
                <ScrollArea className="w-full">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Time</TableHead>
                                <TableHead>Direction</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead>Message</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((msg) => (
                                <TableRow key={msg.id}>
                                    <TableCell className="whitespace-nowrap text-muted-foreground font-mono text-xs">
                                        {new Date(
                                            msg.timestamp,
                                        ).toLocaleTimeString([], {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit',
                                        })}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                msg.direction === 'incoming'
                                                    ? 'default'
                                                    : 'secondary'
                                            }
                                        >
                                            {msg.direction}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="text-sm font-medium">
                                            {msg.from || msg.to}
                                        </div>
                                        <div className="text-xs text-muted-foreground font-mono">
                                            {msg.sessionId}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <p className="text-sm max-w-xs truncate">
                                            {msg.text}
                                        </p>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {filtered.length === 0 && (
                                <TableRow>
                                    <TableCell
                                        colSpan={4}
                                        className="text-center py-8 text-muted-foreground"
                                    >
                                        {messages.length === 0
                                            ? 'Waiting for messages...'
                                            : 'No messages match this filter.'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </ScrollArea>
            </Card>

            <SendMessageDialog
                open={showSend}
                onClose={() => setShowSend(false)}
                onSent={() => {}}
            />
        </div>
    );
}
