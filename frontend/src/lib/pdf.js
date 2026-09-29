import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatRupiah, formatDate } from "@/lib/format";

const TYPE_LABEL = { preventif: "Pemeliharaan Preventif", perbaikan: "Perbaikan (Breakdown)" };

let _logoPromise;
function loadLogoDataUrl() {
  if (!_logoPromise) {
    _logoPromise = fetch("/logo.png")
      .then((r) => r.blob())
      .then((b) => new Promise((res) => {
        const fr = new FileReader();
        fr.onloadend = () => res(fr.result);
        fr.onerror = () => res(null);
        fr.readAsDataURL(b);
      }))
      .catch(() => null);
  }
  return _logoPromise;
}

// Berita Acara Pemeliharaan (BAP) for a single service record.
export async function generateServicePDF(sv, { isAdmin }) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Watermark logo (drawn first so content sits on top)
  const logo = await loadLogoDataUrl();
  if (logo) {
    try {
      const iw = 120, ih = 120;
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.06 }));
      doc.addImage(logo, "PNG", (w - iw) / 2, (h - ih) / 2, iw, ih);
      doc.restoreGraphicsState();
    } catch (e) {}
  }

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, w, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("BERITA ACARA PEMELIHARAAN (BAP)", 14, 13);
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.text("SATRIA ENGINEERING - Sistem Informasi Pemeliharaan Mesin", 14, 21);

  doc.setTextColor(0, 0, 0);
  let y = 40;
  const rows = [
    ["Mesin", sv.machine_name || "-"],
    ["Tanggal", formatDate(sv.date)],
    ["Jenis", TYPE_LABEL[sv.service_type] || sv.service_type],
    ["Teknisi", sv.technician_name || "-"],
    ["Operator", sv.operator_name || "-"],
    ["Deskripsi Masalah", sv.problem || "-"],
    ["Tindakan", sv.action || "-"],
    ["Status", sv.status === "selesai" ? "Selesai" : "Dalam Proses"],
  ];
  if (isAdmin) rows.push(["Biaya Servis", formatRupiah(sv.cost)]);

  autoTable(doc, {
    startY: y,
    head: [["Keterangan", "Detail"]],
    body: rows,
    theme: "grid",
    headStyles: { fillColor: [2, 132, 199] },
    columnStyles: { 0: { cellWidth: 55, fontStyle: "bold" } },
  });
  y = doc.lastAutoTable.finalY + 8;

  if ((sv.used_parts || []).length > 0) {
    autoTable(doc, {
      startY: y,
      head: [["Sparepart Digunakan", "Qty"]],
      body: sv.used_parts.map((p) => [p.name, String(p.qty)]),
      theme: "striped",
      headStyles: { fillColor: [71, 85, 105] },
    });
    y = doc.lastAutoTable.finalY + 8;
  }

  // Signatures
  y += 4;
  doc.setFontSize(10);
  doc.setFont(undefined, "bold");
  doc.text("Operator", 40, y, { align: "center" });
  doc.text("Teknisi", w - 55, y, { align: "center" });
  const sigY = y + 4;
  try {
    if (sv.operator_signature) doc.addImage(sv.operator_signature, "PNG", 15, sigY, 50, 22);
    if (sv.technician_signature) doc.addImage(sv.technician_signature, "PNG", w - 80, sigY, 50, 22);
  } catch (e) {}
  const lineY = sigY + 26;
  doc.setDrawColor(0);
  doc.line(15, lineY, 65, lineY);
  doc.line(w - 80, lineY, w - 30, lineY);
  doc.setFont(undefined, "normal");
  doc.setFontSize(9);
  doc.text(sv.operator_name || "( ................. )", 40, lineY + 5, { align: "center" });
  doc.text(sv.technician_name || "( ................. )", w - 55, lineY + 5, { align: "center" });

  doc.save(`BAP-${(sv.machine_name || "servis").replace(/\s+/g, "-")}-${formatDate(sv.date)}.pdf`);
}

