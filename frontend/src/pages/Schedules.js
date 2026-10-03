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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, AlertTriangle, CalendarDays, List } from "lucide-react";
import { toast } from "sonner";
import ScheduleCalendar from "@/components/ScheduleCalendar";

const COLORS = [
  { value: "#0284C7", label: "Biru" },
  { value: "#059669", label: "Hijau" },
  { value: "#D97706", label: "Oranye" },
  { value: "#E11D48", label: "Merah" },
  { value: "#7C3AED", label: "Ungu" },
  { value: "#0891B2", label: "Sian" },
  { value: "#CA8A04", label: "Emas" },
  { value: "#475569", label: "Abu" },
];

const empty = {
  machine_id: "", machine_name: "", maintenance_type: "", due_date: "",
  frequency: "bulanan", technician_id: "", technician_name: "", status: "terjadwal", notes: "", color: "#0284C7",
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
  const [view, setView] = useState(() => sessionStorage.getItem("schedule_view") || "calendar");
  const [detail, setDetail] = useState(null);

  const changeView = (v) => { if (!v) return; setView(v); sessionStorage.setItem("schedule_view", v); };

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
  const openForDate = (dateStr) => { setForm({ ...empty, due_date: dateStr }); setEditId(null); setOpen(true); };

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
        <div className="flex items-center gap-3">
          <Tabs value={view} onValueChange={changeView}>
            <TabsList data-testid="schedule-view-toggle">
              <TabsTrigger value="calendar" data-testid="view-calendar"><CalendarDays className="w-4 h-4 mr-1.5" /> Kalender</TabsTrigger>
              <TabsTrigger value="table" data-testid="view-table"><List className="w-4 h-4 mr-1.5" /> Tabel</TabsTrigger>
            </TabsList>
          </Tabs>
          {isAdmin && (
            <Button onClick={openNew} data-testid="add-schedule-button" className="bg-sky-600 hover:bg-sky-500">
              <Plus className="w-4 h-4 mr-2" /> Tambah Jadwal
            </Button>
          )}
        </div>
      </PageHeader>

      {view === "calendar" ? (
        <Card className="p-4 sm:p-6 overflow-x-auto">
          <ScheduleCalendar
            schedules={items}
            isAdmin={isAdmin}
            onPickDate={openForDate}
            onOpenSchedule={(s) => setDetail(s)}
          />
        </Card>
      ) : (
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
                  <TableCell className="font-semibold">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color || "#0284C7" }} />
                      {s.machine_name}
                    </span>
                  </TableCell>
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
      )}

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
              <Label>Warna Label Kalender</Label>
              <div className="flex flex-wrap gap-2 mt-1.5" data-testid="schedule-color-picker">
                {COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setForm({ ...form, color: c.value })}
                    title={c.label}
                    style={{ backgroundColor: c.value }}
                    className={`w-7 h-7 rounded-full transition-transform ${form.color === c.value ? "ring-2 ring-offset-2 ring-slate-900 dark:ring-white scale-110" : "hover:scale-105"}`}
                    data-testid={`color-${c.value.replace("#", "")}`}
                  />
                ))}
              </div>
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

      <Dialog open={!!detail} onOpenChange={(v) => !v && setDetail(null)}>
        <DialogContent className="max-w-md" data-testid="schedule-detail-dialog">
          <DialogHeader><DialogTitle>Detail Jadwal</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full" style={{ backgroundColor: detail.color || "#0284C7" }} />
                <span className="font-semibold text-base">{detail.machine_name}</span>
              </div>
              <div className="grid grid-cols-3 gap-1"><span className="text-slate-500 col-span-1">Jenis</span><span className="col-span-2 font-medium">{detail.maintenance_type}</span></div>
              <div className="grid grid-cols-3 gap-1"><span className="text-slate-500 col-span-1">Jatuh Tempo</span><span className="col-span-2 font-medium">{formatDate(detail.due_date)}</span></div>
              <div className="grid grid-cols-3 gap-1"><span className="text-slate-500 col-span-1">Frekuensi</span><span className="col-span-2 capitalize">{detail.frequency}</span></div>
              <div className="grid grid-cols-3 gap-1"><span className="text-slate-500 col-span-1">Teknisi</span><span className="col-span-2">{detail.technician_name || "-"}</span></div>
              <div className="grid grid-cols-3 gap-1"><span className="text-slate-500 col-span-1">Status</span><span className="col-span-2"><StatusBadge status={isOverdue(detail) ? "jatuh_tempo" : detail.status} /></span></div>
              {detail.notes && <div className="grid grid-cols-3 gap-1"><span className="text-slate-500 col-span-1">Catatan</span><span className="col-span-2 whitespace-pre-wrap">{detail.notes}</span></div>}
            </div>
          )}
          <DialogFooter>
            {isAdmin && detail && (
              <>
                <Button variant="outline" className="text-rose-600" onClick={() => { setDelId(detail.id); setDetail(null); }} data-testid="detail-delete-button"><Trash2 className="w-4 h-4 mr-1.5" /> Hapus</Button>
                <Button className="bg-sky-600 hover:bg-sky-500" onClick={() => { openEdit(detail); setDetail(null); }} data-testid="detail-edit-button"><Pencil className="w-4 h-4 mr-1.5" /> Ubah</Button>
              </>
            )}
            {!isAdmin && <Button variant="outline" onClick={() => setDetail(null)}>Tutup</Button>}
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
