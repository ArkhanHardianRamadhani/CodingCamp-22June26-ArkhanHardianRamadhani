# Design Document: Expense & Budget Visualizer

## Overview

Expense & Budget Visualizer adalah aplikasi web single-page (SPA) yang dibangun sepenuhnya dengan HTML, CSS, dan Vanilla JavaScript tanpa framework. Aplikasi memungkinkan pengguna mencatat transaksi pengeluaran, mengkategorikannya, memvisualisasikannya melalui pie chart, dan memantau ringkasan bulanan — semuanya tersimpan di browser LocalStorage.

Pendekatan arsitektur yang dipilih adalah **Module Pattern** berbasis ES Modules (tanpa build tool), dengan pemisahan tanggung jawab yang jelas antara lapisan data, logika bisnis, dan tampilan UI. Ini memastikan testability, maintainability, dan tidak membutuhkan server atau bundler.

**Key Design Decisions:**

- **No framework**: Vanilla JS dengan ES Modules — zero dependency build step, kompatibel langsung via `<script type="module">`.
- **Chart.js via CDN**: Diimpor dari jsDelivr CDN untuk menghindari npm/bundler. Instance chart disimpan dalam modul dan di-update via `chart.data = ... ; chart.update()` (bukan destroy+recreate) untuk performa lebih baik.
- **Rupiah formatting**: Menggunakan `Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" })` yang tersedia secara native di semua browser target — menghasilkan format `"Rp 20.000,00"`.
- **Event-driven UI updates**: Setiap mutasi data memanggil satu fungsi `renderAll()` terpusat yang memperbarui semua komponen (list, balance, chart, monthly summary) atomically.
- **CSS Custom Properties** untuk theming — beralih antara dark/light hanya dengan mengganti attribute `data-theme` pada `<html>`.

---

## Architecture

Aplikasi mengikuti pola **layered architecture** dalam satu halaman HTML:

```
index.html
├── CSS (style.css) — layout, theming, responsiveness
└── JS (type="module")
    ├── storage.js      — LocalStorage read/write abstraction
    ├── validation.js   — pure validation functions
    ├── transactions.js — business logic: add, delete, sort, filter
    ├── categories.js   — category management
    ├── chart.js        — Chart.js wrapper & data aggregation
    ├── summary.js      — monthly summary computation
    ├── theme.js        — dark/light theme management
    └── app.js          — entry point: wires DOM events → modules → renderAll()
```

### Data Flow

```
User Action (DOM Event)
        │
        ▼
   app.js handler
        │
   ┌────┴────────┐
   │  Validation  │  (validation.js)
   └────┬────────┘
        │ valid
        ▼
   Business Logic  (transactions.js / categories.js / theme.js)
        │
        ▼
   Storage Sync    (storage.js → LocalStorage)
        │
        ▼
   renderAll()     (app.js → updates DOM, chart, summary)
```

### Rendering Strategy

`renderAll()` adalah fungsi tunggal yang dipanggil setelah setiap mutasi state:

```
renderAll()
  ├── renderTransactionList(state.transactions, state.sortKey, state.spendingLimit)
  ├── renderBalance(state.transactions)
  ├── renderChart(state.transactions)
  ├── renderMonthlySummary(state.transactions)
  └── renderCategories(state.categories)
```

Pendekatan ini menghindari stale state dan menyederhanakan debugging — tidak ada partial update yang bisa tidak konsisten.

---

## Components and Interfaces

### 1. `storage.js` — LocalStorage Abstraction

```javascript
// Keys
const KEYS = {
  TRANSACTIONS: 'ebv_transactions',
  CATEGORIES:   'ebv_categories',
  SPENDING_LIMIT: 'ebv_spending_limit',
  THEME:        'ebv_theme',
};

/**
 * @returns {object} { transactions, categories, spendingLimit, theme }
 */
function loadAll(): AppState

/**
 * Saves entire app state to LocalStorage.
 * On failure (storage unavailable / quota exceeded), fails silently.
 */
function saveAll(state: AppState): void

/**
 * Safely parses a JSON string.
 * @returns parsed value, or defaultValue on any error
 */
function safeParse(jsonString: string, defaultValue: any): any
```

