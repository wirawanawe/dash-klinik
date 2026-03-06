'use client';

import { Input } from '@/components/ui/SearchInput';
import { Search, X, FileText, Loader2, Users, Calendar, BarChart3, Printer } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useCallback, useState, useEffect } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { getSelectedDashboardUserId } from '@/lib/tenant';
import { getApiHeaders } from '@/lib/api';

type DiagnosaRow = { No: number; ICD: string; Diseases: string; DiagnosaType: string; DiagnosaCase: string; FinalState: string };

type GraphDatum = { tanggal: string; jumlah: number; label: string };
type GraphStatusDatum = { tanggal?: string; label?: string; pegawai: number; pensiunan: number; lainnya?: number };
type GraphMonthDatum = { bulan: number; label: string; pegawai: number; pensiunan: number; lainnya?: number };
type GraphYearDatum = { tahun: number; pegawai: number; pensiunan: number; lainnya?: number };

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

const getStatusFromNoPeserta = (noPeserta: string | number | null | undefined): string => {
    if (noPeserta == null || String(noPeserta).trim() === '') return '-';
    const noStr = String(noPeserta).trim();
    if (noStr.length < 2) return '-';
    const twoDigits = noStr.substring(0, 2);
    const yy = parseInt(twoDigits, 10);
    if (isNaN(yy)) return '-';
    const currentYear = new Date().getFullYear();
    const birthYear = yy <= 25 ? 2000 + yy : 1900 + yy;
    const age = currentYear - birthYear;
    return age > 56 ? 'Pensiunan' : 'Pegawai';
};

