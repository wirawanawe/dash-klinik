'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Loader2, Receipt, Calendar, TrendingUp, Search, X, Eye } from 'lucide-react';
import { getSelectedDashboardUserId } from '@/lib/tenant';
import { getApiHeaders } from '@/lib/api';

// ─── helpers ────────────────────────────────────────────────────────────────
function fmtIDR(v: number | null | undefined) {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v ?? 0);
}
function fmtDate(v: string | null | undefined) {
    if (!v) return '-';
    return new Date(v).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── summary card ────────────────────────────────────────────────────────────
function SummaryCard({
    title, count, nominal, icon: Icon, color
}: { title: string; count: number; nominal: number; icon: any; color: string }) {
    return (
        <div className="bg-white dark:bg-neutral-900 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</span>
                <span className={`p-2 rounded-lg ${color}`}><Icon className="h-4 w-4 text-white" /></span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{count.toLocaleString('id-ID')} <span className="text-sm font-medium text-gray-400">Transaksi</span></p>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{fmtIDR(nominal)}</p>
        </div>
    );
}

// ─── detail modal ────────────────────────────────────────────────────────────
function DetailModal({ noTransaksi, onClose }: { noTransaksi: string; onClose: () => void }) {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const overlayRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const fetchDetail = async () => {
            setLoading(true);
            try {
                const uid = getSelectedDashboardUserId();
                const res = await fetch(`/api/proxy/transaksi-detail/${encodeURIComponent(noTransaksi)}`, {
                    headers: getApiHeaders(uid ? { 'x-impersonate-user-id': uid } : undefined),
                });
                const json = await res.json();
                setItems(json.data ?? []);
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [noTransaksi]);

    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === overlayRef.current) onClose();
    };

    // Calculate grand total from Subtotal_Calc (Qty × Harga, computed by backend)
    const grandTotal = items.reduce((sum, row) => sum + (row.Subtotal_Calc ?? row.Total ?? row.Subtotal ?? 0), 0);

    return (
        <div
            ref={overlayRef}
            onClick={handleOverlayClick}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        >
            <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col">
                {/* Modal header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-neutral-700">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">Detail Transaksi</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">No. {noTransaksi}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-neutral-800 transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Modal body */}
                <div className="overflow-auto flex-1 p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 gap-2 text-gray-500">
                            <Loader2 className="h-5 w-5 animate-spin" /> Memuat detail...
                        </div>
                    ) : items.length === 0 ? (
                        <div className="flex items-center justify-center py-16 text-gray-500">
                            Tidak ada data detail.
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 rounded-tl-lg">No</th>
                                    <th className="px-4 py-3">Nama Layanan / Item</th>
                                    <th className="px-4 py-3 text-right">Qty</th>
                                    <th className="px-4 py-3 text-right">Harga</th>
                                    <th className="px-4 py-3 text-right rounded-tr-lg">Subtotal</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                                {items.map((row, i) => (
                                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                                        <td className="px-4 py-3 text-gray-500">{row.No_Urut ?? (i + 1)}</td>
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                                            {row.Nama_Layanan ?? row.ItemDesc ?? row.Keterangan ?? '-'}
                                        </td>
                                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{row.Qty ?? row.Jumlah ?? 1}</td>
                                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{fmtIDR(row.Harga ?? row.HargaSatuan)}</td>
                                        <td className="px-4 py-3 text-right font-semibold text-gray-900 dark:text-white">{fmtIDR(row.Subtotal_Calc ?? row.Total ?? row.Subtotal ?? (row.Qty ?? 1) * (row.Harga ?? 0))}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-gray-50 dark:bg-neutral-800 font-bold text-gray-900 dark:text-white">
                                    <td colSpan={4} className="px-4 py-3 text-right rounded-bl-lg">Grand Total</td>
                                    <td className="px-4 py-3 text-right text-blue-600 dark:text-blue-400 rounded-br-lg">{fmtIDR(grandTotal)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── main page ───────────────────────────────────────────────────────────────
export default function TransaksiPage() {
    // summary
    const [summary, setSummary] = useState({
        hariIni: { count: 0, nominal: 0 },
        bulanIni: { count: 0, nominal: 0 },
        tahunIni: { count: 0, nominal: 0 },
    });
    const [summaryLoading, setSummaryLoading] = useState(true);

    // table
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, totalRows: 0, totalPages: 0 });

    // filters
    const [noTransaksi, setNoTransaksi] = useState('');
    const [noMR, setNoMR] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    // modal
    const [selectedNoTransaksi, setSelectedNoTransaksi] = useState<string | null>(null);

    const uid = getSelectedDashboardUserId();
    const headers = getApiHeaders(uid ? { 'x-impersonate-user-id': uid } : undefined);

    // fetch summary cards
    const fetchSummary = useCallback(async () => {
        setSummaryLoading(true);
        try {
            const res = await fetch('/api/proxy/transactions/summary', { headers });
            const json = await res.json();
            if (json.summary) setSummary(json.summary);
        } catch (e) {
            console.error(e);
        } finally {
            setSummaryLoading(false);
        }
    }, []);

    // fetch table data
    const fetchData = useCallback(async (page = 1, filters?: { noTransaksi?: string; noMR?: string; startDate?: string; endDate?: string }) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), limit: '10' });
            const f = filters ?? { noTransaksi, noMR, startDate, endDate };
            if (f.noTransaksi) params.set('noTransaksi', f.noTransaksi);
            if (f.noMR) params.set('noMR', f.noMR);
            if (f.startDate) params.set('startDate', f.startDate);
            if (f.endDate) params.set('endDate', f.endDate);

            const res = await fetch(`/api/proxy/transactions?${params}`, { headers });
            const json = await res.json();
            if (json.data) {
                setData(json.data);
                setPagination(json.pagination);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [noTransaksi, noMR, startDate, endDate]);

    useEffect(() => { fetchSummary(); }, [fetchSummary]);
    useEffect(() => { fetchData(1); }, []);

    const handleSearch = () => fetchData(1, { noTransaksi, noMR, startDate, endDate });
    const handleReset = () => {
        setNoTransaksi(''); setNoMR(''); setStartDate(''); setEndDate('');
        fetchData(1, { noTransaksi: '', noMR: '', startDate: '', endDate: '' });
    };

    const canSearch = noTransaksi || noMR || startDate || endDate;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Transaksi</h1>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                {summaryLoading ? (
                    [0, 1, 2].map(i => (
                        <div key={i} className="bg-white dark:bg-neutral-900 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-neutral-800 h-28 animate-pulse" />
                    ))
                ) : (
                    <>
                        <SummaryCard title="Hari Ini" count={summary.hariIni.count} nominal={summary.hariIni.nominal} icon={Calendar} color="bg-blue-500" />
                        <SummaryCard title="Bulan Ini" count={summary.bulanIni.count} nominal={summary.bulanIni.nominal} icon={TrendingUp} color="bg-violet-500" />
                        <SummaryCard title="Tahun Ini" count={summary.tahunIni.count} nominal={summary.tahunIni.nominal} icon={Receipt} color="bg-emerald-500" />
                    </>
                )}
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-neutral-800">
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">No Transaksi</label>
                        <input
                            type="text"
                            value={noTransaksi}
                            onChange={e => setNoTransaksi(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            placeholder="Cari no transaksi..."
                            className="w-full rounded-lg border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">No MR</label>
                        <input
                            type="text"
                            value={noMR}
                            onChange={e => setNoMR(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            placeholder="Cari no MR..."
                            className="w-full rounded-lg border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tanggal Mulai</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tanggal Akhir</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-end gap-2">
                        <button
                            onClick={handleSearch}
                            className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white px-4 py-2 text-sm font-medium transition-colors"
                        >
                            <Search className="h-4 w-4" /> Cari
                        </button>
                        {canSearch && (
                            <button
                                onClick={handleReset}
                                className="flex items-center justify-center gap-1 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-700 text-gray-700 dark:text-gray-300 px-3 py-2 text-sm transition-colors"
                                title="Reset filter"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700">
                    <h2 className="font-semibold text-gray-900 dark:text-white">Riwayat Transaksi</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                        {loading ? 'Memuat...' : `Total ${pagination.totalRows.toLocaleString('id-ID')} transaksi ditemukan`}
                    </p>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 gap-2 text-gray-500 dark:text-gray-400">
                            <Loader2 className="h-5 w-5 animate-spin" /> Memuat data...
                        </div>
                    ) : data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                            <Receipt className="h-10 w-10 mb-3 opacity-30" />
                            <p className="text-sm">Tidak ada data transaksi</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 font-medium">
                                <tr>
                                    <th className="px-4 py-3">No Transaksi</th>
                                    <th className="px-4 py-3">Tgl Transaksi</th>
                                    <th className="px-4 py-3">No MR</th>
                                    <th className="px-4 py-3 text-right">Total Biaya</th>
                                    <th className="px-4 py-3 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                                {data.map((row, i) => (
                                    <tr key={row.No_Transaksi ?? i} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.No_Transaksi ?? '-'}</td>
                                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{fmtDate(row.Tgl_Transaksi)}</td>
                                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.No_MR ?? '-'}</td>
                                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{fmtIDR(row.Total)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => setSelectedNoTransaksi(row.No_Transaksi)}
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 px-3 py-1.5 text-xs font-medium transition-colors"
                                            >
                                                <Eye className="h-3.5 w-3.5" /> Detail
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {!loading && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 dark:border-neutral-800">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Halaman {pagination.page} dari {pagination.totalPages}
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                disabled={pagination.page <= 1}
                                onClick={() => fetchData(pagination.page - 1)}
                                className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-neutral-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-neutral-800 disabled:cursor-not-allowed transition-colors"
                            >
                                ← Prev
                            </button>
                            <button
                                disabled={pagination.page >= pagination.totalPages}
                                onClick={() => fetchData(pagination.page + 1)}
                                className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-neutral-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-neutral-800 disabled:cursor-not-allowed transition-colors"
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedNoTransaksi && (
                <DetailModal
                    noTransaksi={selectedNoTransaksi}
                    onClose={() => setSelectedNoTransaksi(null)}
                />
            )}
        </div>
    );
}
