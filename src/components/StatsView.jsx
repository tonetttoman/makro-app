import { CalendarDays, PencilLine } from "lucide-react";
import { useMemo, useState } from "react";
import { averageTotals, calculateDiaryEntry, calculateMacroRatio, calculateTotals, hasRecipeEntryOverrides } from "../lib/calculations";
import { formatShortDate, getRangeKeys, toDateKey } from "../lib/dates";
import { AppButton, AppCard, AppMetaText, AppNestedCard, AppPage, AppSectionTitle } from "./ui/AppUi";

const TREND_SERIES = [
  { key: "kcalAverage", label: "kcal", color: "#0ea5e9", dotClass: "bg-[#0ea5e9]", targetKey: "kcal" },
  { key: "proteinAverage", label: "P", color: "#22d3ee", dotClass: "bg-[#22d3ee]", targetKey: "protein" },
  { key: "fatAverage", label: "F", color: "#fde047", dotClass: "bg-[#fde047]", targetKey: "fat" },
  { key: "carbsAverage", label: "Ch", color: "#c084fc", dotClass: "bg-[#c084fc]", targetKey: "carbs" }
];

const CHART_HEIGHT = 220;
const CHART_TOP = 12;
const CHART_BOTTOM = 12;
const CHART_LEFT = 12;
const CHART_RIGHT = 84;
const LABEL_LEFT = "87%";
const BAND_GAP = 8;
const BAND_COUNT = 4;
const BAND_HEIGHT = (CHART_HEIGHT - CHART_TOP - CHART_BOTTOM - BAND_GAP * (BAND_COUNT - 1)) / BAND_COUNT;

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

function formatWeekdayName(dateKey) {
  return new Intl.DateTimeFormat("hu-HU", { weekday: "long" }).format(new Date(`${dateKey}T12:00:00`));
}

function formatMonthLabel(dateKey) {
  const label = new Intl.DateTimeFormat("hu-HU", { month: "long" }).format(new Date(`${dateKey}T12:00:00`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function dateFromKey(dateKey) {
  return new Date(`${dateKey}T12:00:00`);
}

function addDaysLocal(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getMonthId(dateKey) {
  return String(dateKey).slice(0, 7);
}

function getMonthStartKey(dateKey) {
  const date = dateFromKey(dateKey);
  return toDateKey(new Date(date.getFullYear(), date.getMonth(), 1, 12));
}

function getMonthEndKey(dateKey) {
  const date = dateFromKey(dateKey);
  return toDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0, 12));
}

function getWeekStartKey(dateKey) {
  const date = dateFromKey(dateKey);
  const day = date.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return toDateKey(addDaysLocal(date, mondayOffset));
}

function getWeekNumber(dateKey) {
  const date = dateFromKey(getWeekStartKey(dateKey));
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  return Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
}

function expandKeysToCalendarMonths(keys) {
  const monthIds = [...new Set(keys.map(getMonthId))];

  return monthIds.flatMap((monthId) => {
    const startKey = getMonthStartKey(`${monthId}-01`);
    const endKey = getMonthEndKey(`${monthId}-01`);
    const expanded = [];
    let cursor = dateFromKey(startKey);
    const endDate = dateFromKey(endKey);

    while (cursor <= endDate) {
      expanded.push(toDateKey(cursor));
      cursor = addDaysLocal(cursor, 1);
    }

    return expanded;
  });
}

function collectDataKeys(diary, dailyLogs) {
  const keys = new Set();

  Object.keys(diary || {}).forEach((dateKey) => {
    const normalizedKey = String(dateKey || "").trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedKey)) keys.add(normalizedKey);
  });

  (Array.isArray(dailyLogs) ? dailyLogs : []).forEach((log) => {
    const normalizedKey = String(log?.date || "").trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedKey)) keys.add(normalizedKey);
  });

  return Array.from(keys).sort((a, b) => a.localeCompare(b));
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

function calculateMovingAverageSeries(items, key, windowSize) {
  return items.map((_, index) => {
    const startIndex = Math.max(0, index - windowSize + 1);
    const slice = items.slice(startIndex, index + 1);
    const sum = slice.reduce((total, item) => total + (Number(item[key]) || 0), 0);
    return slice.length ? sum / slice.length : 0;
  });
}

