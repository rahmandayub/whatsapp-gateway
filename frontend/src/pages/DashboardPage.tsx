import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSessions } from '../hooks/useSessions';
import { useTemplates } from '../hooks/useTemplates';
import { useMessageLog } from '../hooks/useMessageLog';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { ScrollArea } from '../components/ui/scroll-area';
import {
    Smartphone,
    FileText,
    MessageSquare,
    Activity,
    ArrowRight,
    Plus,
    Send,
} from 'lucide-react';

export function DashboardPage() {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const { sessions } = useSessions(isAuthenticated);
    const { templates, fetchTemplates } = useTemplates(isAuthenticated);
    const { messages } = useMessageLog(isAuthenticated);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            await fetchTemplates();
            setLoading(false);
        };
        load();
    }, [fetchTemplates]);

    const connectedCount = sessions.filter(
        (s) => s.status === 'CONNECTED',
    ).length;
    const recentMessages = messages.slice(0, 8);

    const stats = [
        {
            title: 'Total Sessions',
            value: sessions.length,
            icon: Smartphone,
            href: '/sessions',
        },
        {
            title: 'Connected',
            value: connectedCount,
            icon: Activity,
            href: '/sessions',
        },
        {
            title: 'Templates',
            value: templates.length,
            icon: FileText,
            href: '/templates',
        },
        {
            title: 'Messages Today',
            value: messages.length,
            icon: MessageSquare,
            href: '/messages',
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground text-sm">
                    Overview of your WhatsApp gateway
                </p>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                    <Card
                        key={stat.title}
                        className="hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => navigate(stat.href)}
                    >
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.title}
                            </CardTitle>
                            <stat.icon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <Skeleton className="h-8 w-16" />
                            ) : (
                                <div className="text-3xl font-bold">
                                    {stat.value}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Quick Actions */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="text-base">
                            Quick Actions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <Button
                            variant="outline"
                            className="w-full justify-between"
                            onClick={() => navigate('/sessions')}
                        >
                            <span className="flex items-center gap-2">
                                <Plus className="h-4 w-4" />
                                New Session
                            </span>
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full justify-between"
                            onClick={() => navigate('/messages')}
                        >
                            <span className="flex items-center gap-2">
                                <Send className="h-4 w-4" />
                                Send Message
                            </span>
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                        <Button
                            variant="outline"
                            className="w-full justify-between"
                            onClick={() => navigate('/templates')}
                        >
                            <span className="flex items-center gap-2">
                                <FileText className="h-4 w-4" />
                                New Template
                            </span>
                            <ArrowRight className="h-4 w-4" />
                        </Button>
                    </CardContent>
                </Card>

                {/* Recent Activity */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-base">
                            Recent Messages
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <ScrollArea className="h-64">
                            {recentMessages.length === 0 ? (
                                <div className="p-6 text-center text-sm text-muted-foreground">
                                    No messages yet
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {recentMessages.map((msg) => (
                                        <div
                                            key={msg.id}
                                            className="flex items-start gap-3 p-4 hover:bg-muted/50 transition-colors"
                                        >
                                            <Badge
                                                variant={
                                                    msg.direction === 'incoming'
                                                        ? 'default'
                                                        : 'secondary'
                                                }
                                                className="mt-0.5 shrink-0"
                                            >
                                                {msg.direction}
                                            </Badge>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm font-medium truncate">
                                                    {msg.from || msg.to}
                                                </p>
                                                <p className="text-xs text-muted-foreground truncate">
                                                    {msg.text}
                                                </p>
                                            </div>
                                            <span className="text-xs text-muted-foreground shrink-0">
                                                {new Date(
                                                    msg.timestamp,
                                                ).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                })}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
