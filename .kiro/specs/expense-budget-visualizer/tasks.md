# Implementation Plan: Expense & Budget Visualizer

## Overview

Implementasi aplikasi web single-page dengan Vanilla JS dan ES Modules. Pendekatan bertahap: mulai dari fondasi (HTML, CSS, storage), lanjut ke modul bisnis logika satu per satu, kemudian wiring di `app.js`, dan diakhiri integrasi chart dan testing. Setiap langkah dapat divalidasi secara mandiri sebelum melanjutkan ke langkah berikutnya.

## Tasks

- [ ] 1. Setup project structure dan konfigurasi testing
  - Buat struktur direktori: `src/`, `tests/unit/`, `tests/property/`
  - Buat `index.html` dengan boilerplate HTML5, link ke `style.css`, script `src/app.js` bertipe `module`, dan tag CDN Chart.js dari jsDelivr
  - Buat `vitest.config.js` dengan environment jsdom dan globals: true
  - Inisialisasi `package.json` dengan dependency `vitest` dan `fast-check` (versi pinned), dan script `test` dan `test:run`
  - _Requirements: 1.1, 10.3, 11.1_

- [ ] 2. Implementasi `src/storage.js` — LocalStorage abstraction
  - [ ] 2.1 Implementasi `safeParse`, `loadAll`, dan `saveAll`
    - Definisikan konstanta `KEYS` untuk semua localStorage key (`ebv_transactions`, `ebv_categories`, `ebv_spending_limit`, `ebv_theme`)
    - Implementasikan `safeParse(jsonString, defaultValue)` yang mengembalikan defaultValue jika JSON.parse gagal
    - Implementasikan `loadAll()` yang membaca keempat key dan mengembalikan AppState
    - Implementasikan `saveAll(state)` dengan try/catch untuk graceful degradation
    - Export semua fungsi sebagai ES Module named exports
    - _Requirements: 10.1, 10.2, 10.4, 9.6_

  - [ ]\* 2.2 Tulis unit test untuk `storage.js`
    - Test `loadAll()` mengembalikan default state ketika localStorage kosong
    - Test `saveAll` + `loadAll` round-trip mempertahankan semua field
    - Test `loadAll()` menginisialisasi ulang ke default ketika data corrupt
    - _Requirements: 10.2, 10.4_

  - [ ]\* 2.3 Tulis property test untuk `storage.js` — Properties 16 & 17
    - **Property 16: Round-Trip Persistensi Transaksi** — for any array Transaction valid, serialisasi ke JSON dan deserialisasi menghasilkan array identik secara struktural
    - **Validates: Requirements 10.1, 10.2**
    - **Property 17: Pemulihan Graceful dari Data Storage Corrupt** — for any string yang tidak valid sebagai JSON, `safeParse` mengembalikan defaultValue tanpa exception
    - **Validates: Requirements 10.4**

- [ ] 3. Implementasi `src/validation.js` — pure validation functions
  - [ ] 3.1 Implementasi `validateTransaction`, `validateCategory`, dan `validateSpendingLimit`
    - `validateTransaction(itemName, amount, category)`: validasi field kosong, amount non-positif, amount non-numerik; kembalikan `{ valid, errors }`
    - `validateCategory(name, existingCategories)`: validasi kosong/spasi, panjang > 50, dan duplikat case-insensitive
    - `validateSpendingLimit(value)`: validasi non-numerik, nol, dan negatif
    - Semua fungsi harus pure (tanpa side effects)
    - _Requirements: 1.2, 1.5, 1.6, 5.3, 5.5, 5.6, 8.1, 8.6_

  - [ ]\* 3.2 Tulis unit test untuk `validation.js`
    - Test semua pesan error spesifik untuk setiap skenario invalid
    - Test input valid mengembalikan `{ valid: true }`
    - _Requirements: 1.2, 1.5, 1.6, 5.3, 5.5, 5.6_

  - [ ]\* 3.3 Tulis property test untuk `validation.js` — Properties 1, 3, 4, 11
    - **Property 1: Validasi Form — Field Kosong Terdeteksi** — for any kombinasi field form di mana setidaknya satu kosong, `validateTransaction` mengembalikan `valid: false` dengan errors yang menyebutkan field kosong
    - **Validates: Requirements 1.2**
    - **Property 3: Validasi Amount — Non-Positif Ditolak** — for any amount ≤ 0, `validateTransaction` mengembalikan `valid: false` dengan pesan "Amount harus lebih dari 0"
    - **Validates: Requirements 1.5**
    - **Property 4: Validasi Amount — Non-Numerik Ditolak** — for any string non-numerik, `validateTransaction` mengembalikan `valid: false` dengan pesan "Amount harus berupa angka valid"
    - **Validates: Requirements 1.6**
    - **Property 11: Validasi Nama Kategori — Whitespace dan Panjang** — for any string kosong, hanya spasi, atau panjang > 50, `validateCategory` mengembalikan `valid: false`
    - **Validates: Requirements 5.5, 5.6**

