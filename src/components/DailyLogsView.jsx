import { useMemo, useState } from "react";
import { CategoryPicker } from "./CategoryPicker";
import { DailyEntryList } from "./DailyEntryList";
import { FoodGrid } from "./FoodGrid";
import { FOOD_CATEGORIES } from "../data/foods";
import { calculateMacroRatio, calculateTotals } from "../lib/calculations";

function formatStat(value) {
  const rounded = Math.round((Number(value) || 0) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function sortFoodsByName(items) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "hu", { sensitivity: "base" }));
}

function createEntry(food) {
  const uniqueId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return {
    entryId: `${food.id}-${uniqueId}`,
    foodId: food.id,
    amount: food.defaultAmount,
    createdAt: new Date().toISOString()
  };
}

function upsertDailyLog(dailyLogs, date, totals, patch = {}) {
  const ratio = calculateMacroRatio(totals);
  const nextLog = {
    date,
    kcal: Number(totals.kcal) || 0,
    protein: Number(totals.protein) || 0,
    fat: Number(totals.fat) || 0,
    carbs: Number(totals.carbs) || 0,
    alcoholKcal: Number(patch.alcoholKcal) || 0,
    macroRatio: ratio,
    note: patch.note || "nyugtázott napi napló",
    source: patch.source || "confirmed_daily_entries"
  };
  const exists = dailyLogs.some((log) => log.date === date);
  return exists
    ? dailyLogs.map((log) => (log.date === date ? { ...log, ...nextLog } : log))
    : [...dailyLogs, nextLog].sort((a, b) => a.date.localeCompare(b.date));
}

function getDailyLog(dailyLogs, date) {
  return dailyLogs.find((log) => log.date === date);
}

function buildRows({ diary, dailyLogs, foods }) {
  const dates = Array.from(new Set([...Object.keys(diary || {}), ...(dailyLogs || []).map((log) => log.date)]))
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a));

  return dates.map((date) => {
    const entries = diary[date]?.entries || [];
    const log = getDailyLog(dailyLogs, date);
    if (entries.length) {
      const totals = calculateTotals(entries, foods);
      return {
        date,
        entries,
        log,
        sourceType: "confirmed",
        status: "nyugtázott nap",
        ...totals
      };
    }
    return {
      date,
      entries: [],
      log,
      sourceType: log ? "summary" : "draft",
      status: log ? "összesített importált nap" : "folyamatban lévő nap",
      kcal: Number(log?.kcal) || 0,
      protein: Number(log?.protein) || 0,
      fat: Number(log?.fat) || 0,
      carbs: Number(log?.carbs) || 0,
      alcoholKcal: Number(log?.alcoholKcal) || 0
    };
  });
}

export function DailyLogsView({ diary, setDiary, dailyLogs, setDailyLogs, foods, onLoadToToday }) {
  const [openDate, setOpenDate] = useState(null);
  const [activeCategory, setActiveCategory] = useState(FOOD_CATEGORIES[0]);
  const rows = useMemo(() => buildRows({ diary, dailyLogs, foods }), [dailyLogs, diary, foods]);
  const visibleFoods = sortFoodsByName(foods.filter((food) => food.category === activeCategory && food.id && food.name));

  function updateEntries(date, nextEntries) {
    setDiary((current) => ({
      ...current,
      [date]: {
        date,
        entries: nextEntries
      }
    }));
    const totals = calculateTotals(nextEntries, foods);
    setDailyLogs((current) => upsertDailyLog(current, date, totals));
  }

  function updateSummary(date, key, value) {
    const parsed = Number(String(value).replace(",", "."));
    setDailyLogs((current) =>
      current.map((log) =>
        log.date === date
          ? {
              ...log,
              [key]: Number.isFinite(parsed) ? parsed : 0,
              source: log.source || "manual_summary_import"
            }
          : log
      )
    );
  }

  function deleteDay(date) {
    if (!window.confirm("Biztosan törlöd ezt a napi naplót?")) return;
    setDiary((current) => {
      const next = { ...current };
      delete next[date];
      return next;
    });
    setDailyLogs((current) => current.filter((log) => log.date !== date));
  }

  if (!rows.length) {
    return (
      <main className="page">
        <section className="empty-state">
          <h1>Napi naplók</h1>
          <p>Még nincs nyugtázott vagy importált napi napló.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="panel">
        <p className="eyebrow">Mentett napok</p>
        <h1>Napi naplók</h1>
      </section>

      <section className="daily-log-list">
        {rows.map((row) => {
          const ratio = calculateMacroRatio(row);
          const isOpen = openDate === row.date;
          return (
            <article className="daily-log-card" key={row.date}>
              <button className="daily-log-card__summary" type="button" onClick={() => setOpenDate(isOpen ? null : row.date)}>
                <span>
                  <strong>{row.date}</strong>
                  <small>{row.status}</small>
                </span>
                <span className="daily-log-card__kcal">{formatStat(row.kcal)} kcal</span>
              </button>
              <div className="daily-log-metrics">
                <span>F {formatStat(row.protein)} g</span>
                <span>Zs {formatStat(row.fat)} g</span>
                <span>CH {formatStat(row.carbs)} g</span>
                <span>{Math.round(ratio.protein)}% / {Math.round(ratio.fat)}% / {Math.round(ratio.carbs)}%</span>
              </div>

              {isOpen && (
                <div className="daily-log-detail">
                  <p className="eyebrow">Szerkesztés</p>
                  <div className="daily-log-actions">
                    {row.entries.length > 0 && (
                      <button className="primary-button secondary" type="button" onClick={() => onLoadToToday(row.date, row.entries)}>
                        Betöltés szerkesztésre a Mai fülre
                      </button>
                    )}
                    <button className="primary-button secondary danger-text" type="button" onClick={() => deleteDay(row.date)}>
                      Napi napló törlése
                    </button>
                  </div>

                  {row.entries.length > 0 ? (
                    <>
                      <DailyEntryList
                        foods={foods}
                        entries={row.entries}
                        onAmountChange={(entryId, amount) =>
                          updateEntries(
                            row.date,
                            row.entries.map((entry) =>
                              entry.entryId === entryId ? { ...entry, amount: Math.max(0, Number(amount) || 0) } : entry
                            )
                          )
                        }
                        onRemove={(entryId) => updateEntries(row.date, row.entries.filter((entry) => entry.entryId !== entryId))}
                      />
                      <div className="daily-add-panel">
                        <CategoryPicker categories={FOOD_CATEGORIES} activeCategory={activeCategory} onSelect={setActiveCategory} />
                        <FoodGrid
                          foods={visibleFoods}
                          dailyAmounts={{}}
                          onAdd={(food) => updateEntries(row.date, [...row.entries, createEntry(food)])}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="summary-edit-grid">
                      {["kcal", "protein", "fat", "carbs", "alcoholKcal"].map((key) => (
                        <label className="form-field" key={key}>
                          <span>{key}</span>
                          <input
                            inputMode="decimal"
                            type="number"
                            value={row[key] || ""}
                            onChange={(event) => updateSummary(row.date, key, event.target.value)}
                          />
                        </label>
                      ))}
                      <p className="muted">összesített importált nap</p>
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </section>
    </main>
  );
}
