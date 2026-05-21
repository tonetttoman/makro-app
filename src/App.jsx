import { useEffect, useMemo, useRef, useState } from "react";
import { BottomNav } from "./components/BottomNav";
import { DataView } from "./components/DataView";
import { StatsView } from "./components/StatsView";
import { TodayView } from "./components/TodayView";
import { FOOD_CATEGORIES, FOODS } from "./data/foods";
import { DEFAULT_TARGETS, calculateTotals } from "./lib/calculations";
import { toDateKey } from "./lib/dates";
import {
  DIARY_KEY,
  DAILY_LOGS_KEY,
  FOODS_KEY,
  TARGETS_KEY,
  WORKSPACE_KEY
} from "./lib/storage";
import { useLocalStorage } from "./hooks/useLocalStorage";

function getSavedEntriesForDate(diary, date) {
  return (diary[date]?.entries || []).map((entry) => ({ ...entry, locked: true }));
}

function getDailyLogByDate(dailyLogs, date) {
  return (Array.isArray(dailyLogs) ? dailyLogs : []).find((log) => String(log.date).trim().slice(0, 10) === date);
}

function getImportedTotalsForDate(dailyLogs, date) {
  const summary = getDailyLogByDate(dailyLogs, date);
  if (!summary) return null;

  const totals = {
    kcal: Number(summary.kcal) || 0,
    protein: Number(summary.protein) || 0,
    fat: Number(summary.fat) || 0,
    carbs: Number(summary.carbs) || 0
  };

  return Object.values(totals).some((value) => Math.abs(value) > 0) ? totals : null;
}

