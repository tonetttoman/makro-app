import {
  CalendarDays,
  Droplet,
  EllipsisVertical,
  Flame,
  Minus,
  Plus,
  Save,
  Trash2,
  Wheat,
  X
} from "lucide-react";
import { useMemo, useState } from "react";
import { calculateEntry, findFoodById } from "../lib/calculations";
import { CategoryPicker } from "./CategoryPicker";
import { FoodGrid } from "./FoodGrid";
import { ProgressBar } from "./ProgressBar";

const SUMMARY_ITEMS = [
  { key: "protein", label: "Fehérje", icon: Droplet, tone: "cyan" },
  { key: "fat", label: "Zsír", icon: Flame, tone: "amber" },
  { key: "carbs", label: "Ch", icon: Wheat, tone: "cyan" }
];

function formatGram(value) {
  return `${Math.round(Number(value) || 0)} g`;
}

function formatKcal(value) {
  return `${Math.round(Number(value) || 0)} kcal`;
}

function formatAmount(value, unit) {
  const rounded = Math.round((Number(value) || 0) * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} ${unit}`;
}

function TodaySummaryCard({ totals, targets }) {
  const kcal = Math.round(totals.kcal);
  const kcalTarget = Math.max(1, Number(targets.kcal) || 0);
  const progressRatio = Math.max(0, Number(totals.kcal) || 0) / kcalTarget;
  const progressPercent = progressRatio <= 0 ? 2.5 : Math.min(100, Math.max(progressRatio * 100, 4));

  return (
    <section className="today-summary-card" aria-label="Mai összesítő">
      <svg className="today-kcal-arc" viewBox="0 0 220 220" aria-hidden="true">
        <defs>
          <linearGradient id="today-kcal-arc-gradient" x1="42" y1="28" x2="88" y2="196" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffe291" stopOpacity="0.78" />
            <stop offset="38%" stopColor="#fcd34d" stopOpacity="0.96" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.84" />
          </linearGradient>
        </defs>
        <path className="today-kcal-arc__track" pathLength="100" d="M 148 24 A 88 88 0 1 0 148 196" />
        <path
          className="today-kcal-arc__progress"
          pathLength="100"
          d="M 148 24 A 88 88 0 1 0 148 196"
          style={{ strokeDasharray: `${progressPercent} 100` }}
        />
      </svg>

      <div className="today-summary-hero">
        <div className="today-kcal-content">
          <div className="today-summary-kcal" style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: "4px" }}>
            <strong style={{ fontWeight: "400", fontSize: "3.5rem", letterSpacing: "-0.02em" }}>
              {kcal.toLocaleString("hu-HU").replace(/\s/g, " ")}
            </strong>
            <span style={{ fontWeight: "400", color: "#8a99ad", fontSize: "1.1rem" }}>kcal</span>
          </div>

          <p className="today-summary-target mb-0 mt-1 text-[0.88rem] font-normal tracking-[0.01em] text-[#8a99ad]">
            cél: {targets.kcal.toLocaleString("hu-HU")} kcal
          </p>
        </div>
      </div>

      <div className="today-summary-metrics">
        {SUMMARY_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div className="today-summary-metric" key={item.key}>
              <div className="today-summary-metric-row">
                <span className={`today-summary-metric-icon is-${item.tone}`}>
                  <Icon size={15} aria-hidden="true" />
                </span>
                <span className="today-summary-metric-label">{item.label}</span>
                <strong>
                  {formatGram(totals[item.key])} / {formatGram(targets[item.key])}
                </strong>
              </div>
              <ProgressBar value={totals[item.key]} max={targets[item.key]} tone={item.tone === "amber" ? "amber" : "green"} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TodayEntryEditor({ entry, food, onAmountChange, onRemove }) {
  return (
    <div className="today-entry-editor">
      <div className="today-entry-editor-row">
        <button className="today-inline-delete" type="button" onClick={() => onRemove(entry.entryId)} aria-label="Tétel törlése">
          <Trash2 size={15} aria-hidden="true" />
        </button>
      </div>

      <div className="today-entry-stepper">
        <button
          className="today-stepper-button"
          type="button"
          onClick={() => onAmountChange(entry.entryId, Math.max(0, (Number(entry.amount) || 0) - food.step))}
          aria-label="Mennyiség csökkentése"
        >
          <Minus size={14} />
        </button>

        <label className="today-entry-stepper-input">
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

        <span className="today-entry-stepper-unit">{food.unit}</span>

        <button
          className="today-stepper-button"
          type="button"
          onClick={() => onAmountChange(entry.entryId, (Number(entry.amount) || 0) + food.step)}
          aria-label="Mennyiség növelése"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function TodayEntriesList({
  entries,
  foods,
  workDate,
  todayKey,
  isEditingPastDay,
  menuOpen,
  onToggleMenu,
  onSave,
  onWorkDateChange,
  onReturnToToday,
  onAmountChange,
  onRemove
}) {
  const [expandedEntryId, setExpandedEntryId] = useState(null);

  function toggleEntry(entryId) {
    setExpandedEntryId((current) => (current === entryId ? null : entryId));
  }

  return (
    <section className={`today-list-block ${isEditingPastDay ? "is-editing-past-day" : ""}`} aria-label="Mai tételek">
      <div className="today-list-header">
        <h2>Mai tételek</h2>
        <button
          className={`today-header-menu-button ${menuOpen ? "is-open" : ""}`}
          type="button"
          onClick={onToggleMenu}
          aria-expanded={menuOpen}
          aria-label="Mai műveletek"
        >
          {menuOpen ? <X size={15} aria-hidden="true" /> : <EllipsisVertical size={15} aria-hidden="true" />}
        </button>
      </div>

      {menuOpen && (
        <div className="today-top-actions">
          <button className="today-secondary-action is-amber" type="button" onClick={onSave}>
            <Save size={15} aria-hidden="true" />
            Tételek mentése
          </button>

          <label className="today-date-field">
            <span>
              <CalendarDays size={14} aria-hidden="true" />
              Mentés dátuma
            </span>
            <div className="today-date-field__row">
              <input
                type="date"
                value={workDate}
                onChange={(event) => {
                  onWorkDateChange(event.target.value);
                  onToggleMenu(false);
                }}
              />
              {workDate !== todayKey && (
                <button
                  className="today-date-reset"
                  type="button"
                  onClick={() => {
                    onReturnToToday?.();
                    onToggleMenu(false);
                  }}
                  aria-label="Vissza a mai naphoz"
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </div>
          </label>
        </div>
      )}

      {!entries.length ? (
        <div className="today-empty-list">
          <p>Még nincs tétel a mai listában.</p>
        </div>
      ) : (
        <div className="today-entries">
          {entries.map((entry) => {
            const food = findFoodById(entry.foodId, foods);
            if (!food) return null;

            const values = calculateEntry(food, entry.amount);
            const isExpanded = expandedEntryId === entry.entryId;

            return (
              <article className={`today-entry-row ${isExpanded ? "is-expanded" : ""}`} key={entry.entryId}>
                <div className="today-entry-shell">
                  <div className="today-entry-main">
                    <div className="today-entry-copy">
                      <h3>{food.name}</h3>
                      <div className="today-entry-macros" aria-label="Makrók">
                        <span>
                          <small>P</small>
                          {Math.round(values.protein * 10) / 10} g
                        </span>
                        <span>
                          <small>F</small>
                          {Math.round(values.fat * 10) / 10} g
                        </span>
                        <span>
                          <small>Ch</small>
                          {Math.round(values.carbs * 10) / 10} g
                        </span>
                      </div>
                    </div>

                    <div className="today-entry-values">
                      <strong>{formatKcal(values.kcal)}</strong>
                      <span>{formatAmount(entry.amount, food.unit)}</span>
                    </div>
                  </div>

                  <button
                    className="today-entry-more"
                    type="button"
                    onClick={() => toggleEntry(entry.entryId)}
                    aria-expanded={isExpanded}
                    aria-label="Tétel műveletei"
                  >
                    <EllipsisVertical size={15} aria-hidden="true" />
                  </button>
                </div>

                {isExpanded && (
                  <TodayEntryEditor
                    entry={entry}
                    food={food}
                    onAmountChange={onAmountChange}
                    onRemove={onRemove}
                  />
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

export function TodayView({
  totals,
  targets,
  workDate,
  todayKey,
  entries,
  foods,
  dailyAmounts,
  targetNutrients,
  activeCategory,
  categories,
  quickAddFoods,
  foodSearch,
  isQuickAddOpen,
  onToggleQuickAdd,
  onSelectCategory,
  onFoodSearchChange,
  onAddFood,
  onSave,
  onWorkDateChange,
  onReturnToToday,
  onAmountChange,
  onRemove
}) {
  const [isTopMenuOpen, setIsTopMenuOpen] = useState(false);
  const nutrientPreviewCount = useMemo(() => Object.keys(targetNutrients || {}).length, [targetNutrients]);
  const isEditingPastDay = workDate !== todayKey;

  return (
    <main className="page today-view">
      <TodaySummaryCard totals={totals} targets={targets} />

      <button className="today-add-cta" type="button" onClick={() => onToggleQuickAdd?.()} aria-expanded={isQuickAddOpen}>
        <Plus size={24} aria-hidden="true" />
        étel hozzáadása
      </button>

      {isQuickAddOpen && (
        <section className="today-add-sheet" aria-label="Étel hozzáadása">
          <div className="today-add-sheet__header">
            <div>
              <strong>Gyors hozzáadás</strong>
              <span>{nutrientPreviewCount} célanyag-előnézet</span>
            </div>
            <button className="today-sheet-close" type="button" onClick={() => onToggleQuickAdd?.(false)} aria-label="Bezárás">
              <X size={17} />
            </button>
          </div>

          <label className="today-search-field">
            <span>Keresés ételnév alapján...</span>
            <input
              type="search"
              value={foodSearch}
              onChange={(event) => onFoodSearchChange?.(event.target.value)}
              placeholder="Keresés ételnév alapján..."
            />
          </label>

          <CategoryPicker categories={categories} activeCategory={activeCategory} onSelect={onSelectCategory} />
          <FoodGrid
            foods={quickAddFoods}
            dailyAmounts={dailyAmounts}
            onAdd={(food) => {
              onAddFood(food);
              onFoodSearchChange?.("");
              onToggleQuickAdd?.(false);
            }}
          />
        </section>
      )}

      <TodayEntriesList
        entries={entries}
        foods={foods}
        workDate={workDate}
        todayKey={todayKey}
        isEditingPastDay={isEditingPastDay}
        menuOpen={isTopMenuOpen}
        onToggleMenu={(next) => setIsTopMenuOpen((current) => (typeof next === "boolean" ? next : !current))}
        onSave={() => {
          onSave?.();
          setIsTopMenuOpen(false);
        }}
        onWorkDateChange={(nextDate) => {
          onWorkDateChange?.(nextDate);
          setIsTopMenuOpen(false);
        }}
        onReturnToToday={() => {
          onReturnToToday?.();
          setIsTopMenuOpen(false);
        }}
        onAmountChange={onAmountChange}
        onRemove={onRemove}
      />
    </main>
  );
}
