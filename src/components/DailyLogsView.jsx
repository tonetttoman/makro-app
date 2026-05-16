import { useMemo, useState } from "react";
import { calculateEntry, calculateMacroRatio, calculateTotals } from "../lib/calculations";

function formatStat(value) {
  const rounded = Math.round((Number(value) || 0) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
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
        status: "mentett tételek",
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

function EntryPreview({ entries, foods }) {
  if (!entries.length) return null;

  return (
    <div className="daily-log-detail-list" style={{ display: "grid", gap: "8px", marginTop: "10px" }}>
      {entries.map((entry) => {
        const food = foods.find((item) => item.id === entry.foodId);
        if (!food) return null;
        const amount = Math.round((Number(entry.amount) || 0) * 10) / 10;
        const values = calculateEntry(food, Number(entry.amount) || 0);
        const amountText = `${Number.isInteger(amount) ? amount : amount.toFixed(1)} ${food.unit}`;
        return (
          <div
            className="daily-log-detail-row"
            key={entry.entryId}
            style={{
              display: "grid",
              gap: "3px",
              padding: "8px 0",
              borderTop: "1px solid rgba(135, 175, 157, 0.12)"
            }}
          >
            <strong style={{ fontSize: "0.92rem", lineHeight: 1.15 }}>{food.name}</strong>
            <span style={{ color: "var(--muted)", fontSize: "0.8rem", lineHeight: 1.35 }}>
              {amountText} · {Math.round(values.kcal)} kcal · F {formatStat(values.protein)} g · Zs {formatStat(values.fat)} g · CH{" "}
              {formatStat(values.carbs)} g
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function DailyLogsView({ diary, dailyLogs, foods, onLoadToToday }) {
  const [openDate, setOpenDate] = useState(null);
  const rows = useMemo(() => buildRows({ diary, dailyLogs, foods }), [dailyLogs, diary, foods]);

  if (!rows.length) {
    return (
      <main className="page">
        <section className="empty-state">
          <h1>Napi naplók</h1>
          <p>Még nincs mentett vagy importált napi napló.</p>
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
                  {row.entries.length > 0 && (
                    <div className="daily-log-actions">
                      <button className="primary-button secondary" type="button" onClick={() => onLoadToToday(row.date, row.entries)}>
                        Betöltés szerkesztésre a Mai fülre
                      </button>
                    </div>
                  )}

                  {row.entries.length > 0 ? (
                    <EntryPreview entries={row.entries} foods={foods} />
                  ) : (
                    <p className="muted">Ez csak összesített importált nap, részletes tétellista nélkül.</p>
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
