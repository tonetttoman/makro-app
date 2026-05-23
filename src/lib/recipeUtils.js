const RECIPE_CATEGORY = "Főtt ételek";

export function isRecipeFood(food, normalizeFoodCategory) {
  if (food?.isRecipe) return true;
  if (typeof normalizeFoodCategory === "function") {
    return normalizeFoodCategory(food?.category, { isRecipe: food?.isRecipe }) === RECIPE_CATEGORY;
  }
  return String(food?.category || "").trim() === RECIPE_CATEGORY;
}

export function recipeContainsRecipe(foodId, targetRecipeId, foods, visited = new Set()) {
  if (!foodId || !targetRecipeId) return false;
  if (foodId === targetRecipeId) return true;
  if (visited.has(foodId)) return false;

  visited.add(foodId);

  const food = foods.find((item) => item.id === foodId);
  if (!food?.isRecipe || !Array.isArray(food.recipe?.ingredients)) {
    return false;
  }

  return food.recipe.ingredients.some((ingredient) => recipeContainsRecipe(ingredient.foodId, targetRecipeId, foods, new Set(visited)));
}

export function normalizeIngredientDrafts(ingredients) {
  return (ingredients || []).map((ingredient) => ({
    foodId: ingredient.foodId,
    amount: ingredient.amount === 0 || ingredient.amount === "0" ? "" : String(ingredient.amount ?? "")
  }));
}

export function normalizeRecipeNameForCompare(value) {
  return String(value || "").trim().toLocaleLowerCase("hu-HU");
}

export function normalizeRecipeIngredientsForCompare(ingredients = []) {
  return (Array.isArray(ingredients) ? ingredients : [])
    .map((ingredient) => ({
      foodId: String(ingredient?.foodId || ""),
      amount: Number(ingredient?.amount) || 0
    }))
    .filter((ingredient) => ingredient.foodId && ingredient.amount > 0)
    .sort((a, b) => a.foodId.localeCompare(b.foodId, "hu", { sensitivity: "base" }) || a.amount - b.amount);
}

export function areRecipeIngredientsEqual(a = [], b = []) {
  const normalizedA = normalizeRecipeIngredientsForCompare(a);
  const normalizedB = normalizeRecipeIngredientsForCompare(b);

  if (normalizedA.length !== normalizedB.length) return false;

  return normalizedA.every((item, index) => item.foodId === normalizedB[index].foodId && Math.abs(item.amount - normalizedB[index].amount) < 0.0001);
}

export function getRecipeModeFromFood(food) {
  if (food?.recipe?.mode === "weight") return "weight";
  if (food?.unit === "g" && Number(food?.recipe?.netWeight) > 0) return "weight";
  return "percent";
}
