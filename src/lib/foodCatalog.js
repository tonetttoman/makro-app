import { FOODS_KEY, readJson, writeJson } from "./storage";

function isFoodRecord(food) {
  return Boolean(food && typeof food === "object" && typeof food.id === "string" && food.id.trim());
}

export function mergeFoodCatalog(baseFoods = [], storedFoods = []) {
  const baseById = new Map();
  const mergedFoods = [];
  const usedIds = new Set();
  const storedById = new Map();

  baseFoods.filter(isFoodRecord).forEach((food) => {
    baseById.set(food.id, food);
  });

  storedFoods.filter(isFoodRecord).forEach((food) => {
    if (usedIds.has(food.id)) return;
    usedIds.add(food.id);
    storedById.set(food.id, food);
  });

  baseFoods.filter(isFoodRecord).forEach((food) => {
    mergedFoods.push(storedById.get(food.id) || food);
    usedIds.add(food.id);
  });

  storedFoods.filter(isFoodRecord).forEach((food) => {
    if (baseById.has(food.id)) return;
    mergedFoods.push(food);
  });

  return mergedFoods;
}

export function extractCustomFoods(baseFoods = [], foods = []) {
  const baseById = new Map(baseFoods.filter(isFoodRecord).map((food) => [food.id, food]));

  return foods.filter(isFoodRecord).filter((food) => {
    const baseFood = baseById.get(food.id);
    return !baseFood || JSON.stringify(baseFood) !== JSON.stringify(food);
  });
}

export function readMergedFoodCatalog(baseFoods = []) {
  const storedFoods = readJson(FOODS_KEY, []);
  return mergeFoodCatalog(baseFoods, Array.isArray(storedFoods) ? storedFoods : []);
}

export function writeFoodCatalog(foods, baseFoods = []) {
  writeJson(FOODS_KEY, extractCustomFoods(baseFoods, Array.isArray(foods) ? foods : []));
}