function getWorkspaceForDate(diary, dailyLogs, date) {
  const entries = getSavedEntriesForDate(diary, date);
  return {
    date,
    entries,
    importedTotals: entries.length ? null : getImportedTotalsForDate(dailyLogs, date)
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

function getFoodSearchRank(foodName, query) {
  const normalizedName = normalizeSearch(foodName);
  if (!query || !normalizedName) return Number.POSITIVE_INFINITY;
  if (normalizedName === query) return 0;
  if (normalizedName.startsWith(query)) return 1;

  const words = normalizedName.split(/[\s\-_/(),.]+/).filter(Boolean);
  if (words.some((word) => word.startsWith(query))) return 2;
  if (normalizedName.includes(query)) return 3;

  return Number.POSITIVE_INFINITY;
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
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [foodSearch, setFoodSearch] = useState("");

  const [foods, setFoods] = useLocalStorage(FOODS_KEY, FOODS);
  const [diary, setDiary] = useLocalStorage(DIARY_KEY, {});
  const [dailyLogs, setDailyLogs] = useLocalStorage(DAILY_LOGS_KEY, []);
  const [targets, setTargets] = useLocalStorage(TARGETS_KEY, DEFAULT_TARGETS);
  const [workspace, setWorkspace] = useLocalStorage(WORKSPACE_KEY, { date: todayKey, entries: [] });
  const preserveLoadedDayRef = useRef(false);

  useEffect(() => {
    const currentDiary = diary || {};
    setWorkspace(getWorkspaceForDate(currentDiary, dailyLogs, todayKey));
  }, []);

  useEffect(() => {
    if (activeView === "today" && preserveLoadedDayRef.current) {
      preserveLoadedDayRef.current = false;
    }
  }, [activeView]);

  const workDate = workspace.date || todayKey;
  const todayEntries = workspace.entries || [];
  const importedTotals = !todayEntries.length ? workspace.importedTotals || getImportedTotalsForDate(dailyLogs, workDate) : null;
  const totals = useMemo(
    () => (todayEntries.length ? calculateTotals(todayEntries, foods) : importedTotals || { kcal: 0, protein: 0, fat: 0, carbs: 0 }),
    [foods, importedTotals, todayEntries]
  );
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
  const foodUsageCounts = useMemo(() => {
    const counts = new Map();

    function addEntry(entry) {
      const foodId =
        (typeof entry?.foodId === "string" && entry.foodId.trim()) ||
        (typeof entry?.food?.id === "string" && entry.food.id.trim()) ||
        (typeof entry?.id === "string" && entry.id.trim()) ||
        "";

      if (!foodId) return;
      counts.set(foodId, (counts.get(foodId) || 0) + 1);
    }

    Object.values(diary || {}).forEach((day) => {
      const entries = Array.isArray(day?.entries) ? day.entries : [];
      entries.forEach(addEntry);
    });

    (Array.isArray(dailyLogs) ? dailyLogs : Object.values(dailyLogs || {})).forEach((dayLog) => {
      const entries = Array.isArray(dayLog?.entries) ? dayLog.entries : [];
      entries.forEach(addEntry);
    });

    (Array.isArray(todayEntries) ? todayEntries : []).forEach(addEntry);

    return counts;
  }, [dailyLogs, diary, todayEntries]);
  const visibleFoods = useMemo(() => {
    const normalizedSearch = normalizeSearch(foodSearch);
    if (!normalizedSearch) return [];

    return foods
      .filter((food) => isRenderableFood(food))
      .map((food) => ({
        food,
        rank: getFoodSearchRank(food.name, normalizedSearch)
      }))
      .filter(({ rank }) => Number.isFinite(rank))
      .sort(
        (left, right) =>
          left.rank - right.rank ||
          (foodUsageCounts.get(right.food.id) || 0) - (foodUsageCounts.get(left.food.id) || 0) ||
          left.food.name.localeCompare(right.food.name, "hu", { sensitivity: "base" })
      )
      .map(({ food }) => food);
  }, [foodSearch, foodUsageCounts, foods]);

  useEffect(() => {
    if (!isQuickAddOpen && foodSearch) {
      setFoodSearch("");
    }
  }, [foodSearch, isQuickAddOpen]);

  useEffect(() => {
    if (activeView !== "today") {
      if (isQuickAddOpen) setIsQuickAddOpen(false);
      if (foodSearch) setFoodSearch("");
    }
  }, [activeView, foodSearch, isQuickAddOpen]);

  function persistEntriesForDate(date, nextEntries) {
    const sanitizedEntries = nextEntries.map((entry) => ({
      ...entry,
      amount: Number(entry.amount) || 0
    }));
    const savedEntries = sanitizedEntries.map((entry) => ({ ...entry, locked: true }));

    setWorkspace((current) => ({
      ...current,
      date,
      entries: sanitizedEntries,
      importedTotals: null
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

  function handleRecipeIngredientAmountChange(entryId, ingredientIndex, foodId, amount) {
    const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
    persistEntriesForDate(
      workDate,
      todayEntries.map((entry) => {
        if (entry.entryId !== entryId) return entry;
        const currentOverrides = Array.isArray(entry.recipeOverrides) ? entry.recipeOverrides : [];
        const nextOverrides = currentOverrides
          .filter((override) => Number(override?.ingredientIndex) !== ingredientIndex)
          .concat({ ingredientIndex, foodId, amount: safeAmount });
        return { ...entry, recipeOverrides: nextOverrides, locked: false };
      })
    );
  }

  function handleRemove(entryId) {
    persistEntriesForDate(workDate, todayEntries.filter((entry) => entry.entryId !== entryId));
  }

  function handleWorkDateChange(date) {
    const nextDate = date || todayKey;
    if (nextDate === workDate) return;
    setWorkspace(getWorkspaceForDate(diary, dailyLogs, nextDate));
  }

  function handleReturnToToday() {
    setWorkspace(getWorkspaceForDate(diary, dailyLogs, todayKey));
  }


  function handleConfirmDailyLog() {
    persistEntriesForDate(workDate, todayEntries);
  }

  function handleLoadToToday(date) {
    preserveLoadedDayRef.current = true;
    setWorkspace(getWorkspaceForDate(diary, dailyLogs, date));
    setActiveView("today");
  }

  function handleViewChange(nextView) {
    if (nextView === activeView) return;

    if (nextView !== "today") {
      setIsQuickAddOpen(false);
      setActiveView(nextView);
      return;
    }

    setIsQuickAddOpen(false);
    if (workDate !== todayKey) {
      setWorkspace(getWorkspaceForDate(diary, dailyLogs, todayKey));
    }
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
          foodSearch={foodSearch}
          isQuickAddOpen={isQuickAddOpen}
          onToggleQuickAdd={(nextState) =>
            setIsQuickAddOpen((current) => (typeof nextState === "boolean" ? nextState : !current))
          }
          onFoodSearchChange={setFoodSearch}
          onAddFood={handleAddFood}
          onSave={handleConfirmDailyLog}
          onWorkDateChange={handleWorkDateChange}
          onReturnToToday={handleReturnToToday}
          onAmountChange={handleAmountChange}
          onRecipeIngredientAmountChange={handleRecipeIngredientAmountChange}
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
      {activeView === "data" && (
        <DataView
          foods={foods}
          setFoods={setFoods}
          foodCategories={foodCategories}
          dailyFoodAmounts={todayFoodAmounts}
          targets={targets}
          setTargets={setTargets}
          diary={diary}
          setDiary={setDiary}
          dailyLogs={dailyLogs}
          setDailyLogs={setDailyLogs}
        />
      )}

      <BottomNav activeView={activeView} onChange={handleViewChange} />
    </div>
  );
}
