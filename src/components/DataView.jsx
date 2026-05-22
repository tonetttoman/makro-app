import { Download, Search, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FOOD_CATEGORIES } from "../data/foods";
import { calculateEntry } from "../lib/calculations";
import { toDateKey } from "../lib/dates";
import {
  AppButton,
  AppCard,
  AppDangerButton,
  AppField,
  AppInput,
  AppListRow,
  AppMetaText,
  AppNestedCard,
  AppPage,
  AppRecipeOption,
  AppSearchInput,
  AppSectionTitle,
  AppToggleHeader
} from "./ui/AppUi";

const UNITS = ["g", "ml", "db", "adag", "kapszula", "tabletta", "csepp", "%"];
const RECIPE_CATEGORY = "Főtt ételek";
const CATEGORY_LABELS = ["Fehérje", "Tejtermék", "Hús", "Tojás", "Gyümölcs", "Magvak", "Gabona", "Zöldség", "Egyéb", "Receptek"];
const macroFieldConfig = [
  { key: "kcal", label: "Kcal" },
  { key: "protein", label: "Fehérje" },
  { key: "fat", label: "Zsír" },
  { key: "carbs", label: "Szénhidrát" }
];
const foodFieldConfig = [
  { key: "baseAmount", label: "Alapmennyiség" },
  { key: "defaultAmount", label: "Kezdő mennyiség" },
  { key: "step", label: "Lépték" },
  { key: "kcal", label: "Kcal" },
  { key: "protein", label: "Fehérje" },
  { key: "fat", label: "Zsír" },
  { key: "carbs", label: "Szénhidrát" }
];

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeEntityName(value) {
  return normalizeFoodName(value)
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("hu-HU");
}

