'use client';

import { Input } from '@/components/ui/SearchInput';
import { Search } from 'lucide-react';
import { useCallback, useState, useEffect } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { getSelectedDashboardUserId } from '@/lib/tenant';
import { getApiHeaders } from '@/lib/api';

export default function FarmasiPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('1'); // Default active
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        totalRows: 0,
        totalPages: 0,
    });
    const [sortColumn, setSortColumn] = useState<string | undefined>();
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [pabrikFilter, setPabrikFilter] = useState('');
    const [golonganFilter, setGolonganFilter] = useState('');
    const [debouncedPabrik, setDebouncedPabrik] = useState('');
    const [debouncedGolongan, setDebouncedGolongan] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedPabrik(pabrikFilter);
        }, 400);
        return () => clearTimeout(timer);
    }, [pabrikFilter]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedGolongan(golonganFilter);
        }, 400);
        return () => clearTimeout(timer);
    }, [golonganFilter]);

    const fetchData = useCallback(async (
        page = 1,
        searchQuery = '',
        activeStatus = '1',
        limit = 10,
        pabrik = '',
        golongan = '',
        sortBy?: string,
        sortOrder?: string
    ) => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
            });

            if (searchQuery) queryParams.append('namaObat', searchQuery);
            if (activeStatus !== 'all') queryParams.append('aktif', activeStatus);
            if (pabrik) queryParams.append('pabrik', pabrik);
            if (golongan) queryParams.append('golongan', golongan);
            if (sortBy) queryParams.append('sortBy', sortBy);
            if (sortOrder) queryParams.append('sortOrder', sortOrder);

            const selectedUserId = getSelectedDashboardUserId();
            const res = await fetch(`/api/proxy/farmasi/obat?${queryParams.toString()}`, {
                headers: getApiHeaders(selectedUserId ? { 'x-impersonate-user-id': selectedUserId } : undefined),
            });
            const json = await res.json();

            if (json.data) {
                setData(json.data);
                setPagination(json.pagination);
            } else {
                setData([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(1, debouncedSearch, statusFilter, pagination.limit, debouncedPabrik, debouncedGolongan, sortColumn, sortDirection);
    }, [debouncedSearch, statusFilter, debouncedPabrik, debouncedGolongan, sortColumn, sortDirection, fetchData, pagination.limit]);

    const columns = [
        { header: 'KFA Code', accessorKey: 'KFA_Code', className: 'font-medium' },
        { header: 'APLN Code', accessorKey: 'APLN_Code' },
        { header: 'Nama Obat', accessorKey: 'Detail' },
        { header: 'Pabrik', accessorKey: 'Pabrik', cell: (item: any) => item.Pabrik ?? '-' },
        { header: 'Golongan', accessorKey: 'Golongan', cell: (item: any) => item.Golongan ?? '-' },
        { header: 'Satuan', accessorKey: 'SmallUnit' },
        { header: 'Stok', accessorKey: 'Stok', cell: (item: any) => item.Stok ?? '-' },
        {
            header: 'HNA',
            accessorKey: 'HNA',
            cell: (item: any) => item.HNA ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(item.HNA) : '-'
        },
        {
            header: 'Status',
            accessorKey: 'Berlaku',
            cell: (item: any) => (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.Berlaku
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                    {item.Berlaku ? 'Active' : 'Inactive'}
                </span>
            )
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Farmasi</h1>
            </div>

            <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-gray-200 dark:border-neutral-800">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Cari Nama Obat..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Input
                    placeholder="Filter Pabrik..."
                    value={pabrikFilter}
                    onChange={(e) => setPabrikFilter(e.target.value)}
                    className="h-10 min-w-[140px] max-w-[180px]"
                />
                <Input
                    placeholder="Filter Golongan..."
                    value={golonganFilter}
                    onChange={(e) => setGolonganFilter(e.target.value)}
                    className="h-10 min-w-[140px] max-w-[180px]"
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-900"
                >
                    <option value="all">Semua Status</option>
                    <option value="1">Active Only</option>
                    <option value="0">Inactive Only</option>
                </select>
            </div>

            <DataTable
                title="Daftar Obat"
                description="Master data obat-obatan."
                data={data}
                columns={columns}
                isLoading={loading}
                pagination={pagination}
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSortChange={(col, dir) => {
                    setSortColumn(col);
                    setSortDirection(dir);
                    fetchData(1, debouncedSearch, statusFilter, pagination.limit, debouncedPabrik, debouncedGolongan, col, dir);
                }}
                onPageChange={(newPage) => fetchData(newPage, debouncedSearch, statusFilter, pagination.limit, debouncedPabrik, debouncedGolongan, sortColumn, sortDirection)}
                onLimitChange={(newLimit) => fetchData(1, debouncedSearch, statusFilter, newLimit, debouncedPabrik, debouncedGolongan, sortColumn, sortDirection)}
            />
        </div>
    );
}
