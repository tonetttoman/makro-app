import { Download, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { calculateEntry } from "../lib/calculations";
import { FOOD_CATEGORIES } from "../data/foods";

const UNITS = ["g", "ml", "db", "adag", "kapszula", "tabletta", "csepp"];

function slugify(value) {
  return value
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

function createBlankSupplement() {
  return {
    id: "",
    name: "",
    category: "kiegészítő",
    unit: "adag",
    baseDose: 1,
    step: 1,
    defaultDose: 1,
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

function sortFoodsByName(items) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "hu", { sensitivity: "base" }));
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
  currentLogs.map(normalizeDailyLog).filter(Boolean).forEach((log) => {
    byDate.set(log.date, log);
  });
  importedLogs.map(normalizeDailyLog).filter(Boolean).forEach((log) => {
    byDate.set(log.date, log);
  });
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function extractDailyLogs(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.dailyLogs)) return data.dailyLogs;
  if (data?.date) return [data];
  return [];
}

function Field({ label, children }) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function NutrientInputs({ values, onChange, nutrientTargets }) {
  return (
    <div className="nutrient-input-grid">
      {nutrientTargets.map((nutrient) => (
        <Field key={nutrient.id} label={`${nutrient.name} (${nutrient.unit})`}>
          <input
            inputMode="decimal"
            type="number"
            value={values[nutrient.id] || ""}
            onChange={(event) =>
              onChange({
                ...values,
                [nutrient.id]: numberValue(event.target.value)
              })
            }
          />
        </Field>
      ))}
    </div>
  );
}

