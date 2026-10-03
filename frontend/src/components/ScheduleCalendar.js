import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";

const DAYS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const ymd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

// readable text color (black/white) for a given hex bg
const textColorFor = (hex) => {
  if (!hex || hex[0] !== "#") return "#fff";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#111827" : "#ffffff";
};

export default function ScheduleCalendar({ schedules, isAdmin, onPickDate, onOpenSchedule }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); });
  const [expandDay, setExpandDay] = useState(null);

  const todayStr = ymd(new Date());

  const byDate = {};
  schedules.forEach((s) => {
    const key = (s.due_date || "").slice(0, 10);
    if (!key) return;
    (byDate[key] = byDate[key] || []).push(s);
  });

  const isOverdue = (s) => s.status !== "selesai" && new Date(s.due_date) < new Date(new Date().toDateString());

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => setCursor(new Date(year, month - 1, 1));
  const nextMonth = () => setCursor(new Date(year, month + 1, 1));
  const goToday = () => { const d = new Date(); setCursor(new Date(d.getFullYear(), d.getMonth(), 1)); };

  return (
    <div data-testid="schedule-calendar">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} data-testid="calendar-prev-month"><ChevronLeft className="w-4 h-4" /></Button>
          <h3 className="font-heading text-xl font-bold uppercase tracking-tight min-w-[200px] text-center" data-testid="calendar-month-label">
            {MONTHS[month]} {year}
          </h3>
          <Button variant="outline" size="icon" onClick={nextMonth} data-testid="calendar-next-month"><ChevronRight className="w-4 h-4" /></Button>
        </div>
        <Button variant="outline" onClick={goToday} data-testid="calendar-today-button">Hari Ini</Button>
      </div>

      <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 min-w-[640px]">
        {DAYS.map((d) => (
          <div key={d} className="bg-slate-100 dark:bg-slate-900 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 py-2">{d}</div>
        ))}
        {cells.map((date, idx) => {
          if (!date) return <div key={idx} className="bg-slate-50 dark:bg-slate-950/40 min-h-[104px]" />;
          const key = ymd(date);
          const list = byDate[key] || [];
          const isToday = key === todayStr;
          const shown = list.slice(0, 3);
          const extra = list.length - shown.length;
          return (
            <div
              key={idx}
              className={`bg-white dark:bg-slate-950 min-h-[104px] p-1.5 flex flex-col ${isAdmin ? "cursor-pointer hover:bg-sky-50 dark:hover:bg-slate-900" : ""}`}
              onClick={() => isAdmin && onPickDate && onPickDate(key)}
              data-testid={`calendar-day-${key}`}
            >
              <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-sky-600 text-white" : "text-slate-500"}`}>
                {date.getDate()}
              </div>
              <div className="space-y-1 flex-1">
                {shown.map((s) => {
                  const color = s.color || "#0284C7";
                  const over = isOverdue(s);
                  return (
                    <button
                      key={s.id}
                      onClick={(e) => { e.stopPropagation(); onOpenSchedule && onOpenSchedule(s); }}
                      style={{ backgroundColor: color, color: textColorFor(color) }}
                      className="w-full text-left text-[11px] leading-tight rounded px-1.5 py-1 truncate flex items-center gap-1 hover:opacity-90"
                      data-testid={`calendar-event-${s.id}`}
                      title={`${s.machine_name} — ${s.maintenance_type}`}
                    >
                      {over && <AlertTriangle className="w-3 h-3 shrink-0" />}
                      <span className="truncate">{s.machine_name} · {s.maintenance_type}</span>
                    </button>
                  );
                })}
                {extra > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setExpandDay(key); }}
                    className="w-full text-left text-[11px] text-sky-600 font-semibold px-1.5 hover:underline"
                    data-testid={`calendar-more-${key}`}
                  >
                    +{extra} lainnya
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-4 text-xs text-slate-500 flex-wrap">
        <span className="font-semibold uppercase tracking-wider">Keterangan:</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-sky-600" /> Warna label = warna pilihan jadwal</span>
        <span className="inline-flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-rose-600" /> Jatuh tempo terlewat</span>
      </div>

      {expandDay && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setExpandDay(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-xl p-5 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()} data-testid="calendar-day-popup">
            <h4 className="font-heading font-bold uppercase mb-3">Jadwal {expandDay}</h4>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {(byDate[expandDay] || []).map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setExpandDay(null); onOpenSchedule && onOpenSchedule(s); }}
                  style={{ borderColor: s.color || "#0284C7" }}
                  className="w-full text-left border-l-4 bg-slate-50 dark:bg-slate-950 rounded px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800"
                  data-testid={`calendar-popup-event-${s.id}`}
                >
                  <div className="font-semibold text-sm">{s.machine_name}</div>
                  <div className="text-xs text-slate-500">{s.maintenance_type} · {s.technician_name || "-"}</div>
                </button>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4" onClick={() => setExpandDay(null)}>Tutup</Button>
          </div>
        </div>
      )}
    </div>
  );
}
