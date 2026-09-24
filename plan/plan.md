# Rencana: Sistem Informasi Pemeliharaan Mesin

Aplikasi web untuk mengelola pemeliharaan mesin di lingkungan produksi/pabrik. Tampilan dalam **Bahasa Indonesia**.

## Hak Akses (2 peran)

- **Admin**: dapat melihat, menambah, mengubah, dan menghapus seluruh data.
- **User (Viewer)**: hanya dapat melihat data (read-only). Tidak ada tombol tambah/ubah/hapus. **Informasi biaya servis dan harga sparepart disembunyikan sepenuhnya dari User** — hanya Admin yang dapat melihatnya.

Login menggunakan **email + password**. Sesi otomatis berakhir saat browser ditutup (harus login ulang setiap kali membuka browser baru). Halaman login dibuat khusus, dan seluruh halaman lain hanya bisa diakses setelah login.

Akun admin awal disediakan agar bisa langsung dipakai; detail akun akan diberikan setelah aplikasi jadi.

## Fitur Utama

### 1. Manajemen Mesin
Daftar mesin beserta data: kode/nomor mesin, nama, tipe/model, lokasi, tanggal pembelian, status (aktif / dalam perbaikan / nonaktif), dan catatan. Admin dapat menambah/ubah/hapus.

### 2. Jadwal Pemeliharaan (Preventif)
Menjadwalkan pemeliharaan rutin per mesin: jenis pemeliharaan, tanggal jatuh tempo, frekuensi (harian/mingguan/bulanan), teknisi yang ditugaskan, dan status (terjadwal / jatuh tempo / selesai). Jadwal yang mendekati/melewati tanggal ditandai jelas.

### 3. Manajemen Sparepart
- Daftar sparepart: kode, nama, kategori, jumlah stok, stok minimum, satuan, lokasi penyimpanan, dan harga (**harga hanya terlihat oleh Admin**). Stok yang berada di bawah batas minimum ditandai sebagai "stok menipis". Pemakaian sparepart saat servis mengurangi stok.

### 4. Manajemen Teknisi
Daftar teknisi: nama, spesialisasi/keahlian, nomor kontak, dan status. Teknisi dipakai untuk penugasan pada jadwal dan perbaikan. (Teknisi di sini adalah data, bukan akun login.)

### 5. Perbaikan & Riwayat Servis
Pencatatan setiap kegiatan servis, baik pemeliharaan preventif maupun perbaikan (breakdown): mesin terkait, tanggal, jenis (preventif/perbaikan), deskripsi masalah, tindakan yang dilakukan, teknisi, sparepart yang dipakai, dan biaya (**biaya hanya terlihat oleh Admin**). Seluruh catatan tersimpan sebagai riwayat yang bisa ditelusuri per mesin.

### 6. Laporan & Analisa
- **Grafik ringkasan** di dashboard: jumlah mesin per status, jadwal yang jatuh tempo, sparepart stok menipis, dan biaya servis (misalnya per bulan). **Grafik biaya servis hanya tampil untuk Admin.**
- **Ekspor laporan ke PDF**: laporan riwayat servis / ringkasan dapat diunduh sebagai file PDF.

### 7. Form Tanda Tangan (Bukti Selesai)
Setelah pemeliharaan preventif atau perbaikan selesai, tersedia form bukti penyelesaian dengan **tanda tangan digital yang digambar langsung di layar** (mouse atau sentuh) untuk **operator** dan **teknisi**. Tanda tangan tersimpan menempel pada catatan servis terkait dan ikut muncul pada laporan PDF sebagai bukti.

## Catatan / Asumsi

- Data yang dikelola bersifat internal (bukan untuk publik).
- Mata uang biaya diasumsikan Rupiah (Rp).
- Fitur yang tidak disebutkan dalam problem statement (mis. notifikasi email otomatis, aplikasi mobile terpisah, ekspor Excel) tidak termasuk dalam versi ini dan dapat ditambahkan kemudian bila diperlukan.
