import React, { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

const empty = {
  code: "",
  name: "",
  type: "",
  location: "",
  purchase_date: "",
  status: "operasional",
  notes: "",
};

export default function Machines() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [delId, setDelId] = useState(null);

  const load = () => api.get("/machines").then((r) => setItems(r.data)).catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const openNew = () => {
    setForm(empty);
    setEditId(null);
    setOpen(true);
  };
  const openEdit = (m) => {
    setForm({ ...empty, ...m });
    setEditId(m.id);
    setOpen(true);
  };

  const save = async () => {
    try {
      if (editId) {
        await api.put(`/machines/${editId}`, form);
        toast.success("Mesin diperbarui");
      } else {
        await api.post("/machines", form);
        toast.success("Mesin ditambahkan");
      }
      setOpen(false);
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  const doDelete = async () => {
    try {
      await api.delete(`/machines/${delId}`);
      toast.success("Mesin dihapus");
      setDelId(null);
      load();
    } catch (e) {
      toast.error(formatApiErrorDetail(e.response?.data?.detail));
    }
  };

  return (
    <div>
      <PageHeader title="Manajemen Mesin" subtitle="Daftar aset mesin produksi.">
        {isAdmin && (
          <Button onClick={openNew} data-testid="add-machine-button" className="bg-sky-600 hover:bg-sky-500">
            <Plus className="w-4 h-4 mr-2" /> Tambah Mesin
          </Button>
        )}
      </PageHeader>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table data-testid="machines-table">
            <TableHeader>
              <TableRow>
                <TableHead>Kode</TableHead>
                <TableHead>Nama Mesin</TableHead>
                <TableHead>Tipe</TableHead>
                <TableHead>Lokasi</TableHead>
                <TableHead>Tgl Beli</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-slate-400 py-8">
                    Belum ada data mesin.
                  </TableCell>
                </TableRow>
              )}
              {items.map((m) => (
                <TableRow key={m.id} data-testid={`machine-row-${m.id}`}>
                  <TableCell className="font-mono text-xs">{m.code}</TableCell>
                  <TableCell className="font-semibold">{m.name}</TableCell>
                  <TableCell>{m.type || "-"}</TableCell>
                  <TableCell>{m.location || "-"}</TableCell>
                  <TableCell>{formatDate(m.purchase_date)}</TableCell>
                  <TableCell>
                    <StatusBadge status={m.status} />
                  </TableCell>
                  {isAdmin && (
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(m)} data-testid={`edit-machine-${m.id}`}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDelId(m.id)} data-testid={`delete-machine-${m.id}`}>
                        <Trash2 className="w-4 h-4 text-rose-600" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editId ? "Edit Mesin" : "Tambah Mesin"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Kode Mesin</Label>
              <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} data-testid="machine-code-input" />
            </div>
            <div>
              <Label>Nama Mesin</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="machine-name-input" />
            </div>
            <div>
              <Label>Tipe / Model</Label>
              <Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
            </div>
            <div>
              <Label>Lokasi</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
            <div>
              <Label>Tanggal Pembelian</Label>
              <Input type="date" value={form.purchase_date?.slice(0, 10) || ""} onChange={(e) => setForm({ ...form, purchase_date: e.target.value })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger data-testid="machine-status-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="operasional">Operasional</SelectItem>
                  <SelectItem value="perawatan">Dalam Perawatan</SelectItem>
                  <SelectItem value="rusak">Rusak / Perbaikan</SelectItem>
                  <SelectItem value="nonaktif">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Catatan</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} data-testid="save-machine-button" className="bg-sky-600 hover:bg-sky-500">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delId} onOpenChange={(v) => !v && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus mesin ini?</AlertDialogTitle>
            <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} data-testid="confirm-delete-machine" className="bg-rose-600 hover:bg-rose-500">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
