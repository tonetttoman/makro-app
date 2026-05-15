import { Minus, Plus, Trash2 } from "lucide-react";
import { TARGET_FOOD_IDS } from "../data/supplements";
import {
  calculateSupplementNutrients,
  calculateTargetNutrients,
  combineNutrients,
  findSupplementById,
  movingAverage
} from "../lib/calculations";
import { formatShortDate, getRangeKeys } from "../lib/dates";
import { ProgressBar } from "./ProgressBar";

function formatValue(value, unit) {
  const rounded = unit === "g" ? Math.round(value * 10) / 10 : Math.round(value);
  return `${rounded} ${unit}`;
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function toTrendPoints(values, max) {
  return values
    .map((value, index) => {
      const x = values.length === 1 ? 3 : 3 + (index / (values.length - 1)) * 94;
      const y = 58 - 4 - (value / max) * 48;
      return `${x},${Math.max(4, Math.min(58, y))}`;
    })
    .join(" ");
}

function NutrientTrendChart({ values, labels }) {
  const averageValues = movingAverage(values, Math.min(7, values.length || 1));
  const max = Math.max(120, ...values, ...averageValues, 1);
  const targetY = 58 - 4 - (100 / max) * 48;
  const latest = values[values.length - 1] || 0;

  return (
    <div className="mini-trend">
      <svg className="mini-trend__chart" viewBox="0 0 100 64" preserveAspectRatio="none" aria-label="Célanyag trend">
        <line x1="2" x2="98" y1={targetY} y2={targetY} className="trend-chart__target" />
        <polyline points={toTrendPoints(values, max)} className="trend-chart__value" />
        <polyline points={toTrendPoints(averageValues, max)} className="trend-chart__average" />
        <circle
          className="trend-chart__current"
          cx={values.length === 1 ? 3 : 97}
          cy={58 - 4 - (latest / max) * 48}
          r="2"
        />
      </svg>
      <div className="mini-trend__labels">
        <span>{labels[0]}</span>
        <span>100%</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
}

function buildNutrientRows({ diary, supplementDiary, foods, supplements, days }) {
  return getRangeKeys(days).map((dateKey) => {
    const foodNutrients = calculateTargetNutrients(diary[dateKey]?.entries || [], foods);
    const supplementNutrients = calculateSupplementNutrients(supplementDiary[dateKey]?.entries || [], supplements);
    return {
      dateKey,
      totals: combineNutrients(foodNutrients, supplementNutrients)
    };
  });
}

function VitaminTrendSection({ diary, supplementDiary, foods, supplements, nutrientTargets, days, title }) {
  const rows = buildNutrientRows({ diary, supplementDiary, foods, supplements, days });

  return (
    <section className="panel">
      <p className="eyebrow">{days} napos célanyag trend</p>
      <h2>{title}</h2>
      <div className="vitamin-trend-grid">
        {nutrientTargets.map((nutrient) => {
          const values = rows.map((row) => {
            const amount = row.totals[nutrient.id] || 0;
            return nutrient.dailyTarget > 0 ? (amount / nutrient.dailyTarget) * 100 : 0;
          });
          const smoothed = movingAverage(values, Math.min(7, values.length));
          const avg = average(values);
          const latest = values[values.length - 1] || 0;

          return (
            <article className="vitamin-trend-card" key={`${days}-${nutrient.id}`}>
              <div className="vitamin-trend-card__header">
                <strong>{nutrient.name}</strong>
                <span>{Math.round(latest)}% ma</span>
              </div>
              <NutrientTrendChart values={values} labels={rows.map((row) => formatShortDate(row.dateKey))} />
              <div className="source-row">
                <span>{days === 7 ? "Heti" : "Havi"} átlag: {Math.round(avg)}%</span>
                <span>Mozgóátlag: {Math.round(smoothed[smoothed.length - 1] || 0)}%</span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function NutrientCard({ nutrient, total, foodValue, supplementValue }) {
  const percent = nutrient.dailyTarget > 0 ? (total / nutrient.dailyTarget) * 100 : 0;

  return (
    <article className="nutrient-card">
      <div className="nutrient-card__header">
        <div>
          <h2>{nutrient.name}</h2>
          <p>
            {formatValue(total, nutrient.unit)} / {formatValue(nutrient.dailyTarget, nutrient.unit)}
          </p>
        </div>
        <strong>{Math.round(percent)}%</strong>
      </div>
      <ProgressBar value={total} max={nutrient.dailyTarget} tone={percent >= 100 ? "green" : "amber"} />
      <div className="source-row">
        <span>Ételekből: {formatValue(foodValue || 0, nutrient.unit)}</span>
        <span>Kiegészítőkből: {formatValue(supplementValue || 0, nutrient.unit)}</span>
      </div>
    </article>
  );
}

function SupplementEntryList({ entries, supplements, onAmountChange, onRemove }) {
  if (!entries.length) {
    return <p className="muted compact-text">Ma még nincs külön kiegészítő naplózva.</p>;
  }

  return (
    <div className="supplement-entry-list">
      {entries.map((entry) => {
        const supplement = findSupplementById(entry.supplementId, supplements);
        if (!supplement) return null;

        return (
          <article className="supplement-entry" key={entry.entryId}>
            <div>
              <strong>{supplement.name}</strong>
              <span>
                {entry.amount} {supplement.unit}
              </span>
            </div>
            <div className="mini-controls">
              <button
                className="icon-button"
                type="button"
                onClick={() => onAmountChange(entry.entryId, Math.max(0, entry.amount - supplement.step))}
                aria-label="Adag csökkentése"
              >
                <Minus size={16} />
              </button>
              <button
                className="icon-button"
                type="button"
                onClick={() => onAmountChange(entry.entryId, entry.amount + supplement.step)}
                aria-label="Adag növelése"
              >
                <Plus size={16} />
              </button>
              <button
                className="icon-button danger"
                type="button"
                onClick={() => onRemove(entry.entryId)}
                aria-label="Kiegészítő törlése"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export function VitaminView({
  diary,
  supplementDiary,
  foods,
  supplements,
  nutrientTargets,
  foodNutrients,
  supplementEntries,
  onAddSupplement,
  onAddTargetFood,
  onSupplementAmountChange,
  onRemoveSupplement
}) {
  const supplementNutrients = calculateSupplementNutrients(supplementEntries, supplements);
  const totals = combineNutrients(foodNutrients, supplementNutrients);
  const targetFoods = foods.filter(
    (food) => TARGET_FOOD_IDS.includes(food.id) || Object.keys(food.targetNutrients || {}).length > 0
  );

  return (
    <main className="page">
      <section className="panel">
        <p className="eyebrow">Célanyag napló</p>
        <h1>Vitaminok</h1>
        <p className="muted">
          A makró naplóban szereplő célzöldségek és cél-ételek automatikusan beleszámítanak az aktuális napi értékekbe.
        </p>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Gyorsgombok</p>
            <h2>Kiegészítők és rutinok</h2>
          </div>
        </div>
        <div className="quick-grid">
          {supplements.map((supplement) => (
            <button className="quick-button" type="button" key={supplement.id} onClick={() => onAddSupplement(supplement)}>
              <strong>{supplement.name}</strong>
              <span>
                {supplement.defaultDose} {supplement.unit}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Célzöldség / célétel</p>
            <h2>Ételnaplóba hozzáadás</h2>
          </div>
        </div>
        <div className="quick-grid">
          {targetFoods.map((food) => (
            <button className="quick-button food" type="button" key={food.id} onClick={() => onAddTargetFood(food)}>
              <strong>{food.name}</strong>
              <span>
                {food.defaultAmount} {food.unit}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel__header">
          <div>
            <p className="eyebrow">Mai kiegészítő lista</p>
            <h2>Naplózott tételek</h2>
          </div>
        </div>
        <SupplementEntryList
          entries={supplementEntries}
          supplements={supplements}
          onAmountChange={onSupplementAmountChange}
          onRemove={onRemoveSupplement}
        />
      </section>

      <section className="nutrient-list" aria-label="Követett célanyagok">
        {nutrientTargets.map((nutrient) => (
          <NutrientCard
            key={nutrient.id}
            nutrient={nutrient}
            total={totals[nutrient.id] || 0}
            foodValue={foodNutrients[nutrient.id] || 0}
            supplementValue={supplementNutrients[nutrient.id] || 0}
          />
        ))}
      </section>

      <VitaminTrendSection
        diary={diary}
        supplementDiary={supplementDiary}
        foods={foods}
        supplements={supplements}
        nutrientTargets={nutrientTargets}
        days={7}
        title="Heti célanyag grafikonok"
      />
      <VitaminTrendSection
        diary={diary}
        supplementDiary={supplementDiary}
        foods={foods}
        supplements={supplements}
        nutrientTargets={nutrientTargets}
        days={30}
        title="Havi célanyag grafikonok"
      />
    </main>
  );
}