function buildTrendChartData(rows, windowSize) {
  const sortedRows = [...rows].sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  const kcalSeries = calculateMovingAverageSeries(sortedRows, "kcal", windowSize);
  const proteinSeries = calculateMovingAverageSeries(sortedRows, "protein", windowSize);
  const fatSeries = calculateMovingAverageSeries(sortedRows, "fat", windowSize);
  const carbsSeries = calculateMovingAverageSeries(sortedRows, "carbs", windowSize);

  return sortedRows.map((row, index) => ({
    dateKey: row.dateKey,
    kcal: Number(row.kcal) || 0,
    protein: Number(row.protein) || 0,
    fat: Number(row.fat) || 0,
    carbs: Number(row.carbs) || 0,
    kcalAverage: kcalSeries[index],
    proteinAverage: proteinSeries[index],
    fatAverage: fatSeries[index],
    carbsAverage: carbsSeries[index]
  }));
}

function buildSmoothPath(points) {
  if (!points.length) return "";
  if (points.length === 1) {
    const [point] = points;
    return `M ${point.x} ${point.y} L ${point.x + 0.01} ${point.y}`;
  }

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[index - 1] || points[index];
    const current = points[index];
    const next = points[index + 1];
    const afterNext = points[index + 2] || next;

    const controlPoint1X = current.x + (next.x - previous.x) / 6;
    const controlPoint1Y = current.y + (next.y - previous.y) / 6;
    const controlPoint2X = next.x - (afterNext.x - current.x) / 6;
    const controlPoint2Y = next.y - (afterNext.y - current.y) / 6;

    path += ` C ${controlPoint1X} ${controlPoint1Y}, ${controlPoint2X} ${controlPoint2Y}, ${next.x} ${next.y}`;
  }

  return path;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getSeriesScale({ averageValues, rawValues, targetValue }) {
  const finiteValues = [...averageValues, ...rawValues]
    .filter((value) => Number.isFinite(Number(value)))
    .map(Number);
  const numericTarget = Number(targetValue);

  if (Number.isFinite(numericTarget) && numericTarget >= 0) {
    finiteValues.push(numericTarget);
  }

  if (!finiteValues.length) return { min: 0, max: 1, target: null };

  const minValue = Math.min(...finiteValues);
  const maxValue = Math.max(...finiteValues);
  if (maxValue > minValue) {
    const padding = Math.max((maxValue - minValue) * 0.15, 1);
    return {
      min: Math.max(0, minValue - padding),
      max: maxValue + padding,
      target: Number.isFinite(numericTarget) && numericTarget >= 0 ? numericTarget : null
    };
  }

  const padding = Math.max(Math.abs(minValue) * 0.15, 1);
  return {
    min: Math.max(0, minValue - padding),
    max: minValue + padding,
    target: Number.isFinite(numericTarget) && numericTarget >= 0 ? numericTarget : null
  };
}

function getBandY(value, bandIndex, scale) {
  const bandTop = CHART_TOP + bandIndex * (BAND_HEIGHT + BAND_GAP);
  const bandBottom = bandTop + BAND_HEIGHT;
  const verticalPadding = 6;
  const usableHeight = Math.max(10, BAND_HEIGHT - verticalPadding * 2);
  const spread = Math.max(1, scale.max - scale.min);
  const normalized = clamp((Number(value) - scale.min) / spread, 0, 1);

  return bandBottom - verticalPadding - normalized * usableHeight;
}

function buildBandPoints(values, bandIndex, scale) {
  return values.map((value, index) => {
    const x = values.length === 1 ? (CHART_LEFT + CHART_RIGHT) / 2 : CHART_LEFT + (index / (values.length - 1)) * (CHART_RIGHT - CHART_LEFT);

    return {
      x,
      y: getBandY(value, bandIndex, scale)
    };
  });
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
      status: "összesített nap",
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
    status: "nincs adat",
    kcal: 0,
    protein: 0,
    fat: 0,
    carbs: 0
  };
}

function buildWeekGroups(rows, idPrefix = "") {
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
      const weekNumber = getWeekNumber(weekStartKey);

      return {
        id: `${idPrefix}${weekStartKey}`,
        label: `${weekNumber}. hét`,
        rangeLabel: formatDateRange(startKey, endKey),
        rows: sortedRows,
        loggedRows,
        total,
        average,
        ratio,
        startKey
      };
    })
    .sort((a, b) => b.startKey.localeCompare(a.startKey));
}

