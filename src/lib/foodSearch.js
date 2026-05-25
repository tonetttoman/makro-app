export function normalizeSearch(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function sortFoodsByName(items) {
  return [...(items || [])].sort((a, b) =>
    String(a?.name || "").localeCompare(String(b?.name || ""), "hu", { sensitivity: "base" })
  );
}

export function getFoodSearchRank(foodName, query) {
  const normalizedName = normalizeSearch(foodName);
  const normalizedQuery = normalizeSearch(query);

  if (!normalizedQuery || !normalizedName) return Number.POSITIVE_INFINITY;
  if (normalizedName === normalizedQuery) return 0;
  if (normalizedName.startsWith(normalizedQuery)) return 1;

  const words = normalizedName.split(/[\s\-_/(),.]+/).filter(Boolean);
  if (words.some((word) => word.startsWith(normalizedQuery))) return 2;
  if (normalizedName.includes(normalizedQuery)) return 3;

  return Number.POSITIVE_INFINITY;
}

export function isRenderableFood(food) {
  return Boolean(
    food &&
      typeof food.id === "string" &&
      food.id.trim() &&
      typeof food.name === "string" &&
      food.name.trim() &&
      typeof food.category === "string" &&
      food.category.trim() &&
      Number(food.step) > 0
  );
}
