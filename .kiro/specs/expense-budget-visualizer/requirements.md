# Requirements Document

## Introduction

Expense & Budget Visualizer adalah aplikasi web single-page yang memungkinkan pengguna mencatat, mengkategorikan, dan memvisualisasikan pengeluaran secara interaktif. Aplikasi dibangun menggunakan HTML, CSS, dan Vanilla JavaScript murni tanpa framework, menggunakan Browser Local Storage untuk persistensi data, dan wajib berjalan di Chrome, Firefox, Edge, dan Safari tanpa setup apapun.

## Glossary

- **App**: Aplikasi web Expense & Budget Visualizer secara keseluruhan
- **Transaction**: Satu catatan pengeluaran dengan nama item, jumlah, kategori, dan tanggal
- **Category**: Label pengelompokan transaksi (default: Food, Transport, Fun; dapat ditambah pengguna)
- **Balance**: Total akumulasi semua jumlah transaksi yang tersimpan
- **SpendingLimit**: Batas pengeluaran per transaksi yang ditentukan pengguna sebagai ambang highlight
- **PieChart**: Visualisasi distribusi pengeluaran per kategori berbentuk lingkaran menggunakan Chart.js
- **MonthlySummary**: Ringkasan total pengeluaran yang dikelompokkan per bulan
- **LocalStorage**: Browser Local Storage API yang digunakan untuk persistensi data tanpa backend
- **Theme**: Mode tampilan visual (dark atau light) yang dapat dipilih pengguna

---

## Requirements

### Requirement 1: Input Form Transaksi

**User Story:** As a pengguna, I want to mengisi form dengan nama item, jumlah, dan kategori, so that I can menambahkan catatan pengeluaran baru ke dalam daftar.

#### Acceptance Criteria

1. THE App SHALL menampilkan form input yang terdiri dari field Item Name (teks, maksimum 100 karakter), Amount (angka positif), dan Category (dropdown pilihan kategori yang tersedia).
2. WHEN pengguna mengklik tombol submit tanpa mengisi semua field, THE App SHALL menampilkan pesan validasi inline di bawah setiap field yang belum terisi, menyebutkan nama field yang kosong.
3. WHEN pengguna mengisi semua field dengan data valid dan mengklik tombol submit, THE App SHALL menambahkan transaksi baru ke daftar transaksi dan menyimpannya ke LocalStorage dalam waktu 500ms.
4. WHEN transaksi berhasil ditambahkan, THE App SHALL mengosongkan Item Name ke string kosong, Amount ke kosong, dan Category kembali ke opsi pertama (default).
5. IF nilai Amount yang dimasukkan kurang dari atau sama dengan nol, THEN THE App SHALL menampilkan pesan validasi "Amount harus lebih dari 0" dan tidak menambahkan transaksi.
6. IF nilai Amount yang dimasukkan bukan angka (non-numeric), THEN THE App SHALL menampilkan pesan validasi "Amount harus berupa angka valid" dan tidak menambahkan transaksi.

---

### Requirement 2: Daftar Transaksi (Transaction List)

**User Story:** As a pengguna, I want to melihat semua transaksi dalam daftar yang dapat di-scroll, so that I can memantau seluruh riwayat pengeluaran saya.

#### Acceptance Criteria

1. THE App SHALL menampilkan daftar semua transaksi yang tersimpan, dengan setiap baris menampilkan nama item, jumlah dalam format Rupiah (simbol "Rp", pemisah ribuan titik, dua desimal — contoh: Rp 14.500,00), dan label kategori.
2. THE App SHALL membuat area daftar transaksi dapat di-scroll secara vertikal (overflow-y: auto) ketika jumlah transaksi melebihi tinggi maksimum kontainer yang tersedia.
3. WHEN pengguna mengklik tombol hapus pada sebuah transaksi, THE App SHALL menghapus transaksi tersebut dari daftar, dari LocalStorage, dan memperbarui Total Balance serta MonthlySummary tanpa reload halaman.
4. WHEN tidak ada transaksi yang tersimpan, THE App SHALL menampilkan pesan yang secara eksplisit menyatakan "Belum ada transaksi" dan mengarahkan pengguna untuk menambah transaksi menggunakan form di atas.

---

### Requirement 3: Total Balance

**User Story:** As a pengguna, I want to melihat total balance saya secara langsung di bagian atas halaman, so that I can mengetahui total pengeluaran saya setiap saat.

#### Acceptance Criteria

