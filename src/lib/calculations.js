import { FOODS } from "../data/foods";

export const DEFAULT_TARGETS = {
  kcal: 2200,
  protein: 160,
  fat: 70,
  carbs: 220
};

export function getFoodById(foodId) {
  return FOODS.find((food) => food.id === foodId);
}


export function findFoodById(foodId, foods = FOODS) {
  return foods.find((food) => food.id === foodId);
}


export function getNormalizedBaseAmount(food) {
  const unit = String(food?.unit || "").trim().toLowerCase();

  if (unit === "g" || unit === "ml" || unit === "%") return 100;

  if (["db", "adag", "kapszula", "tabletta", "csepp"].includes(unit)) {
    return 1;
  }

  const fallback = Number(food?.baseAmount);
  return Number.isFinite(fallback) && fallback > 0 ? fallback : 100;
}

function calculatePlainEntry(food, amount) {
  const baseAmount = getNormalizedBaseAmount(food);
  const amountValue = Number(amount) || 0;
  const factor = amountValue / baseAmount;
  return {
    kcal: Number(food?.kcal || 0) * factor,
    protein: Number(food?.protein || 0) * factor,
    fat: Number(food?.fat || 0) * factor,
    carbs: Number(food?.carbs || 0) * factor
  };
}

function getRecipeOverrideAmount(entry, ingredient, ingredientIndex) {
  const overrides = Array.isArray(entry?.recipeOverrides) ? entry.recipeOverrides : [];
  const byIndex = overrides.find((override) => Number(override?.ingredientIndex) === ingredientIndex);
  const byFoodId = overrides.find((override) => override?.ingredientIndex === undefined && override?.foodId === ingredient?.foodId);
  const rawAmount = byIndex?.amount ?? byFoodId?.amount ?? ingredient?.amount;
  const amount = Number(rawAmount);
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function calculateRecipeOverrideEntry(food, amount, entry, foods) {
  const ingredients = Array.isArray(food?.recipe?.ingredients) ? food.recipe.ingredients : [];
  if (!ingredients.length) return calculatePlainEntry(food, amount);

  const baseTotals = ingredients.reduce(
    (totals, ingredient, ingredientIndex) => {
      const ingredientFood = findFoodById(ingredient.foodId, foods);
      if (!ingredientFood) return totals;
      const ingredientAmount = getRecipeOverrideAmount(entry, ingredient, ingredientIndex);
      const values = calculatePlainEntry(ingredientFood, ingredientAmount);
      return {
        kcal: totals.kcal + values.kcal,
        protein: totals.protein + values.protein,
        fat: totals.fat + values.fat,
        carbs: totals.carbs + values.carbs
      };
    },
    { kcal: 0, protein: 0, fat: 0, carbs: 0 }
  );

  const factor = (Number(amount) || 0) / getNormalizedBaseAmount(food);
  return {
    kcal: baseTotals.kcal * factor,
    protein: baseTotals.protein * factor,
    fat: baseTotals.fat * factor,
    carbs: baseTotals.carbs * factor
  };
}

export function calculateEntry(food, amount, options = {}) {
  const entry = options.entry;
  const hasRecipeOverrides = Array.isArray(entry?.recipeOverrides) && entry.recipeOverrides.length > 0;

  if (hasRecipeOverrides) {
    return calculateRecipeOverrideEntry(food, amount, entry, options.foods || FOODS);
  }

  return calculatePlainEntry(food, amount);
}

export function calculateTotals(entries, foods = FOODS) {
  return entries.reduce(
    (totals, entry) => {
      const food = findFoodById(entry.foodId, foods);
      if (!food) return totals;
      const values = calculateEntry(food, entry.amount, { entry, foods });
      return {
        kcal: totals.kcal + values.kcal,
        protein: totals.protein + values.protein,
        fat: totals.fat + values.fat,
        carbs: totals.carbs + values.carbs
      };
    },
    { kcal: 0, protein: 0, fat: 0, carbs: 0 }
  );
}

export function calculateMacroRatio(totals) {
  const proteinCalories = totals.protein * 4;
  const fatCalories = totals.fat * 9;
  const carbCalories = totals.carbs * 4;
  const total = proteinCalories + fatCalories + carbCalories;

  if (!total) return { protein: 0, fat: 0, carbs: 0 };

  return {
    protein: (proteinCalories / total) * 100,
    fat: (fatCalories / total) * 100,
    carbs: (carbCalories / total) * 100
  };
}




export function averageTotals(dayTotals) {
  if (!dayTotals.length) return { kcal: 0, protein: 0, fat: 0, carbs: 0 };
  const summed = dayTotals.reduce(
    (acc, item) => ({
      kcal: acc.kcal + item.kcal,
      protein: acc.protein + item.protein,
      fat: acc.fat + item.fat,
      carbs: acc.carbs + item.carbs
    }),
    { kcal: 0, protein: 0, fat: 0, carbs: 0 }
  );
  return {
    kcal: summed.kcal / dayTotals.length,
    protein: summed.protein / dayTotals.length,
    fat: summed.fat / dayTotals.length,
    carbs: summed.carbs / dayTotals.length
  };
}

export function movingAverage(values, windowSize = 3) {
  return values.map((_, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const slice = values.slice(start, index + 1);
    return slice.reduce((sum, value) => sum + value, 0) / slice.length;
  });
}
