# Menu Riwayat Preventif + Pemindahan Form Checksheet

Menu baru "Riwayat Preventif" di sidebar yang menjadi satu-satunya tempat untuk mengisi, melihat, dan mencetak checksheet pemeliharaan. Form checksheet dipindahkan sepenuhnya dari menu Jadwal Pemeliharaan ke menu ini.

## Untuk Siapa
- **Admin**: mengisi dan mengubah checksheet, mengelola template, mencetak BAP.
- **User (Viewer)**: hanya melihat riwayat checksheet yang sudah terisi dan mencetak BAP.

## Fitur & Pengalaman

### Menu Sidebar
- Ditambahkan item menu **"Riwayat Preventif"**, diletakkan **setelah "Perbaikan & Riwayat"**.
- Menu ini terlihat oleh admin maupun user.

### Halaman Riwayat Preventif
- Menampilkan **daftar riwayat**: hanya jadwal pemeliharaan yang checksheet-nya **sudah diisi**. Jadwal yang belum memiliki checksheet tidak muncul di daftar ini.
- Tiap baris riwayat menampilkan informasi ringkas: nama mesin, jenis pemeliharaan, tanggal jatuh tempo, ringkasan hasil (jumlah OK / Tidak OK), dan tanggal terakhir checksheet disimpan.
- Aksi per baris: **Lihat/Buka Checksheet** (membuka form checksheet) dan **Cetak BAP** (PDF).
- **Admin** memiliki tombol **"Isi Checksheet Baru"**: memilih salah satu jadwal yang belum punya checksheet, lalu membuka form untuk mengisinya. Setelah disimpan, jadwal tersebut muncul di daftar riwayat.
- **Admin** memiliki tombol **"Kelola Template"** (dipindahkan dari menu Jadwal Pemeliharaan) untuk membuat/mengubah/menghapus template checksheet.
- **User** hanya melihat daftar (tanpa tombol Isi Checksheet Baru dan tanpa Kelola Template); dapat membuka checksheet secara read-only dan mencetak BAP.

### Form Checksheet (dipindahkan)
- Isi dan perilaku form tetap sama seperti sekarang: daftar item + sub item (sub item menjorok dan tidak bernomor), nilai/satuan/rentang standar, hasil OK/Tidak OK dengan saran otomatis, catatan, ringkasan OK vs Tidak OK, nama + tanda tangan operator & teknisi, serta Cetak BAP.
- Form ini **tidak lagi dapat diakses dari menu Jadwal Pemeliharaan**.

### Menu Jadwal Pemeliharaan
- Tombol/aksi **"Checksheet"** pada tiap baris **dihapus sepenuhnya**.
- Tombol **"Kelola Template"** pada halaman ini **dihapus** (pindah ke Riwayat Preventif).
- Fungsi jadwal lainnya (tambah/ubah/hapus jadwal, penanda jatuh tempo) tidak berubah.

## Alur Pengguna
1. **Admin mengisi checksheet**: buka "Riwayat Preventif" → "Isi Checksheet Baru" → pilih jadwal yang belum terisi → isi item (bisa muat dari template) + tanda tangan → Simpan. Baris kini tampil di daftar riwayat.
2. **Admin/User melihat riwayat**: buka "Riwayat Preventif" → daftar checksheet terisi → klik baris untuk membuka/melihat → opsional Cetak BAP.
3. **Kelola template**: admin membuka "Kelola Template" dari Riwayat Preventif untuk menyusun item standar.

## Nuansa UI/UX
- Konsisten dengan gaya aplikasi saat ini (industrial, Bahasa Indonesia): tabel/kartu daftar, dialog form checksheet yang sama, penanda hasil berwarna (OK hijau, Tidak OK merah).
- Baris riwayat menonjolkan ringkasan hasil agar cepat terbaca (mis. "5 OK · 1 Tidak OK").

## Fase Implementasi

### Fase 1 (MVP — dibangun sekarang)
- Menu sidebar "Riwayat Preventif" (setelah "Perbaikan & Riwayat").
- Halaman Riwayat Preventif: daftar jadwal yang checksheet-nya sudah diisi, aksi buka & Cetak BAP.
- Admin: "Isi Checksheet Baru" (pilih jadwal belum terisi → form), dan "Kelola Template" dipindahkan ke sini.
- Hapus akses Checksheet dan tombol Kelola Template dari menu Jadwal Pemeliharaan.
- Hak akses admin (isi/ubah) vs user (lihat saja) dipertahankan.

### Fase 2 (berikutnya)
- Pencarian/filter riwayat (per mesin, rentang tanggal, ada tidaknya item "Tidak OK").
- Penanda khusus untuk checksheet yang memiliki item "Tidak OK".

### Fase 3 (lanjutan)
- Riwayat berversi: menyimpan lebih dari satu pelaksanaan checksheet per jadwal (histori tiap periode), bukan hanya versi terakhir.
- Ekspor rekap banyak checksheet sekaligus.

## Asumsi
- Karena daftar hanya menampilkan checksheet yang sudah diisi, tombol admin **"Isi Checksheet Baru"** disediakan sebagai jalan untuk membuat checksheet pertama kali (memilih dari jadwal yang belum terisi). Tanpa ini, checksheet baru tidak akan bisa dibuat setelah tombol di Jadwal Pemeliharaan dihapus.
- "Sudah diisi" didefinisikan sebagai jadwal yang checksheet-nya pernah disimpan (memiliki minimal satu item atau data checksheet tersimpan).
- Jadwal yang dapat dipilih saat "Isi Checksheet Baru" mencakup seluruh jadwal yang belum memiliki checksheet (tidak dibatasi hanya berjenis preventif), agar konsisten dengan perilaku sebelumnya yang mengizinkan checksheet untuk jadwal apa pun.
- Menu "Riwayat Preventif" tampil untuk admin dan user; hanya kontrol pengisian/template yang disembunyikan dari user.
- Satu checksheet tersimpan per jadwal (menggantikan data sebelumnya bila diisi ulang), sesuai perilaku saat ini. Riwayat multi-versi masuk Fase 3.
- Tidak ada perubahan pada fitur lain (mesin, sparepart, teknisi, laporan) selain pemindahan akses checksheet.
