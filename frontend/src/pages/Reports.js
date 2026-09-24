import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { formatRupiah, formatDate, HIDDEN } from "@/lib/format";
import { generateReportPDF } from "@/lib/pdf";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { FileDown } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import { toast } from "sonner";

export default function Reports() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get("/reports/summary").then((r) => setData(r.data)).catch(() => {});
  }, []);

  if (!data) return <div className="text-slate-500">Memuat laporan...</div>;

  const typeData = [
    { name: "Preventif", value: data.by_type?.preventif || 0, fill: "#0284C7" },
    { name: "Perbaikan", value: data.by_type?.perbaikan || 0, fill: "#D97706" },
  ];

  const exportPdf = () => {
    generateReportPDF(data.services || [], { isAdmin });
    toast.success("Laporan PDF diunduh");
  };

  return (
    <div>
      <PageHeader title="Laporan & Analisa" subtitle="Analisis servis & ekspor laporan.">
        <Button onClick={exportPdf} data-testid="export-pdf-button" className="bg-sky-600 hover:bg-sky-500">
          <FileDown className="w-4 h-4 mr-2" /> Ekspor PDF
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <h3 className="font-heading text-lg font-bold uppercase tracking-tight mb-4">Servis Berdasarkan Jenis</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={typeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {typeData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-6 flex flex-col justify-center">
          <h3 className="font-heading text-lg font-bold uppercase tracking-tight mb-4">Ringkasan</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Total Catatan Servis</span><span className="font-bold">{(data.services || []).length}</span></div>
            <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Preventif</span><span className="font-bold">{data.by_type?.preventif || 0}</span></div>
            <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Perbaikan</span><span className="font-bold">{data.by_type?.perbaikan || 0}</span></div>
            {isAdmin && (
              <div className="flex justify-between"><span className="text-slate-500">Total Biaya</span><span className="font-bold text-sky-700">{formatRupiah((data.services || []).reduce((a, s) => a + (s.cost || 0), 0))}</span></div>
            )}
          </div>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b"><h3 className="font-heading text-lg font-bold uppercase tracking-tight">Riwayat Servis</h3></div>
        <div className="overflow-x-auto">
          <Table data-testid="reports-table">
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Mesin</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Teknisi</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead>Biaya</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data.services || []).length === 0 && (
                <TableRow><TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-slate-400 py-8">Belum ada data.</TableCell></TableRow>
              )}
              {(data.services || []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(s.date)}</TableCell>
                  <TableCell className="font-semibold">{s.machine_name}</TableCell>
                  <TableCell><StatusBadge status={s.service_type} /></TableCell>
                  <TableCell>{s.technician_name || "-"}</TableCell>
                  <TableCell><StatusBadge status={s.status} /></TableCell>
                  {isAdmin && <TableCell className="font-mono">{formatRupiah(s.cost)}</TableCell>}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
      {!isAdmin && <p className="text-xs text-slate-400 mt-3">* Informasi biaya hanya untuk Administrator ({HIDDEN}).</p>}
    </div>
  );
}
