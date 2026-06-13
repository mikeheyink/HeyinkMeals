import { PageHeader } from '../components/ui/PageHeader';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { MessageSquarePlus, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const AdminPage = () => {
    return (
        <div className="space-y-8 max-w-2xl mx-auto">
            <PageHeader
                title="Admin Settings"
                subtitle="Developer tools and app configuration"
            />

            <Card className="p-6">
                <div className="space-y-4">
                    <div>
                        <h2 className="text-lg font-semibold text-ink-900 mb-2">Feedback &amp; Dev Notes</h2>
                        <p className="text-sm text-ink-500">
                            Capture bugs, UX friction, or feature ideas — type or dictate them. Press{' '}
                            <kbd className="px-1.5 py-0.5 rounded bg-base-200 border border-base-300 text-[11px] font-semibold text-ink-700">
                                ⌘ / Ctrl + I
                            </kbd>{' '}
                            anywhere in the app, or use the button below. Notes are saved to your dev backlog,
                            where you can mark them done and copy them as a brief for AI.
                        </p>
                    </div>
                    <Button
                        variant="primary"
                        icon={MessageSquarePlus}
                        onClick={() => window.dispatchEvent(new Event('open-dev-notes'))}
                    >
                        Open Dev Notes
                    </Button>
                </div>
            </Card>

            <Card className="p-6">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-ink-900 mb-1">Account</h2>
                        <p className="text-sm text-ink-500">Sign out of this device.</p>
                    </div>
                    <Button variant="outline" onClick={() => supabase.auth.signOut()} icon={LogOut}>
                        Sign Out
                    </Button>
                </div>
            </Card>
        </div>
    );
};
