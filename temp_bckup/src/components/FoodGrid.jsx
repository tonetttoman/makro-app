import { Plus } from "lucide-react";

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
    <section className="food-grid" aria-label="Élelmiszerek">
      {renderableFoods.map((food) => {
        const amountToday = dailyAmounts[food.id] || 0;
        return (
          <button className="food-button" type="button" key={food.id} onClick={() => onAdd(food)}>
            <span>
              <strong>{food.name}</strong>
              {amountToday > 0 && <em className="today-amount">ma: {formatAmount(amountToday, food.unit)}</em>}
              <small>
                {food.defaultAmount} {food.unit} kezdés · {food.step} {food.unit} lépték
              </small>
            </span>
            <Plus size={20} aria-hidden="true" />
          </button>
        );
      })}
    </section>
  );
}
