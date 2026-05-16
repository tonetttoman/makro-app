import { FOODS_KEY, readJson, writeJson } from "./storage";

function isFoodRecord(food) {
  return Boolean(food && typeof food === "object" && typeof food.id === "string" && food.id.trim());
}

export function mergeFoodCatalog(baseFoods = [], storedFoods = []) {
  const baseById = new Map();
  const extraFoods = [];
  const extraIds = new Set();

  baseFoods.filter(isFoodRecord).forEach((food) => {
    baseById.set(food.id, food);
  });

  storedFoods.filter(isFoodRecord).forEach((food) => {
    if (baseById.has(food.id) || extraIds.has(food.id)) return;
    extraIds.add(food.id);
    extraFoods.push(food);
  });

  return [...baseFoods.filter(isFoodRecord), ...extraFoods];
}

export function readMergedFoodCatalog(baseFoods = []) {
  const storedFoods = readJson(FOODS_KEY, []);
  return mergeFoodCatalog(baseFoods, Array.isArray(storedFoods) ? storedFoods : []);
}

export function writeFoodCatalog(foods) {
  writeJson(FOODS_KEY, Array.isArray(foods) ? foods : []);
}
