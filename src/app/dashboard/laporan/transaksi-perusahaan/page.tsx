'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Building2, Search, Download } from 'lucide-react';
import { getApiHeaders } from '@/lib/api';
import { getSelectedDashboardUserId } from '@/lib/tenant';
import * as XLSX from 'xlsx';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type Row = {
    no: number;
    noKunjungan: string;
    noMR: string;
    namaPasien: string;
    namaDokter: string;
   diagnosa: string;
    biayaDokterUmum: number;
    noApotek: string;
    namaObat: string;
    qty: number;
    harga: number;
    jumlah: number;
    total: number;
    penjamin: string;
    perusahaan: string;
};

function formatIDR(v: number | null | undefined) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(v ?? 0);
}

export default function LaporanTransaksiPerusahaanPage() {
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
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
            if (startDate) params.set('startDate', startDate);
            if (endDate) params.set('endDate', endDate);

            const res = await fetch(
                `/api/proxy/dashboard/laporan/transaksi-perusahaan?${params.toString()}`,
                { headers }
            );
            const json = await res.json();
            const resultRows: Row[] = json.data ?? [];

            setRows(resultRows);
            setPage(1);
        } catch (e) {
            console.error(e);
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

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
            'No Kunjungan': r.noKunjungan,
            'No MR': r.noMR,
            'Nama Pasien': r.namaPasien,
            'Nama Dokter': r.namaDokter,
            Diagnosa: r.diagnosa,
            'Biaya Dr Umum': r.biayaDokterUmum,
            'No Apotek': r.noApotek,
            'Nama Obat': r.namaObat,
            QTY: r.qty,
            Harga: r.harga,
            Jumlah: r.jumlah,
            Total: r.total,
            Penjamin: r.penjamin,
            Perusahaan: r.perusahaan,
        }));
        const ws = XLSX.utils.json_to_sheet(dataForSheet);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Laporan Transaksi');
        XLSX.writeFile(wb, 'laporan_transaksi_perusahaan.xlsx');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                    <Building2 className="h-7 w-7 text-blue-600" />
                    Laporan Transaksi Perusahaan
                </h1>
                <button
                    type="button"
                    onClick={handleDownloadXlsx}
                    disabled={!rows.length}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-4 py-2 text-sm font-medium transition-colors"
                >
                    <Download className="h-4 w-4" />
                    Download .xlsx
                </button>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-neutral-800">
                <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Tanggal Mulai
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Tanggal Akhir
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            type="button"
                            onClick={fetchData}
                            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium transition-colors"
                        >
                            <Search className="h-4 w-4" />
                            Tampilkan
                        </button>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700 flex items-center justify-between">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        {loading ? 'Memuat data...' : `Total ${rows.length} baris`}
                    </p>
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
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-gray-300">
                        <tr>
                            <th className="px-4 py-3">No</th>
                            <th className="px-4 py-3">No Kunjungan</th>
                            <th className="px-4 py-3">No MR</th>
                            <th className="px-4 py-3">Nama Pasien</th>
                            <th className="px-4 py-3">Nama Dokter</th>
                            <th className="px-4 py-3">Diagnosa</th>
                            <th className="px-4 py-3 text-right">Biaya Dr Umum</th>
                            <th className="px-4 py-3">No Apotek</th>
                            <th className="px-4 py-3">Nama Obat</th>
                            <th className="px-4 py-3 text-right">QTY</th>
                            <th className="px-4 py-3 text-right">Harga</th>
                            <th className="px-4 py-3 text-right">Jumlah</th>
                            <th className="px-4 py-3 text-right">Total</th>
                            <th className="px-4 py-3">Penjamin</th>
                            <th className="px-4 py-3">Perusahaan</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {loading ? (
                            <tr>
                                <td colSpan={15} className="px-4 py-16 text-center text-gray-500 dark:text-gray-400">
                                    <div className="inline-flex items-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin" /> Memuat data...
                                    </div>
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={15} className="px-4 py-16 text-center text-gray-500 dark:text-gray-400">
                                    Tidak ada data untuk rentang tanggal ini.
                                </td>
                            </tr>
                        ) : (
                            paginatedRows.map((r) => (
                                <tr key={r.no} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{r.no}</td>
                                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{r.noKunjungan}</td>
                                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{r.noMR}</td>
                                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{r.namaPasien}</td>
                                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{r.namaDokter}</td>
                                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                                        {r.diagnosa || '-'}
                                    </td>
                                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                                        {formatIDR(r.biayaDokterUmum)}
                                    </td>
                                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{r.noApotek}</td>
                                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{r.namaObat}</td>
                                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">{r.qty}</td>
                                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                                        {formatIDR(r.harga)}
                                    </td>
                                    <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                                        {formatIDR(r.jumlah)}
                                    </td>
                                    <td className="px-4 py-2 text-right font-semibold text-gray-900 dark:text-white">
                                        {formatIDR(r.total)}
                                    </td>
                                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{r.penjamin}</td>
                                    <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{r.perusahaan}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
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

