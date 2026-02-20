'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, Loader2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Call backend API via proxy
            const res = await fetch('/api/proxy/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (res.ok) {
                const data = await res.json();
                // Store token in cookie for middleware
                document.cookie = `auth_token=${data.token}; path=/; max-age=86400; SameSite=Lax`;
                router.push('/dashboard');
            } else {
                const data = await res.json();
                setError(data.message || 'Login failed');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-neutral-950 p-4">
            <div className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-neutral-800">
                <div className="p-8 space-y-6">
                    <div className="text-center space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                            Welcome Back
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400">
                            Enter your credentials to access the dashboard
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="username">
                                Username
                            </label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                <input
                                    id="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 dark:bg-neutral-800 dark:text-white"
                                    placeholder="Enter username"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300" htmlFor="password">
                                Password
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-neutral-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-gray-50 dark:bg-neutral-800 dark:text-white"
                                    placeholder="Enter password"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 text-red-500 text-sm animate-in fade-in slide-in-from-top-1">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={cn(
                                "w-full flex items-center justify-center p-2.5 rounded-lg text-white font-medium transition-all shadow-md hover:shadow-lg",
                                loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 active:scale-[0.98]"
                            )}
                        >
                            {loading ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                            ) : (
                                <>
                                    Sign In <ArrowRight className="ml-2 h-4 w-4" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="text-center text-xs text-gray-400">
                        Protected by Cloud Security Systems &copy; 2024
                    </div>
                </div>
                <div className="h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
            </div>
        </div>
    );
}