**Graceful degradation**: Semua operasi storage dibungkus `try/catch`. Jika LocalStorage tidak tersedia (Requirement 9.6), app tetap berjalan dengan state in-memory dan tidak menampilkan error ke user.

---

### 2. `validation.js` — Pure Validation Functions

```javascript
/**
 * Validates transaction form inputs.
 * @returns { valid: boolean, errors: { itemName?, amount?, category? } }
 */
function validateTransaction(itemName: string, amount: string, category: string): ValidationResult

/**
 * Validates a category name.
 * @returns { valid: boolean, error?: string }
 */
function validateCategory(name: string, existingCategories: string[]): ValidationResult

/**
 * Validates spending limit input.
 * @returns { valid: boolean, error?: string }
 */
function validateSpendingLimit(value: string): ValidationResult
```

Semua fungsi ini adalah **pure functions** (tanpa side effects), memudahkan unit testing.

---

### 3. `transactions.js` — Transaction Business Logic

```javascript
/**
 * Creates a new transaction object.
 */
function createTransaction(itemName: string, amount: number, category: string): Transaction

/**
 * Removes a transaction by ID from array.
 * @returns new array (immutable)
 */
function deleteTransaction(transactions: Transaction[], id: string): Transaction[]

/**
 * Sorts transactions by given key.
 * Tie-breaker: itemName A-Z for amount sorts (Requirement 7.5).
 * @param key 'default' | 'amount-asc' | 'amount-desc' | 'category-az' | 'category-za'
 */
function sortTransactions(transactions: Transaction[], key: SortKey): Transaction[]

/**
 * Computes total balance.
 * @returns sum of all transaction amounts
 */
function computeBalance(transactions: Transaction[]): number

/**
 * Determines if a transaction exceeds the spending limit.
 */
function isOverLimit(transaction: Transaction, limit: number | null): boolean
```

---

### 4. `categories.js` — Category Management

```javascript
const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun'];

/**
 * Adds a new category if valid and not duplicate (case-insensitive).
 * @returns { categories: string[], error?: string }
 */
function addCategory(categories: string[], name: string): AddCategoryResult
```

---

### 5. `chart.js` — Chart.js Wrapper

```javascript
/**
 * Initializes the Chart.js pie chart on first call.
 * On subsequent calls, updates data in-place via chart.update().
 */
function renderChart(transactions: Transaction[]): void

/**
 * Aggregates transaction amounts by category.
 * @returns { labels: string[], data: number[], colors: string[] }
 */
function computeChartData(transactions: Transaction[]): ChartData

/**
 * Hides chart canvas, shows placeholder text.
 * Called when transactions array is empty.
 */
function showChartPlaceholder(): void
```

**Chart update strategy**: Menyimpan referensi `Chart` instance dalam closure modul. Update menggunakan:

```javascript
chartInstance.data.labels = newLabels;
chartInstance.data.datasets[0].data = newData;
chartInstance.update();
```

Ini lebih performant daripada destroy+recreate karena menghindari re-initialization animasi.

---

### 6. `summary.js` — Monthly Summary

```javascript
/**
 * Groups transactions by year-month, sums amounts.
 * @returns array sorted newest-first (Requirement 6.5)
 * @example [{ label: "Januari 2025", total: 150000 }, ...]
 */
function computeMonthlySummary(transactions: Transaction[]): MonthlySummaryRow[]

/**
 * Formats a Date into "MMMM YYYY" Indonesian locale string.
 * Uses Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" })
 */
function formatMonthYear(date: Date): string
```

---

### 7. `theme.js` — Theme Management

```javascript
/**
 * Applies theme by setting data-theme attribute on <html>.
 * @param theme 'dark' | 'light'
 */
function applyTheme(theme: 'dark' | 'light'): void

/**
 * Detects preferred theme: LocalStorage → prefers-color-scheme → 'light'.
 */
function detectInitialTheme(): 'dark' | 'light'
```

---

