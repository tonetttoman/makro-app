import { CalendarDays, PencilLine } from "lucide-react";
import { useMemo, useState } from "react";
import { averageTotals, calculateEntry, calculateMacroRatio, calculateTotals, movingAverage } from "../lib/calculations";
import { formatShortDate, getRangeKeys, toDateKey } from "../lib/dates";
import { AppButton, AppCard, AppMetaText, AppNestedCard, AppPage, AppSectionTitle, AppTitle } from "./ui/AppUi";

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

function formatKcal(value) {
  return `${Math.round(Number(value) || 0)} kcal`;
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

function buildMonthGroups(rows) {
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
        weeks: buildWeekGroups(sortedRows, `${monthId}-`)
      };
    })
    .sort((a, b) => b.id.localeCompare(a.id));
}

function SummaryMetricLine({ label, children }) {
  return (
    <div className="mb-3 grid gap-1.5">
      <AppMetaText className="text-[0.72rem] font-semibold uppercase tracking-[0.05em] text-slate-400">{label}</AppMetaText>
      <div className="flex flex-wrap gap-3">{children}</div>
    </div>
  );
}

function SummaryValue({ children }) {
  return <AppSectionTitle className="text-[1.05rem] font-semibold text-slate-100">{children}</AppSectionTitle>;
}

function SummaryLines({ ratio, totals, totalsLabel, emptyText }) {
  if (!totals) return <AppMetaText className="block text-slate-400">{emptyText}</AppMetaText>;

  return (
    <div className="mt-4 border-t border-white/5 pt-4">
      <SummaryMetricLine label={totalsLabel}>
        <SummaryValue>{formatKcal(totals.kcal)}</SummaryValue>
        <SummaryValue>P {formatStat(totals.protein)}g</SummaryValue>
        <SummaryValue>F {formatStat(totals.fat)}g</SummaryValue>
        <SummaryValue>Ch {formatStat(totals.carbs)}g</SummaryValue>
      </SummaryMetricLine>
      <SummaryMetricLine label="Makróarány">
        <SummaryValue>P {Math.round(ratio.protein)}%</SummaryValue>
        <SummaryValue>F {Math.round(ratio.fat)}%</SummaryValue>
        <SummaryValue>Ch {Math.round(ratio.carbs)}%</SummaryValue>
      </SummaryMetricLine>
    </div>
  );
}

function MacroTrendChart({ rows, target }) {
  const values = rows.map((row) => row.kcal);
  const averageValues = movingAverage(values, 7);
  const max = Math.max(target, ...values, ...averageValues, 1) * 1.08;
  const targetY = 58 - 4 - (target / max) * 48;
  const barWidth = Math.max(1.4, 84 / Math.max(values.length, 1));
  const current = values[values.length - 1] || 0;

  return (
    <AppNestedCard className="my-3.5" variant="compact">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <AppMetaText className="block text-[0.75rem] font-semibold uppercase text-amber-300">Kalória trend</AppMetaText>
          <AppSectionTitle className="mt-1 text-[1.3rem]">{formatKcal(current)} ma</AppSectionTitle>
        </div>
        <AppMetaText className="text-[0.85rem]">Cél: {target} kcal</AppMetaText>
      </div>
      <svg viewBox="0 0 100 64" preserveAspectRatio="none" className="h-[74px] w-full" aria-label="Napi kalória grafikon">
        <line x1="2" x2="98" y1={targetY} y2={targetY} style={{ stroke: "rgba(245,176,65,0.3)", strokeWidth: 1 }} />
        {values.map((value, index) => {
          const x = 4 + (index / Math.max(values.length - 1, 1)) * 88;
          const height = Math.max(1, (value / max) * 48);
          return (
            <rect
              key={rows[index].dateKey}
              x={x}
              y={58 - height}
              width={barWidth}
              height={height}
              rx="0.8"
              style={{ fill: "rgba(255,255,255,0.08)" }}
            />
          );
        })}
        <polyline points={toPoints(values, max)} style={{ fill: "none", stroke: "#f5b041", strokeWidth: 1.8 }} />
        <polyline points={toPoints(averageValues, max)} style={{ fill: "none", stroke: "#38bdf8", strokeWidth: 1.4, strokeDasharray: "2 2" }} />
      </svg>
    </AppNestedCard>
  );
}

