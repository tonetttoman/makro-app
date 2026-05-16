import { Utensils } from "lucide-react";
import { calculateMacroRatio } from "../lib/calculations";
import { ProgressBar } from "./ProgressBar";

const LABELS = {
  kcal: "kcal",
  protein: "p",
  fat: "f",
  carbs: "Ch"
};

const UNITS = {
  kcal: "kcal",
  protein: "g",
  fat: "g",
  carbs: "g"
};

export function MacroSummary({ totals, targets, isQuickAddOpen, onToggleQuickAdd }) {
  const ratio = calculateMacroRatio(totals);

  return (
    <section className="summary" aria-label="Napi összesítő">
      <div className="summary__header summary__header--with-action">
        <div>
          <p className="eyebrow">Mai összesítő</p>
          <h1>{Math.round(totals.kcal)} kcal</h1>
        </div>
        <button
          className="summary-quick-add-button"
          type="button"
          onClick={onToggleQuickAdd}
          aria-expanded={isQuickAddOpen}
          aria-label="Gyors hozzáadás megnyitása"
        >
          <Utensils size={24} aria-hidden="true" />
        </button>
        <div className="macro-ratio" aria-label="Makróarány">
          <span>{Math.round(ratio.protein)}% p</span>
          <span>{Math.round(ratio.fat)}% f</span>
          <span>{Math.round(ratio.carbs)}% Ch</span>
        </div>
      </div>

      <div className="summary-grid">
        {Object.keys(LABELS).map((key) => (
          <div className="metric" key={key}>
            <div className="metric__row">
              <span>{LABELS[key]}</span>
              <strong>
                {Math.round(totals[key])}/{targets[key]} {UNITS[key]}
              </strong>
            </div>
            <ProgressBar value={totals[key]} max={targets[key]} tone={key === "kcal" ? "amber" : "green"} />
          </div>
        ))}
      </div>
    </section>
  );
}
