import React, { useEffect, useState } from "react";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import { generateReportPDF } from "@/lib/pdf";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { CheckCircle2, XCircle, ClipboardCheck } from "lucide-react";
import { FileDown, Upload, Trash2, FileText, Loader2, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import { toast } from "sonner";

const MACHINE_COLORS = ["#0284C7", "#059669", "#D97706", "#E11D48", "#7C3AED", "#0891B2"];

export default function Reports() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState("");
  const [delFile, setDelFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    api.get("/reports/summary").then((r) => setData(r.data)).catch(() => {});
    loadFiles();
  }, []);

  const loadFiles = () => api.get("/files").then((r) => setFiles(r.data)).catch(() => {});

  const previewKind = (f) => {
    const ct = (f.content_type || "").toLowerCase();
    const ext = (f.original_filename || "").split(".").pop().toLowerCase();
    if (ct.startsWith("image/") || ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext)) return "image";
    if (ct.includes("pdf") || ext === "pdf") return "pdf";
    if (ct.startsWith("text/") || ["txt", "csv", "json", "md", "log", "xml"].includes(ext)) return "text";
    return "other";
  };

  const openPreview = async (f) => {
    const kind = previewKind(f);
    if (kind === "other") { setPreview({ file: f, url: "", kind }); return; }
    try {
      const res = await api.get(`/files/${f.id}/download`, { responseType: "blob" });
      const blob = f.content_type ? new Blob([res.data], { type: f.content_type }) : res.data;
      const url = URL.createObjectURL(blob);
      setPreview({ file: f, url, kind });
    } catch (err) {
      toast.error("Gagal memuat pratinjau");
    }
  };

  const closePreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const formatSize = (b) => {
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1024 / 1024).toFixed(2)} MB`;
  };

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Ukuran berkas melebihi 2 MB");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title);
    setUploading(true);
    try {
      await api.post("/files", fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Berkas diunggah");
      setTitle("");
      loadFiles();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Gagal mengunggah berkas");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const downloadFile = async (f) => {
    try {
      const res = await api.get(`/files/${f.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = f.original_filename || "berkas";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error("Gagal mengunduh berkas");
    }
  };

  const doDeleteFile = async () => {
    try {
      await api.delete(`/files/${delFile.id}`);
      toast.success("Berkas dihapus");
      setDelFile(null);
      loadFiles();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Gagal menghapus berkas");
    }
  };

  if (!data) return <div className="text-slate-500">Memuat laporan...</div>;

  const typeData = [
    { name: "Preventif", value: data.by_type?.preventif || 0, fill: "#0284C7" },
    { name: "Perbaikan", value: data.by_type?.perbaikan || 0, fill: "#D97706" },
  ];

  const prev = data.preventive || {};
  const prevHistory = data.preventive_history || [];
  const prevChart = [
    { name: "OK", value: prev.total_ok || 0, fill: "#059669" },
    { name: "Tidak OK", value: prev.total_not_ok || 0, fill: "#E11D48" },
  ];
  const prevByType = (data.preventive_by_type || []).map((t, i) => ({ ...t, fill: MACHINE_COLORS[i % MACHINE_COLORS.length] }));

  const exportPdf = () => {
    generateReportPDF(data.services || [], { isAdmin }, prevHistory);
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
        <Card className="p-6" data-testid="preventive-chart-card">
          <h3 className="font-heading text-lg font-bold uppercase tracking-tight mb-4">Hasil Pemeriksaan Preventif</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={prevChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" fontSize={12} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                {prevChart.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-6 flex flex-col justify-center" data-testid="preventive-summary-card">          <h3 className="font-heading text-lg font-bold uppercase tracking-tight mb-4 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-sky-600" /> Ringkasan Riwayat Preventif
          </h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Checksheet Terisi</span><span className="font-bold" data-testid="stat-total-checksheets">{prev.total_checksheets || 0} dari {prev.total_schedules || 0} jadwal</span></div>
            <div className="flex justify-between border-b pb-2"><span className="text-slate-500">Total Item Diperiksa</span><span className="font-bold">{prev.total_items || 0}</span></div>
            <div className="flex justify-between border-b pb-2"><span className="text-slate-500 inline-flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-emerald-600" /> Item OK</span><span className="font-bold text-emerald-600">{prev.total_ok || 0}</span></div>
            <div className="flex justify-between border-b pb-2"><span className="text-slate-500 inline-flex items-center gap-1.5"><XCircle className="w-4 h-4 text-rose-600" /> Item Tidak OK</span><span className="font-bold text-rose-600">{prev.total_not_ok || 0}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Checksheet dengan Temuan</span><span className="font-bold text-amber-600">{prev.with_issues || 0}</span></div>
          </div>
        </Card>
      </div>

      <Card className="p-6 mb-6" data-testid="preventive-bytype-card">
        <h3 className="font-heading text-lg font-bold uppercase tracking-tight mb-4">Riwayat Preventif Berdasarkan Jenis</h3>
        {prevByType.length === 0 ? (
          <p className="text-sm text-slate-400">Belum ada checksheet preventif terisi.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={prevByType}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="type" fontSize={12} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip formatter={(v) => `${v} checksheet`} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {prevByType.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

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
            <div className="flex justify-between"><span className="text-slate-500">Total Downtime</span><span className="font-bold text-sky-700">{(data.services || []).reduce((a, s) => a + (s.downtime_hours || 0), 0)} jam</span></div>
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
                <TableHead>Waktu (jam)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data.services || []).length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-slate-400 py-8">Belum ada data.</TableCell></TableRow>
              )}
              {(data.services || []).map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="whitespace-nowrap">{formatDate(s.date)}</TableCell>
                  <TableCell className="font-semibold">{s.machine_name}</TableCell>
                  <TableCell><StatusBadge status={s.service_type} /></TableCell>
                  <TableCell>{s.technician_name || "-"}</TableCell>
                  <TableCell><StatusBadge status={s.status} /></TableCell>
                  <TableCell className="font-mono">{s.downtime_hours || 0} jam</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Card className="overflow-hidden mt-6" data-testid="document-library">
        <div className="p-4 border-b flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-heading text-lg font-bold uppercase tracking-tight">Perpustakaan Dokumen</h3>
            <p className="text-xs text-slate-500 mt-0.5">Unggah & simpan berkas pendukung (maks. 2 MB per berkas).</p>
          </div>
          {isAdmin && (
            <div className="flex items-end gap-2">
              <div>
                <label className="text-[11px] uppercase tracking-wider text-slate-500">Judul/Keterangan (opsional)</label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="mis. Manual Mesin CNC" className="h-10 w-56" data-testid="file-title-input" />
              </div>
              <input ref={fileInputRef} type="file" className="hidden" onChange={onPickFile} data-testid="file-input" />
              <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} data-testid="upload-file-button" className="bg-sky-600 hover:bg-sky-500 h-10">
                {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {uploading ? "Mengunggah..." : "Unggah Berkas"}
              </Button>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <Table data-testid="files-table">
            <TableHeader>
              <TableRow>
                <TableHead>Nama Berkas</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Ukuran</TableHead>
                <TableHead>Tanggal Unggah</TableHead>
                <TableHead>Pengunggah</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {files.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-slate-400 py-10">Belum ada berkas. {isAdmin ? "Unggah berkas pertama Anda." : ""}</TableCell></TableRow>
              )}
              {files.map((f) => (
                <TableRow key={f.id} data-testid={`file-row-${f.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                      <div>
                        <div className="font-semibold">{f.title || f.original_filename}</div>
                        {f.title && f.title !== f.original_filename && <div className="text-xs text-slate-400">{f.original_filename}</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="uppercase text-xs text-slate-500">{(f.original_filename?.split(".").pop() || "-")}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatSize(f.size)}</TableCell>
                  <TableCell className="whitespace-nowrap">{formatDate(f.created_at)}</TableCell>
                  <TableCell>{f.uploaded_by || "-"}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="outline" size="sm" className="mr-1" onClick={() => openPreview(f)} data-testid={`preview-file-${f.id}`}>
                      <Eye className="w-4 h-4 mr-1" /> Pratinjau
                    </Button>
                    <Button variant="outline" size="sm" className="mr-1" onClick={() => downloadFile(f)} data-testid={`download-file-${f.id}`}>
                      <FileDown className="w-4 h-4 mr-1" /> Unduh
                    </Button>
                    {isAdmin && (
                      <Button variant="ghost" size="icon" onClick={() => setDelFile(f)} data-testid={`delete-file-${f.id}`}>
                        <Trash2 className="w-4 h-4 text-rose-600" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <AlertDialog open={!!delFile} onOpenChange={(v) => !v && setDelFile(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus berkas ini?</AlertDialogTitle>
            <AlertDialogDescription>"{delFile?.title || delFile?.original_filename}" akan dihapus dari perpustakaan. Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={doDeleteFile} className="bg-rose-600 hover:bg-rose-500" data-testid="confirm-delete-file">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!preview} onOpenChange={(v) => !v && closePreview()}>
        <DialogContent className="max-w-3xl" data-testid="preview-dialog">
          <DialogHeader>
            <DialogTitle className="truncate pr-6">{preview?.file?.title || preview?.file?.original_filename}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-auto bg-slate-100 dark:bg-slate-900 rounded-lg flex items-center justify-center">
            {preview?.kind === "image" && (
              <img src={preview.url} alt="pratinjau" className="max-w-full max-h-[68vh] object-contain" data-testid="preview-image" />
            )}
            {preview?.kind === "pdf" && (
              <iframe title="pratinjau" src={preview.url} className="w-full h-[68vh]" data-testid="preview-frame" />
            )}
            {preview?.kind === "text" && (
              <iframe title="pratinjau" src={preview.url} className="w-full h-[68vh] bg-white" data-testid="preview-frame" />
            )}
            {preview?.kind === "other" && (
              <div className="p-10 text-center text-slate-500" data-testid="preview-unsupported">
                <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>Pratinjau tidak tersedia untuk jenis berkas ini.</p>
                <Button className="mt-4 bg-sky-600 hover:bg-sky-500" onClick={() => downloadFile(preview.file)}>
                  <FileDown className="w-4 h-4 mr-2" /> Unduh Berkas
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
