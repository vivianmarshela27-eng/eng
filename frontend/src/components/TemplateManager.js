import React, { useState } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, ClipboardList } from "lucide-react";
import { toast } from "sonner";

const emptyTpl = { name: "", machine_type: "", items: [] };
const emptyItem = { item: "", sub_item: "", unit: "", std_min: "", std_max: "" };

export default function TemplateManager({ open, onOpenChange, templates, onChanged }) {
  const [editing, setEditing] = useState(null); // null=list, else template object
  const [form, setForm] = useState(emptyTpl);

  const startNew = () => { setForm(emptyTpl); setEditing("new"); };
  const startEdit = (t) => { setForm({ ...t, items: t.items.map((i) => ({ ...emptyItem, ...i })) }); setEditing(t.id); };
  const backToList = () => { setEditing(null); };

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, { ...emptyItem }] }));
  const updItem = (idx, key, val) => setForm((f) => ({ ...f, items: f.items.map((it, i) => i === idx ? { ...it, [key]: val } : it) }));
  const delItem = (idx) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const save = async () => {
    if (!form.name.trim()) { toast.error("Nama template wajib diisi"); return; }
    try {
      if (editing === "new") await api.post("/checksheet-templates", form);
      else await api.put(`/checksheet-templates/${editing}`, form);
      toast.success("Template disimpan");
      onChanged && onChanged();
      backToList();
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  const remove = async (id) => {
    try { await api.delete(`/checksheet-templates/${id}`); toast.success("Template dihapus"); onChanged && onChanged(); }
    catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" data-testid="template-manager-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2"><ClipboardList className="w-5 h-5" /> Template Checksheet</DialogTitle>
        </DialogHeader>

        {editing === null ? (
          <div className="space-y-3">
            <Button onClick={startNew} data-testid="template-add-button" className="bg-sky-600 hover:bg-sky-500"><Plus className="w-4 h-4 mr-2" /> Template Baru</Button>
            <div className="divide-y border rounded-lg">
              {templates.length === 0 && <div className="p-4 text-center text-slate-400">Belum ada template.</div>}
              {templates.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3" data-testid={`template-row-${t.id}`}>
                  <div>
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.machine_type || "Umum"} · {t.items.length} item</div>
                  </div>
                  <div>
                    <Button variant="ghost" size="icon" onClick={() => startEdit(t)} data-testid={`template-edit-${t.id}`}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => remove(t.id)} data-testid={`template-delete-${t.id}`}><Trash2 className="w-4 h-4 text-rose-600" /></Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <Label>Nama Template</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="template-name-input" />
              </div>
              <div>
                <Label>Tipe/Jenis Mesin</Label>
                <Input value={form.machine_type} onChange={(e) => setForm({ ...form, machine_type: e.target.value })} placeholder="mis. Kompresor Udara" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Item Standar</Label>
              <Button variant="outline" size="sm" onClick={addItem} data-testid="template-add-item"><Plus className="w-4 h-4 mr-1" /> Item</Button>
            </div>
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-800 text-xs uppercase text-slate-500">
                  <tr><th className="p-2 text-left min-w-[180px]">Item</th><th className="p-2 text-left min-w-[160px]">Sub Item</th><th className="p-2 text-left w-20">Satuan</th><th className="p-2 text-left w-16">Min</th><th className="p-2 text-left w-16">Max</th><th className="p-2 w-10"></th></tr>
                </thead>
                <tbody>
                  {form.items.length === 0 && <tr><td colSpan={6} className="text-center text-slate-400 py-4">Tambah item standar.</td></tr>}
                  {form.items.map((it, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2"><Input value={it.item} onChange={(e) => updItem(idx, "item", e.target.value)} className="h-9" data-testid={`template-item-${idx}`} /></td>
                      <td className="p-2"><Input value={it.sub_item} onChange={(e) => updItem(idx, "sub_item", e.target.value)} className="h-9" data-testid={`template-subitem-${idx}`} /></td>
                      <td className="p-2"><Input value={it.unit} onChange={(e) => updItem(idx, "unit", e.target.value)} className="h-9" /></td>
                      <td className="p-2"><Input value={it.std_min} onChange={(e) => updItem(idx, "std_min", e.target.value)} className="h-9" /></td>
                      <td className="p-2"><Input value={it.std_max} onChange={(e) => updItem(idx, "std_max", e.target.value)} className="h-9" /></td>
                      <td className="p-2"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => delItem(idx)}><Trash2 className="w-3.5 h-3.5 text-rose-600" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={backToList}>Kembali</Button>
              <Button onClick={save} data-testid="template-save-button" className="bg-sky-600 hover:bg-sky-500">Simpan Template</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
