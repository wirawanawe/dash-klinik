'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Building2, Search, Download } from 'lucide-react';
import { getApiHeaders } from '@/lib/api';
import { getSelectedDashboardUserId } from '@/lib/tenant';
import ExcelJS from 'exceljs';

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

type Row = {
    no: number;
    noKunjungan: string;
    tglKunjungan: string;
    noMR: string;
    namaPasien: string;
    noPeserta: string;
    noTagihan: string;
    perusahaan: string;
    namaObat: string;
    qty: number;
    harga: number;
    jumlahHargaObat: number;
    biayaDokter: number;
    biayaObatTotal: number;
    jumlahTotal: number;
};

function formatIDR(v: number | null | undefined) {
    if (v === 0) return '-';
    return new Intl.NumberFormat('id-ID', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(v ?? 0);
}

function formatDate(dateStr: string) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    });
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

    const handleDownloadXlsx = async () => {
        if (!rows.length) return;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Laporan Transaksi');

        // Define Columns
        worksheet.columns = [
            { header: 'NO', key: 'no', width: 5 },
            { header: 'TANGGAL', key: 'tanggal', width: 15 },
            { header: 'NAMA PASIEN', key: 'nama_pasien', width: 25 },
            { header: 'NO REGISTER', key: 'no_mr', width: 20 },
            { header: 'NOMOR TAGIHAN', key: 'no_tagihan', width: 20 },
            { header: 'PERUSAHAAN', key: 'perusahaan', width: 20 },
            { header: 'NAMA OBAT / ALAT KESEHATAN', key: 'nama_obat', width: 35 },
            { header: 'QTY', key: 'qty', width: 8 },
            { header: 'HARGA @ OBAT', key: 'harga', width: 15 },
            { header: 'JUMLAH HARGA OBAT', key: 'jumlah_harga', width: 18 },
            { header: 'BIAYA DOKTER, LAB DAN OTHER', key: 'biaya_dokter', width: 20 },
            { header: 'OBAT Rp.', key: 'obat_base', width: 15 },
            { header: 'LAB Rp.', key: 'lab', width: 12 },
            { header: 'OTHER Rp.', key: 'other', width: 12 },
            { header: 'PPN Rp.', key: 'ppn', width: 12 },
            { header: 'PPH 22 Rp.', key: 'pph22', width: 12 },
            { header: 'PPH 23 Rp.', key: 'pph23', width: 12 },
            { header: 'BIAYA OBAT Rp.', key: 'biaya_obat', width: 18 },
            { header: 'JUMLAH Rp.', key: 'jumlah_total', width: 18 },
        ];

        // Style Header
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF2563EB' }, // blue-600
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        headerRow.height = 30;

        let lastKunjungan = '';
        let groupNo = 0;

        rows.forEach((r) => {
            const isFirstInGroup = r.noKunjungan !== lastKunjungan;
            if (isFirstInGroup) {
                lastKunjungan = r.noKunjungan;
                groupNo++;
            }

            const baseObat = Math.round(r.biayaObatTotal * 100 / 111);
            const ppn = r.biayaObatTotal - baseObat;

            const row = worksheet.addRow({
                no: isFirstInGroup ? groupNo : '',
                tanggal: isFirstInGroup ? formatDate(r.tglKunjungan) : '',
                nama_pasien: isFirstInGroup ? r.namaPasien : '',
                no_mr: isFirstInGroup ? r.noMR : '',
                no_tagihan: isFirstInGroup ? r.noTagihan : '',
                perusahaan: isFirstInGroup ? r.perusahaan : '',
                nama_obat: r.namaObat,
                qty: r.qty,
                harga: r.harga,
                jumlah_harga: r.jumlahHargaObat,
                biaya_dokter: isFirstInGroup ? r.biayaDokter : '',
                obat_base: isFirstInGroup ? baseObat : '',
                lab: '',
                other: '',
                ppn: isFirstInGroup ? ppn : '',
                pph22: '',
                pph23: '',
                biaya_obat: isFirstInGroup ? r.biayaObatTotal : '',
                jumlah_total: isFirstInGroup ? r.jumlahTotal : '',
            });

            // Alignment and borders
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin' },
                    left: { style: 'thin' },
                    bottom: { style: 'thin' },
                    right: { style: 'thin' },
                };
                if (typeof cell.value === 'number') {
                    cell.numFmt = '#,##0';
                }
            });
        });

        // Add auto filters
        worksheet.autoFilter = {
            from: 'A1',
            to: `S${rows.length + 1}`,
        };

        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `laporan_transaksi_perusahaan_${new Date().toISOString().slice(0, 10)}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
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
                <table className="w-full text-[11px] text-left border-collapse">
                    <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-600 dark:text-gray-300 uppercase font-bold text-[10px]">
                        <tr>
                            <th className="px-2 py-3 border border-gray-200 dark:border-neutral-700 text-center">NO</th>
                            <th className="px-2 py-3 border border-gray-200 dark:border-neutral-700">TANGGAL</th>
                            <th className="px-2 py-3 border border-gray-200 dark:border-neutral-700">NAMA PASIEN</th>
                            <th className="px-2 py-3 border border-gray-200 dark:border-neutral-700">NO REGISTER</th>
                            <th className="px-2 py-3 border border-gray-200 dark:border-neutral-700">NOMOR TAGIHAN</th>
                            <th className="px-2 py-3 border border-gray-200 dark:border-neutral-700">PERUSAHAAN</th>
                            <th className="px-2 py-3 border border-gray-200 dark:border-neutral-700">NAMA OBAT / ALAT KESEHATAN</th>
                            <th className="px-2 py-3 border border-gray-200 dark:border-neutral-700 text-center">QTY</th>
                            <th className="px-2 py-3 border border-gray-200 dark:border-neutral-700 text-right">HARGA @ OBAT</th>
                            <th className="px-2 py-3 border border-gray-200 dark:border-neutral-700 text-right">JUMLAH HARGA OBAT</th>
                            <th className="px-2 py-3 border border-gray-200 dark:border-neutral-700 text-right">BIAYA DOKTER, LAB DAN OTHER</th>
                            <th className="px-2 py-3 border border-gray-200 dark:border-neutral-700 text-right">OBAT Rp.</th>
                            <th className="px-2 py-3 border border-gray-200 dark:border-neutral-700 text-right">LAB Rp.</th>
                            <th className="px-2 py-3 border border-gray-200 dark:border-neutral-700 text-right">OTHER Rp.</th>
                            <th className="px-2 py-3 border border-gray-200 dark:border-neutral-700 text-right">PPN Rp.</th>
                            <th className="px-2 py-3 border border-gray-200 dark:border-neutral-700 text-right">PPH 22 Rp.</th>
                            <th className="px-2 py-3 border border-gray-200 dark:border-neutral-700 text-right">PPH 23 Rp.</th>
                            <th className="px-2 py-3 border border-gray-200 dark:border-neutral-700 text-right font-bold">BIAYA OBAT Rp.</th>
                            <th className="px-2 py-3 border border-gray-200 dark:border-neutral-700 text-right font-bold">JUMLAH Rp.</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-neutral-800">
                        {loading ? (
                            <tr>
                                <td colSpan={19} className="px-4 py-16 text-center text-gray-500 dark:text-gray-400">
                                    <div className="inline-flex items-center gap-2">
                                        <Loader2 className="h-5 w-5 animate-spin" /> Memuat data...
                                    </div>
                                </td>
                            </tr>
                        ) : rows.length === 0 ? (
                            <tr>
                                <td colSpan={19} className="px-4 py-16 text-center text-gray-500 dark:text-gray-400">
                                    Tidak ada data untuk rentang tanggal ini.
                                </td>
                            </tr>
                        ) : (
                            (() => {
                                let lastKunjungan = '';
                                let groupCount = 0;
                                return paginatedRows.map((r, idx) => {
                                    const isFirstInGroup = r.noKunjungan !== lastKunjungan;
                                    if (isFirstInGroup) {
                                        lastKunjungan = r.noKunjungan;
                                        groupCount++;
                                    }

                                    const baseObat = Math.round(r.biayaObatTotal * 100 / 111);
                                    const ppn = r.biayaObatTotal - baseObat;

                                    return (
                                        <tr key={`${r.no}-${idx}`} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition-colors">
                                            <td className="px-2 py-2 text-center border-x border-gray-100 dark:border-neutral-800">{isFirstInGroup ? groupCount : ''}</td>
                                            <td className="px-2 py-2 border-x border-gray-100 dark:border-neutral-800 whitespace-nowrap">{isFirstInGroup ? formatDate(r.tglKunjungan) : ''}</td>
                                            <td className="px-2 py-2 border-x border-gray-100 dark:border-neutral-800">{isFirstInGroup ? r.namaPasien : ''}</td>
                                            <td className="px-2 py-2 border-x border-gray-100 dark:border-neutral-800">{isFirstInGroup ? r.noMR : ''}</td>
                                            <td className="px-2 py-2 border-x border-gray-100 dark:border-neutral-800">{isFirstInGroup ? r.noTagihan : ''}</td>
                                            <td className="px-2 py-2 border-x border-gray-100 dark:border-neutral-800">{isFirstInGroup ? r.perusahaan : ''}</td>
                                            <td className="px-2 py-2 border-x border-gray-100 dark:border-neutral-800">{r.namaObat || '-'}</td>
                                            <td className="px-2 py-2 text-center border-x border-gray-100 dark:border-neutral-800">{r.qty}</td>
                                            <td className="px-2 py-2 text-right border-x border-gray-100 dark:border-neutral-800">{formatIDR(r.harga)}</td>
                                            <td className="px-2 py-2 text-right border-x border-gray-100 dark:border-neutral-800">{formatIDR(r.jumlahHargaObat)}</td>
                                            <td className="px-2 py-2 text-right border-x border-gray-100 dark:border-neutral-800 font-bold">{isFirstInGroup ? formatIDR(r.biayaDokter) : ''}</td>
                                            <td className="px-2 py-2 text-right border-x border-gray-100 dark:border-neutral-800">{isFirstInGroup ? formatIDR(baseObat) : ''}</td>
                                            <td className="px-2 py-2 text-right border-x border-gray-100 dark:border-neutral-800">-</td>
                                            <td className="px-2 py-2 text-right border-x border-gray-100 dark:border-neutral-800">-</td>
                                            <td className="px-2 py-2 text-right border-x border-gray-100 dark:border-neutral-800">{isFirstInGroup ? formatIDR(ppn) : ''}</td>
                                            <td className="px-2 py-2 text-right border-x border-gray-100 dark:border-neutral-800">-</td>
                                            <td className="px-2 py-2 text-right border-x border-gray-100 dark:border-neutral-800">-</td>
                                            <td className="px-2 py-2 text-right border-x border-gray-100 dark:border-neutral-800 font-bold">{isFirstInGroup ? formatIDR(r.biayaObatTotal) : ''}</td>
                                            <td className="px-2 py-2 text-right border-x border-gray-100 dark:border-neutral-800 font-bold">{isFirstInGroup ? formatIDR(r.jumlahTotal) : ''}</td>
                                        </tr>
                                    );
                                });
                            })()
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

