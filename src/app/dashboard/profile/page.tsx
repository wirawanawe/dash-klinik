'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiHeaders } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/SearchInput'; // reusing input if suitable, or standardized input
import { User, Lock, Save, Loader2 } from 'lucide-react';

// Specialized Input component for forms if SearchInput is too specific
function FormInput({ label, id, type = "text", value, onChange, placeholder, required }: any) {
    return (
        <div className="space-y-2">
            <label htmlFor={id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-gray-200">
                {label}
            </label>
            <input
                type={type}
                id={id}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-800 dark:bg-neutral-950 dark:ring-offset-neutral-950 dark:placeholder:text-gray-400 dark:focus-visible:ring-blue-500"
            />
        </div>
    );
}

export default function ProfilePage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // In a real app, these would be initialized from a hook like useAuth() or fetched on mount
    const [formData, setFormData] = useState({
        userId: 1, // Hardcoded for simplified context, ideally fetched
        description: 'Admin User',
        password: '',
        confirmPassword: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage({ type: '', text: '' });

        if (formData.password && formData.password !== formData.confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match' });
            return;
        }

        setIsLoading(true);

        try {
            const res = await fetch('/api/proxy/trust-user/profile', {
                method: 'PUT',
                headers: getApiHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify({
                    userId: formData.userId,
                    description: formData.description,
                    password: formData.password || undefined // Only send if set
                }),
            });

            if (!res.ok) throw new Error('Failed to update profile');

            setMessage({ type: 'success', text: 'Profile updated successfully' });
            setFormData(prev => ({ ...prev, password: '', confirmPassword: '' })); // Clear password fields
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'Failed to update profile' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Profile</h1>
                <p className="text-gray-500 dark:text-gray-400">Manage your account settings and preferences.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your display name and password.</CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {message.text && (
                            <div className={`p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-50 text-red-600 dark:bg-red-900/20' : 'bg-green-50 text-green-600 dark:bg-green-900/20'}`}>
                                {message.text}
                            </div>
                        )}

                        <div className="space-y-4">
                            <FormInput
                                label="Display Name"
                                id="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Enter your name"
                                required
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormInput
                                    label="New Password"
                                    id="password"
                                    type="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Leave empty to keep current"
                                />
                                <FormInput
                                    label="Confirm Password"
                                    id="confirmPassword"
                                    type="password"
                                    value={formData.confirmPassword}
                                    onChange={handleChange}
                                    placeholder="Confirm new password"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-4">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Save Changes
                            </button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
