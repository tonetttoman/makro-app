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
import { useEffect, useState } from "react";
import { calculateEntry, findFoodById } from "../lib/calculations";
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
    <section className="relative grid gap-3 overflow-hidden rounded-[22px] border border-[rgba(148,163,184,0.14)] bg-[linear-gradient(180deg,rgba(23,29,40,0.98),rgba(12,17,27,0.98))] px-[18px] pb-[14px] pt-[15px] shadow-[0_18px_38px_rgba(0,0,0,0.28)] max-[520px]:px-4 max-[520px]:pb-[13px] max-[520px]:pt-[13px] max-[380px]:rounded-[20px]" aria-label="Mai összesítő">
      <svg className="pointer-events-none absolute left-1/2 top-[10px] h-[min(184px,48vw)] w-[min(184px,48vw)] overflow-visible [transform:translateX(-50%)_translateX(-42px)] max-[520px]:h-[min(170px,45vw)] max-[520px]:w-[min(170px,45vw)] max-[520px]:[transform:translateX(-50%)_translateX(-36px)]" viewBox="0 0 220 220" aria-hidden="true">
        <defs>
          <linearGradient id="today-kcal-arc-gradient" x1="42" y1="28" x2="88" y2="196" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffe291" stopOpacity="0.78" />
            <stop offset="38%" stopColor="#fcd34d" stopOpacity="0.96" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.84" />
          </linearGradient>
        </defs>
        <path className="fill-none [stroke:rgba(251,191,36,0.18)] [stroke-width:9] [stroke-linecap:round]" pathLength="100" d="M 148 24 A 88 88 0 1 0 148 196" />
        <path
          className="fill-none [stroke:url(#today-kcal-arc-gradient)] [stroke-width:9] [filter:drop-shadow(0_0_8px_rgba(251,191,36,0.1))] [stroke-linecap:round]"
          pathLength="100"
          d="M 148 24 A 88 88 0 1 0 148 196"
          style={{ strokeDasharray: `${progressPercent} 100` }}
        />
      </svg>

      <div className="relative z-[1] grid min-h-[126px] content-start justify-items-center gap-1 pt-0 max-[520px]:min-h-[122px]">
        <div className="grid translate-y-5 justify-items-center gap-1 max-[520px]:translate-y-[18px]">
          <div className="mt-7 flex translate-x-px items-baseline justify-center gap-[6px] text-center text-[var(--text)]">
            <strong className="mr-px text-[clamp(2.78rem,12.5vw,4.2rem)] font-[730] leading-[0.9] tracking-[0.02em] [text-shadow:0_10px_22px_rgba(0,0,0,0.18)] max-[380px]:text-[clamp(2.48rem,11.7vw,3.88rem)]">
              {kcal.toLocaleString("hu-HU").replace(/\s/g, " ")}
            </strong>
            <span className="translate-y-[-1px] text-[clamp(0.94rem,3.3vw,1.08rem)] font-[540] text-[var(--text)]">kcal</span>
          </div>

          <p className="m-0 translate-y-[-1px] text-[0.88rem] leading-[1.1] text-[var(--muted-strong)]">
            cél: {targets.kcal.toLocaleString("hu-HU")} kcal
          </p>
        </div>
      </div>

      <div className="relative z-[1] mt-0.5 grid gap-3">
        {SUMMARY_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <div className="grid gap-[5px]" key={item.key}>
              <div className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-center gap-2 text-[0.85rem] text-[var(--muted-strong)]">
                <span className={`inline-grid h-[22px] w-[22px] place-items-center rounded-lg ${item.tone === "amber" ? "bg-[rgba(251,191,36,0.06)] text-[var(--amber)]" : "bg-[rgba(56,189,248,0.06)] text-[var(--cyan)]"}`}>
                  <Icon size={15} aria-hidden="true" />
                </span>
                <span className="font-[690] text-[var(--text)]">{item.label}</span>
                <strong className="font-[790] text-[var(--text)]">
                  {formatGram(totals[item.key])} / {formatGram(targets[item.key])}
                </strong>
              </div>
              <ProgressBar className="h-1 bg-[rgba(148,163,184,0.08)] shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]" fillClassName={item.tone === "amber" ? "bg-[linear-gradient(90deg,rgba(245,158,11,0.88),rgba(251,191,36,0.94))] shadow-[0_0_10px_rgba(251,191,36,0.1)]" : "bg-[linear-gradient(90deg,rgba(34,197,246,0.9),rgba(96,220,255,0.95))] shadow-[0_0_10px_rgba(56,189,248,0.12)]"} value={totals[item.key]} max={targets[item.key]} tone={item.tone === "amber" ? "amber" : "green"} />
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
  const [isTopMenuOpen, setIsTopMenuOpen] = useState(workDate !== todayKey);
  const isEditingPastDay = workDate !== todayKey;

  useEffect(() => {
    setIsTopMenuOpen(workDate !== todayKey);
  }, [workDate, todayKey]);

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

          {foodSearch.trim() ? (
            <FoodGrid
              foods={quickAddFoods}
              onAdd={(food) => {
                onAddFood(food);
                onFoodSearchChange?.("");
                onToggleQuickAdd?.(false);
              }}
            />
          ) : null}
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
          if (workDate === todayKey) {
            setIsTopMenuOpen(false);
          }
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
