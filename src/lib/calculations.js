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

function isRecipeFood(food) {
  return Boolean(food?.isRecipe) || Array.isArray(food?.recipe?.ingredients);
}

function createZeroTotals() {
  return { kcal: 0, protein: 0, fat: 0, carbs: 0 };
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

function calculateRecipeEntry(food, amount, foods, visited) {
  const ingredients = Array.isArray(food?.recipe?.ingredients) ? food.recipe.ingredients : [];
  if (!ingredients.length) return calculatePlainEntry(food, amount);

  const foodId = food?.id;
  if (foodId && visited.has(foodId)) return createZeroTotals();

  const nextVisited = new Set(visited);
  if (foodId) nextVisited.add(foodId);

  const recipeTotals = ingredients.reduce(
    (totals, ingredient) => {
      const ingredientFood = findFoodById(ingredient.foodId, foods);
      if (!ingredientFood) return totals;
      const values = calculateEntry(ingredientFood, ingredient.amount, { foods, visited: nextVisited });
      return {
        kcal: totals.kcal + values.kcal,
        protein: totals.protein + values.protein,
        fat: totals.fat + values.fat,
        carbs: totals.carbs + values.carbs
      };
    },
    createZeroTotals()
  );

  const factor = (Number(amount) || 0) / getNormalizedBaseAmount(food);
  return {
    kcal: recipeTotals.kcal * factor,
    protein: recipeTotals.protein * factor,
    fat: recipeTotals.fat * factor,
    carbs: recipeTotals.carbs * factor
  };
}

function getRecipeOverrideAmount(entry, ingredient, ingredientIndex) {
  const overrides = Array.isArray(entry?.recipeOverrides) ? entry.recipeOverrides.filter((override) => override?.type !== "added") : [];
  const byIndex = overrides.find((override) => Number(override?.ingredientIndex) === ingredientIndex);
  const byFoodId = overrides.find((override) => override?.ingredientIndex === undefined && override?.foodId === ingredient?.foodId);
  const rawAmount = byIndex?.amount ?? byFoodId?.amount ?? ingredient?.amount;
  const amount = Number(rawAmount);
  return Number.isFinite(amount) ? Math.max(0, amount) : 0;
}

function getRecipeAddedIngredients(entry) {
  return Array.isArray(entry?.recipeOverrides) ? entry.recipeOverrides.filter((override) => override?.type === "added") : [];
}

export function hasRecipeEntryOverrides(entry, food) {
  const overrides = Array.isArray(entry?.recipeOverrides) ? entry.recipeOverrides : [];
  if (!overrides.length) return false;

  const ingredients = Array.isArray(food?.recipe?.ingredients) ? food.recipe.ingredients : [];

  return overrides.some((override) => {
    if (override?.type === "added") {
      const amount = Number(override.amount);
      return Boolean(override.foodId) && Number.isFinite(amount) && amount > 0;
    }

    const amount = Number(override?.amount);
    if (!Number.isFinite(amount)) return false;

    const ingredientIndex = Number(override?.ingredientIndex);
    const ingredient = Number.isInteger(ingredientIndex)
      ? ingredients[ingredientIndex]
      : ingredients.find((item) => item?.foodId === override?.foodId);

    if (!ingredient) return true;

    return Math.abs(amount - (Number(ingredient.amount) || 0)) > 0.0001;
  });
}

function calculateRecipeOverrideEntry(food, amount, entry, foods, visited) {
  const ingredients = Array.isArray(food?.recipe?.ingredients) ? food.recipe.ingredients : [];
  if (!ingredients.length) return calculatePlainEntry(food, amount);

  const foodId = food?.id;
  if (foodId && visited.has(foodId)) return createZeroTotals();

  const nextVisited = new Set(visited);
  if (foodId) nextVisited.add(foodId);

  const recipeTotals = ingredients.reduce(
    (totals, ingredient, ingredientIndex) => {
      const ingredientFood = findFoodById(ingredient.foodId, foods);
      if (!ingredientFood) return totals;
      const ingredientAmount = getRecipeOverrideAmount(entry, ingredient, ingredientIndex);
      const values = calculateEntry(ingredientFood, ingredientAmount, { foods, visited: nextVisited });
      return {
        kcal: totals.kcal + values.kcal,
        protein: totals.protein + values.protein,
        fat: totals.fat + values.fat,
        carbs: totals.carbs + values.carbs
      };
    },
    { kcal: 0, protein: 0, fat: 0, carbs: 0 }
  );

  const baseTotals = getRecipeAddedIngredients(entry).reduce((totals, addedIngredient) => {
    const addedFood = findFoodById(addedIngredient.foodId, foods);
    if (!addedFood) return totals;
    const values = calculateEntry(addedFood, addedIngredient.amount, { foods, visited: nextVisited });
    return {
      kcal: totals.kcal + values.kcal,
      protein: totals.protein + values.protein,
      fat: totals.fat + values.fat,
      carbs: totals.carbs + values.carbs
    };
  }, recipeTotals);

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
  const foods = options.foods || FOODS;
  const visited = options.visited || new Set();
  const hasRecipeOverrides = Array.isArray(entry?.recipeOverrides) && entry.recipeOverrides.length > 0;

  if (hasRecipeOverrides) {
    return calculateRecipeOverrideEntry(food, amount, entry, foods, visited);
  }

  if (isRecipeFood(food)) {
    return calculateRecipeEntry(food, amount, foods, visited);
  }

  return calculatePlainEntry(food, amount);
}

export function calculateDiaryEntry(entry, foods = FOODS) {
  const food = findFoodById(entry?.foodId, foods);
  if (!food) return null;

  return {
    food,
    values: calculateEntry(food, entry.amount, { entry, foods })
  };
}

export function calculateTotals(entries, foods = FOODS) {
  return entries.reduce(
    (totals, entry) => {
      const calculated = calculateDiaryEntry(entry, foods);
      if (!calculated) return totals;
      const { values } = calculated;
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
