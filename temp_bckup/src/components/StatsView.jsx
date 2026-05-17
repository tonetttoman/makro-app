import { CalendarDays, ChevronDown, ChevronUp, PencilLine } from "lucide-react";
import { useMemo, useState } from "react";
import { averageTotals, calculateEntry, calculateMacroRatio, calculateTotals, movingAverage } from "../lib/calculations";
import { formatShortDate, getRangeKeys, toDateKey } from "../lib/dates";

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

function formatKcal(value) {
  return `${Math.round(Number(value) || 0)} kcal`;
}

function formatDateWithDay(dateKey) {
  const date = new Date(`${dateKey}T12:00:00`);
  const dayName = WEEKDAYS[date.getDay()] || "";
  return `${formatShortDate(dateKey)} · ${dayName}`;
}

function formatDateRange(startKey, endKey) {
  return `${formatShortDate(startKey)} – ${formatShortDate(endKey)}`;
}

function formatSavedDaysLabel(count) {
  if (count === 1) return "1 mentett nap";
  return `${count} mentett nap`;
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

// FIX DIZÁJN: Tiszta szellős listaelrendezés harmonika-hatás nélkül
const listPanelStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "0",
  padding: "12px 16px",
  marginBottom: "16px",
  background: "#161c26",
  borderRadius: "24px"
};

function getListRowStyle(isActive = false) {
  return {
    borderTop: "1px solid rgba(255, 255, 255, 0.04)",
    padding: "14px 0",
    background: "transparent",
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  };
}

const rowButtonStyle = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  padding: 0,
  border: 0,
  background: "transparent",
  color: "inherit",
  textAlign: "left",
  cursor: "pointer"
};

const rowTitleStyle = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  gap: "4px",
  minWidth: 0
};

const rowTitleTopStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  gap: "12px"
};

const statusInlineStyle = {
  color: "#8a99ad",
  fontSize: "0.76rem"
};

function getOpenDetailStyle() {
  return {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    marginTop: "8px",
    padding: "16px",
    borderRadius: "16px",
    background: "rgba(0, 0, 0, 0.2)",
    width: "100%"
  };
}

const nestedListStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "0",
  marginTop: "12px",
  paddingTop: "4px",
  borderTop: "1px solid rgba(255, 255, 255, 0.05)"
};

function SummaryMetricLine({ label, children }) {
  return (
    <div className="stats-summary-line" style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
      <span className="stats-summary-line-label" style={{ fontSize: "0.72rem", color: "#8a99ad", textTransform: "uppercase", fontWeight: "700", letterSpacing: "0.05em" }}>{label}</span>
      <div className="stats-summary-line-values" style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>{children}</div>
    </div>
  );
}

function SummaryValue({ children }) {
  return <strong className="stats-summary-value" style={{ fontSize: "1.05rem", color: "#ffffff", fontWeight: "600" }}>{children}</strong>;
}

function SummaryLines({ ratio, totals, totalsLabel, emptyText }) {
  if (!totals) return <p className="muted stats-summary-detail" style={{ color: "#8a99ad", margin: 0 }}>{emptyText}</p>;

  return (
    <div className="stats-summary-lines" style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      <SummaryLinesInternal ratio={ratio} totals={totals} totalsLabel={totalsLabel} />
    </div>
  );
}