1. THE App SHALL menampilkan nilai Total Balance di bagian atas halaman yang merupakan hasil penjumlahan semua Amount transaksi yang tersimpan, dalam format Rupiah (contoh: Rp 1.500,00).
2. THE App SHALL memformat Total Balance menggunakan simbol "Rp", pemisah ribuan titik, dan dua angka desimal koma (contoh: Rp 18.450,00).
3. WHEN transaksi baru ditambahkan, THE App SHALL memperbarui nilai Total Balance dalam waktu ≤1 detik tanpa perlu reload halaman.
4. WHEN sebuah transaksi dihapus, THE App SHALL memperbarui nilai Total Balance dalam waktu ≤1 detik untuk mencerminkan pengurangan amount transaksi yang dihapus.
5. IF tidak ada transaksi yang tersimpan, THEN THE App SHALL menampilkan Total Balance sebesar "Rp 0,00".

---

### Requirement 4: Visualisasi Pie Chart

**User Story:** As a pengguna, I want to melihat pie chart distribusi pengeluaran per kategori, so that I can memahami pola pengeluaran saya secara visual.

#### Acceptance Criteria

1. THE App SHALL menampilkan PieChart yang memvisualisasikan persentase pengeluaran setiap Category dari total keseluruhan pengeluaran menggunakan Chart.js.
2. WHEN transaksi baru ditambahkan, THE App SHALL memperbarui PieChart dalam waktu ≤1 detik untuk mencerminkan distribusi terbaru.
3. WHEN sebuah transaksi dihapus, THE App SHALL memperbarui PieChart dalam waktu ≤1 detik untuk mencerminkan distribusi setelah penghapusan.
4. THE App SHALL menampilkan legenda PieChart yang menunjukkan nama setiap Category beserta warna unik yang mewakilinya.
5. WHEN tidak ada transaksi, THE App SHALL menyembunyikan PieChart dan menampilkan teks placeholder "Belum ada data untuk ditampilkan" di area chart.

---

### Requirement 5: Kategori Kustom

**User Story:** As a pengguna, I want to menambahkan kategori pengeluaran sendiri, so that I can menyesuaikan pengelompokan pengeluaran sesuai kebutuhan saya.

#### Acceptance Criteria

1. THE App SHALL menyediakan input field dan tombol "Tambah Kategori" untuk pengguna memasukkan nama kategori baru.
2. WHEN pengguna menambahkan kategori baru dengan nama yang valid (non-kosong, maksimum 50 karakter), THE App SHALL menampilkan kategori tersebut sebagai opsi dalam dropdown form transaksi tanpa reload halaman.
3. IF pengguna mencoba menambahkan kategori dengan nama yang sudah ada (perbandingan case-insensitive), THEN THE App SHALL menampilkan pesan "Kategori sudah ada" dan tidak menambahkan duplikat.
4. THE App SHALL menyimpan daftar kategori kustom ke LocalStorage sehingga tersedia saat halaman di-reload.
5. IF nama kategori yang dimasukkan kosong atau hanya berisi spasi, THEN THE App SHALL menampilkan pesan validasi "Nama kategori tidak boleh kosong" dan tidak menambahkan kategori tersebut.
6. IF nama kategori melebihi 50 karakter, THEN THE App SHALL menampilkan pesan validasi "Nama kategori maksimal 50 karakter" dan tidak menambahkan kategori tersebut.

---

### Requirement 6: Monthly Summary View

**User Story:** As a pengguna, I want to melihat ringkasan pengeluaran per bulan, so that I can melacak tren pengeluaran saya dari waktu ke waktu.

#### Acceptance Criteria

1. THE App SHALL menampilkan MonthlySummary yang mengelompokkan transaksi berdasarkan bulan dan tahun (format: "Januari 2025"), dengan menampilkan total pengeluaran setiap bulan dalam format Rupiah.
2. WHEN transaksi baru ditambahkan, THE App SHALL memperbarui MonthlySummary tanpa reload halaman untuk mencerminkan data terbaru.
3. WHEN sebuah transaksi dihapus, THE App SHALL memperbarui MonthlySummary tanpa reload halaman untuk mencerminkan data setelah penghapusan.
4. WHEN transaksi ditambahkan, THE App SHALL mencatat tanggal transaksi secara otomatis menggunakan tanggal sistem saat itu (new Date()) untuk keperluan pengelompokan MonthlySummary.
5. THE App SHALL menampilkan baris MonthlySummary diurutkan dari bulan terbaru ke terlama (descending berdasarkan tahun dan bulan).

---

### Requirement 7: Pengurutan Transaksi (Sort Transactions)

**User Story:** As a pengguna, I want to mengurutkan daftar transaksi berdasarkan jumlah atau kategori, so that I can menemukan dan menganalisis transaksi dengan lebih mudah.

#### Acceptance Criteria

1. THE App SHALL menyediakan kontrol pengurutan (dropdown atau tombol) yang memungkinkan pengguna memilih urutan berdasarkan Amount ascending, Amount descending, Category A-Z, atau Category Z-A.
2. WHEN pengguna memilih kriteria pengurutan, THE App SHALL mengurutkan dan menampilkan ulang daftar transaksi sesuai kriteria tanpa reload halaman.
3. WHILE opsi pengurutan aktif, THE App SHALL mempertahankan urutan yang dipilih ketika transaksi baru ditambahkan atau dihapus.
4. THE App SHALL menggunakan urutan default "terbaru ditambahkan" (insertion order) sebelum pengguna memilih kriteria pengurutan.
5. WHEN dua transaksi memiliki Amount yang sama saat diurutkan berdasarkan Amount, THE App SHALL menggunakan nama item (A-Z) sebagai kriteria pengurutan sekunder (tie-breaking).

