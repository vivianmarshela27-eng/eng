# Upload File (Perpustakaan Dokumen) di Menu Laporan & Analisa

Menambahkan bagian unggah berkas pada halaman "Laporan & Analisa" sebagai perpustakaan dokumen umum.
Admin dapat mengunggah dan menghapus berkas apa pun; User hanya dapat melihat dan mengunduh.

## Untuk Siapa
- **Admin**: mengunggah berkas baru dan menghapus berkas yang ada.
- **User (Viewer)**: melihat daftar berkas dan mengunduhnya (tanpa unggah/hapus).

## Fitur & Pengalaman

### Lokasi
- Bagian baru **"Perpustakaan Dokumen"** ditambahkan di halaman **Laporan & Analisa**, di bawah grafik dan tombol ekspor PDF yang sudah ada.

### Daftar Berkas
- Menampilkan tabel/kartu berisi berkas yang sudah diunggah: nama berkas asli, jenis/format, ukuran, tanggal unggah, dan siapa yang mengunggah.
- Setiap baris memiliki aksi **Unduh** (semua peran) dan **Hapus** (khusus Admin).
- Bila belum ada berkas, tampil pesan kosong yang ramah.

### Unggah (khusus Admin)
- Tombol **"Unggah Berkas"** membuka pemilih berkas.
- **Semua jenis berkas** diperbolehkan.
- **Ukuran maksimum 2 MB per berkas**. Berkas melebihi batas ditolak dengan pesan jelas ("Ukuran berkas melebihi 2 MB").
- Opsional: kolom **judul/keterangan singkat** untuk memudahkan pengenalan berkas (boleh dikosongkan; jika kosong memakai nama berkas).
- Satu berkas per unggahan; dapat mengunggah lagi untuk menambah berkas berikutnya.

### Unduh
- Mengklik Unduh mengambil berkas melalui backend (akses terkontrol sesuai login) lalu menyimpannya di perangkat dengan nama aslinya.

### Hapus (khusus Admin)
- Menghapus berkas dari daftar setelah konfirmasi. Berkas tidak lagi muncul di perpustakaan.

## User Flow
1. **Admin mengunggah**: buka Laporan & Analisa → bagian Perpustakaan Dokumen → "Unggah Berkas" → pilih berkas (≤ 2 MB) → berkas muncul di daftar.
2. **Admin/User mengunduh**: buka bagian yang sama → klik "Unduh" pada berkas yang diinginkan.
3. **Admin menghapus**: klik "Hapus" pada baris berkas → konfirmasi → berkas hilang dari daftar.

## UI/UX Feel
- Konsisten dengan gaya aplikasi saat ini (industrial, Bahasa Indonesia): kartu/tabel yang sama, tombol aksi berwarna, ikon berkas.
- Menonjolkan info penting per baris (nama, ukuran, tanggal) agar cepat terbaca.
- Kontrol unggah/hapus hanya terlihat oleh Admin; User melihat tampilan bersih hanya-baca.

## Implementation Phases

### Fase 1 (MVP — dibangun sekarang)
- Bagian "Perpustakaan Dokumen" di halaman Laporan & Analisa.
- Admin: unggah (semua jenis, maks 2 MB) dan hapus berkas.
- User: melihat daftar dan mengunduh.
- Daftar berkas menampilkan nama, jenis, ukuran, tanggal unggah, pengunggah.

### Fase 2 (berikutnya)
- Pencarian/filter berkas (berdasarkan nama/keterangan, jenis, atau tanggal).
- Pengaitan opsional berkas ke mesin atau catatan servis tertentu.

### Fase 3 (lanjutan)
- Kategori/folder dokumen dan penataan berdasarkan label.
- Pratinjau (preview) langsung untuk PDF dan gambar tanpa harus mengunduh.

## Assumptions
- Penyimpanan berkas menggunakan layanan object storage bawaan platform (dikelola otomatis, tidak memerlukan kredensial tambahan dari pengguna).
- "Perpustakaan dokumen umum": berkas tidak dikaitkan ke mesin/servis tertentu pada Fase 1.
- Batas 2 MB berlaku per berkas; validasi dilakukan sebelum dan saat unggah.
- Semua jenis berkas diterima; tidak ada penyaringan format pada Fase 1.
- Unduh dilayani melalui backend (bukan tautan penyimpanan langsung), tetap menghormati status login.
- Penghapusan menyembunyikan berkas dari daftar (tidak dapat dibatalkan dari sisi pengguna); riwayat versi berkas tidak termasuk pada Fase 1.
- Menu lain (mesin, jadwal, sparepart, teknisi, perbaikan, riwayat preventif, laporan) tidak berubah selain penambahan bagian ini.
- Bahasa antarmuka tetap Bahasa Indonesia.