function numberValue(value, fallback = 0) {
  if (value === "") return fallback;
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeImportedTargets(importedTargets, currentTargets) {
  if (!importedTargets || typeof importedTargets !== "object") return currentTargets;

  const nextTargets = { ...currentTargets };

  ["kcal", "protein", "fat", "carbs"].forEach((key) => {
    const rawValue = importedTargets[key];
    if (rawValue === null || rawValue === undefined || rawValue === "") return;
    const value = Number(String(rawValue).replace(",", "."));
    if (Number.isFinite(value) && value >= 0) {
      nextTargets[key] = value;
    }
  });

  return nextTargets;
}

function roundTargetNumber(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

function calculateKcalFromMacros(protein, fat, carbs) {
  return roundTargetNumber(protein * 4 + fat * 9 + carbs * 4);
}

function scaleMacrosToCalories(targetKcal, currentProtein, currentFat, currentCarbs, fallbackTargets) {
  const protein = Math.max(0, Number(currentProtein) || 0);
  const fat = Math.max(0, Number(currentFat) || 0);
  const carbs = Math.max(0, Number(currentCarbs) || 0);
  const safeTargetKcal = roundTargetNumber(targetKcal);
  const currentMacroKcal = calculateKcalFromMacros(protein, fat, carbs);
  const fallbackProtein = Math.max(0, Number(fallbackTargets?.protein) || 0);
  const fallbackFat = Math.max(0, Number(fallbackTargets?.fat) || 0);
  const fallbackCarbs = Math.max(0, Number(fallbackTargets?.carbs) || 0);
  const fallbackMacroKcal = calculateKcalFromMacros(fallbackProtein, fallbackFat, fallbackCarbs);
  const baseProtein = currentMacroKcal > 0 ? protein : fallbackProtein;
  const baseFat = currentMacroKcal > 0 ? fat : fallbackFat;
  const baseCarbs = currentMacroKcal > 0 ? carbs : fallbackCarbs;
  const baseKcal = currentMacroKcal > 0 ? currentMacroKcal : fallbackMacroKcal || 1;
  const proteinRatio = (baseProtein * 4) / baseKcal;
  const fatRatio = (baseFat * 9) / baseKcal;
  const carbsRatio = (baseCarbs * 4) / baseKcal;
  const nextProtein = roundTargetNumber((safeTargetKcal * proteinRatio) / 4);
  const nextFat = roundTargetNumber((safeTargetKcal * fatRatio) / 9);
  const nextCarbs = roundTargetNumber((safeTargetKcal * carbsRatio) / 4);
  return {
    protein: nextProtein,
    fat: nextFat,
    carbs: nextCarbs,
    kcal: calculateKcalFromMacros(nextProtein, nextFat, nextCarbs)
  };
}

function normalizeSearch(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function repairHungarianMojibake(value) {
  const text = String(value || "");
  if (!text) return "";
  try {
    const decoded = decodeURIComponent(escape(text));
    if (!decoded.includes("�")) {
      return decoded;
    }
  } catch {
  }
  return text
    .replace(/Ăˇ/g, "á")
    .replace(/Ă©/g, "é")
    .replace(/Ă­/g, "í")
    .replace(/Ăł/g, "ó")
    .replace(/Ă¶/g, "ö")
    .replace(/Ĺ‘/g, "ő")
    .replace(/Ăş/g, "ú")
    .replace(/ĂĽ/g, "ü")
    .replace(/Ĺ±/g, "ű")
    .replace(/Ă/g, "Á")
    .replace(/Ă‰/g, "É")
    .replace(/ĂŤ/g, "Í")
    .replace(/Ă“/g, "Ó")
    .replace(/Ă–/g, "Ö")
    .replace(/Ĺ/g, "Ő")
    .replace(/Ăš/g, "Ú")
    .replace(/Ăś/g, "Ü")
    .replace(/Ĺ°/g, "Ű")
    .replace(/�/g, "");
}

function normalizeFoodName(value) {
  return repairHungarianMojibake(value).trim();
}

function normalizeFoodCategory(value, { isRecipe = false } = {}) {
  if (isRecipe) return RECIPE_CATEGORY;
  const repaired = repairHungarianMojibake(value).trim();
  const normalized = normalizeSearch(repaired);
  const matched = CATEGORY_LABELS.find((category) => normalizeSearch(category) === normalized);
  if (matched === "Receptek") return RECIPE_CATEGORY;
  if (matched) return matched;
  const fallback = FOOD_CATEGORIES.map((category) => repairHungarianMojibake(category)).find(
    (category) => normalizeSearch(category) === normalized
  );
  return fallback || repaired || repairHungarianMojibake(FOOD_CATEGORIES[0]) || "Egyéb";
}

function isRecipeFood(food) {
  return Boolean(food?.isRecipe) || normalizeFoodCategory(food?.category, { isRecipe: food?.isRecipe }) === RECIPE_CATEGORY;
}

function getFoodDraftFieldValue(key, value) {
  if (!["kcal", "protein", "fat", "carbs"].includes(key)) return value;
  return value === 0 || value === "0" || value === "" || value === null || value === undefined ? "" : value;
}

function parseFoodDraftFieldValue(key, value) {
  if (!["kcal", "protein", "fat", "carbs"].includes(key)) return value;
  return value === "" ? "" : numberValue(value);
}

function normalizeDailyLog(log) {
  if (!log?.date) return null;
  const date = String(log.date).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return {
    date,
    kcal: numberValue(log.kcal),
    protein: numberValue(log.protein),
    fat: numberValue(log.fat),
    carbs: numberValue(log.carbs),
    ...(log.alcoholKcal !== undefined ? { alcoholKcal: numberValue(log.alcoholKcal) } : {}),
    ...(log.note ? { note: String(log.note) } : {}),
    ...(log.source ? { source: String(log.source) } : { source: "manual_summary_import" })
  };
}

function mergeDailyLogs(currentLogs, importedLogs) {
  const byDate = new Map();
  currentLogs.map(normalizeDailyLog).filter(Boolean).forEach((log) => byDate.set(log.date, log));
  importedLogs.map(normalizeDailyLog).filter(Boolean).forEach((log) => byDate.set(log.date, log));
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function mergeDiary(currentDiary = {}, importedDiary = {}) {
  if (!importedDiary || typeof importedDiary !== "object" || Array.isArray(importedDiary)) {
    return currentDiary || {};
  }

  const normalizedImportedDiary = Object.entries(importedDiary).reduce((acc, [dateKey, day]) => {
    const safeDate = String(day?.date || dateKey).trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(safeDate)) return acc;

    acc[safeDate] = {
      date: safeDate,
      entries: Array.isArray(day?.entries) ? day.entries : []
    };

    return acc;
  }, {});

  return {
    ...(currentDiary || {}),
    ...normalizedImportedDiary
  };
}

function mergeFoodsForFullImport(importedFoods = [], currentFoods = []) {
  const merged = [];
  const seenIds = new Set();

  [...importedFoods, ...currentFoods].forEach((food) => {
    const foodId = typeof food?.id === "string" ? food.id.trim() : "";
    if (!foodId || seenIds.has(foodId)) return;
    merged.push(food);
    seenIds.add(foodId);
  });

  return merged;
}

function extractDailyLogs(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.dailyLogs)) return data.dailyLogs;
  if (data?.date) return [data];
  return [];
}

function sortFoodsByName(items) {
  return [...items].sort((a, b) => normalizeFoodName(a.name).localeCompare(normalizeFoodName(b.name), "hu", { sensitivity: "base" }));
}

function formatFoodMacro(value) {
  const rounded = Math.round((numberValue(value) + Number.EPSILON) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function createBlankFood() {
  return { id: "", name: "", category: normalizeFoodCategory(FOOD_CATEGORIES[0]), unit: "g", baseAmount: 100, step: 10, defaultAmount: 100, kcal: "", protein: "", fat: "", carbs: "" };
}

function createBlankRecipe() {
  return { name: "", category: RECIPE_CATEGORY, ingredientSearch: "", ingredientFoodId: "", ingredientAmount: "", ingredients: [] };
}

function normalizeIngredientDrafts(ingredients) {
  return (ingredients || []).map((ingredient) => ({ foodId: ingredient.foodId, amount: ingredient.amount === 0 || ingredient.amount === "0" ? "" : String(ingredient.amount ?? "") }));
}

function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function DataView({
  foods,
  setFoods,
  foodCategories,
  dailyFoodAmounts,
  targets,
  setTargets,
  diary,
  setDiary,
  dailyLogs,
  setDailyLogs,
  onSyncWorkspaceFromData
}) {
  const fileInputRef = useRef(null);
  const dailyLogInputRef = useRef(null);
  const recipeCardRef = useRef(null);
  const [foodSearch, setFoodSearch] = useState("");
  const [foodBrowserSearch, setFoodBrowserSearch] = useState("");
  const [foodDraft, setFoodDraft] = useState(createBlankFood());
  const [isMacroTargetsOpen, setIsMacroTargetsOpen] = useState(false);
  const [isFoodDatabaseOpen, setIsFoodDatabaseOpen] = useState(false);
  const [isFoodBrowserOpen, setIsFoodBrowserOpen] = useState(false);
  const [isFoodEditSearchOpen, setIsFoodEditSearchOpen] = useState(false);
  const [isFoodEditorOpen, setIsFoodEditorOpen] = useState(false);
  const [isRecipeEditorOpen, setIsRecipeEditorOpen] = useState(false);
  const [recipeDraft, setRecipeDraft] = useState(createBlankRecipe());
  const [editingRecipeId, setEditingRecipeId] = useState("");
  const [targetDrafts, setTargetDrafts] = useState(() => ({ kcal: String(roundTargetNumber(targets?.kcal)), protein: String(roundTargetNumber(targets?.protein)), fat: String(roundTargetNumber(targets?.fat)), carbs: String(roundTargetNumber(targets?.carbs)) }));
  const [activeTargetField, setActiveTargetField] = useState(null);
  const [transferMessage, setTransferMessage] = useState(null);
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  useEffect(() => {
    setTargetDrafts((current) => ({
      kcal: activeTargetField === "kcal" ? current.kcal : String(roundTargetNumber(targets?.kcal)),
      protein: activeTargetField === "protein" ? current.protein : String(roundTargetNumber(targets?.protein)),
      fat: activeTargetField === "fat" ? current.fat : String(roundTargetNumber(targets?.fat)),
      carbs: activeTargetField === "carbs" ? current.carbs : String(roundTargetNumber(targets?.carbs))
    }));
  }, [targets, activeTargetField]);

  useEffect(() => {
    if (!isFoodDatabaseOpen) {
      setFoodSearch("");
      setFoodBrowserSearch("");
      setFoodDraft(createBlankFood());
      setIsFoodBrowserOpen(false);
      setIsFoodEditSearchOpen(false);
      setIsFoodEditorOpen(false);
    }
  }, [isFoodDatabaseOpen]);

  useEffect(() => {
    if (!isFoodEditorOpen) {
      setFoodDraft(createBlankFood());
    }
  }, [isFoodEditorOpen]);

  useEffect(() => {
    if (!isRecipeEditorOpen && (recipeDraft.ingredientSearch || recipeDraft.ingredientFoodId || recipeDraft.ingredientAmount)) {
      setRecipeDraft((current) => ({ ...current, ingredientSearch: "", ingredientFoodId: "", ingredientAmount: "" }));
    }
  }, [isRecipeEditorOpen, recipeDraft.ingredientAmount, recipeDraft.ingredientFoodId, recipeDraft.ingredientSearch]);

  const sortedFoods = useMemo(() => sortFoodsByName(foods || []), [foods]);
  const normalizedFoodSearch = normalizeSearch(foodSearch);
  const normalizedFoodBrowserSearch = normalizeSearch(foodBrowserSearch);
  const filteredFoods = useMemo(() => {
    if (!normalizedFoodSearch) return [];
    return sortedFoods
      .map((food) => {
        const normalizedName = normalizeSearch(normalizeFoodName(food.name));
        const starts = normalizedName.startsWith(normalizedFoodSearch) ? 0 : 1;
        const index = normalizedName.indexOf(normalizedFoodSearch);
        return { food, starts, index };
      })
      .filter(({ index }) => index >= 0)
      .sort((a, b) => a.starts - b.starts || a.index - b.index || normalizeFoodName(a.food.name).localeCompare(normalizeFoodName(b.food.name), "hu", { sensitivity: "base" }))
      .slice(0, 16)
      .map(({ food }) => food);
  }, [normalizedFoodSearch, sortedFoods]);
  const browserFoods = useMemo(() => {
    if (!normalizedFoodBrowserSearch) return sortedFoods.slice(0, 50);
    return sortedFoods
      .map((food) => {
        const normalizedName = normalizeSearch(normalizeFoodName(food.name));
        const starts = normalizedName.startsWith(normalizedFoodBrowserSearch) ? 0 : 1;
        const index = normalizedName.indexOf(normalizedFoodBrowserSearch);
        return { food, starts, index };
      })
      .filter(({ index }) => index >= 0)
      .sort((a, b) => a.starts - b.starts || a.index - b.index || normalizeFoodName(a.food.name).localeCompare(normalizeFoodName(b.food.name), "hu", { sensitivity: "base" }))
      .slice(0, 50)
      .map(({ food }) => food);
  }, [normalizedFoodBrowserSearch, sortedFoods]);

  const foodEditorTitle = foodDraft?.id ? `Szerkesztés: ${normalizeFoodName(foodDraft.name)}` : "Élelmiszer hozzáadása";
  const macroTargetSummary = `Makró célok – ${roundTargetNumber(targets?.kcal)} kcal · P ${roundTargetNumber(targets?.protein)} · Zs ${roundTargetNumber(targets?.fat)} · CH ${roundTargetNumber(targets?.carbs)}`;
  const normalizedRecipeSearch = normalizeSearch(recipeDraft.ingredientSearch);
  const recipeIngredientMatches = useMemo(() => {
    const candidates = sortFoodsByName((foods || []).filter((food) => !food.isRecipe));
    if (!normalizedRecipeSearch) return [];
    return candidates
      .map((food) => {
        const normalizedName = normalizeSearch(normalizeFoodName(food.name));
        const starts = normalizedName.startsWith(normalizedRecipeSearch) ? 0 : 1;
        const index = normalizedName.indexOf(normalizedRecipeSearch);
        return { food, starts, index };
      })
      .filter(({ index }) => index >= 0)
      .sort((a, b) => a.starts - b.starts || a.index - b.index || normalizeFoodName(a.food.name).localeCompare(normalizeFoodName(b.food.name), "hu", { sensitivity: "base" }))
      .slice(0, 10)
      .map(({ food }) => food);
  }, [foods, normalizedRecipeSearch]);

  const recipeTotals = useMemo(() => {
    return recipeDraft.ingredients.reduce(
      (totals, ingredient) => {
        const food = foods.find((item) => item.id === ingredient.foodId);
        if (!food) return totals;
        const entry = calculateEntry(food, numberValue(ingredient.amount));
        return {
          kcal: totals.kcal + entry.kcal,
          protein: totals.protein + entry.protein,
          fat: totals.fat + entry.fat,
          carbs: totals.carbs + entry.carbs
        };
      },
      { kcal: 0, protein: 0, fat: 0, carbs: 0 }
    );
  }, [foods, recipeDraft.ingredients]);

  function syncTargetDrafts(nextTargets) {
    setTargetDrafts({ kcal: String(roundTargetNumber(nextTargets.kcal)), protein: String(roundTargetNumber(nextTargets.protein)), fat: String(roundTargetNumber(nextTargets.fat)), carbs: String(roundTargetNumber(nextTargets.carbs)) });
  }

  function handleTargetDraftChange(key, value) {
    setTargetDrafts((current) => ({ ...current, [key]: value }));
  }

  function commitTargetField(key) {
    const rawValue = targetDrafts[key];
    if (rawValue === "") {
      syncTargetDrafts(targets);
      return;
    }
    const parsed = roundTargetNumber(rawValue);
    let nextTargets;
    if (key === "kcal") {
      nextTargets = scaleMacrosToCalories(parsed, targets.protein, targets.fat, targets.carbs, targets);
    } else {
      nextTargets = { ...targets, [key]: parsed };
      nextTargets.kcal = calculateKcalFromMacros(nextTargets.protein, nextTargets.fat, nextTargets.carbs);
    }
    setTargets(nextTargets);
    syncTargetDrafts(nextTargets);
  }

  function exportJson() {
    downloadJson("makro-app-backup.json", { foods, targets, diary, dailyLogs, exportedAt: new Date().toISOString() });
    setTransferMessage({ type: "success", text: "Sikeres export: teljes adatmentés letöltve." });
  }

  async function importJson(file) {
    if (!file) return;
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const importedParts = [];
      let nextDiary = diary;
      let nextDailyLogs = dailyLogs;
      let shouldSyncWorkspace = false;

      if (Array.isArray(parsed.foods)) {
        const importedFoods = parsed.foods.filter((food) => typeof food?.id === "string" && food.id.trim());
        const mergedFoods = mergeFoodsForFullImport(importedFoods, Array.isArray(foods) ? foods : []);
        const preservedCurrentCount = Math.max(0, mergedFoods.length - importedFoods.length);
        setFoods(mergedFoods);
        importedParts.push(`${importedFoods.length} importált élelmiszer betöltve, ${preservedCurrentCount} jelenlegi egyedi tétel megtartva. Összesen: ${mergedFoods.length}.`);
      }
      if (parsed.targets && typeof parsed.targets === "object") {
        setTargets((currentTargets) => normalizeImportedTargets(parsed.targets, currentTargets));
        importedParts.push("makró célok frissítve");
      }
      if (parsed.diary && typeof parsed.diary === "object") {
        nextDiary = parsed.diary;
        setDiary(nextDiary);
        shouldSyncWorkspace = true;
        importedParts.push("napi tételek visszaállítva");
      }
      if (Array.isArray(parsed.dailyLogs)) {
        nextDailyLogs = parsed.dailyLogs.map(normalizeDailyLog).filter(Boolean);
        setDailyLogs(nextDailyLogs);
        shouldSyncWorkspace = true;
        importedParts.push(`${nextDailyLogs.length} napi napló bejegyzés visszaállítva`);
      }

      if (!importedParts.length) {
        setTransferMessage({ type: "error", text: "Import sikertelen: a fájl nem tartalmaz importálható adatot." });
        return;
      }

      if (shouldSyncWorkspace) {
        onSyncWorkspaceFromData?.(nextDiary || {}, nextDailyLogs || [], undefined);
      }

      setTransferMessage({ type: "success", text: `Sikeres import: ${importedParts.join(", ")}.` });
    } catch {
      setTransferMessage({ type: "error", text: "Import sikertelen: a JSON fájl nem olvasható vagy nem támogatott formátumú." });
      window.alert("A JSON import nem sikerült. Ellenőrizd a fájlt.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function exportDailyLogs() {
    downloadJson("makro-app-daily-logs.json", {
      dailyLogs,
      diary,
      exportedAt: new Date().toISOString()
    });
    setTransferMessage({ type: "success", text: "Sikeres export: napi napló letöltve tételes bontással." });
  }

  async function importDailyLogs(file) {
    if (!file) return;
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const imported = extractDailyLogs(parsed).map(normalizeDailyLog).filter(Boolean);
      const importedDiary = parsed?.diary && typeof parsed.diary === "object" && !Array.isArray(parsed.diary) ? parsed.diary : null;

      if (!imported.length && !importedDiary) {
        setTransferMessage({ type: "error", text: "Napi napló import: nem találtam érvényes naplóbejegyzést." });
        return;
      }

      let nextDailyLogs = dailyLogs || [];
      let nextDiary = diary || {};

      if (imported.length) {
        const currentNormalized = (dailyLogs || []).map(normalizeDailyLog).filter(Boolean);
        nextDailyLogs = mergeDailyLogs(currentNormalized, imported);
        setDailyLogs(nextDailyLogs);
      }

      let importedDiaryCount = 0;
      if (importedDiary) {
        importedDiaryCount = Object.entries(importedDiary).reduce((count, [dateKey, day]) => {
          const safeDate = String(day?.date || dateKey).trim().slice(0, 10);
          return /^\d{4}-\d{2}-\d{2}$/.test(safeDate) ? count + 1 : count;
        }, 0);
        nextDiary = mergeDiary(diary, importedDiary);
        setDiary(nextDiary);
      }

      onSyncWorkspaceFromData?.(nextDiary || {}, nextDailyLogs || [], undefined);

      setTransferMessage({
        type: "success",
        text: importedDiary
          ? `Sikeres napi napló import: ${imported.length} nap összesítő és ${importedDiaryCount} tételes nap importálva.`
          : `Sikeres napi napló import: ${imported.length} nap összesítő importálva.`
      });
    } catch {
      setTransferMessage({ type: "error", text: "Napi napló import sikertelen: ellenőrizd a JSON fájlt." });
      window.alert("A napi napló import nem sikerült. Ellenőrizd a fájlt.");
    } finally {
      if (dailyLogInputRef.current) dailyLogInputRef.current.value = "";
    }
  }

  function wipeDailyLog() {
    const confirmed = window.confirm(
      "Biztosan törlöd a teljes napi naplót? Az ételek, receptek és makró célok megmaradnak, de minden naplózott nap törlődik."
    );

    if (!confirmed) return;

    setDiary({});
    setDailyLogs([]);
    onSyncWorkspaceFromData?.({}, [], toDateKey());
    setTransferMessage({ type: "success", text: "Napi napló törölve." });
  }

  function startNewFood() {
    setFoodDraft(createBlankFood());
    setIsFoodEditorOpen(true);
  }

  function saveFood() {
    const name = normalizeFoodName(foodDraft.name);
    if (!name) {
      window.alert("Adj meg nevet az élelmiszerhez.");
      return;
    }
    const normalizedName = normalizeEntityName(name);
    const nextFoodBase = {
      ...foodDraft,
      name,
      category: normalizeFoodCategory(foodDraft.category) || normalizeFoodCategory(foodCategories[0]) || normalizeFoodCategory(FOOD_CATEGORIES[0]),
      unit: foodDraft.unit || "g",
      baseAmount: Math.max(1, numberValue(foodDraft.baseAmount, 100)),
      defaultAmount: Math.max(1, numberValue(foodDraft.defaultAmount, 100)),
      step: Math.max(1, numberValue(foodDraft.step, 10)),
      kcal: Math.max(0, numberValue(foodDraft.kcal)),
      protein: Math.max(0, numberValue(foodDraft.protein)),
      fat: Math.max(0, numberValue(foodDraft.fat)),
      carbs: Math.max(0, numberValue(foodDraft.carbs))
    };
    setFoods((current) => {
      const currentFood = foodDraft.id ? current.find((food) => food.id === foodDraft.id) : null;
      const currentFoodName = currentFood ? normalizeEntityName(currentFood.name) : "";
      const existingByName = current.find((food) => normalizeEntityName(food.name) === normalizedName);
      const existingByOtherName = current.find((food) => food.id !== foodDraft.id && normalizeEntityName(food.name) === normalizedName);

      if (!foodDraft.id) {
        const targetFood = existingByName;
        const nextFood = { ...nextFoodBase, id: targetFood?.id || `${slugify(name)}-${Date.now()}` };
        if (targetFood) {
          return current.map((food) => (food.id === targetFood.id ? nextFood : food));
        }
        return [...current, nextFood];
      }

      if (existingByOtherName) {
        const nextFood = { ...nextFoodBase, id: existingByOtherName.id };
        return current.map((food) => (food.id === existingByOtherName.id ? nextFood : food));
      }

      if (currentFood && currentFoodName === normalizedName) {
        const nextFood = { ...nextFoodBase, id: foodDraft.id };
        return current.map((food) => (food.id === foodDraft.id ? nextFood : food));
      }

      const nextFood = { ...nextFoodBase, id: `${slugify(name)}-${Date.now()}` };
      return [...current, nextFood];
    });
  }

  function deleteFood() {
    if (!foodDraft.id) return;
    if (!window.confirm(`Biztosan törlöd ezt az élelmiszert: ${normalizeFoodName(foodDraft.name)}?`)) return;
    setFoods((current) => current.filter((food) => food.id !== foodDraft.id));
    setFoodDraft(createBlankFood());
    setIsFoodEditorOpen(false);
  }

  function addRecipeIngredient() {
    const amount = numberValue(recipeDraft.ingredientAmount);
    if (!recipeDraft.ingredientFoodId || amount <= 0) {
      window.alert("Válassz alapanyagot és adj meg pozitív mennyiséget.");
      return;
    }
    setRecipeDraft((current) => ({ ...current, ingredients: [...current.ingredients, { foodId: current.ingredientFoodId, amount: String(amount) }], ingredientAmount: "", ingredientFoodId: "", ingredientSearch: "" }));
  }

  function removeRecipeIngredient(index) {
    setRecipeDraft((current) => ({ ...current, ingredients: current.ingredients.filter((_, itemIndex) => itemIndex !== index) }));
  }

  function updateRecipeIngredientAmount(index, value) {
    setRecipeDraft((current) => ({ ...current, ingredients: current.ingredients.map((ingredient, itemIndex) => (itemIndex === index ? { ...ingredient, amount: value } : ingredient)) }));
  }

  function saveRecipe() {
    const name = normalizeFoodName(recipeDraft.name);
    if (!name) {
      window.alert("Adj nevet a receptnek.");
      return;
    }
    if (!recipeDraft.ingredients.length) {
      window.alert("Adj hozzá legalább egy alapanyagot a recepthez.");
      return;
    }
    const normalizedName = normalizeEntityName(name);
    const existingRecipeByName = foods.find((food) => isRecipeFood(food) && normalizeEntityName(food.name) === normalizedName);
    const targetRecipeId = existingRecipeByName?.id || editingRecipeId || `recipe-${slugify(name)}-${Date.now()}`;
    const nextRecipe = { id: targetRecipeId, name, category: RECIPE_CATEGORY, unit: "%", baseAmount: 100, defaultAmount: 100, step: 5, kcal: Math.round(recipeTotals.kcal), protein: Math.round(recipeTotals.protein * 10) / 10, fat: Math.round(recipeTotals.fat * 10) / 10, carbs: Math.round(recipeTotals.carbs * 10) / 10, isRecipe: true, recipe: { ingredients: recipeDraft.ingredients.map((ingredient) => ({ foodId: ingredient.foodId, amount: numberValue(ingredient.amount) })) } };
    setFoods((current) => [...current.filter((food) => !(isRecipeFood(food) && (food.id === editingRecipeId || food.id === existingRecipeByName?.id))), nextRecipe]);
    setEditingRecipeId("");
    setRecipeDraft(createBlankRecipe());
    setIsRecipeEditorOpen(false);
  }

  function deleteRecipe() {
    if (!editingRecipeId) return;
    if (!window.confirm(`Biztosan törlöd ezt a receptet: ${normalizeFoodName(recipeDraft.name)}?`)) return;
    setFoods((current) => current.filter((food) => food.id !== editingRecipeId));
    setEditingRecipeId("");
    setRecipeDraft(createBlankRecipe());
    setIsRecipeEditorOpen(false);
  }

  function loadRecipeForEditing(food) {
    setEditingRecipeId(food?.id || "");
    setIsRecipeEditorOpen(true);
    setIsFoodEditorOpen(false);
    setIsFoodDatabaseOpen(false);
    setRecipeDraft({ name: normalizeFoodName(food?.name) || "", category: RECIPE_CATEGORY, ingredientSearch: "", ingredientFoodId: "", ingredientAmount: "", ingredients: normalizeIngredientDrafts(food?.recipe?.ingredients || []) });
    requestAnimationFrame(() => {
      recipeCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <AppPage>
      <div ref={recipeCardRef}>
        <AppCard>
          <AppToggleHeader title={"Új recept hozzáadása"} summary={isRecipeEditorOpen ? "Recept szerkesztő nyitva" : "Recept szerkesztő"} isOpen={isRecipeEditorOpen} onToggle={() => setIsRecipeEditorOpen((current) => !current)} />
          {isRecipeEditorOpen ? (
            <AppNestedCard className="mt-3" variant="surface">
              <div className="grid gap-3 sm:grid-cols-2">
                <AppField label={"Alapanyag keresése"}>
                  <AppSearchInput icon={<Search size={16} aria-hidden="true" />} value={recipeDraft.ingredientSearch} placeholder={"Keresés alapanyag névre..."} onChange={(event) => setRecipeDraft((current) => ({ ...current, ingredientSearch: event.target.value, ingredientFoodId: "" }))} />
                </AppField>
                <AppField label={"Mennyiség"}>
                  <AppInput inputMode="decimal" type="number" min="0" value={recipeDraft.ingredientAmount} onChange={(event) => setRecipeDraft((current) => ({ ...current, ingredientAmount: event.target.value }))} />
                </AppField>
              </div>
              {normalizedRecipeSearch ? (
                <div className="mt-4 grid max-h-[280px] gap-2 overflow-y-auto" aria-label={"Recept alapanyag találatok"}>
                  {recipeIngredientMatches.map((food) => (
                    <AppRecipeOption key={food.id} active={recipeDraft.ingredientFoodId === food.id} onClick={() => setRecipeDraft((current) => ({ ...current, ingredientFoodId: food.id, ingredientSearch: normalizeFoodName(food.name) }))}>
                      <strong className="text-sm font-semibold text-slate-100">{normalizeFoodName(food.name)}</strong>
                      <AppMetaText>{Math.round(food.kcal)} kcal · {normalizeFoodCategory(food.category, { isRecipe: food.isRecipe })}</AppMetaText>
                    </AppRecipeOption>
                  ))}
                </div>
              ) : (
                <AppNestedCard className="mt-4" variant="empty">{"Kezdj el gépelni az alapanyag kereséséhez."}</AppNestedCard>
              )}
              <div className="mt-4 flex flex-wrap gap-2.5">
                <AppButton type="button" onClick={addRecipeIngredient}>{"Alapanyag hozzáadása"}</AppButton>
              </div>
              {recipeDraft.ingredients.length > 0 ? (
                <div className="mt-4 grid gap-2">
                  {recipeDraft.ingredients.map((ingredient, index) => {
                    const ingredientFood = foods.find((food) => food.id === ingredient.foodId);
                    if (!ingredientFood) return null;
                    return (
                      <div className="flex items-center justify-between gap-3 rounded-[18px] border border-slate-700/40 bg-[#0c131e] px-4 py-3" key={`${ingredient.foodId}-${index}`}>
                        <div className="min-w-0 flex-1">
                          <strong className="block text-sm font-semibold text-slate-100">{normalizeFoodName(ingredientFood.name)}</strong>
                          <div className="mt-2 flex items-center gap-2">
                            <AppInput className="w-24" inputMode="decimal" min="0" type="number" value={ingredient.amount} onChange={(event) => updateRecipeIngredientAmount(index, event.target.value)} />
                            <AppMetaText>{ingredientFood.unit}</AppMetaText>
                          </div>
                        </div>
                        <AppButton type="button" onClick={() => removeRecipeIngredient(index)}>{"Törlés"}</AppButton>
                      </div>
                    );
                  })}
                </div>
              ) : null}
              <AppNestedCard className="mt-4 grid gap-1 text-sm text-slate-300" variant="compact">
                <strong className="text-sm font-semibold text-slate-100">{"Teljes recept összesítés"}</strong>
                <span>{Math.round(recipeTotals.kcal)} kcal</span>
                <span>P {Math.round(recipeTotals.protein * 10) / 10} g · F {Math.round(recipeTotals.fat * 10) / 10} g · Ch {Math.round(recipeTotals.carbs * 10) / 10} g</span>
                <small className="text-xs leading-5 text-slate-500">{"100% = a teljes recept, napi fogyasztáskor százalékot adhatsz meg."}</small>
              </AppNestedCard>
              <AppField className="mt-4" label={"Recept neve"}>
                <AppInput value={recipeDraft.name} onChange={(event) => setRecipeDraft((current) => ({ ...current, name: event.target.value }))} />
              </AppField>
              <AppButton className="mt-4 w-full" variant="action" type="button" onClick={saveRecipe}>{"Mentés receptként"}</AppButton>
              {editingRecipeId ? <AppDangerButton className="mt-3 w-full" type="button" onClick={deleteRecipe}>{"Recept törlése"}</AppDangerButton> : null}
            </AppNestedCard>
          ) : null}
        </AppCard>
      </div>

      <AppCard>
        <AppToggleHeader title={"Élelmiszer-adatbázis"} summary={normalizedFoodSearch ? `${filteredFoods.length} találat` : "Kereséssel válassz ételt szerkesztéshez"} isOpen={isFoodDatabaseOpen} onToggle={() => setIsFoodDatabaseOpen((current) => !current)} />
        {isFoodDatabaseOpen ? (
          <>
            <div className="mt-3 flex flex-wrap gap-2.5">
              <AppButton type="button" onClick={() => setIsFoodBrowserOpen((current) => !current)}>
                {isFoodBrowserOpen ? "Adatbázis böngészése bezárása" : "Adatbázis böngészése"}
              </AppButton>
              <AppButton
                type="button"
                onClick={() => {
                  setFoodDraft(createBlankFood());
                  setIsFoodEditorOpen(true);
                }}
              >
                {"Élelmiszer hozzáadása"}
              </AppButton>
              <AppButton type="button" onClick={() => setIsFoodEditSearchOpen((current) => !current)}>
                {"Élelmiszer szerkesztése"}
              </AppButton>
            </div>
            {isFoodBrowserOpen ? (
              <AppNestedCard className="mt-3" variant="surface">
                <AppField label={"Keresés"}>
                  <AppSearchInput icon={<Search size={16} aria-hidden="true" />} value={foodBrowserSearch} placeholder={"Keresés az adatbázisban..."} onChange={(event) => setFoodBrowserSearch(event.target.value)} />
                </AppField>
                <AppMetaText className="mt-3">{`${browserFoods.length} / ${sortedFoods.length} tétel`}</AppMetaText>
                {browserFoods.length ? (
                  <div className="mt-3 grid gap-2.5" aria-label={"Élelmiszer-adatbázis böngésző találatok"}>
                    {browserFoods.map((food) => {
                      const baseAmount = Math.max(1, numberValue(food.baseAmount, 100));
                      const unit = food.unit || "g";
                      return (
                        <AppNestedCard className="grid gap-1.5" key={`browser-${food.id}`} variant="compact">
                          <strong className="block line-clamp-2 text-[0.96rem] font-semibold leading-6 text-slate-50">{normalizeFoodName(food.name)}</strong>
                          <AppMetaText>{`${normalizeFoodCategory(food.category, { isRecipe: food.isRecipe })} · ${baseAmount} ${unit}`}</AppMetaText>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-slate-300">
                            <span>{`${Math.round(numberValue(food.kcal))} kcal`}</span>
                            <span>{`P ${formatFoodMacro(food.protein)} g`}</span>
                            <span>{`F ${formatFoodMacro(food.fat)} g`}</span>
                            <span>{`Ch ${formatFoodMacro(food.carbs)} g`}</span>
                          </div>
                        </AppNestedCard>
                      );
                    })}
                  </div>
                ) : (
                  <AppNestedCard className="mt-3" variant="empty">{"Nincs találat."}</AppNestedCard>
                )}
              </AppNestedCard>
            ) : null}
            {isFoodEditSearchOpen ? (
              <>
                <AppField className="mt-3" label={"Élelmiszer keresése"}>
                  <AppSearchInput icon={<Search size={16} aria-hidden="true" />} value={foodSearch} placeholder={"Keresés élelmiszer névre..."} onChange={(event) => setFoodSearch(event.target.value)} />
                </AppField>
                {normalizedFoodSearch ? (
                  <AppNestedCard className="mt-3" variant="flush">
                    <div className="divide-y divide-slate-700/35">
                      {filteredFoods.map((food) => (
                        <AppListRow active={foodDraft.id === food.id} key={food.id} onClick={() => { setFoodSearch(""); if (isRecipeFood(food)) { loadRecipeForEditing(food); return; } setFoodDraft({ ...food, name: normalizeFoodName(food.name), category: normalizeFoodCategory(food.category, { isRecipe: food.isRecipe }) }); setIsFoodEditorOpen(true); }}>
                          <div className="min-w-0 flex-1">
                            <strong className="block line-clamp-2 text-[0.96rem] font-semibold leading-6 text-slate-50">{normalizeFoodName(food.name)}</strong>
                            <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-slate-400">
                              <span>{Math.round(food.kcal)} kcal</span>
                              <span>P {Math.round((food.protein || 0) * 10) / 10} g</span>
                              <span>F {Math.round((food.fat || 0) * 10) / 10} g</span>
                              <span>Ch {Math.round((food.carbs || 0) * 10) / 10} g</span>
                            </div>
                          </div>
                        </AppListRow>
                      ))}
                    </div>
                  </AppNestedCard>
                ) : null}
              </>
            ) : null}
            {isFoodEditorOpen ? (
              <AppNestedCard className="mt-3" variant="surface">
                <AppSectionTitle>{foodEditorTitle}</AppSectionTitle>
                <div className="grid gap-3 sm:grid-cols-2">
                  <AppField label={"Név"}><AppInput value={foodDraft.name} onChange={(event) => setFoodDraft({ ...foodDraft, name: event.target.value })} /></AppField>
                  <AppField label={"Kategória"}><AppInput as="select" value={foodDraft.category} onChange={(event) => setFoodDraft({ ...foodDraft, category: normalizeFoodCategory(event.target.value) })}>{Array.from(new Set(foodCategories.map((category) => normalizeFoodCategory(category)))).map((category) => <option key={category}>{category}</option>)}</AppInput></AppField>
                  <AppField label={"Egység"}><AppInput as="select" value={foodDraft.unit} onChange={(event) => setFoodDraft({ ...foodDraft, unit: event.target.value })}>{UNITS.map((unit) => <option key={unit}>{unit}</option>)}</AppInput></AppField>
                  {foodFieldConfig.map(({ key, label }) => (
                    <AppField key={key} label={label} tone={key === "fat" ? "fat" : ["protein", "carbs"].includes(key) ? "macro" : "default"}>
                      <AppInput inputMode="decimal" type="number" value={getFoodDraftFieldValue(key, foodDraft[key])} onChange={(event) => setFoodDraft({ ...foodDraft, [key]: parseFoodDraftFieldValue(key, event.target.value) })} />
                    </AppField>
                  ))}
                </div>
                <AppButton className="mt-4 w-full" variant="action" type="button" onClick={saveFood}>{"Élelmiszer mentése"}</AppButton>
                {foodDraft.id ? <AppDangerButton className="mt-3 w-full" type="button" onClick={deleteFood}>{"Élelmiszer törlése"}</AppDangerButton> : null}
              </AppNestedCard>
            ) : null}
          </>
        ) : null}
      </AppCard>

      <AppCard>
        <AppToggleHeader title={"Makró célok"} summary={macroTargetSummary} isOpen={isMacroTargetsOpen} onToggle={() => setIsMacroTargetsOpen((current) => !current)} />
        {isMacroTargetsOpen ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {macroFieldConfig.map(({ key, label }) => (
              <AppField key={key} label={label} tone={key === "fat" ? "fat" : key === "kcal" ? "default" : "macro"}>
                <AppInput className="text-base" inputMode="decimal" type="number" value={targetDrafts[key]} onFocus={() => setActiveTargetField(key)} onChange={(event) => handleTargetDraftChange(key, event.target.value)} onBlur={() => { commitTargetField(key); setActiveTargetField((current) => (current === key ? null : current)); }} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} />
              </AppField>
            ))}
          </div>
        ) : null}
      </AppCard>

      <AppCard>
        <AppToggleHeader
          title={"Import / export / biztonsági mentés"}
          summary={"Teljes adatmentés és napi napló import/export"}
          isOpen={isBackupOpen}
          onToggle={() => setIsBackupOpen((current) => !current)}
        />
        {isBackupOpen ? (
          <>
          {transferMessage ? (
            <AppNestedCard
              className={
                transferMessage.type === "error"
                  ? "mt-3 border-red-400/20 bg-red-950/20"
                  : "mt-3 border-cyan-400/20 bg-cyan-950/10"
              }
              variant="compact"
            >
              <AppMetaText className={transferMessage.type === "error" ? "text-red-200" : "text-slate-300"}>
                {transferMessage.text}
              </AppMetaText>
            </AppNestedCard>
          ) : null}
          <div className="mt-3 grid gap-3">
            <AppNestedCard>
              <AppSectionTitle>{"Teljes adatmentés"}</AppSectionTitle>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                <AppButton className="w-full" variant="action" type="button" onClick={exportJson}><Download size={18} className="mr-2" /> {"JSON export"}</AppButton>
                <AppButton className="w-full" type="button" onClick={() => fileInputRef.current?.click()}><Upload size={18} className="mr-2" /> {"JSON import"}</AppButton>
              </div>
              <input ref={fileInputRef} hidden accept="application/json" type="file" onChange={(event) => importJson(event.target.files?.[0])} />
            </AppNestedCard>
            <AppNestedCard>
              <AppSectionTitle>{"Napi napló"}</AppSectionTitle>
              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                <AppButton className="w-full" variant="action" type="button" onClick={exportDailyLogs}><Download size={18} className="mr-2" /> {"Napi napló export"}</AppButton>
                <AppButton className="w-full" type="button" onClick={() => dailyLogInputRef.current?.click()}><Upload size={18} className="mr-2" /> {"Napi napló import"}</AppButton>
              </div>
              <input ref={dailyLogInputRef} hidden accept="application/json" type="file" onChange={(event) => importDailyLogs(event.target.files?.[0])} />
            </AppNestedCard>
            <AppNestedCard>
              <AppSectionTitle>{"Napi napló törlése"}</AppSectionTitle>
              <div className="mt-4">
                <AppDangerButton className="w-full" type="button" onClick={wipeDailyLog}>{"Napi napló törlése"}</AppDangerButton>
              </div>
            </AppNestedCard>
          </div>
          </>
        ) : null}
      </AppCard>
    </AppPage>
  );
}

export default DataView;



