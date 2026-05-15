import { Download, Upload } from "lucide-react";
import { useMemo, useRef, useState } from "react";
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

function sortFoodsByName(items) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "hu", { sensitivity: "base" }));
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
  const [activeFoodCategory, setActiveFoodCategory] = useState(FOOD_CATEGORIES[0]);
  const [foodDraft, setFoodDraft] = useState(createBlankFood);
  const [supplementDraft, setSupplementDraft] = useState(createBlankSupplement);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isMacroTargetsOpen, setIsMacroTargetsOpen] = useState(false);
  const [isNutrientTargetsOpen, setIsNutrientTargetsOpen] = useState(false);
  const [isFoodNutrientsOpen, setIsFoodNutrientsOpen] = useState(false);
  const [isSupplementEditorOpen, setIsSupplementEditorOpen] = useState(false);

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
  const macroTargetSummary = `${targets.kcal} kcal / ${targets.protein} F / ${targets.fat} Zs / ${targets.carbs} CH`;
  const nutrientTargetSummary = `${nutrientTargets.length} követett célanyag`;
  const supplementEditorTitle = supplementDraft.name
    ? `Új vagy szerkesztett kiegészítő – ${supplementDraft.name}`
    : "Új vagy szerkesztett kiegészítő";

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
    <main className="page">
      <section className="panel">
        <p className="eyebrow">Adatok</p>
        <button
          className="collapsible-header"
          type="button"
          onClick={() => setIsBackupOpen((current) => !current)}
          aria-expanded={isBackupOpen}
        >
          <span>Import / export / biztonsági mentés</span>
          <strong>{isBackupOpen ? "▼" : "▶"}</strong>
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
              A napi napló import summary-only napokat ment a `dailyLogs` adatszerkezetbe. Meglévő dátumnál frissít, új
              dátumnál hozzáad.
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

      <section className="panel">
        <p className="eyebrow">Napi célértékek</p>
        <button
          className="collapsible-header"
          type="button"
          onClick={() => setIsMacroTargetsOpen((current) => !current)}
          aria-expanded={isMacroTargetsOpen}
        >
          <span>Makró célok – {macroTargetSummary}</span>
          <strong>{isMacroTargetsOpen ? "▼" : "▶"}</strong>
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
          <strong>{isNutrientTargetsOpen ? "▼" : "▶"}</strong>
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

      <section className="panel">
        <p className="eyebrow">Élelmiszerek</p>
        <h2>Új vagy szerkesztett élelmiszer</h2>
        <div className="category-scroll data-category-scroll" aria-label="Élelmiszer kategóriák">
          {FOOD_CATEGORIES.map((category) => (
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
          <button className={`editor-food-button ${!foodDraft.id ? "is-active" : ""}`} type="button" onClick={startNewFood}>
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
              {FOOD_CATEGORIES.map((category) => (
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
          <strong>{isFoodNutrientsOpen ? "▼" : "▶"}</strong>
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
      </section>

      <section className="panel">
        <p className="eyebrow">Kiegészítők</p>
        <button
          className="collapsible-header"
          type="button"
          onClick={() => setIsSupplementEditorOpen((current) => !current)}
          aria-expanded={isSupplementEditorOpen}
        >
          <span>{supplementEditorTitle}</span>
          <strong>{isSupplementEditorOpen ? "▼" : "▶"}</strong>
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
