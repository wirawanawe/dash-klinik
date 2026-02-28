'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, CalendarDays, TrendingUp, Eye, X, Notebook, AlertCircle, Search, ShoppingCart, Pill } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getApiHeaders } from '@/lib/api';
import { getSelectedDashboardUserId, subscribeToTenantChange } from '@/lib/tenant';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/SearchInput';

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

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

type TopMedicineItem = { ItemDesc: string; TotalQty: number; TotalNominal: number };

export default function ResepDashboardPage() {
    const now = new Date();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());

    // Summary & Top Medicines States
    const [summary, setSummary] = useState({
        hariIni: { count: 0, nominal: 0 },
        bulanIni: { count: 0, nominal: 0 },
        tahunIni: { count: 0, nominal: 0 }
    });

    const [topMedicines, setTopMedicines] = useState({
        hariIni: [] as TopMedicineItem[],
        bulanIni: [] as TopMedicineItem[],
        tahunIni: [] as TopMedicineItem[]
    });

    // Pembelian Obat (PO/RO)
    const [pembelianLoading, setPembelianLoading] = useState(true);
    const [pembelianGraphLoading, setPembelianGraphLoading] = useState(true);
    const [pembelianStats, setPembelianStats] = useState({
        poBulanIni: 0,
        poTahunIni: 0,
        nilaiBulanIni: 0,
        nilaiTahunIni: 0,
        roBulanIni: 0,
        roTahunIni: 0,
    });
    const [pembelianGraphData, setPembelianGraphData] = useState<{ bulan: number; label: string; nilai: number; jumlahPO: number }[]>([]);

    // FAR_RESEP DataTable States
    const [resepData, setResepData] = useState<any[]>([]);
    const [resepLoading, setResepLoading] = useState(true);
    const [resepPagination, setResepPagination] = useState({
        page: 1, limit: 10, totalRows: 0, totalPages: 0
    });
    const [sortColumn, setSortColumn] = useState<string | undefined>();
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

    const [searchInvoice, setSearchInvoice] = useState('');
    const [searchPasien, setSearchPasien] = useState('');
    const [filterTanggal, setFilterTanggal] = useState('');

    const [debouncedInvoice, setDebouncedInvoice] = useState('');
    const [debouncedPasien, setDebouncedPasien] = useState('');

    useEffect(() => {
        const timer1 = setTimeout(() => setDebouncedInvoice(searchInvoice), 500);
        const timer2 = setTimeout(() => setDebouncedPasien(searchPasien), 500);
        return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }, [searchInvoice, searchPasien]);

    // Details Modal States
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedInvoice, setSelectedInvoice] = useState<string | null>(null);
    const [detailData, setDetailData] = useState<any[]>([]);
    const [detailLoading, setDetailLoading] = useState(false);

    // Fetch Summary & Top Medicines
    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const selectedUserId = getSelectedDashboardUserId();
            const headers = getApiHeaders(selectedUserId ? { 'x-impersonate-user-id': selectedUserId } : undefined);

            const [summaryRes, topRes] = await Promise.all([
                fetch(`/api/proxy/resep/summary?month=${selectedMonth}&year=${selectedYear}`, { headers }),
                fetch(`/api/proxy/resep/top-medicines?month=${selectedMonth}&year=${selectedYear}`, { headers })
            ]);

            const summaryJson = await summaryRes.json();
            const topJson = await topRes.json();

            if (!summaryRes.ok) throw new Error(summaryJson.message || 'Gagal memuat summary resep');
            if (!topRes.ok) throw new Error(topJson.message || 'Gagal memuat top obat resep');

            setSummary(summaryJson.summary ?? {
                hariIni: { count: 0, nominal: 0 },
                bulanIni: { count: 0, nominal: 0 },
                tahunIni: { count: 0, nominal: 0 }
            });

            setTopMedicines(topJson.data ?? {
                hariIni: [],
                bulanIni: [],
                tahunIni: []
            });

        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'Gagal memuat data resep');
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, selectedYear]);

    const fetchPembelianStats = useCallback(async () => {
        setPembelianLoading(true);
        try {
            const selectedUserId = getSelectedDashboardUserId();
            const res = await fetch(`/api/proxy/dashboard/pembelian-obat/stats?month=${selectedMonth}&year=${selectedYear}`, {
                headers: getApiHeaders(selectedUserId ? { 'x-impersonate-user-id': selectedUserId } : undefined),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || 'Gagal memuat data pembelian');
            setPembelianStats(json.pembelianObat ?? { poBulanIni: 0, poTahunIni: 0, nilaiBulanIni: 0, nilaiTahunIni: 0, roBulanIni: 0, roTahunIni: 0 });
        } catch (e) {
            console.error(e);
            setPembelianStats({ poBulanIni: 0, poTahunIni: 0, nilaiBulanIni: 0, nilaiTahunIni: 0, roBulanIni: 0, roTahunIni: 0 });
        } finally {
            setPembelianLoading(false);
        }
    }, [selectedMonth, selectedYear]);

    const fetchPembelianGraph = useCallback(async () => {
        setPembelianGraphLoading(true);
        try {
            const selectedUserId = getSelectedDashboardUserId();
            const res = await fetch(`/api/proxy/dashboard/pembelian-obat/graph?year=${selectedYear}`, {
                headers: getApiHeaders(selectedUserId ? { 'x-impersonate-user-id': selectedUserId } : undefined),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || 'Gagal memuat grafik pembelian');
            setPembelianGraphData(json.data ?? []);
        } catch (e) {
            console.error(e);
            setPembelianGraphData([]);
        } finally {
            setPembelianGraphLoading(false);
        }
    }, [selectedYear]);

    // Fetch FAR_RESEP List
    const fetchResepList = useCallback(async (
        page = 1,
        limit = 10,
        sortBy?: string,
        sortOrder?: string,
        tanggalQuery = '',
        invoiceQuery = '',
        pasienQuery = ''
    ) => {
        setResepLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: limit.toString(),
            });

            if (sortBy) queryParams.append('sortBy', sortBy);
            if (sortOrder) queryParams.append('sortOrder', sortOrder);
            if (tanggalQuery) queryParams.append('tanggal', tanggalQuery);
            if (invoiceQuery) queryParams.append('noInvoice', invoiceQuery);
            if (pasienQuery) queryParams.append('pasien', pasienQuery);

            const selectedUserId = getSelectedDashboardUserId();
            const res = await fetch(`/api/proxy/farmasi/far-resep?${queryParams.toString()}`, {
                headers: getApiHeaders(selectedUserId ? { 'x-impersonate-user-id': selectedUserId } : undefined),
            });
            const json = await res.json();

            if (json.data) {
                setResepData(json.data);
                setResepPagination(json.pagination);
            } else {
                setResepData([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setResepLoading(false);
        }
    }, []);

    // Fetch FAR_RESEP Details
    const fetchResepDetail = async (noInvoice: string) => {
        setSelectedInvoice(noInvoice);
        setModalOpen(true);
        setDetailLoading(true);
        try {
            const selectedUserId = getSelectedDashboardUserId();
            const res = await fetch(`/api/proxy/farmasi/far-resep/${encodeURIComponent(noInvoice)}/detail`, {
                headers: getApiHeaders(selectedUserId ? { 'x-impersonate-user-id': selectedUserId } : undefined),
            });
            const json = await res.json();
            if (json.data) {
                setDetailData(json.data);
            } else {
                setDetailData([]);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setDetailLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    useEffect(() => {
        fetchPembelianStats();
    }, [fetchPembelianStats]);

    useEffect(() => {
        fetchPembelianGraph();
    }, [fetchPembelianGraph]);

    useEffect(() => {
        fetchResepList(1, resepPagination.limit, sortColumn, sortDirection, filterTanggal, debouncedInvoice, debouncedPasien);
    }, [fetchResepList, sortColumn, sortDirection, filterTanggal, debouncedInvoice, debouncedPasien, resepPagination.limit]);

    useEffect(() => {
        const unsubscribe = subscribeToTenantChange(() => {
            fetchDashboardData();
            fetchPembelianStats();
            fetchPembelianGraph();
            fetchResepList(1, resepPagination.limit, sortColumn, sortDirection, filterTanggal, debouncedInvoice, debouncedPasien);
        });
        return unsubscribe;
    }, [fetchDashboardData, fetchPembelianStats, fetchPembelianGraph, fetchResepList, resepPagination.limit, sortColumn, sortDirection, filterTanggal, debouncedInvoice, debouncedPasien]);

    const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const currentMonthName = MONTHS[selectedMonth - 1];

    const MedicineTable = ({ title, data }: { title: string, data: TopMedicineItem[] }) => (
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700 bg-gray-50/50 dark:bg-neutral-800/50">
                <h3 className="font-medium text-gray-900 dark:text-white">{title}</h3>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 font-medium">
                        <tr>
                            <th className="px-4 py-3">No</th>
                            <th className="px-4 py-3">Nama Obat</th>
                            <th className="px-4 py-3 text-right">Qty</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                        {data.length === 0 ? (
                            <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">Tidak ada data</td></tr>
                        ) : (
                            data.map((row, index) => (
                                <tr key={index} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{index + 1}</td>
                                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.ItemDesc ?? '-'}</td>
                                    <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{row.TotalQty ?? 0}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const resepColumns = [
        { header: 'No Invoice', accessorKey: 'NoInvoice', className: 'font-medium' },
        { header: 'Tanggal', accessorKey: 'TgInvoice', cell: (item: any) => item.TgInvoice ? formatDate(item.TgInvoice) : '-' },
        { header: 'Pasien', accessorKey: 'PasienDesc' },
        { header: 'Penjamin', accessorKey: 'PenjaminDesc' },
        { header: 'Total (Rp)', accessorKey: 'RpInvoice', cell: (item: any) => formatCurrency(item.RpInvoice || 0) },
        {
            header: 'Aksi',
            accessorKey: 'action',
            sortable: false,
            cell: (item: any) => (
                <button
                    onClick={() => fetchResepDetail(item.NoInvoice)}
                    className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors dark:text-blue-400 dark:bg-blue-900/30 dark:hover:bg-blue-900/50"
                >
                    <Eye className="w-4 h-4" /> Detail
                </button>
            )
        }
    ];

    const detailColumns = [
        { header: 'No', accessorKey: 'NoUrut', className: 'font-medium' },
        { header: 'Nama Obat (Master)', accessorKey: 'ItemDescName' },
        { header: 'Nama Obat (Resep)', accessorKey: 'ItemDesc' },
        { header: 'Satuan', accessorKey: 'Satuan' },
        { header: 'Qty', accessorKey: 'Qty' },
        { header: 'Harga', accessorKey: 'Harga', cell: (item: any) => formatCurrency(item.Harga || 0) },
        { header: 'Diskon', accessorKey: 'Diskon', cell: (item: any) => formatCurrency(item.Diskon || 0) },
        { header: 'Netto', accessorKey: 'RpNetto', cell: (item: any) => formatCurrency(item.RpNetto || 0) },
    ];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white border-none flex gap-2 items-center">
                    <Notebook className="h-8 w-8 text-blue-600" /> Resep
                </h1>
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

            {loading ? (
                <div className="flex items-center justify-center py-24 gap-2 text-gray-500 dark:text-gray-400">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span>Memuat data...</span>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-dashed border-gray-200 dark:border-neutral-800 shadow-sm mt-8">
                    <div className="bg-red-50 dark:bg-red-500/10 p-4 rounded-full mb-5 ring-8 ring-red-50/50 dark:ring-red-500/5">
                        <AlertCircle className="h-10 w-10 text-red-500 dark:text-red-400" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">
                        {error.includes('memilih admin') ? 'Akses Dibatasi' : 'Terjadi Kesalahan'}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto leading-relaxed">
                        {error}
                    </p>

                    {error.includes('memilih admin') ? (
                        <div className="mt-8 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-neutral-800/50 py-2 px-4 rounded-full border border-gray-100 dark:border-neutral-800 flex items-center gap-2">
                            <span className="text-amber-500">💡</span> Silahkan pilih klinik dari menu dropdown di atas
                        </div>
                    ) : (
                        <div className="mt-8 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-neutral-800/50 py-2 px-4 rounded-full border border-gray-100 dark:border-neutral-800 flex items-center gap-2">
                            <span>📡</span> Server sedang tidak aktif atau coba refresh kembali untuk memastikan
                        </div>
                    )}
                </div>
            ) : (
                <>
                    {/* Summary Penjualan Resep */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-blue-500" />
                            Nominal Penjualan Resep
                        </h2>
                        <div className="grid gap-4 md:grid-cols-3">
                            <DashboardCard
                                title="Hari Ini"
                                value={formatCurrency(summary.hariIni.nominal)}
                                subtext={`${summary.hariIni.count} Resep Hari Ini`}
                                icon={CalendarDays}
                            />
                            <DashboardCard
                                title={`Bulan ${currentMonthName}`}
                                value={formatCurrency(summary.bulanIni.nominal)}
                                subtext={`${summary.bulanIni.count} Resep ${currentMonthName} ${selectedYear}`}
                                icon={CalendarDays}
                            />
                            <DashboardCard
                                title={`Tahun ${selectedYear}`}
                                value={formatCurrency(summary.tahunIni.nominal)}
                                subtext={`${summary.tahunIni.count} Resep Tahun ${selectedYear}`}
                                icon={CalendarDays}
                            />
                        </div>
                    </section>

                    {/* Obat-obatan Paling Banyak Terjual */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Notebook className="h-5 w-5 text-emerald-500" />
                            Daftar Obat Paling Banyak Terjual
                        </h2>
                        <div className="grid gap-6 md:grid-cols-3">
                            <MedicineTable title="Hari Ini" data={topMedicines.hariIni} />
                            <MedicineTable title={`Bulan (${currentMonthName})`} data={topMedicines.bulanIni} />
                            <MedicineTable title={`Tahun (${selectedYear})`} data={topMedicines.tahunIni} />
                        </div>
                    </section>

                    {/* Pembelian Obat (PO/RO) */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5 text-emerald-500" />
                            Pembelian Obat
                        </h2>
                        {pembelianLoading ? (
                            <div className="flex items-center justify-center py-12 gap-2 text-gray-500 dark:text-gray-400">
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Memuat data pembelian...</span>
                            </div>
                        ) : (
                            <>
                                <div className="grid gap-4 md:grid-cols-3 mb-6">
                                    <DashboardCard
                                        title="PO Bulan Ini"
                                        value={pembelianStats.poBulanIni}
                                        subtext={`Tahun ${selectedYear}: ${pembelianStats.poTahunIni} PO`}
                                        icon={ShoppingCart}
                                    />
                                    <DashboardCard
                                        title="Nilai Pembelian Bulan Ini"
                                        value={formatCurrency(pembelianStats.nilaiBulanIni)}
                                        subtext={`Tahun ${selectedYear}: ${formatCurrency(pembelianStats.nilaiTahunIni)}`}
                                        icon={Pill}
                                    />
                                    <DashboardCard
                                        title="RO Bulan Ini"
                                        value={pembelianStats.roBulanIni}
                                        subtext={`Tahun ${selectedYear}: ${pembelianStats.roTahunIni} RO`}
                                        icon={ShoppingCart}
                                    />
                                </div>
                                <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 p-6">
                                    <h3 className="font-medium text-gray-900 dark:text-white mb-4">Nilai Pembelian per Bulan ({selectedYear})</h3>
                                    {pembelianGraphLoading ? (
                                        <div className="h-[300px] flex items-center justify-center text-gray-500">
                                            <Loader2 className="h-8 w-8 animate-spin" />
                                        </div>
                                    ) : pembelianGraphData.length === 0 ? (
                                        <div className="h-[300px] flex items-center justify-center text-gray-500">
                                            Tidak ada data pembelian
                                        </div>
                                    ) : (
                                        <div className="h-[300px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={pembelianGraphData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" vertical={false} />
                                                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickMargin={8} />
                                                    <YAxis tick={{ fontSize: 11 }} tickMargin={8} tickFormatter={(v) => v >= 1e6 ? `${(v / 1e6).toFixed(0)}Jt` : `${(v / 1e3).toFixed(0)}Rb`} />
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                        formatter={(value: number | undefined) => [formatCurrency(value ?? 0), 'Nilai']}
                                                        labelFormatter={(label) => label}
                                                    />
                                                    <Bar dataKey="nilai" fill="#10b981" radius={[4, 4, 0, 0]} name="Nilai Pembelian" />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </section>
                </>
            )}

            {/* Tabel Daftar Resep */}
            <section className="pt-4 border-t border-gray-200 dark:border-neutral-800">
                <div className="flex flex-col md:flex-row items-center gap-4 mb-4 bg-white dark:bg-neutral-900 p-4 rounded-xl border border-gray-200 dark:border-neutral-800">
                    <div className="relative flex-1 w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Cari No. Invoice..."
                            value={searchInvoice}
                            onChange={(e) => setSearchInvoice(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <div className="relative flex-1 w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                        <Input
                            placeholder="Cari Nama Pasien..."
                            value={searchPasien}
                            onChange={(e) => setSearchPasien(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap">
                            Tanggal
                        </span>
                        <input
                            type="date"
                            value={filterTanggal}
                            onChange={(e) => setFilterTanggal(e.target.value)}
                            className="h-10 rounded-md border border-gray-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {filterTanggal && (
                            <button
                                onClick={() => setFilterTanggal('')}
                                className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>

                <DataTable
                    title="Daftar Transaksi Resep (Farmasi)"
                    description="Seluruh transaksi penjualan resep."
                    data={resepData}
                    columns={resepColumns}
                    isLoading={resepLoading}
                    pagination={resepPagination}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSortChange={(col, dir) => {
                        setSortColumn(col);
                        setSortDirection(dir);
                        fetchResepList(1, resepPagination.limit, col, dir, filterTanggal, debouncedInvoice, debouncedPasien);
                    }}
                    onPageChange={(newPage) => fetchResepList(newPage, resepPagination.limit, sortColumn, sortDirection, filterTanggal, debouncedInvoice, debouncedPasien)}
                    onLimitChange={(newLimit) => fetchResepList(1, newLimit, sortColumn, sortDirection, filterTanggal, debouncedInvoice, debouncedPasien)}
                />
            </section>

            {/* Modal Detail Resep */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                    <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-800 flex items-center justify-between bg-gray-50/50 dark:bg-neutral-800/50">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                    <Notebook className="h-5 w-5 text-blue-500" /> Detail Resep
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Invoice: <span className="font-medium text-gray-900 dark:text-white">{selectedInvoice}</span></p>
                            </div>
                            <button
                                onClick={() => setModalOpen(false)}
                                className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto w-full">
                            <div className="border border-gray-200 dark:border-neutral-800 rounded-xl overflow-hidden w-full">
                                <DataTable
                                    columns={detailColumns}
                                    data={detailData}
                                    isLoading={detailLoading}
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 border-t border-gray-200 dark:border-neutral-800 bg-gray-50/50 dark:bg-neutral-800/50 flex justify-end">
                            <button
                                onClick={() => setModalOpen(false)}
                                className="px-4 py-2 bg-white dark:bg-neutral-800 border border-gray-300 dark:border-neutral-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
