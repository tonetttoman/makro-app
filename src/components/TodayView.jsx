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
import { AppButton, AppCard, AppField, AppInput, AppMetaText, AppNestedCard, AppSearchInput, AppSectionTitle } from "./ui/AppUi";

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
    <AppNestedCard className="mt-3 grid gap-3" variant="compact">
      <div className="flex justify-end">
        <AppButton variant="danger" type="button" onClick={() => onRemove(entry.entryId)} aria-label="Tétel törlése">
          <Trash2 size={15} aria-hidden="true" />
        </AppButton>
      </div>

      <div className="grid grid-cols-[42px_minmax(0,1fr)_auto_42px] items-end gap-2">
        <AppButton
          className="h-[42px] min-h-0 px-0"
          variant="secondary"
          type="button"
          onClick={() => onAmountChange(entry.entryId, Math.max(0, (Number(entry.amount) || 0) - food.step))}
          aria-label="Mennyiség csökkentése"
        >
          <Minus size={14} />
        </AppButton>

        <AppField className="p-3" label="Mennyiség">
          <AppInput
            inputMode="decimal"
            min="0"
            step={food.step}
            type="number"
            value={entry.amount}
            onChange={(event) => onAmountChange(entry.entryId, Number(event.target.value))}
          />
        </AppField>

        <AppMetaText className="pb-3 text-sm font-semibold text-slate-300">{food.unit}</AppMetaText>

        <AppButton
          className="h-[42px] min-h-0 px-0"
          variant="secondary"
          type="button"
          onClick={() => onAmountChange(entry.entryId, (Number(entry.amount) || 0) + food.step)}
          aria-label="Mennyiség növelése"
        >
          <Plus size={14} />
        </AppButton>
      </div>
    </AppNestedCard>
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
    <AppCard className="mt-2.5" aria-label="Mai tételek">
      <div className="flex items-center justify-between gap-3">
        <AppSectionTitle className="text-base">Mai tételek</AppSectionTitle>
        <AppButton
          className="h-9 min-h-0 w-9 rounded-full px-0"
          variant="secondary"
          type="button"
          onClick={onToggleMenu}
          aria-expanded={menuOpen}
          aria-label="Mai műveletek"
        >
          {menuOpen ? <X size={15} aria-hidden="true" /> : <EllipsisVertical size={15} aria-hidden="true" />}
        </AppButton>
      </div>

      {menuOpen && (
        <AppNestedCard className="mt-3 grid gap-3" variant="surface">
          <AppButton className="w-full gap-2" variant="action" type="button" onClick={onSave}>
            <Save size={15} aria-hidden="true" />
            Tételek mentése
          </AppButton>

          <AppField label="Mentés dátuma">
            <div className="flex items-center gap-2">
              <CalendarDays size={14} aria-hidden="true" className="shrink-0 text-slate-500" />
              <AppInput
                type="date"
                value={workDate}
                onChange={(event) => {
                  onWorkDateChange(event.target.value);
                  onToggleMenu(false);
                }}
              />
              {workDate !== todayKey && (
                <AppButton
                  className="h-[42px] min-h-0 w-[42px] shrink-0 px-0"
                  variant="secondary"
                  type="button"
                  onClick={() => {
                    onReturnToToday?.();
                    onToggleMenu(false);
                  }}
                  aria-label="Vissza a mai naphoz"
                >
                  <X size={14} aria-hidden="true" />
                </AppButton>
              )}
            </div>
          </AppField>
        </AppNestedCard>
      )}

      {!entries.length ? (
        <AppNestedCard className="mt-3" variant="empty">
          Még nincs tétel a mai listában.
        </AppNestedCard>
      ) : (
        <div className={`mt-3 overflow-hidden rounded-[22px] border border-slate-700/40 bg-[#0d1420] ${isEditingPastDay ? "ring-1 ring-cyan-400/20" : ""}`}>
          <div className="divide-y divide-slate-700/35">
            {entries.map((entry) => {
              const food = findFoodById(entry.foodId, foods);
              if (!food) return null;

              const values = calculateEntry(food, entry.amount);
              const isExpanded = expandedEntryId === entry.entryId;

              return (
                <article className="bg-transparent" key={entry.entryId}>
                  <div className="flex items-start gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <AppSectionTitle className="truncate text-[0.95rem] font-semibold leading-[1.18] text-slate-100">{food.name}</AppSectionTitle>
                          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1" aria-label="Makrók">
                            <AppMetaText className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
                              <small className="text-[0.61rem] font-semibold uppercase tracking-[0.08em] text-slate-500">P</small>
                              {Math.round(values.protein * 10) / 10} g
                            </AppMetaText>
                            <AppMetaText className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
                              <small className="text-[0.61rem] font-semibold uppercase tracking-[0.08em] text-slate-500">F</small>
                              {Math.round(values.fat * 10) / 10} g
                            </AppMetaText>
                            <AppMetaText className="inline-flex items-baseline gap-1.5 whitespace-nowrap">
                              <small className="text-[0.61rem] font-semibold uppercase tracking-[0.08em] text-slate-500">Ch</small>
                              {Math.round(values.carbs * 10) / 10} g
                            </AppMetaText>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <AppSectionTitle className="text-[0.95rem] font-semibold leading-none text-slate-100">{formatKcal(values.kcal)}</AppSectionTitle>
                          <AppMetaText className="mt-1 block text-[0.72rem] font-medium text-slate-400">{formatAmount(entry.amount, food.unit)}</AppMetaText>
                        </div>
                      </div>
                    </div>

                    <AppButton
                      className="h-8 min-h-0 w-8 shrink-0 rounded-full px-0"
                      variant="secondary"
                      type="button"
                      onClick={() => toggleEntry(entry.entryId)}
                      aria-expanded={isExpanded}
                      aria-label="Tétel műveletei"
                    >
                      <EllipsisVertical size={15} aria-hidden="true" />
                    </AppButton>
                  </div>

                  {isExpanded && (
                    <div className="px-4 pb-3">
                      <TodayEntryEditor entry={entry} food={food} onAmountChange={onAmountChange} onRemove={onRemove} />
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
    </AppCard>
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
    <main className="mx-auto w-full max-w-[var(--page-max-width)] p-[var(--page-padding)] pb-28">
      <TodaySummaryCard totals={totals} targets={targets} />

      <AppButton className="mt-2.5 w-full min-h-[56px] gap-2.5 rounded-2xl border-cyan-400/20 text-[0.98rem] font-semibold" variant="action" type="button" onClick={() => onToggleQuickAdd?.()} aria-expanded={isQuickAddOpen}>
        <Plus size={24} aria-hidden="true" />
        étel hozzáadása
      </AppButton>

      {isQuickAddOpen && (
        <AppCard aria-label="Étel hozzáadása">
          <div className="flex items-start justify-between gap-3">
            <div>
              <AppSectionTitle>Gyors hozzáadás</AppSectionTitle>
              <AppMetaText>{nutrientPreviewCount} célanyag-előnézet</AppMetaText>
            </div>
            <AppButton className="h-9 min-h-0 w-9 rounded-full px-0" variant="secondary" type="button" onClick={() => onToggleQuickAdd?.(false)} aria-label="Bezárás">
              <X size={17} />
            </AppButton>
          </div>

          <AppField className="mt-3" label="Keresés ételnév alapján...">
            <AppSearchInput
              icon={null}
              value={foodSearch}
              onChange={(event) => onFoodSearchChange?.(event.target.value)}
              placeholder="Keresés ételnév alapján..."
            />
          </AppField>

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
        </AppCard>
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
