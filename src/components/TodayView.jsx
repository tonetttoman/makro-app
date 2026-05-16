import {
  CalendarDays,
  Droplet,
  EllipsisVertical,
  Flame,
  Lock,
  Minus,
  Plus,
  Save,
  Trash2,
  Unlock,
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

function formatDisplayDate(date) {
  if (!date) return "";
  const [year, month, day] = String(date).split("-");
  if (!year || !month || !day) return date;
  return `${year}. ${month}. ${day}.`;
}

function TodaySummaryCard({ totals, targets }) {
  const kcal = Math.round(totals.kcal);

  return (
    <section className="today-summary-card" aria-label="Mai összesítő">
      <div className="today-summary-orbit" aria-hidden="true" />

      <div className="today-summary-hero">
        <span className="today-summary-flame"><Flame size={22} aria-hidden="true" /></span>
        <div className="today-summary-kcal">
          <strong>{kcal.toLocaleString("hu-HU").replace(/\s/g, " ")}</strong>
          <span>kcal</span>
        </div>
        <p className="today-summary-target">cél: {targets.kcal.toLocaleString("hu-HU")} kcal</p>
      </div>

      <div className="today-summary-metrics">
        {SUMMARY_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div className="today-summary-metric" key={item.key}>
              <div className="today-summary-metric-row">
                <span className={`today-summary-metric-icon is-${item.tone}`}>
                  <Icon size={16} aria-hidden="true" />
                </span>
                <span className="today-summary-metric-label">{item.label}</span>
                <strong>{formatGram(totals[item.key])} / {formatGram(targets[item.key])}</strong>
              </div>
              <ProgressBar value={totals[item.key]} max={targets[item.key]} tone={item.tone === "amber" ? "amber" : "green"} />
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TodayEntryEditor({ entry, food, onAmountChange, onToggleLock, onRemove }) {
  const isLocked = Boolean(entry.locked);

  return (
    <div className="today-entry-editor">
      <div className="today-entry-editor-row">
        <button
          className="today-secondary-action"
          type="button"
          onClick={() => onToggleLock(entry.entryId)}
        >
          {isLocked ? <Unlock size={15} aria-hidden="true" /> : <Lock size={15} aria-hidden="true" />}
          {isLocked ? "Feloldás" : "Zárolás"}
        </button>
        <button
          className="today-secondary-action is-danger"
          type="button"
          onClick={() => onRemove(entry.entryId)}
        >
          <Trash2 size={15} aria-hidden="true" />
          Törlés
        </button>
      </div>

      {!isLocked && (
        <div className="today-entry-stepper">
          <button
            className="today-stepper-button"
            type="button"
            onClick={() => onAmountChange(entry.entryId, Math.max(0, (Number(entry.amount) || 0) - food.step))}
            aria-label="Mennyiség csökkentése"
          >
            <Minus size={16} />
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
            <Plus size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

function TodayEntriesList({
  entries,
  foods,
  workDate,
  menuOpen,
  onToggleMenu,
  onSave,
  onWorkDateChange,
  onAmountChange,
  onToggleLock,
  onRemove
}) {
  const [expandedEntryId, setExpandedEntryId] = useState(null);

  function toggleEntry(entryId) {
    setExpandedEntryId((current) => (current === entryId ? null : entryId));
  }

  return (
    <section className="today-list-block" aria-label="Mai tételek">
      <div className="today-list-header">
        <h2>Mai tételek</h2>
        <button
          className={`today-header-menu-button ${menuOpen ? "is-open" : ""}`}
          type="button"
          onClick={onToggleMenu}
          aria-expanded={menuOpen}
          aria-label="Mai műveletek"
        >
          {menuOpen ? <X size={18} aria-hidden="true" /> : <EllipsisVertical size={18} aria-hidden="true" />}
        </button>
      </div>

      {menuOpen && (
        <div className="today-top-actions">
          <button className="today-secondary-action is-amber" type="button" onClick={onSave}>
            <Save size={16} aria-hidden="true" />
            Tételek mentése
          </button>

          <label className="today-date-field">
            <span>
              <CalendarDays size={15} aria-hidden="true" />
              Mentés dátuma
            </span>
            <input
              type="date"
              value={workDate}
              onChange={(event) => {
                onWorkDateChange(event.target.value);
                onToggleMenu(false);
              }}
            />
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
                      <span>{formatAmount(entry.amount, food.unit)}</span>
                    </div>

                    <div className="today-entry-values">
                      <strong>{formatKcal(values.kcal)}</strong>
                    </div>
                  </div>

                  <div className="today-entry-macros" aria-label="Makrók">
                    <span><small>P</small>{Math.round(values.protein * 10) / 10} g</span>
                    <span><small>F</small>{Math.round(values.fat * 10) / 10} g</span>
                    <span><small>Ch</small>{Math.round(values.carbs * 10) / 10} g</span>
                  </div>

                  <button
                    className="today-entry-more"
                    type="button"
                    onClick={() => toggleEntry(entry.entryId)}
                    aria-expanded={isExpanded}
                    aria-label="Tétel műveletei"
                  >
                    <EllipsisVertical size={18} aria-hidden="true" />
                  </button>
                </div>

                {isExpanded && (
                  <TodayEntryEditor
                    entry={entry}
                    food={food}
                    onAmountChange={onAmountChange}
                    onToggleLock={onToggleLock}
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
  entries,
  foods,
  dailyAmounts,
  targetNutrients,
  activeCategory,
  categories,
  quickAddFoods,
  isQuickAddOpen,
  onToggleQuickAdd,
  onSelectCategory,
  onAddFood,
  onSave,
  onWorkDateChange,
  onAmountChange,
  onToggleLock,
  onRemove
}) {
  const [isTopMenuOpen, setIsTopMenuOpen] = useState(false);
  const nutrientPreviewCount = useMemo(() => Object.keys(targetNutrients || {}).length, [targetNutrients]);

  function handleToggleQuickAdd() {
    onToggleQuickAdd?.();
  }

  return (
    <main className="page today-view">
      <header className="today-view__header" aria-label="Mai nézet">
        <h1>Mai</h1>
      </header>

      <TodaySummaryCard totals={totals} targets={targets} />

      <button
        className="today-add-cta"
        type="button"
        onClick={handleToggleQuickAdd}
        aria-expanded={isQuickAddOpen}
      >
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
            <button className="today-sheet-close" type="button" onClick={handleToggleQuickAdd} aria-label="Bezárás">
              <X size={18} />
            </button>
          </div>

          <CategoryPicker categories={categories} activeCategory={activeCategory} onSelect={onSelectCategory} />
          <FoodGrid
            foods={quickAddFoods}
            dailyAmounts={dailyAmounts}
            onAdd={(food) => {
              onAddFood(food);
              onToggleQuickAdd?.(false);
            }}
          />
        </section>
      )}

      <TodayEntriesList
        entries={entries}
        foods={foods}
        workDate={workDate}
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
        onAmountChange={onAmountChange}
        onToggleLock={onToggleLock}
        onRemove={onRemove}
      />
    </main>
  );
}