function EntryPreview({ entries, foods }) {
  if (!entries.length) return null;

  return (
    <div className="mt-2.5 grid gap-2 border-t border-white/5 pt-2.5">
      {entries.map((entry) => {
        const food = foods.find((item) => item.id === entry.foodId);
        if (!food) return null;
        const values = calculateEntry(food, Number(entry.amount) || 0);
        return (
          <div className="flex items-center justify-between gap-3 py-1 text-[0.85rem]" key={entry.entryId}>
            <div className="min-w-0">
              <AppSectionTitle className="truncate text-[0.92rem] font-semibold text-slate-100">{food.name}</AppSectionTitle>
              <AppMetaText className="text-[0.75rem] text-slate-400">
                P {formatStat(values.protein)}g · F {formatStat(values.fat)}g · Ch {formatStat(values.carbs)}g
              </AppMetaText>
            </div>
            <div className="shrink-0 text-right">
              <AppSectionTitle className="block text-[0.92rem] font-semibold text-slate-100">{Math.round(values.kcal)} kcal</AppSectionTitle>
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
            Makróarány: P {Math.round(ratio.protein)}% · F {Math.round(ratio.fat)}% · Ch {Math.round(ratio.carbs)}%
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

function WeekSummaryCard({ group, isOpen, openDays, onToggle, onToggleDay, onLoadToToday, foods }) {
  const hasOpenDay = group.rows.some((row) => openDays[row.dateKey]);
  const visibleRows = hasOpenDay ? group.rows.filter((row) => openDays[row.dateKey]) : group.rows;

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
            <AppMetaText className="text-[0.82rem] text-slate-400">P {formatStat(group.total.protein)}g</AppMetaText>
            <AppMetaText className="text-[0.82rem] text-slate-400">F {formatStat(group.total.fat)}g</AppMetaText>
            <AppMetaText className="text-[0.82rem] text-slate-400">Ch {formatStat(group.total.carbs)}g</AppMetaText>
            <AppMetaText className="text-[0.82rem] text-slate-500">· {group.loggedRows.length} nap</AppMetaText>
          </div>
        </span>
      </button>

      {isOpen && (
        <div className="pl-2 pt-1">
          <AppNestedCard className="grid gap-1 text-[0.8rem] text-slate-400" variant="compact">
            <span>Átlag: {formatKcal(group.average.kcal)} · P {formatStat(group.average.protein)}g · F {formatStat(group.average.fat)}g · Ch {formatStat(group.average.carbs)}g</span>
            <span>Makróarány: P {Math.round(group.ratio.protein)}% · F {Math.round(group.ratio.fat)}% · Ch {Math.round(group.ratio.carbs)}%</span>
          </AppNestedCard>
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
            <AppMetaText className="text-[0.82rem] text-slate-400">P {formatStat(month.total.protein)}g</AppMetaText>
            <AppMetaText className="text-[0.82rem] text-slate-400">F {formatStat(month.total.fat)}g</AppMetaText>
            <AppMetaText className="text-[0.82rem] text-slate-400">Ch {formatStat(month.total.carbs)}g</AppMetaText>
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
  const isMonthlyView = days > 7;
  const baseKeys = getRangeKeys(days);
  const keys = useMemo(() => (isMonthlyView ? expandKeysToCalendarMonths(baseKeys) : baseKeys), [baseKeys, isMonthlyView]);
  const rows = keys.map((dateKey) => buildDayRow({ dateKey, diary, dailyLogs, foods }));
  const loggedRows = rows.filter((row) => row.sourceType !== "empty");
  const average = averageTotals(loggedRows);
  const ratio = calculateMacroRatio(average);
  const weekGroups = useMemo(() => buildWeekGroups(rows), [rows]);
  const monthGroups = useMemo(() => buildMonthGroups(rows), [rows]);
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
  const monthRangeLabel = baseKeys.length ? formatDateRange(baseKeys[0], baseKeys[baseKeys.length - 1]) : "";

  let summaryTitle = title || "Havi összesítő";
  let summaryRangeLabel = monthRangeLabel;
  let summaryRatio = ratio;
  let summaryTotals = loggedRows.length ? average : null;
  let summaryTotalsLabel = "Átlag";
  let summaryEmptyText = "Ebben az időszakban még nincs mentett nap.";

  if (activeMonth) {
    summaryTitle = activeMonth.label;
    summaryRangeLabel = "";
    summaryRatio = activeMonth.ratio;
    summaryTotals = activeMonth.loggedRows.length ? activeMonth.average : null;
    summaryTotalsLabel = "Átlag";
    summaryEmptyText = "Ebben a hónapban még nincs mentett nap.";
  }

  if (activeWeek) {
    summaryTitle = activeWeek.label;
    summaryRangeLabel = activeWeek.rangeLabel;
    summaryRatio = activeWeek.ratio;
    summaryTotals = activeWeek.loggedRows.length ? activeWeek.average : null;
    summaryTotalsLabel = "Átlag";
    summaryEmptyText = "Ebben a hétben még nincs mentett nap.";
  }

  if (activeDay) {
    const dayRatio = calculateMacroRatio(activeDay);
    const isSavedDay = activeDay.sourceType !== "empty";
    summaryTitle = formatWeekdayName(activeDay.dateKey);
    summaryRangeLabel = formatShortDate(activeDay.dateKey);
    summaryRatio = dayRatio;
    summaryTotals = isSavedDay ? activeDay : null;
    summaryTotalsLabel = "Összesen";
    summaryEmptyText = "Ehhez a naphoz még nincs mentett adat.";
  }

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
      <AppCard className="p-[22px_20px]">
        <div className="mb-3.5 min-w-0">
          <AppTitle className="my-1 text-[1.6rem] font-semibold tracking-normal">{summaryTitle}</AppTitle>
          {summaryRangeLabel && <AppMetaText className="block text-[0.85rem] text-slate-400">{summaryRangeLabel}</AppMetaText>}
        </div>
        {!isMonthlyView && <MacroTrendChart rows={rows} target={targets.kcal} />}
        <SummaryLines ratio={summaryRatio} totals={summaryTotals} totalsLabel={summaryTotalsLabel} emptyText={summaryEmptyText} />
      </AppCard>

      <AppCard aria-label={isMonthlyView ? "Havi hónapok" : "Heti összesítő"}>
        {isMonthlyView
          ? monthGroups.map((month) => (
              <MonthSummaryCard
                key={month.id}
                month={month}
                isOpen={Boolean(openMonths[month.id])}
                openWeeks={openWeeks}
                openDays={openDays}
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
