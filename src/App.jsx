import { useMemo, useState } from "react";
import { BottomNav } from "./components/BottomNav";
import { CategoryPicker } from "./components/CategoryPicker";
import { DataView } from "./components/DataView";
import { DailyEntryList } from "./components/DailyEntryList";
import { DailyLogsView } from "./components/DailyLogsView";
import { FoodGrid } from "./components/FoodGrid";
import { MacroSummary } from "./components/MacroSummary";
import { StatsView } from "./components/StatsView";
import { VitaminView } from "./components/VitaminView";
import { FOOD_CATEGORIES, FOODS } from "./data/foods";
import { TARGET_NUTRIENTS } from "./data/nutrients";
import { SUPPLEMENTS } from "./data/supplements";
import { DEFAULT_TARGETS, calculateTargetNutrients, calculateTotals } from "./lib/calculations";
import { toDateKey } from "./lib/dates";
import {
  DIARY_KEY,
  DAILY_LOGS_KEY,
  FOODS_KEY,
  NUTRIENT_TARGETS_KEY,
  SUPPLEMENT_DIARY_KEY,
  SUPPLEMENTS_KEY,
  TARGETS_KEY,
  WORKSPACE_KEY
} from "./lib/storage";
import { useLocalStorage } from "./hooks/useLocalStorage";

const todayKey = toDateKey();

function sortFoodsByName(items) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "hu", { sensitivity: "base" }));
}

function isRenderableFood(food) {
  return Boolean(
    food &&
      typeof food.id === "string" &&
      food.id.trim() &&
      typeof food.name === "string" &&
      food.name.trim() &&
      typeof food.category === "string" &&
      food.category.trim() &&
      Number(food.step) > 0
  );
}

function createUniqueId(prefix) {
  const uniqueId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return `${prefix}-${uniqueId}`;
}

function createEntry(food) {
  return {
    entryId: createUniqueId(food.id),
    foodId: food.id,
    amount: food.defaultAmount,
    createdAt: new Date().toISOString()
  };
}

function createSupplementEntry(supplement) {
  return {
    entryId: createUniqueId(supplement.id),
    supplementId: supplement.id,
    amount: supplement.defaultDose,
    createdAt: new Date().toISOString()
  };
}

function getDailyFoodAmounts(entries) {
  return entries.reduce((amounts, entry) => {
    amounts[entry.foodId] = (amounts[entry.foodId] || 0) + (Number(entry.amount) || 0);
    return amounts;
  }, {});
}

function upsertDailyLog(dailyLogs, date, totals) {
  const proteinCalories = totals.protein * 4;
  const fatCalories = totals.fat * 9;
  const carbCalories = totals.carbs * 4;
  const totalMacroCalories = proteinCalories + fatCalories + carbCalories;
  const macroRatio = totalMacroCalories
    ? {
        protein: (proteinCalories / totalMacroCalories) * 100,
        fat: (fatCalories / totalMacroCalories) * 100,
        carbs: (carbCalories / totalMacroCalories) * 100
      }
    : { protein: 0, fat: 0, carbs: 0 };
  const nextLog = {
    date,
    kcal: totals.kcal,
    protein: totals.protein,
    fat: totals.fat,
    carbs: totals.carbs,
    alcoholKcal: 0,
    macroRatio,
    note: "nyugtázott napi napló",
    source: "confirmed_daily_entries"
  };
  const exists = dailyLogs.some((log) => log.date === date);
  return exists
    ? dailyLogs.map((log) => (log.date === date ? { ...log, ...nextLog } : log))
    : [...dailyLogs, nextLog].sort((a, b) => a.date.localeCompare(b.date));
}

