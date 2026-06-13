import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { LogIn, Loader2 } from 'lucide-react';

export const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !password) return;
        setSubmitting(true);
        setError(null);
        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim(),
                password,
            });
            if (signInError) {
                setError(signInError.message);
            }
            // On success, the global auth listener flips the session and App routes onward.
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold text-ink-900 tracking-tight">
                        Heyink<span className="text-accent">Meals</span>
                    </h1>
                    <p className="text-sm text-ink-500 mt-1">Sign in to continue</p>
                </div>

                <form
                    onSubmit={handleSubmit}
                    className="bg-white rounded-2xl border border-base-300 shadow-sm p-6 space-y-4"
                >
                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-ink-300 mb-1 block">
                            Email
                        </label>
                        <input
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="zen-input w-full"
                            placeholder="you@example.com"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-ink-300 mb-1 block">
                            Password
                        </label>
                        <input
                            type="password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="zen-input w-full"
                            placeholder="••••••••"
                        />
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={submitting || !email.trim() || !password}
                        icon={submitting ? Loader2 : LogIn}
                    >
                        {submitting ? 'Signing in…' : 'Sign In'}
                    </Button>
                </form>
            </div>
        </div>
    );
};
