# Catatan Umum, Hapus Riwayat, & Cetak Rekap pada Riwayat Preventif

Tiga penyempurnaan pada fitur checksheet/Riwayat Preventif: menambah satu kolom catatan umum pada form,
menambah tombol hapus checksheet, dan menambah cetak rekap seluruh riwayat preventif dalam satu dokumen.

## Untuk Siapa
- **Admin**: mengisi catatan, menghapus checksheet yang sudah ada, dan mencetak rekap.
- **User (Viewer)**: melihat catatan (read-only) dan dapat mencetak rekap; tidak dapat menghapus.

## Fitur & Pengalaman

### 1. Kolom Catatan Umum pada Form Checksheet
- Ditambahkan satu kolom **"Catatan"** (teks bebas, boleh dikosongkan) pada form checksheet.
- Letak: di bawah area nama & tanda tangan Operator dan Teknisi (satu catatan untuk keseluruhan form, bukan per orang).
- Admin dapat mengisi/mengubah; User melihat sebagai teks read-only.
- Isi catatan ikut tampil pada BAP PDF per-form yang sudah ada.

### 2. Hapus Checksheet (khusus Admin)
- Pada tiap baris di halaman **Riwayat Preventif** ditambahkan aksi **"Hapus"** (hanya Admin).
- Menghapus **hanya data checksheet** milik jadwal tersebut, setelah konfirmasi.
- **Jadwal pemeliharaannya tetap ada** (tidak ikut terhapus) — hanya baris ini yang hilang dari daftar Riwayat Preventif. Jadwal tersebut kembali dianggap "belum diisi" sehingga bisa diisi ulang lewat "Isi Checksheet Baru".
- User tidak melihat tombol Hapus.

### 3. Cetak Rekap Seluruh Riwayat Preventif
- Tombol **"Cetak Rekap"** di halaman Riwayat Preventif (terlihat Admin & User) menghasilkan **satu dokumen PDF** berisi seluruh checksheet yang sudah terisi.
- Isi rekap per checksheet: nama mesin, jenis pemeliharaan, tanggal jatuh tempo, tanggal terakhir disimpan, ringkasan hasil (jumlah OK / Tidak OK), catatan, dan nama operator/teknisi. Antar checksheet dipisah jelas.
- Ini pelengkap dari tombol **Cetak BAP** per-form yang sudah ada (BAP per-form tetap memuat tabel item lengkap + tanda tangan; rekap berfokus pada ringkasan banyak checksheet dalam satu berkas).

## User Flow
1. **Isi catatan**: Admin buka Riwayat Preventif → buka/isi sebuah checksheet → isi kolom Catatan di bawah tanda tangan → Simpan. Catatan tampil pada tampilan checksheet dan BAP-nya.
2. **Hapus checksheet**: Admin klik "Hapus" pada baris riwayat → konfirmasi → baris hilang dari daftar, jadwal tetap ada.
3. **Cetak rekap**: Admin/User klik "Cetak Rekap" → unduh satu PDF berisi semua checksheet terisi.

## UI/UX Feel
- Konsisten dengan gaya aplikasi saat ini (industrial, Bahasa Indonesia): kartu/tabel yang sama, tombol aksi berwarna, penanda hasil OK hijau / Tidak OK merah.
- Kolom Catatan berupa area teks multi-baris yang jelas di bawah blok tanda tangan.
- Konfirmasi hapus memakai dialog yang sama seperti penghapusan lain di aplikasi.
- Tombol "Cetak Rekap" diletakkan di header halaman, terpisah dari aksi per-baris agar tidak membingungkan.

## Implementation Phases

### Fase 1 (MVP — dibangun sekarang)
- Kolom Catatan umum pada form checksheet (isi Admin, read-only User), ikut pada BAP per-form.
- Tombol Hapus checksheet per baris (khusus Admin) yang hanya menghapus data checksheet, jadwal tetap ada.
- Tombol Cetak Rekap yang menghasilkan satu PDF ringkasan seluruh checksheet terisi.

### Fase 2 (berikutnya)
- Filter isi rekap sebelum cetak (rentang tanggal, per mesin, hanya yang punya item "Tidak OK").
- Sertakan tabel item lengkap (bukan hanya ringkasan) sebagai opsi pada rekap.

### Fase 3 (lanjutan)
- Riwayat berversi: menyimpan lebih dari satu pelaksanaan checksheet per jadwal, sehingga hapus/rekap dapat memilih versi/periode tertentu.

## Assumptions
- "Catatan" adalah satu kolom teks bebas untuk keseluruhan form (bukan catatan terpisah per operator/teknisi), diletakkan di bawah blok tanda tangan.
- Catatan yang sudah ada per-item (kolom Catatan pada tiap baris item) tetap dipertahankan; kolom baru ini adalah catatan tingkat form yang berbeda.
- "Hapus" mengosongkan data checksheet dari jadwal terkait dan bersifat tidak dapat dibatalkan dari sisi pengguna; jadwal pemeliharaan tidak terpengaruh.
- "Cetak Rekap" mencakup seluruh checksheet yang sudah terisi tanpa filter pada Fase 1, berisi ringkasan (bukan tabel item lengkap tiap checksheet) agar dokumen ringkas; tombolnya tersedia untuk Admin dan User.
- Tombol Cetak BAP per-form yang sudah ada tetap dipertahankan sebagaimana adanya.
- Bahasa antarmuka tetap Bahasa Indonesia; tidak ada perubahan pada menu lain.
