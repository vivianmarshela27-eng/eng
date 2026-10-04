import React, { useEffect, useState } from "react";
import api, { formatApiErrorDetail, API } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import SignaturePad from "@/components/SignaturePad";
import { formatDate } from "@/lib/format";
import { generateServicePDF } from "@/lib/pdf";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, FileDown, CheckCircle2, ImagePlus, Image as ImageIcon, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const photoUrl = (p) => `${API}/files/${p.file_id}/download`;

const empty = {
  machine_id: "", machine_name: "", date: new Date().toISOString().slice(0, 10),
  service_type: "preventif", problem: "", action: "", technician_id: "", technician_name: "",
  technicians: [],
  operator_name: "", used_parts: [], downtime_hours: 0, repair_duration_hours: 0,
  repair_start: "", repair_end: "", downtime_start: "", downtime_end: "", status: "selesai",
  operator_signature: "", technician_signature: "", photos: [],
};

export default function Repairs() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [machines, setMachines] = useState([]);
  const [techs, setTechs] = useState([]);
  const [parts, setParts] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [delId, setDelId] = useState(null);
  const [partSel, setPartSel] = useState("");
  const [partQty, setPartQty] = useState(1);
  const [techSel, setTechSel] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [gallery, setGallery] = useState(null);
  const [lightbox, setLightbox] = useState(null);
  const photoInputRef = React.useRef(null);

  const load = () => api.get("/services").then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => {
    load();
    api.get("/machines").then((r) => setMachines(r.data)).catch(() => {});
    api.get("/technicians").then((r) => setTechs(r.data)).catch(() => {});
    api.get("/spareparts").then((r) => setParts(r.data)).catch(() => {});
  }, []);

  const openNew = () => { setForm(empty); setEditId(null); setOpen(true); };
  const openEdit = (m) => {
    const techList = (m.technicians && m.technicians.length)
      ? m.technicians
      : (m.technician_id ? [{ id: m.technician_id, name: m.technician_name || "" }] : []);
    setForm({ ...empty, ...m, technicians: techList, used_parts: m.used_parts || [], photos: m.photos || [] });
    setEditId(m.id); setOpen(true);
  };

  const onPickPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Hanya berkas gambar yang diperbolehkan"); if (photoInputRef.current) photoInputRef.current.value = ""; return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Ukuran foto melebihi 2 MB"); if (photoInputRef.current) photoInputRef.current.value = ""; return; }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", file.name);
    setUploadingPhoto(true);
    try {
      const { data } = await api.post("/files", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setForm((f) => ({ ...f, photos: [...(f.photos || []), { file_id: data.id, filename: data.original_filename, content_type: data.content_type }] }));
      toast.success("Foto ditambahkan");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Gagal mengunggah foto");
    } finally {
      setUploadingPhoto(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };
  const removePhoto = (idx) => setForm((f) => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }));

  const addTech = (id) => {
    const t = techs.find((x) => x.id === id);
    if (!t) return;
    if ((form.technicians || []).some((x) => x.id === id)) { setTechSel(""); return; }
    setForm({ ...form, technicians: [...(form.technicians || []), { id: t.id, name: t.name }] });
    setTechSel("");
  };
  const removeTech = (id) => setForm({ ...form, technicians: (form.technicians || []).filter((x) => x.id !== id) });

  const addPart = () => {
    const p = parts.find((x) => x.id === partSel);
    if (!p) return;
    const qty = Number(partQty) || 1;
    const idx = form.used_parts.findIndex((x) => x.sparepart_id === p.id);
    const used_parts = idx >= 0
      ? form.used_parts.map((x, i) => (i === idx ? { ...x, qty: x.qty + qty } : x))
      : [...form.used_parts, { sparepart_id: p.id, name: p.name, qty }];
    setForm({ ...form, used_parts });
    setPartSel(""); setPartQty(1);
  };
  const removePart = (idx) => setForm({ ...form, used_parts: form.used_parts.filter((_, i) => i !== idx) });

  const save = async () => {
    const machine = machines.find((x) => x.id === form.machine_id);
    const techList = form.technicians || [];
    const payload = {
      ...form,
      machine_name: machine?.name || form.machine_name,
      technician_name: techList.map((t) => t.name).join(", ") || form.technician_name,
      technician_id: techList[0]?.id || "",
    };
    try {
      if (editId) { await api.put(`/services/${editId}`, payload); toast.success("Catatan servis diperbarui"); }
      else { await api.post("/services", payload); toast.success("Catatan servis disimpan"); }
      setOpen(false); load();
      api.get("/spareparts").then((r) => setParts(r.data)).catch(() => {});
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  const doDelete = async () => {
    try { await api.delete(`/services/${delId}`); toast.success("Catatan dihapus"); setDelId(null); load(); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  return (
    <div>
      <PageHeader title="Perbaikan & Riwayat Servis" subtitle="Catatan servis preventif & perbaikan beserta bukti tanda tangan.">
        {isAdmin && (
          <Button onClick={openNew} data-testid="add-service-button" className="bg-sky-600 hover:bg-sky-500">
            <Plus className="w-4 h-4 mr-2" /> Catat Servis
          </Button>
        )}
      </PageHeader>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table data-testid="services-table">
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Mesin</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Teknisi</TableHead>
                <TableHead>Bukti TTD</TableHead>
                <TableHead>Foto</TableHead>
                <TableHead>Waktu (jam)</TableHead>
                <TableHead>Perbaikan (jam)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow><TableCell colSpan={10} className="text-center text-slate-400 py-8">Belum ada catatan servis.</TableCell></TableRow>
              )}
              {items.map((s) => (
                <TableRow key={s.id} data-testid={`service-row-${s.id}`}>
                  <TableCell className="whitespace-nowrap">{formatDate(s.date)}</TableCell>
                  <TableCell className="font-semibold">{s.machine_name}</TableCell>
                  <TableCell><StatusBadge status={s.service_type} /></TableCell>
                  <TableCell>{s.technician_name || "-"}</TableCell>
                  <TableCell>
                    {s.operator_signature || s.technician_signature ? (
                      <span className="inline-flex items-center text-emerald-600 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Ada
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Belum</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {(s.photos || []).length > 0 ? (
                      <button onClick={() => setGallery(s)} className="inline-flex items-center gap-1 text-sky-600 text-xs font-semibold hover:underline" data-testid={`photos-service-${s.id}`}>
                        <ImageIcon className="w-4 h-4" /> {s.photos.length} foto
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap font-mono" data-testid={`downtime-service-${s.id}`}>{(s.downtime_hours || 0)} jam</TableCell>
                  <TableCell className="whitespace-nowrap font-mono" data-testid={`repairdur-service-${s.id}`}>{(s.repair_duration_hours || 0)} jam</TableCell>
                  <TableCell><StatusBadge status={s.status} /></TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" onClick={() => generateServicePDF(s, { isAdmin })} data-testid={`pdf-service-${s.id}`} title="Unduh BAP PDF">
                      <FileDown className="w-4 h-4 text-sky-600" />
                    </Button>
                    {isAdmin && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(s)} data-testid={`edit-service-${s.id}`}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDelId(s.id)} data-testid={`delete-service-${s.id}`}><Trash2 className="w-4 h-4 text-rose-600" /></Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit Catatan Servis" : "Catat Servis Baru"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Mesin</Label>
              <Select value={form.machine_id} onValueChange={(v) => setForm({ ...form, machine_id: v })}>
                <SelectTrigger data-testid="service-machine-select"><SelectValue placeholder="Pilih mesin" /></SelectTrigger>
                <SelectContent>{machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Tanggal</Label><Input type="date" value={form.date?.slice(0, 10)} onChange={(e) => setForm({ ...form, date: e.target.value })} data-testid="service-date-input" /></div>
            <div>
              <Label>Jenis Servis</Label>
              <Select value={form.service_type} onValueChange={(v) => setForm({ ...form, service_type: v })}>
                <SelectTrigger data-testid="service-type-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="preventif">Preventif</SelectItem>
                  <SelectItem value="perbaikan">Perbaikan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="dalam_proses">Dalam Proses</SelectItem>
                  <SelectItem value="selesai">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2"><Label>Deskripsi Masalah</Label><Textarea value={form.problem} onChange={(e) => setForm({ ...form, problem: e.target.value })} data-testid="service-problem-input" /></div>
            <div className="col-span-2"><Label>Tindakan yang Dilakukan</Label><Textarea value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} data-testid="service-action-input" /></div>
            <div className="col-span-2">
              <Label>Teknisi (bisa lebih dari satu)</Label>
              <Select value={techSel} onValueChange={addTech}>
                <SelectTrigger data-testid="service-technician-select"><SelectValue placeholder="Pilih teknisi" /></SelectTrigger>
                <SelectContent>
                  {techs.filter((t) => !(form.technicians || []).some((x) => x.id === t.id)).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2 mt-2" data-testid="service-technician-chips">
                {(form.technicians || []).length === 0 && <span className="text-xs text-slate-400">Belum ada teknisi dipilih.</span>}
                {(form.technicians || []).map((t) => (
                  <span key={t.id} className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-300 text-sm px-3 py-1" data-testid={`tech-chip-${t.id}`}>
                    {t.name}
                    <button type="button" onClick={() => removeTech(t.id)} className="hover:text-rose-600" data-testid={`remove-tech-${t.id}`}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div className="col-span-2"><Label>Nama Operator</Label><Input value={form.operator_name} onChange={(e) => setForm({ ...form, operator_name: e.target.value })} data-testid="service-operator-input" /></div>
            <div className="col-span-2 border-t pt-4 grid grid-cols-2 gap-3">
              <div className="col-span-2"><Label className="text-xs uppercase tracking-wider text-slate-500">Durasi Perbaikan (mulai → selesai)</Label></div>
              <div><Label>Mulai Perbaikan</Label><Input type="datetime-local" value={form.repair_start || ""} onChange={(e) => setForm({ ...form, repair_start: e.target.value })} data-testid="service-repair-start" /></div>
              <div><Label>Selesai Perbaikan</Label><Input type="datetime-local" value={form.repair_end || ""} onChange={(e) => setForm({ ...form, repair_end: e.target.value })} data-testid="service-repair-end" /></div>
              <div className="col-span-2 mt-2"><Label className="text-xs uppercase tracking-wider text-slate-500">Downtime Mesin (berhenti → jalan lagi)</Label></div>
              <div><Label>Mesin Berhenti</Label><Input type="datetime-local" value={form.downtime_start || ""} onChange={(e) => setForm({ ...form, downtime_start: e.target.value })} data-testid="service-downtime-start" /></div>
              <div><Label>Mesin Jalan Lagi</Label><Input type="datetime-local" value={form.downtime_end || ""} onChange={(e) => setForm({ ...form, downtime_end: e.target.value })} data-testid="service-downtime-end" /></div>
              <p className="col-span-2 text-xs text-slate-400">Durasi dihitung otomatis dari waktu mulai & selesai. Kosongkan bila tidak diperlukan.</p>
            </div>

            {/* Sparepart usage */}
            <div className="col-span-2 border-t pt-4">
              <Label>Sparepart Digunakan</Label>
              <div className="flex gap-2 mt-1.5">
                <Select value={partSel} onValueChange={setPartSel}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder="Pilih sparepart" /></SelectTrigger>
                  <SelectContent>{parts.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} (stok {p.stock})</SelectItem>)}</SelectContent>
                </Select>
                <Input type="number" min="1" value={partQty} onChange={(e) => setPartQty(e.target.value)} className="w-20" />
                <Button type="button" variant="outline" onClick={addPart} data-testid="add-part-button">Tambah</Button>
              </div>
              <div className="mt-2 space-y-1">
                {form.used_parts.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-sm bg-slate-50 dark:bg-slate-800 rounded px-3 py-1.5">
                    <span>{p.name} × {p.qty}</span>
                    <button type="button" onClick={() => removePart(i)} className="text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>

            {/* Photos */}
            <div className="col-span-2 border-t pt-4">
              <Label className="mb-2 block">Foto (Dokumentasi)</Label>
              {isAdmin && (
                <>
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={onPickPhoto} data-testid="service-photo-input" />
                  <Button type="button" variant="outline" onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto} data-testid="add-photo-button">
                    {uploadingPhoto ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ImagePlus className="w-4 h-4 mr-2" />}
                    {uploadingPhoto ? "Mengunggah..." : "Tambah Foto"}
                  </Button>
                  <p className="text-[11px] text-slate-400 mt-1">Hanya gambar, maks. 2 MB per foto.</p>
                </>
              )}
              <div className="flex flex-wrap gap-3 mt-3">
                {(form.photos || []).length === 0 && <span className="text-xs text-slate-400">Belum ada foto.</span>}
                {(form.photos || []).map((p, i) => (
                  <div key={p.file_id} className="relative group">
                    <img
                      src={photoUrl(p)}
                      alt={p.filename}
                      className="w-20 h-20 object-cover rounded-lg border cursor-pointer"
                      onClick={() => setLightbox(photoUrl(p))}
                      data-testid={`form-photo-${i}`}
                    />
                    {isAdmin && (
                      <button type="button" onClick={() => removePhoto(i)} className="absolute -top-2 -right-2 bg-rose-600 text-white rounded-full p-0.5 shadow" data-testid={`remove-photo-${i}`}>
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Signatures */}
            <div className="col-span-2 border-t pt-4">
              <Label className="mb-2 block">Tanda Tangan Bukti Selesai</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SignaturePad label="Tanda Tangan Operator" value={form.operator_signature} onChange={(v) => setForm({ ...form, operator_signature: v })} testId="signature-operator-canvas" />
                <SignaturePad label="Tanda Tangan Teknisi" value={form.technician_signature} onChange={(v) => setForm({ ...form, technician_signature: v })} testId="signature-technician-canvas" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} data-testid="save-service-button" className="bg-sky-600 hover:bg-sky-500">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!gallery} onOpenChange={(v) => !v && setGallery(null)}>
        <DialogContent className="max-w-2xl" data-testid="photo-gallery-dialog">
          <DialogHeader><DialogTitle>Foto Servis — {gallery?.machine_name}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[70vh] overflow-y-auto">
            {(gallery?.photos || []).map((p, i) => (
              <img
                key={p.file_id}
                src={photoUrl(p)}
                alt={p.filename}
                className="w-full h-32 object-cover rounded-lg border cursor-pointer hover:opacity-90"
                onClick={() => setLightbox(photoUrl(p))}
                data-testid={`gallery-photo-${i}`}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {lightbox && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4" onClick={() => setLightbox(null)} data-testid="photo-lightbox">
          <img src={lightbox} alt="pratinjau" className="max-w-full max-h-[90vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
          <button className="absolute top-4 right-4 bg-white/90 rounded-full p-1.5" onClick={() => setLightbox(null)}><X className="w-5 h-5" /></button>
        </div>
      )}

      <AlertDialog open={!!delId} onOpenChange={(v) => !v && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus catatan servis ini?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={doDelete} className="bg-rose-600 hover:bg-rose-500">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