- [ ] 4. Implementasi `src/transactions.js` — business logic transaksi
  - [ ] 4.1 Implementasi `createTransaction`, `deleteTransaction`, `sortTransactions`, `computeBalance`, dan `isOverLimit`
    - `createTransaction(itemName, amount, category)`: buat objek Transaction dengan id (`crypto.randomUUID()` atau fallback `Date.now().toString()`), date sebagai ISO string
    - `deleteTransaction(transactions, id)`: kembalikan array baru tanpa transaksi ber-id tersebut (immutable)
    - `sortTransactions(transactions, key)`: implementasi 5 sort key dengan tie-breaking itemName A-Z untuk sort berbasis amount
    - `computeBalance(transactions)`: jumlahkan semua amount, bulatkan ke 2 desimal dengan `Math.round(sum * 100) / 100`
    - `isOverLimit(transaction, limit)`: kembalikan `true` hanya jika `limit !== null && transaction.amount > limit`
    - Tambahkan shared utility `formatRupiah(amount)` menggunakan `Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" })`
    - _Requirements: 1.3, 2.3, 3.1, 3.3, 3.4, 6.4, 7.2, 7.4, 7.5, 8.3, 8.5_

  - [ ]\* 4.2 Tulis unit test untuk `transactions.js`
    - Test `createTransaction` menghasilkan Transaction dengan field lengkap dan date mendekati `Date.now()`
    - Test `deleteTransaction` menghapus elemen yang tepat tanpa mutasi array original
    - Test `sortTransactions` untuk urutan default (insertion order) dan semua sort key
    - Test `computeBalance` pada array kosong (0) dan array berisi transaksi
    - Test `isOverLimit` untuk semua boundary (null limit, equal, over, under)
    - _Requirements: 1.3, 2.3, 3.1, 6.4, 7.4, 8.3_

  - [ ]\* 4.3 Tulis property test untuk `transactions.js` — Properties 2, 6, 7, 14, 15
    - **Property 2: Transaksi Valid Masuk ke Daftar dan Storage** — for any input valid, menambahkan transaksi meningkatkan panjang array sebesar tepat 1
    - **Validates: Requirements 1.3, 10.1**
    - **Property 6: Penghapusan Transaksi — Konsistensi Data** — for any array dan transaksi di dalamnya, setelah hapus: transaksi tidak ada lagi, balance = balance_sebelum − amount
    - **Validates: Requirements 2.3, 3.4**
    - **Property 7: Komputasi Balance — Penjumlahan Akurat** — for any array transaksi, `computeBalance` mengembalikan nilai tepat sama dengan arithmetic sum semua amount (2 desimal)
    - **Validates: Requirements 3.1, 3.3**
    - **Property 14: Pengurutan Transaksi — Invariant Urutan Terpenuhi** — for any array dan SortKey valid, hasil memenuhi invariant urutan yang sesuai dengan tie-breaking itemName A-Z
    - **Validates: Requirements 7.2, 7.5**
    - **Property 15: Spending Limit — Prediksi Highlight Tepat** — for any transaksi dan limit positif, `isOverLimit` mengembalikan `true` jika dan hanya jika `amount > limit`, dan `false` jika `limit === null`
    - **Validates: Requirements 8.3, 8.5**