function buildMonthGroups(rows, todayKey) {
  const byMonth = new Map();

  rows.forEach((row) => {
    const monthId = getMonthId(row.dateKey);
    if (!byMonth.has(monthId)) byMonth.set(monthId, []);
    byMonth.get(monthId).push(row);
  });

  return Array.from(byMonth.entries())
    .map(([monthId, monthRows]) => {
      const sortedRows = [...monthRows].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
      const loggedRows = sortedRows.filter((row) => row.sourceType !== "empty");
      const average = averageTotals(loggedRows);
      const ratio = calculateMacroRatio(average);
      const total = sumRows(loggedRows);

      return {
        id: monthId,
        label: formatMonthLabel(sortedRows[0]?.dateKey || `${monthId}-01`),
        rows: sortedRows,
        loggedRows,
        total,
        average,
        ratio,
        weeks: buildWeekGroups(sortedRows, `${monthId}-`).filter((week) => week.startKey <= todayKey)
      };
    })
    .sort((a, b) => b.id.localeCompare(a.id));
}

function shouldShowDayRow(row, todayKey) {
  if (row.dateKey <= todayKey) return true;
  return row.sourceType !== "empty";
}

function TrendOverviewPanel({ rows, ratio, targets, windowSize }) {
  if (!rows.length) {
    return (
      <AppCard className="p-[18px_18px_16px]">
        <AppMetaText className="block text-slate-400">Még nincs elég adat a trendhez.</AppMetaText>
      </AppCard>
    );
  }

  const chartData = buildTrendChartData(rows, windowSize);
  const seriesBands = TREND_SERIES.map((series, index) => {
    const values = chartData.map((item) => Number(item[series.key]) || 0);
    const rawValueKey = series.targetKey;
    const rawValues = chartData.map((item) => Number(item[rawValueKey]) || 0);
    const scale = getSeriesScale({
      averageValues: values,
      rawValues,
      targetValue: targets?.[series.targetKey]
    });
    const points = buildBandPoints(values, index, scale);
    const rawPoints = rawValues.length ? buildBandPoints(rawValues, index, scale) : [];
    const targetY = scale.target !== null ? getBandY(scale.target, index, scale) : null;
    const bandTop = CHART_TOP + index * (BAND_HEIGHT + BAND_GAP);
    const bandBottom = bandTop + BAND_HEIGHT;
    return {
      ...series,
      latestValue: values[values.length - 1] || 0,
      path: buildSmoothPath(points),
      rawPath: rawPoints.length ? buildSmoothPath(rawPoints) : "",
      rawOpacity: series.key === "kcalAverage" || series.key === "fatAverage" ? 0.84 : 0.76,
      valueLabel: series.label === "kcal" ? String(Math.round(values[values.length - 1] || 0)) : `${series.label} ${Math.round(values[values.length - 1] || 0)}`,
      valueLabelLeft: LABEL_LEFT,
      valueLabelTop: `${((CHART_TOP + index * (BAND_HEIGHT + BAND_GAP) + 6) / CHART_HEIGHT) * 100}%`,
      targetY,
      bandTop,
      bandBottom,
      labelY: bandTop + BAND_HEIGHT * 0.42
    };
  });

  return (
    <AppCard className="p-[18px_18px_16px]">
      <div className="relative h-[220px] w-full" aria-label="Mozgóátlag trend">
        {seriesBands.map((series) => (
          <span
            key={`${series.key}-label`}
            className="pointer-events-none absolute left-0 select-none text-[0.62rem] leading-none text-slate-500"
            style={{ top: `${(series.labelY / CHART_HEIGHT) * 100}%`, color: series.color, opacity: 0.72 }}
          >
            {series.label}
          </span>
        ))}
        <svg viewBox={`0 0 100 ${CHART_HEIGHT}`} preserveAspectRatio="none" className="h-full w-full">
          {seriesBands.map((series, index) => (
            <g key={series.key}>
              <line
                x1={CHART_LEFT}
                x2={CHART_RIGHT}
                y1={series.bandBottom}
                y2={series.bandBottom}
                stroke="rgba(148,163,184,0.11)"
                strokeWidth="0.7"
                vectorEffect="non-scaling-stroke"
              />
              {series.targetY !== null ? (
                <line
                  x1={CHART_LEFT}
                  x2={CHART_RIGHT}
                  y1={series.targetY}
                  y2={series.targetY}
                  stroke="rgba(255,255,255,0.75)"
                  strokeWidth="1.1"
                  strokeDasharray="2.5 3.5"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
              {index < seriesBands.length - 1 ? (
                <line
                  x1={CHART_LEFT}
                  x2={CHART_RIGHT}
                  y1={series.bandBottom + BAND_GAP / 2}
                  y2={series.bandBottom + BAND_GAP / 2}
                  stroke="rgba(255,255,255,0.045)"
                  strokeWidth="0.55"
                  vectorEffect="non-scaling-stroke"
                />
              ) : null}
              {series.rawPath ? (
                <path
                  d={series.rawPath}
                  fill="none"
                  stroke={series.color}
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  opacity={series.rawOpacity}
                />
              ) : null}
              <path
                d={series.path}
                fill="none"
                stroke={series.color}
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                opacity="1"
              />
            </g>
          ))}
        </svg>
        {seriesBands.map((series) => (
          <span
            key={`${series.key}-latest`}
            className="pointer-events-none absolute z-10 select-none whitespace-nowrap text-[0.64rem] font-medium leading-none"
            style={{
              left: series.valueLabelLeft,
              top: series.valueLabelTop,
              color: series.color,
              opacity: 0.82
            }}
          >
            {series.valueLabel}
          </span>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-start">
        <AppMetaText className="text-[0.68rem] text-slate-400">{windowSize} napos mozgóátlag</AppMetaText>
      </div>
    </AppCard>
  );
}

function EntryPreview({ entries, foods }) {
  if (!entries.length) return null;

  return (
    <div className="mt-2.5 grid gap-2 border-t border-white/5 pt-2.5">
      {entries.map((entry) => {
        const calculated = calculateDiaryEntry(entry, foods);
        if (!calculated) return null;
        const { food, values } = calculated;
        const isModifiedRecipe = hasRecipeEntryOverrides(entry, food);
        return (
          <div className="flex items-center justify-between gap-3 py-1 text-[0.85rem]" key={entry.entryId}>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1.5">
                <AppSectionTitle className="truncate text-[0.92rem] font-semibold text-slate-100">{food.name}</AppSectionTitle>
                {isModifiedRecipe ? <span className="shrink-0 text-[0.72rem] font-bold text-red-400" aria-label={"M\u00f3dos\u00edtott recept"}>!</span> : null}
              </div>
              <AppMetaText className="text-[0.75rem] text-slate-400">
                P {formatStat(values.protein)}g {" \u00b7 "} F {formatStat(values.fat)}g {" \u00b7 "} Ch {formatStat(values.carbs)}g
                {isModifiedRecipe ? <span className="text-red-300">{" \u00b7 mod."}</span> : null}
              </AppMetaText>
            </div>
            <div className="shrink-0 text-right">
              <AppSectionTitle className="block text-[0.92rem] font-semibold text-slate-100">
                {Math.round(values.kcal)} kcal {isModifiedRecipe ? <span className="text-red-400">!</span> : null}
              </AppSectionTitle>
              <AppMetaText className="text-[0.75rem] text-slate-400">
                {formatStat(entry.amount)} {food.unit}
              </AppMetaText>
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
    <div className="grid gap-2 border-t border-white/5 py-3.5 first:border-t-0">
      <button className="flex w-full items-start justify-between gap-3 bg-transparent p-0 text-left text-inherit" type="button" onClick={onToggle} aria-expanded={isOpen}>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <CalendarDays size={14} className="shrink-0 text-slate-400" />
              <AppSectionTitle className="truncate text-[0.95rem] font-semibold text-slate-100">{formatWeekdayName(row.dateKey)}</AppSectionTitle>
            </span>
            <AppSectionTitle className="shrink-0 text-[0.95rem] font-semibold text-slate-100">{Math.round(Number(row.kcal) || 0)} kcal</AppSectionTitle>
          </span>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <AppMetaText className="text-[0.78rem] text-slate-500">{formatShortDate(row.dateKey)}</AppMetaText>
            <AppMetaText className="text-[0.78rem] text-slate-400">P {formatStat(row.protein)}g</AppMetaText>
            <AppMetaText className="text-[0.78rem] text-slate-400">F {formatStat(row.fat)}g</AppMetaText>
            <AppMetaText className="text-[0.78rem] text-slate-400">Ch {formatStat(row.carbs)}g</AppMetaText>
            <AppMetaText className="text-[0.78rem] text-slate-500">· {row.status}</AppMetaText>
          </div>
        </span>
      </button>

      {isOpen && (
        <AppNestedCard className="mt-2 grid gap-3" variant="compact">
          <AppMetaText className="block text-[0.8rem] text-slate-400">
            P {Math.round(ratio.protein)}% · F {Math.round(ratio.fat)}% · Ch {Math.round(ratio.carbs)}%
          </AppMetaText>

          <AppButton className="w-full gap-1.5" variant="action" type="button" onClick={() => onLoadToToday?.(row.dateKey, row.entries)}>
            <PencilLine size={14} /> Betöltés szerkesztésre
          </AppButton>

          <EntryPreview entries={row.entries} foods={foods} />
        </AppNestedCard>
      )}
    </div>
  );
}

function WeekSummaryCard({ group, isOpen, openDays, onToggle, onToggleDay, onLoadToToday, foods, todayKey }) {
  const dayRows = group.rows.filter((row) => shouldShowDayRow(row, todayKey));
  const hasOpenDay = dayRows.some((row) => openDays[row.dateKey]);
  const visibleRows = hasOpenDay ? dayRows.filter((row) => openDays[row.dateKey]) : dayRows;

  return (
    <div className="grid gap-2 border-t border-white/5 py-3.5 first:border-t-0">
      <button className="flex w-full items-start justify-between gap-3 bg-transparent p-0 text-left text-inherit" type="button" onClick={onToggle} aria-expanded={isOpen}>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <CalendarDays size={15} className="shrink-0 text-amber-300" />
              <AppSectionTitle className="truncate text-[1.02rem] font-semibold text-slate-100">{group.label}</AppSectionTitle>
            </span>
            <AppSectionTitle className="shrink-0 text-[1.02rem] font-semibold text-slate-100">{Math.round(Number(group.total.kcal) || 0)} kcal</AppSectionTitle>
          </span>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <AppMetaText className="text-[0.82rem] text-slate-500">{group.rangeLabel}</AppMetaText>
            <AppMetaText className="text-[0.82rem] text-slate-400">P {formatStat(group.average.protein)}g</AppMetaText>
            <AppMetaText className="text-[0.82rem] text-slate-400">F {formatStat(group.average.fat)}g</AppMetaText>
            <AppMetaText className="text-[0.82rem] text-slate-400">Ch {formatStat(group.average.carbs)}g</AppMetaText>
            <AppMetaText className="text-[0.82rem] text-slate-500">· {group.loggedRows.length} nap</AppMetaText>
          </div>
        </span>
      </button>

      {isOpen && (
        <div className="pl-2 pt-1">
          <div className="mt-3 border-t border-white/5 pt-1">
            {visibleRows.map((row) => (
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

function MonthSummaryCard({
  month,
  isOpen,
  openWeeks,
  openDays,
  todayKey,
  onToggleMonth,
  onToggleWeek,
  onToggleDay,
  onLoadToToday,
  foods
}) {
  return (
    <div className="grid gap-2 border-t border-white/5 py-3.5 first:border-t-0">
      <button
        className="flex w-full items-start justify-between gap-3 bg-transparent p-0 text-left text-inherit"
        type="button"
        onClick={onToggleMonth}
        aria-expanded={isOpen}
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2">
              <CalendarDays size={16} className="shrink-0 text-amber-300" />
              <AppSectionTitle className="truncate text-[1.02rem] font-semibold text-slate-100">{month.label}</AppSectionTitle>
            </span>
            <AppSectionTitle className="shrink-0 text-[1.02rem] font-semibold text-slate-100">{Math.round(Number(month.total.kcal) || 0)} kcal</AppSectionTitle>
          </span>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
            <AppMetaText className="text-[0.82rem] text-slate-400">P {formatStat(month.average.protein)}g</AppMetaText>
            <AppMetaText className="text-[0.82rem] text-slate-400">F {formatStat(month.average.fat)}g</AppMetaText>
            <AppMetaText className="text-[0.82rem] text-slate-400">Ch {formatStat(month.average.carbs)}g</AppMetaText>
            <AppMetaText className="text-[0.82rem] text-slate-500">· {month.loggedRows.length} nap</AppMetaText>
          </div>
        </span>
      </button>

      {isOpen && (
        <div className="pl-2 pt-1">
          <div className="mt-3 border-t border-white/5 pt-1">
            {month.weeks.map((week) => (
              <WeekSummaryCard
                key={week.id}
                group={week}
                isOpen={Boolean(openWeeks[week.id])}
                openDays={openDays}
                todayKey={todayKey}
                onToggle={() => onToggleWeek(week.id)}
                onToggleDay={onToggleDay}
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
  const [openMonths, setOpenMonths] = useState({});
  const [openWeeks, setOpenWeeks] = useState({});
  const [openDays, setOpenDays] = useState({});
  const todayKey = toDateKey(new Date());
  const isMonthlyView = days > 7;
  const baseKeys = useMemo(() => {
    if (!isMonthlyView) return getRangeKeys(days);
    const dataKeys = collectDataKeys(diary, dailyLogs);
    return dataKeys.length ? dataKeys : getRangeKeys(days);
  }, [days, diary, dailyLogs, isMonthlyView]);
  const keys = useMemo(() => (isMonthlyView ? expandKeysToCalendarMonths(baseKeys) : baseKeys), [baseKeys, isMonthlyView]);
  const rows = useMemo(() => keys.map((dateKey) => buildDayRow({ dateKey, diary, dailyLogs, foods })), [dailyLogs, diary, foods, keys]);
  const loggedRows = rows.filter((row) => row.sourceType !== "empty");
  const average = averageTotals(loggedRows);
  const ratio = calculateMacroRatio(average);
  const weekGroups = useMemo(() => buildWeekGroups(rows), [rows]);
  const monthGroups = useMemo(() => buildMonthGroups(rows, todayKey), [rows, todayKey]);
  const hasOpenDay = Object.values(openDays).some(Boolean);
  const hasOpenWeek = Object.values(openWeeks).some(Boolean);
  const activeDayKey = Object.keys(openDays).find((dateKey) => openDays[dateKey]);
  const activeDay = activeDayKey ? rows.find((row) => row.dateKey === activeDayKey) : null;
  const activeWeekId = Object.keys(openWeeks).find((weekId) => openWeeks[weekId]);
  const activeMonthId = Object.keys(openMonths).find((monthId) => openMonths[monthId]);
  const activeWeek = activeDay
    ? weekGroups.find((group) => group.rows.some((row) => row.dateKey === activeDay.dateKey))
    : activeWeekId
      ? weekGroups.find((group) => group.id === activeWeekId)
      : null;
  const activeMonth = activeDay
    ? monthGroups.find((month) => month.rows.some((row) => row.dateKey === activeDay.dateKey))
    : activeWeek
      ? monthGroups.find((month) => month.weeks.some((week) => week.id === activeWeek.id))
      : activeMonthId
        ? monthGroups.find((month) => month.id === activeMonthId)
        : null;

  let summaryRatio = ratio;
  if (activeMonth) summaryRatio = activeMonth.ratio;
  if (activeWeek) summaryRatio = activeWeek.ratio;
  if (activeDay) summaryRatio = calculateMacroRatio(activeDay);

  const movingAverageWindow = hasOpenDay ? 7 : hasOpenWeek ? 14 : 30;
  const trendRows = useMemo(() => loggedRows.slice(-movingAverageWindow), [loggedRows, movingAverageWindow]);

  function toggleMonth(monthId) {
    setOpenMonths((current) => {
      const nextIsOpen = !current[monthId];
      setOpenWeeks({});
      setOpenDays({});
      return nextIsOpen ? { [monthId]: true } : {};
    });
  }

  function toggleWeek(weekId) {
    setOpenWeeks((current) => {
      const nextIsOpen = !current[weekId];
      setOpenDays({});
      return nextIsOpen ? { [weekId]: true } : {};
    });
  }

  function toggleDay(dateKey) {
    setOpenDays((current) => {
      const nextIsOpen = !current[dateKey];
      return nextIsOpen ? { [dateKey]: true } : {};
    });
  }

    return (
      <AppPage className="pt-3">
      <TrendOverviewPanel rows={trendRows} ratio={summaryRatio} targets={targets} windowSize={movingAverageWindow} />

      <AppCard aria-label={isMonthlyView ? "Havi hónapok" : "Heti összesítő"}>
        {isMonthlyView
          ? monthGroups.map((month) => (
              <MonthSummaryCard
                key={month.id}
                month={month}
                isOpen={Boolean(openMonths[month.id])}
                openWeeks={openWeeks}
                openDays={openDays}
                todayKey={todayKey}
                onToggleMonth={() => toggleMonth(month.id)}
                onToggleWeek={toggleWeek}
                onToggleDay={toggleDay}
                onLoadToToday={onLoadToToday}
                foods={foods}
              />
            ))
          : weekGroups.map((group) => (
              <WeekSummaryCard
                key={group.id}
                group={group}
                isOpen={Boolean(openWeeks[group.id])}
                openDays={openDays}
                todayKey={todayKey}
                onToggle={() => toggleWeek(group.id)}
                onToggleDay={toggleDay}
                onLoadToToday={onLoadToToday}
                foods={foods}
              />
            ))}
      </AppCard>
    </AppPage>
  );
}

