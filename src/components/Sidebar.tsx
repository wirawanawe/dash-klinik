'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    Activity,
    CreditCard,
    Pill,
    Building2,
    UserCog,
    Clock,
    Notebook,
    FileText,
    ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: Users, label: 'Pasien', href: '/dashboard/pasien' },
    { icon: Activity, label: 'Kunjungan', href: '/dashboard/kunjungan' },
    { icon: CreditCard, label: 'Transaksi', href: '/dashboard/transaksi' },
    { icon: Pill, label: 'Master Obat', href: '/dashboard/farmasi' },
    { icon: Notebook, label: 'Apotek', href: '/dashboard/resep' },
    { icon: Users, label: 'Dokter', href: '/dashboard/dokter' },
    { icon: UserCog, label: 'User', href: '/dashboard/user' },
    {
        icon: FileText,
        label: 'Laporan',
        children: [
            { label: 'Laporan Penjualan Obat', href: '/dashboard/laporan/penjualan-obat' },
            { label: 'Laporan Pembelian Obat', href: '/dashboard/laporan/pembelian-obat' },
            { label: 'Laporan Transaksi Perusahaan', href: '/dashboard/laporan/transaksi-perusahaan' },
        ],
    },
];

export function Sidebar() {
    const pathname = usePathname();
    const [waktu, setWaktu] = useState<string>('');
    const [laporanOpen, setLaporanOpen] = useState<boolean>(() => pathname.startsWith('/dashboard/laporan'));
    const [currentRole, setCurrentRole] = useState<string | null>(null);

    useEffect(() => {
        const updateTime = () => {
            setWaktu(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    }, []);

    // Baca role user saat ini dari JWT di cookie
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
            if (typeof payload.role === 'string') {
                setCurrentRole(payload.role);
            }
        } catch {
            // abaikan error decode
        }
    }, []);

    const visibleMenuItems = menuItems.filter((item) => {
        if (currentRole === 'admin' && item.label === 'User') {
            return false;
        }
        return true;
    });

    return (
        <aside className="w-64 bg-white dark:bg-neutral-900 border-r border-gray-200 dark:border-neutral-800 hidden md:flex flex-col h-screen fixed left-0 top-0 z-20">
            <div className="p-6 flex items-center gap-3">
                <Building2 className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                    DashKlinik
                </span>
            </div>

            <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
                {visibleMenuItems.map((item) => {
                    const Icon = item.icon;
                    const hasChildren = Array.isArray((item as any).children) && (item as any).children.length > 0;

                    if (hasChildren) {
                        const children = (item as any).children as { label: string; href: string }[];
                        const isParentActive = children.some((child) => pathname.startsWith(child.href));
                        const open = laporanOpen || isParentActive;

                        return (
                            <div key={item.label} className="space-y-1">
                                <button
                                    type="button"
                                    onClick={() => setLaporanOpen((prev) => !prev)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                                        isParentActive
                                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-white"
                                    )}
                                >
                                    <Icon className={cn("h-5 w-5", isParentActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400 group-hover:text-gray-600")} />
                                    {item.label}
                                    <ChevronDown
                                        className={cn(
                                            "ml-auto h-4 w-4 text-gray-400 transition-transform",
                                            open ? "rotate-180" : ""
                                        )}
                                    />
                                </button>
                                {open && (
                                    <div className="ml-9 flex flex-col gap-1">
                                        {children.map((child) => {
                                            const childActive = pathname === child.href;
                                            return (
                                                <Link
                                                    key={child.href}
                                                    href={child.href}
                                                    className={cn(
                                                        "flex items-center px-3 py-1.5 rounded-lg text-sm transition-colors",
                                                        childActive
                                                            ? "text-blue-600 dark:text-blue-400 bg-blue-50/60 dark:bg-blue-900/20"
                                                            : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-neutral-800"
                                                    )}
                                                >
                                                    {child.label}
                                                </Link>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    }

                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href!}
                            className={cn(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                                isActive
                                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                    : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-neutral-800 hover:text-gray-900 dark:hover:text-white"
                            )}
                        >
                            <Icon className={cn("h-5 w-5", isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-400 group-hover:text-gray-600")} />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-200 dark:border-neutral-800 space-y-2">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                    <Clock className="h-5 w-5" />
                    <span className="text-lg font-bold">{waktu || '--:--:--'}</span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500">©2026 Copyrights by PT Doctor PHC Indonesia. All Rights Reserved.</p>
            </div>
        </aside>
    );
}
