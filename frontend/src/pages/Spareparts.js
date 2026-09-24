import React, { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import { formatRupiah, HIDDEN } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const empty = {
  code: "", name: "", category: "", stock: 0, min_stock: 0, unit: "pcs", location: "", price: 0,
};

export default function Spareparts() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [delId, setDelId] = useState(null);

  const load = () => api.get("/spareparts").then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const openNew = () => { setForm(empty); setEditId(null); setOpen(true); };
  const openEdit = (m) => { setForm({ ...empty, ...m }); setEditId(m.id); setOpen(true); };

  const save = async () => {
    const payload = {
      ...form,
      stock: Number(form.stock), min_stock: Number(form.min_stock), price: Number(form.price),
    };
    try {
      if (editId) { await api.put(`/spareparts/${editId}`, payload); toast.success("Sparepart diperbarui"); }
      else { await api.post("/spareparts", payload); toast.success("Sparepart ditambahkan"); }
      setOpen(false); load();
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  const doDelete = async () => {
    try { await api.delete(`/spareparts/${delId}`); toast.success("Sparepart dihapus"); setDelId(null); load(); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  const low = (i) => (i.stock ?? 0) <= (i.min_stock ?? 0);

  return (
    <div>
      <PageHeader title="Manajemen Sparepart" subtitle="Inventaris suku cadang & stok.">
        {isAdmin && (
          <Button onClick={openNew} data-testid="add-sparepart-button" className="bg-sky-600 hover:bg-sky-500">
            <Plus className="w-4 h-4 mr-2" /> Tambah Sparepart
          </Button>
        )}
      </PageHeader>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table data-testid="spareparts-table">
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama</TableHead>
                <TableHead>Kategori</TableHead>
                <TableHead>Stok</TableHead>
                <TableHead>Min</TableHead>
                <TableHead>Satuan</TableHead>
                <TableHead>Lokasi</TableHead>
                {isAdmin && <TableHead>Harga</TableHead>}
                {isAdmin && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow><TableCell colSpan={isAdmin ? 9 : 7} className="text-center text-slate-400 py-8">Belum ada sparepart.</TableCell></TableRow>
              )}
              {items.map((i) => (
                <TableRow key={i.id} data-testid={`sparepart-row-${i.id}`}>
                  <TableCell className="font-mono text-xs">{i.code}</TableCell>
                  <TableCell className="font-semibold">{i.name}</TableCell>
                  <TableCell>{i.category || "-"}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5 font-bold">
                      {i.stock}
                      {low(i) && (
                        <Badge variant="outline" className="bg-rose-100 text-rose-800 border-rose-300 text-[10px]" data-testid={`lowstock-${i.id}`}>
                          <AlertTriangle className="w-3 h-3 mr-1" /> Menipis
                        </Badge>
                      )}
                    </span>
                  </TableCell>
                  <TableCell>{i.min_stock}</TableCell>
                  <TableCell>{i.unit}</TableCell>
                  <TableCell>{i.location || "-"}</TableCell>
                  {isAdmin && <TableCell className="font-mono">{formatRupiah(i.price)}</TableCell>}
                  {isAdmin && (
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(i)} data-testid={`edit-sparepart-${i.id}`}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDelId(i.id)} data-testid={`delete-sparepart-${i.id}`}><Trash2 className="w-4 h-4 text-rose-600" /></Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {!isAdmin && (
        <p className="text-xs text-slate-400 mt-3">* Informasi harga hanya dapat dilihat oleh Administrator ({HIDDEN}).</p>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editId ? "Edit Sparepart" : "Tambah Sparepart"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div><Label>Kode</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} data-testid="sparepart-code-input" /></div>
            <div><Label>Nama</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="sparepart-name-input" /></div>
            <div><Label>Kategori</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <div><Label>Satuan</Label><Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
            <div><Label>Stok</Label><Input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} data-testid="sparepart-stock-input" /></div>
            <div><Label>Stok Minimum</Label><Input type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} /></div>
            <div><Label>Lokasi Rak</Label><Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></div>
            <div><Label>Harga (Rp)</Label><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} data-testid="sparepart-price-input" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} data-testid="save-sparepart-button" className="bg-sky-600 hover:bg-sky-500">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delId} onOpenChange={(v) => !v && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus sparepart ini?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={doDelete} className="bg-rose-600 hover:bg-rose-500">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
