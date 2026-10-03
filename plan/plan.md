# Kalender Jadwal pada Jadwal Pemeliharaan

Menampilkan jadwal pemeliharaan dalam tampilan kalender bulanan agar mudah dipantau, berdampingan dengan tampilan tabel yang sudah ada.
Pengguna dapat berpindah antara "Kalender" dan "Tabel", melihat jadwal pada tanggalnya, dan (khusus Admin) menambah/mengubah jadwal langsung dari kalender.

## Untuk Siapa
- **Admin**: memantau jadwal di kalender, menambah jadwal dengan mengklik tanggal, serta membuka dan mengubah/menghapus jadwal.
- **User (Viewer)**: memantau jadwal di kalender dan membuka detail jadwal (hanya lihat, tanpa tombol tambah/ubah/hapus).

## Fitur & Pengalaman

### Toggle Tampilan
- Di halaman **Jadwal Pemeliharaan** ditambahkan pilihan **"Kalender"** dan **"Tabel"**.
- Tampilan tabel yang ada sekarang tetap dipertahankan tanpa perubahan fungsi.
- Pilihan tampilan terakhir yang dipakai diingat selama sesi.

### Kalender Bulanan
- Menampilkan satu bulan penuh dengan navigasi **bulan sebelumnya / berikutnya** dan tombol **"Hari Ini"**.
- Tanggal hari ini ditandai jelas.
- Setiap jadwal muncul sebagai label pada kotak tanggal **jatuh tempo**-nya, memuat nama mesin dan jenis pemeliharaan (ringkas).
- Bila satu tanggal memiliki banyak jadwal, ditampilkan beberapa label lalu penanda **"+N lainnya"**; mengklik tanggal menampilkan seluruh daftar pada tanggal tersebut.
- Jadwal yang sudah **lewat jatuh tempo** dan belum selesai diberi penanda tambahan (mis. ikon/indikator) agar menonjol.

### Warna Jadwal (Manual)
- Setiap jadwal memiliki **warna** yang dapat **dipilih manual** oleh Admin saat menambah/mengubah jadwal, dari sekumpulan pilihan warna siap pakai.
- Warna inilah yang dipakai pada label jadwal di kalender.
- Jika Admin tidak memilih, dipakai **warna default**.
- Disertakan **legenda/keterangan** sederhana pada tampilan kalender.

### Interaksi
- **Klik sebuah jadwal** pada kalender → membuka **detail jadwal**. Admin dapat langsung **mengubah** atau **menghapus**; User hanya melihat detail.
- **Klik tanggal kosong** (khusus Admin) → membuka **form tambah jadwal** dengan **tanggal jatuh tempo sudah terisi** sesuai tanggal yang diklik. User tidak mendapatkan aksi ini.
- Setelah menambah/mengubah/menghapus, kalender langsung diperbarui.

## User Flow
1. **Memantau**: buka Jadwal Pemeliharaan → pilih "Kalender" → lihat jadwal per tanggal dalam sebulan, berpindah bulan sesuai kebutuhan.
2. **Menambah (Admin)**: klik tanggal kosong → form tambah terbuka dengan tanggal terisi → lengkapi data (termasuk memilih warna) → simpan → jadwal muncul di kalender.
3. **Membuka/Mengubah**: klik label jadwal → detail terbuka → Admin mengubah/menghapus; User menutup setelah melihat.

## UI/UX Feel
- Konsisten dengan gaya aplikasi saat ini (industrial, Bahasa Indonesia): kartu, tombol aksi berwarna, penanda status.
- Kisi kalender rapi, kotak tanggal cukup lega, label jadwal memakai warna pilihan dengan teks terbaca.
- Responsif: pada layar kecil kalender tetap dapat digulir/terbaca; label panjang dipangkas rapi.
- Penanda "jatuh tempo terlewat" memakai isyarat visual yang selaras dengan penanda di tabel.

## Implementation Phases

### Fase 1 (MVP — dibangun sekarang)
- Toggle "Kalender"/"Tabel" di halaman Jadwal Pemeliharaan (tabel lama tetap).
- Kalender bulanan dengan navigasi bulan + "Hari Ini", menampilkan jadwal pada tanggal jatuh tempo, penanda banyak jadwal ("+N lainnya"), dan penanda terlewat.
- Warna jadwal yang dapat dipilih manual oleh Admin (dengan warna default) + legenda.
- Klik jadwal → detail (Admin bisa ubah/hapus). Klik tanggal kosong (Admin) → form tambah dengan tanggal terisi.
- Hak akses Admin (kelola) vs User (lihat) dipertahankan.

### Fase 2 (berikutnya)
- Filter kalender (per mesin, per teknisi, atau per warna/kategori).
- Tampilan tambahan: mingguan dan/atau daftar agenda.
- Geser-lepas (drag-and-drop) untuk mengubah tanggal jatuh tempo langsung dari kalender (Admin).

### Fase 3 (lanjutan)
- Pengulangan jadwal otomatis berdasarkan frekuensi (harian/mingguan/bulanan) yang tampil sebagai rangkaian di kalender.
- Penanda hari libur dan ekspor/berbagi tampilan kalender.

## Assumptions
- Jadwal diletakkan di kalender berdasarkan **tanggal jatuh tempo** (field yang sudah ada); frekuensi belum memunculkan pengulangan otomatis pada Fase 1.
- Tampilan default bulan yang dibuka adalah **bulan berjalan**.
- **Warna** adalah atribut baru per jadwal yang dipilih dari palet siap pakai; nilai default dipakai untuk jadwal lama yang belum berwarna.
- Toggle muncul di halaman **Jadwal Pemeliharaan** (bukan menu baru), sesuai pilihan.
- Mengklik tanggal kosong hanya tersedia untuk Admin; User tidak melihat aksi tambah.
- Form tambah/ubah jadwal yang dipakai dari kalender adalah form yang sama dengan yang ada sekarang (dengan tambahan pilihan warna).
- Bahasa antarmuka tetap Bahasa Indonesia; tidak ada perubahan pada menu lain.
