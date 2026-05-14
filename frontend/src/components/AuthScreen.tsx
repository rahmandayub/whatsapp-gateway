import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { MessageCircle, ArrowRight, Loader2 } from 'lucide-react';

export default function AuthScreen() {
    const { login } = useAuth();
    const [inputKey, setInputKey] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async () => {
        if (!inputKey.trim()) return;
        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/v1/sessions', {
                headers: { 'x-api-key': inputKey.trim() },
            });
            if (res.ok) {
                login(inputKey.trim());
            } else if (res.status === 401 || res.status === 403) {
                setError('Invalid API Key.');
            } else {
                setError(`Server error (status ${res.status})`);
            }
        } catch {
            setError('Server unreachable. Is the backend running?');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center space-y-1">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground mx-auto mb-2">
                        <MessageCircle className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-2xl">Welcome Back</CardTitle>
                    <CardDescription>
                        Enter your API Key to access the gateway
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {error && (
                        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive font-medium">
                            {error}
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="api-key">API Key</Label>
                        <Input
                            id="api-key"
                            type="password"
                            value={inputKey}
                            onChange={(e) => setInputKey(e.target.value)}
                            onKeyDown={(e) =>
                                e.key === 'Enter' && handleSubmit()
                            }
                            placeholder="sk_live_..."
                            disabled={isLoading}
                        />
                    </div>
                    <Button
                        onClick={handleSubmit}
                        disabled={isLoading || !inputKey.trim()}
                        className="w-full"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Connecting...
                            </>
                        ) : (
                            <>
                                Access Dashboard
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
