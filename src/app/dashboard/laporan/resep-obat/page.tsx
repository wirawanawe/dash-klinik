'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, FileText, Search, Download } from 'lucide-react';
import { getApiHeaders } from '@/lib/api';
import { getSelectedDashboardUserId } from '@/lib/tenant';
import * as ExcelJS from 'exceljs';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type Row = {
    no: number;
    tanggal: string;
    namaDokter: string;
    noResep: string;
    namaObat: string;
    namaPabrik: string;
    qty: number;
};

function formatDate(dateStr: string) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
}

export default function LaporanResepObatPage() {
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const fetchData = async () => {
        setLoading(true);
        try {
            const selectedUserId = getSelectedDashboardUserId();
            const headers = getApiHeaders(
                selectedUserId ? { 'x-impersonate-user-id': selectedUserId } : undefined
            );

            const params = new URLSearchParams();
            if (startDate) params.set('startDate', startDate);
            if (endDate) params.set('endDate', endDate);
            if (search) params.set('search', search);

            const res = await fetch(
                `/api/proxy/dashboard/laporan/resep-obat?${params.toString()}`,
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
    };

    useEffect(() => {
        fetchData();
    }, []);

    const totalHalaman = useMemo(
        () => (rows.length ? Math.ceil(rows.length / pageSize) : 1),
        [rows.length, pageSize]
    );
    const paginatedRows = useMemo(
        () => rows.slice((page - 1) * pageSize, page * pageSize),
        [rows, page, pageSize]
    );

    const handleDownloadXlsx = async () => {
        if (!rows.length) return;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Laporan Resep Obat');

        worksheet.columns = [
            { header: 'NO', key: 'no', width: 5 },
            { header: 'TANGGAL', key: 'tanggal', width: 15 },
            { header: 'NAMA DOKTER', key: 'namaDokter', width: 25 },
            { header: 'NO. RESEP', key: 'noResep', width: 20 },
            { header: 'NAMA OBAT', key: 'namaObat', width: 35 },
            { header: 'NAMA PABRIK', key: 'namaPabrik', width: 25 },
            { header: 'QTY', key: 'qty', width: 10 },
        ];

        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF2563EB' },
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        headerRow.height = 30;

        rows.forEach((r) => {
            const row = worksheet.addRow({
                no: r.no,
                tanggal: formatDate(r.tanggal),
                namaDokter: r.namaDokter,
                noResep: r.noResep,
                namaObat: r.namaObat,
                namaPabrik: r.namaPabrik,
                qty: r.qty,
            });

            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' },
                };
            });
        });

        worksheet.autoFilter = {
            from: 'A1',
            to: `G${rows.length + 1}`,
        };

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `laporan_resep_obat_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="h-7 w-7 text-blue-600" />
                    Laporan Resep Obat
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
                <div className="grid gap-4 sm:grid-cols-4">
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
                    <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                            Pencarian
                        </label>
                        <input
                            type="text"
                            placeholder="Cari Dokter / Obat..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full rounded-lg border border-gray-200 dark:border-neutral-700 bg-gray-50 dark:bg-neutral-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                    <div className="flex items-end">
                        <button
                            type="button"
                            onClick={fetchData}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium transition-colors h-[38px]"
                        >
                            <Search className="h-4 w-4" />
                            Cari
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
                <table className="w-full text-[13px] text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 uppercase font-bold text-[11px]">
                        <tr>
                            <th className="px-4 py-3 border border-gray-200 dark:border-neutral-700 text-center w-16">NO</th>
                            <th className="px-4 py-3 border border-gray-200 dark:border-neutral-700">TANGGAL</th>
                            <th className="px-4 py-3 border border-gray-200 dark:border-neutral-700">NAMA DOKTER</th>
                            <th className="px-4 py-3 border border-gray-200 dark:border-neutral-700">NO. RESEP</th>
                            <th className="px-4 py-3 border border-gray-200 dark:border-neutral-700">NAMA OBAT</th>
                            <th className="px-4 py-3 border border-gray-200 dark:border-neutral-700">NAMA PABRIK</th>
                            <th className="px-4 py-3 border border-gray-200 dark:border-neutral-700 text-center w-24">QTY</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-16 text-center text-gray-500 dark:text-gray-400">
                                    <div className="inline-flex items-center justify-center gap-2 w-full">
                                        <Loader2 className="h-5 w-5 animate-spin" /> Memuat data...
                                    </div>
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="px-4 py-16 text-center text-gray-500 dark:text-gray-400">
                                    Tidak ada data untuk rentang tanggal ini.
                                </td>
                            </tr>
                        ) : (
                            paginatedRows.map((r, idx) => (
                                <tr key={`${r.no}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                                    <td className="px-4 py-3 text-center border border-gray-100 dark:border-neutral-800">{r.no}</td>
                                    <td className="px-4 py-3 border border-gray-100 dark:border-neutral-800 whitespace-nowrap">{formatDate(r.tanggal)}</td>
                                    <td className="px-4 py-3 border border-gray-100 dark:border-neutral-800">{r.namaDokter}</td>
                                    <td className="px-4 py-3 border border-gray-100 dark:border-neutral-800">{r.noResep}</td>
                                    <td className="px-4 py-3 border border-gray-100 dark:border-neutral-800">{r.namaObat}</td>
                                    <td className="px-4 py-3 border border-gray-100 dark:border-neutral-800">{r.namaPabrik}</td>
                                    <td className="px-4 py-3 text-center border border-gray-100 dark:border-neutral-800 font-medium">{r.qty}</td>
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
