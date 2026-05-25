import { FOOD_CATEGORIES } from "../data/foods";

const SEARCH_ENDPOINT = "https://world.openfoodfacts.org/cgi/search.pl";
const DEFAULT_PAGE_SIZE = 20;
const FETCH_RETRY_COUNT = 1;

function toFiniteNumber(value) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function getGuessedCategory(name) {
  const normalized = normalizeOnlineFoodSearchText(name);

  if (/(rizs|puffasztott|zab|kenyer|teszta|liszt)/.test(normalized)) {
    return FOOD_CATEGORIES[2] || "Gabona";
  }
  if (/(tej|joghurt|turo|tejfol|sajt)/.test(normalized)) {
    return FOOD_CATEGORIES[5] || "Tejtermék";
  }
  if (/(csirke|sertes|marha|sonka|hus)/.test(normalized)) {
    return FOOD_CATEGORIES[4] || "Hús";
  }
  if (/(tojas)/.test(normalized)) {
    return FOOD_CATEGORIES[6] || "Tojás";
  }
  if (/(alma|banan|afonya|gyumolcs)/.test(normalized)) {
    return FOOD_CATEGORIES[3] || "Gyümölcs";
  }
  if (/(paprika|uborka|paradicsom|zoldseg)/.test(normalized)) {
    return FOOD_CATEGORIES[7] || "Zöldség";
  }

  return FOOD_CATEGORIES[0] || "Alapanyag";
}

function dedupeSearchStrategies(strategies) {
  const seen = new Set();

  return strategies.filter((strategy) => {
    const normalizedQuery = normalizeOnlineFoodSearchText(strategy?.query);
    if (!normalizedQuery) return false;

    const key = `${strategy.country || "all"}:${strategy.language || "all"}:${normalizedQuery}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeOnlineResults(results) {
  const map = new Map();

  (results || []).forEach((result) => {
    const key =
      result.code ||
      `${normalizeOnlineFoodSearchText(result.name)}|${normalizeOnlineFoodSearchText(result.brand)}`;

    if (!map.has(key)) {
      map.set(key, result);
      return;
    }

    const existing = map.get(key);
    if ((result.aliasPriority ?? Number.POSITIVE_INFINITY) < (existing.aliasPriority ?? Number.POSITIVE_INFINITY)) {
      map.set(key, result);
    }
  });

  return Array.from(map.values());
}

async function fetchWithRetry(url, retries = FETCH_RETRY_COUNT) {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`OpenFoodFacts search failed: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
    }
  }

  throw lastError;
}

export function normalizeOnlineFoodSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function generateAccentSearchText(value) {
  const dictionary = {
    tojas: "tojás",
    turo: "túró",
    turot: "túrót",
    afonya: "áfonya",
    kremes: "krémes",
    zsirszegeny: "zsírszegény",
    teszta: "tészta",
    kenyer: "kenyér",
    tejfol: "tejföl",
    joghurt: "joghurt",
    labszar: "lábszár",
    marhalabszar: "marha lábszár",
    marhacomb: "marha comb"
  };

  return String(value || "")
    .toLowerCase()
    .split(/\s+/)
    .map((word) => dictionary[word] || word)
    .join(" ")
    .trim();
}

export function getOnlineSearchAliases(query) {
  const original = String(query || "").trim();
  const normalized = normalizeOnlineFoodSearchText(original);
  const accented = generateAccentSearchText(original);
  const compact = normalized.replace(/\s+/g, "");
  const words = normalized.split(/\s+/).filter(Boolean);
  const aliases = [];
  const seen = new Set();

  const pushAlias = (value) => {
    const trimmed = String(value || "").trim();
    const key = normalizeOnlineFoodSearchText(trimmed);
    if (!trimmed || !key || seen.has(key)) return;
    seen.add(key);
    aliases.push(trimmed);
  };

  pushAlias(original);
  pushAlias(accented);
  if (compact && compact !== normalized) pushAlias(compact);

  if (normalized === "rizs pufi" || normalized === "rizspufi") {
    pushAlias("rizspufi");
    pushAlias("pufi");
    pushAlias("puffasztott rizs");
  }

  if (normalized === "marha labszar" || normalized === "marha lábszár" || normalized === "marhalabszar" || normalized === "marhalábszár") {
    pushAlias("marha lábszár");
    pushAlias("marha labszar");
    pushAlias("marhalábszár");
    pushAlias("marhalabszar");
    pushAlias("lábszár");
    pushAlias("labszar");
    pushAlias("marha");
  }

  if (normalized === "marha comb" || normalized === "marhacomb") {
    pushAlias("marha comb");
    pushAlias("marhacomb");
    pushAlias("comb");
  }

  if (words.length > 1) {
    pushAlias(words[words.length - 1]);
  }

  if (words.length > 1) {
    pushAlias(words[0]);
  }

  return aliases.slice(0, 7);
}

export async function fetchOpenFoodFactsSearch(query, options = {}) {
  const params = new URLSearchParams({
    search_terms: String(query || "").trim(),
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: String(options.pageSize || DEFAULT_PAGE_SIZE),
    cc: options.country || "hu",
    lc: options.language || "hu"
  });

  return fetchWithRetry(`${SEARCH_ENDPOINT}?${params.toString()}`);
}

