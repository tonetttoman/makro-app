import { useMemo, useState } from "react";
import { averageTotals, calculateEntry, calculateMacroRatio, calculateTotals, movingAverage } from "../lib/calculations";
import { formatShortDate, getRangeKeys, toDateKey } from "../lib/dates";
import { dailyEntryChipStyles } from "./DailyEntryList";
import { MacroChips } from "./DailyLogsView";

const WEEKDAYS = ["vas", "hét", "ked", "sze", "csü", "pén", "szo"];

function toPoints(values, max, height = 58) {
  return values
    .map((value, index) => {
      const x = values.length === 1 ? 3 : 3 + (index / (values.length - 1)) * 94;
      const y = height - 4 - (value / max) * (height - 10);
      return `${x},${Math.max(4, Math.min(height - 4, y))}`;
    })
    .join(" ");
}

function getDailyLogByDate(dailyLogs, dateKey) {
  return (Array.isArray(dailyLogs) ? dailyLogs : []).find((log) => String(log.date).trim().slice(0, 10) === dateKey);
}

function toNumber(value) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasAnyMacroValue(totals) {
  return ["kcal", "protein", "fat", "carbs"].some((key) => Math.abs(Number(totals[key]) || 0) > 0);
}

function formatStat(value) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function formatMacroLine(row) {
  return `${formatStat(row.kcal)} k · p ${formatStat(row.protein)} g · f ${formatStat(row.fat)} g · Ch ${formatStat(row.carbs)} g`;
}

function formatDateWithDay(dateKey) {
  const date = new Date(`${dateKey}T12:00:00`);
  const dayName = WEEKDAYS[date.getDay()] || "";
  return `${formatShortDate(dateKey)} · ${dayName}`;
}

function formatDateRange(startKey, endKey) {
  return `${formatShortDate(startKey)} – ${formatShortDate(endKey)}`;
}

function dateFromKey(dateKey) {
  return new Date(`${dateKey}T12:00:00`);
}

