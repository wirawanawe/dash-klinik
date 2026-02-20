'use client';

import { Bell, Search, User, Sun, Moon, LogOut, ChevronDown } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getSelectedDashboardUserId, setSelectedDashboardUserId } from '@/lib/tenant';
import { getApiHeaders } from '@/lib/api';

interface DashboardUserOption {
    id: number;
    username: string;
    role: string;
}

export function Header() {
    const { setTheme, theme } = useTheme();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();

    const [currentUser, setCurrentUser] = useState<{ username: string; role?: string } | null>(null);
    const [availableUsers, setAvailableUsers] = useState<DashboardUserOption[]>([]);
    const [selectedUserId, setSelectedUserIdState] = useState<string | null>(null);
    const [loadingUsers, setLoadingUsers] = useState(false);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownRef]);

    // Read JWT token from cookie to get current user info (including role)
    useEffect(() => {
        if (typeof document === 'undefined') return;
        const cookie = document.cookie
            .split('; ')
            .find((row) => row.startsWith('auth_token='));
        if (!cookie) return;
        const token = cookie.split('=')[1];
        try {
            const base64Payload = token.split('.')[1];
            const payloadJson = atob(base64Payload);
            const payload = JSON.parse(payloadJson);
            setCurrentUser({ username: payload.username, role: payload.role });
        } catch {
            // ignore decode errors
        }
    }, []);

    // Load available dashboard users if current user is superadmin
    useEffect(() => {
        const loadUsers = async () => {
            if (currentUser?.role !== 'superadmin') return;
            setLoadingUsers(true);
            try {
                const res = await fetch('/api/proxy/dashboard-users', {
                    headers: getApiHeaders(),
                });
                if (!res.ok) return;
                const json = await res.json();
                if (Array.isArray(json.data)) {
                    setAvailableUsers(json.data);
                }
                const stored = getSelectedDashboardUserId();
                if (stored) {
                    setSelectedUserIdState(stored);
                }
            } catch {
                // ignore
            } finally {
                setLoadingUsers(false);
            }
        };
        loadUsers();
    }, [currentUser]);

    const handleSelectUser = (id: string | null) => {
        setSelectedUserIdState(id);
        setSelectedDashboardUserId(id);
    };

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (e) {
            console.error("Logout failed", e);
        }
        router.push('/login');
    };

    return (
        <header className="bg-white dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800 h-16 flex items-center justify-between px-6 sticky top-0 z-10 w-full">
            <div className="flex items-center gap-4 w-1/3">
                <div className="relative w-full max-w-md hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-neutral-800 border-none rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                    />
                </div>
            </div>

            <div className="flex items-center gap-4">
                {currentUser?.role === 'superadmin' && (
                    <div className="hidden md:flex items-center gap-2 bg-gray-50 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 rounded-lg px-3 py-1.5">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            Lihat data sebagai:
                        </span>
                        <select
                            className="bg-transparent text-sm text-gray-800 dark:text-gray-100 outline-none"
                            value={selectedUserId ?? ''}
                            onChange={(e) =>
                                handleSelectUser(e.target.value === '' ? null : e.target.value)
                            }
                            disabled={loadingUsers}
                        >
                            <option value="">Pilih admin...</option>
                            {availableUsers.filter((u) => u.role === 'admin').map((u) => (
                                <option key={u.id} value={u.id}>
                                    {u.username}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
                <button
                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                    className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors text-gray-600 dark:text-gray-300 relative"
                >
                    <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                    <span className="sr-only">Toggle theme</span>
                </button>
               
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-neutral-800 rounded-full pl-1 pr-3 py-1 transition-colors"
                    >
                        <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-sm">
                            A
                        </div>
                        <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-neutral-900 rounded-xl shadow-lg border border-gray-200 dark:border-neutral-800 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                            <div className="px-4 py-3 border-b border-gray-100 dark:border-neutral-800">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                    {currentUser?.username ?? 'User'}
                                </p>
                                {currentUser?.role && (
                                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        Role: {currentUser.role}
                                    </p>
                                )}
                            </div>
                            <Link
                                href="/dashboard/profile"
                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors"
                                onClick={() => setIsDropdownOpen(false)}
                            >
                                <User className="h-4 w-4" />
                                Lihat Profile
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                <LogOut className="h-4 w-4" />
                                Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
