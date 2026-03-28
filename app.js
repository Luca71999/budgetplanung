const STORAGE_KEY = "budget-plan-v1";
const defaultCategories = [
  { key: "food", name: "Essen", description: "Lebensmittel, Baeckerei, Supermarkt", percent: 45 },
  { key: "drugstore", name: "Drogerie", description: "Haushalt, Hygiene, Pflege", percent: 15 },
  { key: "leisure", name: "Freizeit", description: "Cafe, Ausgehen, Hobbys", percent: 15 },
  { key: "savings", name: "Sparen", description: "Ruecklagen und Ziele", percent: 25 },
];

const defaultState = {
  personName: "",
  monthName: "",
  currentBalance: 0,
  lastBackupAt: "",
  bufferPercent: 10,
  incomes: [
    { label: "Gehalt", amount: 0 },
  ],
  expenses: [
    { label: "Miete", amount: 0 },
    { label: "Strom / Internet", amount: 0 },
  ],
  categories: structuredClone(defaultCategories),
};

const personNameInput = document.querySelector("#personName");
const monthNameInput = document.querySelector("#monthName");
const currentBalanceInput = document.querySelector("#currentBalance");
const bufferPercentInput = document.querySelector("#bufferPercent");
const incomeList = document.querySelector("#incomeList");
const expenseList = document.querySelector("#expenseList");
const categoryList = document.querySelector("#categoryList");
const addIncomeBtn = document.querySelector("#addIncomeBtn");
const addExpenseBtn = document.querySelector("#addExpenseBtn");
const exportBtn = document.querySelector("#exportBtn");
const importFileInput = document.querySelector("#importFile");
const entryTemplate = document.querySelector("#entryTemplate");
const categoryTemplate = document.querySelector("#categoryTemplate");
const allocationTemplate = document.querySelector("#allocationTemplate");

const totalIncomeOutput = document.querySelector("#totalIncome");
const totalExpensesOutput = document.querySelector("#totalExpenses");
const bufferAmountOutput = document.querySelector("#bufferAmount");
const remainingBudgetOutput = document.querySelector("#remainingBudget");
const balanceNowOutput = document.querySelector("#balanceNow");
const projectedBalanceOutput = document.querySelector("#projectedBalance");
const foodMonthlyOutput = document.querySelector("#foodMonthly");
const foodWeeklyOutput = document.querySelector("#foodWeekly");
const foodDailyOutput = document.querySelector("#foodDaily");
const budgetHintOutput = document.querySelector("#budgetHint");
const personalMessageOutput = document.querySelector("#personalMessage");
const allocationGrid = document.querySelector("#allocationGrid");
const allocationHintOutput = document.querySelector("#allocationHint");
const debtReductionOutput = document.querySelector("#debtReduction");
const monthsToZeroOutput = document.querySelector("#monthsToZero");
const stabilityHintOutput = document.querySelector("#stabilityHint");
const backupHintOutput = document.querySelector("#backupHint");
const backupStatusOutput = document.querySelector("#backupStatus");

let state = loadState();

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      return structuredClone(defaultState);
    }

    const parsed = JSON.parse(saved);
    return {
      personName: parsed.personName || "",
      monthName: parsed.monthName || "",
      currentBalance: Number.isFinite(Number(parsed.currentBalance)) ? Number(parsed.currentBalance) : 0,
      lastBackupAt: parsed.lastBackupAt || "",
      bufferPercent: Number.isFinite(Number(parsed.bufferPercent)) ? Number(parsed.bufferPercent) : 10,
      incomes: Array.isArray(parsed.incomes) && parsed.incomes.length ? parsed.incomes : structuredClone(defaultState.incomes),
      expenses: Array.isArray(parsed.expenses) && parsed.expenses.length ? parsed.expenses : structuredClone(defaultState.expenses),
      categories: normalizeCategories(parsed.categories),
    };
  } catch (error) {
    return structuredClone(defaultState);
  }
}