export function normalizeOpenFoodFactsProduct(product, options = {}) {
  const nutriments = product?.nutriments || {};
  const name = String(
    product?.product_name_hu ||
      product?.product_name ||
      product?.generic_name_hu ||
      product?.generic_name ||
      ""
  ).trim();
  const brand = String(product?.brands || "")
    .split(",")[0]
    .trim();
  const kcal = toFiniteNumber(
    nutriments["energy-kcal_100g"] ??
      nutriments["energy-kcal"] ??
      nutriments.energy_kcal_100g
  );
  const protein = toFiniteNumber(nutriments.proteins_100g);
  const fat = toFiniteNumber(nutriments.fat_100g);
  const carbs = toFiniteNumber(nutriments.carbohydrates_100g);

  if (!name) return null;
  if (!Number.isFinite(kcal)) return null;
  if (!Number.isFinite(protein)) return null;
  if (!Number.isFinite(fat)) return null;
  if (!Number.isFinite(carbs)) return null;

  return {
    code: String(product?.code || "").trim(),
    name,
    brand,
    kcal,
    protein,
    fat,
    carbs,
    matchedAlias: options.matchedAlias || "",
    aliasPriority: Number.isFinite(options.aliasPriority) ? options.aliasPriority : Number.POSITIVE_INFINITY
  };
}

export function rankOnlineFoodResult(result, normalizedQuery, aliases = []) {
  const normalizedName = normalizeOnlineFoodSearchText(result?.name);
  if (!normalizedQuery || !normalizedName) return Number.POSITIVE_INFINITY;

  const normalizedAliases = aliases
    .map((alias) => normalizeOnlineFoodSearchText(alias))
    .filter(Boolean);

  let score = 7;

  if (normalizedName === normalizedQuery) score = 0;
  else if (normalizedAliases.some((alias) => normalizedName === alias)) score = 1;
  else if (normalizedName.startsWith(normalizedQuery)) score = 2;
  else if (normalizedAliases.some((alias) => normalizedName.startsWith(alias))) score = 3;
  else {
    const words = normalizedName.split(/[\s\-_/(),.]+/).filter(Boolean);
    if (
      words.some(
        (word) =>
          word.startsWith(normalizedQuery) ||
          normalizedAliases.some((alias) => word.startsWith(alias))
      )
    ) {
      score = 4;
    } else if (normalizedName.includes(normalizedQuery)) {
      score = 5;
    } else if (normalizedAliases.some((alias) => normalizedName.includes(alias))) {
      score = 6;
    }
  }

  return {
    score,
    aliasPriority: Number.isFinite(result?.aliasPriority) ? result.aliasPriority : Number.POSITIVE_INFINITY
  };
}

export async function searchOpenFoodFacts(query) {
  const trimmedQuery = String(query || "").trim();
  if (!trimmedQuery) return [];

  const normalizedQuery = normalizeOnlineFoodSearchText(trimmedQuery);
  const aliases = getOnlineSearchAliases(trimmedQuery);
  const strategies = dedupeSearchStrategies(
    aliases.map((alias, index) => ({
      query: alias,
      country: "hu",
      language: "hu",
      aliasPriority: index
    }))
  );

  const allResults = [];
  const errors = [];
  let hadSuccessfulResponse = false;

  for (const strategy of strategies) {
    try {
      const json = await fetchOpenFoodFactsSearch(strategy.query, {
        country: strategy.country,
        language: strategy.language
      });
      hadSuccessfulResponse = true;

      const products = Array.isArray(json?.products) ? json.products : [];
      const normalizedResults = products
        .map((product) =>
          normalizeOpenFoodFactsProduct(product, {
            matchedAlias: strategy.query,
            aliasPriority: strategy.aliasPriority
          })
        )
        .filter(Boolean);

      allResults.push(...normalizedResults);
    } catch (error) {
      errors.push({ alias: strategy.query, error });
      console.warn(`OpenFoodFacts keresés sikertelen erre az aliasra: ${strategy.query}`, error);
    }
  }

  const dedupedResults = dedupeOnlineResults(allResults);
  if (dedupedResults.length) {
    return dedupedResults.sort((a, b) => {
      const aRank = rankOnlineFoodResult(a, normalizedQuery, aliases);
      const bRank = rankOnlineFoodResult(b, normalizedQuery, aliases);
      if (aRank.score !== bRank.score) return aRank.score - bRank.score;
      if (aRank.aliasPriority !== bRank.aliasPriority) return aRank.aliasPriority - bRank.aliasPriority;
      return a.name.localeCompare(b.name, "hu", { sensitivity: "base" });
    });
  }

  if (!hadSuccessfulResponse && errors.length) {
    throw errors[0].error;
  }

  return [];
}

export function createFoodFromOnlineResult(result, existingFoods = []) {
  const normalizedName = normalizeOnlineFoodSearchText(result?.name);
  const matchedFood = (existingFoods || []).find(
    (food) => normalizeOnlineFoodSearchText(food?.name) === normalizedName
  );

  const nextFood = {
    ...(matchedFood || {}),
    id: matchedFood?.id || `food-${slugify(result?.name)}-${Date.now()}`,
    name: String(result?.name || "").trim(),
    category: getGuessedCategory(result?.name),
    unit: "g",
    baseAmount: 100,
    defaultAmount: 100,
    step: 10,
    kcal: Number(result?.kcal) || 0,
    protein: Number(result?.protein) || 0,
    fat: Number(result?.fat) || 0,
    carbs: Number(result?.carbs) || 0
  };

  return {
    food: nextFood,
    wasUpdate: Boolean(matchedFood)
  };
}
