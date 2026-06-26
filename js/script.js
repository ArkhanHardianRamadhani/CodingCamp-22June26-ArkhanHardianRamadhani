/* ============================================================
   Expense & Budget Visualizer — script.js
   Vanilla JS, single file, no framework, no build step.
   ============================================================ */

// ── LocalStorage Keys ────────────────────────────────────────
const KEYS = {
  TRANSACTIONS: "ebv_transactions",
  CATEGORIES: "ebv_categories",
  SPENDING_LIMIT: "ebv_spending_limit",
  THEME: "ebv_theme",
};

// ── Default categories ────────────────────────────────────────
const DEFAULT_CATEGORIES = ["Food", "Transport", "Fun"];

// ── Chart color palette ───────────────────────────────────────
const CHART_COLORS = [
  "#4f6ef7",
  "#f7874f",
  "#4fcc7b",
  "#f7d44f",
  "#c44ff7",
  "#4fd7f7",
  "#f74f7e",
  "#a0f74f",
  "#f7a84f",
  "#4f8ef7",
];

// ── Rupiah formatter ─────────────────────────────────────────
const rupiahFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  minimumFractionDigits: 2,
});

function formatRupiah(amount) {
  return rupiahFormatter.format(amount);
}

// ── Safe JSON parse ───────────────────────────────────────────
function safeParse(jsonString, defaultValue) {
  try {
    const parsed = JSON.parse(jsonString);
    return parsed !== null && parsed !== undefined ? parsed : defaultValue;
  } catch {
    return defaultValue;
  }
}

// ── Storage: load all ────────────────────────────────────────
function loadAll() {
  try {
    const transactions = safeParse(localStorage.getItem(KEYS.TRANSACTIONS), []);
    const savedCategories = safeParse(
      localStorage.getItem(KEYS.CATEGORIES),
      [],
    );
    const spendingLimit = safeParse(
      localStorage.getItem(KEYS.SPENDING_LIMIT),
      null,
    );
    const theme = safeParse(localStorage.getItem(KEYS.THEME), null);

    // Merge saved custom categories with defaults (no duplicates, case-insensitive)
    const allCategories = [...DEFAULT_CATEGORIES];
    for (const cat of savedCategories) {
      if (!allCategories.some((c) => c.toLowerCase() === cat.toLowerCase())) {
        allCategories.push(cat);
      }
    }

    return {
      transactions: Array.isArray(transactions) ? transactions : [],
      categories: allCategories,
      spendingLimit: typeof spendingLimit === "number" ? spendingLimit : null,
      theme: theme === "dark" || theme === "light" ? theme : null,
    };
  } catch {
    return {
      transactions: [],
      categories: [...DEFAULT_CATEGORIES],
      spendingLimit: null,
      theme: null,
    };
  }
}

// ── Storage: save all ────────────────────────────────────────
function saveAll(state) {
  try {
    localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(state.transactions));
    // Save only the custom categories (those not in DEFAULT_CATEGORIES)
    const customCategories = state.categories.filter(
      (c) =>
        !DEFAULT_CATEGORIES.some((d) => d.toLowerCase() === c.toLowerCase()),
    );
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(customCategories));
    localStorage.setItem(
      KEYS.SPENDING_LIMIT,
      JSON.stringify(state.spendingLimit),
    );
    localStorage.setItem(KEYS.THEME, JSON.stringify(state.theme));
  } catch {
    // Silent fail — operate in-memory
  }
}

// ── Theme ─────────────────────────────────────────────────────
function detectInitialTheme(savedTheme) {
  if (savedTheme === "dark" || savedTheme === "light") return savedTheme;
  try {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches)
      return "dark";
  } catch {
    // ignore
  }
  return "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  const btn = document.getElementById("themeToggleBtn");
  if (btn) btn.textContent = theme === "dark" ? "☀️" : "🌙";
}

