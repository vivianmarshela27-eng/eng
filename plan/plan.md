# Rencana: Form Checksheet pada Jadwal Pemeliharaan

Menambahkan form **checksheet (lembar pemeriksaan)** pada menu Jadwal Pemeliharaan. Checksheet berisi daftar item yang harus diperiksa saat pemeliharaan preventif, lengkap dengan nilai pengukuran dan hasilnya. Tampilan tetap dalam Bahasa Indonesia.

## Bentuk Item Pemeriksaan

Setiap item checksheet memiliki kolom:
- **Item pemeriksaan** (teks) — mis. "Tekanan oli", "Suhu bearing", "Kekencangan baut".
- **Nilai pengukuran** (angka) — hasil ukur di lapangan.
- **Satuan** — mis. bar, °C, mm, RPM.
- **Rentang standar** — batas bawah dan batas atas yang diperbolehkan.
- **Hasil** — OK / Tidak OK.
- **Catatan** (opsional).

Catatan: kolom nilai/satuan/rentang boleh dikosongkan untuk item yang sifatnya cek visual (tanpa angka), sehingga item cukup dinilai OK / Tidak OK. Saat nilai diisi dan berada di luar rentang standar, sistem menandai/menyarankan hasil "Tidak OK", namun keputusan akhir OK/Tidak OK tetap ditentukan admin.

## Penyusunan Daftar Item (Template + Per Jadwal)

- **Template master**: Admin dapat membuat dan mengelola satu atau lebih template checksheet berisi daftar item standar (mis. template untuk jenis/tipe mesin tertentu).
- **Per jadwal**: Saat membuka checksheet sebuah jadwal, Admin dapat memuat item dari sebuah template lalu **mengubahnya khusus untuk jadwal itu** (menambah, mengubah, menghapus, mengurutkan item) tanpa mengubah template aslinya.
- Perubahan pada template tidak otomatis mengubah checksheet jadwal yang sudah diisi.

## Hak Akses

- **Admin**: mengelola template, menyusun/mengubah daftar item per jadwal, dan mengisi hasil pemeriksaan (nilai + OK/Tidak OK + catatan).
- **User (Viewer)**: hanya dapat **melihat** checksheet beserta hasilnya. Tidak dapat mengubah item maupun mengisi hasil.

## Letak & Alur

- Pada setiap baris di menu **Jadwal Pemeliharaan** tersedia aksi **"Checksheet"** yang membuka form checksheet untuk jadwal tersebut.
- Admin memuat/menyusun item, mengisi nilai dan hasil, lalu menyimpan. Hasil tersimpan menempel pada jadwal.
- Ringkasan hasil (mis. jumlah item OK vs Tidak OK) ditampilkan agar mudah dilihat.

## Bukti di PDF (BAP)

- Hasil isian checksheet **ikut ditampilkan pada PDF Berita Acara (BAP)** bersama tanda tangan operator dan teknisi, sebagai bukti pemeriksaan. Tabel checksheet pada BAP memuat item, nilai, satuan, rentang standar, hasil, dan catatan.

## Asumsi

- Checksheet ditujukan untuk pemeliharaan preventif; tetap dapat dibuka untuk jadwal jenis lain bila diperlukan.
- Tidak ada perubahan pada fitur lain (mesin, sparepart, teknisi, laporan) selain penambahan tabel checksheet pada BAP.
- Tidak ada notifikasi email atau ekspor Excel dalam penambahan ini.