// Berita Acara Checksheet Pemeliharaan for a schedule.
export async function generateChecksheetPDF(sch) {
  const cs = sch.checksheet || {};
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  const logo = await loadLogoDataUrl();
  if (logo) {
    try {
      const iw = 120, ih = 120;
      doc.saveGraphicsState();
      doc.setGState(new doc.GState({ opacity: 0.06 }));
      doc.addImage(logo, "PNG", (w - iw) / 2, (h - ih) / 2, iw, ih);
      doc.restoreGraphicsState();
    } catch (e) {}
  }

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, w, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont(undefined, "bold");
  doc.text("BERITA ACARA CHECKSHEET PEMELIHARAAN", 14, 12);
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.text("SATRIA ENGINEERING - Sistem Informasi Pemeliharaan Mesin", 14, 20);

  doc.setTextColor(0, 0, 0);
  const info = [
    ["Mesin", sch.machine_name || "-"],
    ["Jenis Pemeliharaan", sch.maintenance_type || "-"],
    ["Jatuh Tempo", formatDate(sch.due_date)],
    ["Teknisi", cs.technician_name || sch.technician_name || "-"],
    ["Operator", cs.operator_name || "-"],
  ];
  autoTable(doc, {
    startY: 34, body: info, theme: "plain",
    columnStyles: { 0: { cellWidth: 50, fontStyle: "bold" } }, styles: { fontSize: 9 },
  });
  let y = doc.lastAutoTable.finalY + 4;

  const RES = { ok: "OK", not_ok: "Tidak OK" };
  const items = cs.items || [];
  let _n = 0;
  autoTable(doc, {
    startY: y,
    head: [["No", "Item Pemeriksaan", "Nilai", "Satuan", "Standar", "Hasil", "Catatan"]],
    body: items.map((it) => [
      it.is_sub ? "" : String(++_n),
      it.is_sub ? `      ${it.item || "-"}` : (it.item || "-"),
      it.value || "-", it.unit || "-",
      (it.std_min || it.std_max) ? `${it.std_min || ""} - ${it.std_max || ""}` : "-",
      RES[it.result] || "-", it.note || "-",
    ]),
    theme: "grid",
    headStyles: { fillColor: [2, 132, 199] },
    styles: { fontSize: 8, cellPadding: 1.5 },
    columnStyles: { 0: { cellWidth: 10 }, 5: { cellWidth: 18 } },
    didParseCell: (d) => {
      if (d.section === "body" && d.column.index === 5) {
        const raw = items[d.row.index]?.result;
        if (raw === "ok") d.cell.styles.textColor = [5, 150, 105];
        if (raw === "not_ok") d.cell.styles.textColor = [225, 29, 72];
      }
    },
  });
  y = doc.lastAutoTable.finalY + 6;

  const okCount = items.filter((i) => i.result === "ok").length;
  const notOkCount = items.filter((i) => i.result === "not_ok").length;
  doc.setFontSize(9);
  doc.setFont(undefined, "bold");
  doc.text(`Ringkasan: ${okCount} OK, ${notOkCount} Tidak OK, dari ${items.length} item.`, 14, y);
  y += 10;

  if (y > h - 60) { doc.addPage(); y = 20; }
  doc.setFont(undefined, "bold");
  doc.setFontSize(10);
  doc.text("Operator", 40, y, { align: "center" });
  doc.text("Teknisi", w - 55, y, { align: "center" });
  const sigY = y + 4;
  try {
    if (cs.operator_signature) doc.addImage(cs.operator_signature, "PNG", 15, sigY, 50, 22);
    if (cs.technician_signature) doc.addImage(cs.technician_signature, "PNG", w - 80, sigY, 50, 22);
  } catch (e) {}
  const lineY = sigY + 26;
  doc.setDrawColor(0);
  doc.line(15, lineY, 65, lineY);
  doc.line(w - 80, lineY, w - 30, lineY);
  doc.setFont(undefined, "normal");
  doc.setFontSize(9);
  doc.text(cs.operator_name || "( ................. )", 40, lineY + 5, { align: "center" });
  doc.text(cs.technician_name || sch.technician_name || "( ................. )", w - 55, lineY + 5, { align: "center" });

  doc.save(`BAP-Checksheet-${(sch.machine_name || "mesin").replace(/\s+/g, "-")}-${formatDate(sch.due_date)}.pdf`);
}

export function generateReportPDF(services, { isAdmin }) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, w, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(15);
  doc.setFont(undefined, "bold");
  doc.text("LAPORAN RIWAYAT SERVIS", 14, 12);
  doc.setFontSize(9);
  doc.setFont(undefined, "normal");
  doc.text(`Dicetak: ${formatDate(new Date().toISOString())}`, 14, 19);
  doc.setTextColor(0, 0, 0);

  const head = ["Tanggal", "Mesin", "Jenis", "Teknisi", "Status"];
  if (isAdmin) head.push("Biaya");
  const body = services.map((s) => {
    const r = [
      formatDate(s.date), s.machine_name, TYPE_LABEL[s.service_type] || s.service_type,
      s.technician_name || "-", s.status === "selesai" ? "Selesai" : "Dalam Proses",
    ];
    if (isAdmin) r.push(formatRupiah(s.cost));
    return r;
  });

  autoTable(doc, {
    startY: 30, head: [head], body, theme: "striped",
    headStyles: { fillColor: [2, 132, 199] }, styles: { fontSize: 8 },
  });

  if (isAdmin) {
    const total = services.reduce((a, s) => a + (s.cost || 0), 0);
    doc.setFont(undefined, "bold");
    doc.text(`Total Biaya: ${formatRupiah(total)}`, 14, doc.lastAutoTable.finalY + 10);
  }
  doc.save(`Laporan-Servis-${Date.now()}.pdf`);
}
