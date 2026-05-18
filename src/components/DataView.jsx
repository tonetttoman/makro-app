import { Download, Upload, Plus, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { calculateEntry } from "../lib/calculations";
import { FOOD_CATEGORIES } from "../data/foods";

const UNITS = ["g", "ml", "db", "adag", "kapszula", "tabletta", "csepp", "%"];
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

function numberValue(value, fallback = 0) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
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
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
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

function extractDailyLogs(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.dailyLogs)) return data.dailyLogs;
  if (data?.date) return [data];
  return [];
}

function sortFoodsByName(items) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "hu", { sensitivity: "base" }));
}

function createBlankFood() {
  return {
    id: "",
    name: "",
    category: FOOD_CATEGORIES[0],
    unit: "g",
    baseAmount: 100,
    step: 10,
    defaultAmount: 100,
    kcal: 0,
    protein: 0,
    fat: 0,
    carbs: 0,
    targetNutrients: {}
  };
}

function createBlankRecipe() {
  return {
    name: "",
    category: "Főtt ételek",
    ingredientSearch: "",
    ingredientFoodId: "",
    ingredientAmount: "",
    ingredients: []
  };
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

function SectionCard({ eyebrow, title, description, children, actions = null }) {
  return (
    <section className="panel mb-3.5 rounded-[28px] border border-emerald-300/14 bg-[linear-gradient(180deg,rgba(21,33,31,0.96),rgba(8,15,14,0.98))] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.24)]">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow mb-2 text-cyan-300">{eyebrow}</p>
          <h2 className="text-lg font-semibold text-slate-50">{title}</h2>
          {description ? <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function Field({ label, tone = "default", children }) {
  const toneClass =
    tone === "fat"
      ? "text-amber-300"
      : tone === "macro"
        ? "text-cyan-300"
        : "text-slate-300";

  return (
    <label className="grid gap-2 rounded-[20px] border border-emerald-300/12 bg-slate-950/20 p-4">
      <span className={`text-xs font-semibold uppercase tracking-[0.16em] ${toneClass}`}>{label}</span>
      {children}
    </label>
  );
}

export function DataView({
  foods,
  setFoods,
  foodCategories,
  dailyFoodAmounts,
  supplements,
  setSupplements,
  targets,
  setTargets,
  nutrientTargets,
  setNutrientTargets,
  diary,
  setDiary,
  dailyLogs,
  setDailyLogs,
  supplementDiary,
  setSupplementDiary
}) {
  const fileInputRef = useRef(null);
  const dailyLogInputRef = useRef(null);

  const [activeFoodCategory, setActiveFoodCategory] = useState(foodCategories[0] || FOOD_CATEGORIES[0]);
  const [foodDraft, setFoodDraft] = useState(createBlankFood());
  const [isFoodEditorOpen, setIsFoodEditorOpen] = useState(false);
  const [isRecipeEditorOpen, setIsRecipeEditorOpen] = useState(false);
  const [recipeDraft, setRecipeDraft] = useState(createBlankRecipe());
  const [targetDrafts, setTargetDrafts] = useState(() => ({
    kcal: String(roundTargetNumber(targets?.kcal)),
    protein: String(roundTargetNumber(targets?.protein)),
    fat: String(roundTargetNumber(targets?.fat)),
    carbs: String(roundTargetNumber(targets?.carbs))
  }));
  const [activeTargetField, setActiveTargetField] = useState(null);

  useEffect(() => {
    if (!foodCategories.includes(activeFoodCategory)) {
      setActiveFoodCategory(foodCategories[0] || FOOD_CATEGORIES[0]);
    }
  }, [activeFoodCategory, foodCategories]);

  useEffect(() => {
    setTargetDrafts((current) => ({
      kcal: activeTargetField === "kcal" ? current.kcal : String(roundTargetNumber(targets?.kcal)),
      protein: activeTargetField === "protein" ? current.protein : String(roundTargetNumber(targets?.protein)),
      fat: activeTargetField === "fat" ? current.fat : String(roundTargetNumber(targets?.fat)),
      carbs: activeTargetField === "carbs" ? current.carbs : String(roundTargetNumber(targets?.carbs))
    }));
  }, [targets, activeTargetField]);

  const sortedFoods = useMemo(() => sortFoodsByName(foods || []), [foods]);

  const activeCategoryFoods = useMemo(() => {
    const category = activeFoodCategory || foodCategories[0];
    return sortedFoods.filter((food) => food.category === category);
  }, [activeFoodCategory, foodCategories, sortedFoods]);

  const foodEditorTitle = foodDraft?.id ? `Szerkesztés: ${foodDraft.name}` : "Új élelmiszer";

  const normalizedRecipeSearch = normalizeSearch(recipeDraft.ingredientSearch);
  const recipeIngredientMatches = useMemo(() => {
    const candidates = sortFoodsByName(foods.filter((food) => !food.isRecipe));
    if (!normalizedRecipeSearch) return candidates.slice(0, 10);
    return candidates
      .map((food) => {
        const normalizedName = normalizeSearch(food.name);
        const starts = normalizedName.startsWith(normalizedRecipeSearch) ? 0 : 1;
        const index = normalizedName.indexOf(normalizedRecipeSearch);
        return { food, starts, index };
      })
      .filter(({ index }) => index >= 0)
      .sort((a, b) => a.starts - b.starts || a.index - b.index || a.food.name.localeCompare(b.food.name, "hu", { sensitivity: "base" }))
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
    setTargetDrafts({
      kcal: String(roundTargetNumber(nextTargets.kcal)),
      protein: String(roundTargetNumber(nextTargets.protein)),
      fat: String(roundTargetNumber(nextTargets.fat)),
      carbs: String(roundTargetNumber(nextTargets.carbs))
    });
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
    downloadJson("makro-app-backup.json", {
      foods,
      supplements,
      targets,
      nutrientTargets,
      diary,
      dailyLogs,
      supplementDiary,
      exportedAt: new Date().toISOString()
    });
  }

  async function importJson(file) {
    if (!file) return;
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.foods)) setFoods(parsed.foods);
      if (Array.isArray(parsed.supplements)) setSupplements(parsed.supplements);
      if (parsed.targets && typeof parsed.targets === "object") setTargets(parsed.targets);
      if (parsed.nutrientTargets && typeof parsed.nutrientTargets === "object") setNutrientTargets(parsed.nutrientTargets);
      if (parsed.diary && typeof parsed.diary === "object") setDiary(parsed.diary);
      if (Array.isArray(parsed.dailyLogs)) setDailyLogs(parsed.dailyLogs);
      if (parsed.supplementDiary && typeof parsed.supplementDiary === "object") setSupplementDiary(parsed.supplementDiary);
    } catch {
      window.alert("A JSON import nem sikerült. Ellenőrizd a fájlt.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function exportDailyLogs() {
    downloadJson("makro-app-daily-logs.json", dailyLogs);
  }

  async function importDailyLogs(file) {
    if (!file) return;
    try {
      const raw = await file.text();
      const parsed = JSON.parse(raw);
      const imported = extractDailyLogs(parsed);
      const merged = mergeDailyLogs(dailyLogs || [], imported || []);
      setDailyLogs(merged);
    } catch {
      window.alert("A napi napló import nem sikerült. Ellenőrizd a fájlt.");
    } finally {
      if (dailyLogInputRef.current) dailyLogInputRef.current.value = "";
    }
  }

  function startNewFood() {
    setFoodDraft(createBlankFood());
    setIsFoodEditorOpen(true);
  }

  function saveFood() {
    const name = String(foodDraft.name || "").trim();
    if (!name) {
      window.alert("Adj meg nevet az élelmiszerhez.");
      return;
    }

    const nextFood = {
      ...foodDraft,
      id: foodDraft.id || `${slugify(name)}-${Date.now()}`,
      name,
      category: foodDraft.category || foodCategories[0] || FOOD_CATEGORIES[0],
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
      const existingIndex = current.findIndex((food) => food.id === nextFood.id);
      if (existingIndex === -1) return [...current, nextFood];
      return current.map((food) => (food.id === nextFood.id ? nextFood : food));
    });

    setFoodDraft(nextFood);
    setActiveFoodCategory(nextFood.category);
  }

  function addRecipeIngredient() {
    const amount = numberValue(recipeDraft.ingredientAmount);
    if (!recipeDraft.ingredientFoodId || amount <= 0) {
      window.alert("Válassz alapanyagot és adj meg pozitív mennyiséget.");
      return;
    }

    setRecipeDraft((current) => ({
      ...current,
      ingredients: [...current.ingredients, { foodId: current.ingredientFoodId, amount }],
      ingredientAmount: "",
      ingredientFoodId: "",
      ingredientSearch: ""
    }));
  }

  function removeRecipeIngredient(index) {
    setRecipeDraft((current) => ({
      ...current,
      ingredients: current.ingredients.filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  function saveRecipe() {
    const name = String(recipeDraft.name || "").trim();
    if (!name) {
      window.alert("Adj nevet a receptnek.");
      return;
    }
    if (!recipeDraft.ingredients.length) {
      window.alert("Adj hozzá legalább egy alapanyagot a recepthez.");
      return;
    }

    const nextRecipe = {
      id: `recipe-${slugify(name)}-${Date.now()}`,
      name,
      category: recipeDraft.category || "Főtt ételek",
      unit: "%",
      baseAmount: 100,
      defaultAmount: 10,
      step: 5,
      kcal: Math.round(recipeTotals.kcal),
      protein: Math.round(recipeTotals.protein * 10) / 10,
      fat: Math.round(recipeTotals.fat * 10) / 10,
      carbs: Math.round(recipeTotals.carbs * 10) / 10,
      isRecipe: true,
      recipe: {
        ingredients: recipeDraft.ingredients.map((ingredient) => ({
          foodId: ingredient.foodId,
          amount: numberValue(ingredient.amount)
        }))
      }
    };

    setFoods((current) => [...current, nextRecipe]);
    setRecipeDraft(createBlankRecipe());
    setIsRecipeEditorOpen(false);
  }

  return (
    <main className="page page--data pb-28">
      <section className="panel mb-3.5 rounded-[28px] border border-emerald-300/18 bg-[linear-gradient(180deg,rgba(24,38,34,0.96),rgba(10,20,18,0.98))] p-5 shadow-[0_18px_44px_rgba(0,0,0,0.26)]">
        <p className="eyebrow mb-2 text-cyan-300">Adatok</p>
        <h1 className="mb-0 text-[clamp(1.9rem,7vw,2.4rem)] font-semibold tracking-[-0.05em] text-slate-50">Beállítások és adatok</h1>
        <p className="mt-3 max-w-[48ch] text-sm leading-6 text-slate-300">
          A mentések, célértékek, élelmiszerek és receptek ugyanabban a sötét, mobilos app-nyelvben maradnak, mint a Mai és Havi nézetben.
        </p>
      </section>

      <SectionCard
        eyebrow="Mentések"
        title="Import / export"
        description="A teljes adatmentés és a napi napló külön, átlátható blokkban maradnak."
      >
        <div className="grid gap-3">
          <div className="rounded-[22px] border border-emerald-300/12 bg-slate-950/20 p-4">
            <h3 className="text-base font-semibold text-slate-100">Teljes adatmentés</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">Ételek, célértékek, naplók és beállítások exportja vagy visszatöltése.</p>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              <button className="primary-button justify-center" type="button" onClick={exportJson}>
                <Download size={18} /> JSON export
              </button>
              <button className="secondary-button justify-center" type="button" onClick={() => fileInputRef.current?.click()}>
                <Upload size={18} /> JSON import
              </button>
            </div>
            <input ref={fileInputRef} hidden accept="application/json" type="file" onChange={(event) => importJson(event.target.files?.[0])} />
          </div>

          <div className="rounded-[22px] border border-emerald-300/12 bg-slate-950/20 p-4">
            <h3 className="text-base font-semibold text-slate-100">Napi napló</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">Summary-only napok exportja és visszatöltése a napi összesítésekhez.</p>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              <button className="primary-button justify-center" type="button" onClick={exportDailyLogs}>
                <Download size={18} /> Napi napló export
              </button>
              <button className="secondary-button justify-center" type="button" onClick={() => dailyLogInputRef.current?.click()}>
                <Upload size={18} /> Napi napló import
              </button>
            </div>
            <input ref={dailyLogInputRef} hidden accept="application/json" type="file" onChange={(event) => importDailyLogs(event.target.files?.[0])} />
          </div>
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Napi célértékek"
        title="Makró célok"
        description="Csak a kcal, fehérje, zsír és szénhidrát célok látszanak, mobilon is kényelmes szerkesztéssel."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          {macroFieldConfig.map(({ key, label }) => (
            <Field key={key} label={label} tone={key === "fat" ? "fat" : key === "kcal" ? "default" : "macro"}>
              <input
                className="min-h-[42px] rounded-2xl border border-slate-700/50 bg-[#060c13] px-3 text-base text-slate-50"
                inputMode="decimal"
                type="number"
                value={targetDrafts[key]}
                onFocus={() => setActiveTargetField(key)}
                onChange={(event) => handleTargetDraftChange(key, event.target.value)}
                onBlur={() => {
                  commitTargetField(key);
                  setActiveTargetField((current) => (current === key ? null : current));
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.currentTarget.blur();
                }}
              />
            </Field>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        eyebrow="Élelmiszerek"
        title="Élelmiszer-adatbázis"
        description="Kategória szerint rendezett lista, külön szerkesztőblokkal és mobilbarát adatmezőkkel."
        actions={
          <button
            className="inline-flex min-h-[42px] items-center justify-center rounded-2xl border border-cyan-400/20 bg-slate-950/25 px-4 text-sm font-semibold text-cyan-200"
            type="button"
            onClick={startNewFood}
          >
            <Plus size={16} className="mr-2" /> Új élelmiszer
          </button>
        }
      >
        <div className="category-scroll mb-3" aria-label="Élelmiszer kategóriák">
          {foodCategories.map((category) => (
            <button
              className={`category-pill ${category === activeFoodCategory ? "is-active" : ""}`}
              key={category}
              type="button"
              onClick={() => setActiveFoodCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>

        <div className="overflow-hidden rounded-[22px] border border-emerald-300/12 bg-slate-950/20">
          <div className="divide-y divide-slate-700/35">
            {activeCategoryFoods.map((food) => (
              <button
                className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors ${foodDraft.id === food.id ? "bg-cyan-400/8" : "bg-transparent hover:bg-slate-900/35"}`}
                key={food.id}
                type="button"
                onClick={() => {
                  setFoodDraft(food);
                  setIsFoodEditorOpen(true);
                }}
              >
                <div className="min-w-0 flex-1">
                  <strong className="block line-clamp-2 text-[0.96rem] font-semibold leading-6 text-slate-50">{food.name}</strong>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-slate-400">
                    <span>{food.category}</span>
                    <span>{food.step} {food.unit} lépték</span>
                    {dailyFoodAmounts?.[food.id] > 0 ? (
                      <span className="text-cyan-300">ma: {Math.round(dailyFoodAmounts[food.id] * 10) / 10} {food.unit}</span>
                    ) : null}
                  </div>
                </div>
                <div className="shrink-0 text-right text-sm font-medium text-slate-200">{Math.round(food.kcal)} kcal</div>
              </button>
            ))}
          </div>
        </div>

        <button
          className="mt-4 flex w-full items-center justify-between rounded-[20px] border border-emerald-300/12 bg-slate-950/20 px-4 py-3 text-left text-slate-50"
          type="button"
          onClick={() => setIsFoodEditorOpen((current) => !current)}
          aria-expanded={isFoodEditorOpen}
        >
          <span className="min-w-0 text-sm font-semibold">{foodEditorTitle}</span>
          <strong className="ml-4 shrink-0 text-cyan-300">{isFoodEditorOpen ? "▲" : "▶"}</strong>
        </button>

        {isFoodEditorOpen ? (
          <div className="mt-3 rounded-[22px] border border-emerald-300/12 bg-slate-950/20 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Név">
                <input className="min-h-[42px] rounded-2xl border border-slate-700/50 bg-[#060c13] px-3 text-slate-50" value={foodDraft.name} onChange={(event) => setFoodDraft({ ...foodDraft, name: event.target.value })} />
              </Field>
              <Field label="Kategória">
                <select className="min-h-[42px] rounded-2xl border border-slate-700/50 bg-[#060c13] px-3 text-slate-50" value={foodDraft.category} onChange={(event) => setFoodDraft({ ...foodDraft, category: event.target.value })}>
                  {foodCategories.map((category) => <option key={category}>{category}</option>)}
                </select>
              </Field>
              <Field label="Egység">
                <select className="min-h-[42px] rounded-2xl border border-slate-700/50 bg-[#060c13] px-3 text-slate-50" value={foodDraft.unit} onChange={(event) => setFoodDraft({ ...foodDraft, unit: event.target.value })}>
                  {UNITS.map((unit) => <option key={unit}>{unit}</option>)}
                </select>
              </Field>
              {foodFieldConfig.map(({ key, label }) => (
                <Field key={key} label={label} tone={key === "fat" ? "fat" : ["protein", "carbs"].includes(key) ? "macro" : "default"}>
                  <input className="min-h-[42px] rounded-2xl border border-slate-700/50 bg-[#060c13] px-3 text-slate-50" inputMode="decimal" type="number" value={foodDraft[key]} onChange={(event) => setFoodDraft({ ...foodDraft, [key]: numberValue(event.target.value) })} />
                </Field>
              ))}
            </div>

            <button className="primary-button full mt-4" type="button" onClick={saveFood}>Élelmiszer mentése</button>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        eyebrow="Receptek"
        title="Új recept hozzáadása"
        description="A receptépítés külön fő blokkba került, hogy ne keveredjen az alap élelmiszer-adatbázissal."
      >
        <button
          className="flex w-full items-center justify-between rounded-[20px] border border-emerald-300/12 bg-slate-950/20 px-4 py-3 text-left text-slate-50"
          type="button"
          onClick={() => setIsRecipeEditorOpen((current) => !current)}
          aria-expanded={isRecipeEditorOpen}
        >
          <span className="min-w-0 text-sm font-semibold">Recept szerkesztő</span>
          <strong className="ml-4 shrink-0 text-cyan-300">{isRecipeEditorOpen ? "▲" : "▶"}</strong>
        </button>

        {isRecipeEditorOpen ? (
          <div className="mt-3 rounded-[22px] border border-emerald-300/12 bg-slate-950/20 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Recept neve">
                <input className="min-h-[42px] rounded-2xl border border-slate-700/50 bg-[#060c13] px-3 text-slate-50" value={recipeDraft.name} onChange={(event) => setRecipeDraft((current) => ({ ...current, name: event.target.value }))} />
              </Field>
              <Field label="Kategória">
                <select className="min-h-[42px] rounded-2xl border border-slate-700/50 bg-[#060c13] px-3 text-slate-50" value={recipeDraft.category} onChange={(event) => setRecipeDraft((current) => ({ ...current, category: event.target.value }))}>
                  {foodCategories.map((category) => <option key={category}>{category}</option>)}
                </select>
              </Field>
              <Field label="Alapanyag keresése">
                <div className="relative">
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    className="min-h-[42px] w-full rounded-2xl border border-slate-700/50 bg-[#060c13] pl-10 pr-3 text-slate-50"
                    type="search"
                    value={recipeDraft.ingredientSearch}
                    placeholder="Keresés alapanyag névre..."
                    onChange={(event) => setRecipeDraft((current) => ({ ...current, ingredientSearch: event.target.value, ingredientFoodId: "" }))}
                  />
                </div>
              </Field>
              <Field label="Mennyiség">
                <input className="min-h-[42px] rounded-2xl border border-slate-700/50 bg-[#060c13] px-3 text-slate-50" inputMode="decimal" type="number" min="0" value={recipeDraft.ingredientAmount} onChange={(event) => setRecipeDraft((current) => ({ ...current, ingredientAmount: event.target.value }))} />
              </Field>
            </div>

            <div className="mt-4 grid gap-2 max-h-[280px] overflow-y-auto" aria-label="Recept alapanyag találatok">
              {recipeIngredientMatches.map((food) => (
                <button
                  key={food.id}
                  className={`grid gap-1 rounded-[18px] border px-4 py-3 text-left transition-colors ${recipeDraft.ingredientFoodId === food.id ? "border-cyan-400/35 bg-cyan-400/10" : "border-slate-700/40 bg-[#0c131e] hover:bg-slate-900/60"}`}
                  type="button"
                  onClick={() => setRecipeDraft((current) => ({ ...current, ingredientFoodId: food.id, ingredientSearch: food.name }))}
                >
                  <strong className="text-sm font-semibold text-slate-100">{food.name}</strong>
                  <span className="text-xs leading-5 text-slate-400">{Math.round(food.kcal)} kcal · {food.category}</span>
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <button className="secondary-button" type="button" onClick={addRecipeIngredient}>Alapanyag hozzáadása</button>
            </div>

            {recipeDraft.ingredients.length > 0 ? (
              <div className="mt-4 grid gap-2">
                {recipeDraft.ingredients.map((ingredient, index) => {
                  const ingredientFood = foods.find((food) => food.id === ingredient.foodId);
                  if (!ingredientFood) return null;
                  return (
                    <div className="flex items-center justify-between gap-3 rounded-[18px] border border-slate-700/40 bg-[#0c131e] px-4 py-3" key={`${ingredient.foodId}-${index}`}>
                      <div className="min-w-0">
                        <strong className="block text-sm font-semibold text-slate-100">{ingredientFood.name}</strong>
                        <span className="text-xs leading-5 text-slate-400">{Math.round((ingredient.amount || 0) * 10) / 10} {ingredientFood.unit}</span>
                      </div>
                      <button className="secondary-button" type="button" onClick={() => removeRecipeIngredient(index)}>Törlés</button>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div className="mt-4 grid gap-1 rounded-[18px] border border-emerald-300/12 bg-[#0c131e] px-4 py-3 text-sm text-slate-300">
              <strong className="text-sm font-semibold text-slate-100">Teljes recept összesítés</strong>
              <span>{Math.round(recipeTotals.kcal)} kcal</span>
              <span>P {Math.round(recipeTotals.protein * 10) / 10} g · F {Math.round(recipeTotals.fat * 10) / 10} g · Ch {Math.round(recipeTotals.carbs * 10) / 10} g</span>
              <small className="text-xs leading-5 text-slate-500">100% = a teljes recept, napi fogyasztáskor százalékot adhatsz meg.</small>
            </div>

            <button className="primary-button full mt-4" type="button" onClick={saveRecipe}>Mentés receptként</button>
          </div>
        ) : null}
      </SectionCard>
    </main>
  );
}

export default DataView;
