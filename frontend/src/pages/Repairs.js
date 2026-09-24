import React, { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import SignaturePad from "@/components/SignaturePad";
import { formatRupiah, formatDate, HIDDEN } from "@/lib/format";
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
import { Plus, Pencil, Trash2, FileDown, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const empty = {
  machine_id: "", machine_name: "", date: new Date().toISOString().slice(0, 10),
  service_type: "preventif", problem: "", action: "", technician_id: "", technician_name: "",
  operator_name: "", used_parts: [], cost: 0, status: "selesai",
  operator_signature: "", technician_signature: "",
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

  const load = () => api.get("/services").then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => {
    load();
    api.get("/machines").then((r) => setMachines(r.data)).catch(() => {});
    api.get("/technicians").then((r) => setTechs(r.data)).catch(() => {});
    api.get("/spareparts").then((r) => setParts(r.data)).catch(() => {});
  }, []);

  const openNew = () => { setForm(empty); setEditId(null); setOpen(true); };
  const openEdit = (m) => { setForm({ ...empty, ...m, used_parts: m.used_parts || [] }); setEditId(m.id); setOpen(true); };

  const addPart = () => {
    const p = parts.find((x) => x.id === partSel);
    if (!p) return;
    setForm({ ...form, used_parts: [...form.used_parts, { sparepart_id: p.id, name: p.name, qty: Number(partQty) }] });
    setPartSel(""); setPartQty(1);
  };
  const removePart = (idx) => setForm({ ...form, used_parts: form.used_parts.filter((_, i) => i !== idx) });

  const save = async () => {
    const machine = machines.find((x) => x.id === form.machine_id);
    const tech = techs.find((x) => x.id === form.technician_id);
    const payload = {
      ...form, cost: Number(form.cost),
      machine_name: machine?.name || form.machine_name,
      technician_name: tech?.name || form.technician_name,
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
                {isAdmin && <TableHead>Biaya</TableHead>}
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow><TableCell colSpan={isAdmin ? 8 : 7} className="text-center text-slate-400 py-8">Belum ada catatan servis.</TableCell></TableRow>
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
                  {isAdmin && <TableCell className="font-mono">{formatRupiah(s.cost)}</TableCell>}
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

      {!isAdmin && <p className="text-xs text-slate-400 mt-3">* Informasi biaya servis hanya dapat dilihat oleh Administrator ({HIDDEN}).</p>}

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
            <div>
              <Label>Teknisi</Label>
              <Select value={form.technician_id} onValueChange={(v) => setForm({ ...form, technician_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih teknisi" /></SelectTrigger>
                <SelectContent>{techs.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Nama Operator</Label><Input value={form.operator_name} onChange={(e) => setForm({ ...form, operator_name: e.target.value })} data-testid="service-operator-input" /></div>
            <div><Label>Biaya (Rp)</Label><Input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} data-testid="service-cost-input" /></div>

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

      <AlertDialog open={!!delId} onOpenChange={(v) => !v && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus catatan servis ini?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={doDelete} className="bg-rose-600 hover:bg-rose-500">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
