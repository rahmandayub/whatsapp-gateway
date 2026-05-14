import { useState, useEffect, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
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
import { Copy, Shield, Plus, Trash, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface AdminToken {
    id: string;
    name: string;
    prefix: string;
    created_at: string;
    last_used_at: string | null;
    revoked_at: string | null;
    expires_at: string | null;
    created_by: string;
}

export function AdminTokensPage() {
    const api = useApi();
    const [tokens, setTokens] = useState<AdminToken[]>([]);
    const [loading, setLoading] = useState(true);
    const [newName, setNewName] = useState('');
    const [newExpiresAt, setNewExpiresAt] = useState('');
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [createdToken, setCreatedToken] = useState<{
        token: string;
        name: string;
    } | null>(null);
    const [confirmAction, setConfirmAction] = useState<{
        type: 'revoke' | 'delete' | 'regenerate';
        id: string;
        name: string;
    } | null>(null);
    const [error, setError] = useState('');

    const fetchTokens = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api('/admin/tokens', 'GET');
            if (data?.adminTokens) setTokens(data.adminTokens as AdminToken[]);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to load admin tokens',
            );
        } finally {
            setLoading(false);
        }
    }, [api]);

    useEffect(() => {
        fetchTokens();
    }, [fetchTokens]);

    const handleCreate = async () => {
        setError('');
        if (!newName.trim()) {
            setError('Token name is required');
            return;
        }
        try {
            const body: { name: string; expiresAt?: string } = {
                name: newName.trim(),
            };
            if (newExpiresAt) {
                body.expiresAt = new Date(newExpiresAt).toISOString();
            }
            const data = await api('/admin/tokens', 'POST', body);
            const created = data?.adminToken as
                | { token?: string; name?: string }
                | undefined;
            if (created?.token) {
                setCreatedToken({
                    token: created.token,
                    name: created.name || newName.trim(),
                });
                setNewName('');
                setNewExpiresAt('');
                setShowCreateDialog(false);
                toast.success('Admin token created successfully');
                fetchTokens();
            }
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Failed to create admin token',
            );
            toast.error('Failed to create admin token');
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
                await api(
                    `/admin/tokens/${confirmAction.id}/revoke`,
                    'POST',
                );
                toast.success('Admin token revoked');
            } else if (confirmAction.type === 'delete') {
                await api(`/admin/tokens/${confirmAction.id}`, 'DELETE');
                toast.success('Admin token deleted');
            } else if (confirmAction.type === 'regenerate') {
                const data = await api(
                    `/admin/tokens/${confirmAction.id}/regenerate`,
                    'POST',
                );
                const regenerated = data?.adminToken as
                    | { token?: string; name?: string }
                    | undefined;
                if (regenerated?.token) {
                    setCreatedToken({
                        token: regenerated.token,
                        name: regenerated.name || 'Regenerated Token',
                    });
                    toast.success('Admin token regenerated');
                }
            }
            fetchTokens();
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : `Failed to ${confirmAction.type}`,
            );
            toast.error(`Failed to ${confirmAction.type} admin token`);
        } finally {
            setConfirmAction(null);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    const getStatus = (token: AdminToken) => {
        if (token.revoked_at) return 'revoked';
        if (
            token.expires_at &&
            new Date(token.expires_at) < new Date()
        ) {
            return 'expired';
        }
        return 'active';
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        Admin Tokens
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Manage admin API tokens for programmatic access
                    </p>
                </div>
                <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Token
                </Button>
            </div>

            {error && (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium">
                    {error}
                </div>
            )}

            {tokens.length === 0 && !loading ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Shield className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">
                            No admin tokens found. Click "Create Token" to
                            generate one.
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
                                    <TableHead>Expires</TableHead>
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
                                    tokens.map((token) => {
                                        const status = getStatus(token);
                                        return (
                                            <TableRow key={token.id}>
                                                <TableCell className="font-medium">
                                                    {token.name}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {token.prefix}
                                                </TableCell>
                                                <TableCell>
                                                    {status === 'revoked' ? (
                                                        <Badge variant="destructive">
                                                            Revoked
                                                        </Badge>
                                                    ) : status ===
                                                      'expired' ? (
                                                        <Badge variant="secondary">
                                                            Expired
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="default">
                                                            Active
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {token.expires_at
                                                        ? new Date(
                                                              token.expires_at,
                                                          ).toLocaleDateString()
                                                        : 'Never'}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground text-sm">
                                                    {token.last_used_at
                                                        ? new Date(
                                                              token.last_used_at,
                                                          ).toLocaleDateString()
                                                        : 'Never'}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {status ===
                                                            'active' && (
                                                            <>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() =>
                                                                        handleRegenerate(
                                                                            token.id,
                                                                            token.name,
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
                                                                            token.id,
                                                                            token.name,
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
                                                                    token.id,
                                                                    token.name,
                                                                )
                                                            }
                                                        >
                                                            <Trash className="h-4 w-4 text-destructive" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </ScrollArea>
                </Card>
            )}

            <Dialog
                open={showCreateDialog}
                onOpenChange={(open) => {
                    if (!open) {
                        setShowCreateDialog(false);
                        setError('');
                    }
                }}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Create Admin Token
                        </DialogTitle>
                        <DialogDescription>
                            Create a new token for programmatic admin access.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="token-name">Name</Label>
                            <Input
                                id="token-name"
                                placeholder="e.g. platform-billing-prod"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="token-expires">
                                Expires At (optional)
                            </Label>
                            <Input
                                id="token-expires"
                                type="datetime-local"
                                value={newExpiresAt}
                                onChange={(e) =>
                                    setNewExpiresAt(e.target.value)
                                }
                            />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setShowCreateDialog(false)}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleCreate}>Create</Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog
                open={!!createdToken}
                onOpenChange={(open) => !open && setCreatedToken(null)}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5" />
                            Admin Token Created
                        </DialogTitle>
                        <DialogDescription>
                            Your new admin token has been created. This is the
                            only time it will be shown.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">
                                Name
                            </div>
                            <div className="rounded bg-muted p-2 text-sm font-mono">
                                {createdToken?.name}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">
                                Admin Token
                            </div>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 rounded bg-muted p-2 text-sm font-mono break-all">
                                    {createdToken?.token}
                                </code>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() =>
                                        copyToClipboard(createdToken!.token)
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
                                'Delete Admin Token'}
                            {confirmAction?.type === 'revoke' &&
                                'Revoke Admin Token'}
                            {confirmAction?.type === 'regenerate' &&
                                'Regenerate Admin Token'}
                        </DialogTitle>
                        <DialogDescription>
                            {confirmAction?.type === 'delete' &&
                                'This will permanently delete the admin token. This action cannot be undone.'}
                            {confirmAction?.type === 'revoke' &&
                                'This will revoke the admin token. It will no longer work for authentication.'}
                            {confirmAction?.type === 'regenerate' &&
                                'This will generate a new admin token. The old token will no longer work.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="text-sm text-muted-foreground">
                                Token Name
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
