import { calculateMacroRatio } from "../lib/calculations";
import { ProgressBar } from "./ProgressBar";

const LABELS = {
  kcal: "kcal",
  protein: "Fehérje",
  fat: "Zsír",
  carbs: "Szénhidrát"
};

const UNITS = {
  kcal: "kcal",
  protein: "g",
  fat: "g",
  carbs: "g"
};

export function MacroSummary({ totals, targets }) {
  const ratio = calculateMacroRatio(totals);

  return (
    <section className="summary" aria-label="Napi összesítő">
      <div className="summary__header">
        <div>
          <p className="eyebrow">Mai összesítő</p>
          <h1>{Math.round(totals.kcal)} kcal</h1>
        </div>
        <div className="macro-ratio" aria-label="Makróarány">
          <span>{Math.round(ratio.protein)}% P</span>
          <span>{Math.round(ratio.fat)}% Zs</span>
          <span>{Math.round(ratio.carbs)}% Sz</span>
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
