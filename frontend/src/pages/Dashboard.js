import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { Card } from "@/components/ui/card";
import StatusBadge from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import {
  Cog,
  CheckCircle2,
  CalendarClock,
  AlertTriangle,
  Timer,
  Wrench,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

const MACHINE_COLORS = ["#0284C7", "#059669", "#D97706", "#E11D48", "#7C3AED", "#0891B2"];
const PIE_COLORS = ["#059669", "#D97706", "#E11D48", "#64748b"];

function StatCard({ icon: Icon, label, value, tone, testId }) {
  return (
    <Card className="p-5 flex items-center gap-4" data-testid={testId}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${tone}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </div>
        <div className="text-2xl font-heading font-extrabold text-slate-900 dark:text-slate-100">
          {value}
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { isAdmin, user } = useAuth();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/dashboard/stats").then((r) => setStats(r.data)).catch(() => {});
  }, []);

  if (!stats) return <div className="text-slate-500">Memuat data...</div>;

  const sc = stats.status_counts || {};
  const pieData = [
    { name: "Operasional", value: sc.operasional || 0 },
    { name: "Perawatan", value: sc.perawatan || 0 },
    { name: "Rusak", value: sc.rusak || 0 },
    { name: "Nonaktif", value: sc.nonaktif || 0 },
  ].filter((d) => d.value > 0);

  return (
    <div className="relative">
      <div
        className="pointer-events-none fixed inset-0 lg:left-72 z-0 bg-center bg-no-repeat opacity-[0.05]"
        style={{ backgroundImage: "url('/logo.png')", backgroundSize: "min(620px, 58%)" }}
        aria-hidden="true"
      />
      <div className="relative z-10">
      <PageHeader
        title="Dashboard"
        subtitle={`Selamat datang, ${user?.name}. Ringkasan kondisi pemeliharaan mesin.`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Cog}
          label="Total Mesin"
          value={stats.total_machines}
          tone="bg-sky-100 text-sky-700"
          testId="stat-total-machines"
        />
        <StatCard
          icon={CheckCircle2}
          label="Beroperasi"
          value={sc.operasional || 0}
          tone="bg-emerald-100 text-emerald-700"
          testId="stat-operational"
        />
        <StatCard
          icon={CalendarClock}
          label="Jadwal Jatuh Tempo"
          value={stats.due_schedules_count}
          tone="bg-amber-100 text-amber-700"
          testId="stat-due"
        />
        <StatCard
          icon={AlertTriangle}
          label="Stok Menipis"
          value={stats.low_stock_count}
          tone="bg-rose-100 text-rose-700"
          testId="stat-lowstock"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <StatCard
          icon={Timer}
          label="Total Downtime Servis"
          value={`${stats.total_downtime || 0} jam`}
          tone="bg-slate-900 text-white"
          testId="stat-total-downtime"
        />
        <StatCard
          icon={Wrench}
          label="Total Catatan Servis"
          value={stats.total_services}
          tone="bg-slate-100 text-slate-700"
          testId="stat-total-services"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <h3 className="font-heading text-lg font-bold uppercase tracking-tight mb-4">
            Status Mesin
          </h3>
          {pieData.length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada data mesin.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" outerRadius={95} label>
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-6" data-testid="downtime-chart-card">
          <h3 className="font-heading text-lg font-bold uppercase tracking-tight mb-4">
            Kurva Downtime per Mesin (jam / bulan)
          </h3>
          {(stats.downtime_by_machine_month || []).length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada data downtime servis.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={stats.downtime_by_machine_month}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} allowDecimals={false} tickFormatter={(v) => `${v}j`} />
                <Tooltip formatter={(v) => `${v} jam`} />
                {(stats.downtime_machine_series || []).map((mac, i) => (
                  <Line key={mac} type="monotone" dataKey={mac} stroke={MACHINE_COLORS[i % MACHINE_COLORS.length]} strokeWidth={2} dot={{ r: 3 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-6" data-testid="downtime-bar-card">
          <h3 className="font-heading text-lg font-bold uppercase tracking-tight mb-4">
            Total Downtime per Mesin (jam)
          </h3>
          {(stats.downtime_by_machine || []).length === 0 ? (
            <p className="text-sm text-slate-400">Belum ada data downtime servis.</p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={stats.downtime_by_machine} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis type="number" fontSize={12} allowDecimals={false} />
                <YAxis type="category" dataKey="machine" fontSize={11} width={120} />
                <Tooltip formatter={(v) => `${v} jam`} />
                <Bar dataKey="hours" fill="#0284C7" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="overflow-hidden" data-testid="repair-history-card">
          <div className="p-4 border-b">
            <h3 className="font-heading text-lg font-bold uppercase tracking-tight">Riwayat Perbaikan</h3>
          </div>
          <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 dark:bg-slate-800 text-xs uppercase text-slate-500 sticky top-0">
                <tr>
                  <th className="p-2 text-left">Tanggal</th>
                  <th className="p-2 text-left">Mesin</th>
                  <th className="p-2 text-left">Masalah</th>
                  <th className="p-2 text-left">Downtime</th>
                  <th className="p-2 text-left">Perbaikan</th>
                </tr>
              </thead>
              <tbody>
                {(stats.repair_history || []).length === 0 && (
                  <tr><td colSpan={5} className="text-center text-slate-400 py-8">Belum ada riwayat perbaikan.</td></tr>
                )}
                {(stats.repair_history || []).map((r) => (
                  <tr key={r.id} className="border-t" data-testid={`repair-history-${r.id}`}>
                    <td className="p-2 whitespace-nowrap">{formatDate(r.date)}</td>
                    <td className="p-2 font-semibold">{r.machine_name}</td>
                    <td className="p-2 max-w-[180px] truncate" title={r.problem}>{r.problem || "-"}</td>
                    <td className="p-2 whitespace-nowrap font-mono">{r.downtime_hours || 0} j</td>
                    <td className="p-2 whitespace-nowrap font-mono">{r.repair_duration_hours || 0} j</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-heading text-lg font-bold uppercase tracking-tight mb-4">
            Jadwal Mendesak
          </h3>
          <div className="space-y-3">
            {(stats.due_schedules || []).length === 0 ? (
              <p className="text-sm text-slate-400">Tidak ada jadwal yang mendekati jatuh tempo.</p>
            ) : (
              stats.due_schedules.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 last:border-0"
                >
                  <div>
                    <div className="text-sm font-semibold">{s.machine_name}</div>
                    <div className="text-xs text-slate-500">
                      {s.maintenance_type} • {formatDate(s.due_date)}
                    </div>
                  </div>
                  <StatusBadge status={s.status} />
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-heading text-lg font-bold uppercase tracking-tight mb-4">
            Sparepart Stok Menipis
          </h3>
          <div className="space-y-3">
            {(stats.low_stock_items || []).length === 0 ? (
              <p className="text-sm text-slate-400">Semua stok aman.</p>
            ) : (
              stats.low_stock_items.map((i, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2 last:border-0"
                >
                  <div>
                    <div className="text-sm font-semibold">{i.name}</div>
                    <div className="text-xs text-slate-500 font-mono">{i.code}</div>
                  </div>
                  <span className="text-sm font-bold text-rose-600">
                    {i.stock} / {i.min_stock}
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
      </div>
    </div>
  );
}
