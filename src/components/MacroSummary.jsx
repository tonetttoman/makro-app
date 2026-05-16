import { Droplet, Flame, Plus, Wheat } from "lucide-react";
import { calculateMacroRatio } from "../lib/calculations";
import { ProgressBar } from "./ProgressBar";

const ITEMS = [
  { key: "protein", label: "Fehérje", short: "P", icon: Droplet, tone: "green" },
  { key: "fat", label: "Zsír", short: "F", icon: Flame, tone: "amber" },
  { key: "carbs", label: "Ch", short: "Ch", icon: Wheat, tone: "green" }
];

function formatGram(value) {
  return `${Math.round(Number(value) || 0)} g`;
}

export function MacroSummary({ totals, targets, isQuickAddOpen, onToggleQuickAdd }) {
  const ratio = calculateMacroRatio(totals);
  const kcal = Math.round(totals.kcal);

  return (
    <section className="summary" aria-label="Napi összesítő">
      <div className="summary-hero">
        <div className="summary-hero__top">
          <button
            className="summary-quick-add-button"
            type="button"
            onClick={onToggleQuickAdd}
            aria-expanded={isQuickAddOpen}
            aria-label="Gyors hozzáadás megnyitása"
          >
            <Plus size={26} aria-hidden="true" />
          </button>
        </div>

        <div className="summary-kcal" aria-label={`${kcal} kilokalória`}>
          <strong>{kcal.toLocaleString("hu-HU").replace(/\s/g, " ")}</strong>
          <span>kcal</span>
        </div>
        <p className="summary-target">cél: {targets.kcal.toLocaleString("hu-HU")} kcal</p>
      </div>

      <div className="summary-macro-ratio" aria-label="Makróarány">
        <span><strong>P</strong> {Math.round(ratio.protein)}%</span>
        <span><strong>F</strong> {Math.round(ratio.fat)}%</span>
        <span><strong>Ch</strong> {Math.round(ratio.carbs)}%</span>
      </div>

      <div className="summary-grid">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div className="metric" key={item.key}>
              <div className="metric__row">
                <span className={`metric__icon metric__icon--${item.tone}`}><Icon size={17} aria-hidden="true" /></span>
                <span className="metric__label">{item.label}</span>
                <strong>{formatGram(totals[item.key])} / {formatGram(targets[item.key])}</strong>
              </div>
              <ProgressBar value={totals[item.key]} max={targets[item.key]} tone={item.tone} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
