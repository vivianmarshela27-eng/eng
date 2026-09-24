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