function SummaryLinesInternal({ ratio, totals, totalsLabel }) {
  return (
    <>
      <SummaryMetricLine label="Makróarány">
        <SummaryValue>P {Math.round(ratio.protein)}%</SummaryValue>
        <SummaryValue>F {Math.round(ratio.fat)}%</SummaryValue>
        <SummaryValue>Ch {Math.round(ratio.carbs)}%</SummaryValue>
      </SummaryMetricLine>
      <SummaryMetricLine label={totalsLabel}>
        <SummaryValue>{formatKcal(totals.kcal)}</SummaryValue>
        <SummaryValue>P {formatStat(totals.protein)}g</SummaryValue>
        <SummaryValue>F {formatStat(totals.fat)}g</SummaryValue>
        <SummaryValue>Ch {formatStat(totals.carbs)}g</SummaryValue>
      </SummaryMetricLine>
    </>
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
    <div className="chart-card" style={{ background: "rgba(0,0,0,0.15)", padding: "16px", borderRadius: "18px", margin: "14px 0" }}>
      <div className="chart-card__header" style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
        <div>
          <p className="eyebrow" style={{ color: "#f5b041", margin: 0, fontSize: "0.75rem", textTransform: "uppercase" }}>Kalória trend</p>
          <h2 style={{ fontSize: "1.3rem", margin: "4px 0 0" }}>{formatKcal(current)} ma</h2>
        </div>
        <span style={{ color: "#8a99ad", fontSize: "0.85rem" }}>Cél: {target} kcal</span>
      </div>
      <svg className="trend-chart" viewBox="0 0 100 64" preserveAspectRatio="none" style={{ width: "100%", height: "74px" }} aria-label="Napi kalória grafikon">
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
    </div>
  );
}

