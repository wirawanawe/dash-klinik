'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Loader2, Notebook, Search, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { getApiHeaders } from '@/lib/api';
import { getSelectedDashboardUserId } from '@/lib/tenant';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type PenjualanRow = {
    no: number;
    tglPenjualan: string;
    namaObat: string;
    namaPasien: string;
    alamat: string;
    noTlp: string;
    jumlah: number;
    qty: number;
};

function formatDate(v: string | null | undefined) {
    if (!v) return '-';
    return new Date(v).toLocaleDateString('id-ID', {
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

export default function LaporanPenjualanObatPage() {
    const [rows, setRows] = useState<PenjualanRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [tanggalAwal, setTanggalAwal] = useState('');
    const [tanggalAkhir, setTanggalAkhir] = useState('');
    const [noInvoice, setNoInvoice] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const selectedUserId = getSelectedDashboardUserId();
            const headers = getApiHeaders(
                selectedUserId ? { 'x-impersonate-user-id': selectedUserId } : undefined
            );

            const params = new URLSearchParams({ page: '1', limit: '500' });
            if (noInvoice) params.set('noInvoice', noInvoice);

            const res = await fetch(`/api/proxy/farmasi/far-resep?${params.toString()}`, {
                headers,
            });
            const json = await res.json();
            const headersData: any[] = json.data ?? [];

            const allRows: PenjualanRow[] = [];
            let counter = 1;

            for (const hdr of headersData) {
                const tgl = hdr.TgInvoice ? String(hdr.TgInvoice).slice(0, 10) : null;
                if (tanggalAwal && (!tgl || tgl < tanggalAwal)) continue;
                if (tanggalAkhir && (!tgl || tgl > tanggalAkhir)) continue;

                const detailRes = await fetch(
                    `/api/proxy/farmasi/far-resep/${encodeURIComponent(hdr.NoInvoice)}/detail`,
                    { headers }
                );
                const detailJson = await detailRes.json();
                const details: any[] = detailJson.data ?? [];

                for (const d of details) {
                    const qty = Number(d.Qty ?? 0);
                    const harga = Number(d.Harga ?? 0);
                    allRows.push({
                        no: counter++,
                        tglPenjualan: hdr.TgInvoice ?? '',
                        namaObat: d.ItemDesc ?? '-',
                        namaPasien: hdr.PasienDesc ?? '-',
                        alamat:
                            hdr.Alamat ??
                            hdr.Address ??
                            hdr.AlamatPasien ??
                            '',
                        noTlp:
                            hdr.NoTlp ??
                            hdr.NoTelp ??
                            hdr.Phone ??
                            '',
                        jumlah: qty * harga,
                        qty,
                    });
                }
            }

            setRows(allRows);
            setPage(1);
        } catch (e) {
            console.error(e);
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [tanggalAwal, tanggalAkhir, noInvoice]);

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
            No: r.no,
            'Tanggal Penjualan': formatDate(r.tglPenjualan),
            'Nama Obat': r.namaObat,
            'Nama Pasien': r.namaPasien,
            Alamat: r.alamat || '-',
            'No. Tlp': r.noTlp || '-',
            Qty: r.qty,
            Jumlah: r.jumlah,
        }));
        const ws = XLSX.utils.json_to_sheet(dataForSheet);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Laporan Penjualan');
        XLSX.writeFile(wb, 'laporan_penjualan_obat.xlsx');
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                    <Notebook className="h-7 w-7 text-blue-600" />
                    Laporan Penjualan Obat
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
                <div className="grid gap-3 sm:grid-cols-4">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Tanggal Awal
                        </label>
                        <input
                            type="date"
                            value={tanggalAwal}
                            onChange={(e) => setTanggalAwal(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                            className="w-full rounded-lg border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            No. Invoice Resep
                        </label>
                        <input
                            type="text"
                            value={noInvoice}
                            onChange={(e) => setNoInvoice(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                            placeholder="Cari No. Invoice..."
                            className="w-full rounded-lg border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <div>
                        <h2 className="font-semibold text-gray-900 dark:text-white">Daftar Penjualan Obat</h2>
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
                            Tidak ada data penjualan obat.
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-gray-300">
                                <tr>
                                    <th className="px-4 py-3">No</th>
                                    <th className="px-4 py-3">Tanggal Penjualan</th>
                                    <th className="px-4 py-3">Nama Obat</th>
                                    <th className="px-4 py-3">Nama Pasien</th>
                                    <th className="px-4 py-3">Alamat</th>
                                    <th className="px-4 py-3">No. Tlp</th>
                                    <th className="px-4 py-3 text-right">Qty</th>
                                    <th className="px-4 py-3 text-right">Jumlah</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                                {paginatedRows.map((row) => (
                                    <tr key={row.no} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">{row.no}</td>
                                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                                            {formatDate(row.tglPenjualan)}
                                        </td>
                                        <td className="px-4 py-2 font-medium text-gray-900 dark:text-white">
                                            {row.namaObat}
                                        </td>
                                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                                            {row.namaPasien}
                                        </td>
                                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                                            {row.alamat || '-'}
                                        </td>
                                        <td className="px-4 py-2 text-gray-700 dark:text-gray-300">
                                            {row.noTlp || '-'}
                                        </td>
                                        <td className="px-4 py-2 text-right text-gray-700 dark:text-gray-300">
                                            {row.qty}
                                        </td>
                                        <td className="px-4 py-2 text-right font-semibold text-gray-900 dark:text-white">
                                            {formatIDR(row.jumlah)}
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

