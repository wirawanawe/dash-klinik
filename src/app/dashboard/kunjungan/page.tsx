'use client';

import { Input } from '@/components/ui/SearchInput';
import { Search, X, FileText, Loader2 } from 'lucide-react';
import { useCallback, useState, useEffect } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { getSelectedDashboardUserId } from '@/lib/tenant';
import { getApiHeaders } from '@/lib/api';

type DiagnosaRow = { No: number; ICD: string; Diseases: string; DiagnosaType: string; DiagnosaCase: string; FinalState: string };

export default function KunjunganPage() {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        totalRows: 0,
        totalPages: 0,
    });

    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailKunjungan, setDetailKunjungan] = useState<any | null>(null);
    const [detailDiagnosa, setDetailDiagnosa] = useState<DiagnosaRow[]>([]);
    const [detailResep, setDetailResep] = useState<any[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchData = useCallback(async (page = 1, searchQuery = '', start = '', end = '', limit = 10) => {
        setLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
            });

            if (searchQuery) {
                // Determine if search query is number (likely No MR) or text (Nama Peserta)
                if (/^\d+$/.test(searchQuery)) {
                    queryParams.append('noMR', searchQuery);
                } else {
                    queryParams.append('namaPeserta', searchQuery);
                }
            }

            if (start) queryParams.append('startDate', start);
            if (end) queryParams.append('endDate', end);

            const selectedUserId = getSelectedDashboardUserId();

            const res = await fetch(`/api/proxy/kunjungan?${queryParams.toString()}`, {
                headers: getApiHeaders(
                    selectedUserId ? { 'x-impersonate-user-id': selectedUserId } : undefined
                ),
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

    const fetchDetail = useCallback(async (item: any) => {
        const id = item?.Kunjungan_ID;
        if (id == null || id === '') {
            setDetailError('ID kunjungan tidak valid.');
            setDetailOpen(true);
            setDetailKunjungan(null);
            setDetailDiagnosa([]);
            setDetailLoading(false);
            return;
        }
        setDetailOpen(true);
        setDetailLoading(true);
        setDetailError(null);
        setDetailKunjungan(null);
        setDetailDiagnosa([]);
        setDetailResep([]);
        try {
            const selectedUserId = getSelectedDashboardUserId();
            const res = await fetch(`/api/proxy/kunjungan/${encodeURIComponent(String(id))}/detail`, {
                headers: getApiHeaders(selectedUserId ? { 'x-impersonate-user-id': selectedUserId } : undefined),
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) {
                setDetailError(json.message || `Gagal memuat detail (${res.status})`);
                return;
            }
            setDetailKunjungan(json.kunjungan ?? null);
            setDetailDiagnosa(Array.isArray(json.diagnosa) ? json.diagnosa : []);
            setDetailResep(Array.isArray(json.resep) ? json.resep : []);
        } catch (err) {
            setDetailError(err instanceof Error ? err.message : 'Gagal memuat detail.');
        } finally {
            setDetailLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(1, debouncedSearch, startDate, endDate, pagination.limit);
    }, [debouncedSearch, startDate, endDate, fetchData]);
    // Note: pagination.limit in dependency array might trigger double fetch on mount if not careful, 
    // but needed if limit changes from other source. 
    // Actually limit change is handled by onLimitChange which calls fetchData explicitly. 
    // So we can remove pagination.limit from dep array or keep it if we want it to react to state change.
    // Given the DataTable implementation handles the call, we might not need it here but let's be safe.
    // Actually, onLimitChange calls fetchData(1, ..., newLimit) but doesn't update state `pagination` immediately
    // until `setData` is called. So it's fine.

    const columns = [
        { header: 'No Kunjungan', accessorKey: 'Kunjungan_ID', className: 'font-medium' },
        {
            header: 'Tgl Kunjungan',
            accessorKey: 'Tgl_Kunjungan',
            cell: (item: any) => new Date(item.Tgl_Kunjungan).toLocaleDateString('id-ID')
        },
        { header: 'No MR', accessorKey: 'No_MR' },
        { header: 'Nama Pasien', accessorKey: 'Nama_Peserta' },
        { header: 'Dokter', accessorKey: 'Dokter_Name' },
        {
            header: 'Poli',
            accessorKey: 'Unit_Name',
            cell: (item: any) => item.Unit_Name ?? item.Unit_ID ?? '-',
        },
        {
            header: 'Aksi',
            className: 'w-[120px]',
            cell: (item: any) => (
                <button
                    type="button"
                    onClick={() => fetchDetail(item)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300"
                >
                    <FileText className="h-3.5 w-3.5" />
                    Lihat Detail
                </button>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Kunjungan</h1>
            </div>

            <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-gray-200 dark:border-neutral-800">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Cari Nama Pasien atau No MR..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-900"
                    />
                    <span className="text-gray-500">-</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="h-10 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-neutral-800 dark:bg-neutral-900"
                    />
                </div>
            </div>

            <DataTable
                title="Riwayat Kunjungan"
                description="Data kunjungan pasien ke klinik."
                data={data}
                columns={columns}
                isLoading={loading}
                pagination={pagination}
                onPageChange={(newPage) => fetchData(newPage, debouncedSearch, startDate, endDate, pagination.limit)}
                onLimitChange={(newLimit) => fetchData(1, debouncedSearch, startDate, endDate, newLimit)}
            />

            {detailOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 px-6 py-5 flex items-center justify-between shrink-0">
                            <h2 className="text-xl font-bold text-white">Detail Kunjungan</h2>
                            <button
                                type="button"
                                onClick={() => setDetailOpen(false)}
                                className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors"
                                aria-label="Tutup"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-6 space-y-6">
                            {detailLoading ? (
                                <div className="flex items-center justify-center py-12 gap-2 text-gray-500">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                    <span>Memuat detail...</span>
                                </div>
                            ) : detailError ? (
                                <p className="text-red-600 dark:text-red-400 text-sm">{detailError}</p>
                            ) : detailKunjungan ? (
                                <>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-gray-50 dark:bg-neutral-800/50 border border-gray-200 dark:border-neutral-700">
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Tgl Kunjungan</p>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {detailKunjungan.Tgl_Kunjungan
                                                    ? new Date(detailKunjungan.Tgl_Kunjungan).toLocaleDateString('id-ID')
                                                    : '-'}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">No MR</p>
                                            <p className="font-medium text-gray-900 dark:text-white">{detailKunjungan.No_MR ?? '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Nama Pasien</p>
                                            <p className="font-medium text-gray-900 dark:text-white">{detailKunjungan.Nama_Peserta ?? '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Dokter</p>
                                            <p className="font-medium text-gray-900 dark:text-white">{detailKunjungan.Dokter_Name ?? '-'}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Poli</p>
                                            <p className="font-medium text-gray-900 dark:text-white">{detailKunjungan.Unit_Name ?? detailKunjungan.Unit_ID ?? '-'}</p>
                                        </div>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Diagnosa</h3>
                                        <div className="rounded-xl border border-gray-200 dark:border-neutral-700 overflow-hidden">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 font-medium">
                                                    <tr>
                                                        <th className="px-4 py-3 whitespace-nowrap">No.</th>
                                                        <th className="px-4 py-3 whitespace-nowrap">Kode ICD</th>
                                                        <th className="px-4 py-3 whitespace-nowrap">Penyakit (ICD)</th>
                                                        <th className="px-4 py-3 whitespace-nowrap">Tipe Diagnosa</th>
                                                        <th className="px-4 py-3 whitespace-nowrap">Kasus Diagnosa</th>
                                                        <th className="px-4 py-3 whitespace-nowrap">Status Akhir</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                                                    {detailDiagnosa.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={6} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                                                                Tidak ada data diagnosa.
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        detailDiagnosa.map((row) => (
                                                            <tr key={row.No} className="bg-white dark:bg-neutral-900">
                                                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.No ?? '-'}</td>
                                                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.ICD ?? '-'}</td>
                                                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.Diseases ?? '-'}</td>
                                                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.DiagnosaType ?? '-'}</td>
                                                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.DiagnosaCase ?? '-'}</td>
                                                                <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.FinalState ?? '-'}</td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {detailResep.length > 0 && (
                                        <div>
                                            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Resep</h3>
                                            <div className="space-y-6">
                                                {detailResep.map((resep: any, idx: number) => (
                                                    <div key={resep.NoInvoice ?? idx} className="rounded-xl border border-gray-200 dark:border-neutral-700 overflow-hidden">
                                                        <div className="bg-gray-50 dark:bg-neutral-800 px-4 py-2 border-b border-gray-200 dark:border-neutral-700">
                                                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                                                No. Resep / Invoice: {resep.NoInvoice ?? '-'}
                                                                {resep.Tgl_Resep != null && (
                                                                    <span className="ml-3 text-gray-500 dark:text-gray-400">
                                                                        Tgl: {new Date(resep.Tgl_Resep).toLocaleDateString('id-ID')}
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>
                                                        <div className="overflow-x-auto">
                                                            <table className="w-full text-left text-sm">
                                                                <thead className="bg-gray-100 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 font-medium">
                                                                    <tr>
                                                                        <th className="px-4 py-2 whitespace-nowrap">No.</th>
                                                                        <th className="px-4 py-2 whitespace-nowrap">Nama Obat / Item</th>
                                                                        <th className="px-4 py-2 whitespace-nowrap">Jumlah</th>
                                                                        <th className="px-4 py-2 whitespace-nowrap">Keterangan</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                                                                    {(resep.detail && resep.detail.length) > 0 ? (
                                                                        resep.detail.map((d: any, i: number) => (
                                                                            <tr key={i} className="bg-white dark:bg-neutral-900">
                                                                                <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{d.NoUrut ?? i + 1}</td>
                                                                                <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{d.ItemDesc ?? d.Nama_Obat ?? d.Obat_Name ?? d.Detail ?? d.Product_Name ?? '-'}</td>
                                                                                <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{d.Qty ?? d.Jumlah ?? '-'}</td>
                                                                                <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{d.Ket_Etiket ?? '-'}</td>
                                                                            </tr>
                                                                        ))
                                                                    ) : (
                                                                        <tr>
                                                                            <td colSpan={4} className="px-4 py-6 text-center text-gray-500 dark:text-gray-400">
                                                                                Tidak ada detail resep.
                                                                            </td>
                                                                        </tr>
                                                                    )}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