function addDaysLocal(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getWeekStartKey(dateKey) {
  const date = dateFromKey(dateKey);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return toDateKey(addDaysLocal(date, mondayOffset));
}

function sumRows(rows) {
  return rows.reduce(
    (totals, row) => ({
      kcal: totals.kcal + row.kcal,
      protein: totals.protein + row.protein,
      fat: totals.fat + row.fat,
      carbs: totals.carbs + row.carbs
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 }
  );
}

function buildDayRow({ dateKey, diary, dailyLogs, foods }) {
  const entries = diary[dateKey]?.entries || [];
  const summary = getDailyLogByDate(dailyLogs, dateKey);

  if (entries.length) {
    const detailedTotals = calculateTotals(entries, foods);
    return {
      dateKey,
      entries,
      sourceType: hasAnyMacroValue(detailedTotals) || !summary ? "detailed" : "summary",
      status: "mentett tételek",
      ...detailedTotals
    };
  }

  if (summary) {
    return {
      dateKey,
      entries: [],
      sourceType: "summary",
      status: "összesített importált nap",
      kcal: toNumber(summary.kcal),
      protein: toNumber(summary.protein),
      fat: toNumber(summary.fat),
      carbs: toNumber(summary.carbs),
      alcoholKcal: toNumber(summary.alcoholKcal),
      note: summary.note,
      source: summary.source
    };
  }

  return {
    dateKey,
    entries: [],
    sourceType: "empty",
    status: "nincs mentett adat",
    kcal: 0,
    protein: 0,
    fat: 0,
    carbs: 0
  };
}

function buildWeekGroups(rows) {
  const byWeek = new Map();
  rows.forEach((row) => {
    const weekStartKey = getWeekStartKey(row.dateKey);
    if (!byWeek.has(weekStartKey)) byWeek.set(weekStartKey, []);
    byWeek.get(weekStartKey).push(row);
  });

  return Array.from(byWeek.entries())
    .map(([weekStartKey, weekRows]) => {
      const sortedRows = [...weekRows].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
      const loggedRows = sortedRows.filter((row) => row.sourceType !== "empty");
      const ascendingRows = [...sortedRows].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
      const startKey = ascendingRows[0]?.dateKey || weekStartKey;
      const endKey = ascendingRows[ascendingRows.length - 1]?.dateKey || weekStartKey;
      const total = sumRows(loggedRows);
      const average = averageTotals(loggedRows);
      const ratio = calculateMacroRatio(average);

      return {
        id: weekStartKey,
        label: formatDateRange(startKey, endKey),
        rows: sortedRows,
        loggedRows,
        isFullWeek: sortedRows.length === 7,
        total,
        average,
        ratio
      };
    })
    .sort((a, b) => b.id.localeCompare(a.id));
}

const listPanelStyle = {
  display: "grid",
  gap: 0,
  padding: "10px",
  marginBottom: "12px"
};

function getListRowStyle(isActive = false) {
  return {
    borderTop: "1px solid rgba(135, 175, 157, 0.12)",
    padding: "8px 2px",
    borderLeft: isActive ? "3px solid rgba(134, 239, 172, 0.5)" : "3px solid transparent",
    background: isActive ? "rgba(24, 70, 51, 0.18)" : "transparent",
    borderRadius: isActive ? "12px" : 0
  };
}

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
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "8px",
  minWidth: 0
};

function getOpenDetailStyle(isActive = false) {
  return {
    display: "grid",
    gap: "10px",
    marginTop: "10px",
    padding: "10px",
    border: isActive ? "1px solid rgba(134, 239, 172, 0.22)" : "1px solid rgba(135, 175, 157, 0.15)",
    borderRadius: "16px",
    background: isActive ? "rgba(12, 45, 33, 0.58)" : "rgba(10, 24, 21, 0.45)"
  };
}

const nestedListStyle = {
  display: "grid",
  gap: 0,
  padding: "2px 0",
  borderTop: "1px solid rgba(135, 175, 157, 0.12)"
};

function MacroTrendChart({ rows, target }) {
  const values = rows.map((row) => row.kcal);
  const averageValues = movingAverage(values, 7);
  const max = Math.max(target, ...values, ...averageValues, 1) * 1.08;
  const targetY = 58 - 4 - (target / max) * 48;
  const barWidth = Math.max(1.4, 84 / Math.max(values.length, 1));
  const current = values[values.length - 1] || 0;

  return (
    <div className="chart-card">
      <div className="chart-card__header">
        <div>
          <p className="eyebrow">Kalória trend</p>
          <h2>{Math.round(current)} k ma</h2>
        </div>
        <span>Cél: {target} k</span>
      </div>
      <svg className="trend-chart" viewBox="0 0 100 64" preserveAspectRatio="none" aria-label="Napi kalória grafikon">
        <line x1="2" x2="98" y1={targetY} y2={targetY} className="trend-chart__target" />
        {values.map((value, index) => {
          const x = 4 + (index / Math.max(values.length - 1, 1)) * 88;
          const height = Math.max(1, (value / max) * 48);
          return (
            <rect
              className={`trend-chart__bar ${rows[index].sourceType === "summary" ? "is-summary" : ""}`}
              key={rows[index].dateKey}
              x={x}
              y={58 - height}
              width={barWidth}
              height={height}
              rx="0.8"
            />
          );
        })}
        <polyline points={toPoints(values, max)} className="trend-chart__value" />
        <polyline points={toPoints(averageValues, max)} className="trend-chart__average" />
        <circle
          className="trend-chart__current"
          cx={values.length === 1 ? 3 : 97}
          cy={58 - 4 - (current / max) * 48}
          r="2"
        />
      </svg>
      <div className="chart-legend">
        <span><i className="legend-line value" /> Aktuális érték</span>
        <span><i className="legend-line average" /> 7 napos mozgóátlag</span>
        <span><i className="legend-line target" /> Célvonal</span>
      </div>
    </div>
  );
}

function EntryPreview({ entries, foods }) {
  if (!entries.length) return null;

  return (
    <div style={{ display: "grid", gap: "8px" }}>
      {entries.map((entry) => {
        const food = foods.find((item) => item.id === entry.foodId);
        if (!food) return null;
        const values = calculateEntry(food, Number(entry.amount) || 0);
        return (
          <div
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
                <small style={dailyEntryChipStyles.macroLabelStyle}>k</small>
                <strong>{Math.round(values.kcal)}</strong>
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

function DaySummaryRow({ row, isOpen, onToggle, onLoadToToday, foods }) {
  const ratio = calculateMacroRatio(row);

  return (
    <div style={getListRowStyle(isOpen)}>
      <button style={rowButtonStyle} type="button" onClick={onToggle} aria-expanded={isOpen}>
        <span style={rowTitleStyle}>
          <span style={titleAndChipsStyle}>
            <strong>{formatDateWithDay(row.dateKey)}</strong>
            <MacroChips totals={row} active={isOpen} />
          </span>
          <small className="muted">{row.status}</small>
        </span>
        <strong>{isOpen ? "▼" : "▶"}</strong>
      </button>

      {isOpen && (
        <div style={getOpenDetailStyle(true)}>
          <p className="muted" style={{ margin: 0 }}>
            Makróarány: {Math.round(ratio.protein)}% p · {Math.round(ratio.fat)}% f · {Math.round(ratio.carbs)}% Ch
          </p>

          {row.entries.length > 0 && (
            <button className="primary-button secondary" type="button" onClick={() => onLoadToToday?.(row.dateKey, row.entries)}>
              Betöltés szerkesztésre a Mai fülre
            </button>
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
}

function WeekSummaryCard({ group, isOpen, openDays, onToggle, onToggleDay, onLoadToToday, foods, showDailyDetails = true }) {
  return (
    <div style={getListRowStyle(isOpen)}>
      <button style={rowButtonStyle} type="button" onClick={onToggle} aria-expanded={isOpen}>
        <span style={rowTitleStyle}>
          <span style={titleAndChipsStyle}>
            <strong>{group.label}</strong>
            <MacroChips totals={group.total} active={isOpen} />
          </span>
          <small className="muted">{group.loggedRows.length} mentett nap</small>
        </span>
        <strong>{isOpen ? "▼" : "▶"}</strong>
      </button>

      {isOpen && showDailyDetails && (
        <div style={getOpenDetailStyle(false)}>
          <p className="muted" style={{ margin: 0 }}>
            Átlag: {formatMacroLine(group.average)}. Makróarány: {Math.round(group.ratio.protein)}% p ·{" "}
            {Math.round(group.ratio.fat)}% f · {Math.round(group.ratio.carbs)}% Ch.
          </p>
          <div style={nestedListStyle}>
            {group.rows.map((row) => (
              <DaySummaryRow
                key={row.dateKey}
                row={row}
                isOpen={Boolean(openDays[row.dateKey])}
                onToggle={() => onToggleDay(row.dateKey)}
                onLoadToToday={onLoadToToday}
                foods={foods}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function StatsView({ diary, dailyLogs, foods, targets, days, title, onLoadToToday }) {
  const [openGroups, setOpenGroups] = useState(null);
  const [openDays, setOpenDays] = useState({});
  const keys = getRangeKeys(days);
  const rows = keys.map((dateKey) => buildDayRow({ dateKey, diary, dailyLogs, foods }));
  const loggedRows = rows.filter((row) => row.sourceType !== "empty");
  const average = averageTotals(loggedRows);
  const ratio = calculateMacroRatio(average);
  const weekGroups = buildWeekGroups(rows);
  const isMonthlyView = days > 7;
  const defaultOpenGroups = useMemo(() => (weekGroups[0] ? { [weekGroups[0].id]: true } : {}), [weekGroups]);
  const visibleOpenGroups = openGroups ?? defaultOpenGroups;

  function toggleGroup(groupId) {
    setOpenGroups((current) => {
      const base = current ?? defaultOpenGroups;
      return { ...base, [groupId]: !base[groupId] };
    });
  }

  function toggleDay(dateKey) {
    setOpenDays((current) => ({ ...current, [dateKey]: !current[dateKey] }));
  }

  return (
    <main className="page">
      <section className="panel">
        <p className="eyebrow">{days} napos nézet</p>
        <h1>{title}</h1>
        {!isMonthlyView && <MacroTrendChart rows={rows} target={targets.kcal} />}
        <p className="muted">
          Átlag: {formatMacroLine(average)}. Mentett napok: {loggedRows.length}. Makróarány:{" "}
          {Math.round(ratio.protein)}% p · {Math.round(ratio.fat)}% f · {Math.round(ratio.carbs)}% Ch.
        </p>
      </section>

      <section className="panel" style={listPanelStyle} aria-label={isMonthlyView ? "Havi heti összesítők" : "Heti összesítő"}>
        {weekGroups.map((group) => (
          <WeekSummaryCard
            key={group.id}
            group={group}
            isOpen={Boolean(visibleOpenGroups[group.id])}
            openDays={openDays}
            onToggle={() => toggleGroup(group.id)}
            onToggleDay={toggleDay}
            onLoadToToday={onLoadToToday}
            foods={foods}
            showDailyDetails
          />
        ))}
      </section>
    </main>
  );
}