export function DataView({
  foods,
  setFoods,
  foodCategories = FOOD_CATEGORIES,
  dailyFoodAmounts = {},
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
  const [foodDraft, setFoodDraft] = useState(createBlankFood);
  const [supplementDraft, setSupplementDraft] = useState(createBlankSupplement);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isMacroTargetsOpen, setIsMacroTargetsOpen] = useState(false);
  const [isNutrientTargetsOpen, setIsNutrientTargetsOpen] = useState(false);
  const [isFoodEditorOpen, setIsFoodEditorOpen] = useState(false);
  const [isFoodNutrientsOpen, setIsFoodNutrientsOpen] = useState(false);
  const [isSupplementEditorOpen, setIsSupplementEditorOpen] = useState(false);
  const [isRecipeEditorOpen, setIsRecipeEditorOpen] = useState(false);
  const [recipeDraft, setRecipeDraft] = useState(createBlankRecipe);

  const exportData = useMemo(
    () => ({
      version: 1,
      exportedAt: new Date().toISOString(),
      foods,
      supplements,
      macroTargets: targets,
      nutrientTargets,
      diary,
      dailyLogs,
      supplementDiary
    }),
    [dailyLogs, diary, foods, nutrientTargets, supplementDiary, supplements, targets]
  );

  const foodNutrientCount = Object.values(foodDraft.targetNutrients || {}).filter((value) => Number(value) > 0).length;
  const foodEditorTitle = foodDraft.name
    ? `Új vagy szerkesztett élelmiszer – ${foodDraft.name}`
    : "Új vagy szerkesztett élelmiszer";
  const macroTargetSummary = `${targets.kcal} kcal / ${targets.protein} F / ${targets.fat} Zs / ${targets.carbs} CH`;
  const nutrientTargetSummary = `${nutrientTargets.length} követett célanyag`;
  const supplementEditorTitle = supplementDraft.name
    ? `Új vagy szerkesztett kiegészítő – ${supplementDraft.name}`
    : "Új vagy szerkesztett kiegészítő";

  const recipeFoods = useMemo(
    () => sortFoodsByName(foods.filter((food) => food?.id && food?.name && Number(food.baseAmount) > 0)),
    [foods]
  );
  const recipeTotals = useMemo(
    () =>
      recipeDraft.ingredients.reduce(
        (totals, ingredient) => {
          const food = foods.find((item) => item.id === ingredient.foodId);
          if (!food) return totals;
          const values = calculateEntry(food, ingredient.amount);
          return {
            kcal: totals.kcal + values.kcal,
            protein: totals.protein + values.protein,
            fat: totals.fat + values.fat,
            carbs: totals.carbs + values.carbs
          };
        },
        { kcal: 0, protein: 0, fat: 0, carbs: 0 }
      ),
    [foods, recipeDraft.ingredients]
  );
  const recipeIngredientMatches = useMemo(() => {
    const query = normalizeSearch(recipeDraft.ingredientSearch);
    const items = query
      ? recipeFoods.filter((food) => normalizeSearch(food.name).includes(query))
      : recipeFoods;

    return [...items]
      .sort((a, b) => {
        const normalizedA = normalizeSearch(a.name);
        const normalizedB = normalizeSearch(b.name);
        const aStarts = query ? normalizedA.startsWith(query) : false;
        const bStarts = query ? normalizedB.startsWith(query) : false;
        if (aStarts !== bStarts) return aStarts ? -1 : 1;
        if (query) {
          const aIndex = normalizedA.indexOf(query);
          const bIndex = normalizedB.indexOf(query);
          if (aIndex !== bIndex) return aIndex - bIndex;
        }
        return a.name.localeCompare(b.name, "hu", { sensitivity: "base" });
      })
      .slice(0, query ? 12 : 8);
  }, [recipeDraft.ingredientSearch, recipeFoods]);

  useEffect(() => {
    if (foodCategories.length && !foodCategories.includes(activeFoodCategory)) {
      setActiveFoodCategory(foodCategories[0]);
    }
  }, [activeFoodCategory, foodCategories]);

  useEffect(() => {
    if (foodCategories.length && !foodCategories.includes(recipeDraft.category)) {
      setRecipeDraft((current) => ({ ...current, category: foodCategories[0] }));
    }
  }, [foodCategories, recipeDraft.category]);

  function saveFood() {
    const id = foodDraft.id || slugify(foodDraft.name) || `food-${Date.now()}`;
    const nextFood = {
      ...foodDraft,
      id,
      baseAmount: numberValue(foodDraft.baseAmount, 100),
      step: numberValue(foodDraft.step, 1),
      defaultAmount: numberValue(foodDraft.defaultAmount, 100),
      kcal: numberValue(foodDraft.kcal),
      protein: numberValue(foodDraft.protein),
      fat: numberValue(foodDraft.fat),
      carbs: numberValue(foodDraft.carbs),
      targetNutrients: foodDraft.targetNutrients || {}
    };
    setFoods((current) => {
      const exists = current.some((food) => food.id === id);
      return exists ? current.map((food) => (food.id === id ? nextFood : food)) : [...current, nextFood];
    });
    setFoodDraft(createBlankFood());
  }

  function startNewFood() {
    setFoodDraft({ ...createBlankFood(), category: activeFoodCategory });
    setIsFoodEditorOpen(true);
  }

  function addRecipeIngredient() {
    const normalizedQuery = normalizeSearch(recipeDraft.ingredientSearch);
    const foodId =
      recipeDraft.ingredientFoodId ||
      recipeFoods.find((food) => normalizeSearch(food.name) === normalizedQuery)?.id ||
      recipeIngredientMatches[0]?.id;
    const amount = numberValue(recipeDraft.ingredientAmount);
    if (!foodId || amount <= 0) return;
    const ingredientFood = foods.find((food) => food.id === foodId);
    if (!ingredientFood) return;

    setRecipeDraft((current) => ({
      ...current,
      ingredientSearch: "",
      ingredientFoodId: "",
      ingredientAmount: "",
      ingredients: [...current.ingredients, { foodId, amount }]
    }));
  }

  function removeRecipeIngredient(indexToRemove) {
    setRecipeDraft((current) => ({
      ...current,
      ingredients: current.ingredients.filter((_, index) => index !== indexToRemove)
    }));
  }

  function saveRecipe() {
    const recipeName = String(recipeDraft.name || "").trim();
    if (!recipeName) {
      alert("A recept neve kötelező.");
      return;
    }
    if (!recipeDraft.ingredients.length) {
      alert("Legalább egy alapanyag szükséges.");
      return;
    }
    if (recipeDraft.ingredients.some((ingredient) => numberValue(ingredient.amount) <= 0)) {
      alert("Minden alapanyag mennyisége legyen pozitív szám.");
      return;
    }

    const id = `recipe-${slugify(recipeName) || Date.now()}`;
    const nextFood = {
      id,
      name: recipeName,
      category: recipeDraft.category || "Főtt ételek",
      unit: "%",
      baseAmount: 100,
      defaultAmount: 10,
      step: 5,
      kcal: recipeTotals.kcal,
      protein: recipeTotals.protein,
      fat: recipeTotals.fat,
      carbs: recipeTotals.carbs,
      isRecipe: true,
      recipe: {
        ingredients: recipeDraft.ingredients.map((ingredient) => ({
          foodId: ingredient.foodId,
          amount: numberValue(ingredient.amount)
        }))
      },
      targetNutrients: {}
    };

    setFoods((current) => {
      const exists = current.some((food) => food.id === id);
      return exists ? current.map((food) => (food.id === id ? nextFood : food)) : [...current, nextFood];
    });
    setRecipeDraft(createBlankRecipe());
    setIsRecipeEditorOpen(false);
    setActiveFoodCategory(nextFood.category);
  }

  function saveSupplement() {
    const id = supplementDraft.id || slugify(supplementDraft.name) || `supplement-${Date.now()}`;
    const nextSupplement = {
      ...supplementDraft,
      id,
      baseDose: numberValue(supplementDraft.baseDose, 1),
      step: numberValue(supplementDraft.step, 1),
      defaultDose: numberValue(supplementDraft.defaultDose, 1),
      targetNutrients: supplementDraft.targetNutrients || {}
    };
    setSupplements((current) => {
      const exists = current.some((supplement) => supplement.id === id);
      return exists
        ? current.map((supplement) => (supplement.id === id ? nextSupplement : supplement))
        : [...current, nextSupplement];
    });
    setSupplementDraft(createBlankSupplement());
    setIsSupplementEditorOpen(false);
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `etrend-naplo-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function importJson(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data.foods)) setFoods(data.foods);
        if (Array.isArray(data.supplements)) setSupplements(data.supplements);
        if (Array.isArray(data.nutrientTargets)) setNutrientTargets(data.nutrientTargets);
        if (data.macroTargets) setTargets(data.macroTargets);
        if (data.diary) setDiary(data.diary);
        const importedDailyLogs = extractDailyLogs(data);
        if (importedDailyLogs.length) setDailyLogs((current) => mergeDailyLogs(current, importedDailyLogs));
        if (data.supplementDiary) setSupplementDiary(data.supplementDiary);
      } catch {
        alert("Nem sikerült beolvasni a JSON fájlt.");
      }
    };
    reader.readAsText(file);
  }

  function exportDailyLogs() {
    const blob = new Blob([JSON.stringify(dailyLogs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `napi-naplo-osszesites-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function importDailyLogs(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const logs = extractDailyLogs(data);
        if (!logs.length) throw new Error("Invalid dailyLogs import");
        setDailyLogs((current) => mergeDailyLogs(current, logs));
        if (dailyLogInputRef.current) dailyLogInputRef.current.value = "";
      } catch {
        alert("Nem sikerült beolvasni a napi napló JSON fájlt.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <main className="page page--data">
      <section className="panel data-hero-panel">
        <p className="eyebrow">Adatok</p>
        <h1 className="data-page-title">Beállítások és adatok</h1>
        <p className="muted data-page-copy">A célértékek, import/export és szerkesztési funkciók itt maradnak, ugyanabban a sötét, mobilos app-nyelvben.</p>
      </section>

      <section className="panel data-section-panel">
        <p className="eyebrow">Mentések</p>
        <button
          className="collapsible-header"
          type="button"
          onClick={() => setIsBackupOpen((current) => !current)}
          aria-expanded={isBackupOpen}
        >
          <span>Import / export / biztonsági mentés</span>
          <strong>{isBackupOpen ? "▾" : "▸"}</strong>
        </button>
        {isBackupOpen && (
          <>
            <h2 className="section-subtitle">Élelmiszer-adatbázis</h2>
            <div className="data-actions">
              <button className="primary-button" type="button" onClick={exportJson}>
                <Download size={18} /> JSON export
              </button>
              <button className="primary-button secondary" type="button" onClick={() => fileInputRef.current?.click()}>
                <Upload size={18} /> JSON import
              </button>
              <input
                ref={fileInputRef}
                hidden
                accept="application/json"
                type="file"
                onChange={(event) => importJson(event.target.files?.[0])}
              />
            </div>

            <h2 className="section-subtitle">Napi napló / visszamenőleges összesítések</h2>
            <p className="muted">
              A napi napló import summary-only napokat ment a `dailyLogs` adatszerkezetbe. Meglévő dátumnál frissít, új dátumnál hozzáad.
            </p>
            <div className="data-actions">
              <button className="primary-button" type="button" onClick={exportDailyLogs}>
                <Download size={18} /> Napi napló export
              </button>
              <button className="primary-button secondary" type="button" onClick={() => dailyLogInputRef.current?.click()}>
                <Upload size={18} /> Napi napló import
              </button>
              <input
                ref={dailyLogInputRef}
                hidden
                accept="application/json"
                type="file"
                onChange={(event) => importDailyLogs(event.target.files?.[0])}
              />
            </div>
          </>
        )}
      </section>

      <section className="panel data-section-panel">
        <p className="eyebrow">Célértékek</p>
        <button
          className="collapsible-header"
          type="button"
          onClick={() => setIsMacroTargetsOpen((current) => !current)}
          aria-expanded={isMacroTargetsOpen}
        >
          <span>Makró célok – {macroTargetSummary}</span>
          <strong>{isMacroTargetsOpen ? "▾" : "▸"}</strong>
        </button>
        {isMacroTargetsOpen && (
          <div className="form-grid">
            {Object.entries(targets).map(([key, value]) => (
              <Field key={key} label={key}>
                <input
                  inputMode="decimal"
                  type="number"
                  value={value}
                  onChange={(event) => setTargets({ ...targets, [key]: numberValue(event.target.value) })}
                />
              </Field>
            ))}
          </div>
        )}

        <button
          className="collapsible-header"
          type="button"
          onClick={() => setIsNutrientTargetsOpen((current) => !current)}
          aria-expanded={isNutrientTargetsOpen}
        >
          <span>Célanyag célok – {nutrientTargetSummary}</span>
          <strong>{isNutrientTargetsOpen ? "▾" : "▸"}</strong>
        </button>
        {isNutrientTargetsOpen && (
          <div className="form-grid">
            {nutrientTargets.map((nutrient) => (
              <Field key={nutrient.id} label={`${nutrient.name} (${nutrient.unit})`}>
                <input
                  inputMode="decimal"
                  type="number"
                  value={nutrient.dailyTarget}
                  onChange={(event) =>
                    setNutrientTargets((current) =>
                      current.map((item) =>
                        item.id === nutrient.id ? { ...item, dailyTarget: numberValue(event.target.value) } : item
                      )
                    )
                  }
                />
              </Field>
            ))}
          </div>
        )}
      </section>

      <section className="panel data-section-panel">
        <p className="eyebrow">Élelmiszerek</p>
        <button
          className="collapsible-header"
          type="button"
          onClick={() => setIsFoodEditorOpen((current) => !current)}
          aria-expanded={isFoodEditorOpen}
        >
          <span>{foodEditorTitle}</span>
          <strong>{isFoodEditorOpen ? "▾" : "▸"}</strong>
        </button>
        {isFoodEditorOpen && (
          <>
            <div className="category-scroll data-category-scroll" aria-label="Élelmiszer kategóriák">
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
            <div className="editor-food-grid" aria-label="Kategórián belüli élelmiszerek">
              <button
                className={`editor-food-button ${!foodDraft.id ? "is-active" : ""}`}
                type="button"
                onClick={startNewFood}
              >
                <strong>Új élelmiszer</strong>
                <span>{activeFoodCategory}</span>
              </button>
              {sortFoodsByName(foods.filter((food) => food.category === activeFoodCategory)).map((food) => (
                <button
                  className={`editor-food-button ${foodDraft.id === food.id ? "is-active" : ""}`}
                  key={food.id}
                  type="button"
                  onClick={() => setFoodDraft(food)}
                >
                  <strong>{food.name}</strong>
                  {dailyFoodAmounts[food.id] > 0 && (
                    <em className="today-amount">
                      ma: {Math.round(dailyFoodAmounts[food.id] * 10) / 10} {food.unit}
                    </em>
                  )}
                  <span>
                    {food.step} {food.unit} lépték · {Math.round(food.kcal)} kcal
                  </span>
                </button>
              ))}
            </div>
            <div className="form-grid">
              <Field label="Név">
                <input value={foodDraft.name} onChange={(event) => setFoodDraft({ ...foodDraft, name: event.target.value })} />
              </Field>
              <Field label="Kategória">
                <select
                  value={foodDraft.category}
                  onChange={(event) => setFoodDraft({ ...foodDraft, category: event.target.value })}
                >
                  {foodCategories.map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </Field>
              <Field label="Egység">
                <select value={foodDraft.unit} onChange={(event) => setFoodDraft({ ...foodDraft, unit: event.target.value })}>
                  {UNITS.map((unit) => (
                    <option key={unit}>{unit}</option>
                  ))}
                </select>
              </Field>
              {["baseAmount", "defaultAmount", "step", "kcal", "protein", "fat", "carbs"].map((key) => (
                <Field key={key} label={key}>
                  <input
                    inputMode="decimal"
                    type="number"
                    value={foodDraft[key]}
                    onChange={(event) => setFoodDraft({ ...foodDraft, [key]: numberValue(event.target.value) })}
                  />
                </Field>
              ))}
            </div>
            <button
              className="collapsible-header"
              type="button"
              onClick={() => setIsFoodNutrientsOpen((current) => !current)}
              aria-expanded={isFoodNutrientsOpen}
            >
              <span>Célanyagok / mikrotápanyagok ({foodNutrientCount} megadva)</span>
              <strong>{isFoodNutrientsOpen ? "▾" : "▸"}</strong>
            </button>
            {isFoodNutrientsOpen && (
              <NutrientInputs
                values={foodDraft.targetNutrients || {}}
                nutrientTargets={nutrientTargets}
                onChange={(targetNutrients) => setFoodDraft({ ...foodDraft, targetNutrients })}
              />
            )}
            <button className="primary-button full" type="button" onClick={saveFood}>
              Élelmiszer mentése
            </button>
            <button
              className="collapsible-header"
              type="button"
              onClick={() => setIsRecipeEditorOpen((current) => !current)}
              aria-expanded={isRecipeEditorOpen}
            >
              <span>Új recept hozzáadása</span>
              <strong>{isRecipeEditorOpen ? "▾" : "▸"}</strong>
            </button>
            {isRecipeEditorOpen && (
              <>
                <div className="form-grid">
                  <Field label="Recept neve">
                    <input
                      value={recipeDraft.name}
                      onChange={(event) => setRecipeDraft((current) => ({ ...current, name: event.target.value }))}
                    />
                  </Field>
                  <Field label="Kategória">
                    <select
                      value={recipeDraft.category}
                      onChange={(event) => setRecipeDraft((current) => ({ ...current, category: event.target.value }))}
                    >
                      {foodCategories.map((category) => (
                        <option key={category}>{category}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Alapanyag keresése">
                    <input
                      type="search"
                      value={recipeDraft.ingredientSearch}
                      placeholder="Keresés alapanyag névre..."
                      onChange={(event) =>
                        setRecipeDraft((current) => ({
                          ...current,
                          ingredientSearch: event.target.value,
                          ingredientFoodId: ""
                        }))
                      }
                    />
                  </Field>
                  <Field label="Mennyiség">
                    <input
                      inputMode="decimal"
                      type="number"
                      min="0"
                      value={recipeDraft.ingredientAmount}
                      onChange={(event) =>
                        setRecipeDraft((current) => ({ ...current, ingredientAmount: event.target.value }))
                      }
                    />
                  </Field>
                </div>

                <div className="recipe-search-results" aria-label="Recept alapanyag találatok">
                  {recipeIngredientMatches.map((food) => (
                    <button
                      key={food.id}
                      className={`recipe-search-option ${recipeDraft.ingredientFoodId === food.id ? "is-active" : ""}`}
                      type="button"
                      onClick={() =>
                        setRecipeDraft((current) => ({
                          ...current,
                          ingredientFoodId: food.id,
                          ingredientSearch: food.name
                        }))
                      }
                    >
                      <strong>{food.name}</strong>
                      <span>
                        {Math.round(food.kcal)} kcal · {food.category}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="data-actions">
                  <button className="primary-button secondary" type="button" onClick={addRecipeIngredient}>
                    Alapanyag hozzáadása
                  </button>
                </div>

                {recipeDraft.ingredients.length > 0 && (
                  <div className="recipe-ingredient-list">
                    {recipeDraft.ingredients.map((ingredient, index) => {
                      const ingredientFood = foods.find((food) => food.id === ingredient.foodId);
                      if (!ingredientFood) return null;
                      return (
                        <div className="recipe-ingredient-row" key={`${ingredient.foodId}-${index}`}>
                          <div>
                            <strong>{ingredientFood.name}</strong>
                            <span>{Math.round((ingredient.amount || 0) * 10) / 10} {ingredientFood.unit}</span>
                          </div>
                          <button
                            className="secondary-button"
                            type="button"
                            onClick={() => removeRecipeIngredient(index)}
                          >
                            Törlés
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="recipe-summary-card">
                  <strong>Teljes recept összesítés</strong>
                  <span>{Math.round(recipeTotals.kcal)} kcal</span>
                  <span>
                    P {Math.round(recipeTotals.protein * 10) / 10} g · F {Math.round(recipeTotals.fat * 10) / 10} g · Ch {Math.round(recipeTotals.carbs * 10) / 10} g
                  </span>
                  <small>100% = a teljes recept, napi fogyasztáskor százalékot adhatsz meg.</small>
                </div>

                <button className="primary-button full" type="button" onClick={saveRecipe}>
                  Mentés receptként
                </button>
              </>
            )}
          </>
        )}
      </section>

      <section className="panel data-section-panel">
        <p className="eyebrow">Kiegészítők</p>
        <button
          className="collapsible-header"
          type="button"
          onClick={() => setIsSupplementEditorOpen((current) => !current)}
          aria-expanded={isSupplementEditorOpen}
        >
          <span>{supplementEditorTitle}</span>
          <strong>{isSupplementEditorOpen ? "▾" : "▸"}</strong>
        </button>
        {isSupplementEditorOpen && (
          <>
            <Field label="Meglévő kiegészítő">
              <select
                value={supplementDraft.id}
                onChange={(event) => {
                  const selected = supplements.find((supplement) => supplement.id === event.target.value);
                  setSupplementDraft(selected || createBlankSupplement());
                }}
              >
                <option value="">Új kiegészítő</option>
                {supplements.map((supplement) => (
                  <option key={supplement.id} value={supplement.id}>
                    {supplement.name}
                  </option>
                ))}
              </select>
            </Field>
            <div className="form-grid">
              <Field label="Név">
                <input
                  value={supplementDraft.name}
                  onChange={(event) => setSupplementDraft({ ...supplementDraft, name: event.target.value })}
                />
              </Field>
              <Field label="Kategória">
                <input
                  value={supplementDraft.category}
                  onChange={(event) => setSupplementDraft({ ...supplementDraft, category: event.target.value })}
                />
              </Field>
              <Field label="Egység">
                <select
                  value={supplementDraft.unit}
                  onChange={(event) => setSupplementDraft({ ...supplementDraft, unit: event.target.value })}
                >
                  {UNITS.map((unit) => (
                    <option key={unit}>{unit}</option>
                  ))}
                </select>
              </Field>
              {["baseDose", "defaultDose", "step"].map((key) => (
                <Field key={key} label={key}>
                  <input
                    inputMode="decimal"
                    type="number"
                    value={supplementDraft[key]}
                    onChange={(event) => setSupplementDraft({ ...supplementDraft, [key]: numberValue(event.target.value) })}
                  />
                </Field>
              ))}
            </div>
            <h2 className="section-subtitle">Célanyag hozzájárulások</h2>
            <NutrientInputs
              values={supplementDraft.targetNutrients || {}}
              nutrientTargets={nutrientTargets}
              onChange={(targetNutrients) => setSupplementDraft({ ...supplementDraft, targetNutrients })}
            />
            <button className="primary-button full" type="button" onClick={saveSupplement}>
              Kiegészítő mentése
            </button>
          </>
        )}
      </section>
    </main>
  );
}