// ── Validation ────────────────────────────────────────────────
function validateTransaction(itemName, amount, category) {
  const errors = {};
  if (!itemName || itemName.trim() === "") {
    errors.itemName = "Item Name cannot be empty";
  }
  if (!amount || amount.trim() === "") {
    errors.amount = "Amount cannot be empty";
  } else if (isNaN(Number(amount)) || amount.trim() === "") {
    errors.amount = "Amount must be a valid number";
  } else if (Number(amount) <= 0) {
    errors.amount = "Amount must be greater than 0";
  }
  if (!category || category === "") {
    errors.category = "Category cannot be empty";
  }
  return { valid: Object.keys(errors).length === 0, errors };
}

function validateCategory(name, existingCategories) {
  if (!name || name.trim() === "") {
    return { valid: false, error: "Category name cannot be empty" };
  }
  if (name.trim().length > 50) {
    return {
      valid: false,
      error: "Category name must be 50 characters or fewer",
    };
  }
  if (
    existingCategories.some(
      (c) => c.toLowerCase() === name.trim().toLowerCase(),
    )
  ) {
    return { valid: false, error: "Category already exists" };
  }
  return { valid: true };
}

function validateSpendingLimit(value) {
  if (!value || value.trim() === "") {
    return { valid: false, error: "Limit cannot be empty" };
  }
  if (isNaN(Number(value))) {
    return { valid: false, error: "Limit must be a valid number" };
  }
  if (Number(value) <= 0) {
    return { valid: false, error: "Limit must be greater than 0" };
  }
  return { valid: true };
}

// ── Error display helpers ─────────────────────────────────────
function showFieldError(fieldId, message) {
  const errorEl = document.getElementById(fieldId + "-error");
  const inputEl = document.getElementById(fieldId);
  if (errorEl) errorEl.textContent = message;
  if (inputEl) inputEl.classList.add("input-error");
}

function clearErrors() {
  document
    .querySelectorAll(".error-msg")
    .forEach((el) => (el.textContent = ""));
  document
    .querySelectorAll(".input-error")
    .forEach((el) => el.classList.remove("input-error"));
}

// ── Transaction helpers ───────────────────────────────────────
function createTransaction(itemName, amount, category) {
  return {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Date.now().toString() + Math.random().toString(36).slice(2),
    itemName: itemName.trim(),
    amount: parseFloat(amount),
    category,
    date: new Date().toISOString(),
  };
}

function computeBalance(transactions) {
  const sum = transactions.reduce((acc, t) => acc + t.amount, 0);
  return Math.round(sum * 100) / 100;
}

function isOverLimit(transaction, limit) {
  return limit !== null && transaction.amount > limit;
}

function sortTransactions(transactions, key) {
  const arr = [...transactions];
  switch (key) {
    case "amount-asc":
      return arr.sort(
        (a, b) => a.amount - b.amount || a.itemName.localeCompare(b.itemName),
      );
    case "amount-desc":
      return arr.sort(
        (a, b) => b.amount - a.amount || a.itemName.localeCompare(b.itemName),
      );
    case "category-az":
      return arr.sort((a, b) => a.category.localeCompare(b.category));
    case "category-za":
      return arr.sort((a, b) => b.category.localeCompare(a.category));
    default:
      return arr; // insertion order
  }
}

// ── Monthly summary ───────────────────────────────────────────
function computeMonthlySummary(transactions) {
  const map = {};
  for (const t of transactions) {
    const d = new Date(t.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map[key]) {
      const label = new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }).format(d);
      map[key] = { key, label, total: 0 };
    }
    map[key].total += t.amount;
  }
  return Object.values(map).sort((a, b) => b.key.localeCompare(a.key));
}

// ── Chart ─────────────────────────────────────────────────────
let chartInstance = null;

function computeChartData(transactions) {
  const map = {};
  for (const t of transactions) {
    map[t.category] = (map[t.category] || 0) + t.amount;
  }
  const labels = Object.keys(map);
  const data = labels.map((l) => map[l]);
  const colors = labels.map((_, i) => CHART_COLORS[i % CHART_COLORS.length]);
  return { labels, data, colors };
}

