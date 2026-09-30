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
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const empty = {
  machine_id: "", machine_name: "", maintenance_type: "", due_date: "",
  frequency: "bulanan", technician_id: "", technician_name: "", status: "terjadwal", notes: "",
};

export default function Schedules() {
  const { isAdmin } = useAuth();
  const [items, setItems] = useState([]);
  const [machines, setMachines] = useState([]);
  const [techs, setTechs] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [delId, setDelId] = useState(null);

  const load = () => {
    api.get("/schedules").then((r) => setItems(r.data)).catch(() => {});
  };
  useEffect(() => {
    load();
    api.get("/machines").then((r) => setMachines(r.data)).catch(() => {});
    api.get("/technicians").then((r) => setTechs(r.data)).catch(() => {});
  }, []);

  const openNew = () => { setForm(empty); setEditId(null); setOpen(true); };
  const openEdit = (m) => { setForm({ ...empty, ...m }); setEditId(m.id); setOpen(true); };

  const save = async () => {
    const machine = machines.find((x) => x.id === form.machine_id);
    const tech = techs.find((x) => x.id === form.technician_id);
    const payload = {
      ...form,
      machine_name: machine?.name || form.machine_name,
      technician_name: tech?.name || "",
    };
    try {
      if (editId) { await api.put(`/schedules/${editId}`, payload); toast.success("Jadwal diperbarui"); }
      else { await api.post("/schedules", payload); toast.success("Jadwal ditambahkan"); }
      setOpen(false); load();
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  const doDelete = async () => {
    try { await api.delete(`/schedules/${delId}`); toast.success("Jadwal dihapus"); setDelId(null); load(); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  const isOverdue = (s) => {
    if (s.status === "selesai") return false;
    return new Date(s.due_date) < new Date(new Date().toDateString());
  };

  return (
    <div>
      <PageHeader title="Jadwal Pemeliharaan" subtitle="Jadwal preventif per mesin.">
        {isAdmin && (
          <Button onClick={openNew} data-testid="add-schedule-button" className="bg-sky-600 hover:bg-sky-500">
            <Plus className="w-4 h-4 mr-2" /> Tambah Jadwal
          </Button>
        )}
      </PageHeader>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table data-testid="schedules-table">
            <TableHeader>
              <TableRow>
                <TableHead>Mesin</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Jatuh Tempo</TableHead>
                <TableHead>Frekuensi</TableHead>
                <TableHead>Teknisi</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 && (
                <TableRow><TableCell colSpan={isAdmin ? 7 : 6} className="text-center text-slate-400 py-8">Belum ada jadwal.</TableCell></TableRow>
              )}
              {items.map((s) => (
                <TableRow key={s.id} className={isOverdue(s) ? "bg-rose-50/60 dark:bg-rose-950/20" : ""} data-testid={`schedule-row-${s.id}`}>
                  <TableCell className="font-semibold">{s.machine_name}</TableCell>
                  <TableCell>{s.maintenance_type}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="inline-flex items-center gap-1.5">
                      {isOverdue(s) && <AlertTriangle className="w-4 h-4 text-rose-600" />}
                      {formatDate(s.due_date)}
                    </span>
                  </TableCell>
                  <TableCell className="capitalize">{s.frequency}</TableCell>
                  <TableCell>{s.technician_name || "-"}</TableCell>
                  <TableCell><StatusBadge status={isOverdue(s) ? "jatuh_tempo" : s.status} /></TableCell>
                  {isAdmin && (
                    <TableCell className="text-right whitespace-nowrap">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(s)} data-testid={`edit-schedule-${s.id}`}><Pencil className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => setDelId(s.id)} data-testid={`delete-schedule-${s.id}`}><Trash2 className="w-4 h-4 text-rose-600" /></Button>
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
          <DialogHeader><DialogTitle>{editId ? "Edit Jadwal" : "Tambah Jadwal"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label>Mesin</Label>
              <Select value={form.machine_id} onValueChange={(v) => setForm({ ...form, machine_id: v })}>
                <SelectTrigger data-testid="schedule-machine-select"><SelectValue placeholder="Pilih mesin" /></SelectTrigger>
                <SelectContent>{machines.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Jenis Pemeliharaan</Label>
              <Input value={form.maintenance_type} onChange={(e) => setForm({ ...form, maintenance_type: e.target.value })} data-testid="schedule-type-input" />
            </div>
            <div>
              <Label>Tanggal Jatuh Tempo</Label>
              <Input type="date" value={form.due_date?.slice(0, 10) || ""} onChange={(e) => setForm({ ...form, due_date: e.target.value })} data-testid="schedule-date-input" />
            </div>
            <div>
              <Label>Frekuensi</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="harian">Harian</SelectItem>
                  <SelectItem value="mingguan">Mingguan</SelectItem>
                  <SelectItem value="bulanan">Bulanan</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Teknisi</Label>
              <Select value={form.technician_id} onValueChange={(v) => setForm({ ...form, technician_id: v })}>
                <SelectTrigger><SelectValue placeholder="Pilih teknisi" /></SelectTrigger>
                <SelectContent>{techs.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="terjadwal">Terjadwal</SelectItem>
                  <SelectItem value="jatuh_tempo">Jatuh Tempo</SelectItem>
                  <SelectItem value="selesai">Selesai</SelectItem>
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
            <Button onClick={save} data-testid="save-schedule-button" className="bg-sky-600 hover:bg-sky-500">Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delId} onOpenChange={(v) => !v && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus jadwal ini?</AlertDialogTitle><AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={doDelete} className="bg-rose-600 hover:bg-rose-500">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