### 8. `app.js` — Entry Point & Event Wiring

```javascript
// Application state (in-memory, synced to/from LocalStorage)
const state = {
  transactions: Transaction[],
  categories: string[],
  spendingLimit: number | null,
  theme: 'dark' | 'light',
  sortKey: SortKey,
};

// Called after every mutation
function renderAll(): void

// DOM event listeners:
// - transactionForm 'submit' → validateTransaction → createTransaction → saveAll → renderAll
// - deleteBtn 'click' → deleteTransaction → saveAll → renderAll
// - addCategoryBtn 'click' → validateCategory → addCategory → saveAll → renderAll
// - sortSelect 'change' → update state.sortKey → renderAll
// - spendingLimitBtn 'click' → validateSpendingLimit → saveAll → renderAll
// - themeToggleBtn 'click' → applyTheme → saveAll → renderAll
```

---

## Data Models

### Transaction

```typescript
interface Transaction {
  id: string; // crypto.randomUUID() or Date.now().toString()
  itemName: string; // max 100 chars
  amount: number; // positive float, stored in Rupiah
  category: string; // must match an existing category
  date: string; // ISO 8601 string, e.g. "2025-01-15T10:30:00.000Z"
}
```

### AppState (in-memory + LocalStorage)

```typescript
interface AppState {
  transactions: Transaction[]; // key: 'ebv_transactions'
  categories: string[]; // key: 'ebv_categories'  — merged with DEFAULT_CATEGORIES on load
  spendingLimit: number | null; // key: 'ebv_spending_limit'
  theme: "dark" | "light"; // key: 'ebv_theme'
}
```

### LocalStorage Keys

| Key                  | Type                         | Default                              |
| -------------------- | ---------------------------- | ------------------------------------ |
| `ebv_transactions`   | `Transaction[]` (JSON)       | `[]`                                 |
| `ebv_categories`     | `string[]` (JSON)            | `[]` (merged with defaults)          |
| `ebv_spending_limit` | `number` (JSON)              | `null`                               |
| `ebv_theme`          | `"dark"` \| `"light"` (JSON) | detected from `prefers-color-scheme` |

### MonthlySummaryRow

```typescript
interface MonthlySummaryRow {
  key: string; // "2025-01" — used for sorting
  label: string; // "Januari 2025" — displayed to user
  total: number; // sum of transaction amounts in that month
}
```

### SortKey

```typescript
type SortKey =
  | "default"
  | "amount-asc"
  | "amount-desc"
  | "category-az"
  | "category-za";
```

### Rupiah Formatting

Semua tampilan mata uang menggunakan satu shared utility:

```javascript
const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 2,
});

function formatRupiah(amount) {
  return rupiahFormatter.format(amount); // → "Rp 14.500,00"
}
```

