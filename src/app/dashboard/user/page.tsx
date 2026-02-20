'use client';

import { Input } from '@/components/ui/SearchInput';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { useCallback, useState, useEffect } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { getApiHeaders } from '@/lib/api';

export default function UserPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [formOpen, setFormOpen] = useState(false);
    const [editingId, setEditingId] = useState<number | null>(null);
    const [formState, setFormState] = useState({
        username: '',
        password: '',
        role: 'admin',
        sql_server: '',
        sql_database: '',
        sql_user: '',
        sql_password: '',
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/proxy/dashboard-users', {
                headers: getApiHeaders(),
            });
            if (res.status === 403) {
                setError('Anda tidak memiliki akses ke manajemen user (khusus superadmin).');
                setData([]);
                return;
            }
            const json = await res.json();
            if (json.data) {
                setData(json.data);
            } else {
                setData([]);
            }
        } catch (err) {
            console.error(err);
            setError('Gagal memuat data user.');
            setData([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const isEdit = editingId !== null;
            const url = isEdit
                ? `/api/proxy/dashboard-users/${editingId}`
                : '/api/proxy/dashboard-users';
            const method = isEdit ? 'PUT' : 'POST';

            const payload = isEdit
                ? {
                    role: formState.role,
                    ...(formState.password ? { password: formState.password } : {}),
                    ...(formState.sql_server ? { sql_server: formState.sql_server } : {}),
                    ...(formState.sql_database ? { sql_database: formState.sql_database } : {}),
                    ...(formState.sql_user ? { sql_user: formState.sql_user } : {}),
                    ...(formState.sql_password ? { sql_password: formState.sql_password } : {}),
                }
                : formState;

            const res = await fetch(url, {
                method,
                headers: getApiHeaders({ 'Content-Type': 'application/json' }),
                body: JSON.stringify(payload),
            });
            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                throw new Error(json.message || (isEdit ? 'Gagal mengubah user' : 'Gagal membuat user'));
            }
            setFormOpen(false);
            setEditingId(null);
            setFormState({
                username: '',
                password: '',
                role: 'admin',
                sql_server: '',
                sql_database: '',
                sql_user: '',
                sql_password: '',
            });
            fetchData();
        } catch (err: any) {
            setError(
                err.message ||
                (editingId !== null
                    ? 'Terjadi kesalahan saat mengubah user.'
                    : 'Terjadi kesalahan saat membuat user.')
            );
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Yakin ingin menghapus user ini?')) return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/proxy/dashboard-users/${id}`, {
                method: 'DELETE',
                headers: getApiHeaders(),
            });
            if (!res.ok) {
                const json = await res.json().catch(() => ({}));
                throw new Error(json.message || 'Gagal menghapus user');
            }
            fetchData();
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan saat menghapus user.');
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { header: 'ID', accessorKey: 'id', className: 'w-[80px]' },
        { header: 'Username', accessorKey: 'username', className: 'font-medium' },
        { header: 'Role', accessorKey: 'role', className: 'w-[120px]' },
        { header: 'Created At', accessorKey: 'created_at' as any },
        {
            header: 'Actions',
            cell: (item: any) => (
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            setEditingId(item.id);
                            setFormState({
                                username: item.username,
                                password: '',
                                role: item.role,
                                sql_server: item.sql_server || '',
                                sql_database: item.sql_database || '',
                                sql_user: item.sql_user || '',
                                sql_password: '', // Jangan return/tampilkan password sql secara langsung
                            });
                            setFormOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/20 dark:text-amber-300"
                    >
                        <Pencil className="h-3 w-3" />
                        Edit
                    </button>
                    <button
                        onClick={() => handleDelete(item.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400"
                    >
                        <Trash2 className="h-3 w-3" />
                        Hapus
                    </button>
                </div>
            ),
            className: 'w-[160px]',
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">User Dashboard (Login)</h1>
            </div>

            {error && (
                <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm">
                    {error}
                </div>
            )}

            <DataTable
                title="Daftar User Dashboard"
                description="User yang memiliki akses login ke DashKlinik."
                data={data}
                columns={columns}
                isLoading={loading}
                action={
                    <button
                        onClick={() => {
                            setEditingId(null);
                            setFormState({
                                username: '',
                                password: '',
                                role: 'admin',
                                sql_server: '',
                                sql_database: '',
                                sql_user: '',
                                sql_password: '',
                            });
                            setFormOpen(true);
                        }}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Tambah User
                    </button>
                }
            />

            {formOpen && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl border border-gray-200 dark:border-neutral-800 w-full max-w-lg p-6 space-y-4">
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {editingId !== null ? 'Edit User Dashboard' : 'Tambah User Dashboard'}
                        </h2>
                        <form onSubmit={handleSubmit} className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Username</label>
                                    <Input
                                        value={formState.username}
                                        onChange={(e) => setFormState({ ...formState, username: e.target.value })}
                                        required
                                        disabled={editingId !== null}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                        {editingId !== null ? 'Password (kosongkan jika tidak diubah)' : 'Password'}
                                    </label>
                                    <Input
                                        type="password"
                                        value={formState.password}
                                        onChange={(e) => setFormState({ ...formState, password: e.target.value })}
                                        required={editingId === null}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Role</label>
                                    <select
                                        className="w-full rounded-md border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm"
                                        value={formState.role}
                                        onChange={(e) => setFormState({ ...formState, role: e.target.value })}
                                    >
                                        <option value="admin">admin</option>
                                        <option value="superadmin">superadmin</option>
                                    </select>
                                </div>
                            </div>
                            {formState.role === 'admin' && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                            {editingId !== null ? 'SQL Server (opsional)' : 'SQL Server'}
                                        </label>
                                        <Input
                                            value={formState.sql_server}
                                            onChange={(e) => setFormState({ ...formState, sql_server: e.target.value })}
                                            required={editingId === null}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                            {editingId !== null ? 'SQL Database (opsional)' : 'SQL Database'}
                                        </label>
                                        <Input
                                            value={formState.sql_database}
                                            onChange={(e) => setFormState({ ...formState, sql_database: e.target.value })}
                                            required={editingId === null}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                            {editingId !== null ? 'SQL User (opsional)' : 'SQL User'}
                                        </label>
                                        <Input
                                            value={formState.sql_user}
                                            onChange={(e) => setFormState({ ...formState, sql_user: e.target.value })}
                                            required={editingId === null}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">
                                            {editingId !== null ? 'SQL Password (opsional)' : 'SQL Password'}
                                        </label>
                                        <Input
                                            type="password"
                                            value={formState.sql_password}
                                            onChange={(e) => setFormState({ ...formState, sql_password: e.target.value })}
                                            required={editingId === null}
                                        />
                                    </div>
                                </div>
                            )}
                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setFormOpen(false)}
                                    className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-neutral-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-800"
                                >
                                    Batal
                                </button>
                                <button
                                    type="submit"
                                    className="px-3 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                                >
                                    Simpan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