function renderChart(transactions) {
  const canvas = document.getElementById("pieChart");
  const placeholder = document.getElementById("chartPlaceholder");

  if (transactions.length === 0) {
    if (canvas) canvas.style.display = "none";
    if (placeholder) placeholder.style.display = "block";
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    return;
  }

  if (canvas) canvas.style.display = "block";
  if (placeholder) placeholder.style.display = "none";

  if (typeof Chart === "undefined") return;

  const { labels, data, colors } = computeChartData(transactions);

  if (chartInstance) {
    chartInstance.data.labels = labels;
    chartInstance.data.datasets[0].data = data;
    chartInstance.data.datasets[0].backgroundColor = colors;
    chartInstance.update();
  } else {
    chartInstance = new Chart(canvas, {
      type: "pie",
      data: {
        labels,
        datasets: [{ data, backgroundColor: colors, borderWidth: 2 }],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color:
                getComputedStyle(document.documentElement)
                  .getPropertyValue("--color-text")
                  .trim() || "#212529",
              font: { size: 12 },
            },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${formatRupiah(ctx.parsed)}`,
            },
          },
        },
      },
    });
  }
}

// ── Render: category dropdown ─────────────────────────────────
function renderCategories(categories) {
  const select = document.getElementById("category");
  if (!select) return;
  const current = select.value;
  select.innerHTML = categories
    .map((c) => `<option value="${c}">${c}</option>`)
    .join("");
  // Restore selection if still valid
  if (categories.includes(current)) select.value = current;
}

// ── Render: transaction list ──────────────────────────────────
function renderTransactionList(transactions, sortKey, spendingLimit) {
  const container = document.getElementById("transactionList");
  if (!container) return;

  if (transactions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="empty-state-icon">📭</span>
        <p>No transactions yet</p>
        <p>Add an expense using the form on the left.</p>
      </div>`;
    return;
  }

  const sorted = sortTransactions(transactions, sortKey);
  container.innerHTML = sorted
    .map((t) => {
      const over = isOverLimit(t, spendingLimit);
      const date = new Date(t.date).toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      return `
        <div class="transaction-item${over ? " over-limit" : ""}" data-id="${t.id}">
          <div class="transaction-info">
            <div class="transaction-name">${escapeHtml(t.itemName)}</div>
            <div class="transaction-meta">
              <span class="category-badge">${escapeHtml(t.category)}</span>
              &nbsp;${date}
            </div>
          </div>
          <span class="transaction-amount">${formatRupiah(t.amount)}</span>
          <button class="btn btn-danger delete-btn" data-id="${t.id}" aria-label="Delete transaction">🗑</button>
        </div>`;
    })
    .join("");
}

// ── Render: balance ───────────────────────────────────────────
function renderBalance(transactions) {
  const el = document.getElementById("totalBalance");
  if (el) el.textContent = formatRupiah(computeBalance(transactions));
}

// ── Render: monthly summary ───────────────────────────────────
function renderMonthlySummary(transactions) {
  const container = document.getElementById("monthlySummary");
  if (!container) return;

  const rows = computeMonthlySummary(transactions);
  if (rows.length === 0) {
    container.innerHTML = `<p class="monthly-empty">No monthly summary data yet.</p>`;
    return;
  }
  container.innerHTML = rows
    .map(
      (r) => `
      <div class="monthly-row">
        <span class="monthly-label">${r.label}</span>
        <span class="monthly-total">${formatRupiah(r.total)}</span>
      </div>`,
    )
    .join("");
}

// ── Render: spending limit info ───────────────────────────────
function renderLimitInfo(spendingLimit) {
  const el = document.getElementById("currentLimitInfo");
  if (!el) return;
  el.textContent =
    spendingLimit !== null
      ? `Active limit: ${formatRupiah(spendingLimit)}`
      : "";
}

// ── Render all ────────────────────────────────────────────────
function renderAll() {
  renderTransactionList(state.transactions, state.sortKey, state.spendingLimit);
  renderBalance(state.transactions);
  renderChart(state.transactions);
  renderMonthlySummary(state.transactions);
  renderCategories(state.categories);
  renderLimitInfo(state.spendingLimit);
}

// ── Utility ───────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── App State ─────────────────────────────────────────────────
const loaded = loadAll();
const state = {
  transactions: loaded.transactions,
  categories: loaded.categories,
  spendingLimit: loaded.spendingLimit,
  theme: detectInitialTheme(loaded.theme),
  sortKey: "default",
};

// ── Init ──────────────────────────────────────────────────────
applyTheme(state.theme);
renderAll();

// ── Event: add transaction ────────────────────────────────────
document.getElementById("transactionForm").addEventListener("submit", (e) => {
  e.preventDefault();
  clearErrors();

  const itemName = document.getElementById("itemName").value;
  const amount = document.getElementById("amount").value;
  const category = document.getElementById("category").value;

  const { valid, errors } = validateTransaction(itemName, amount, category);

  if (!valid) {
    if (errors.itemName) showFieldError("itemName", errors.itemName);
    if (errors.amount) showFieldError("amount", errors.amount);
    if (errors.category) showFieldError("category", errors.category);
    return;
  }

  const transaction = createTransaction(itemName, amount, category);
  state.transactions.push(transaction);
  saveAll(state);
  renderAll();

  // Reset form
  document.getElementById("itemName").value = "";
  document.getElementById("amount").value = "";
  document.getElementById("category").selectedIndex = 0;
});

// ── Event: delete transaction (event delegation) ──────────────
document.getElementById("transactionList").addEventListener("click", (e) => {
  const btn = e.target.closest(".delete-btn");
  if (!btn) return;
  const id = btn.dataset.id;
  state.transactions = state.transactions.filter((t) => t.id !== id);
  saveAll(state);
  renderAll();
});

// ── Event: add custom category ────────────────────────────────
document.getElementById("addCategoryBtn").addEventListener("click", () => {
  const input = document.getElementById("newCategoryInput");
  const errorEl = document.getElementById("category-custom-error");
  const name = input.value;

  if (errorEl) errorEl.textContent = "";
  input.classList.remove("input-error");

  const { valid, error } = validateCategory(name, state.categories);
  if (!valid) {
    if (errorEl) errorEl.textContent = error;
    input.classList.add("input-error");
    return;
  }

  state.categories.push(name.trim());
  saveAll(state);
  renderAll();
  input.value = "";
});

// ── Event: sort ───────────────────────────────────────────────
document.getElementById("sortSelect").addEventListener("change", (e) => {
  state.sortKey = e.target.value;
  renderTransactionList(state.transactions, state.sortKey, state.spendingLimit);
});

// ── Event: spending limit ─────────────────────────────────────
document.getElementById("spendingLimitBtn").addEventListener("click", () => {
  const input = document.getElementById("spendingLimitInput");
  const errorEl = document.getElementById("spending-limit-error");
  const value = input.value;

  if (errorEl) errorEl.textContent = "";
  input.classList.remove("input-error");

  const { valid, error } = validateSpendingLimit(value);
  if (!valid) {
    if (errorEl) errorEl.textContent = error;
    input.classList.add("input-error");
    return;
  }

  state.spendingLimit = parseFloat(value);
  saveAll(state);
  renderAll();
  input.value = "";
});

// ── Event: reset spending limit ───────────────────────────────
document.getElementById("resetLimitBtn").addEventListener("click", () => {
  state.spendingLimit = null;
  document.getElementById("spendingLimitInput").value = "";
  const errorEl = document.getElementById("spending-limit-error");
  if (errorEl) errorEl.textContent = "";
  document.getElementById("spendingLimitInput").classList.remove("input-error");
  saveAll(state);
  renderAll();
});

// ── Event: theme toggle ───────────────────────────────────────
document.getElementById("themeToggleBtn").addEventListener("click", () => {
  state.theme = state.theme === "dark" ? "light" : "dark";
  applyTheme(state.theme);
  saveAll(state);
  // Update chart legend color after theme switch
  if (chartInstance) {
    chartInstance.options.plugins.legend.labels.color = getComputedStyle(
      document.documentElement,
    )
      .getPropertyValue("--color-text")
      .trim();
    chartInstance.update();
  }
});
