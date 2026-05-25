import { FOOD_CATEGORIES } from "../data/foods";

const OPEN_FOOD_FACTS_ENDPOINT = "https://world.openfoodfacts.org/cgi/search.pl";
const USDA_ENDPOINT = "https://api.nal.usda.gov/fdc/v1/foods/search";
const USDA_API_KEY = "DEMO_KEY";
const DEFAULT_PAGE_SIZE = 20;
const FETCH_RETRY_COUNT = 1;
const MAX_COMBINED_RESULTS = 20;

const USDA_QUERY_DICTIONARY = {
  "marha labszar": "beef shank",
  marhalabszar: "beef shank",
  "marha comb": "beef round",
  marhacomb: "beef round",
  csirkemell: "chicken breast",
  "csirke mell": "chicken breast",
  csirkecomb: "chicken leg",
  "csirke comb": "chicken leg",
  serteslapocka: "pork shoulder",
  "sertes lapocka": "pork shoulder",
  serteskaraj: "pork loin",
  "sertes karaj": "pork loin",
  sertescomb: "pork leg",
  "daralt marha": "ground beef",
  "marha daralt hus": "ground beef",
  tojas: "egg",
  rizs: "rice",
  zab: "oats",
  burgonya: "potato",
  krumpli: "potato",
  karfiol: "cauliflower",
  brokkoli: "broccoli",
  repa: "carrot",
  gomba: "mushroom",
  uborka: "cucumber",
  paprika: "pepper",
  paradicsom: "tomato",
  turo: "cottage cheese",
  tejfol: "sour cream",
  joghurt: "yogurt"
};