function EntryPreview({ entries, foods }) {
  if (!entries.length) return null;

  return (
    <div className="stats-entry-preview" style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
      {entries.map((entry) => {
        const food = foods.find((item) => item.id === entry.foodId);
        if (!food) return null;
        const values = calculateEntry(food, Number(entry.amount) || 0);
        return (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.85rem", padding: "4px 0" }} key={entry.entryId}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <span style={{ color: "#ffffff", fontWeight: "500" }}>{food.name}</span>
              <span style={{ color: "#8a99ad", fontSize: "0.75rem" }}>
                P {formatStat(values.protein)}g · F {formatStat(values.fat)}g · Ch {formatStat(values.carbs)}g
              </span>
            </div>
            <div style={{ textAlign: "right" }}>
              <span style={{ color: "#ffffff", fontWeight: "600", display: "block" }}>{Math.round(values.kcal)} kcal</span>
              <span style={{ color: "#8a99ad", fontSize: "0.75rem" }}>{formatStat(entry.amount)} {food.unit}</span>
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
          <span style={rowTitleTopStyle}>
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CalendarDays size={14} style={{ color: "#8a99ad" }} />
              <strong style={{ fontSize: "0.95rem", fontWeight: "500" }}>{formatDateWithDay(row.dateKey)}</strong>
            </span>
            <span style={{ textAlign: "right" }}>
              <strong style={{ fontSize: "0.95rem", fontWeight: "700", color: "#ffffff" }}>{Math.round(Number(row.kcal) || 0)} kcal</strong>
            </span>
          </span>
          <span style={{ display: "flex", gap: "10px", fontSize: "0.78rem", color: "#8a99ad" }}>
            <span><small style={{ color: "#f5b041", marginRight: "2px" }}>P</small>{formatStat(row.protein)}g</span>
            <span><small style={{ color: "#f5b041", marginRight: "2px" }}>F</small>{formatStat(row.fat)}g</span>
            <span><small style={{ color: "#f5b041", marginRight: "2px" }}>Ch</small>{formatStat(row.carbs)}g</span>
            <span style={{ color: "#4f5e75" }}>· {row.status}</span>
          </span>
        </span>
      </button>

      {isOpen && (
        <div style={getOpenDetailStyle()}>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#8a99ad" }}>
            Makróarány: P {Math.round(ratio.protein)}% · F {Math.round(ratio.fat)}% · Ch {Math.round(ratio.carbs)}%
          </p>

          <button
            type="button"
            style={{ width: "100%", background: "#f5b041", color: "#0b0f17", border: "none", padding: "8px", borderRadius: "10px", fontWeight: "700", fontSize: "0.85rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", cursor: "pointer" }}
            onClick={() => onLoadToToday?.(row.dateKey, row.entries)}
          >
            <PencilLine size={14} /> Betöltés szerkesztésre
          </button>

          <EntryPreview entries={row.entries} foods={foods} />
        </div>
      )}
    </div>
  );
}

function WeekSummaryCard({
  group,
  isOpen,
  hasOpenDay,
  openDays,
  onToggle,
  onToggleDay,
  onLoadToToday,
  foods,
  showDailyDetails = true
}) {
  const visibleRows = hasOpenDay ? group.rows.filter((row) => openDays[row.dateKey]) : group.rows;

  return (
    <div style={getListRowStyle(isOpen)}>
      <button style={rowButtonStyle} type="button" onClick={onToggle} aria-expanded={isOpen}>
        <span style={rowTitleStyle}>
          <span style={rowTitleTopStyle}>
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <CalendarDays size={15} style={{ color: "#f5b041" }} />
              <strong style={{ fontSize: "1.02rem", fontWeight: "600", color: "#ffffff" }}>{group.label}</strong>
            </span>
            <span style={{ textAlign: "right" }}>
              <strong style={{ fontSize: "1.02rem", fontWeight: "700", color: "#ffffff" }}>{Math.round(Number(group.total.kcal) || 0)} kcal</strong>
            </span>
          </span>
          <span style={{ display: "flex", gap: "10px", fontSize: "0.82rem", color: "#8a99ad" }}>
            <span><small style={{ color: "#f5b041", marginRight: "2px" }}>P</small>{formatStat(group.total.protein)}g</span>
            <span><small style={{ color: "#f5b041", marginRight: "2px" }}>F</small>{formatStat(group.total.fat)}g</span>
            <span><small style={{ color: "#f5b041", marginRight: "2px" }}>Ch</small>{formatStat(group.total.carbs)}g</span>
            <span style={{ color: "#4f5e75" }}>· {group.loggedRows.length} nap</span>
          </span>
        </span>
      </button>

      {isOpen && showDailyDetails && (
        <div style={{ padding: "4px 0 0 8px" }}>
          <div style={{ background: "rgba(0,0,0,0.15)", padding: "12px", borderRadius: "14px", fontSize: "0.8rem", color: "#8a99ad", display: "flex", flexDirection: "column", gap: "4px" }}>
            <span>Átlag: {formatKcal(group.average.kcal)} · P {formatStat(group.average.protein)}g · F {formatStat(group.average.fat)}g · Ch {formatStat(group.average.carbs)}g</span>
            <span>Makróarány: P {Math.round(group.ratio.protein)}% · F {Math.round(group.ratio.fat)}% · Ch {Math.round(group.ratio.carbs)}%</span>
          </div>
          <div style={nestedListStyle}>
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
  const focusedGroupIds = Object.keys(visibleOpenGroups).filter((groupId) => visibleOpenGroups[groupId]);
  const visibleWeekGroups = focusedGroupIds.length ? weekGroups.filter((group) => visibleOpenGroups[group.id]) : weekGroups;
  const activeDayKey = Object.keys(openDays).find((dateKey) => openDays[dateKey]);
  const activeDay = activeDayKey ? rows.find((row) => row.dateKey === activeDayKey) : null;
  const explicitlyFocusedGroupId = openGroups ? Object.keys(openGroups).find((groupId) => openGroups[groupId]) : null;
  const activeGroup = activeDay
    ? weekGroups.find((group) => group.rows.some((row) => row.dateKey === activeDay.dateKey))
    : explicitlyFocusedGroupId
      ? weekGroups.find((group) => group.id === explicitlyFocusedGroupId)
      : null;
  const monthRangeLabel = keys.length ? formatDateRange(keys[0], keys[keys.length - 1]) : "";

  let summaryTitle = title || "Havi összesítő";
  let summaryRangeLabel = monthRangeLabel;
  let summarySavedDays = loggedRows.length;
  let summaryRatio = ratio;
  let summaryTotals = loggedRows.length ? average : null;
  let summaryTotalsLabel = "Átlag";
  let summaryEmptyText = "Ebben az időszakban még nincs mentett nap.";

  if (activeGroup && openGroups !== null) {
    summaryTitle = "Heti összesítő";
    summaryRangeLabel = activeGroup.label;
    summarySavedDays = activeGroup.loggedRows.length;
    summaryRatio = activeGroup.ratio;
    summaryTotals = activeGroup.loggedRows.length ? activeGroup.average : null;
    summaryTotalsLabel = "Átlag";
    summaryEmptyText = "Ebben a hétben még nincs mentett nap.";
  }

  if (activeDay) {
    const dayRatio = calculateMacroRatio(activeDay);
    const isSavedDay = activeDay.sourceType !== "empty";
    summaryTitle = "Napi összesítő";
    summaryRangeLabel = formatDateWithDay(activeDay.dateKey);
    summarySavedDays = isSavedDay ? 1 : 0;
    summaryRatio = dayRatio;
    summaryTotals = isSavedDay ? activeDay : null;
    summaryTotalsLabel = "Összesen";
    summaryEmptyText = "Ehhez a naphoz még nincs mentett adat.";
  }

  function toggleGroup(groupId) {
    setOpenGroups((current) => {
      const base = current ?? defaultOpenGroups;
      const nextIsOpen = !base[groupId];
      setOpenDays({});
      return nextIsOpen ? { [groupId]: true } : {};
    });
  }

  function toggleDay(dateKey) {
    setOpenDays((current) => {
      const nextIsOpen = !current[dateKey];
      return nextIsOpen ? { [dateKey]: true } : {};
    });
  }

  return (
    <main className="page page--stats" style={{ paddingTop: "12px" }}>
      <section style={{ background: "#161c26", padding: "22px 20px", borderRadius: "24px", boxShadow: "0 15px 35px rgba(0,0,0,0.4)" }}>
        <div className="stats-summary-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "14px" }}>
          <div className="stats-summary-title-block">
            <p className="eyebrow" style={{ color: "#f5b041", margin: 0, fontSize: "0.75rem", textTransform: "uppercase", fontWeight: "700" }}>Összesítés</p>
            <h1 style={{ fontSize: "1.6rem", fontWeight: "700", margin: "4px 0" }}>{summaryTitle}</h1>
            {summaryRangeLabel && <p className="stats-summary-range" style={{ color: "#8a99ad", fontSize: "0.85rem", margin: 0 }}>{summaryRangeLabel}</p>}
          </div>
          <div className="stats-summary-meta">
            <span className="stats-summary-pill" style={{ background: "rgba(255,255,255,0.05)", padding: "6px 12px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: "600" }}>{formatSavedDaysLabel(summarySavedDays)}</span>
          </div>
        </div>
        {!isMonthlyView && <MacroTrendChart rows={rows} target={targets.kcal} />}
        <SummaryLines
          ratio={summaryRatio}
          totals={summaryTotals}
          totalsLabel={summaryTotalsLabel}
          emptyText={summaryEmptyText}
        />
      </section>

      <section style={listPanelStyle} aria-label={isMonthlyView ? "Havi heti összesítők" : "Heti összesítő"}>
        {visibleWeekGroups.map((group) => {
          const hasOpenDay = group.rows.some((row) => openDays[row.dateKey]);
          return (
            <WeekSummaryCard
              key={group.id}
              group={group}
              isOpen={Boolean(visibleOpenGroups[group.id])}
              hasOpenDay={hasOpenDay}
              openDays={openDays}
              onToggle={() => toggleGroup(group.id)}
              onToggleDay={toggleDay}
              onLoadToToday={onLoadToToday}
              foods={foods}
              showDailyDetails
            />
          );
        })}
      </section>
    </main>
  );
}