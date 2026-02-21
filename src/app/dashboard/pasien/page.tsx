'use client';

import { Input } from '@/components/ui/SearchInput';
import { Search, User, Calendar, X, Loader2, FileText, RefreshCw, AlertCircle, Users } from 'lucide-react';
import { useCallback, useState, useEffect } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { getSelectedDashboardUserId, subscribeToTenantChange } from '@/lib/tenant';
import { getApiHeaders } from '@/lib/api';

export default function PasienPage() {
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

    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [genderFilter, setGenderFilter] = useState<string>('');
    const [selectedPatient, setSelectedPatient] = useState<any | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailTab, setDetailTab] = useState<'data' | 'kunjungan' | 'keluarga'>('data');
    const [kunjunganData, setKunjunganData] = useState<any[]>([]);
    const [kunjunganLoading, setKunjunganLoading] = useState(false);
    const [kunjunganPagination, setKunjunganPagination] = useState({ page: 1, limit: 10, totalRows: 0, totalPages: 0 });
    const [listError, setListError] = useState<string | null>(null);
    const [kunjunganError, setKunjunganError] = useState<string | null>(null);
    const [keluargaData, setKeluargaData] = useState<any[]>([]);
    const [keluargaLoading, setKeluargaLoading] = useState(false);
    const [keluargaError, setKeluargaError] = useState<string | null>(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    const fetchData = useCallback(async (page = 1, searchQuery = '', limit = 10, sortBy?: string, sortOrder?: string) => {
        setLoading(true);
        setListError(null);
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
            });

            if (searchQuery) {
                if (/^\d+$/.test(searchQuery)) {
                    queryParams.append('noMR', searchQuery);
                } else {
                    queryParams.append('namaPasien', searchQuery);
                }
            }

            if (genderFilter) {
                queryParams.append('jenisKelamin', genderFilter);
            }
            if (sortBy) queryParams.append('sortBy', sortBy);
            if (sortOrder) queryParams.append('sortOrder', sortOrder);

            const selectedUserId = getSelectedDashboardUserId();
            const res = await fetch(`/api/proxy/pasien?${queryParams.toString()}`, {
                headers: getApiHeaders(selectedUserId ? { 'x-impersonate-user-id': selectedUserId } : undefined),
            });
            const json = await res.json().catch(() => ({}));

            if (!res.ok) {
                setListError(json.message || `Gagal memuat data (${res.status})`);
                setData([]);
                return;
            }

            if (json.data) {
                setData(json.data);
                setPagination(json.pagination ?? { page: 1, limit: 10, totalRows: 0, totalPages: 0 });
            } else {
                setData([]);
            }
        } catch (err) {
            console.error(err);
            setListError(err instanceof Error ? err.message : 'Gagal memuat data. Periksa koneksi ke server.');
            setData([]);
        } finally {
            setLoading(false);
        }
    }, [genderFilter]);

    useEffect(() => {
        fetchData(1, debouncedSearch, pagination.limit, sortColumn, sortDirection);
    }, [debouncedSearch, fetchData, pagination.limit, sortColumn, sortDirection]);

    const fetchKunjungan = useCallback(async (page = 1, limit = 10) => {
        if (!selectedPatient?.No_MR) return;
        setKunjunganLoading(true);
        setKunjunganError(null);
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
                noMR: selectedPatient.No_MR,
            });
            const selectedUserId = getSelectedDashboardUserId();
            const res = await fetch(`/api/proxy/kunjungan?${queryParams.toString()}`, {
                headers: getApiHeaders(selectedUserId ? { 'x-impersonate-user-id': selectedUserId } : undefined),
            });
            const json = await res.json().catch(() => ({}));

            if (!res.ok) {
                setKunjunganError(json.message || `Gagal memuat riwayat kunjungan (${res.status})`);
                setKunjunganData([]);
                return;
            }

            if (json.data) {
                setKunjunganData(json.data);
                setKunjunganPagination(json.pagination ?? { page: 1, limit: 10, totalRows: 0, totalPages: 0 });
            } else {
                setKunjunganData([]);
            }
        } catch (err) {
            console.error(err);
            setKunjunganError(err instanceof Error ? err.message : 'Gagal memuat riwayat kunjungan. Periksa koneksi ke server.');
            setKunjunganData([]);
        } finally {
            setKunjunganLoading(false);
        }
    }, [selectedPatient?.No_MR]);

    const fetchKeluarga = useCallback(async () => {
        const namaPanggilan = selectedPatient?.Nama_Panggilan;
        if (!namaPanggilan || String(namaPanggilan).trim() === '') return;
        setKeluargaLoading(true);
        setKeluargaError(null);
        try {
            const queryParams = new URLSearchParams({
                namaPanggilan: String(namaPanggilan).trim(),
                excludeNoMR: String(selectedPatient?.No_MR ?? '').trim(),
            });
            const selectedUserId = getSelectedDashboardUserId();
            const res = await fetch(`/api/proxy/pasien/keluarga?${queryParams.toString()}`, {
                headers: getApiHeaders(selectedUserId ? { 'x-impersonate-user-id': selectedUserId } : undefined),
            });
            const json = await res.json().catch(() => ({}));

            if (!res.ok) {
                setKeluargaError(json.message || `Gagal memuat anggota keluarga (${res.status})`);
                setKeluargaData([]);
                return;
            }
            setKeluargaData(json.data ?? []);
        } catch (err) {
            console.error(err);
            setKeluargaError(err instanceof Error ? err.message : 'Gagal memuat anggota keluarga.');
            setKeluargaData([]);
        } finally {
            setKeluargaLoading(false);
        }
    }, [selectedPatient?.Nama_Panggilan, selectedPatient?.No_MR]);

    useEffect(() => {
        if (detailOpen && detailTab === 'kunjungan' && selectedPatient?.No_MR) {
            fetchKunjungan(1, 10);
        }
    }, [detailOpen, detailTab, selectedPatient?.No_MR, fetchKunjungan]);

    useEffect(() => {
        if (detailOpen && detailTab === 'keluarga' && selectedPatient?.Nama_Panggilan) {
            fetchKeluarga();
        }
    }, [detailOpen, detailTab, selectedPatient?.Nama_Panggilan, fetchKeluarga]);

    useEffect(() => {
        const unsubscribe = subscribeToTenantChange(() => {
            fetchData(1, debouncedSearch, pagination.limit, sortColumn, sortDirection);
            if (detailOpen && selectedPatient) {
                if (detailTab === 'kunjungan') fetchKunjungan(1, 10);
                if (detailTab === 'keluarga') fetchKeluarga();
            }
        });
        return unsubscribe;
    }, [fetchData, debouncedSearch, pagination.limit, sortColumn, sortDirection, detailOpen, selectedPatient, detailTab, fetchKunjungan, fetchKeluarga]);

    const columns = [
        { header: 'No MR', accessorKey: 'No_MR', className: 'font-medium' },
        { header: 'Nama Pasien', accessorKey: 'Nama_Pasien' },
        { header: 'No Peserta', accessorKey: 'Nama_Panggilan' },
        {
            header: 'Tgl Lahir',
            accessorKey: 'Tgl_Lahir',
            cell: (item: any) =>
                item.Tgl_Lahir ? new Date(item.Tgl_Lahir).toLocaleDateString('id-ID') : '-',
        },
        { header: 'No KTP', accessorKey: 'NoIdentitas' },
        { header: 'No Kartu', accessorKey: 'No_KPK' },
        {
            header: 'Jenis Kelamin',
            accessorKey: 'Jenis_Kelamin',
            cell: (item: any) => {
                const val = item?.Jenis_Kelamin ?? item?.jenis_kelamin ?? '';
                const s = (typeof val === 'string' ? val.trim() : String(val ?? ''));
                return (s && s !== '-') ? s : 'Tidak diketahui';
            },
        },
        {
            header: 'Aksi',
            className: 'w-[120px]',
            cell: (item: any) => (
                <button
                    onClick={() => {
                        setSelectedPatient(item);
                        setDetailTab('data');
                        setDetailOpen(true);
                    }}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300"
                >
                    Detail
                </button>
            ),
        },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Pasien</h1>
            </div>

            {listError && (
                <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <div>
                            <p className="text-sm font-medium">{listError}</p>
                            {!listError.includes('memilih admin') && (
                                <p className="text-xs mt-1 text-red-600 dark:text-red-300 opacity-80">
                                    📡 Server sedang tidak aktif atau coba refresh kembali untuk memastikan.
                                </p>
                            )}
                        </div>
                    </div>
                    <button
                        onClick={() => fetchData(1, debouncedSearch, pagination.limit, sortColumn, sortDirection)}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/40 hover:bg-red-200 dark:hover:bg-red-900/60 text-red-800 dark:text-red-200 text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            )}

            <div className="flex items-center gap-4 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-gray-200 dark:border-neutral-800">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                        placeholder="Cari Nama Pasien atau No MR..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        Jenis Kelamin
                    </span>
                    <select
                        className="h-10 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-2 py-1.5 text-sm"
                        value={genderFilter}
                        onChange={(e) => setGenderFilter(e.target.value)}
                    >
                        <option value="">Semua</option>
                        <option value="Laki-laki">Laki-laki</option>
                        <option value="Perempuan">Perempuan</option>
                    </select>
                </div>
                <button
                    onClick={() => fetchData(1, debouncedSearch, pagination.limit, sortColumn, sortDirection)}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 text-sm font-medium transition-colors disabled:opacity-50"
                    title="Refresh / rekoneksi ke server"
                >
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            <DataTable
                title="Daftar Pasien"
                description="Data seluruh pasien yang terdaftar di klinik."
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
            {detailOpen && selectedPatient && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-800 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        {/* Header dengan gradient */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 px-6 py-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                                    <User className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">
                                        {selectedPatient.Nama_Pasien ?? '-'}
                                    </h2>
                                    <p className="text-blue-100 text-sm">
                                        No MR: {selectedPatient.No_MR ?? '-'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setDetailOpen(false)}
                                className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors"
                                aria-label="Tutup"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex border-b border-gray-200 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-800/50">
                            <button
                                onClick={() => setDetailTab('data')}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${detailTab === 'data'
                                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-neutral-900'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                <User className="h-4 w-4" />
                                Data Pasien
                            </button>
                            <button
                                onClick={() => setDetailTab('kunjungan')}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${detailTab === 'kunjungan'
                                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-neutral-900'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                <Calendar className="h-4 w-4" />
                                Riwayat Kunjungan
                                {kunjunganPagination.totalRows > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-xs text-blue-700 dark:text-blue-300">
                                        {kunjunganPagination.totalRows}
                                    </span>
                                )}
                            </button>
                            <button
                                onClick={() => setDetailTab('keluarga')}
                                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${detailTab === 'keluarga'
                                    ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400 bg-white dark:bg-neutral-900'
                                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                <Users className="h-4 w-4" />
                                Anggota Keluarga
                                {keluargaData.length > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-xs text-blue-700 dark:text-blue-300">
                                        {keluargaData.length}
                                    </span>
                                )}
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6">
                            {detailTab === 'data' && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {[
                                        { label: 'No MR', value: selectedPatient.No_MR },
                                        { label: 'Nama Pasien', value: selectedPatient.Nama_Pasien },
                                        { label: 'No Peserta', value: selectedPatient.Nama_Panggilan },
                                        { label: 'No Kartu (No KPK)', value: selectedPatient.No_KPK },
                                        { label: 'No KTP', value: selectedPatient.NoIdentitas },
                                        { label: 'Jenis Kelamin', value: (selectedPatient.Jenis_Kelamin && selectedPatient.Jenis_Kelamin !== '-') ? selectedPatient.Jenis_Kelamin : 'Tidak diketahui' },
                                        { label: 'No HP', value: selectedPatient.HP1 },
                                        { label: 'Alamat', value: selectedPatient.Alamat, fullWidth: true },
                                        { label: 'Wilayah Kelurahan', value: selectedPatient.Wilayah_Kelurahan },
                                        { label: 'Wilayah Kecamatan', value: selectedPatient.Wilayah_Kecamatan },
                                        { label: 'Wilayah Kota', value: selectedPatient.Wilayah_Kota },
                                        { label: 'Wilayah Propinsi', value: selectedPatient.Wilayah_Propinsi },
                                    ].map(({ label, value, fullWidth }) => (
                                        <div
                                            key={label}
                                            className={`rounded-xl border border-gray-200 dark:border-neutral-700 bg-gray-50/50 dark:bg-neutral-800/30 p-4 ${fullWidth ? 'sm:col-span-2' : ''}`}
                                        >
                                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                                {label}
                                            </p>
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                {value ?? '-'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {detailTab === 'kunjungan' && (
                                <div className="space-y-4">
                                    {kunjunganLoading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                        </div>
                                    ) : kunjunganError ? (
                                        <div className="text-center py-12 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10">
                                            <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-3" />
                                            <p className="text-red-700 dark:text-red-300 text-sm font-medium mb-2">
                                                {kunjunganError}
                                            </p>
                                            <button
                                                onClick={() => fetchKunjungan(1, 10)}
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-800 dark:text-red-200 text-sm font-medium transition-colors"
                                            >
                                                <RefreshCw className="h-4 w-4" />
                                                Coba Lagi
                                            </button>
                                        </div>
                                    ) : kunjunganData.length === 0 ? (
                                        <div className="text-center py-12 rounded-xl border border-dashed border-gray-300 dark:border-neutral-600 bg-gray-50/50 dark:bg-neutral-800/30">
                                            <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                                Belum ada riwayat kunjungan untuk pasien ini.
                                            </p>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-neutral-700">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 font-medium">
                                                        <tr>
                                                            <th className="px-4 py-3 rounded-tl-xl">No Kunjungan</th>
                                                            <th className="px-4 py-3">Tgl Kunjungan</th>
                                                            <th className="px-4 py-3">Dokter</th>
                                                            <th className="px-4 py-3 rounded-tr-xl">Poli</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                                                        {kunjunganData.map((row: any, idx: number) => (
                                                            <tr key={row.Kunjungan_ID ?? idx} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                                                                <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                                                    {row.Kunjungan_ID ?? '-'}
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                                    {row.Tgl_Kunjungan ? new Date(row.Tgl_Kunjungan).toLocaleDateString('id-ID') : '-'}
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                                    {row.Dokter_Name ?? '-'}
                                                                </td>
                                                                <td className="px-4 py-3 text-gray-600 dark:text-gray-300">
                                                                    {row.Unit_Name ?? row.Unit_ID ?? '-'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {kunjunganPagination.totalPages > 1 && (
                                                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                                                    <span>
                                                        Menampilkan {kunjunganData.length} dari {kunjunganPagination.totalRows} kunjungan
                                                    </span>
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => fetchKunjungan(kunjunganPagination.page - 1, kunjunganPagination.limit)}
                                                            disabled={kunjunganPagination.page <= 1}
                                                            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-neutral-800"
                                                        >
                                                            Sebelumnya
                                                        </button>
                                                        <button
                                                            onClick={() => fetchKunjungan(kunjunganPagination.page + 1, kunjunganPagination.limit)}
                                                            disabled={kunjunganPagination.page >= kunjunganPagination.totalPages}
                                                            className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-neutral-600 disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-neutral-800"
                                                        >
                                                            Selanjutnya
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}

                            {detailTab === 'keluarga' && (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Pasien dengan No. Peserta yang sama: {selectedPatient.Nama_Panggilan ?? '-'}
                                    </p>
                                    {keluargaLoading ? (
                                        <div className="flex items-center justify-center py-12">
                                            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                                        </div>
                                    ) : keluargaError ? (
                                        <div className="text-center py-12 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10">
                                            <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-3" />
                                            <p className="text-red-700 dark:text-red-300 text-sm font-medium mb-2">{keluargaError}</p>
                                            <button
                                                onClick={() => fetchKeluarga()}
                                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-800 dark:text-red-200 text-sm font-medium"
                                            >
                                                <RefreshCw className="h-4 w-4" /> Coba Lagi
                                            </button>
                                        </div>
                                    ) : keluargaData.length === 0 ? (
                                        <div className="text-center py-12 rounded-xl border border-dashed border-gray-300 dark:border-neutral-600 bg-gray-50/50 dark:bg-neutral-800/30">
                                            <Users className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                                            <p className="text-gray-500 dark:text-gray-400 text-sm">Tidak ada anggota keluarga lain dengan No. Peserta yang sama.</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-neutral-700">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 font-medium">
                                                    <tr>
                                                        <th className="px-4 py-3 rounded-tl-xl">No MR</th>
                                                        <th className="px-4 py-3">Nama</th>
                                                        <th className="px-4 py-3">Tgl Lahir</th>
                                                        <th className="px-4 py-3">Jenis Kelamin</th>
                                                        <th className="px-4 py-3 rounded-tr-xl">No HP</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                                                    {keluargaData.map((row: any, idx: number) => (
                                                        <tr key={row.No_MR ?? idx} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                                                            <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.No_MR ?? '-'}</td>
                                                            <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.Nama_Pasien ?? '-'}</td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{row.Tgl_Lahir ? new Date(row.Tgl_Lahir).toLocaleDateString('id-ID') : '-'}</td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{row.Jenis_Kelamin ?? '-'}</td>
                                                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{row.HP1 ?? '-'}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