- [ ] 5. Implementasi `src/categories.js` — category management
  - [ ] 5.1 Implementasi konstanta `DEFAULT_CATEGORIES` dan fungsi `addCategory`
    - Definisikan `DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun']`
    - `addCategory(categories, name)`: trim name, validasi via `validateCategory`, tambahkan ke array baru jika valid; kembalikan `{ categories, error? }`
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6_

  - [ ]\* 5.2 Tulis unit test untuk `categories.js`
    - Test `addCategory` berhasil menambah kategori baru
    - Test `addCategory` menolak duplikat case-insensitive
    - Test `addCategory` menolak string kosong dan string hanya spasi
    - _Requirements: 5.2, 5.3, 5.5_

  - [ ]\* 5.3 Tulis property test untuk `categories.js` — Properties 9, 10, 12
    - **Property 9: Kategori Baru Muncul di Dropdown** — for any nama kategori valid (non-kosong, ≤50 char, belum ada), setelah `addCategory` nama tersebut ada dalam array hasil
    - **Validates: Requirements 5.2**
    - **Property 10: Duplikat Kategori Ditolak (Case-Insensitive)** — for any nama kategori yang sudah ada, mencoba menambahkan varian case manapun mengembalikan error dan panjang array tidak berubah
    - **Validates: Requirements 5.3**
    - **Property 12: Round-Trip Persistensi Kategori Kustom** — for any array nama kategori valid, simpan ke storage dan muat kembali menghasilkan array yang ekuivalen
    - **Validates: Requirements 5.4**

- [ ] 6. Implementasi `src/summary.js` — monthly summary computation
  - [ ] 6.1 Implementasi `formatMonthYear` dan `computeMonthlySummary`
    - `formatMonthYear(date)`: format Date ke string "MMMM YYYY" menggunakan `Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" })`
    - `computeMonthlySummary(transactions)`: kelompokkan per year-month key ("2025-01"), jumlahkan amount, kembalikan array `MonthlySummaryRow[]` diurutkan descending by key
    - _Requirements: 6.1, 6.5_

  - [ ]\* 6.2 Tulis unit test untuk `summary.js`
    - Test `computeMonthlySummary` pada array kosong mengembalikan `[]`
    - Test pengelompokan transaksi satu bulan menghasilkan satu baris
    - Test urutan descending untuk transaksi multi-bulan
    - Test label menggunakan locale Indonesia (misalnya "Januari 2025")
    - _Requirements: 6.1, 6.5_

  - [ ]\* 6.3 Tulis property test untuk `summary.js` — Property 13
    - **Property 13: Komputasi Monthly Summary — Pengelompokan dan Urutan** — for any array transaksi multi-bulan, `computeMonthlySummary` (a) mengelompokkan per bulan+tahun dengan total tepat, (b) mengurutkan descending by year-month key
    - **Validates: Requirements 6.1, 6.5**

- [ ] 7. Implementasi `src/theme.js` — theme management
  - [ ] 7.1 Implementasi `applyTheme` dan `detectInitialTheme`
    - `applyTheme(theme)`: set `document.documentElement.setAttribute('data-theme', theme)`
    - `detectInitialTheme()`: cek localStorage → cek `window.matchMedia('(prefers-color-scheme: dark)')` → fallback `'light'`
    - _Requirements: 9.2, 9.3, 9.4, 9.5, 9.6_

  - [ ]\* 7.2 Tulis unit test untuk `theme.js`
    - Test `detectInitialTheme()` menggunakan `prefers-color-scheme` saat localStorage kosong
    - Test `applyTheme('dark')` dan `applyTheme('light')` menyetel attribute yang benar
    - _Requirements: 9.2, 9.3, 9.5_

  - [ ]\* 7.3 Tulis property test untuk `theme.js` — Property 18
    - **Property 18: Penerapan Theme — Class CSS Konsisten** — for any nilai theme ('dark' atau 'light'), setelah `applyTheme(theme)` elemen `<html>` memiliki `data-theme` attribute tepat sama dengan nilai tersebut
    - **Validates: Requirements 9.2, 9.3, 9.4**

