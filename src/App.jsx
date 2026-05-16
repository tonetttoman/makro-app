import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "./components/BottomNav";
import { CategoryPicker } from "./components/CategoryPicker";
import { DataView } from "./components/DataView";
import { DailyEntryList } from "./components/DailyEntryList";
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

function getSavedEntriesForDate(diary, date) {
  return (diary[date]?.entries || []).map((entry) => ({ ...entry, locked: true }));
}

function getWorkspaceForDate(diary, date) {
  return { date, entries: getSavedEntriesForDate(diary, date) };
}

function hasUnsavedEntries(entries) {
  return entries.some((entry) => !entry.locked);
}

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
    locked: false,
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
    note: "mentett napi tételek",
    source: "confirmed_daily_entries"
  };
  const exists = dailyLogs.some((log) => log.date === date);
  return exists
    ? dailyLogs.map((log) => (log.date === date ? { ...log, ...nextLog } : log))
    : [...dailyLogs, nextLog].sort((a, b) => a.date.localeCompare(b.date));
}

export default function App() {
  const todayKey = toDateKey();
  const [activeView, setActiveView] = useState("today");
  const [activeCategory, setActiveCategory] = useState(FOOD_CATEGORIES[0]);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [foods, setFoods] = useLocalStorage(FOODS_KEY, FOODS);
  const [workspace, setWorkspace] = useLocalStorage(WORKSPACE_KEY, { date: todayKey, entries: [] });
  const [supplements, setSupplements] = useLocalStorage(SUPPLEMENTS_KEY, SUPPLEMENTS);
  const [nutrientTargets, setNutrientTargets] = useLocalStorage(NUTRIENT_TARGETS_KEY, TARGET_NUTRIENTS);
  const [diary, setDiary] = useLocalStorage(DIARY_KEY, {});
  const [dailyLogs, setDailyLogs] = useLocalStorage(DAILY_LOGS_KEY, []);
  const [supplementDiary, setSupplementDiary] = useLocalStorage(SUPPLEMENT_DIARY_KEY, {});
  const [targets, setTargets] = useLocalStorage(TARGETS_KEY, DEFAULT_TARGETS);

  useEffect(() => {
    setWorkspace(getWorkspaceForDate(diary, toDateKey()));
  }, []);

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

  function handleResetToDefaultDate() {
    setWorkspace(getWorkspaceForDate(diary, toDateKey()));
    setActiveView("today");
  }

  function handleAddFood(food) {
    const existingEntry = todayEntries.find((entry) => entry.foodId === food.id);
    if (existingEntry) {
      updateTodayEntries(
        todayEntries.map((entry) =>
          entry.entryId === existingEntry.entryId
            ? { ...entry, amount: (Number(entry.amount) || 0) + food.defaultAmount, locked: false }
            : entry
        )
      );
      return;
    }
    updateTodayEntries([...todayEntries, createEntry(food)]);
  }

  function handleAmountChange(entryId, amount) {
    const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
    updateTodayEntries(
      todayEntries.map((entry) => (entry.entryId === entryId ? { ...entry, amount: safeAmount, locked: false } : entry))
    );
  }

  function handleToggleLock(entryId) {
    updateTodayEntries(
      todayEntries.map((entry) => (entry.entryId === entryId ? { ...entry, locked: !Boolean(entry.locked) } : entry))
    );
  }

  function handleRemove(entryId) {
    updateTodayEntries(todayEntries.filter((entry) => entry.entryId !== entryId));
  }

  function handleWorkDateChange(date) {
    const nextDate = date || todayKey;
    if (nextDate === workDate) return;
    if (hasUnsavedEntries(todayEntries) && !window.confirm("Nem mentett módosítás van a listában. Dátumváltással eldobod?")) return;
    setWorkspace(getWorkspaceForDate(diary, nextDate));
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

    const entriesToSave = todayEntries.map((entry) => ({ ...entry, locked: true }));
    const savedTotals = calculateTotals(entriesToSave, foods);
    const defaultDate = toDateKey();
    const nextDiary = {
      ...diary,
      [workDate]: {
        date: workDate,
        entries: entriesToSave
      }
    };
    setDiary(nextDiary);
    setDailyLogs((current) => upsertDailyLog(current, workDate, savedTotals));
    setWorkspace(getWorkspaceForDate(nextDiary, defaultDate));
    alert("Tételek mentve.");
  }

  function handleLoadToToday(date, entries) {
    if (date !== workDate && hasUnsavedEntries(todayEntries)) {
      if (!window.confirm("Nem mentett módosítás van a listában. A betöltéssel eldobod?")) return;
    }
    setWorkspace({
      date,
      entries: entries.map((entry) => ({ ...entry, locked: true }))
    });
    setActiveView("today");
  }

  return (
    <div className="app">
      {activeView === "today" && (
        <main className="page">
          <MacroSummary totals={totals} targets={targets} />

          <section className="panel">
            <button
              className="collapsible-header"
              type="button"
              onClick={() => setIsQuickAddOpen((current) => !current)}
              aria-expanded={isQuickAddOpen}
            >
              <span>Gyors hozzáadás – Alap összetevők</span>
              <strong>{isQuickAddOpen ? "▼" : "▶"}</strong>
            </button>
            {isQuickAddOpen && (
              <>
                <div className="panel__header panel__header--compact">
                  <span className="badge">{Object.keys(targetNutrients).length} célanyag-előnézet</span>
                </div>
                <CategoryPicker categories={FOOD_CATEGORIES} activeCategory={activeCategory} onSelect={setActiveCategory} />
                <FoodGrid foods={visibleFoods} dailyAmounts={todayFoodAmounts} onAdd={handleAddFood} />
              </>
            )}
          </section>

          <DailyEntryList
            foods={foods}
            entries={todayEntries}
            onAmountChange={handleAmountChange}
            onRemove={handleRemove}
            onToggleLock={handleToggleLock}
            workDate={workDate}
            onWorkDateChange={handleWorkDateChange}
            onResetToDefaultDate={handleResetToDefaultDate}
            onSave={handleConfirmDailyLog}
          />
        </main>
      )}

      {activeView === "monthly" && (
        <StatsView
          diary={diary}
          dailyLogs={dailyLogs}
          foods={foods}
          targets={targets}
          days={30}
          title="Havi összesítő"
          onLoadToToday={handleLoadToToday}
        />
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
