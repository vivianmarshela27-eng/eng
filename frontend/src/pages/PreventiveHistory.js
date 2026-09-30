import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { formatDate } from "@/lib/format";
import { generateChecksheetPDF, generateRecapPDF } from "@/lib/pdf";
import ChecksheetDialog from "@/components/ChecksheetDialog";
import TemplateManager from "@/components/TemplateManager";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ClipboardList, ClipboardCheck, FileDown, FileText, Plus, Trash2, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";

const hasChecksheet = (s) => !!(s.checksheet && Array.isArray(s.checksheet.items) && s.checksheet.items.length > 0);

export default function PreventiveHistory() {
  const { isAdmin } = useAuth();
  const [schedules, setSchedules] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [csTarget, setCsTarget] = useState(null);
  const [tplOpen, setTplOpen] = useState(false);
  const [pickOpen, setPickOpen] = useState(false);
  const [pickId, setPickId] = useState("");
  const [delTarget, setDelTarget] = useState(null);

  const load = () => api.get("/schedules").then((r) => setSchedules(r.data)).catch(() => {});
  const loadTemplates = () => api.get("/checksheet-templates").then((r) => setTemplates(r.data)).catch(() => {});
  useEffect(() => { load(); loadTemplates(); }, []);

  const history = schedules.filter(hasChecksheet);
  const pending = schedules.filter((s) => !hasChecksheet(s));

  const summary = (s) => {
    const items = s.checksheet?.items || [];
    const ok = items.filter((i) => i.result === "ok").length;
    const notOk = items.filter((i) => i.result === "not_ok").length;
    return { ok, notOk, total: items.length };
  };

  const startNew = () => {
    const sch = pending.find((x) => x.id === pickId);
    if (!sch) { toast.error("Pilih jadwal terlebih dahulu"); return; }
    setPickOpen(false);
    setPickId("");
    setCsTarget(sch);
  };

  const doDelete = async () => {
    try {
      await api.delete(`/schedules/${delTarget.id}/checksheet`);
      toast.success("Checksheet dihapus");
      setDelTarget(null);
      load();
    } catch (e) {
      toast.error(e.response?.data?.detail || "Gagal menghapus checksheet");
    }
  };

  const printRecap = () => {
    if (history.length === 0) { toast.error("Belum ada checksheet untuk direkap"); return; }
    generateRecapPDF(history);
  };

  return (
    <div>
      <PageHeader title="Riwayat Preventif" subtitle="Checksheet pemeliharaan yang sudah diisi.">
        <div className="flex flex-wrap gap-2">
          <Button onClick={printRecap} variant="outline" data-testid="recap-pdf-button">
            <FileText className="w-4 h-4 mr-2" /> Cetak Rekap
          </Button>
          {isAdmin && (
            <>
              <Button onClick={() => setTplOpen(true)} variant="outline" data-testid="manage-templates-button">
                <ClipboardList className="w-4 h-4 mr-2" /> Kelola Template
              </Button>
              <Button onClick={() => { setPickId(""); setPickOpen(true); }} data-testid="new-checksheet-button" className="bg-sky-600 hover:bg-sky-500">
                <Plus className="w-4 h-4 mr-2" /> Isi Checksheet Baru
              </Button>
            </>
          )}
        </div>
      </PageHeader>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table data-testid="history-table">
            <TableHeader>
              <TableRow>
                <TableHead>Mesin</TableHead>
                <TableHead>Jenis Pemeliharaan</TableHead>
                <TableHead>Jatuh Tempo</TableHead>
                <TableHead>Ringkasan Hasil</TableHead>
                <TableHead>Terakhir Disimpan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-slate-400 py-10">
                  Belum ada checksheet yang terisi.{isAdmin ? " Klik \"Isi Checksheet Baru\" untuk memulai." : ""}
                </TableCell></TableRow>
              )}
              {history.map((s) => {
                const sm = summary(s);
                return (
                  <TableRow key={s.id} data-testid={`history-row-${s.id}`}>
                    <TableCell className="font-semibold">{s.machine_name}</TableCell>
                    <TableCell>{s.maintenance_type}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatDate(s.due_date)}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold"><CheckCircle2 className="w-4 h-4" /> {sm.ok} OK</span>
                      <span className="mx-1.5 text-slate-300">·</span>
                      <span className="inline-flex items-center gap-1.5 text-rose-600 font-semibold"><XCircle className="w-4 h-4" /> {sm.notOk} Tidak OK</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-slate-500">{s.checksheet?.updated_at ? formatDate(s.checksheet.updated_at) : "-"}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="outline" size="sm" className="mr-1" onClick={() => setCsTarget(s)} data-testid={`open-checksheet-${s.id}`}>
                        <ClipboardCheck className="w-4 h-4 mr-1" /> {isAdmin ? "Buka" : "Lihat"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => generateChecksheetPDF(s)} data-testid={`pdf-checksheet-${s.id}`}>
                        <FileDown className="w-4 h-4 mr-1" /> Cetak BAP
                      </Button>
                      {isAdmin && (
                        <Button variant="ghost" size="icon" onClick={() => setDelTarget(s)} data-testid={`delete-checksheet-${s.id}`}>
                          <Trash2 className="w-4 h-4 text-rose-600" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Card>

      <ChecksheetDialog
        open={!!csTarget}
        onOpenChange={(v) => !v && setCsTarget(null)}
        schedule={csTarget}
        templates={templates}
        isAdmin={isAdmin}
        onSaved={load}
      />
      <TemplateManager open={tplOpen} onOpenChange={setTplOpen} templates={templates} onChanged={loadTemplates} />

      <AlertDialog open={!!delTarget} onOpenChange={(v) => !v && setDelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus checksheet ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Hanya data checksheet untuk "{delTarget?.machine_name}" ({delTarget?.maintenance_type}) yang dihapus. Jadwal pemeliharaannya tetap ada dan dapat diisi ulang. Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-rose-600 hover:bg-rose-500" data-testid="confirm-delete-checksheet">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={pickOpen} onOpenChange={setPickOpen}>
        <DialogContent className="max-w-md" data-testid="pick-schedule-dialog">
          <DialogHeader><DialogTitle className="font-heading">Isi Checksheet Baru</DialogTitle></DialogHeader>
          <div>
            <p className="text-sm text-slate-500 mb-3">Pilih jadwal pemeliharaan yang belum memiliki checksheet.</p>
            <Select value={pickId} onValueChange={setPickId}>
              <SelectTrigger data-testid="pick-schedule-select"><SelectValue placeholder="Pilih jadwal" /></SelectTrigger>
              <SelectContent>
                {pending.length === 0 && <div className="px-3 py-2 text-sm text-slate-400">Semua jadwal sudah memiliki checksheet.</div>}
                {pending.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.machine_name} — {s.maintenance_type} ({formatDate(s.due_date)})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPickOpen(false)}>Batal</Button>
            <Button onClick={startNew} disabled={!pickId} data-testid="pick-schedule-confirm" className="bg-sky-600 hover:bg-sky-500">Buka Form</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