export default function App() {
  const [activeView, setActiveView] = useState("today");
  const [activeCategory, setActiveCategory] = useState(FOOD_CATEGORIES[0]);
  const [foods, setFoods] = useLocalStorage(FOODS_KEY, FOODS);
  const [workspace, setWorkspace] = useLocalStorage(WORKSPACE_KEY, { date: todayKey, entries: [] });
  const [supplements, setSupplements] = useLocalStorage(SUPPLEMENTS_KEY, SUPPLEMENTS);
  const [nutrientTargets, setNutrientTargets] = useLocalStorage(NUTRIENT_TARGETS_KEY, TARGET_NUTRIENTS);
  const [diary, setDiary] = useLocalStorage(DIARY_KEY, {});
  const [dailyLogs, setDailyLogs] = useLocalStorage(DAILY_LOGS_KEY, []);
  const [supplementDiary, setSupplementDiary] = useLocalStorage(SUPPLEMENT_DIARY_KEY, {});
  const [targets, setTargets] = useLocalStorage(TARGETS_KEY, DEFAULT_TARGETS);

  const workDate = workspace.date || todayKey;
  const todayEntries = workspace.entries || [];
  const supplementEntries = supplementDiary[todayKey]?.entries || [];
  const totals = useMemo(() => calculateTotals(todayEntries, foods), [foods, todayEntries]);
  const targetNutrients = useMemo(() => calculateTargetNutrients(todayEntries, foods), [foods, todayEntries]);
  const todayFoodAmounts = useMemo(() => getDailyFoodAmounts(todayEntries), [todayEntries]);
  const visibleFoods = useMemo(() => {
    const filteredFoods = foods.filter((food) => isRenderableFood(food) && food.category === activeCategory);

    if (import.meta.env.DEV) {
      console.log("foods", foods);
      console.log("selectedCategory", activeCategory);
      console.log("filteredFoods", filteredFoods);
    }

    return sortFoodsByName(filteredFoods);
  }, [activeCategory, foods]);

  function updateTodayEntries(nextEntries) {
    setWorkspace((current) => ({
      ...current,
      date: workDate,
      entries: nextEntries
    }));
  }

  function updateSupplementEntries(nextEntries) {
    setSupplementDiary((current) => ({
      ...current,
      [todayKey]: {
        date: todayKey,
        entries: nextEntries
      }
    }));
  }

  function handleAddFood(food) {
    updateTodayEntries([...todayEntries, createEntry(food)]);
  }

  function handleAmountChange(entryId, amount) {
    const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
    updateTodayEntries(
      todayEntries.map((entry) => (entry.entryId === entryId ? { ...entry, amount: safeAmount } : entry))
    );
  }

  function handleRemove(entryId) {
    updateTodayEntries(todayEntries.filter((entry) => entry.entryId !== entryId));
  }

  function handleAddSupplement(supplement) {
    updateSupplementEntries([...supplementEntries, createSupplementEntry(supplement)]);
  }

  function handleSupplementAmountChange(entryId, amount) {
    const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
    updateSupplementEntries(
      supplementEntries.map((entry) => (entry.entryId === entryId ? { ...entry, amount: safeAmount } : entry))
    );
  }

  function handleRemoveSupplement(entryId) {
    updateSupplementEntries(supplementEntries.filter((entry) => entry.entryId !== entryId));
  }

  function handleConfirmDailyLog() {
    if (!todayEntries.length) {
      alert("Nincs menthető tétel a Mai listában.");
      return;
    }
    const hasExisting = (diary[workDate]?.entries || []).length > 0 || dailyLogs.some((log) => log.date === workDate);
    if (hasExisting && !window.confirm("Ehhez a dátumhoz már van mentett napló. Felülírod?")) return;

    const entriesToSave = todayEntries.map((entry) => ({ ...entry }));
    const savedTotals = calculateTotals(entriesToSave, foods);
    setDiary((current) => ({
      ...current,
      [workDate]: {
        date: workDate,
        entries: entriesToSave
      }
    }));
    setDailyLogs((current) => upsertDailyLog(current, workDate, savedTotals));
    alert("Napi napló mentve.");
  }

  function handleLoadToToday(date, entries) {
    setWorkspace({
      date,
      entries: entries.map((entry) => ({ ...entry }))
    });
    setActiveView("today");
  }

  return (
    <div className="app">
      {activeView === "today" && (
        <main className="page">
          <MacroSummary totals={totals} targets={targets} />

          <section className="panel">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Gyors hozzáadás</p>
                <h2>Alap összetevők</h2>
              </div>
              <span className="badge">{Object.keys(targetNutrients).length} célanyag-előnézet</span>
            </div>
            <CategoryPicker categories={FOOD_CATEGORIES} activeCategory={activeCategory} onSelect={setActiveCategory} />
            <FoodGrid foods={visibleFoods} dailyAmounts={todayFoodAmounts} onAdd={handleAddFood} />
          </section>

          <DailyEntryList foods={foods} entries={todayEntries} onAmountChange={handleAmountChange} onRemove={handleRemove} />

          <section className="panel workday-panel">
            <label className="form-field">
              <span>Mentés dátuma</span>
              <input
                type="date"
                value={workDate}
                onChange={(event) => setWorkspace((current) => ({ ...current, date: event.target.value || todayKey }))}
              />
            </label>
            <button className="primary-button full" type="button" onClick={handleConfirmDailyLog}>
              Napi napló mentése
            </button>
          </section>
        </main>
      )}

      {activeView === "daily" && (
        <DailyLogsView
          diary={diary}
          setDiary={setDiary}
          dailyLogs={dailyLogs}
          setDailyLogs={setDailyLogs}
          foods={foods}
          onLoadToToday={handleLoadToToday}
        />
      )}

      {activeView === "weekly" && (
        <StatsView diary={diary} dailyLogs={dailyLogs} foods={foods} targets={targets} days={7} title="Heti összesítő" />
      )}
      {activeView === "monthly" && (
        <StatsView diary={diary} dailyLogs={dailyLogs} foods={foods} targets={targets} days={30} title="Havi összesítő" />
      )}
      {activeView === "vitamins" && (
        <VitaminView
          diary={diary}
          supplementDiary={supplementDiary}
          foods={foods}
          supplements={supplements}
          nutrientTargets={nutrientTargets}
          foodNutrients={targetNutrients}
          supplementEntries={supplementEntries}
          onAddSupplement={handleAddSupplement}
          onAddTargetFood={handleAddFood}
          onSupplementAmountChange={handleSupplementAmountChange}
          onRemoveSupplement={handleRemoveSupplement}
        />
      )}
      {activeView === "data" && (
        <DataView
          foods={foods}
          setFoods={setFoods}
          dailyFoodAmounts={todayFoodAmounts}
          supplements={supplements}
          setSupplements={setSupplements}
          targets={targets}
          setTargets={setTargets}
          nutrientTargets={nutrientTargets}
          setNutrientTargets={setNutrientTargets}
          diary={diary}
          setDiary={setDiary}
          dailyLogs={dailyLogs}
          setDailyLogs={setDailyLogs}
          supplementDiary={supplementDiary}
          setSupplementDiary={setSupplementDiary}
        />
      )}

      <BottomNav activeView={activeView} onChange={setActiveView} />
    </div>
  );
}
