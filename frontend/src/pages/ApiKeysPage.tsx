import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
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
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Copy, Key, Plus, Trash, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface ApiKey {
    id: string;
    name: string;
    prefix: string;
    key: string | null;
    created_at: string;
    last_used_at: string | null;
    revoked_at: string | null;
    created_by: string;
}

export function ApiKeysPage() {
    const api = useApi();
    const [keys, setKeys] = useState<ApiKey[]>([]);
    const [loading, setLoading] = useState(true);
    const [createdKey, setCreatedKey] = useState<{
        key: string;
        name: string;
    } | null>(null);
    const [confirmAction, setConfirmAction] = useState<{
        type: 'revoke' | 'delete' | 'regenerate';
        id: string;
        name: string;
    } | null>(null);
    const [error, setError] = useState('');

    const fetchKeys = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api('/admin/api-keys', 'GET');
            if (data?.apiKeys) setKeys(data.apiKeys as ApiKey[]);
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Failed to load API keys',
            );
        } finally {
            setLoading(false);
        }
    }, [api]);

    useEffect(() => {
        fetchKeys();
    }, [fetchKeys]);

    const handleCreate = async () => {
        setError('');
        const autoName = `API Key ${new Date().toISOString().slice(0, 10)} ${new Date().toLocaleTimeString()}`;
        try {
            const data = await api('/admin/api-keys', 'POST', {
                name: autoName,
            });
            const created = data?.apiKey as
                | { key?: string; name?: string }
                | undefined;
            if (created?.key) {
                setCreatedKey({
                    key: created.key,
                    name: created.name || autoName,
                });
                toast.success('API key created successfully');
                fetchKeys();
            }
        } catch (err) {
            setError(
                err instanceof Error ? err.message : 'Failed to create API key',
            );
            toast.error('Failed to create API key');
        }
    };

    const handleRevoke = (id: string, name: string) => {
        setConfirmAction({ type: 'revoke', id, name });
    };

    const handleDelete = (id: string, name: string) => {
        setConfirmAction({ type: 'delete', id, name });
    };

    const handleRegenerate = (id: string, name: string) => {
        setConfirmAction({ type: 'regenerate', id, name });
    };

    const executeConfirmAction = async () => {
        if (!confirmAction) return;

        try {
            if (confirmAction.type === 'revoke') {
                await api(`/admin/api-keys/${confirmAction.id}/revoke`, 'POST');
                toast.success('API key revoked');
            } else if (confirmAction.type === 'delete') {
                await api(`/admin/api-keys/${confirmAction.id}`, 'DELETE');
                toast.success('API key deleted');
            } else if (confirmAction.type === 'regenerate') {
                const data = await api(
                    `/admin/api-keys/${confirmAction.id}/regenerate`,
                    'POST',
                );
                const regenerated = data?.apiKey as
                    | { key?: string; name?: string }
                    | undefined;
                if (regenerated?.key) {
                    setCreatedKey({
                        key: regenerated.key,
                        name: regenerated.name || 'Regenerated Key',
                    });
                    toast.success('API key regenerated');
                }
            }
            fetchKeys();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : `Failed to ${confirmAction.type}`,
            );
            toast.error(`Failed to ${confirmAction.type} API key`);
        } finally {
            setConfirmAction(null);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        API Keys
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Manage API keys for external access
                    </p>
                </div>
                <Button onClick={handleCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Generate Key
                </Button>
            </div>

            {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium">
                    {error}
                </div>
            )}

            {keys.length === 0 && !loading ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Key className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">
                            No API keys found. Click "Generate Key" to create
                            one.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card size="flush">
                    <ScrollArea className="w-full">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Prefix</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Last Used</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={6}
                                            className="text-center py-8 text-muted-foreground"
                                        >
                                            Loading...
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    keys.map((key) => (
                                        <TableRow key={key.id}>
                                            <TableCell className="font-medium">
                                                {key.name}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="truncate max-w-[200px]">
                                                        {key.key || key.prefix}
                                                    </span>
                                                    {key.key && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-6 w-6"
                                                            onClick={() =>
                                                                copyToClipboard(
                                                                    key.key!,
                                                                )
                                                            }
                                                        >
                                                            <Copy className="h-3 w-3" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {key.revoked_at ? (
                                                    <Badge variant="destructive">
                                                        Revoked
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="default">
                                                        Active
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {new Date(
                                                    key.created_at,
                                                ).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {key.last_used_at
                                                    ? new Date(
                                                          key.last_used_at,
                                                      ).toLocaleDateString()
                                                    : 'Never'}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    {!key.revoked_at && (
                                                        <>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    handleRegenerate(
                                                                        key.id,
                                                                        key.name,
                                                                    )
                                                                }
                                                            >
                                                                Regenerate
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() =>
                                                                    handleRevoke(
                                                                        key.id,
                                                                        key.name,
                                                                    )
                                                                }
                                                            >
                                                                Revoke
                                                            </Button>
                                                        </>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() =>
                                                            handleDelete(
                                                                key.id,
                                                                key.name,
                                                            )
                                                        }
                                                    >
                                                        <Trash className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </Card>
            )}

            <Dialog
                open={!!createdKey}
                onOpenChange={(open) => !open && setCreatedKey(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Key className="h-5 w-5" />
                            API Key Created
                        </DialogTitle>
                        <DialogDescription>
                            Your new API key has been created and stored
                            securely.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">
                                Name
                            </div>
                            <div className="rounded bg-muted p-2 text-sm font-mono">
                                {createdKey?.name}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">
                                API Key
                            </div>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 rounded bg-muted p-2 text-sm font-mono break-all">
                                    {createdKey?.key}
                                </code>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() =>
                                        copyToClipboard(createdKey!.key)
                                    }
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={!!confirmAction}
                onOpenChange={(open) => !open && setConfirmAction(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-destructive" />
                            {confirmAction?.type === 'delete' &&
                                'Delete API Key'}
                            {confirmAction?.type === 'revoke' &&
                                'Revoke API Key'}
                            {confirmAction?.type === 'regenerate' &&
                                'Regenerate API Key'}
                        </DialogTitle>
                        <DialogDescription>
                            {confirmAction?.type === 'delete' &&
                                'This will permanently delete the API key. This action cannot be undone.'}
                            {confirmAction?.type === 'revoke' &&
                                'This will revoke the API key. It will no longer work for authentication.'}
                            {confirmAction?.type === 'regenerate' &&
                                'This will generate a new API key. The old key will no longer work.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">
                                API Key Name
                            </div>
                            <div className="rounded bg-muted p-2 text-sm font-mono">
                                {confirmAction?.name}
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setConfirmAction(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={executeConfirmAction}
                            >
                                {confirmAction?.type === 'delete' && 'Delete'}
                                {confirmAction?.type === 'revoke' && 'Revoke'}
                                {confirmAction?.type === 'regenerate' &&
                                    'Regenerate'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
