import { Minus, Plus, Trash2 } from "lucide-react";
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
  padding: "12px",
  marginBottom: "14px"
};

const listHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  padding: "2px 4px 10px"
};

const rowStyle = {
  display: "grid",
  gap: "9px",
  padding: "12px 4px",
  borderTop: "1px solid rgba(135, 175, 157, 0.12)"
};

const rowTopStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "start",
  gap: "10px"
};

const titleRowStyle = {
  minWidth: 0
};

const compactSummaryStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "5px",
  marginTop: "6px"
};

const macroChipStyle = {
  display: "inline-flex",
  alignItems: "baseline",
  gap: "4px",
  minHeight: "24px",
  padding: "4px 7px",
  border: "1px solid rgba(135, 175, 157, 0.14)",
  borderRadius: "999px",
  background: "rgba(29, 45, 41, 0.58)",
  color: "var(--text)",
  fontSize: "0.72rem",
  fontWeight: 800,
  lineHeight: 1.05
};

const macroLabelStyle = {
  color: "var(--muted)",
  fontSize: "0.58rem",
  fontWeight: 900,
  letterSpacing: "0.04em",
  textTransform: "uppercase"
};

const amountControlStyle = {
  display: "grid",
  gridTemplateColumns: "40px minmax(0, 1fr) auto 40px",
  alignItems: "end",
  gap: "7px",
  marginTop: "0"
};

export function DailyEntryList({ entries, foods, onAmountChange, onRemove }) {
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
        <div>
          <p className="eyebrow">Mai tételek</p>
          <h2>Napi lista</h2>
        </div>
        <span className="badge">{entries.length} tétel</span>
      </div>

      {entries.map((entry) => {
        const food = findFoodById(entry.foodId, foods);
        if (!food) return null;
        const values = calculateEntry(food, entry.amount);

        return (
          <div style={rowStyle} key={entry.entryId}>
            <div style={rowTopStyle}>
              <div style={titleRowStyle}>
                <h2>{food.name}</h2>
                <div style={compactSummaryStyle} aria-label="Mennyiség és tápértékek">
                  <span className="entry-amount-badge">{formatAmount(entry.amount, food.unit)}</span>
                  <span style={macroChipStyle}>
                    <small style={macroLabelStyle}>kcal</small>
                    <strong>{Math.round(values.kcal)}</strong>
                  </span>
                  <span style={macroChipStyle}>
                    <small style={macroLabelStyle}>F</small>
                    <strong>{formatMacro(values.protein)}</strong>
                  </span>
                  <span style={macroChipStyle}>
                    <small style={macroLabelStyle}>Zs</small>
                    <strong>{formatMacro(values.fat)}</strong>
                  </span>
                  <span style={macroChipStyle}>
                    <small style={macroLabelStyle}>CH</small>
                    <strong>{formatMacro(values.carbs)}</strong>
                  </span>
                </div>
              </div>
              <button className="icon-button danger" type="button" onClick={() => onRemove(entry.entryId)} aria-label="Tétel törlése">
                <Trash2 size={18} />
              </button>
            </div>

            <div className="amount-control" style={amountControlStyle}>
              <button
                className="icon-button"
                type="button"
                onClick={() => onAmountChange(entry.entryId, Math.max(0, entry.amount - food.step))}
                aria-label="Mennyiség csökkentése"
              >
                <Minus size={18} />
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
                <Plus size={18} />
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
