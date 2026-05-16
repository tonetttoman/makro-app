import { useState } from "react";
import { averageTotals, calculateMacroRatio, calculateTotals, movingAverage } from "../lib/calculations";
import { formatShortDate, getRangeKeys, toDateKey } from "../lib/dates";

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
    if (hasAnyMacroValue(detailedTotals) || !summary) {
      return {
        dateKey,
        sourceType: "detailed",
        ...detailedTotals
      };
    }
  }

  if (summary) {
    return {
      dateKey,
      sourceType: "summary",
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
    sourceType: "empty",
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

const listRowStyle = {
  borderTop: "1px solid rgba(135, 175, 157, 0.12)",
  padding: "9px 2px"
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
  gap: "3px",
  minWidth: 0
};

const macroLineStyle = {
  color: "var(--muted)",
  fontSize: "0.78rem",
  fontWeight: 750,
  lineHeight: 1.25
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

function DayRowsTable({ rows }) {
  return (
    <div className="table-panel" style={{ marginTop: "0", boxShadow: "none" }}>
      <table>
        <thead>
          <tr>
            <th>Nap</th>
            <th>k</th>
            <th>p</th>
            <th>f</th>
            <th>Ch</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.dateKey} className={row.sourceType === "summary" ? "summary-row" : ""}>
              <td>
                {formatShortDate(row.dateKey)}
                {row.sourceType === "summary" && <span className="summary-day-label">összesített importált nap</span>}
                {row.sourceType === "empty" && <span className="summary-day-label">nincs mentett adat</span>}
              </td>
              <td>{formatStat(row.kcal)}</td>
              <td>{formatStat(row.protein)}</td>
              <td>{formatStat(row.fat)}</td>
              <td>{formatStat(row.carbs)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WeekSummaryCard({ group, isOpen, onToggle, showDailyDetails = true }) {
  return (
    <div style={listRowStyle}>
      <button style={rowButtonStyle} type="button" onClick={onToggle} aria-expanded={isOpen}>
        <span style={rowTitleStyle}>
          <strong>{group.label}</strong>
          <span style={macroLineStyle}>{formatMacroLine(group.total)}</span>
          <small className="muted">{group.loggedRows.length} mentett nap</small>
        </span>
        <strong>{isOpen ? "▼" : "▶"}</strong>
      </button>

      {isOpen && showDailyDetails && (
        <div style={openDetailStyle}>
          <div className="average-grid" style={{ marginBottom: 0 }}>
            <span>Átlag k <strong>{Math.round(group.average.kcal)}</strong></span>
            <span>p átlag <strong>{Math.round(group.average.protein)} g</strong></span>
            <span>f átlag <strong>{Math.round(group.average.fat)} g</strong></span>
            <span>Ch átlag <strong>{Math.round(group.average.carbs)} g</strong></span>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            Makróarány: {Math.round(group.ratio.protein)}% p · {Math.round(group.ratio.fat)}% f · {Math.round(group.ratio.carbs)}% Ch
          </p>
          <DayRowsTable rows={group.rows} />
        </div>
      )}
    </div>
  );
}

export function StatsView({ diary, dailyLogs, foods, targets, days, title }) {
  const [openGroups, setOpenGroups] = useState({});
  const keys = getRangeKeys(days);
  const rows = keys.map((dateKey) => buildDayRow({ dateKey, diary, dailyLogs, foods }));
  const loggedRows = rows.filter((row) => row.sourceType !== "empty");
  const average = averageTotals(loggedRows);
  const ratio = calculateMacroRatio(average);
  const weekGroups = buildWeekGroups(rows);
  const isMonthlyView = days > 7;

  function toggleGroup(groupId) {
    setOpenGroups((current) => ({ ...current, [groupId]: !current[groupId] }));
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
            isOpen={Boolean(openGroups[group.id])}
            onToggle={() => toggleGroup(group.id)}
            showDailyDetails
          />
        ))}
      </section>
    </main>
  );
}
