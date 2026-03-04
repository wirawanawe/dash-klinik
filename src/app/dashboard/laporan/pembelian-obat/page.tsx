'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, ShoppingCart, Search, Download } from 'lucide-react';
import { getApiHeaders } from '@/lib/api';
import { getSelectedDashboardUserId } from '@/lib/tenant';
import * as XLSX from 'xlsx';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type PembelianRow = {
    no: number;
    tglPembelian: string;
    namaObat: string;
    namaVendor: string;
    noBatch: string;
    qty: number;
    harga: number;
};

function formatDate(value: string | null | undefined) {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

function formatIDR(v: number | null | undefined) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(v ?? 0);
}

export default function LaporanPembelianObatPage() {
    const [rows, setRows] = useState<PembelianRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [tanggalAwal, setTanggalAwal] = useState('');
    const [tanggalAkhir, setTanggalAkhir] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const selectedUserId = getSelectedDashboardUserId();
            const headers = getApiHeaders(
                selectedUserId ? { 'x-impersonate-user-id': selectedUserId } : undefined
            );

            const params = new URLSearchParams();
            if (tanggalAwal) params.set('startDate', tanggalAwal);
            if (tanggalAkhir) params.set('endDate', tanggalAkhir);

            const res = await fetch(
                `/api/proxy/dashboard/laporan/pembelian-obat?${params.toString()}`,
                { headers }
            );
            const json = await res.json();
            const rawData: any[] = json.data ?? [];

            const mapped: PembelianRow[] = rawData.map((r, i) => ({
                no: i + 1,
                tglPembelian: r.tglPembelian ?? '',
                namaObat: r.namaObat ?? '-',
                namaVendor: r.namaVendor ?? '-',
                noBatch: r.noBatch ?? '',
                qty: Number(r.qty ?? 0),
                harga: Number(r.harga ?? 0),
            }));

            setRows(mapped);
            setPage(1);
        } catch (e) {
            console.error(e);
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [tanggalAwal, tanggalAkhir]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const totalNilai = useMemo(
        () => rows.reduce((acc, r) => acc + r.qty * r.harga, 0),
        [rows]
    );

    const totalHalaman = useMemo(
        () => (rows.length ? Math.ceil(rows.length / pageSize) : 1),
        [rows.length, pageSize]
    );
    const paginatedRows = useMemo(
        () => rows.slice((page - 1) * pageSize, page * pageSize),
        [rows, page, pageSize]
    );

    const handleDownloadXlsx = () => {
        if (!rows.length) return;
        const dataForSheet = rows.map((r) => ({
            No: r.no,
            'Tanggal Pembelian': formatDate(r.tglPembelian),
            'Nama Obat': r.namaObat,
            'Nama Vendor': r.namaVendor,
            'No. Batch': r.noBatch,
            QTY: r.qty,
            Harga: r.harga,
            'Jumlah (Qty*Harga)': r.qty * r.harga,
        }));
        const ws = XLSX.utils.json_to_sheet(dataForSheet);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Laporan Pembelian');
        XLSX.writeFile(wb, 'laporan_pembelian_obat.xlsx');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                    <ShoppingCart className="h-7 w-7 text-emerald-600" />
                    Laporan Pembelian Obat
                </h1>
                <button
                    type="button"
                    onClick={handleDownloadXlsx}
                    disabled={!rows.length}
                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white px-4 py-2 text-sm font-medium transition-colors"
                >
                    <Download className="h-4 w-4" />
                    Download .xlsx
                </button>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-neutral-800">
                <div className="grid gap-3 sm:grid-cols-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Tanggal Awal
                        </label>
                        <input
                            type="date"
                            value={tanggalAwal}
                            onChange={(e) => setTanggalAwal(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Tanggal Akhir
                        </label>
                        <input
                            type="date"
                            value={tanggalAkhir}
                            onChange={(e) => setTanggalAkhir(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            type="button"
                            onClick={fetchData}
                            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-medium transition-colors"
                        >
                            <Search className="h-4 w-4" />
                            Tampilkan
                        </button>
                    </div>
                    <div className="flex items-end justify-end text-sm text-gray-600 dark:text-gray-300">
                        Total Nilai:&nbsp;
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {formatIDR(totalNilai)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700 flex items-center justify-between">
                    <div>
                        <h2 className="font-semibold text-gray-900 dark:text-white">Daftar Pembelian Obat</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {loading ? 'Memuat data...' : `Total ${rows.length} baris`}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 dark:text-gray-400">Tampilkan</span>
                        <select
                            value={pageSize}
                            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                            className="h-9 rounded-lg border border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-2 text-sm"
                        >
                            {PAGE_SIZE_OPTIONS.map((n) => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                        <span className="text-sm text-gray-500 dark:text-gray-400">per halaman</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="flex items-center justify-center py-16 gap-2 text-gray-500 dark:text-gray-400">
                            <Loader2 className="h-5 w-5 animate-spin" /> Memuat data...
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="flex items-center justify-center py-16 text-gray-500 dark:text-gray-400">
                            Tidak ada data pembelian obat.
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-gray-300">
                                <tr>
                                    <th className="px-4 py-3">No</th>
                                    <th className="px-4 py-3">Tanggal Pembelian</th>
                                    <th className="px-4 py-3">Nama Obat</th>
                                    <th className="px-4 py-3">Nama Vendor</th>
                                    <th className="px-4 py-3">No. Batch</th>
                                    <th className="px-4 py-3 text-right">QTY</th>
                                    <th className="px-4 py-3 text-right">Harga</th>
                                    <th className="px-4 py-3 text-right">Jumlah</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                                {paginatedRows.map((row) => (
                                    <tr key={row.no} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{row.no}</td>
                                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                                            {formatDate(row.tglPembelian)}
                                        </td>
                                        <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">
                                            {row.namaObat}
                                        </td>
                                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                                            {row.namaVendor}
                                        </td>
                                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                                            {row.noBatch || '-'}
                                        </td>
                                        <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                                            {row.qty}
                                        </td>
                                        <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                                            {formatIDR(row.harga)}
                                        </td>
                                        <td className="px-4 py-2 text-right font-semibold text-gray-900 dark:text-white">
                                            {formatIDR(row.qty * row.harga)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
                {!loading && rows.length > 0 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-neutral-700">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Halaman {page} dari {totalHalaman} ({rows.length} baris)
                        </p>
                        <div className="flex items-center gap-2">
                            <button
                                disabled={page <= 1}
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-neutral-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-neutral-800 disabled:cursor-not-allowed"
                            >
                                ← Prev
                            </button>
                            <button
                                disabled={page >= totalHalaman}
                                onClick={() => setPage((p) => Math.min(totalHalaman, p + 1))}
                                className="px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-neutral-700 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-neutral-800 disabled:cursor-not-allowed"
                            >
                                Next →
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

