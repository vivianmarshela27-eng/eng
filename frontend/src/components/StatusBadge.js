import React from "react";
import { Badge } from "@/components/ui/badge";

const MAP = {
  operasional: { label: "Operasional", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  perawatan: { label: "Dalam Perawatan", cls: "bg-amber-100 text-amber-800 border-amber-300" },
  rusak: { label: "Rusak / Perbaikan", cls: "bg-rose-100 text-rose-800 border-rose-300" },
  nonaktif: { label: "Nonaktif", cls: "bg-slate-100 text-slate-700 border-slate-300" },
  terjadwal: { label: "Terjadwal", cls: "bg-sky-100 text-sky-800 border-sky-300" },
  jatuh_tempo: { label: "Jatuh Tempo", cls: "bg-rose-100 text-rose-800 border-rose-300" },
  selesai: { label: "Selesai", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  dalam_proses: { label: "Dalam Proses", cls: "bg-amber-100 text-amber-800 border-amber-300" },
  tersedia: { label: "Tersedia", cls: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  bertugas: { label: "Bertugas", cls: "bg-sky-100 text-sky-800 border-sky-300" },
  cuti: { label: "Cuti", cls: "bg-slate-100 text-slate-700 border-slate-300" },
  preventif: { label: "Preventif", cls: "bg-sky-100 text-sky-800 border-sky-300" },
  perbaikan: { label: "Perbaikan", cls: "bg-amber-100 text-amber-800 border-amber-300" },
};

export default function StatusBadge({ status }) {
  const m = MAP[status] || { label: status || "-", cls: "bg-slate-100 text-slate-700 border-slate-300" };
  return (
    <Badge variant="outline" className={`font-medium ${m.cls}`} data-testid={`status-${status}`}>
      {m.label}
    </Badge>
  );
}