const USDA_LOCALIZATION_RULES = {
  "beef shank": {
    baseName: "Marha l\u00e1bsz\u00e1r",
    expectedTerms: ["beef", "shank"],
    forbiddenTerms: ["lamb", "sheep", "mutton", "pork", "chicken", "turkey", "veal"],
    preparedTerms: ["babyfood", "soup", "prepared", "fast food", "restaurant", "sandwich", "burger", "sausage", "pate", "spread"],
    dedupeKey: "marha labszar"
  },
  "beef round": {
    baseName: "Marha comb",
    expectedTerms: ["beef", "round"],
    forbiddenTerms: ["lamb", "sheep", "mutton", "pork", "chicken", "turkey", "veal"],
    preparedTerms: ["babyfood", "soup", "prepared", "fast food", "restaurant", "sandwich", "burger", "sausage", "pate", "spread"],
    dedupeKey: "marha comb"
  },
  "ground beef": {
    baseName: "Dar\u00e1lt marha",
    expectedTerms: ["beef"],
    preferredTerms: ["ground"],
    forbiddenTerms: ["lamb", "sheep", "mutton", "pork", "chicken", "turkey"],
    preparedTerms: ["babyfood", "soup", "prepared", "fast food", "restaurant", "sandwich", "burger", "sausage", "pate", "spread"],
    dedupeKey: "daralt marha"
  },
  "chicken breast": {
    baseName: "Csirkemell",
    expectedTerms: ["chicken", "breast"],
    forbiddenTerms: ["beef", "pork", "lamb", "sheep", "turkey", "veal"],
    preparedTerms: ["babyfood", "soup", "prepared", "fast food", "restaurant", "sandwich", "burger", "sausage", "pate", "spread"],
    dedupeKey: "csirkemell"
  },
  "chicken leg": {
    baseName: "Csirkecomb",
    expectedTerms: ["chicken"],
    preferredTerms: ["leg", "thigh", "drumstick"],
    forbiddenTerms: ["beef", "pork", "lamb", "sheep", "turkey", "veal"],
    preparedTerms: ["babyfood", "soup", "prepared", "fast food", "restaurant", "sandwich", "burger", "sausage", "pate", "spread"],
    dedupeKey: "csirkecomb"
  },
  "pork shoulder": {
    baseName: "Sert\u00e9slapocka",
    expectedTerms: ["pork", "shoulder"],
    forbiddenTerms: ["beef", "chicken", "lamb", "sheep", "turkey", "veal"],
    preparedTerms: ["babyfood", "soup", "prepared", "fast food", "restaurant", "sandwich", "burger", "sausage", "pate", "spread"],
    dedupeKey: "serteslapocka"
  },
  "pork loin": {
    baseName: "Sert\u00e9skaraj",
    expectedTerms: ["pork", "loin"],
    forbiddenTerms: ["beef", "chicken", "lamb", "sheep", "turkey", "veal"],
    preparedTerms: ["babyfood", "soup", "prepared", "fast food", "restaurant", "sandwich", "burger", "sausage", "pate", "spread"],
    dedupeKey: "serteskaraj"
  },
  "pork leg": {
    baseName: "Sert\u00e9scomb",
    expectedTerms: ["pork"],
    preferredTerms: ["leg", "ham"],
    forbiddenTerms: ["beef", "chicken", "lamb", "sheep", "turkey", "veal"],
    preparedTerms: ["babyfood", "soup", "prepared", "fast food", "restaurant", "sandwich", "burger", "sausage", "pate", "spread"],
    dedupeKey: "sertescomb"
  },
  egg: {
    baseName: "Toj\u00e1s",
    expectedTerms: ["egg"],
    forbiddenTerms: ["beef", "pork", "chicken", "lamb", "sheep", "turkey"],
    preparedTerms: ["babyfood", "soup", "prepared", "fast food", "restaurant"],
    dedupeKey: "tojas"
  },
  rice: {
    baseName: "Rizs",
    expectedTerms: ["rice"],
    forbiddenTerms: ["beef", "pork", "chicken", "lamb", "sheep", "turkey"],
    dedupeKey: "rizs"
  },
  oats: {
    baseName: "Zab",
    expectedTerms: ["oat"],
    forbiddenTerms: ["beef", "pork", "chicken", "lamb", "sheep", "turkey"],
    dedupeKey: "zab"
  },
  cauliflower: {
    baseName: "Karfiol",
    expectedTerms: ["cauliflower"],
    dedupeKey: "karfiol"
  },
  broccoli: {
    baseName: "Brokkoli",
    expectedTerms: ["broccoli"],
    dedupeKey: "brokkoli"
  },
  carrot: {
    baseName: "R\u00e9pa",
    expectedTerms: ["carrot"],
    dedupeKey: "repa"
  },
  cucumber: {
    baseName: "Uborka",
    expectedTerms: ["cucumber"],
    dedupeKey: "uborka"
  },
  pepper: {
    baseName: "Paprika",
    expectedTerms: ["pepper"],
    dedupeKey: "paprika"
  },
  tomato: {
    baseName: "Paradicsom",
    expectedTerms: ["tomato"],
    dedupeKey: "paradicsom"
  },
  mushroom: {
    baseName: "Gomba",
    expectedTerms: ["mushroom"],
    dedupeKey: "gomba"
  },
  potato: {
    baseName: "Burgonya",
    expectedTerms: ["potato"],
    preferredTerms: ["raw", "cooked", "boiled", "baked"],
    dedupeKey: "burgonya"
  },
  "cottage cheese": {
    baseName: "T\u00far\u00f3",
    expectedTerms: ["cottage", "cheese"],
    dedupeKey: "turo"
  },
  "sour cream": {
    baseName: "Tejf\u00f6l",
    expectedTerms: ["sour", "cream"],
    dedupeKey: "tejfol"
  },
  yogurt: {
    baseName: "Joghurt",
    expectedTerms: ["yogurt"],
    dedupeKey: "joghurt"
  }
};

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

