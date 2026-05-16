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
          <h2>{Math.round(current)} kcal ma</h2>
        </div>
        <span>Cél: {target} kcal</span>
      </div>
      <svg className="trend-chart" viewBox="0 0 100 64" preserveAspectRatio="none" aria-label="Napi kcal grafikon">
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
    <div className="table-panel" style={{ marginTop: "10px", boxShadow: "none" }}>
      <table>
        <thead>
          <tr>
            <th>Nap</th>
            <th>kcal</th>
            <th>F</th>
            <th>Zs</th>
            <th>Sz</th>
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
    <section className="panel" style={{ marginBottom: "12px", padding: "12px" }}>
      <button
        className="collapsible-header"
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        style={{ marginTop: 0 }}
      >
        <span>
          {group.label} · {Math.round(group.total.kcal)} kcal · {group.loggedRows.length} mentett nap
        </span>
        <strong>{isOpen ? "▼" : "▶"}</strong>
      </button>

      <div className="average-grid" style={{ marginBottom: 0 }}>
        <span>Átlag kcal <strong>{Math.round(group.average.kcal)}</strong></span>
        <span>Fehérje átlag <strong>{Math.round(group.average.protein)} g</strong></span>
        <span>Zsír átlag <strong>{Math.round(group.average.fat)} g</strong></span>
        <span>Szénhidrát átlag <strong>{Math.round(group.average.carbs)} g</strong></span>
      </div>

      <p className="muted" style={{ marginBottom: 0 }}>
        Heti összesen: {Math.round(group.total.kcal)} kcal · F {formatStat(group.total.protein)} g · Zs{" "}
        {formatStat(group.total.fat)} g · CH {formatStat(group.total.carbs)} g. Makróarány átlagból:{" "}
        {Math.round(group.ratio.protein)}% fehérje, {Math.round(group.ratio.fat)}% zsír,{" "}
        {Math.round(group.ratio.carbs)}% szénhidrát.
      </p>

      {isOpen && showDailyDetails && <DayRowsTable rows={group.rows} />}
    </section>
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
        <div className="average-grid">
          <span>Átlag kcal <strong>{Math.round(average.kcal)}</strong></span>
          <span>Fehérje átlag <strong>{Math.round(average.protein)} g</strong></span>
          <span>Zsír átlag <strong>{Math.round(average.fat)} g</strong></span>
          <span>Szénhidrát átlag <strong>{Math.round(average.carbs)} g</strong></span>
        </div>
        <p className="muted">
          Az átlag csak a mentett napokat számolja. Mentett napok: {loggedRows.length}. Makróarány átlagból:{" "}
          {Math.round(ratio.protein)}% fehérje, {Math.round(ratio.fat)}% zsír, {Math.round(ratio.carbs)}% szénhidrát.
        </p>
      </section>

      <section aria-label={isMonthlyView ? "Havi heti összesítők" : "Heti összesítő"}>
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
