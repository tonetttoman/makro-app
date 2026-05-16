function hasValidFoodId(food) {
  return typeof food?.id === "string" && food.id.trim().length > 0;
}

function normalizeFood(food) {
  if (!hasValidFoodId(food)) return null;
  return {
    ...food,
    id: food.id.trim()
  };
}

function uniqueById(items) {
  const byId = new Map();
  items.map(normalizeFood).filter(Boolean).forEach((food) => {
    if (!byId.has(food.id)) byId.set(food.id, food);
  });
  return Array.from(byId.values());
}

export function mergeFoodCatalog(baseFoods = [], storedFoods = []) {
  const baseCatalog = uniqueById(Array.isArray(baseFoods) ? baseFoods : []);
  const baseIds = new Set(baseCatalog.map((food) => food.id));
  const storedCatalog = uniqueById(Array.isArray(storedFoods) ? storedFoods : []);
  const userFoods = storedCatalog.filter((food) => !baseIds.has(food.id));

  return [...baseCatalog, ...userFoods];
}