function DashboardCard({ title, value, subtext, icon: Icon }: { title: string; value: string | number; subtext?: string; icon?: any }) {
    return (
        <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</h3>
                {Icon && <Icon className="h-4 w-4 text-gray-400" />}
            </div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
            {subtext && <p className="text-xs text-gray-400 mt-2">{subtext}</p>}
        </div>
    );
}

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
    const [sortColumn, setSortColumn] = useState<string | undefined>();
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailKunjungan, setDetailKunjungan] = useState<any | null>(null);
    const [detailDiagnosa, setDetailDiagnosa] = useState<DiagnosaRow[]>([]);
    const [detailResep, setDetailResep] = useState<any[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);

    const now = new Date();
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [kunjunganSummary, setKunjunganSummary] = useState({ hariIni: 0, bulanIni: 0, tahunIni: 0 });
    const [kunjunganByStatus, setKunjunganByStatus] = useState<{
        hariIni: { pegawai: number; pensiunan: number; lainnya: number };
        bulanIni: { pegawai: number; pensiunan: number; lainnya: number };
        tahunIni: { pegawai: number; pensiunan: number; lainnya: number };
    }>({ hariIni: { pegawai: 0, pensiunan: 0, lainnya: 0 }, bulanIni: { pegawai: 0, pensiunan: 0, lainnya: 0 }, tahunIni: { pegawai: 0, pensiunan: 0, lainnya: 0 } });
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [graphLoading, setGraphLoading] = useState(true);
    const [graphStatusLoading, setGraphStatusLoading] = useState(true);
    const [summaryError, setSummaryError] = useState<string | null>(null);
    const [graphData, setGraphData] = useState<GraphDatum[]>([]);
    const [graphStatusDay, setGraphStatusDay] = useState<GraphStatusDatum[]>([]);
    const [graphStatusMonth, setGraphStatusMonth] = useState<GraphMonthDatum[]>([]);
    const [graphStatusYear, setGraphStatusYear] = useState<GraphYearDatum[]>([]);

    const currentMonthName = MONTHS[selectedMonth - 1];

    const fetchData = useCallback(async (page = 1, searchQuery = '', start = '', end = '', limit = 10, sortBy?: string, sortOrder?: string) => {
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
            if (sortBy) queryParams.append('sortBy', sortBy);
            if (sortOrder) queryParams.append('sortOrder', sortOrder);

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

    const fetchKunjunganSummary = useCallback(async () => {
        setSummaryLoading(true);
        setSummaryError(null);
        try {
            const selectedUserId = getSelectedDashboardUserId();
            const res = await fetch(`/api/proxy/dashboard/stats?month=${selectedMonth}&year=${selectedYear}`, {
                headers: getApiHeaders(selectedUserId ? { 'x-impersonate-user-id': selectedUserId } : undefined),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || 'Gagal memuat data');
            setKunjunganSummary(json.kunjungan ?? { hariIni: 0, bulanIni: 0, tahunIni: 0 });
            setKunjunganByStatus(json.kunjunganByStatus ?? { hariIni: { pegawai: 0, pensiunan: 0, lainnya: 0 }, bulanIni: { pegawai: 0, pensiunan: 0, lainnya: 0 }, tahunIni: { pegawai: 0, pensiunan: 0, lainnya: 0 } });
        } catch (e) {
            console.error(e);
            setSummaryError(e instanceof Error ? e.message : 'Gagal memuat data kunjungan');
        } finally {
            setSummaryLoading(false);
        }
    }, [selectedMonth, selectedYear]);

    const fetchGraph = useCallback(async () => {
        setGraphLoading(true);
        try {
            const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
            const startDateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
            const endDateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
            const selectedUserId = getSelectedDashboardUserId();
            const res = await fetch(`/api/proxy/dashboard/graph?startDate=${startDateStr}&endDate=${endDateStr}`, {
                headers: getApiHeaders(selectedUserId ? { 'x-impersonate-user-id': selectedUserId } : undefined),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || 'Gagal memuat graph');
            const rawData = json.data ?? [];
            const byDate: Record<string, number> = {};
            for (let d = 1; d <= lastDay; d++) {
                const tgl = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                byDate[tgl] = 0;
            }
            rawData.forEach((r: { tanggal: string; jumlah: number }) => {
                const key = r.tanggal?.slice(0, 10) || '';
                if (key) byDate[key] = r.jumlah ?? 0;
            });
            const filled = Object.entries(byDate)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([tanggal, jumlah]) => ({
                    tanggal,
                    jumlah,
                    label: `${new Date(tanggal).getDate()} ${MONTHS[selectedMonth - 1]}`,
                }));
            setGraphData(filled);
        } catch (e) {
            console.error(e);
            setGraphData([]);
        } finally {
            setGraphLoading(false);
        }
    }, [selectedMonth, selectedYear]);

    const fetchGraphStatus = useCallback(async () => {
        setGraphStatusLoading(true);
        try {
            const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
            const startDateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
            const endDateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
            const selectedUserId = getSelectedDashboardUserId();
            const [resDay, resMonth, resYear] = await Promise.all([
                fetch(`/api/proxy/dashboard/graph-status?startDate=${startDateStr}&endDate=${endDateStr}`, {
                    headers: getApiHeaders(selectedUserId ? { 'x-impersonate-user-id': selectedUserId } : undefined),
                }),
                fetch(`/api/proxy/dashboard/graph-status-month?year=${selectedYear}`, {
                    headers: getApiHeaders(selectedUserId ? { 'x-impersonate-user-id': selectedUserId } : undefined),
                }),
                fetch(`/api/proxy/dashboard/graph-status-year?yearFrom=${selectedYear - 4}&yearTo=${selectedYear}`, {
                    headers: getApiHeaders(selectedUserId ? { 'x-impersonate-user-id': selectedUserId } : undefined),
                }),
            ]);
            const jsonDay = await resDay.json().catch(() => ({ data: [] }));
            const jsonMonth = await resMonth.json().catch(() => ({ data: [] }));
            const jsonYear = await resYear.json().catch(() => ({ data: [] }));

            const byDate: Record<string, GraphStatusDatum> = {};
            for (let d = 1; d <= lastDay; d++) {
                const tgl = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                byDate[tgl] = { tanggal: tgl, label: `${d} ${MONTHS[selectedMonth - 1]}`, pegawai: 0, pensiunan: 0, lainnya: 0 };
            }
            (jsonDay.data ?? []).forEach((r: GraphStatusDatum & { tanggal?: string }) => {
                const key = r.tanggal?.slice(0, 10) || '';
                if (key && byDate[key]) {
                    byDate[key] = { ...byDate[key], pegawai: r.pegawai ?? 0, pensiunan: r.pensiunan ?? 0, lainnya: r.lainnya ?? 0 };
                }
            });
            setGraphStatusDay(Object.values(byDate).sort((a, b) => (a.tanggal ?? '').localeCompare(b.tanggal ?? '')));

            setGraphStatusMonth(jsonMonth.data ?? []);
            setGraphStatusYear(jsonYear.data ?? []);
        } catch (e) {
            console.error(e);
            setGraphStatusDay([]);
            setGraphStatusMonth([]);
            setGraphStatusYear([]);
        } finally {
            setGraphStatusLoading(false);
        }
    }, [selectedMonth, selectedYear]);

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
        const timer = setTimeout(() => {
            setDebouncedSearch(search);
        }, 500);
        return () => clearTimeout(timer);
    }, [search]);

    useEffect(() => {
        fetchKunjunganSummary();
        fetchGraph();
        fetchGraphStatus();
    }, [fetchKunjunganSummary, fetchGraph, fetchGraphStatus]);

    useEffect(() => {
        fetchData(1, debouncedSearch, startDate, endDate, pagination.limit, sortColumn, sortDirection);
    }, [debouncedSearch, startDate, endDate, fetchData, pagination.limit, sortColumn, sortDirection]);
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
        {
            header: 'No. Kartu',
            accessorKey: 'No_KPK',
            cell: (item: any) => item.No_KPK ?? '-',
        },
        { header: 'Nama Pasien', accessorKey: 'Nama_Peserta' },
        {
            header: 'Status',
            accessorKey: 'Nama_Panggilan',
            sortable: false,
            cell: (item: any) => getStatusFromNoPeserta(item?.Nama_Panggilan),
        },
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
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Kunjungan</h1>
                <div className="flex items-center gap-2">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="h-10 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm font-medium"
                    >
                        {MONTHS.map((m, i) => (
                            <option key={m} value={i + 1}>{m}</option>
                        ))}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="h-10 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-sm font-medium"
                    >
                        {Array.from({ length: 10 }, (_, i) => now.getFullYear() - i).map((y) => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {summaryLoading ? (
                <div className="flex items-center justify-center py-8 gap-2 text-gray-500 dark:text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Memuat ringkasan kunjungan...</span>
                </div>
            ) : summaryError ? (
                <div className="bg-white dark:bg-neutral-900 rounded-xl border border-dashed border-red-200 dark:border-red-800 p-4 text-sm text-red-600 dark:text-red-400">
                    Gagal memuat ringkasan kunjungan. {summaryError}
                </div>
            ) : (
                <>
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-500" />
                            Total Kunjungan
                        </h2>
                        <div className="grid gap-4 md:grid-cols-3">
                            <DashboardCard
                                title="Hari Ini"
                                value={kunjunganSummary.hariIni}
                                subtext={new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                                icon={Calendar}
                            />
                            <DashboardCard
                                title={`Bulan ${currentMonthName}`}
                                value={kunjunganSummary.bulanIni}
                                subtext={`${currentMonthName} ${selectedYear}`}
                                icon={Calendar}
                            />
                            <DashboardCard
                                title={`Tahun ${selectedYear}`}
                                value={kunjunganSummary.tahunIni}
                                subtext={`Tahun ${selectedYear}`}
                                icon={Calendar}
                            />
                        </div>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Users className="h-5 w-5 text-emerald-500" />
                            Kunjungan Pegawai vs Pensiunan
                        </h2>
                        <div className="grid gap-4 md:grid-cols-3 mb-4">
                            <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-neutral-800">
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Hari Ini</h3>
                                <div className="flex gap-4">
                                    <div className="flex-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
                                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Pegawai</p>
                                        <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{kunjunganByStatus.hariIni.pegawai}</p>
                                    </div>
                                    <div className="flex-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3">
                                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Pensiunan</p>
                                        <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{kunjunganByStatus.hariIni.pensiunan}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-neutral-800">
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Bulan {currentMonthName}</h3>
                                <div className="flex gap-4">
                                    <div className="flex-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
                                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Pegawai</p>
                                        <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{kunjunganByStatus.bulanIni.pegawai}</p>
                                    </div>
                                    <div className="flex-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3">
                                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Pensiunan</p>
                                        <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{kunjunganByStatus.bulanIni.pensiunan}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-neutral-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-neutral-800">
                                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">Tahun {selectedYear}</h3>
                                <div className="flex gap-4">
                                    <div className="flex-1 rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3">
                                        <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">Pegawai</p>
                                        <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{kunjunganByStatus.tahunIni.pegawai}</p>
                                    </div>
                                    <div className="flex-1 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3">
                                        <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">Pensiunan</p>
                                        <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{kunjunganByStatus.tahunIni.pensiunan}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-1">
                            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6">
                                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Per Hari ({currentMonthName} {selectedYear})</h3>
                                {graphStatusLoading ? (
                                    <div className="h-[280px] flex items-center justify-center text-gray-500">
                                        <Loader2 className="h-8 w-8 animate-spin" />
                                    </div>
                                ) : graphStatusDay.length === 0 ? (
                                    <div className="h-[280px] flex items-center justify-center text-gray-500">Tidak ada data</div>
                                ) : (
                                    <div className="h-[280px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={graphStatusDay} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                                                <XAxis dataKey="label" tick={{ fontSize: 10 }} tickMargin={8} />
                                                <YAxis tick={{ fontSize: 11 }} tickMargin={8} allowDecimals={false} />
                                                <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                                <Legend />
                                                <Bar dataKey="pegawai" name="Pegawai" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} />
                                                <Bar dataKey="pensiunan" name="Pensiunan" fill="#f59e0b" stackId="a" radius={[0, 0, 0, 0]} />
                                                <Bar dataKey="lainnya" name="Lainnya" fill="#94a3b8" stackId="a" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                )}
                            </div>
                            <div className="grid gap-6 lg:grid-cols-2">
                                <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6">
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Per Bulan ({selectedYear})</h3>
                                    {graphStatusLoading ? (
                                        <div className="h-[260px] flex items-center justify-center text-gray-500">
                                            <Loader2 className="h-8 w-8 animate-spin" />
                                        </div>
                                    ) : graphStatusMonth.length === 0 ? (
                                        <div className="h-[260px] flex items-center justify-center text-gray-500">Tidak ada data</div>
                                    ) : (
                                        <div className="h-[260px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={graphStatusMonth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                                                    <XAxis dataKey="label" tick={{ fontSize: 10 }} tickMargin={8} />
                                                    <YAxis tick={{ fontSize: 11 }} tickMargin={8} allowDecimals={false} />
                                                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                                    <Legend />
                                                    <Bar dataKey="pegawai" name="Pegawai" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} />
                                                    <Bar dataKey="pensiunan" name="Pensiunan" fill="#f59e0b" stackId="a" radius={[0, 0, 0, 0]} />
                                                    <Bar dataKey="lainnya" name="Lainnya" fill="#94a3b8" stackId="a" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </div>
                                <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6">
                                    <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Per Tahun</h3>
                                    {graphStatusLoading ? (
                                        <div className="h-[260px] flex items-center justify-center text-gray-500">
                                            <Loader2 className="h-8 w-8 animate-spin" />
                                        </div>
                                    ) : graphStatusYear.length === 0 ? (
                                        <div className="h-[260px] flex items-center justify-center text-gray-500">Tidak ada data</div>
                                    ) : (
                                        <div className="h-[260px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={graphStatusYear} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                                                    <XAxis dataKey="tahun" tick={{ fontSize: 11 }} tickMargin={8} />
                                                    <YAxis tick={{ fontSize: 11 }} tickMargin={8} allowDecimals={false} />
                                                    <Tooltip contentStyle={{ borderRadius: '8px' }} />
                                                    <Legend />
                                                    <Bar dataKey="pegawai" name="Pegawai" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} />
                                                    <Bar dataKey="pensiunan" name="Pensiunan" fill="#f59e0b" stackId="a" radius={[0, 0, 0, 0]} />
                                                    <Bar dataKey="lainnya" name="Lainnya" fill="#94a3b8" stackId="a" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-blue-500" />
                            Kunjungan per Tanggal
                        </h2>
                        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6">
                            {graphLoading ? (
                                <div className="h-[300px] flex items-center justify-center text-gray-500">
                                    <Loader2 className="h-8 w-8 animate-spin" />
                                </div>
                            ) : graphData.length === 0 ? (
                                <div className="h-[300px] flex items-center justify-center text-gray-500">
                                    Tidak ada data kunjungan
                                </div>
                            ) : (
                                <div className="h-[300px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={graphData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                                            <XAxis dataKey="label" tick={{ fontSize: 11 }} tickMargin={8} />
                                            <YAxis tick={{ fontSize: 11 }} tickMargin={8} allowDecimals={false} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                formatter={(value: number | undefined) => [value ?? 0, 'Kunjungan']}
                                                labelFormatter={(label) => label}
                                            />
                                            <Bar dataKey="jumlah" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Kunjungan" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </section>
                </>
            )}

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
                sortColumn={sortColumn}
                sortDirection={sortDirection}
                onSortChange={(col, dir) => {
                    setSortColumn(col);
                    setSortDirection(dir);
                    fetchData(1, debouncedSearch, startDate, endDate, pagination.limit, col, dir);
                }}
                onPageChange={(newPage) => fetchData(newPage, debouncedSearch, startDate, endDate, pagination.limit, sortColumn, sortDirection)}
                onLimitChange={(newLimit) => fetchData(1, debouncedSearch, startDate, endDate, newLimit, sortColumn, sortDirection)}
            />

            {detailOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-neutral-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden detail-kunjungan-print">
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 px-6 py-5 flex items-center justify-between shrink-0">
                            <h2 className="text-xl font-bold text-white">Detail Kunjungan</h2>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => window.print()}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white transition-colors"
                                >
                                    <Printer className="h-4 w-4" />
                                    Cetak
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setDetailOpen(false)}
                                    className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors"
                                    aria-label="Tutup"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            </div>
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
                                            <p className="text-xs text-gray-500 dark:text-gray-400">No. Kunjungan</p>
                                            <p className="font-medium text-gray-900 dark:text-white">
                                                {detailKunjungan.Kunjungan_ID ?? '-'}
                                            </p>
                                        </div>
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
                                            <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                                            <p className="font-medium text-gray-900 dark:text-white">{getStatusFromNoPeserta(detailKunjungan.Nama_Panggilan)}</p>
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