---

### Requirement 8: Spending Limit Highlight

**User Story:** As a pengguna, I want to menentukan batas pengeluaran dan melihat highlight pada transaksi yang melebihi batas tersebut, so that I can segera mengidentifikasi pengeluaran yang berlebihan.

#### Acceptance Criteria

1. THE App SHALL menyediakan input field numerik dan tombol simpan untuk pengguna menetapkan nilai SpendingLimit (harus lebih dari 0).
2. WHEN pengguna menetapkan SpendingLimit dengan nilai valid, THE App SHALL menyimpan nilai tersebut ke LocalStorage.
3. IF SpendingLimit telah ditetapkan dan nilai Amount sebuah transaksi melebihi SpendingLimit, THEN THE App SHALL menerapkan highlight visual yang jelas (background color merah muda atau border merah) pada baris transaksi tersebut.
4. WHEN nilai SpendingLimit diubah, THE App SHALL memperbarui highlight pada seluruh daftar transaksi secara langsung tanpa reload halaman.
5. WHEN SpendingLimit di-reset atau dikosongkan, THE App SHALL menghapus semua highlight dari daftar transaksi.
6. IF nilai SpendingLimit yang dimasukkan adalah nol, negatif, atau non-numerik, THEN THE App SHALL menampilkan pesan validasi dan tidak menyimpan nilai tersebut.

---

### Requirement 9: Dark/Light Mode Toggle

**User Story:** As a pengguna, I want to beralih antara mode tampilan gelap dan terang, so that I can menyesuaikan tampilan aplikasi dengan preferensi visual saya.

#### Acceptance Criteria

1. THE App SHALL menyediakan tombol toggle di header yang memungkinkan pengguna beralih antara Theme dark dan Theme light, dengan ikon yang mencerminkan state aktif (misalnya ikon bulan untuk dark, ikon matahari untuk light).
2. WHEN pengguna mengaktifkan Theme dark, THE App SHALL menerapkan skema warna gelap pada seluruh elemen antarmuka termasuk background, teks, border, dan ikon.
3. WHEN pengguna mengaktifkan Theme light, THE App SHALL menerapkan skema warna terang pada seluruh elemen antarmuka termasuk background, teks, border, dan ikon.
4. THE App SHALL menyimpan preferensi Theme pengguna ke LocalStorage sehingga diterapkan secara otomatis saat halaman di-reload.
5. WHEN halaman pertama kali dimuat tanpa preferensi tersimpan di LocalStorage, THE App SHALL mendeteksi preferensi sistem operasi pengguna (prefers-color-scheme) dan menerapkan Theme yang sesuai.
6. IF LocalStorage tidak tersedia, THEN THE App SHALL menerapkan Theme light sebagai default dan tetap berfungsi tanpa error.

---

### Requirement 10: Persistensi Data (LocalStorage)

**User Story:** As a pengguna, I want to data transaksi dan pengaturan saya tersimpan secara otomatis, so that I can melanjutkan catatan pengeluaran saya meskipun browser ditutup dan dibuka kembali.

#### Acceptance Criteria

1. THE App SHALL menyimpan semua Transaction ke LocalStorage secara otomatis setiap kali ada perubahan (tambah, hapus).
2. WHEN halaman dimuat, THE App SHALL memuat semua Transaction, daftar Category kustom, nilai SpendingLimit, dan preferensi Theme dari LocalStorage.
3. THE App SHALL beroperasi sepenuhnya di sisi klien (client-side only) tanpa memerlukan koneksi ke backend server.
4. WHEN data di LocalStorage corrupt atau tidak valid (gagal JSON.parse), THE App SHALL menginisialisasi ulang data ke kondisi kosong/default dan melanjutkan operasi tanpa menampilkan error ke pengguna.

---

### Requirement 11: Kompatibilitas Browser

**User Story:** As a pengguna, I want to aplikasi berjalan dengan baik di browser pilihan saya, so that I can menggunakannya tanpa hambatan teknis.

#### Acceptance Criteria

1. THE App SHALL berfungsi penuh pada versi browser Chrome, Firefox, Edge, dan Safari yang dirilis dalam 12 bulan terakhir, tanpa memerlukan plugin atau ekstensi tambahan.
2. THE App SHALL responsif pada viewport antara 360px dan 1280px lebar, dengan layout yang menyesuaikan secara optimal untuk mobile (360px–767px), tablet (768px–1023px), dan desktop (1024px+).
