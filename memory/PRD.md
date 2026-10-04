# PRD — SIMIN (Sistem Informasi Pemeliharaan Mesin)

## Problem Statement (original)
Website sistem informasi pemeliharaan mesin (Bahasa Indonesia) dengan fitur: Manajemen mesin, Jadwal pemeliharaan, Manajemen sparepart, Manajemen teknisi, Perbaikan & riwayat servis, Laporan & analisa, dan Form tanda tangan operator+teknisi sebagai bukti selesai. Diakses & diedit oleh admin; hanya dapat dilihat oleh user. Dilengkapi halaman login.

## Architecture
- Backend: FastAPI + MongoDB (motor). Routes under `/api`. JWT auth with bcrypt, httpOnly **session cookies** (expire on browser close). Role dependency `require_admin`. Cost/price stripped server-side for non-admin.
- Frontend: React 19 + React Router 7, TailwindCSS + shadcn/ui, Recharts, jsPDF for PDF/BAP export, HTML canvas for digital signatures.
- Design: "Industrial Slate" — dark navy sidebar + light content, Barlow Condensed/Inter/JetBrains Mono fonts.

## Roles
- **admin**: full CRUD on all resources + user management + sees costs/prices + cost charts.
- **user**: read-only, cost/price hidden everywhere (backend + UI), no CRUD buttons, no /users route.

## User Personas
- Kepala Bengkel / Supervisor (admin) — mengelola seluruh data & biaya.
- Operator / Teknisi (user) — memantau data, mengunduh BAP.

## Implemented (2026-09-24)
- Auth: login, me, refresh, logout; seeded admin (vivianmarshela27@gmail.com) + user (operator@simin.co.id); brute-force lockout.
- Manajemen Mesin (CRUD), Jadwal Pemeliharaan (CRUD, overdue highlight), Sparepart (CRUD, low-stock badge, price admin-only), Teknisi (CRUD cards).
- Perbaikan & Riwayat Servis (CRUD, used-parts reduce stock, operator+technician digital signatures, per-record BAP PDF).
- Dashboard (KPI + status pie + monthly-cost line [admin] + due schedules + low stock).
- Laporan & Analisa (charts + PDF export, cost hidden for user).
- Manajemen Pengguna (admin only: create/edit/delete users, set passwords/roles).
- All flows verified: backend 100% (20 pytest), frontend 100% (Playwright).

## Core Requirements (static)
- Bahasa Indonesia UI, Rupiah currency, role-based access, digital signature proof, PDF export.

## Backlog / Remaining (P1/P2)
- P1: Filter laporan berdasarkan periode & lokasi line.
- P2: Kalender view untuk jadwal; foto bukti kerja pada BAP; notifikasi email jatuh tempo (out of current scope); ekspor Excel.

## Notes
- Data internal. Email notifications intentionally excluded per plan; password recovery handled by admin via Manajemen Pengguna.


## Implemented — 2026-06 (updates)
- Rebranded to **SATRIA ENGINEERING**; login switched to **username + password** (no email). Admin `admin`, viewer `operator`.
- Logo integrated: login page, sidebar header, profile avatar, faint dashboard watermark, and BAP PDF watermark.
- **Checksheet feature** on Jadwal Pemeliharaan:
  - Master checksheet **templates** (collection `checksheet_templates`, admin CRUD; all can read). Seeded 2 templates.
  - Per-schedule checksheet stored on `schedules.checksheet` via `PUT /api/schedules/{id}/checksheet` (admin only). Items: item, value, unit, std_min/std_max, result (ok/not_ok), note. Auto-suggest result when value is out of range; OK/Tidak OK summary.
  - Operator + technician names & digital signatures on the checksheet; exported to **BAP Checksheet PDF** (`generateChecksheetPDF`).
  - User (viewer) sees checksheet read-only; can still Cetak BAP.
  - Components: `ChecksheetDialog.js`, `TemplateManager.js`. Verified via testing agent (iteration_2, 100% pass).

## Implemented — 2026-10-03 (DOWNTIME MONITOR)
- Redesigned Dashboard downtime section into a dark **DOWNTIME MONITOR** panel (`/app/frontend/src/components/DowntimeMonitor.js`).
  - Downtime curve (area) with **Harian/Mingguan/Bulanan** toggle; two series: Total Downtime (jam) = `downtime_hours`, Waktu Dipakai (jam) = `repair_duration_hours`.
  - Horizontal **Downtime per Mesin** bar chart, color-ranked (red/amber/green); click bar filters repair-history table.
  - Machine filter + period (7/30/90 Hari) dropdowns; LIVE badge with 15s auto-refresh.
- Backend: `GET /api/dashboard/downtime?days=&bucket=&machine_id=` aggregates curve/per-machine/history (`server.py`).
- One-time demo seed `seed_downtime_demo()` (guarded by `db.meta` key `downtime_demo_seeded`) populates recent perbaikan records so charts render.
- Verified: testing agent iteration_13 — backend 10/10, all frontend scenarios pass. Backend tests at `/app/backend/tests/test_downtime_monitor.py`.

## Implemented — 2026-10-04 (Catatan Servis: multi-teknisi & merge sparepart)
- Form servis (/repairs) kini mendukung **lebih dari satu teknisi**: picker menambahkan teknisi sebagai chip (hapus per chip); nama digabung ke `technician_name` (koma) + disimpan sebagai array `technicians`. Backward-compatible dengan record teknisi tunggal lama.
- Input sparepart kini **digabung bila sama**: menambah sparepart yang sama menjumlahkan qty dalam satu baris (bukan baris duplikat).
- Backend `ServiceIn` menambah `technicians: List[TechnicianRef]`. Teruji: testing agent iteration_14 — frontend 100%, tanpa isu.