> **Research Finding**: `Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" })` menghasilkan `"Rp 14.500,00"` di semua browser target (Chrome, Firefox, Edge, Safari) — format yang sesuai dengan Requirement 2.1 dan 3.2. [Source: gist.github.com/BennoAlif](https://gist.github.com/BennoAlif/e07953f68261b3ff843a722053dfa335)

---

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Validasi Form — Field Kosong Terdeteksi

_For any_ kombinasi field form (itemName, amount, category) di mana setidaknya satu field kosong, fungsi `validateTransaction` harus mengembalikan `valid: false` dan objek `errors` yang secara eksplisit menyebutkan setiap field yang kosong.

**Validates: Requirements 1.2**

---

### Property 2: Transaksi Valid Masuk ke Daftar dan Storage

_For any_ kombinasi input valid (itemName non-kosong ≤100 char, amount > 0, category yang ada), menambahkan transaksi harus meningkatkan panjang array transaksi sebesar tepat 1 dan transaksi tersebut harus dapat diambil kembali dari storage.

**Validates: Requirements 1.3, 10.1**

---

### Property 3: Validasi Amount — Non-Positif Ditolak

_For any_ nilai amount yang kurang dari atau sama dengan nol, `validateTransaction` harus mengembalikan `valid: false` dengan pesan error yang mengandung "Amount harus lebih dari 0".

**Validates: Requirements 1.5**

---

### Property 4: Validasi Amount — Non-Numerik Ditolak

_For any_ string yang bukan representasi angka yang valid (setelah trim), `validateTransaction` harus mengembalikan `valid: false` dengan pesan error yang mengandung "Amount harus berupa angka valid".

**Validates: Requirements 1.6**

---

### Property 5: Format Rupiah Konsisten

_For any_ angka non-negatif, `formatRupiah(n)` harus mengembalikan string yang dimulai dengan "Rp", menggunakan titik sebagai pemisah ribuan, dan koma sebagai pemisah desimal dengan tepat dua angka di belakang koma.

**Validates: Requirements 2.1, 3.1, 3.2**

---

### Property 6: Penghapusan Transaksi — Konsistensi Data

_For any_ array transaksi dan any transaksi yang ada di dalamnya, setelah menghapus transaksi tersebut, transaksi yang dihapus tidak boleh ada lagi di array hasil, dan `computeBalance` pada array hasil harus sama dengan balance sebelumnya dikurangi amount transaksi yang dihapus.

**Validates: Requirements 2.3, 3.4**

---

### Property 7: Komputasi Balance — Penjumlahan Akurat

_For any_ array transaksi, `computeBalance(transactions)` harus mengembalikan nilai yang tepat sama dengan hasil penjumlahan aritmatika semua `transaction.amount` dalam array (sum yang dibulatkan ke dua desimal untuk menghindari floating-point drift).

**Validates: Requirements 3.1, 3.3**

---

### Property 8: Agregasi Data Chart per Kategori

_For any_ array transaksi, `computeChartData(transactions)` harus mengembalikan objek di mana setiap label kategori unik muncul tepat sekali, dan nilai data pada index yang sesuai adalah jumlah tepat dari semua amount transaksi dalam kategori tersebut.

**Validates: Requirements 4.2, 4.3**

---

### Property 9: Kategori Baru Muncul di Dropdown

_For any_ nama kategori yang valid (non-kosong setelah trim, ≤50 karakter, belum ada sebelumnya), setelah `addCategory` dipanggil, nama kategori tersebut harus ada dalam array kategori yang diperbarui.

**Validates: Requirements 5.2**

---

### Property 10: Duplikat Kategori Ditolak (Case-Insensitive)

_For any_ nama kategori yang sudah ada dalam daftar kategori, mencoba menambahkan varian case apa pun dari nama tersebut harus dikembalikan dengan error "Kategori sudah ada" dan array kategori tidak boleh berubah panjangnya.

**Validates: Requirements 5.3**

---

### Property 11: Validasi Nama Kategori — Whitespace dan Panjang

_For any_ string yang kosong, hanya berisi spasi, atau memiliki panjang > 50 karakter, `validateCategory` harus mengembalikan `valid: false` dengan pesan error yang sesuai. (Dua kriteria ini digabungkan karena keduanya diuji pada fungsi validasi yang sama dengan generator input yang sama.)

**Validates: Requirements 5.5, 5.6**

---

### Property 12: Round-Trip Persistensi Kategori Kustom

_For any_ array nama kategori yang valid, menyimpannya ke storage dan kemudian memuatnya kembali harus menghasilkan array yang ekuivalen (elemen yang sama dalam urutan yang sama).

**Validates: Requirements 5.4**

---

### Property 13: Komputasi Monthly Summary — Pengelompokan dan Urutan

_For any_ array transaksi yang mencakup beberapa bulan berbeda, `computeMonthlySummary` harus (a) mengelompokkan transaksi per kombinasi bulan+tahun dengan total yang tepat, dan (b) mengurutkan hasilnya dari bulan terbaru ke terlama (descending by year-month key).

**Validates: Requirements 6.1, 6.5**

---

### Property 14: Pengurutan Transaksi — Invariant Urutan Terpenuhi

_For any_ array transaksi dan any `SortKey` yang valid, `sortTransactions(transactions, key)` harus mengembalikan array yang memenuhi invariant urutan yang sesuai: (amount-asc: setiap elemen ≤ elemen berikutnya berdasarkan amount; amount-desc: ≥; category-az/za: lexicographic sesuai arah), dengan tie-breaking menggunakan itemName A-Z untuk sort berbasis amount.

**Validates: Requirements 7.2, 7.5**

---

### Property 15: Spending Limit — Prediksi Highlight Tepat

_For any_ transaksi dan any nilai SpendingLimit positif, `isOverLimit(transaction, limit)` harus mengembalikan `true` jika dan hanya jika `transaction.amount > limit`, dan `false` untuk semua kasus lainnya termasuk `limit === null`.

**Validates: Requirements 8.3, 8.5**

---

### Property 16: Round-Trip Persistensi Transaksi

_For any_ array objek `Transaction` yang valid, serialisasi ke JSON dan deserialisasi kembali harus menghasilkan array yang secara struktural identik (semua field terjaga dengan tipe yang benar).

**Validates: Requirements 10.1, 10.2**

---

### Property 17: Pemulihan Graceful dari Data Storage Corrupt

_For any_ string yang tidak dapat di-parse sebagai JSON valid (termasuk string kosong, terpotong, karakter invalid), `safeParse(string, defaultValue)` harus mengembalikan `defaultValue` tanpa melemparkan exception.

**Validates: Requirements 10.4**

---

### Property 18: Penerapan Theme — Class CSS Konsisten

_For any_ nilai theme ('dark' atau 'light'), setelah `applyTheme(theme)` dipanggil, elemen `<html>` harus memiliki `data-theme` attribute yang tepat sama dengan nilai yang diberikan, dan tidak memiliki attribute `data-theme` yang berlawanan.

**Validates: Requirements 9.2, 9.3, 9.4**

---

## Error Handling

### Validation Errors

Semua error validasi ditampilkan **inline** di bawah field yang bermasalah, bukan sebagai alert/toast global. Ini diimplementasikan dengan:

```javascript
// Setiap field memiliki pasangan <span class="error-msg"> di bawahnya
function showFieldError(fieldId, message) {
  document.getElementById(fieldId + "-error").textContent = message;
  document.getElementById(fieldId).classList.add("input-error");
}

function clearErrors() {
  document
    .querySelectorAll(".error-msg")
    .forEach((el) => (el.textContent = ""));
  document
    .querySelectorAll(".input-error")
    .forEach((el) => el.classList.remove("input-error"));
}
```

Form memanggil `clearErrors()` sebelum validasi setiap submit.

### LocalStorage Failures

Tiga skenario failure ditangani:

| Skenario                                      | Handling                                                                      |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| LocalStorage tidak tersedia (`SecurityError`) | `try/catch` di `storage.js` — app berjalan in-memory, tidak ada error ke user |
| JSON corrupt saat load                        | `safeParse()` mengembalikan default value                                     |
| QuotaExceededError saat save                  | `try/catch` — gagal diam-diam (silent fail), data tetap di memory             |

### Chart.js Initialization

Jika Canvas API tidak tersedia atau Chart.js gagal load dari CDN:

```javascript
// Cek ketersediaan Chart sebelum render
if (typeof Chart === "undefined") {
  showChartPlaceholder();
  return;
}
```

### Floating-Point Arithmetic

Amount disimpan sebagai `number` JavaScript. Untuk menghindari floating-point drift pada komputasi balance:

```javascript
function computeBalance(transactions) {
  const sum = transactions.reduce((acc, t) => acc + t.amount, 0);
  return Math.round(sum * 100) / 100; // round ke 2 desimal
}
```

---

## Testing Strategy

### Dual Testing Approach

Pengujian menggunakan dua lapisan komplementer:

1. **Unit tests (example-based)**: Untuk perilaku spesifik, edge case, integrasi komponen
2. **Property-based tests (PBT)**: Untuk properti universal di atas (Property 1–18)

### Library & Tools

| Concern                | Tool                                                                |
| ---------------------- | ------------------------------------------------------------------- |
| Unit & PBT runner      | **Vitest** (zero-config, native ES Modules support)                 |
| Property-based testing | **fast-check** (tersedia via npm, tidak perlu build untuk test env) |
| DOM testing            | **jsdom** (via Vitest environment)                                  |
| Coverage               | Vitest `--coverage` (c8/v8)                                         |

> **Justification**: Vitest dipilih karena mendukung ES Modules natively (sesuai arsitektur app), dan fast-check adalah library PBT paling matang untuk JavaScript/TypeScript dengan excellent support untuk arbitrary generators.

### Unit Test Coverage Targets

Fungsi yang ditest dengan example-based tests:

- **Form rendering**: Form input fields exist (Req 1.1)
- **Empty state**: "Belum ada transaksi" displayed (Req 2.4)
- **Zero balance**: Balance shown as "Rp 0,00" on empty state (Req 3.5)
- **Chart empty**: Chart hidden, placeholder shown (Req 4.5)
- **Sort default**: Insertion order preserved without sort key (Req 7.4)
- **Category UI**: Add category input & button exist (Req 5.1)
- **Spending limit UI**: Input & button exist (Req 8.1)
- **Theme toggle UI**: Button exists in header (Req 9.1)
- **System theme detection**: `detectInitialTheme()` uses `prefers-color-scheme` when no storage (Req 9.5)
- **App init loads all data**: All state keys loaded on startup (Req 10.2)
- **Transaction date**: New transaction has date close to `Date.now()` (Req 6.4)

### Property-Based Test Configuration

```javascript
// vitest.config.js
export default {
  test: {
    environment: "jsdom",
    globals: true,
  },
};
```

Setiap property test:

- Minimum **100 iterasi** (fast-check default: 100)
- Diberi tag komentar referensi ke property desain
- Format tag: `// Feature: expense-budget-visualizer, Property {N}: {property_text}`

**Contoh implementasi property test:**

```javascript
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { computeBalance } from "../src/transactions.js";

describe("Property 7: Balance Computation", () => {
  it("equals exact arithmetic sum of all amounts", () => {
    // Feature: expense-budget-visualizer, Property 7: computeBalance equals arithmetic sum
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.string(),
            itemName: fc.string({ minLength: 1 }),
            amount: fc.float({ min: 0.01, max: 1_000_000, noNaN: true }),
            category: fc.constantFrom("Food", "Transport", "Fun"),
            date: fc.string(),
          }),
        ),
        (transactions) => {
          const expected =
            Math.round(transactions.reduce((s, t) => s + t.amount, 0) * 100) /
            100;
          expect(computeBalance(transactions)).toBeCloseTo(expected, 2);
        },
      ),
      { numRuns: 100 },
    );
  });
});
```

### Responsiveness & Browser Compatibility

Requirement 11.1 dan 11.2 (cross-browser, responsive) ditangani dengan:

- **Manual testing**: Checklist di Chrome, Firefox, Edge, Safari pada viewport 360px, 768px, 1280px
- **CSS**: Flexbox dan CSS Grid dengan fallback, tidak ada CSS yang membutuhkan prefix vendor di semua browser target modern
- **No polyfills needed**: `Intl.NumberFormat`, `Intl.DateTimeFormat`, `crypto.randomUUID()`, dan `prefers-color-scheme` semuanya tersedia di semua browser target dalam 12 bulan terakhir

### Test File Structure

```
tests/
├── unit/
│   ├── storage.test.js
│   ├── validation.test.js
│   ├── transactions.test.js
│   ├── categories.test.js
│   ├── summary.test.js
│   └── theme.test.js
└── property/
    ├── validation.property.test.js   (Properties 1, 3, 4, 11)
    ├── transactions.property.test.js (Properties 2, 6, 7, 14, 15)
    ├── formatting.property.test.js   (Property 5)
    ├── chart.property.test.js        (Property 8)
    ├── categories.property.test.js   (Properties 9, 10, 12)
    ├── summary.property.test.js      (Property 13)
    ├── storage.property.test.js      (Properties 16, 17)
    └── theme.property.test.js        (Property 18)
```
