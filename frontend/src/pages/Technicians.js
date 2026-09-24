import React, { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Phone } from "lucide-react";
import { toast } from "sonner";

const empty = { name: "", specialty: "", phone: "", status: "tersedia" };

export default function Technicians() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [delId, setDelId] = useState(null);

  const load = () => api.get("/technicians").then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(empty); setEditId(null); setOpen(true); };
  const openEdit = (m) => { setForm({ ...empty, ...m }); setEditId(m.id); setOpen(true); };

  const save = async () => {
    try {
      if (editId) { await api.put(`/technicians/${editId}`, form); toast.success("Teknisi diperbarui"); }
      else { await api.post("/technicians", form); toast.success("Teknisi ditambahkan"); }
      setOpen(false); load();
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  const doDelete = async () => {
    try { await api.delete(`/technicians/${delId}`); toast.success("Teknisi dihapus"); setDelId(null); load(); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  return (
    <div>
      <PageHeader title="Manajemen Teknisi" subtitle="Data teknisi & spesialisasi.">
        {isAdmin && (
          <Button onClick={openNew} data-testid="add-technician-button" className="bg-sky-600 hover:bg-sky-500">
            <Plus className="w-4 h-4 mr-2" /> Tambah Teknisi
          </Button>
        )}
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.length === 0 && <p className="text-slate-400">Belum ada teknisi.</p>}
        {items.map((t) => (
          <Card key={t.id} className="p-5" data-testid={`technician-card-${t.id}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-900 text-white flex items-center justify-center font-heading font-bold text-lg">
                  {t.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-xs text-slate-500">{t.specialty}</div>
                </div>
              </div>
              <StatusBadge status={t.status} />
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
              <Phone className="w-4 h-4" /> {t.phone || "-"}
            </div>
            {isAdmin && (
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(t)} data-testid={`edit-technician-${t.id}`}>
                  <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => setDelId(t.id)} data-testid={`delete-technician-${t.id}`} className="text-rose-600">
                  <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Edit Teknisi" : "Tambah Teknisi"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nama</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="technician-name-input" /></div>
            <div><Label>Spesialisasi</Label><Input value={form.specialty} onChange={(e) => setForm({ ...form, specialty: e.target.value })} data-testid="technician-specialty-input" /></div>
            <div><Label>No. Kontak</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tersedia">Tersedia</SelectItem>
                  <SelectItem value="bertugas">Bertugas</SelectItem>
                  <SelectItem value="cuti">Cuti</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} data-testid="save-technician-button" className="bg-sky-600 hover:bg-sky-500">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delId} onOpenChange={(v) => !v && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus teknisi ini?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={doDelete} className="bg-rose-600 hover:bg-rose-500">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
