'use client';

import { useEffect, useState, useCallback } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/SearchInput';
import { Search } from 'lucide-react';
import { getSelectedDashboardUserId } from '@/lib/tenant';
import { getApiHeaders } from '@/lib/api';


export default function DokterPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        totalRows: 0,
        totalPages: 0,
    });
    const [sortColumn, setSortColumn] = useState<string | undefined>();
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Create a simple debounce mechanism if the hook doesn't exist
    const [debouncedSearch, setDebouncedSearch] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchData = useCallback(async (page = 1, searchQuery = '', limit = 10, sortBy?: string, sortOrder?: string) => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
            });

            if (searchQuery) {
                queryParams.append('nama', searchQuery);
            }
            if (sortBy) queryParams.append('sortBy', sortBy);
            if (sortOrder) queryParams.append('sortOrder', sortOrder);

            const selectedUserId = getSelectedDashboardUserId();
            const res = await fetch(`/api/proxy/dokter?${queryParams.toString()}`, {
                headers: getApiHeaders(selectedUserId ? { 'x-impersonate-user-id': selectedUserId } : undefined),
            });
            const json = await res.json();

            if (json.data) {
                setData(json.data);
                setPagination({
                    page: json.pagination.page,
                    limit: json.pagination.limit,
                    totalRows: json.pagination.totalRows,
                    totalPages: json.pagination.totalPages,
                });
            } else {
                setData([]);
                setPagination({
                    page: 1,
                    limit: 10,
                    totalRows: 0,
                    totalPages: 0,
                });
            }
        } catch (err) {
            console.error(err);
            setData([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(1, debouncedSearch, pagination.limit, sortColumn, sortDirection);
    }, [debouncedSearch, fetchData, pagination.limit, sortColumn, sortDirection]);

    const handlePageChange = (newPage: number) => {
        fetchData(newPage, debouncedSearch, pagination.limit, sortColumn, sortDirection);
    };

    const columns = [
        { header: 'ID', accessorKey: 'Dokter_ID', className: 'w-[100px]' },
        { header: 'Nama Dokter', accessorKey: 'Dokter_Name', className: 'font-medium' },
        { header: 'Spesialis', accessorKey: 'Spesialis', cell: (item: any) => item.Spesialis || '-' },
        { header: 'No HP', accessorKey: 'HP1', cell: (item: any) => item.HP1 || '-' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Dokter</h1>
            </div>

            <div className="flex items-center gap-4 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-gray-200 dark:border-neutral-800">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Cari dokter..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            <DataTable
                title="Daftar Dokter"
                description="Data dokter yang terdaftar di klinik."
                data={data}
                columns={columns}
                isLoading={loading}
                pagination={pagination}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSortChange={(col, dir) => {
                    setSortColumn(col);
                    setSortDirection(dir);
                    fetchData(1, debouncedSearch, pagination.limit, col, dir);
                }}
                onPageChange={(newPage) => fetchData(newPage, debouncedSearch, pagination.limit, sortColumn, sortDirection)}
                onLimitChange={(newLimit) => fetchData(1, debouncedSearch, newLimit, sortColumn, sortDirection)}
            />
        </div>
    );
}