async function fetchJsonWithRetry(url, retries = FETCH_RETRY_COUNT, errorLabel = "Request failed") {
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`${errorLabel}: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt >= retries) break;
    }
  }

  throw lastError;
}

function getNutrientValueByName(nutrients, matcher) {
  const nutrient = (nutrients || []).find((item) =>
    matcher(String(item?.nutrientName || ""), String(item?.unitName || ""))
  );
  return nutrient ? toFiniteNumber(nutrient.value) : null;
}

function hasAnyTerm(text, terms = []) {
  return terms.some((term) => text.includes(term));
}

function getPreparationLabel(description) {
  if (/\b(raw|uncooked|dry)\b/.test(description)) {
    return ", nyers";
  }
  if (/\b(cooked|boiled|braised|roasted|baked|fried|grilled|stewed)\b/.test(description)) {
    return ", f\u0151tt/s\u00fclt";
  }
  return "";
}

function getUsdaProfile(englishSearchQuery) {
  return USDA_LOCALIZATION_RULES[String(englishSearchQuery || "").trim().toLowerCase()] || null;
}

function localizeUsdaFoodName(description, context = {}) {
  const normalizedDescription = normalizeOnlineFoodSearchText(description);
  const profile = getUsdaProfile(context.englishSearchQuery);

  if (!profile) {
    return {
      localizedName: String(description || "").trim(),
      profile: null
    };
  }

  let localizedName = profile.baseName;

  if (context.englishSearchQuery === "rice") {
    if (/\b(cooked|boiled)\b/.test(normalizedDescription)) {
      localizedName = "Rizs, f\u0151tt";
    } else if (/\b(raw|uncooked|dry)\b/.test(normalizedDescription)) {
      localizedName = "Rizs, nyers";
    }
  } else if (context.englishSearchQuery === "oats") {
    localizedName = /\boatmeal|rolled\b/.test(normalizedDescription) ? "Zabpehely" : "Zab";
  } else if (context.englishSearchQuery === "egg") {
    if (/\b(boiled|cooked|fried|scrambled|poached)\b/.test(normalizedDescription)) {
      localizedName = "Toj\u00e1s, f\u0151tt/s\u00fclt";
    }
  } else if (context.englishSearchQuery === "ground beef") {
    if (/\b(raw|uncooked)\b/.test(normalizedDescription)) {
      localizedName = "Dar\u00e1lt marha, nyers";
    } else if (/\b(cooked|broiled|grilled|fried)\b/.test(normalizedDescription)) {
      localizedName = "Dar\u00e1lt marha, f\u0151tt/s\u00fclt";
    }
  } else {
    localizedName = `${profile.baseName}${getPreparationLabel(normalizedDescription)}`;
  }

  return {
    localizedName,
    profile
  };
}

function scoreUsdaResult(description, localizedName, context = {}) {
  const normalizedDescription = normalizeOnlineFoodSearchText(description);
  const normalizedLocalizedName = normalizeOnlineFoodSearchText(localizedName);
  const normalizedOriginalQuery = normalizeOnlineFoodSearchText(context.originalQuery);
  const profile = getUsdaProfile(context.englishSearchQuery);

  if (!profile) return 0;
  if (hasAnyTerm(normalizedDescription, profile.forbiddenTerms)) return null;
  if (profile.preparedTerms && hasAnyTerm(normalizedDescription, profile.preparedTerms)) return null;

  let score = 0;

  if (profile.expectedTerms && profile.expectedTerms.every((term) => normalizedDescription.includes(term))) {
    score += 60;
  } else if (profile.expectedTerms && profile.expectedTerms.some((term) => normalizedDescription.includes(term))) {
    score += 20;
  }

  if (profile.preferredTerms && hasAnyTerm(normalizedDescription, profile.preferredTerms)) {
    score += 20;
  }

  if (/\braw\b/.test(normalizedDescription)) score += 12;
  if (/\b(cooked|boiled|braised|roasted|baked|fried|grilled|stewed)\b/.test(normalizedDescription)) score += 8;
  if (/\b(foundation)\b/.test(normalizedDescription)) score += 1;

  if (normalizedOriginalQuery && normalizedLocalizedName === normalizedOriginalQuery) score += 60;
  else if (normalizedOriginalQuery && normalizedLocalizedName.startsWith(normalizedOriginalQuery)) score += 45;
  else if (normalizedOriginalQuery && normalizedLocalizedName.includes(normalizedOriginalQuery)) score += 30;

  if (normalizedLocalizedName.includes("nyers")) score += 5;
  if (normalizedDescription.length > 120) score -= 8;

  return score;
}

function getGuessedCategory(name) {
  const normalized = normalizeOnlineFoodSearchText(name);

  if (/(beef|pork|chicken|turkey|meat|marha|sertes|csirke|hus)/.test(normalized)) {
    return FOOD_CATEGORIES[4] || "H\u00fas";
  }
  if (/(egg|tojas)/.test(normalized)) {
    return FOOD_CATEGORIES[6] || "Toj\u00e1s";
  }
  if (/(rice|oats|wheat|flour|bread|pasta|rizs|zab|kenyer|teszta)/.test(normalized)) {
    return FOOD_CATEGORIES[2] || "Gabona";
  }
  if (/(yogurt|cheese|sour cream|cottage cheese|milk|tej|joghurt|turo|tejfol|sajt)/.test(normalized)) {
    return FOOD_CATEGORIES[5] || "Tejterm\u00e9k";
  }
  if (/(apple|banana|berry|fruit|alma|banan|afonya|gyumolcs)/.test(normalized)) {
    return FOOD_CATEGORIES[3] || "Gy\u00fcm\u00f6lcs";
  }
  if (/(cauliflower|broccoli|carrot|cucumber|pepper|tomato|mushroom|potato|karfiol|brokkoli|repa|uborka|paprika|paradicsom|gomba|krumpli|burgonya)/.test(normalized)) {
    return FOOD_CATEGORIES[7] || "Z\u00f6lds\u00e9g";
  }

  return FOOD_CATEGORIES[0] || "Alapanyag";
}

function getDefaultRankMeta() {
  return {
    score: Number.POSITIVE_INFINITY,
    aliasPriority: Number.POSITIVE_INFINITY,
    sourcePriority: Number.POSITIVE_INFINITY,
    itemPriority: Number.POSITIVE_INFINITY
  };
}

function dedupeResults(results) {
  const map = new Map();

  (results || []).forEach((result) => {
    const key =
      result.dedupeKey ||
      result.code ||
      `${normalizeOnlineFoodSearchText(result.name)}|${normalizeOnlineFoodSearchText(result.brand)}`;

    if (!map.has(key)) {
      map.set(key, result);
      return;
    }

    const existing = map.get(key);
    const existingRank = existing.rankMeta || getDefaultRankMeta();
    const candidateRank = result.rankMeta || getDefaultRankMeta();

    if (
      candidateRank.score < existingRank.score ||
      (candidateRank.score === existingRank.score &&
        candidateRank.aliasPriority < existingRank.aliasPriority) ||
      (candidateRank.score === existingRank.score &&
        candidateRank.aliasPriority === existingRank.aliasPriority &&
        candidateRank.sourcePriority < existingRank.sourcePriority) ||
      (candidateRank.score === existingRank.score &&
        candidateRank.aliasPriority === existingRank.aliasPriority &&
        candidateRank.sourcePriority === existingRank.sourcePriority &&
        candidateRank.itemPriority < existingRank.itemPriority)
    ) {
      map.set(key, result);
    }
  });

  return Array.from(map.values());
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
    tojas: "toj\u00e1s",
    turo: "t\u00far\u00f3",
    turot: "t\u00far\u00f3t",
    afonya: "\u00e1fonya",
    kremes: "kr\u00e9mes",
    zsirszegeny: "zs\u00edrszeg\u00e9ny",
    teszta: "t\u00e9szta",
    kenyer: "keny\u00e9r",
    tejfol: "tejf\u00f6l",
    joghurt: "joghurt",
    labszar: "l\u00e1bsz\u00e1r",
    marhalabszar: "marha l\u00e1bsz\u00e1r",
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

  if (
    normalized === "marha labszar" ||
    normalized === "marha labszar" ||
    normalized === "marhalabszar"
  ) {
    pushAlias("marha l\u00e1bsz\u00e1r");
    pushAlias("marha labszar");
    pushAlias("marhalabszar");
    pushAlias("l\u00e1bsz\u00e1r");
    pushAlias("labszar");
  }

  if (normalized === "marha comb" || normalized === "marhacomb") {
    pushAlias("marha comb");
    pushAlias("marhacomb");
    pushAlias("comb");
  }

  if (words.length > 1) {
    pushAlias(words[words.length - 1]);
    pushAlias(words[0]);
  }

  return aliases.slice(0, 7);
}

export function getUsdaSearchQueries(query) {
  const normalized = normalizeOnlineFoodSearchText(query);
  const aliases = [];
  const seen = new Set();

  const pushAlias = (value) => {
    const trimmed = String(value || "").trim().toLowerCase();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    aliases.push(trimmed);
  };

  if (USDA_QUERY_DICTIONARY[normalized]) {
    pushAlias(USDA_QUERY_DICTIONARY[normalized]);
  }

  const compact = normalized.replace(/\s+/g, "");
  if (USDA_QUERY_DICTIONARY[compact]) {
    pushAlias(USDA_QUERY_DICTIONARY[compact]);
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    const lastWord = words[words.length - 1];
    const firstWord = words[0];
    if (USDA_QUERY_DICTIONARY[lastWord]) pushAlias(USDA_QUERY_DICTIONARY[lastWord]);
    if (USDA_QUERY_DICTIONARY[firstWord]) pushAlias(USDA_QUERY_DICTIONARY[firstWord]);
  }

  return aliases.slice(0, 4);
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

  return fetchJsonWithRetry(
    `${OPEN_FOOD_FACTS_ENDPOINT}?${params.toString()}`,
    FETCH_RETRY_COUNT,
    "OpenFoodFacts search failed"
  );
}

export async function fetchUsdaSearch(query, options = {}) {
  const params = new URLSearchParams({
    api_key: USDA_API_KEY,
    query: String(query || "").trim(),
    pageSize: String(options.pageSize || DEFAULT_PAGE_SIZE)
  });
  params.append("dataType", "Foundation");
  params.append("dataType", "SR Legacy");

  return fetchJsonWithRetry(
    `${USDA_ENDPOINT}?${params.toString()}`,
    FETCH_RETRY_COUNT,
    "USDA search failed"
  );
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
    source: "openfoodfacts",
    sourceId: String(product?.code || "").trim(),
    code: String(product?.code || "").trim(),
    dedupeKey:
      String(product?.code || "").trim() ||
      `${normalizeOnlineFoodSearchText(name)}|${normalizeOnlineFoodSearchText(brand)}`,
    name,
    brand,
    kcal,
    protein,
    fat,
    carbs,
    matchedAlias: options.matchedAlias || "",
    aliasPriority: Number.isFinite(options.aliasPriority)
      ? options.aliasPriority
      : Number.POSITIVE_INFINITY,
    sourcePriority: 1,
    itemPriority: 0
  };
}

export function normalizeUsdaFood(food, options = {}) {
  const nutrients = Array.isArray(food?.foodNutrients) ? food.foodNutrients : [];
  const originalDescription = String(food?.description || "").trim();
  const kcal = getNutrientValueByName(
    nutrients,
    (nutrientName, unitName) =>
      nutrientName.toLowerCase().includes("energy") &&
      unitName.toUpperCase() === "KCAL"
  );
  const protein = getNutrientValueByName(
    nutrients,
    (nutrientName) => nutrientName.toLowerCase() === "protein"
  );
  const fat = getNutrientValueByName(
    nutrients,
    (nutrientName) => nutrientName.toLowerCase() === "total lipid (fat)"
  );
  const carbs = getNutrientValueByName(
    nutrients,
    (nutrientName) =>
      nutrientName.toLowerCase() === "carbohydrate, by difference"
  );

  if (!originalDescription) return null;
  if (!Number.isFinite(kcal)) return null;
  if (!Number.isFinite(protein)) return null;
  if (!Number.isFinite(fat)) return null;
  if (!Number.isFinite(carbs)) return null;

  const localization = localizeUsdaFoodName(originalDescription, {
    originalQuery: options.originalQuery,
    englishSearchQuery: options.matchedAlias
  });
  const localizedName = String(localization.localizedName || "").trim();
  if (!localizedName) return null;

  const relevanceScore = scoreUsdaResult(originalDescription, localizedName, {
    originalQuery: options.originalQuery,
    englishSearchQuery: options.matchedAlias
  });
  if (!Number.isFinite(relevanceScore)) return null;

  const normalizedDescription = normalizeOnlineFoodSearchText(originalDescription);
  const baseItemPriority =
    food?.dataType === "Foundation" ? 0 : food?.dataType === "SR Legacy" ? 1 : 2;
  const exactAliasMatch = normalizeOnlineFoodSearchText(options.matchedAlias);
  const aliasBonus =
    exactAliasMatch && normalizedDescription.includes(exactAliasMatch) ? -1 : 0;

  return {
    source: "usda",
    sourceId: String(food?.fdcId || "").trim(),
    code: `usda-${String(food?.fdcId || "").trim()}`,
    dedupeKey: `${
      localization.profile?.dedupeKey || normalizeOnlineFoodSearchText(localizedName)
    }|${normalizeOnlineFoodSearchText(getPreparationLabel(normalizedDescription))}`,
    name: localizedName,
    originalDescription,
    brand: "",
    kcal,
    protein,
    fat,
    carbs,
    matchedAlias: options.matchedAlias || "",
    aliasPriority: Number.isFinite(options.aliasPriority)
      ? options.aliasPriority
      : Number.POSITIVE_INFINITY,
    sourcePriority: 0,
    itemPriority: baseItemPriority + aliasBonus - relevanceScore
  };
}

export function rankOnlineFoodResult(result, normalizedQuery, aliases = []) {
  const normalizedName = normalizeOnlineFoodSearchText(result?.name);
  if (!normalizedQuery || !normalizedName) {
    return getDefaultRankMeta();
  }

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
    aliasPriority: Number.isFinite(result?.aliasPriority)
      ? result.aliasPriority
      : Number.POSITIVE_INFINITY,
    sourcePriority: Number.isFinite(result?.sourcePriority)
      ? result.sourcePriority
      : Number.POSITIVE_INFINITY,
    itemPriority: Number.isFinite(result?.itemPriority)
      ? result.itemPriority
      : Number.POSITIVE_INFINITY
  };
}

async function searchOpenFoodFactsSource(query) {
  const aliases = getOnlineSearchAliases(query);
  const allResults = [];
  const errors = [];
  let hadSuccessfulResponse = false;

  for (const [index, alias] of aliases.entries()) {
    try {
      const json = await fetchOpenFoodFactsSearch(alias, {
        country: "hu",
        language: "hu"
      });
      hadSuccessfulResponse = true;

      const products = Array.isArray(json?.products) ? json.products : [];
      const normalizedResults = products
        .map((product) =>
          normalizeOpenFoodFactsProduct(product, {
            matchedAlias: alias,
            aliasPriority: index
          })
        )
        .filter(Boolean);

      allResults.push(...normalizedResults);
    } catch (error) {
      errors.push(error);
      console.warn(
        `OpenFoodFacts keres\u00e9s sikertelen erre az aliasra: ${alias}`,
        error
      );
    }
  }

  return { aliases, results: allResults, hadSuccessfulResponse, errors };
}

async function searchUsdaSource(query) {
  const aliases = getUsdaSearchQueries(query);
  const allResults = [];
  const errors = [];
  let hadSuccessfulResponse = false;

  for (const [index, alias] of aliases.entries()) {
    try {
      const json = await fetchUsdaSearch(alias);
      hadSuccessfulResponse = true;

      const foods = Array.isArray(json?.foods) ? json.foods : [];
      const normalizedResults = foods
        .map((food) =>
          normalizeUsdaFood(food, {
            originalQuery: query,
            matchedAlias: alias,
            aliasPriority: index
          })
        )
        .filter(Boolean);

      allResults.push(...normalizedResults);
    } catch (error) {
      errors.push(error);
      console.warn("USDA FoodData Central keres\u00e9s sikertelen.", error);
    }
  }

  return { aliases, results: allResults, hadSuccessfulResponse, errors };
}

export async function searchOpenFoodFacts(query) {
  const trimmedQuery = String(query || "").trim();
  if (!trimmedQuery) return [];

  const normalizedQuery = normalizeOnlineFoodSearchText(trimmedQuery);

  const [usdaSearch, openFoodFactsSearch] = await Promise.all([
    searchUsdaSource(trimmedQuery),
    searchOpenFoodFactsSource(trimmedQuery)
  ]);

  const combinedAliases = [...usdaSearch.aliases, ...openFoodFactsSearch.aliases];
  const rankedResults = [...usdaSearch.results, ...openFoodFactsSearch.results].map((result) => ({
    ...result,
    rankMeta: rankOnlineFoodResult(result, normalizedQuery, combinedAliases)
  }));

  const combinedResults = dedupeResults(rankedResults);

  if (combinedResults.length) {
    return combinedResults
      .sort((a, b) => {
        const aRank = a.rankMeta || getDefaultRankMeta();
        const bRank = b.rankMeta || getDefaultRankMeta();
        if (aRank.score !== bRank.score) return aRank.score - bRank.score;
        if (aRank.aliasPriority !== bRank.aliasPriority) {
          return aRank.aliasPriority - bRank.aliasPriority;
        }
        if (aRank.sourcePriority !== bRank.sourcePriority) {
          return aRank.sourcePriority - bRank.sourcePriority;
        }
        if (aRank.itemPriority !== bRank.itemPriority) {
          return aRank.itemPriority - bRank.itemPriority;
        }
        return a.name.localeCompare(b.name, "hu", { sensitivity: "base" });
      })
      .slice(0, MAX_COMBINED_RESULTS);
  }

  const hadSuccessfulResponse =
    usdaSearch.hadSuccessfulResponse || openFoodFactsSearch.hadSuccessfulResponse;

  if (!hadSuccessfulResponse && (usdaSearch.errors.length || openFoodFactsSearch.errors.length)) {
    throw usdaSearch.errors[0] || openFoodFactsSearch.errors[0];
  }

  return [];
}

export function createFoodFromOnlineResult(result, existingFoods = []) {
  const normalizedName = normalizeOnlineFoodSearchText(result?.name);
  const matchedFood = (existingFoods || []).find(
    (food) => normalizeOnlineFoodSearchText(food?.name) === normalizedName
  );

  const generatedId =
    result?.source === "usda" && result?.sourceId
      ? `food-usda-${result.sourceId}`
      : matchedFood?.id || `food-${slugify(result?.name)}-${Date.now()}`;

  const nextFood = {
    ...(matchedFood || {}),
    id: matchedFood?.id || generatedId,
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
