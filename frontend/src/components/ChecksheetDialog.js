import React, { useEffect, useState } from "react";
import api, { formatApiErrorDetail } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SignaturePad from "@/components/SignaturePad";
import { generateChecksheetPDF } from "@/lib/pdf";
import { formatDate } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, ArrowUp, ArrowDown, FileDown, CheckCircle2, XCircle, CornerDownRight } from "lucide-react";
import { toast } from "sonner";

const emptyItem = { item: "", is_sub: false, value: "", unit: "", std_min: "", std_max: "", result: "", note: "" };

// Suggest OK/Tidak OK when a numeric value falls outside the standard range.
function suggestResult(it) {
  const v = parseFloat(it.value);
  if (isNaN(v)) return it.result;
  const min = it.std_min !== "" ? parseFloat(it.std_min) : null;
  const max = it.std_max !== "" ? parseFloat(it.std_max) : null;
  if (min === null && max === null) return it.result;
  if ((min !== null && v < min) || (max !== null && v > max)) return "not_ok";
  return "ok";
}

export default function ChecksheetDialog({ open, onOpenChange, schedule, templates, isAdmin, onSaved }) {
  const [items, setItems] = useState([]);
  const [operatorName, setOperatorName] = useState("");
  const [technicianName, setTechnicianName] = useState("");
  const [opSig, setOpSig] = useState("");
  const [techSig, setTechSig] = useState("");
  const [note, setNote] = useState("");
  const [tplId, setTplId] = useState("");

  useEffect(() => {
    if (!open || !schedule) return;
    const cs = schedule.checksheet || {};
    setItems((cs.items || []).map((i) => ({ ...emptyItem, ...i })));
    setOperatorName(cs.operator_name || "");
    setTechnicianName(cs.technician_name || schedule.technician_name || "");
    setOpSig(cs.operator_signature || "");
    setTechSig(cs.technician_signature || "");
    setNote(cs.note || "");
    setTplId("");
  }, [open, schedule]);

  if (!schedule) return null;

  const loadTemplate = (id) => {
    setTplId(id);
    const tpl = templates.find((t) => t.id === id);
    if (!tpl) return;
    setItems(tpl.items.map((i) => ({ ...emptyItem, item: i.item, is_sub: !!i.is_sub, unit: i.unit || "", std_min: i.std_min || "", std_max: i.std_max || "" })));
    toast.success("Item template dimuat");
  };

  const update = (idx, key, val) => {
    setItems((prev) => prev.map((it, i) => {
      if (i !== idx) return it;
      const next = { ...it, [key]: val };
      if (key === "value") next.result = suggestResult(next);
      return next;
    }));
  };
  const addRow = () => setItems((p) => [...p, { ...emptyItem }]);
  const addSubRow = () => setItems((p) => [...p, { ...emptyItem, is_sub: true }]);
  const removeRow = (idx) => setItems((p) => p.filter((_, i) => i !== idx));
  const moveRow = (idx, dir) => setItems((p) => {
    const arr = [...p];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return arr;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    return arr;
  });

  const okCount = items.filter((i) => i.result === "ok").length;
  const notOkCount = items.filter((i) => i.result === "not_ok").length;

  // Running numbers: only main items are numbered, sub items are blank.
  let _n = 0;
  const numbers = items.map((it) => (it.is_sub ? "" : ++_n));

  const buildData = () => ({
    items, operator_name: operatorName, technician_name: technicianName,
    operator_signature: opSig, technician_signature: techSig, note,
  });

  const save = async () => {
    try {
      await api.put(`/schedules/${schedule.id}/checksheet`, buildData());
      toast.success("Checksheet disimpan");
      onSaved && onSaved();
      onOpenChange(false);
    } catch (e) { toast.error(formatApiErrorDetail(e.response?.data?.detail)); }
  };

  const printPDF = () => generateChecksheetPDF({ ...schedule, checksheet: buildData() });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto" data-testid="checksheet-dialog">
        <DialogHeader>
          <DialogTitle className="font-heading">
            Checksheet — {schedule.machine_name}
            <span className="block text-sm font-normal text-slate-500 mt-1">
              {schedule.maintenance_type} · Jatuh tempo {formatDate(schedule.due_date)}
            </span>
          </DialogTitle>
        </DialogHeader>

        {isAdmin && (
          <div className="flex flex-wrap items-end gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border">
            <div className="min-w-[240px]">
              <Label className="text-xs">Muat dari Template</Label>
              <Select value={tplId} onValueChange={loadTemplate}>
                <SelectTrigger data-testid="checksheet-template-select"><SelectValue placeholder="Pilih template" /></SelectTrigger>
                <SelectContent>{templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={addRow} data-testid="checksheet-add-row"><Plus className="w-4 h-4 mr-1" /> Tambah Item</Button>
            <Button variant="outline" onClick={addSubRow} data-testid="checksheet-add-subrow"><CornerDownRight className="w-4 h-4 mr-1" /> Tambah Sub Item</Button>
          </div>
        )}

        <div className="flex items-center gap-4 text-sm">
          <span className="inline-flex items-center gap-1.5 text-emerald-600 font-semibold" data-testid="checksheet-ok-count"><CheckCircle2 className="w-4 h-4" /> {okCount} OK</span>
          <span className="inline-flex items-center gap-1.5 text-rose-600 font-semibold" data-testid="checksheet-notok-count"><XCircle className="w-4 h-4" /> {notOkCount} Tidak OK</span>
          <span className="text-slate-400">dari {items.length} item</span>
        </div>

        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 dark:bg-slate-800 text-xs uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-2 text-left w-8">#</th>
                <th className="p-2 text-left min-w-[220px]">Item Pemeriksaan</th>
                <th className="p-2 text-left w-24">Nilai</th>
                <th className="p-2 text-left w-20">Satuan</th>
                <th className="p-2 text-left w-32">Standar (min-max)</th>
                <th className="p-2 text-left w-28">Hasil</th>
                <th className="p-2 text-left min-w-[140px]">Catatan</th>
                {isAdmin && <th className="p-2 w-24"></th>}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr><td colSpan={isAdmin ? 8 : 7} className="text-center text-slate-400 py-6">Belum ada item. {isAdmin ? "Muat template atau tambah item." : ""}</td></tr>
              )}
              {items.map((it, idx) => (
                <tr key={idx} className={`border-t align-top ${it.is_sub ? "bg-slate-50/60 dark:bg-slate-900/40" : ""}`} data-testid={`checksheet-row-${idx}`}>
                  <td className="p-2 text-slate-400">{it.is_sub ? "" : numbers[idx]}</td>
                  <td className="p-2">
                    <div className={it.is_sub ? "flex items-center gap-1.5 pl-6" : ""}>
                      {it.is_sub && <CornerDownRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                      {isAdmin
                        ? <Input value={it.item} onChange={(e) => update(idx, "item", e.target.value)} className="h-9" placeholder={it.is_sub ? "Sub item" : ""} data-testid={`checksheet-item-${idx}`} />
                        : <span className={it.is_sub ? "text-slate-600 dark:text-slate-300" : "font-medium"}>{it.item || "-"}</span>}
                    </div>
                  </td>
                  <td className="p-2">
                    {isAdmin
                      ? <Input value={it.value} onChange={(e) => update(idx, "value", e.target.value)} className="h-9" data-testid={`checksheet-value-${idx}`} />
                      : <span>{it.value || "-"}</span>}
                  </td>
                  <td className="p-2">
                    {isAdmin ? <Input value={it.unit} onChange={(e) => update(idx, "unit", e.target.value)} className="h-9" /> : <span>{it.unit || "-"}</span>}
                  </td>
                  <td className="p-2">
                    {isAdmin ? (
                      <div className="flex items-center gap-1">
                        <Input value={it.std_min} onChange={(e) => update(idx, "std_min", e.target.value)} className="h-9 w-14" placeholder="min" />
                        <span className="text-slate-400">-</span>
                        <Input value={it.std_max} onChange={(e) => update(idx, "std_max", e.target.value)} className="h-9 w-14" placeholder="max" />
                      </div>
                    ) : <span>{(it.std_min || it.std_max) ? `${it.std_min || ""} - ${it.std_max || ""}` : "-"}</span>}
                  </td>
                  <td className="p-2">
                    {isAdmin ? (
                      <select
                        value={it.result}
                        onChange={(e) => update(idx, "result", e.target.value)}
                        data-testid={`checksheet-result-${idx}`}
                        className={`h-9 w-full rounded-md border px-2 text-sm font-medium ${it.result === "ok" ? "text-emerald-600 border-emerald-300" : it.result === "not_ok" ? "text-rose-600 border-rose-300" : "text-slate-500"}`}
                      >
                        <option value="">- pilih -</option>
                        <option value="ok">OK</option>
                        <option value="not_ok">Tidak OK</option>
                      </select>
                    ) : (
                      <span className={`font-semibold ${it.result === "ok" ? "text-emerald-600" : it.result === "not_ok" ? "text-rose-600" : "text-slate-400"}`}>
                        {it.result === "ok" ? "OK" : it.result === "not_ok" ? "Tidak OK" : "-"}
                      </span>
                    )}
                  </td>
                  <td className="p-2">
                    {isAdmin ? <Input value={it.note} onChange={(e) => update(idx, "note", e.target.value)} className="h-9" /> : <span>{it.note || "-"}</span>}
                  </td>
                  {isAdmin && (
                    <td className="p-2 whitespace-nowrap">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveRow(idx, -1)}><ArrowUp className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveRow(idx, 1)}><ArrowDown className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeRow(idx)} data-testid={`checksheet-remove-${idx}`}><Trash2 className="w-3.5 h-3.5 text-rose-600" /></Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 pt-2">
          <div>
            <Label className="text-xs">Nama Operator</Label>
            {isAdmin ? <Input value={operatorName} onChange={(e) => setOperatorName(e.target.value)} data-testid="checksheet-operator-name" /> : <div className="mt-1">{operatorName || "-"}</div>}
            <div className="mt-3"><SignaturePad label="Tanda Tangan Operator" value={opSig} onChange={isAdmin ? setOpSig : () => {}} testId="checksheet-operator-signature" /></div>
          </div>
          <div>
            <Label className="text-xs">Nama Teknisi</Label>
            {isAdmin ? <Input value={technicianName} onChange={(e) => setTechnicianName(e.target.value)} data-testid="checksheet-technician-name" /> : <div className="mt-1">{technicianName || "-"}</div>}
            <div className="mt-3"><SignaturePad label="Tanda Tangan Teknisi" value={techSig} onChange={isAdmin ? setTechSig : () => {}} testId="checksheet-technician-signature" /></div>
          </div>
        </div>

        <div className="pt-2">
          <Label className="text-xs">Catatan</Label>
          {isAdmin
            ? <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Catatan umum untuk keseluruhan pemeriksaan (opsional)" data-testid="checksheet-note" className="mt-1" />
            : <div className="mt-1 whitespace-pre-wrap text-sm border rounded-md p-3 bg-slate-50 dark:bg-slate-900 min-h-[3rem]" data-testid="checksheet-note-view">{note || "-"}</div>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={printPDF} data-testid="checksheet-pdf-button"><FileDown className="w-4 h-4 mr-2" /> Cetak BAP</Button>
          {isAdmin && <Button onClick={save} data-testid="checksheet-save-button" className="bg-sky-600 hover:bg-sky-500">Simpan Checksheet</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
