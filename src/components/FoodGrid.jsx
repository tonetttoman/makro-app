import { Plus } from "lucide-react";
import { AppMetaText, AppRecipeOption, AppSectionTitle } from "./ui/AppUi";

function isRenderableFood(food) {
  return Boolean(food?.id?.trim?.() && food?.name?.trim?.() && food?.category?.trim?.() && Number(food.step) > 0);
}

function formatMacro(value) {
  const rounded = Math.round(((Number(value) || 0) + Number.EPSILON) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function FoodGrid({ foods, onAdd }) {
  const renderableFoods = foods.filter(isRenderableFood);

  return (
    <section className="mt-3 grid gap-2.5" aria-label="Élelmiszerek">
      {renderableFoods.map((food) => (
        <AppRecipeOption className="flex items-center justify-between gap-3" type="button" key={food.id} onClick={() => onAdd(food)}>
          <span className="min-w-0">
            <AppSectionTitle className="line-clamp-2 text-[0.95rem]">{food.name}</AppSectionTitle>
            <AppMetaText className="block">
              {Math.round(Number(food.kcal) || 0)} k · p {formatMacro(food.protein)} g · f {formatMacro(food.fat)} g · Ch {formatMacro(food.carbs)} g
            </AppMetaText>
          </span>
          <Plus className="shrink-0 text-cyan-200" size={20} aria-hidden="true" />
        </AppRecipeOption>
      ))}
    </section>
  );
}