function normalizeCategories(categories) {
  if (!Array.isArray(categories) || !categories.length) {
    return structuredClone(defaultCategories);
  }

  return defaultCategories.map((category) => {
    const savedCategory = categories.find((item) => item && item.key === category.key);
    return {
      ...category,
      percent: savedCategory ? sanitizeAmount(savedCategory.percent) : category.percent,
    };
  });
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function buildExportData() {
  const exportedAt = new Date().toISOString();
  return {
    version: 1,
    exportedAt,
    state: {
      ...state,
      lastBackupAt: exportedAt,
    },
  };
}

function downloadBackup() {
  const exportData = buildExportData();
  const fileContent = JSON.stringify(exportData, null, 2);
  const blob = new Blob([fileContent], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const safeMonth = (state.monthName || "budgetplan").trim().replace(/\s+/g, "-").toLowerCase();

  link.href = url;
  link.download = safeMonth + "-backup.json";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  state.lastBackupAt = exportData.exportedAt;
  saveState();
  renderBackupStatus();
  backupHintOutput.textContent = "Backup-Datei wurde erstellt. Auf dem iPhone kannst du sie in Dateien sichern.";
}

function importBackupFile(file) {
  if (!file) {
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const importedState = parsed && parsed.state ? parsed.state : parsed;

      state = {
        personName: importedState.personName || "",
        monthName: importedState.monthName || "",
        currentBalance: Number.isFinite(Number(importedState.currentBalance)) ? Number(importedState.currentBalance) : 0,
        lastBackupAt: importedState.lastBackupAt || parsed.exportedAt || new Date().toISOString(),
        bufferPercent: Number.isFinite(Number(importedState.bufferPercent)) ? Number(importedState.bufferPercent) : 10,
        incomes: Array.isArray(importedState.incomes) && importedState.incomes.length ? importedState.incomes : structuredClone(defaultState.incomes),
        expenses: Array.isArray(importedState.expenses) && importedState.expenses.length ? importedState.expenses : structuredClone(defaultState.expenses),
        categories: normalizeCategories(importedState.categories),
      };

      saveState();
      render();
      backupHintOutput.textContent = "Backup erfolgreich importiert.";
    } catch (error) {
      backupHintOutput.textContent = "Die Datei konnte nicht gelesen werden. Bitte nutze eine gueltige Backup-Datei.";
    }
  };

  reader.readAsText(file);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatDateTime(value) {
  if (!value) {
    return "Noch kein Backup gespeichert.";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Letztes Backup: Unbekannt";
  }

  return "Letztes Backup: " + new Intl.DateTimeFormat("de-DE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function sanitizeAmount(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 0 ? numeric : 0;
}

function sanitizeBalance(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function createEntryRow(type, item, index) {
  const fragment = entryTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".entry-row");
  const labelInput = fragment.querySelector('[data-role="label"]');
  const amountInput = fragment.querySelector('[data-role="amount"]');
  const removeButton = fragment.querySelector('[data-role="remove"]');

  labelInput.value = item.label;
  amountInput.value = item.amount || "";

  labelInput.addEventListener("input", (event) => {
    state[type][index].label = event.target.value;
    saveState();
  });

  amountInput.addEventListener("input", (event) => {
    state[type][index].amount = sanitizeAmount(event.target.value);
    saveState();
    renderSummary();
  });

  removeButton.addEventListener("click", () => {
    if (state[type].length === 1) {
      state[type][0] = { label: "", amount: 0 };
    } else {
      state[type].splice(index, 1);
    }

    saveState();
    render();
  });

  return row;
}

function createCategoryRow(category, index, availableBudget) {
  const fragment = categoryTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".category-row");
  const nameOutput = fragment.querySelector('[data-role="category-name"]');
  const descriptionOutput = fragment.querySelector('[data-role="category-description"]');
  const percentInput = fragment.querySelector('[data-role="category-percent"]');
  const monthlyOutput = fragment.querySelector('[data-role="category-monthly"]');
  const dailyOutput = fragment.querySelector('[data-role="category-daily"]');

  const percent = sanitizeAmount(category.percent);
  const monthlyBudget = availableBudget * (percent / 100);

  nameOutput.textContent = category.name;
  descriptionOutput.textContent = category.description;
  percentInput.value = percent;
  monthlyOutput.textContent = formatCurrency(monthlyBudget) + " / Monat";
  dailyOutput.textContent = formatCurrency(monthlyBudget / 30) + " / Tag";

  percentInput.addEventListener("input", (event) => {
    state.categories[index].percent = sanitizeAmount(event.target.value);
    saveState();
    renderSummary();
    renderCategories();
  });

  return row;
}

function renderEntries(type, container) {
  container.innerHTML = "";
  state[type].forEach((item, index) => {
    container.appendChild(createEntryRow(type, item, index));
  });
}

function calculateBudget() {
  const totalIncome = state.incomes.reduce((sum, item) => sum + sanitizeAmount(item.amount), 0);
  const totalExpenses = state.expenses.reduce((sum, item) => sum + sanitizeAmount(item.amount), 0);
  const bufferAmount = totalIncome * (sanitizeAmount(state.bufferPercent) / 100);
  const remainingBudget = totalIncome - totalExpenses - bufferAmount;
  const availableBudget = Math.max(remainingBudget, 0);
  const currentBalance = sanitizeBalance(state.currentBalance);
  const projectedBalance = currentBalance + remainingBudget;
  const debtReduction = currentBalance < 0 && remainingBudget > 0 ? Math.min(remainingBudget, Math.abs(currentBalance)) : 0;
  const monthsToZero = currentBalance < 0 && remainingBudget > 0 ? Math.ceil(Math.abs(currentBalance) / remainingBudget) : null;

  return {
    totalIncome,
    totalExpenses,
    bufferAmount,
    remainingBudget,
    availableBudget,
    currentBalance,
    projectedBalance,
    debtReduction,
    monthsToZero,
  };
}

function renderCategories() {
  const { availableBudget } = calculateBudget();
  categoryList.innerHTML = "";
  state.categories.forEach((category, index) => {
    categoryList.appendChild(createCategoryRow(category, index, availableBudget));
  });
}

function renderSummary() {
  const {
    totalIncome,
    totalExpenses,
    bufferAmount,
    remainingBudget,
    availableBudget,
    currentBalance,
    projectedBalance,
    debtReduction,
    monthsToZero,
  } = calculateBudget();
  const foodCategory = state.categories.find((category) => category.key === "food");
  const foodPercent = foodCategory ? sanitizeAmount(foodCategory.percent) : 0;
  const availableForFood = availableBudget * (foodPercent / 100);
  const displayName = state.personName.trim();
  const displayMonth = state.monthName.trim();
  const totalCategoryPercent = state.categories.reduce((sum, category) => sum + sanitizeAmount(category.percent), 0);

  totalIncomeOutput.textContent = formatCurrency(totalIncome);
  totalExpensesOutput.textContent = formatCurrency(totalExpenses);
  bufferAmountOutput.textContent = formatCurrency(bufferAmount);
  remainingBudgetOutput.textContent = formatCurrency(remainingBudget);
  balanceNowOutput.textContent = formatCurrency(currentBalance);
  projectedBalanceOutput.textContent = formatCurrency(projectedBalance);
  foodMonthlyOutput.textContent = formatCurrency(availableForFood);
  foodWeeklyOutput.textContent = formatCurrency(availableForFood / 4.33);
  foodDailyOutput.textContent = formatCurrency(availableForFood / 30);
  debtReductionOutput.textContent = formatCurrency(debtReduction);
  monthsToZeroOutput.textContent = monthsToZero ? String(monthsToZero) : "-";
  personalMessageOutput.textContent = createPersonalMessage(displayName, displayMonth, remainingBudget);
  renderAllocationGrid(availableBudget);

  if (remainingBudget > 0) {
    budgetHintOutput.textContent = "Der Essensbereich nutzt jetzt deinen eingestellten Kategorien-Anteil und zeigt dir dafuer Monat, Woche und Tag.";
  } else if (remainingBudget === 0) {
    budgetHintOutput.textContent = "Dein Plan ist genau ausgeglichen. Fuer variable Kosten bleibt aktuell kein Puffer.";
  } else {
    budgetHintOutput.textContent = "Achtung: Deine festen Kosten und die Reserve sind hoeher als deine Einnahmen. Reduziere Ausgaben oder passe die Reserve an.";
  }

  if (totalCategoryPercent === 100) {
    allocationHintOutput.textContent = "Deine Kategorien sind sauber auf 100 % verteilt.";
  } else if (totalCategoryPercent < 100) {
    allocationHintOutput.textContent = "Aktuell sind nur " + totalCategoryPercent + " % verteilt. Ein Teil deines Restbudgets ist noch offen.";
  } else {
    allocationHintOutput.textContent = "Aktuell sind " + totalCategoryPercent + " % verteilt. Das ist mehr als dein verfuegbares Restbudget.";
  }

  if (currentBalance < 0 && remainingBudget > 0) {
    stabilityHintOutput.textContent = "Du bist gerade im Minus, aber dein Monatsplan baut voraussichtlich " + formatCurrency(debtReduction) + " davon ab. Wenn das so bleibt, kannst du dich in etwa in " + monthsToZero + " Monaten bis auf 0 EUR hocharbeiten.";
  } else if (currentBalance < 0 && remainingBudget <= 0) {
    stabilityHintOutput.textContent = "Dein aktueller Plan verschlechtert das Minus noch oder baut es nicht ab. Ziel fuer den naechsten Schritt: feste Kosten senken, Reserve reduzieren oder Kategorien voruebergehend enger setzen.";
  } else if (currentBalance >= 0 && remainingBudget > 0) {
    stabilityHintOutput.textContent = "Dein Kontostand ist nicht im Minus und dein Plan bleibt positiv. Damit kannst du schrittweise Puffer aufbauen.";
  } else {
    stabilityHintOutput.textContent = "Aktuell ist dein Plan sehr eng. Schon kleine Einsparungen bei festen Kosten koennen dir wieder Spielraum verschaffen.";
  }
}

function createPersonalMessage(name, month, remainingBudget) {
  const greetingName = name || "Du";
  const monthLabel = month ? " fuer " + month : "";

  if (remainingBudget > 0) {
    return greetingName + ", dein Budgetplan" + monthLabel + " sieht stabil aus.";
  }

  if (remainingBudget === 0) {
    return greetingName + ", dein Budgetplan" + monthLabel + " ist aktuell exakt ausgeglichen.";
  }

  return greetingName + ", dein Budgetplan" + monthLabel + " braucht noch eine kleine Anpassung.";
}

function renderAllocationGrid(availableBudget) {
  allocationGrid.innerHTML = "";

  state.categories.forEach((category) => {
    const fragment = allocationTemplate.content.cloneNode(true);
    const nameOutput = fragment.querySelector('[data-role="allocation-name"]');
    const valueOutput = fragment.querySelector('[data-role="allocation-value"]');
    const percentOutput = fragment.querySelector('[data-role="allocation-percent"]');
    const percent = sanitizeAmount(category.percent);
    const monthlyBudget = availableBudget * (percent / 100);

    nameOutput.textContent = category.name;
    valueOutput.textContent = formatCurrency(monthlyBudget);
    percentOutput.textContent = percent + " %";
    allocationGrid.appendChild(fragment);
  });
}

function renderBackupStatus() {
  backupStatusOutput.textContent = formatDateTime(state.lastBackupAt);
}

function render() {
  personNameInput.value = state.personName;
  monthNameInput.value = state.monthName;
  currentBalanceInput.value = state.currentBalance || "";
  bufferPercentInput.value = state.bufferPercent;
  renderEntries("incomes", incomeList);
  renderEntries("expenses", expenseList);
  renderCategories();
  renderBackupStatus();
  renderSummary();
}

personNameInput.addEventListener("input", (event) => {
  state.personName = event.target.value;
  saveState();
  renderSummary();
});

monthNameInput.addEventListener("input", (event) => {
  state.monthName = event.target.value;
  saveState();
  renderSummary();
});

currentBalanceInput.addEventListener("input", (event) => {
  state.currentBalance = sanitizeBalance(event.target.value);
  saveState();
  renderSummary();
});

bufferPercentInput.addEventListener("input", (event) => {
  state.bufferPercent = sanitizeAmount(event.target.value);
  saveState();
  renderSummary();
});

addIncomeBtn.addEventListener("click", () => {
  state.incomes.push({ label: "", amount: 0 });
  saveState();
  render();
});

addExpenseBtn.addEventListener("click", () => {
  state.expenses.push({ label: "", amount: 0 });
  saveState();
  render();
});

exportBtn.addEventListener("click", () => {
  downloadBackup();
});

importFileInput.addEventListener("change", (event) => {
  importBackupFile(event.target.files[0]);
  event.target.value = "";
});

render();