- [ ] 8. Checkpoint — validasi modul bisnis logika
  - Pastikan semua test yang ada (unit dan property) lulus sebelum lanjut ke UI layer.
  - Jalankan `npm run test:run` dan pastikan tidak ada test yang gagal.
  - Tanyakan ke user jika ada pertanyaan atau perubahan desain sebelum melanjutkan.

- [ ] 9. Implementasi `src/chart.js` — Chart.js wrapper
  - [ ] 9.1 Implementasi `computeChartData`, `showChartPlaceholder`, dan `renderChart`
    - `computeChartData(transactions)`: agregasi amount per kategori, hasilkan `{ labels, data, colors }` dengan palet warna tetap
    - `showChartPlaceholder()`: sembunyikan canvas, tampilkan elemen placeholder dengan teks "Belum ada data untuk ditampilkan"
    - `renderChart(transactions)`: cek `typeof Chart === 'undefined'` (CDN fallback), inisialisasi chart jika belum ada, update data in-place via `chartInstance.data = ...; chartInstance.update()` pada panggilan berikutnya
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]\* 9.2 Tulis unit test untuk `chart.js`
    - Test `computeChartData` menghasilkan labels unik per kategori
    - Test `computeChartData` pada array kosong menghasilkan labels dan data kosong
    - Test `showChartPlaceholder` menyembunyikan canvas dan menampilkan placeholder
    - _Requirements: 4.2, 4.5_

  - [ ]\* 9.3 Tulis property test untuk `chart.js` — Property 8
    - **Property 8: Agregasi Data Chart per Kategori** — for any array transaksi, `computeChartData` mengembalikan objek di mana setiap label kategori unik muncul tepat sekali dan nilai data pada index yang sesuai adalah jumlah tepat semua amount dalam kategori tersebut
    - **Validates: Requirements 4.2, 4.3**

- [ ] 10. Implementasi `src/formatting.js` — shared Rupiah formatter
  - Buat modul `src/formatting.js` yang mengekspor `formatRupiah(amount)` menggunakan `Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 2 })`
  - Update `src/transactions.js` untuk mengimpor `formatRupiah` dari modul ini
  - _Requirements: 2.1, 3.1, 3.2, 3.5_

  - [ ]\* 10.1 Tulis property test untuk formatting — Property 5
    - **Property 5: Format Rupiah Konsisten** — for any angka non-negatif, `formatRupiah(n)` mengembalikan string yang dimulai dengan "Rp", menggunakan titik sebagai pemisah ribuan, dan koma sebagai pemisah desimal dengan tepat dua angka di belakang koma
    - **Validates: Requirements 2.1, 3.1, 3.2**

- [ ] 11. Implementasi `style.css` — layout, theming, responsiveness
  - Definisikan CSS Custom Properties untuk warna tema di `:root` dan `[data-theme="dark"]`
  - Implementasikan layout utama: header dengan balance dan theme toggle, dua-kolom (form + list) untuk desktop, satu-kolom untuk mobile
  - Tambahkan styling untuk transaction list dengan scroll (`overflow-y: auto`, max-height), highlight kelas `.over-limit` (background merah muda / border merah)
  - Implementasikan responsif breakpoints: mobile (≤767px), tablet (768px–1023px), desktop (≥1024px)
  - _Requirements: 2.2, 8.3, 9.2, 9.3, 11.2_

