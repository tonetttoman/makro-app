import { useMemo, useState } from "react";
import { calculateEntry, calculateMacroRatio, calculateTotals } from "../lib/calculations";
import { dailyEntryChipStyles } from "./DailyEntryList";

const WEEKDAYS = ["vas", "hét", "ked", "sze", "csü", "pén", "szo"];

function formatStat(value) {
  const rounded = Math.round((Number(value) || 0) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatKcal(value) {
  return `${Math.round(Number(value) || 0)} kcal`;
}

function formatDateWithDay(dateKey) {
  const date = new Date(`${dateKey}T12:00:00`);
  const dayName = WEEKDAYS[date.getDay()] || "";
  return `${dateKey} · ${dayName}`;
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

const listPanelStyle = {
  display: "grid",
  gap: 0,
  padding: "10px",
  marginBottom: "12px"
};

const rowStyle = {
  borderTop: "1px solid rgba(135, 175, 157, 0.12)",
  padding: "8px 2px"
};

const rowButtonStyle = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  gap: "10px",
  padding: 0,
  border: 0,
  background: "transparent",
  color: "inherit",
  textAlign: "left",
  cursor: "pointer"
};

const rowTitleStyle = {
  display: "grid",
  gap: "6px",
  minWidth: 0
};

const titleAndChipsStyle = {
  display: "grid",
  gap: "7px",
  minWidth: 0
};

const rowTitleTopStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  minWidth: 0
};

const statusInlineStyle = {
  color: "var(--muted)",
  fontSize: "0.76rem",
  whiteSpace: "nowrap"
};

const openDetailStyle = {
  display: "grid",
  gap: "10px",
  marginTop: "10px",
  padding: "10px",
  border: "1px solid rgba(135, 175, 157, 0.15)",
  borderRadius: "16px",
  background: "rgba(10, 24, 21, 0.45)"
};

const summaryChipGroupStyle = {
  display: "grid",
  gap: "6px"
};

const macroChipRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "8px"
};

const kcalChipStyle = {
  ...dailyEntryChipStyles.macroChipStyle,
  minWidth: "92px",
  minHeight: "32px",
  padding: "7px 13px",
  fontSize: "0.86rem",
  background: "rgba(37, 99, 77, 0.42)",
  border: "1px solid rgba(94, 234, 178, 0.22)",
  boxShadow: "0 0 0 1px rgba(94, 234, 178, 0.05) inset"
};

const activeKcalChipStyle = {
  ...kcalChipStyle,
  background: "rgba(46, 139, 96, 0.62)",
  border: "1px solid rgba(134, 239, 172, 0.38)",
  boxShadow: "0 0 0 1px rgba(134, 239, 172, 0.12) inset"
};

const macroChipStyle = {
  ...dailyEntryChipStyles.macroChipStyle,
  minWidth: "74px",
  minHeight: "30px",
  padding: "6px 11px",
  fontSize: "0.78rem"
};

const activeMacroChipStyle = {
  ...macroChipStyle,
  background: "rgba(38, 78, 63, 0.68)",
  border: "1px solid rgba(134, 239, 172, 0.24)"
};

export const summaryMacroChipStyles = {
  summaryChipGroupStyle,
  macroChipRowStyle,
  kcalChipStyle,
  activeKcalChipStyle,
  macroChipStyle,
  activeMacroChipStyle
};

export function MacroChips({ totals, active = false }) {
  return (
    <div style={summaryChipGroupStyle} aria-label="Makró összesítés">
      <div>
        <span style={active ? activeKcalChipStyle : kcalChipStyle}>
          <strong>{formatKcal(totals.kcal)}</strong>
        </span>
      </div>
      <div style={macroChipRowStyle}>
        <span style={active ? activeMacroChipStyle : macroChipStyle}>
          <small style={dailyEntryChipStyles.macroLabelStyle}>p</small>
          <strong>{formatStat(totals.protein)} g</strong>
        </span>
        <span style={active ? activeMacroChipStyle : macroChipStyle}>
          <small style={dailyEntryChipStyles.macroLabelStyle}>f</small>
          <strong>{formatStat(totals.fat)} g</strong>
        </span>
        <span style={active ? activeMacroChipStyle : macroChipStyle}>
          <small style={dailyEntryChipStyles.macroLabelStyle}>Ch</small>
          <strong>{formatStat(totals.carbs)} g</strong>
        </span>
      </div>
    </div>
  );
}

function EntryPreview({ entries, foods }) {
  if (!entries.length) return null;

  return (
    <div className="daily-log-detail-list" style={{ display: "grid", gap: "8px" }}>
      {entries.map((entry) => {
        const food = foods.find((item) => item.id === entry.foodId);
        if (!food) return null;
        const values = calculateEntry(food, Number(entry.amount) || 0);
        return (
          <div
            className="daily-log-detail-row"
            key={entry.entryId}
            style={{
              display: "grid",
              gap: "5px",
              padding: "8px 0",
              borderTop: "1px solid rgba(135, 175, 157, 0.12)"
            }}
          >
            <strong style={{ fontSize: "0.92rem", lineHeight: 1.15 }}>{food.name}</strong>
            <div style={dailyEntryChipStyles.compactSummaryStyle} aria-label="Mennyiség és tápértékek">
              <span className="entry-amount-badge" style={dailyEntryChipStyles.amountBadgeStyle}>
                {formatStat(entry.amount)} {food.unit}
              </span>
              <span style={dailyEntryChipStyles.macroChipStyle}>
                <strong>{formatKcal(values.kcal)}</strong>
              </span>
              <span style={dailyEntryChipStyles.macroChipStyle}>
                <small style={dailyEntryChipStyles.macroLabelStyle}>p</small>
                <strong>{formatStat(values.protein)} g</strong>
              </span>
              <span style={dailyEntryChipStyles.macroChipStyle}>
                <small style={dailyEntryChipStyles.macroLabelStyle}>f</small>
                <strong>{formatStat(values.fat)} g</strong>
              </span>
              <span style={dailyEntryChipStyles.macroChipStyle}>
                <small style={dailyEntryChipStyles.macroLabelStyle}>Ch</small>
                <strong>{formatStat(values.carbs)} g</strong>
              </span>
            </div>
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

      <section className="panel" style={listPanelStyle} aria-label="Napi naplók listája">
        {rows.map((row) => {
          const ratio = calculateMacroRatio(row);
          const isOpen = openDate === row.date;
          return (
            <div style={rowStyle} key={row.date}>
              <button style={rowButtonStyle} type="button" onClick={() => setOpenDate(isOpen ? null : row.date)}>
                <span style={rowTitleStyle}>
                  <span style={rowTitleTopStyle}>
                    <strong>{formatDateWithDay(row.date)}</strong>
                    <small style={statusInlineStyle}>{row.status}</small>
                  </span>
                  <MacroChips totals={row} active={isOpen} />
                </span>
                <strong>{isOpen ? "▼" : "▶"}</strong>
              </button>

              {isOpen && (
                <div style={openDetailStyle}>
                  <p className="muted" style={{ margin: 0 }}>
                    Makróarány: {Math.round(ratio.protein)}% p · {Math.round(ratio.fat)}% f · {Math.round(ratio.carbs)}% Ch
                  </p>

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
                    <p className="muted" style={{ margin: 0 }}>Ez csak összesített importált nap, részletes tétellista nélkül.</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>
    </main>
  );
}
