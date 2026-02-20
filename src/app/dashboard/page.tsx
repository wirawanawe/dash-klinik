'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, Users, Pill, Stethoscope, Calendar, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { getApiHeaders } from '@/lib/api';
import { getSelectedDashboardUserId } from '@/lib/tenant';

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

type ObatItem = { no: number; namaObat: string; totalQty: number; totalResep: number };
type DiagnosaItem = { no: number; namaDiagnosa: string; kodeICD: string; total: number };

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function DashboardPage() {
    const now = new Date();
    const [loading, setLoading] = useState(true);
    const [graphLoading, setGraphLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState(now.getFullYear());
    const [kunjungan, setKunjungan] = useState({ hariIni: 0, bulanIni: 0, tahunIni: 0 });
    const [graphData, setGraphData] = useState<{ tanggal: string; jumlah: number; label: string }[]>([]);
    const [obatTahunIni, setObatTahunIni] = useState<ObatItem[]>([]);
    const [obatBulanIni, setObatBulanIni] = useState<ObatItem[]>([]);
    const [diagnosaTahunIni, setDiagnosaTahunIni] = useState<DiagnosaItem[]>([]);
    const [diagnosaBulanIni, setDiagnosaBulanIni] = useState<DiagnosaItem[]>([]);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const selectedUserId = getSelectedDashboardUserId();
            const res = await fetch(`/api/proxy/dashboard/stats?month=${selectedMonth}&year=${selectedYear}`, {
                headers: getApiHeaders(selectedUserId ? { 'x-impersonate-user-id': selectedUserId } : undefined),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.message || 'Gagal memuat data');
            setKunjungan(json.kunjungan ?? { hariIni: 0, bulanIni: 0, tahunIni: 0 });
            setObatTahunIni(json.obatTahunIni ?? []);
            setObatBulanIni(json.obatBulanIni ?? []);
            setDiagnosaTahunIni(json.diagnosaTahunIni ?? []);
            setDiagnosaBulanIni(json.diagnosaBulanIni ?? []);
        } catch (e) {
            console.error(e);
            setError(e instanceof Error ? e.message : 'Gagal memuat data dashboard');
        } finally {
            setLoading(false);
        }
    }, [selectedMonth, selectedYear]);

    const fetchGraph = useCallback(async () => {
        setGraphLoading(true);
        try {
            const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
            const startDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
            const endDate = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
            const selectedUserId = getSelectedDashboardUserId();
            const res = await fetch(`/api/proxy/dashboard/graph?startDate=${startDate}&endDate=${endDate}`, {
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

    useEffect(() => {
        fetchStats();
    }, [fetchStats]);

    useEffect(() => {
        fetchGraph();
    }, [fetchGraph]);

    const currentMonthName = MONTHS[selectedMonth - 1];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
                <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Dashboard</h1>
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
                <div className="p-4 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300">
                    {error}
                </div>
            ) : (
                <>
                    {/* Total Kunjungan */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Users className="h-5 w-5 text-blue-500" />
                            Total Kunjungan
                        </h2>
                        <div className="grid gap-4 md:grid-cols-3">
                            <DashboardCard
                                title="Hari Ini"
                                value={kunjungan.hariIni}
                                subtext={new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })}
                                icon={Calendar}
                            />
                            <DashboardCard
                                title={`Bulan ${currentMonthName}`}
                                value={kunjungan.bulanIni}
                                subtext={`${currentMonthName} ${selectedYear}`}
                                icon={Calendar}
                            />
                            <DashboardCard
                                title={`Tahun ${selectedYear}`}
                                value={kunjungan.tahunIni}
                                subtext={`Tahun ${selectedYear}`}
                                icon={Calendar}
                            />
                        </div>
                    </section>

                    {/* Graph Kunjungan Per Hari */}
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

                    {/* Obat-obatan yang Sering Diresepkan */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Pill className="h-5 w-5 text-emerald-500" />
                            Obat-obatan yang Sering Diresepkan
                        </h2>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700 bg-gray-50/50 dark:bg-neutral-800/50">
                                    <h3 className="font-medium text-gray-900 dark:text-white">Per Tahun ({selectedYear})</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 font-medium">
                                            <tr>
                                                <th className="px-4 py-3">No</th>
                                                <th className="px-4 py-3">Nama Obat</th>
                                                <th className="px-4 py-3 text-right">Jumlah</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                                            {obatTahunIni.length === 0 ? (
                                                <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">Tidak ada data</td></tr>
                                            ) : (
                                                obatTahunIni.map((row) => (
                                                    <tr key={row.no} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.no}</td>
                                                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.namaObat ?? '-'}</td>
                                                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{row.totalQty ?? 0}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700 bg-gray-50/50 dark:bg-neutral-800/50">
                                    <h3 className="font-medium text-gray-900 dark:text-white">Per Bulan ({currentMonthName})</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 font-medium">
                                            <tr>
                                                <th className="px-4 py-3">No</th>
                                                <th className="px-4 py-3">Nama Obat</th>
                                                <th className="px-4 py-3 text-right">Jumlah</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                                            {obatBulanIni.length === 0 ? (
                                                <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">Tidak ada data</td></tr>
                                            ) : (
                                                obatBulanIni.map((row) => (
                                                    <tr key={row.no} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.no}</td>
                                                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{row.namaObat ?? '-'}</td>
                                                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{row.totalQty ?? 0}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Diagnosa yang Sering Diderita */}
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <Stethoscope className="h-5 w-5 text-amber-500" />
                            Diagnosa yang Sering Diderita
                        </h2>
                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700 bg-gray-50/50 dark:bg-neutral-800/50">
                                    <h3 className="font-medium text-gray-900 dark:text-white">Per Tahun ({selectedYear})</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 font-medium">
                                            <tr>
                                                <th className="px-4 py-3">No</th>
                                                <th className="px-4 py-3">Diagnosa</th>
                                                <th className="px-4 py-3 text-right">Jumlah</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                                            {diagnosaTahunIni.length === 0 ? (
                                                <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">Tidak ada data</td></tr>
                                            ) : (
                                                diagnosaTahunIni.map((row) => (
                                                    <tr key={row.no} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.no}</td>
                                                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                                            {row.namaDiagnosa ?? '-'}
                                                            {row.kodeICD && row.kodeICD !== '-' && (
                                                                <span className="text-xs text-gray-500 ml-1">({row.kodeICD})</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{row.total ?? 0}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-sm border border-gray-100 dark:border-neutral-800 overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-200 dark:border-neutral-700 bg-gray-50/50 dark:bg-neutral-800/50">
                                    <h3 className="font-medium text-gray-900 dark:text-white">Per Bulan ({currentMonthName})</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-gray-50 dark:bg-neutral-800 text-gray-500 dark:text-gray-400 font-medium">
                                            <tr>
                                                <th className="px-4 py-3">No</th>
                                                <th className="px-4 py-3">Diagnosa</th>
                                                <th className="px-4 py-3 text-right">Jumlah</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-neutral-700">
                                            {diagnosaBulanIni.length === 0 ? (
                                                <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-500">Tidak ada data</td></tr>
                                            ) : (
                                                diagnosaBulanIni.map((row) => (
                                                    <tr key={row.no} className="hover:bg-gray-50 dark:hover:bg-neutral-800/50">
                                                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{row.no}</td>
                                                        <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                                                            {row.namaDiagnosa ?? '-'}
                                                            {row.kodeICD && row.kodeICD !== '-' && (
                                                                <span className="text-xs text-gray-500 ml-1">({row.kodeICD})</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-white">{row.total ?? 0}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
