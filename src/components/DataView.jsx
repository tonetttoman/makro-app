import { Download, Search, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { calculateEntry } from "../lib/calculations";
import { FOOD_CATEGORIES } from "../data/foods";
import {
  AppButton,
  AppCard,
  AppField,
  AppMetaText,
  AppPage,
  AppSectionTitle,
  AppToggleHeader,
  appInputClassName
} from "./ui/AppUi";

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
  const recipeCardRef = useRef(null);

  const [foodSearch, setFoodSearch] = useState("");
  const [foodDraft, setFoodDraft] = useState(createBlankFood());
  const [isMacroTargetsOpen, setIsMacroTargetsOpen] = useState(false);
  const [isFoodDatabaseOpen, setIsFoodDatabaseOpen] = useState(false);
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
    setTargetDrafts((current) => ({
      kcal: activeTargetField === "kcal" ? current.kcal : String(roundTargetNumber(targets?.kcal)),
      protein: activeTargetField === "protein" ? current.protein : String(roundTargetNumber(targets?.protein)),
      fat: activeTargetField === "fat" ? current.fat : String(roundTargetNumber(targets?.fat)),
      carbs: activeTargetField === "carbs" ? current.carbs : String(roundTargetNumber(targets?.carbs))
    }));
  }, [targets, activeTargetField]);

  useEffect(() => {
    if (!isFoodDatabaseOpen && foodSearch) {
      setFoodSearch("");
    }
  }, [isFoodDatabaseOpen, foodSearch]);

  useEffect(() => {
    if (!isRecipeEditorOpen && (recipeDraft.ingredientSearch || recipeDraft.ingredientFoodId)) {
      setRecipeDraft((current) => ({
        ...current,
        ingredientSearch: "",
        ingredientFoodId: ""
      }));
    }
  }, [isRecipeEditorOpen, recipeDraft.ingredientFoodId, recipeDraft.ingredientSearch]);

  const sortedFoods = useMemo(() => sortFoodsByName(foods || []), [foods]);
  const normalizedFoodSearch = normalizeSearch(foodSearch);
  const filteredFoods = useMemo(() => {
    if (!normalizedFoodSearch) return [];
    return sortedFoods
      .map((food) => {
        const normalizedName = normalizeSearch(food.name);
        const starts = normalizedName.startsWith(normalizedFoodSearch) ? 0 : 1;
        const index = normalizedName.indexOf(normalizedFoodSearch);
        return { food, starts, index };
      })
      .filter(({ index }) => index >= 0)
      .sort(
        (a, b) =>
          a.starts - b.starts ||
          a.index - b.index ||
          a.food.name.localeCompare(b.food.name, "hu", { sensitivity: "base" })
      )
      .slice(0, 16)
      .map(({ food }) => food);
  }, [normalizedFoodSearch, sortedFoods]);

  const foodEditorTitle = foodDraft?.id ? `Szerkesztés: ${foodDraft.name}` : "Új vagy szerkesztett élelmiszer";
  const macroTargetSummary = `Makró célok – ${roundTargetNumber(targets?.kcal)} kcal · P${roundTargetNumber(targets?.protein)} · Zs${roundTargetNumber(targets?.fat)} · CH${roundTargetNumber(targets?.carbs)}`;

  const normalizedRecipeSearch = normalizeSearch(recipeDraft.ingredientSearch);
  const recipeIngredientMatches = useMemo(() => {
    const candidates = sortFoodsByName(foods.filter((food) => !food.isRecipe));
    if (!normalizedRecipeSearch) return [];
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
      category: "Főtt ételek",
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

  function loadRecipeForEditing(food) {
    setIsRecipeEditorOpen(true);
    setIsFoodEditorOpen(false);
    setIsFoodDatabaseOpen(false);
    setRecipeDraft({
      name: food?.name || "",
      category: "Főtt ételek",
      ingredientSearch: "",
      ingredientFoodId: "",
      ingredientAmount: "",
      ingredients: Array.isArray(food?.recipe?.ingredients)
        ? food.recipe.ingredients.map((ingredient) => ({
            foodId: ingredient.foodId,
            amount: numberValue(ingredient.amount)
          }))
        : []
    });

    requestAnimationFrame(() => {
      recipeCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <AppPage>
      <div ref={recipeCardRef}>
        <AppCard>
          <AppToggleHeader
            title="Új recept hozzáadása"
            summary={isRecipeEditorOpen ? "Recept szerkesztő nyitva" : "Recept szerkesztő"}
            isOpen={isRecipeEditorOpen}
            onToggle={() => setIsRecipeEditorOpen((current) => !current)}
          />

          {isRecipeEditorOpen ? (
            <div className="mt-3 rounded-[22px] border border-slate-700/40 bg-[#0f1623] p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <AppField label="Recept neve">
                <input className={appInputClassName} value={recipeDraft.name} onChange={(event) => setRecipeDraft((current) => ({ ...current, name: event.target.value }))} />
              </AppField>
              <AppField label="Alapanyag keresése">
                <div className="relative">
                  <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    className={`${appInputClassName} pl-10 pr-3`}
                    type="search"
                    value={recipeDraft.ingredientSearch}
                    placeholder="Keresés alapanyag névre..."
                    onChange={(event) => setRecipeDraft((current) => ({ ...current, ingredientSearch: event.target.value, ingredientFoodId: "" }))}
                  />
                </div>
              </AppField>
              <AppField label="Mennyiség">
                <input className={appInputClassName} inputMode="decimal" type="number" min="0" value={recipeDraft.ingredientAmount} onChange={(event) => setRecipeDraft((current) => ({ ...current, ingredientAmount: event.target.value }))} />
              </AppField>
            </div>

            {normalizedRecipeSearch ? (
              <div className="mt-4 grid max-h-[280px] gap-2 overflow-y-auto" aria-label="Recept alapanyag találatok">
                {recipeIngredientMatches.map((food) => (
                  <button
                    key={food.id}
                    className={`grid gap-1 rounded-[18px] border px-4 py-3 text-left transition-colors ${recipeDraft.ingredientFoodId === food.id ? "border-cyan-400/35 bg-cyan-400/10" : "border-slate-700/40 bg-[#0c131e] hover:bg-slate-900/60"}`}
                    type="button"
                    onClick={() => setRecipeDraft((current) => ({ ...current, ingredientFoodId: food.id, ingredientSearch: food.name }))}
                  >
                    <strong className="text-sm font-semibold text-slate-100">{food.name}</strong>
                    <AppMetaText>{Math.round(food.kcal)} kcal · {food.category}</AppMetaText>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-[18px] border border-dashed border-slate-700/40 bg-[#0c131e] px-4 py-3 text-sm text-slate-400">
                Kezdj el gépelni az alapanyag kereséséhez.
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2.5">
              <AppButton type="button" onClick={addRecipeIngredient}>Alapanyag hozzáadása</AppButton>
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
                        <AppMetaText>{Math.round((ingredient.amount || 0) * 10) / 10} {ingredientFood.unit}</AppMetaText>
                      </div>
                      <AppButton type="button" onClick={() => removeRecipeIngredient(index)}>Törlés</AppButton>
                    </div>
                  );
                })}
              </div>
            ) : null}

            <div className="mt-4 grid gap-1 rounded-[18px] border border-slate-700/40 bg-[#0c131e] px-4 py-3 text-sm text-slate-300">
              <strong className="text-sm font-semibold text-slate-100">Teljes recept összesítés</strong>
              <span>{Math.round(recipeTotals.kcal)} kcal</span>
              <span>P {Math.round(recipeTotals.protein * 10) / 10} g · F {Math.round(recipeTotals.fat * 10) / 10} g · Ch {Math.round(recipeTotals.carbs * 10) / 10} g</span>
              <small className="text-xs leading-5 text-slate-500">100% = a teljes recept, napi fogyasztáskor százalékot adhatsz meg.</small>
            </div>

              <AppButton className="mt-4 w-full" variant="action" type="button" onClick={saveRecipe}>Mentés receptként</AppButton>
            </div>
          ) : null}
        </AppCard>
      </div>

      <AppCard>
        <AppToggleHeader
          title="Élelmiszer-adatbázis"
          summary={normalizedFoodSearch ? `${filteredFoods.length} találat` : "Kereséssel válassz ételt szerkesztéshez"}
          isOpen={isFoodDatabaseOpen}
          onToggle={() => setIsFoodDatabaseOpen((current) => !current)}
        />

        {isFoodDatabaseOpen ? (
          <>
            <AppField className="mt-3" label="Élelmiszer keresése">
              <div className="relative">
                <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  className={`${appInputClassName} pl-10 pr-3`}
                  type="search"
                  value={foodSearch}
                  placeholder="Keresés élelmiszer névre..."
                  onChange={(event) => setFoodSearch(event.target.value)}
                />
              </div>
            </AppField>

            {normalizedFoodSearch ? (
              <div className="mt-3 overflow-hidden rounded-[22px] border border-slate-700/40 bg-[#0d1420]">
                <div className="divide-y divide-slate-700/35">
                  {filteredFoods.map((food) => (
                    <button
                      className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition-colors ${foodDraft.id === food.id ? "bg-cyan-400/8" : "bg-transparent hover:bg-slate-900/35"}`}
                      key={food.id}
                      type="button"
                      onClick={() => {
                        if (food.category === "Főtt ételek") {
                          loadRecipeForEditing(food);
                          return;
                        }

                        setFoodDraft(food);
                        setIsFoodEditorOpen(true);
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <strong className="block line-clamp-2 text-[0.96rem] font-semibold leading-6 text-slate-50">{food.name}</strong>
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs leading-5 text-slate-400">
                          <span>{Math.round(food.kcal)} kcal</span>
                          <span>P {Math.round((food.protein || 0) * 10) / 10} g</span>
                          <span>F {Math.round((food.fat || 0) * 10) / 10} g</span>
                          <span>Ch {Math.round((food.carbs || 0) * 10) / 10} g</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-3 rounded-[18px] border border-dashed border-slate-700/40 bg-[#0c131e] px-4 py-3 text-sm text-slate-400">
                Kezdj el gépelni az élelmiszer kereséséhez.
              </div>
            )}

            <button
              className="mt-4 flex w-full items-center justify-between rounded-[20px] border border-white/6 bg-[#0d1420] px-4 py-3 text-left text-slate-50"
              type="button"
              onClick={() => setIsFoodEditorOpen((current) => !current)}
              aria-expanded={isFoodEditorOpen}
            >
              <span className="min-w-0 text-sm font-semibold">{foodEditorTitle}</span>
              <strong className="ml-4 shrink-0 text-cyan-300">{isFoodEditorOpen ? "▲" : "▶"}</strong>
            </button>

            {isFoodEditorOpen ? (
              <div className="mt-3 rounded-[22px] border border-slate-700/40 bg-[#0f1623] p-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <AppField label="Név">
                    <input className={appInputClassName} value={foodDraft.name} onChange={(event) => setFoodDraft({ ...foodDraft, name: event.target.value })} />
                  </AppField>
                  <AppField label="Kategória">
                    <select className={appInputClassName} value={foodDraft.category} onChange={(event) => setFoodDraft({ ...foodDraft, category: event.target.value })}>
                      {foodCategories.map((category) => <option key={category}>{category}</option>)}
                    </select>
                  </AppField>
                  <AppField label="Egység">
                    <select className={appInputClassName} value={foodDraft.unit} onChange={(event) => setFoodDraft({ ...foodDraft, unit: event.target.value })}>
                      {UNITS.map((unit) => <option key={unit}>{unit}</option>)}
                    </select>
                  </AppField>
                  {foodFieldConfig.map(({ key, label }) => (
                    <AppField key={key} label={label} tone={key === "fat" ? "fat" : ["protein", "carbs"].includes(key) ? "macro" : "default"}>
                      <input className={appInputClassName} inputMode="decimal" type="number" value={foodDraft[key]} onChange={(event) => setFoodDraft({ ...foodDraft, [key]: numberValue(event.target.value) })} />
                    </AppField>
                  ))}
                </div>

                <AppButton className="mt-4 w-full" variant="primary" type="button" onClick={saveFood}>Élelmiszer mentése</AppButton>
              </div>
            ) : null}
          </>
        ) : null}
      </AppCard>

      <AppCard>
        <AppToggleHeader
          title="Makró célok"
          summary={macroTargetSummary}
          isOpen={isMacroTargetsOpen}
          onToggle={() => setIsMacroTargetsOpen((current) => !current)}
        />

        {isMacroTargetsOpen ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {macroFieldConfig.map(({ key, label }) => (
              <AppField key={key} label={label} tone={key === "fat" ? "fat" : key === "kcal" ? "default" : "macro"}>
                <input
                  className={`${appInputClassName} text-base`}
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
              </AppField>
            ))}
          </div>
        ) : null}
      </AppCard>

      <AppCard>
        <AppSectionTitle>Import / export / biztonsági mentés</AppSectionTitle>
        <div className="mt-3 grid gap-3">
          <div className="rounded-[22px] border border-slate-700/40 bg-[#0d1420] p-4">
            <AppSectionTitle>Teljes adatmentés</AppSectionTitle>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              <AppButton className="w-full" variant="action" type="button" onClick={exportJson}>
                <Download size={18} className="mr-2" /> JSON export
              </AppButton>
              <AppButton className="w-full" type="button" onClick={() => fileInputRef.current?.click()}>
                <Upload size={18} className="mr-2" /> JSON import
              </AppButton>
            </div>
            <input ref={fileInputRef} hidden accept="application/json" type="file" onChange={(event) => importJson(event.target.files?.[0])} />
          </div>

          <div className="rounded-[22px] border border-slate-700/40 bg-[#0d1420] p-4">
            <AppSectionTitle>Napi napló</AppSectionTitle>
            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              <AppButton className="w-full" variant="action" type="button" onClick={exportDailyLogs}>
                <Download size={18} className="mr-2" /> Napi napló export
              </AppButton>
              <AppButton className="w-full" type="button" onClick={() => dailyLogInputRef.current?.click()}>
                <Upload size={18} className="mr-2" /> Napi napló import
              </AppButton>
            </div>
            <input ref={dailyLogInputRef} hidden accept="application/json" type="file" onChange={(event) => importDailyLogs(event.target.files?.[0])} />
          </div>
        </div>
      </AppCard>
    </AppPage>
  );
}

export default DataView;
