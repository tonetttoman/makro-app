import { averageTotals, calculateMacroRatio, calculateTotals, movingAverage } from "../lib/calculations";
import { formatShortDate, getRangeKeys } from "../lib/dates";

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

export function StatsView({ diary, dailyLogs, foods, targets, days, title }) {
  const keys = getRangeKeys(days);
  const rows = keys.map((dateKey) => buildDayRow({ dateKey, diary, dailyLogs, foods }));
  const average = averageTotals(rows);
  const ratio = calculateMacroRatio(average);

  return (
    <main className="page">
      <section className="panel">
        <p className="eyebrow">{days} napos nézet</p>
        <h1>{title}</h1>
        <MacroTrendChart rows={rows} target={targets.kcal} />
        <div className="average-grid">
          <span>Átlag kcal <strong>{Math.round(average.kcal)}</strong></span>
          <span>Fehérje átlag <strong>{Math.round(average.protein)} g</strong></span>
          <span>Zsír átlag <strong>{Math.round(average.fat)} g</strong></span>
          <span>Szénhidrát átlag <strong>{Math.round(average.carbs)} g</strong></span>
        </div>
        <p className="muted">
          Makróarány átlagból: {Math.round(ratio.protein)}% fehérje, {Math.round(ratio.fat)}% zsír,{" "}
          {Math.round(ratio.carbs)}% szénhidrát.
        </p>
      </section>

      <section className="table-panel">
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
                </td>
                <td>{formatStat(row.kcal)}</td>
                <td>{formatStat(row.protein)}</td>
                <td>{formatStat(row.fat)}</td>
                <td>{formatStat(row.carbs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
