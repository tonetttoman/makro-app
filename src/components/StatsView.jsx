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
    borderTop: "1px solid rgba(148, 163, 184, 0.12)",
    padding: "8px 2px",
    borderLeft: isActive ? "3px solid rgba(56, 189, 248, 0.56)" : "3px solid transparent",
    background: isActive ? "linear-gradient(180deg, rgba(15, 23, 42, 0.88), rgba(8, 13, 22, 0.72))" : "transparent",
    borderRadius: isActive ? "16px" : 0,
    boxShadow: isActive ? "inset 0 1px 0 rgba(255, 255, 255, 0.03)" : "none"
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

function getOpenDetailStyle(isActive = false) {
  return {
    display: "grid",
    gap: "10px",
    marginTop: "10px",
    padding: "10px",
    border: isActive ? "1px solid rgba(56, 189, 248, 0.24)" : "1px solid rgba(56, 189, 248, 0.16)",
    borderRadius: "16px",
    background: isActive
      ? "linear-gradient(180deg, rgba(15, 23, 42, 0.84), rgba(8, 13, 22, 0.76))"
      : "linear-gradient(180deg, rgba(15, 23, 42, 0.72), rgba(8, 13, 22, 0.68))",
    boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.03)"
  };
}

const nestedListStyle = {
  display: "grid",
  gap: 0,
  padding: "2px 0",
  borderTop: "1px solid rgba(148, 163, 184, 0.12)"
};

function SummaryMetricLine({ label, children }) {
  return (
    <div className="stats-summary-line">
      <span className="stats-summary-line-label">{label}</span>
      <div className="stats-summary-line-values">{children}</div>
    </div>
  );
}

function SummaryValue({ children }) {
  return <strong className="stats-summary-value">{children}</strong>;
}

