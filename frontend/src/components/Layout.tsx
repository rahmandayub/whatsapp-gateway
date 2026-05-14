import { useState, useMemo } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from './theme-provider';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from './ui/sheet';
import { Separator } from './ui/separator';
import {
    LayoutDashboard,
    Smartphone,
    MessageSquare,
    FileText,
    KeyRound,
    Shield,
    Menu,
    Sun,
    Moon,
    Monitor,
    LogOut,
    MessageCircle,
} from 'lucide-react';

const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/sessions', label: 'Sessions', icon: Smartphone },
    { to: '/messages', label: 'Messages', icon: MessageSquare },
    { to: '/templates', label: 'Templates', icon: FileText },
    { to: '/keys', label: 'API Keys', icon: KeyRound },
    { to: '/admin-tokens', label: 'Admin Tokens', icon: Shield },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center gap-3 px-4 py-5">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <MessageCircle className="h-5 w-5" />
                </div>
                <div className="flex flex-col">
                    <span className="text-sm font-bold leading-none">
                        WA Gateway
                    </span>
                    <span className="text-[10px] text-muted-foreground leading-none mt-0.5">
                        Admin Console
                    </span>
                </div>
            </div>

            <Separator />

            <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map((item) => (
                    <NavLink
                        key={item.to}
                        to={item.to}
                        onClick={onNavigate}
                        className={({ isActive }) =>
                            `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                                isActive
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                            }`
                        }
                    >
                        <item.icon className="h-4 w-4" />
                        {item.label}
                    </NavLink>
                ))}
            </nav>
        </div>
    );
}

export function Layout() {
    const { logout } = useAuth();
    const { theme, setTheme } = useTheme();
    const [mobileOpen, setMobileOpen] = useState(false);
    const systemTheme = useMemo(
        () =>
            window.matchMedia('(prefers-color-scheme: dark)').matches
                ? 'Dark'
                : 'Light',
        [],
    );

    return (
        <div className="flex h-screen w-full bg-background text-foreground">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-60 flex-col border-r bg-card">
                <SidebarContent />
            </aside>

            {/* Main Content Area */}
            <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
                {/* Top Header */}
                <header className="flex h-14 items-center justify-between border-b bg-card px-4 shrink-0">
                    <div className="flex items-center gap-3">
                        {/* Mobile Menu */}
                        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                            <SheetTrigger className="md:hidden inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground h-9 w-9">
                                <Menu className="h-5 w-5" />
                                <span className="sr-only">Toggle menu</span>
                            </SheetTrigger>
                            <SheetContent
                                side="left"
                                className="w-60 p-0 bg-card"
                            >
                                <SheetTitle className="sr-only">
                                    Navigation
                                </SheetTitle>
                                <SidebarContent
                                    onNavigate={() => setMobileOpen(false)}
                                />
                            </SheetContent>
                        </Sheet>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Theme Toggle */}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                const next =
                                    theme === 'light'
                                        ? 'dark'
                                        : theme === 'dark'
                                          ? 'system'
                                          : 'light';
                                setTheme(next);
                            }}
                            title={
                                theme === 'system'
                                    ? `System (${systemTheme})`
                                    : theme === 'light'
                                      ? 'Light mode'
                                      : 'Dark mode'
                            }
                        >
                            {theme === 'system' ? (
                                <Monitor className="h-[1.2rem] w-[1.2rem]" />
                            ) : theme === 'light' ? (
                                <Sun className="h-[1.2rem] w-[1.2rem]" />
                            ) : (
                                <Moon className="h-[1.2rem] w-[1.2rem]" />
                            )}
                            <span className="sr-only">Toggle theme</span>
                        </Button>

                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={logout}
                            title="Sign Out"
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="sr-only">Sign out</span>
                        </Button>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-auto p-4 md:p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
