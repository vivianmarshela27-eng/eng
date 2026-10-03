import React, { useEffect, useState, useCallback } from "react";
import api from "@/lib/api";
import { Activity, Clock, Factory, BarChart3, RotateCw } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Cell,
} from "recharts";

const BUCKETS = [
  { key: "daily", label: "Harian" },
  { key: "weekly", label: "Mingguan" },
  { key: "monthly", label: "Bulanan" },
];
const PERIODS = [
  { value: "7", label: "7 Hari" },
  { value: "30", label: "30 Hari" },
  { value: "90", label: "90 Hari" },
];

function barColor(hours, max) {
  if (max <= 0) return "#10b981";
  const r = hours / max;
  if (r >= 0.66) return "#ef4444";
  if (r >= 0.33) return "#f59e0b";
  return "#10b981";
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs shadow-xl">
      <div className="font-semibold text-slate-200 mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 text-slate-300">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-mono font-bold">{p.value} jam</span>
        </div>
      ))}
    </div>
  );
}

export default function DowntimeMonitor({ machines = [] }) {
  const [machineId, setMachineId] = useState("all");
  const [days, setDays] = useState("30");
  const [bucket, setBucket] = useState("daily");
  const [data, setData] = useState(null);
  const [barFilter, setBarFilter] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const params = { days, bucket };
      if (machineId !== "all") params.machine_id = machineId;
      const r = await api.get("/dashboard/downtime", { params });
      setData(r.data);
    } catch (e) {
      /* silent */
    } finally {
      setRefreshing(false);
    }
  }, [machineId, days, bucket]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [load]);

  const curve = data?.curve || [];
  const perMachine = data?.per_machine || [];
  const maxHours = perMachine.reduce((m, d) => Math.max(m, d.hours), 0);
  const history = (data?.repair_history || []).filter(
    (r) => !barFilter || r.machine_name === barFilter
  );

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-slate-950 text-slate-100 ring-1 ring-slate-800 shadow-2xl mb-6"
      data-testid="downtime-monitor"
    >
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-slate-800/80 bg-gradient-to-r from-slate-900 to-slate-950 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-500/15 text-orange-500 ring-1 ring-orange-500/30">
            <Factory className="h-6 w-6" />
          </div>
          <div>
            <h3 className="font-heading text-xl font-extrabold tracking-tight">
              DOWNTIME <span className="text-orange-500">MONITOR</span>
            </h3>
            <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
              Kurva Waktu Henti Mesin · Data Perbaikan
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-400"
            data-testid="live-badge"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            LIVE
          </span>
          <Select value={machineId} onValueChange={setMachineId}>
            <SelectTrigger className="h-9 w-[170px] border-slate-700 bg-slate-800/70 text-slate-100" data-testid="machine-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Mesin</SelectItem>
              {machines.map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={days} onValueChange={setDays}>
            <SelectTrigger className="h-9 w-[110px] border-slate-700 bg-slate-800/70 text-slate-100" data-testid="period-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIODS.map((p) => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={load}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/70 text-slate-300 transition hover:bg-slate-700"
            data-testid="downtime-refresh"
            title="Muat ulang"
          >
            <RotateCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-5">
        {/* Curve */}
        <div className="rounded-xl bg-slate-900/60 p-4 ring-1 ring-slate-800 lg:col-span-3" data-testid="downtime-curve-card">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h4 className="flex items-center gap-2 font-heading text-base font-bold">
              <Activity className="h-4 w-4 text-orange-500" /> Kurva Downtime / Downtime Curve
            </h4>
            <div className="flex rounded-lg bg-slate-800 p-1">
              {BUCKETS.map((b) => (
                <button
                  key={b.key}
                  onClick={() => setBucket(b.key)}
                  data-testid={`bucket-${b.key}`}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                    bucket === b.key
                      ? "bg-orange-500 text-white shadow"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
          {curve.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center text-sm text-slate-500">
              Belum ada data downtime pada periode ini.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={curve} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="gDowntime" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" stopOpacity={0.55} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0.03} />
                  </linearGradient>
                  <linearGradient id="gUsed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="label" fontSize={11} stroke="#64748b" tickLine={false} axisLine={false} minTickGap={16} />
                <YAxis fontSize={11} stroke="#64748b" tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} width={32} />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone" dataKey="downtime" name="Total Downtime (jam)"
                  stroke="#f97316" strokeWidth={2.5} fill="url(#gDowntime)"
                  activeDot={{ r: 4 }} dot={false}
                />
                <Area
                  type="monotone" dataKey="used" name="Waktu Dipakai (jam)"
                  stroke="#38bdf8" strokeWidth={2.5} fill="url(#gUsed)"
                  activeDot={{ r: 4 }} dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
          <div className="mt-2 flex items-center justify-center gap-6 text-xs text-slate-400">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-orange-500" /> Total Downtime (jam)</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> Waktu Dipakai (jam)</span>
          </div>
        </div>

        {/* Per machine bar */}
        <div className="rounded-xl bg-slate-900/60 p-4 ring-1 ring-slate-800 lg:col-span-2" data-testid="downtime-permachine-card">
          <h4 className="mb-3 flex items-center gap-2 font-heading text-base font-bold">
            <BarChart3 className="h-4 w-4 text-sky-400" /> Downtime per Mesin
          </h4>
          {perMachine.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center text-sm text-slate-500">
              Belum ada data.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={perMachine} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" fontSize={11} stroke="#64748b" tickLine={false} axisLine={false} />
                <YAxis type="category" dataKey="machine" fontSize={10} stroke="#94a3b8" width={96} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "#1e293b55" }} />
                <Bar dataKey="hours" name="Downtime (jam)" radius={[0, 5, 5, 0]} barSize={18}
                     onClick={(d) => setBarFilter((p) => (p === d.machine ? null : d.machine))}
                     cursor="pointer">
                  {perMachine.map((d, i) => (
                    <Cell key={i} fill={barColor(d.hours, maxHours)}
                          data-testid={`permachine-bar-${i}`}
                          opacity={barFilter && barFilter !== d.machine ? 0.35 : 1} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
          <p className="mt-2 text-center text-[11px] text-slate-500">
            Klik batang untuk memfilter tabel riwayat · satuan jam
          </p>
        </div>
      </div>

      {/* Repair history table */}
      <div className="border-t border-slate-800/80 px-5 pb-5" data-testid="downtime-history-card">
        <div className="mb-2 flex items-center justify-between pt-4">
          <h4 className="flex items-center gap-2 font-heading text-base font-bold">
            <Clock className="h-4 w-4 text-orange-500" /> Riwayat Perbaikan
          </h4>
          {barFilter && (
            <button
              onClick={() => setBarFilter(null)}
              className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300 hover:bg-slate-700"
              data-testid="clear-bar-filter"
            >
              {barFilter} ✕
            </button>
          )}
        </div>
        <div className="max-h-[280px] overflow-auto rounded-lg ring-1 ring-slate-800">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-slate-900 text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-2.5 text-left font-semibold">Tanggal</th>
                <th className="p-2.5 text-left font-semibold">Mesin</th>
                <th className="p-2.5 text-left font-semibold">Masalah</th>
                <th className="p-2.5 text-right font-semibold">Downtime</th>
                <th className="p-2.5 text-right font-semibold">Durasi Perbaikan</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-slate-500">Tidak ada riwayat perbaikan.</td></tr>
              )}
              {history.map((r) => (
                <tr key={r.id} className="border-t border-slate-800/70 hover:bg-slate-800/40" data-testid={`downtime-history-row-${r.id}`}>
                  <td className="whitespace-nowrap p-2.5 text-slate-400">{r.date}</td>
                  <td className="p-2.5 font-semibold text-slate-200">{r.machine_name || "-"}</td>
                  <td className="max-w-[220px] truncate p-2.5 text-slate-400" title={r.problem}>{r.problem || "-"}</td>
                  <td className="whitespace-nowrap p-2.5 text-right font-mono text-orange-400">{r.downtime_hours || 0} j</td>
                  <td className="whitespace-nowrap p-2.5 text-right font-mono text-sky-400">{r.repair_duration_hours || 0} j</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
