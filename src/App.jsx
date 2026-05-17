import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "./components/BottomNav";
import { DataView } from "./components/DataView";
import { StatsView } from "./components/StatsView";
import { TodayView } from "./components/TodayView";
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

function removeDailyLog(dailyLogs, date) {
  return dailyLogs.filter((log) => log.date !== date);
}

export default function App() {
  const todayKey = toDateKey();
  const [activeView, setActiveView] = useState("today");
  const [activeCategory, setActiveCategory] = useState(FOOD_CATEGORIES[0]);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [foodSearch, setFoodSearch] = useState("");

  const [foods, setFoods] = useLocalStorage(FOODS_KEY, FOODS);
  const [supplements, setSupplements] = useLocalStorage(SUPPLEMENTS_KEY, SUPPLEMENTS);
  const [nutrientTargets, setNutrientTargets] = useLocalStorage(NUTRIENT_TARGETS_KEY, TARGET_NUTRIENTS);
  const [diary, setDiary] = useLocalStorage(DIARY_KEY, {});
  const [dailyLogs, setDailyLogs] = useLocalStorage(DAILY_LOGS_KEY, []);
  const [supplementDiary, setSupplementDiary] = useLocalStorage(SUPPLEMENT_DIARY_KEY, {});
  const [targets, setTargets] = useLocalStorage(TARGETS_KEY, DEFAULT_TARGETS);
  const [workspace, setWorkspace] = useLocalStorage(WORKSPACE_KEY, { date: todayKey, entries: [] });

  useEffect(() => {
    const currentDiary = diary || {};
    setWorkspace(getWorkspaceForDate(currentDiary, todayKey));
  }, []);

  const workDate = workspace.date || todayKey;
  const todayEntries = workspace.entries || [];
  const supplementEntries = supplementDiary[todayKey]?.entries || [];
  const totals = useMemo(() => calculateTotals(todayEntries, foods), [foods, todayEntries]);
  const targetNutrients = useMemo(() => calculateTargetNutrients(todayEntries, foods), [foods, todayEntries]);
  const todayFoodAmounts = useMemo(() => getDailyFoodAmounts(todayEntries), [todayEntries]);
  const foodCategories = useMemo(() => {
    const ordered = [...FOOD_CATEGORIES];
    foods.forEach((food) => {
      if (typeof food?.category === "string" && food.category.trim() && !ordered.includes(food.category)) {
        ordered.push(food.category);
      }
    });
    if (!ordered.includes("Főtt ételek")) ordered.push("Főtt ételek");
    return ordered;
  }, [foods]);
  const visibleFoods = useMemo(() => {
    const normalizedSearch = normalizeSearch(foodSearch);
    const filteredFoods = foods.filter((food) => {
      if (!isRenderableFood(food)) return false;
      if (normalizedSearch) {
        return normalizeSearch(food.name).includes(normalizedSearch);
      }
      return food.category === activeCategory;
    });
    return sortFoodsByName(filteredFoods);
  }, [activeCategory, foodSearch, foods]);

  useEffect(() => {
    if (!foodCategories.includes(activeCategory)) {
      setActiveCategory(foodCategories[0] || FOOD_CATEGORIES[0]);
    }
  }, [activeCategory, foodCategories]);

  function persistEntriesForDate(date, nextEntries) {
    const sanitizedEntries = nextEntries.map((entry) => ({
      ...entry,
      amount: Number(entry.amount) || 0
    }));
    const savedEntries = sanitizedEntries.map((entry) => ({ ...entry, locked: true }));

    setWorkspace((current) => ({
      ...current,
      date,
      entries: sanitizedEntries
    }));

    if (!sanitizedEntries.length) {
      setDiary((current) => {
        if (!current[date]) return current;
        const nextDiary = { ...current };
        delete nextDiary[date];
        return nextDiary;
      });
      setDailyLogs((current) => removeDailyLog(current, date));
      return;
    }

    const savedTotals = calculateTotals(savedEntries, foods);
    setDiary((current) => ({
      ...current,
      [date]: {
        date,
        entries: savedEntries
      }
    }));
    setDailyLogs((current) => upsertDailyLog(current, date, savedTotals));
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
    const existingEntry = todayEntries.find((entry) => entry.foodId === food.id);
    if (existingEntry) {
      persistEntriesForDate(
        workDate,
        todayEntries.map((entry) =>
          entry.entryId === existingEntry.entryId
            ? { ...entry, amount: (Number(entry.amount) || 0) + food.defaultAmount, locked: false }
            : entry
        )
      );
      return;
    }
    persistEntriesForDate(workDate, [...todayEntries, createEntry(food)]);
  }

  function handleAmountChange(entryId, amount) {
    const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
    persistEntriesForDate(
      workDate,
      todayEntries.map((entry) => (entry.entryId === entryId ? { ...entry, amount: safeAmount, locked: false } : entry))
    );
  }

  function handleRemove(entryId) {
    persistEntriesForDate(workDate, todayEntries.filter((entry) => entry.entryId !== entryId));
  }

  function handleWorkDateChange(date) {
    const nextDate = date || todayKey;
    if (nextDate === workDate) return;
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
    persistEntriesForDate(workDate, todayEntries);
  }

  function handleLoadToToday(date, entries) {
    setWorkspace({
      date,
      entries: entries.map((entry) => ({ ...entry, locked: true }))
    });
    setActiveView("today");
  }

  return (
    <div className="app">
      {activeView === "today" && (
        <TodayView
          totals={totals}
          targets={targets}
          workDate={workDate}
          todayKey={todayKey}
          entries={todayEntries}
          foods={foods}
          dailyAmounts={todayFoodAmounts}
          targetNutrients={targetNutrients}
          activeCategory={activeCategory}
          categories={foodCategories}
          foodSearch={foodSearch}
          isQuickAddOpen={isQuickAddOpen}
          onToggleQuickAdd={(nextState) =>
            setIsQuickAddOpen((current) => (typeof nextState === "boolean" ? nextState : !current))
          }
          onSelectCategory={setActiveCategory}
          onFoodSearchChange={setFoodSearch}
          onAddFood={handleAddFood}
          onSave={handleConfirmDailyLog}
          onWorkDateChange={handleWorkDateChange}
          onAmountChange={handleAmountChange}
          onRemove={handleRemove}
          quickAddFoods={visibleFoods}
        />
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
          foodCategories={foodCategories}
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
