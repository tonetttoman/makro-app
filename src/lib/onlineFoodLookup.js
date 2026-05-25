import { FOOD_CATEGORIES } from "../data/foods";

const SEARCH_ENDPOINT = "https://world.openfoodfacts.org/cgi/search.pl";
const DEFAULT_PAGE_SIZE = 20;

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

function buildSearchStrategies(query) {
  const aliases = getOnlineSearchAliases(query);
  const strategies = [];
  const seen = new Set();

  const pushStrategy = (searchQuery, options = {}) => {
    const trimmedQuery = String(searchQuery || "").trim();
    if (!trimmedQuery) return;

    const key = `${options.country || "all"}:${options.language || "all"}:${normalizeOnlineFoodSearchText(trimmedQuery)}`;
    if (seen.has(key)) return;
    seen.add(key);
    strategies.push({
      query: trimmedQuery,
      country: options.country,
      language: options.language,
      aliases
    });
  };

  pushStrategy(query, { country: "hu", language: "hu" });

  const compactAlias = aliases.find((alias) => {
    const normalizedAlias = normalizeOnlineFoodSearchText(alias);
    return normalizedAlias && !normalizedAlias.includes(" ");
  });
  if (compactAlias) {
    pushStrategy(compactAlias, { country: "hu", language: "hu" });
  }

  const tokenAlias = aliases.find((alias) => {
    const normalizedAlias = normalizeOnlineFoodSearchText(alias);
    return normalizedAlias && normalizedAlias.split(/\s+/).length === 1 && normalizedAlias !== normalizeOnlineFoodSearchText(query).replace(/\s+/g, "");
  });
  if (tokenAlias) {
    pushStrategy(tokenAlias, { country: "hu", language: "hu" });
  }

  const phraseAlias = aliases.find((alias) => normalizeOnlineFoodSearchText(alias) === "puffasztott rizs");
  if (phraseAlias) {
    pushStrategy(phraseAlias, { country: "hu", language: "hu" });
  }

  pushStrategy(query, {});

  return strategies.slice(0, 4);
}

function dedupeOnlineResults(results) {
  return Array.from(
    (results || []).reduce((map, result) => {
      const key =
        result.code ||
        `${normalizeOnlineFoodSearchText(result.name)}|${normalizeOnlineFoodSearchText(result.brand)}`;
      if (!map.has(key)) map.set(key, result);
      return map;
    }, new Map()).values()
  );
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
    rizspufi: "rizspufi",
    rizs: "rizs",
    pufi: "pufi"
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
  const aliases = new Set();

  if (original) aliases.add(original);
  if (normalized) aliases.add(normalized);
  if (accented) aliases.add(accented);
  if (compact && compact !== normalized) aliases.add(compact);
  if (words.length > 1) {
    aliases.add(words[words.length - 1]);
  }

  if (normalized === "rizs pufi" || normalized === "rizspufi") {
    aliases.add("pufi");
    aliases.add("puffasztott rizs");
    aliases.add("rizspufi");
  }

  return [...aliases]
    .map((alias) => String(alias || "").trim())
    .filter(Boolean);
}

export async function fetchOpenFoodFactsSearch(query, options = {}) {
  const params = new URLSearchParams({
    search_terms: String(query || "").trim(),
    search_simple: "1",
    action: "process",
    json: "1",
    page_size: String(options.pageSize || DEFAULT_PAGE_SIZE)
  });

  if (options.country) params.set("cc", options.country);
  if (options.language) params.set("lc", options.language);

  const response = await fetch(`${SEARCH_ENDPOINT}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`OpenFoodFacts search failed: ${response.status}`);
  }

  return response.json();
}

export function normalizeOpenFoodFactsProduct(product) {
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
    carbs
  };
}

export function rankOnlineFoodResult(result, normalizedQuery, aliases = []) {
  const normalizedName = normalizeOnlineFoodSearchText(result?.name);
  if (!normalizedQuery || !normalizedName) return Number.POSITIVE_INFINITY;

  const normalizedAliases = aliases
    .map((alias) => normalizeOnlineFoodSearchText(alias))
    .filter(Boolean);

  if (normalizedName === normalizedQuery) return 0;
  if (normalizedAliases.some((alias) => normalizedName === alias)) return 1;
  if (normalizedName.startsWith(normalizedQuery)) return 2;
  if (normalizedAliases.some((alias) => normalizedName.startsWith(alias))) return 3;

  const words = normalizedName.split(/[\s\-_/(),.]+/).filter(Boolean);
  if (
    words.some(
      (word) =>
        word.startsWith(normalizedQuery) ||
        normalizedAliases.some((alias) => word.startsWith(alias))
    )
  ) {
    return 4;
  }
  if (normalizedName.includes(normalizedQuery)) return 5;
  if (normalizedAliases.some((alias) => normalizedName.includes(alias))) return 6;

  return 7;
}

export async function searchOpenFoodFacts(query) {
  const trimmedQuery = String(query || "").trim();
  if (!trimmedQuery) return [];

  const normalizedQuery = normalizeOnlineFoodSearchText(trimmedQuery);
  const strategies = buildSearchStrategies(trimmedQuery);
  const collectedResults = [];

  for (const strategy of strategies) {
    const data = await fetchOpenFoodFactsSearch(strategy.query, {
      country: strategy.country,
      language: strategy.language
    });

    const normalizedResults = (Array.isArray(data?.products) ? data.products : [])
      .map(normalizeOpenFoodFactsProduct)
      .filter(Boolean);

    if (normalizedResults.length) {
      collectedResults.push(...normalizedResults);
      break;
    }
  }

  const dedupedResults = dedupeOnlineResults(collectedResults);
  if (!dedupedResults.length) return [];

  const aliases = getOnlineSearchAliases(trimmedQuery);
  return dedupedResults.sort((a, b) => {
    const rankDiff =
      rankOnlineFoodResult(a, normalizedQuery, aliases) -
      rankOnlineFoodResult(b, normalizedQuery, aliases);
    if (rankDiff !== 0) return rankDiff;

    return a.name.localeCompare(b.name, "hu", { sensitivity: "base" });
  });
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
