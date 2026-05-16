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
  padding: "10px",
  marginBottom: "12px"
};

const listHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "10px",
  padding: "0 2px 8px"
};

const rowStyle = {
  display: "grid",
  gap: "7px",
  padding: "9px 2px",
  borderTop: "1px solid rgba(135, 175, 157, 0.11)"
};

const rowTopStyle = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) auto",
  alignItems: "start",
  gap: "8px"
};

const titleRowStyle = {
  minWidth: 0
};

const itemTitleStyle = {
  margin: 0,
  fontSize: "0.98rem",
  lineHeight: 1.15
};

const compactSummaryStyle = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "4px",
  marginTop: "5px"
};

const amountBadgeStyle = {
  minHeight: "22px",
  marginTop: 0,
  padding: "4px 7px",
  fontSize: "0.72rem",
  lineHeight: 1.05
};

const macroChipStyle = {
  display: "inline-flex",
  alignItems: "baseline",
  gap: "3px",
  minHeight: "22px",
  padding: "4px 6px",
  border: "1px solid rgba(135, 175, 157, 0.13)",
  borderRadius: "999px",
  background: "rgba(29, 45, 41, 0.5)",
  color: "var(--text)",
  fontSize: "0.68rem",
  fontWeight: 800,
  lineHeight: 1
};

const macroLabelStyle = {
  color: "var(--muted)",
  fontSize: "0.54rem",
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
                <h2 style={itemTitleStyle}>{food.name}</h2>
                <div style={compactSummaryStyle} aria-label="Mennyiség és tápértékek">
                  <span className="entry-amount-badge" style={amountBadgeStyle}>{formatAmount(entry.amount, food.unit)}</span>
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
              <button
                className="icon-button danger"
                style={smallDeleteStyle}
                type="button"
                onClick={() => onRemove(entry.entryId)}
                aria-label="Tétel törlése"
              >
                <Trash2 size={16} />
              </button>
            </div>

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
          </div>
        );
      })}
    </section>
  );
}
