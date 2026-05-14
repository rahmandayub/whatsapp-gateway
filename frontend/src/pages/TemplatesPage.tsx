import { useState, useMemo, useEffect } from 'react';
import { useTemplates } from '../hooks/useTemplates';
import { useSessions } from '../hooks/useSessions';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import type { Template } from '../types/api';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '../components/ui/card';
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
import { Separator } from '../components/ui/separator';
import { FileText, Plus, Trash2, Zap } from 'lucide-react';

function CreateTemplateDialog({
    open,
    onClose,
    onCreate,
}: {
    open: boolean;
    onClose: () => void;
    onCreate: (template: {
        name: string;
        content: string;
        category?: string;
    }) => Promise<void>;
}) {
    const [name, setName] = useState('');
    const [content, setContent] = useState('');
    const [category, setCategory] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!name.trim() || !content.trim()) {
            toast.error('Name and Content are required');
            return;
        }
        setIsSubmitting(true);
        try {
            await onCreate({
                name: name.trim(),
                content: content.trim(),
                category: category.trim() || undefined,
            });
            setName('');
            setContent('');
            setCategory('');
            onClose();
            toast.success('Template created');
        } catch (err) {
            toast.error(
                err instanceof Error
                    ? err.message
                    : 'Failed to create template',
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>New Template</DialogTitle>
                    <DialogDescription>
                        Create a reusable message template
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="t-name">Name</Label>
                        <Input
                            id="t-name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === 'Enter' && handleSubmit()
                            }
                            placeholder="welcome_message"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="t-category">Category</Label>
                        <Input
                            id="t-category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            placeholder="marketing"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="t-content">Content</Label>
                        <Textarea
                            id="t-content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            rows={4}
                            placeholder="Hello {{name}}, welcome to our service!"
                        />
                        <p className="text-xs text-muted-foreground">
                            Use {'{{variable}}'} for dynamic values
                        </p>
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

function TestSendDialog({
    template,
    open,
    onClose,
}: {
    template: Template;
    open: boolean;
    onClose: () => void;
}) {
    const { isAuthenticated } = useAuth();
    const { sessions } = useSessions(isAuthenticated);
    const { sendTemplate } = useTemplates(isAuthenticated);

    const [sessionId, setSessionId] = useState('');
    const [to, setTo] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const variables = useMemo(() => {
        const matches = [...template.content.matchAll(/\{\{(.*?)\}\}/g)];
        const vars: Record<string, string> = {};
        matches.forEach((m) => {
            const key = m[1].trim();
            if (!(key in vars)) vars[key] = '';
        });
        return vars;
    }, [template]);

    const [varValues, setVarValues] =
        useState<Record<string, string>>(variables);

    // Reset varValues when template changes
    useEffect(() => {
        // eslint-disable-next-line @eslint-react/set-state-in-effect
        setVarValues(variables);
    }, [variables]);

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
            await sendTemplate(sessionId, recipient, template.name, varValues);
            onClose();
            toast.success('Message sent!');
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
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Test Send</DialogTitle>
                    <DialogDescription>
                        Testing template:{' '}
                        <span className="font-medium">{template.name}</span>
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
                                <SelectValue placeholder="Select a session..." />
                            </SelectTrigger>
                            <SelectContent>
                                {sessions
                                    .filter((s) => s.status === 'CONNECTED')
                                    .map((s) => (
                                        <SelectItem
                                            key={s.sessionId}
                                            value={s.sessionId}
                                        >
                                            {s.sessionId}
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
                    {Object.keys(varValues).length > 0 && (
                        <div className="space-y-3">
                            <Label>Variables</Label>
                            {Object.keys(varValues).map((key) => (
                                <div key={key}>
                                    <span className="text-xs text-muted-foreground font-mono">
                                        {'{{' + key + '}}'}
                                    </span>
                                    <Input
                                        value={varValues[key]}
                                        onChange={(e) =>
                                            setVarValues((prev) => ({
                                                ...prev,
                                                [key]: e.target.value,
                                            }))
                                        }
                                        placeholder={`Value for ${key}`}
                                        className="mt-1"
                                    />
                                </div>
                            ))}
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

export function TemplatesPage() {
    const { isAuthenticated } = useAuth();
    const { templates, refetchTemplates, createTemplate, deleteTemplate } =
        useTemplates(isAuthenticated);

    const [showCreate, setShowCreate] = useState(false);
    const [testTemplate, setTestTemplate] = useState<Template | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

    const handleCreate = async (template: {
        name: string;
        content: string;
        category?: string;
    }) => {
        await createTemplate(template);
        await refetchTemplates();
    };

    const handleDelete = async (name: string) => {
        if (confirmDelete === name) {
            await deleteTemplate(name);
            setConfirmDelete(null);
            await refetchTemplates();
            toast.success('Template deleted');
        } else {
            setConfirmDelete(name);
            setTimeout(() => setConfirmDelete(null), 3000);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Templates
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Reusable message templates
                    </p>
                </div>
                <Button onClick={() => setShowCreate(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Template
                </Button>
            </div>

            {templates.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <FileText className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">
                            No templates yet.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {templates.map((template) => (
                        <Card key={template.name} className="group">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <Badge
                                        variant="outline"
                                        className="text-xs"
                                    >
                                        {template.category || 'General'}
                                    </Badge>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7"
                                            onClick={() =>
                                                setTestTemplate(template)
                                            }
                                        >
                                            <Zap className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className={`h-7 w-7 ${
                                                confirmDelete === template.name
                                                    ? 'text-destructive bg-destructive/10'
                                                    : ''
                                            }`}
                                            onClick={() =>
                                                handleDelete(template.name)
                                            }
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                                <CardTitle className="text-base mt-2">
                                    {template.name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Separator className="mb-3" />
                                <p className="text-muted-foreground bg-muted rounded-md p-3 font-mono text-xs line-clamp-4">
                                    {template.content}
                                </p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            <CreateTemplateDialog
                open={showCreate}
                onClose={() => setShowCreate(false)}
                onCreate={handleCreate}
            />

            {testTemplate && (
                <TestSendDialog
                    template={testTemplate}
                    open={!!testTemplate}
                    onClose={() => setTestTemplate(null)}
                />
            )}
        </div>
    );
}
