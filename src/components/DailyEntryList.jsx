import { CalendarDays, Lock, Minus, Plus, Save, Trash2, Unlock } from "lucide-react";
import { useState } from "react";
import { calculateEntry, findFoodById } from "../lib/calculations";

function formatMacro(value, unit = "g") {
  return `${Math.round(value * 10) / 10} ${unit}`;
}

function formatAmount(value, unit) {
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} ${unit}`;
}

const listPanelStyle = {
  display: "grid",
  gap: "0",
  padding: "10px",
  marginBottom: "12px"
};

const listHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  padding: "0 2px 7px"
};

const entryCountBadgeStyle = {
  minHeight: "26px",
  padding: "4px 8px",
  fontSize: "0.68rem",
  lineHeight: 1
};

const rowStyle = {
  display: "grid",
  gap: "6px",
  padding: "7px 2px",
  borderTop: "1px solid rgba(135, 175, 157, 0.11)"
};

const rowTopStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "center",
  gap: "8px"
};

const titleRowStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "7px",
  minWidth: 0
};

const itemTitleStyle = {
  margin: 0,
  fontSize: "0.98rem",
  lineHeight: 1.1,
  whiteSpace: "nowrap"
};

const compactSummaryStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "6px",
  marginTop: 0
};

const amountBadgeStyle = {
  minHeight: "28px",
  minWidth: "58px",
  marginTop: 0,
  padding: "6px 11px",
  fontSize: "0.8rem",
  lineHeight: 1.05
};

const macroChipStyle = {
  display: "inline-flex",
  alignItems: "baseline",
  justifyContent: "center",
  gap: "4px",
  minHeight: "28px",
  minWidth: "68px",
  padding: "6px 10px",
  border: "1px solid rgba(135, 175, 157, 0.16)",
  borderRadius: "999px",
  background: "rgba(29, 45, 41, 0.56)",
  color: "var(--text)",
  fontSize: "0.76rem",
  fontWeight: 850,
  lineHeight: 1.05
};

const macroLabelStyle = {
  color: "var(--muted)",
  fontSize: "0.58rem",
  fontWeight: 900,
  letterSpacing: "0.035em",
  textTransform: "uppercase"
};

const amountControlStyle = {
  display: "grid",
  gridTemplateColumns: "34px minmax(0, 1fr) auto 34px",
  alignItems: "end",
  gap: "6px",
  marginTop: "0"
};

const smallButtonStyle = {
  width: "34px",
  height: "34px",
  minHeight: "34px",
  borderRadius: "12px"
};

const smallDeleteStyle = {
  ...smallButtonStyle,
  width: "36px",
  height: "36px",
  minHeight: "36px"
};

const compactUnitStyle = {
  minHeight: "34px",
  fontSize: "0.78rem"
};

const saveRowStyle = {
  display: "grid",
  gap: "8px",
  padding: "12px 2px 2px",
  borderTop: "1px solid rgba(135, 175, 157, 0.14)"
};

const saveActionsStyle = {
  display: "grid",
  gridTemplateColumns: "42px minmax(0, 1fr)",
  gap: "8px",
  alignItems: "center"
};

export const dailyEntryChipStyles = {
  compactSummaryStyle,
  amountBadgeStyle,
  macroChipStyle,
  macroLabelStyle
};

export function DailyEntryList({
  entries,
  foods,
  onAmountChange,
  onRemove,
  onToggleLock,
  workDate,
  onWorkDateChange,
  onSave
}) {
  const [isDateOpen, setIsDateOpen] = useState(false);

  if (!entries.length) {
    return (
      <section className="empty-state">
        <h2>Nincs még tétel a mai listában</h2>
        <p>Válassz kategóriát, majd nyomj rá egy élelmiszerre. A mennyiséget itt tudod pontosítani.</p>
      </section>
    );
  }

  return (
    <section className="panel" style={listPanelStyle} aria-label="Napi kalkulációs lista">
      <div style={listHeaderStyle}>
        <p className="eyebrow">Mai tételek</p>
        <span className="badge" style={entryCountBadgeStyle}>{entries.length} tétel</span>
      </div>

      {entries.map((entry) => {
        const food = findFoodById(entry.foodId, foods);
        if (!food) return null;
        const values = calculateEntry(food, entry.amount);
        const isLocked = Boolean(entry.locked);

        return (
          <div style={rowStyle} key={entry.entryId}>
            <div style={rowTopStyle}>
              <div style={titleRowStyle}>
                <h2 style={itemTitleStyle}>{food.name}</h2>
                <div style={compactSummaryStyle} aria-label="Mennyiség és tápértékek">
                  <span className="entry-amount-badge" style={amountBadgeStyle}>{formatAmount(entry.amount, food.unit)}</span>
                  <span style={macroChipStyle}>
                    <small style={macroLabelStyle}>k</small>
                    <strong>{Math.round(values.kcal)}</strong>
                  </span>
                  <span style={macroChipStyle}>
                    <small style={macroLabelStyle}>p</small>
                    <strong>{formatMacro(values.protein)}</strong>
                  </span>
                  <span style={macroChipStyle}>
                    <small style={macroLabelStyle}>f</small>
                    <strong>{formatMacro(values.fat)}</strong>
                  </span>
                  <span style={macroChipStyle}>
                    <small style={macroLabelStyle}>CH</small>
                    <strong>{formatMacro(values.carbs)}</strong>
                  </span>
                </div>
              </div>
              <div style={{ display: "flex", gap: "6px" }}>
                <button
                  className="icon-button"
                  style={smallDeleteStyle}
                  type="button"
                  onClick={() => onToggleLock?.(entry.entryId)}
                  aria-label={isLocked ? "Tétel feloldása" : "Tétel zárolása"}
                >
                  {isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                </button>
                {!isLocked && (
                  <button
                    className="icon-button danger"
                    style={smallDeleteStyle}
                    type="button"
                    onClick={() => onRemove(entry.entryId)}
                    aria-label="Tétel törlése"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>

            {!isLocked && (
              <div className="amount-control" style={amountControlStyle}>
                <button
                  className="icon-button"
                  style={smallButtonStyle}
                  type="button"
                  onClick={() => onAmountChange(entry.entryId, Math.max(0, entry.amount - food.step))}
                  aria-label="Mennyiség csökkentése"
                >
                  <Minus size={16} />
                </button>
                <label>
                  <span>Mennyiség</span>
                  <input
                    inputMode="decimal"
                    min="0"
                    step={food.step}
                    type="number"
                    value={entry.amount}
                    onChange={(event) => onAmountChange(entry.entryId, Number(event.target.value))}
                  />
                </label>
                <span className="unit" style={compactUnitStyle}>{food.unit}</span>
                <button
                  className="icon-button"
                  style={smallButtonStyle}
                  type="button"
                  onClick={() => onAmountChange(entry.entryId, entry.amount + food.step)}
                  aria-label="Mennyiség növelése"
                >
                  <Plus size={16} />
                </button>
              </div>
            )}
          </div>
        );
      })}

      <div style={saveRowStyle}>
        {isDateOpen && (
          <label className="form-field" style={{ marginTop: 0 }}>
            <span>Mentés dátuma</span>
            <input type="date" value={workDate} onChange={(event) => onWorkDateChange?.(event.target.value)} />
          </label>
        )}
        <div style={saveActionsStyle}>
          <button
            className="icon-button"
            type="button"
            onClick={() => setIsDateOpen((current) => !current)}
            aria-expanded={isDateOpen}
            aria-label="Mentés dátumának kiválasztása"
          >
            <CalendarDays size={18} />
          </button>
          <button className="primary-button full" style={{ marginTop: 0 }} type="button" onClick={onSave}>
            <Save size={18} />
            Tételek mentése
          </button>
        </div>
      </div>
    </section>
  );
}
