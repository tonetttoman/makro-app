import { CalendarDays, Lock, Minus, Plus, Save, Trash2, Unlock, X } from "lucide-react";
import { useRef, useState } from "react";
import { calculateEntry, findFoodById } from "../lib/calculations";

function formatMacro(value, unit = "g") {
  return `${Math.round(value * 10) / 10} ${unit}`;
}

function formatKcal(value) {
  return `${Math.round(Number(value) || 0)} kcal`;
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

const compactSummaryStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
  alignItems: "center",
  gap: "5px",
  marginTop: 0,
  width: "100%"
};

const amountBadgeStyle = {
  minHeight: "26px",
  minWidth: 0,
  marginTop: 0,
  padding: "5px 8px",
  fontSize: "0.72rem",
  lineHeight: 1.05
};

const macroChipStyle = {
  display: "inline-flex",
  alignItems: "baseline",
  justifyContent: "center",
  gap: "3px",
  minHeight: "28px",
  minWidth: 0,
  padding: "5px 7px",
  border: "1px solid rgba(56, 189, 248, 0.18)",
  borderRadius: "999px",
  background: "rgba(15, 23, 42, 0.72)",
  color: "var(--text)",
  fontSize: "clamp(0.64rem, 2.35vw, 0.76rem)",
  fontWeight: 850,
  lineHeight: 1.05,
  whiteSpace: "nowrap",
  boxShadow: "0 0 0 1px rgba(56, 189, 248, 0.04) inset"
};

const macroLabelStyle = {
  color: "var(--muted)",
  fontSize: "0.56rem",
  fontWeight: 900,
  letterSpacing: "0.02em",
  textTransform: "none"
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
      <section className="empty-state daily-entry-empty">
        <h2>Mai tételek</h2>
        <p>Nincs még tétel.</p>
      </section>
    );
  }

  return (
    <section className="daily-entry-panel" aria-label="Napi kalkulációs lista">
      <div className="daily-entry-header reference-list-header">
        <h2>Mai tételek</h2>
        <div className="daily-entry-tools">
          <span>{formatDisplayDate(workDate)}</span>
          <button className="reference-tool-button" type="button" onClick={handleSaveClick} aria-label="Mentés">
            <Save size={15} />
          </button>
          <button
            className="reference-tool-button"
            type="button"
            onClick={openDatePicker}
            aria-expanded={isDateOpen}
            aria-label="Mentés dátumának kiválasztása"
          >
            <CalendarDays size={15} />
          </button>
        </div>
      </div>

      {isDateOpen && (
        <div className="daily-date-picker reference-date-picker">
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
          <button className="icon-button danger" type="button" onClick={closeDatePicker} aria-label="Dátumválasztó bezárása">
            <X size={18} />
          </button>
        </div>
      )}

      <div className="daily-entry-list-modern">
        {entries.map((entry) => {
          const food = findFoodById(entry.foodId, foods);
          if (!food) return null;
          const values = calculateEntry(food, entry.amount);
          const isLocked = Boolean(entry.locked);

          return (
            <article className={`daily-entry-item ${isLocked ? "is-locked" : ""}`} key={entry.entryId}>
              <button
                className="daily-entry-readonly-main"
                type="button"
                onClick={() => onToggleLock?.(entry.entryId)}
                aria-label={isLocked ? "Tétel feloldása" : "Tétel zárolása"}
              >
                <div className="daily-entry-main">
                  <div className="daily-entry-title-block">
                    <h3>{food.name}</h3>
                    <span>{formatAmount(entry.amount, food.unit)}</span>
                  </div>
                  <div className="daily-entry-kcal">{formatKcal(values.kcal)}</div>
                </div>

                <div className="daily-entry-macros" aria-label="Tápértékek">
                  <span><small>P</small>{formatMacro(values.protein)}</span>
                  <span><small>F</small>{formatMacro(values.fat)}</span>
                  <span><small>Ch</small>{formatMacro(values.carbs)}</span>
                </div>
              </button>

              <div className="daily-entry-actions">
                <button
                  className="icon-button"
                  type="button"
                  onClick={() => onToggleLock?.(entry.entryId)}
                  aria-label={isLocked ? "Tétel feloldása" : "Tétel zárolása"}
                >
                  {isLocked ? <Lock size={15} /> : <Unlock size={15} />}
                </button>
                {!isLocked && (
                  <button className="icon-button danger" type="button" onClick={() => onRemove(entry.entryId)} aria-label="Tétel törlése">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>

              {!isLocked && (
                <div className="daily-entry-edit">
                  <button
                    className="icon-button"
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
                  <span className="unit">{food.unit}</span>
                  <button
                    className="icon-button"
                    type="button"
                    onClick={() => onAmountChange(entry.entryId, entry.amount + food.step)}
                    aria-label="Mennyiség növelése"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
