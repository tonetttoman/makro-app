import { CalendarDays, Lock, Minus, Plus, Save, Trash2, Unlock, X } from "lucide-react";
import { useRef, useState } from "react";
import { calculateEntry, findFoodById } from "../lib/calculations";

function formatMacro(value, unit = "g") {
  return `${Math.round(value * 10) / 10} ${unit}`;
}

function formatAmount(value, unit) {
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} ${unit}`;
}

function formatDisplayDate(date) {
  if (!date) return "";
  const [year, month, day] = date.split("-");
  if (!year || !month || !day) return date;
  return `${year}. ${month}. ${day}.`;
}

const listPanelStyle = {
  display: "grid",
  gap: "0",
  padding: "10px",
  marginBottom: "12px"
};

const listHeaderStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(120px, 1.1fr) 42px",
  alignItems: "center",
  gap: "8px",
  padding: "0 2px 7px"
};

const headerTitleStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "7px",
  minWidth: 0
};

const dateBadgeStyle = {
  minHeight: "24px",
  padding: "4px 8px",
  fontSize: "0.68rem",
  lineHeight: 1
};

const headerSaveStyle = {
  minHeight: "38px",
  padding: "0 10px",
  marginTop: 0,
  borderRadius: "13px",
  position: "relative",
  zIndex: 1
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
  textTransform: "none"
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

const datePickerRowStyle = {
  padding: "2px 2px 10px"
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
  onResetToDefaultDate,
  onSave
}) {
  const [isDateOpen, setIsDateOpen] = useState(false);
  const dateInputRef = useRef(null);

  function handleSaveClick(event) {
    event.preventDefault();
    event.stopPropagation();
    onSave?.();
  }

  function openDatePicker() {
    setIsDateOpen(true);
    window.requestAnimationFrame(() => {
      const input = dateInputRef.current;
      if (!input) return;
      input.focus();
      if (typeof input.showPicker === "function") {
        input.showPicker();
      } else {
        input.click();
      }
    });
  }

  function handleDateChange(date) {
    onWorkDateChange?.(date);
    setIsDateOpen(false);
  }

  function handleDateInput(event) {
    const { value } = event.target;
    if (!value) return;
    handleDateChange(value);
  }

  function closeDatePicker() {
    setIsDateOpen(false);
  }

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
        <div style={headerTitleStyle}>
          <p className="eyebrow" style={{ marginBottom: 0 }}>Mai tételek</p>
          <span className="badge" style={dateBadgeStyle}>{formatDisplayDate(workDate)}</span>
        </div>
        {isDateOpen ? (
          <button
            className="icon-button danger full"
            style={headerSaveStyle}
            type="button"
            onClick={closeDatePicker}
            aria-label="Dátumválasztó bezárása és visszaállás az alap mai nézetre"
          >
            <X size={18} />
          </button>
        ) : (
          <button className="primary-button full" style={headerSaveStyle} type="button" onClick={handleSaveClick}>
            <Save size={17} />
            Tételek mentése
          </button>
        )}
        <button
          className="icon-button"
          type="button"
          onClick={openDatePicker}
          aria-expanded={isDateOpen}
          aria-label="Mentés dátumának kiválasztása"
        >
          <CalendarDays size={18} />
        </button>
      </div>

      {isDateOpen && (
        <div style={datePickerRowStyle}>
          <label className="form-field" style={{ marginTop: 0 }}>
            <span>Mentés dátuma</span>
            <input
              ref={dateInputRef}
              type="date"
              value={workDate}
              onChange={handleDateInput}
              onInput={handleDateInput}
            />
          </label>
        </div>
      )}

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
                    <small style={macroLabelStyle}>Ch</small>
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
    </section>
  );
}