- [ ] 12. Implementasi `src/app.js` — entry point dan event wiring
  - [ ] 12.1 Inisialisasi state dan `renderAll()`
    - Definisikan `state` object: `{ transactions, categories, spendingLimit, theme, sortKey }`
    - Muat state awal dari `loadAll()` (storage.js), merge `DEFAULT_CATEGORIES`
    - Implementasikan `renderAll()` yang memanggil: `renderTransactionList`, `renderBalance`, `renderChart`, `renderMonthlySummary`, `renderCategories`
    - Implementasikan setiap fungsi render yang memperbarui DOM secara langsung (innerHTML atau DOM API)
    - Panggil `detectInitialTheme()` dan `applyTheme()` pada startup
    - _Requirements: 1.1, 2.1, 2.4, 3.1, 3.5, 4.1, 5.1, 6.1, 7.1, 8.1, 9.1, 10.2_

  - [ ] 12.2 Wire semua DOM event listeners
    - `transactionForm 'submit'` → `clearErrors` → `validateTransaction` → `createTransaction` → push ke `state.transactions` → `saveAll` → `renderAll` → reset form
    - `deleteBtn 'click'` (event delegation) → `deleteTransaction` → update `state.transactions` → `saveAll` → `renderAll`
    - `addCategoryBtn 'click'` → `validateCategory` → `addCategory` → update `state.categories` → `saveAll` → `renderAll`
    - `sortSelect 'change'` → update `state.sortKey` → `renderAll`
    - `spendingLimitBtn 'click'` → `validateSpendingLimit` → update `state.spendingLimit` → `saveAll` → `renderAll`
    - `themeToggleBtn 'click'` → toggle `state.theme` → `applyTheme` → `saveAll` → `renderAll`
    - _Requirements: 1.2, 1.3, 1.4, 2.3, 4.2, 4.3, 5.2, 6.2, 6.3, 7.2, 7.3, 8.2, 8.4, 9.1, 9.4_

  - [ ] 12.3 Implementasikan validasi inline dan error display
    - Implementasikan `showFieldError(fieldId, message)` yang menyetel textContent pada `<span class="error-msg">` dan menambahkan class `input-error` ke field
    - Implementasikan `clearErrors()` yang menghapus semua pesan error dan class `input-error`
    - Pastikan `clearErrors()` dipanggil sebelum setiap validasi submit
    - _Requirements: 1.2, 1.5, 1.6, 5.3, 5.5, 5.6, 8.6_

- [ ] 13. Checkpoint akhir — integrasi dan verifikasi
  - Jalankan `npm run test:run` dan pastikan seluruh test suite lulus
  - Verifikasi secara manual di browser bahwa semua fitur berfungsi end-to-end: tambah transaksi, hapus, sort, kategori kustom, spending limit highlight, monthly summary, dark/light toggle, persistensi setelah reload
  - Tanyakan ke user jika ada pertanyaan atau penyesuaian yang diperlukan sebelum selesai.

## Notes

- Task bertanda `*` adalah opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap task mereferensikan requirements spesifik untuk traceability
- `src/formatting.js` dipisah dari `transactions.js` agar property test untuk formatting dapat diimpor secara independen
- Property-based tests menggunakan fast-check dengan minimum 100 iterasi per property
- Unit tests menggunakan Vitest dengan environment jsdom untuk simulasi DOM
- Urutan task memastikan tidak ada modul yang bergantung pada modul yang belum dibuat

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1", "5.1", "6.1", "7.1"] },
    {
      "id": 2,
      "tasks": [
        "2.2",
        "2.3",
        "3.2",
        "3.3",
        "4.2",
        "4.3",
        "5.2",
        "5.3",
        "6.2",
        "6.3",
        "7.2",
        "7.3"
      ]
    },
    { "id": 3, "tasks": ["9.1", "10"] },
    { "id": 4, "tasks": ["9.2", "9.3", "10.1", "11"] },
    { "id": 5, "tasks": ["12.1"] },
    { "id": 6, "tasks": ["12.2", "12.3"] }
  ]
}
```