function SummaryLines({ ratio, totals, totalsLabel, emptyText }) {
  if (!totals) return <p className="muted stats-summary-detail">{emptyText}</p>;

  return (
    <div className="stats-summary-lines">
      <SummaryMetricLine label="Makróarány">
        <SummaryValue>{Math.round(ratio.protein)}% p</SummaryValue>
        <SummaryValue>{Math.round(ratio.fat)}% f</SummaryValue>
        <SummaryValue>{Math.round(ratio.carbs)}% Ch</SummaryValue>
      </SummaryMetricLine>
      <SummaryMetricLine label={totalsLabel}>
        <SummaryValue>{formatKcal(totals.kcal)}</SummaryValue>
        <SummaryValue>p {formatStat(totals.protein)} g</SummaryValue>
        <SummaryValue>f {formatStat(totals.fat)} g</SummaryValue>
        <SummaryValue>Ch {formatStat(totals.carbs)} g</SummaryValue>
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
    <div className="chart-card">
      <div className="chart-card__header">
        <div>
          <p className="eyebrow">Kalória trend</p>
          <h2>{formatKcal(current)} ma</h2>
        </div>
        <span>Cél: {target} kcal</span>
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
              borderTop: "1px solid rgba(148, 163, 184, 0.12)"
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

function DaySummaryRow({ row, isOpen, isEntryPreviewOpen, onToggle, onToggleEntryPreview, onLoadToToday, foods }) {
  const ratio = calculateMacroRatio(row);

  return (
    <div style={getListRowStyle(isOpen)}>
      <button style={rowButtonStyle} type="button" onClick={onToggle} aria-expanded={isOpen}>
        <span style={rowTitleStyle}>
          <span style={rowTitleTopStyle}>
            <strong>{formatDateWithDay(row.dateKey)}</strong>
            <small style={statusInlineStyle}>{row.status}</small>
          </span>
          <MacroChips totals={row} active={isOpen} />
        </span>
        <strong>{isOpen ? "▾" : "▸"}</strong>
      </button>

      {isOpen && (
        <div style={getOpenDetailStyle(true)}>
          <p className="muted" style={{ margin: 0 }}>
            Makróarány: {Math.round(ratio.protein)}% p · {Math.round(ratio.fat)}% f · {Math.round(ratio.carbs)}% Ch
          </p>

          <button className="primary-button secondary" type="button" onClick={() => onLoadToToday?.(row.dateKey, row.entries)}>
            Betöltés szerkesztésre a Mai fülre
          </button>

          {row.entries.length > 0 ? (
            <>
              <button
                className="secondary-button full"
                type="button"
                onClick={() => onToggleEntryPreview(row.dateKey)}
                aria-expanded={isEntryPreviewOpen}
              >
                {isEntryPreviewOpen ? "Tételes lista bezárása" : `Tételes lista megnyitása (${row.entries.length})`}
              </button>
              {isEntryPreviewOpen && <EntryPreview entries={row.entries} foods={foods} />}
            </>
          ) : row.sourceType === "summary" ? (
            <p className="muted" style={{ margin: 0 }}>Ez csak összesített importált nap, részletes tétellista nélkül.</p>
          ) : (
            <p className="muted" style={{ margin: 0 }}>Ehhez a naphoz még nincs bevitel. Betöltéssel üres szerkesztési napként nyílik meg.</p>
          )}
        </div>
      )}
    </div>
  );
}

function WeekSummaryCard({ group, isOpen, hasOpenDay, openDays, openEntryPreviews, onToggle, onToggleDay, onToggleEntryPreview, onLoadToToday, foods, showDailyDetails = true }) {
  const isWeekActive = isOpen && !hasOpenDay;
  const visibleRows = hasOpenDay ? group.rows.filter((row) => openDays[row.dateKey]) : group.rows;

  return (
    <div style={getListRowStyle(isWeekActive)}>
      <button style={rowButtonStyle} type="button" onClick={onToggle} aria-expanded={isOpen}>
        <span style={rowTitleStyle}>
          <span style={rowTitleTopStyle}>
            <strong>{group.label}</strong>
            <small style={statusInlineStyle}>{group.loggedRows.length} mentett nap</small>
          </span>
          <MacroChips totals={group.total} active={isWeekActive} />
        </span>
        <strong>{isOpen ? "▾" : "▸"}</strong>
      </button>

      {isOpen && showDailyDetails && (
        <div style={getOpenDetailStyle(false)}>
          <p className="muted" style={{ margin: 0 }}>
            Átlag: {formatKcal(group.average.kcal)} | p {formatStat(group.average.protein)} g | f {formatStat(group.average.fat)} g | Ch {formatStat(group.average.carbs)} g
          </p>
          <p className="muted" style={{ margin: 0 }}>
            Makróarány: {Math.round(group.ratio.protein)}% p | {Math.round(group.ratio.fat)}% f | {Math.round(group.ratio.carbs)}% Ch
          </p>
          <div style={nestedListStyle}>
            {visibleRows.map((row) => (
              <DaySummaryRow
                key={row.dateKey}
                row={row}
                isOpen={Boolean(openDays[row.dateKey])}
                isEntryPreviewOpen={Boolean(openEntryPreviews[row.dateKey])}
                onToggle={() => onToggleDay(row.dateKey)}
                onToggleEntryPreview={onToggleEntryPreview}
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
  const [openEntryPreviews, setOpenEntryPreviews] = useState({});
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
  const visibleWeekGroups = focusedGroupIds.length
    ? weekGroups.filter((group) => visibleOpenGroups[group.id])
    : weekGroups;
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
      setOpenEntryPreviews({});
      return nextIsOpen ? { [groupId]: true } : {};
    });
  }

  function toggleDay(dateKey) {
    setOpenDays((current) => {
      const nextIsOpen = !current[dateKey];
      setOpenEntryPreviews({});
      return nextIsOpen ? { [dateKey]: true } : {};
    });
  }

  function toggleEntryPreview(dateKey) {
    setOpenEntryPreviews((current) => ({ [dateKey]: !current[dateKey] }));
  }

  return (
    <main className="page">
      <section className="panel stats-summary-panel">
        <div className="stats-summary-header">
          <div className="stats-summary-title-block">
            <h1>{summaryTitle}</h1>
            {summaryRangeLabel && <p className="stats-summary-range">{summaryRangeLabel}</p>}
          </div>
          <div className="stats-summary-meta">
            <span className="stats-summary-pill">{formatSavedDaysLabel(summarySavedDays)}</span>
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

      <section className="panel" style={listPanelStyle} aria-label={isMonthlyView ? "Havi heti összesítők" : "Heti összesítő"}>
        {visibleWeekGroups.map((group) => {
          const hasOpenDay = group.rows.some((row) => openDays[row.dateKey]);
          return (
            <WeekSummaryCard
              key={group.id}
              group={group}
              isOpen={Boolean(visibleOpenGroups[group.id])}
              hasOpenDay={hasOpenDay}
              openDays={openDays}
              openEntryPreviews={openEntryPreviews}
              onToggle={() => toggleGroup(group.id)}
              onToggleDay={toggleDay}
              onToggleEntryPreview={toggleEntryPreview}
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
