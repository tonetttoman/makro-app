import { Plus } from "lucide-react";
import { AppMetaText, AppRecipeOption, AppSectionTitle } from "./ui/AppUi";

function formatAmount(amount, unit) {
  const rounded = Math.round(amount * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)} ${unit}`;
}

function isRenderableFood(food) {
  return Boolean(food?.id?.trim?.() && food?.name?.trim?.() && food?.category?.trim?.() && Number(food.step) > 0);
}

export function FoodGrid({ foods, dailyAmounts = {}, onAdd }) {
  const renderableFoods = foods.filter(isRenderableFood);

  return (
    <section className="mt-3 grid gap-2.5" aria-label="Élelmiszerek">
      {renderableFoods.map((food) => {
        const amountToday = dailyAmounts[food.id] || 0;
        return (
          <AppRecipeOption className="flex items-center justify-between gap-3" type="button" key={food.id} onClick={() => onAdd(food)}>
            <span className="min-w-0">
              <AppSectionTitle className="line-clamp-2 text-[0.95rem]">{food.name}</AppSectionTitle>
              {amountToday > 0 && <AppMetaText className="block text-cyan-300">ma: {formatAmount(amountToday, food.unit)}</AppMetaText>}
              <AppMetaText className="block">
                {food.defaultAmount} {food.unit} kezdés · {food.step} {food.unit} lépték
              </AppMetaText>
            </span>
            <Plus className="shrink-0 text-cyan-200" size={20} aria-hidden="true" />
          </AppRecipeOption>
        );
      })}
    </section>
  );
}