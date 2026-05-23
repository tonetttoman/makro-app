function toNumber(value, fallback = 0) {
  if (value === "") return fallback;
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeDailyLog(log) {
  if (!log?.date) return null;
  const date = String(log.date).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  return {
    date,
    kcal: toNumber(log.kcal),
    protein: toNumber(log.protein),
    fat: toNumber(log.fat),
    carbs: toNumber(log.carbs),
    ...(log.alcoholKcal !== undefined ? { alcoholKcal: toNumber(log.alcoholKcal) } : {}),
    ...(log.note ? { note: String(log.note) } : {}),
    ...(log.source ? { source: String(log.source) } : { source: "manual_summary_import" })
  };
}

export function mergeDailyLogs(currentLogs, importedLogs) {
  const byDate = new Map();
  currentLogs.map(normalizeDailyLog).filter(Boolean).forEach((log) => byDate.set(log.date, log));
  importedLogs.map(normalizeDailyLog).filter(Boolean).forEach((log) => byDate.set(log.date, log));
  return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export function mergeDiary(currentDiary = {}, importedDiary = {}) {
  if (!importedDiary || typeof importedDiary !== "object" || Array.isArray(importedDiary)) {
    return currentDiary || {};
  }

  const normalizedImportedDiary = Object.entries(importedDiary).reduce((acc, [dateKey, day]) => {
    const safeDate = String(day?.date || dateKey).trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(safeDate)) return acc;

    acc[safeDate] = {
      date: safeDate,
      entries: Array.isArray(day?.entries) ? day.entries : []
    };

    return acc;
  }, {});

  return {
    ...(currentDiary || {}),
    ...normalizedImportedDiary
  };
}

export function mergeFoodsForFullImport(importedFoods = [], currentFoods = []) {
  const merged = [];
  const seenIds = new Set();

  [...importedFoods, ...currentFoods].forEach((food) => {
    const foodId = typeof food?.id === "string" ? food.id.trim() : "";
    if (!foodId || seenIds.has(foodId)) return;
    merged.push(food);
    seenIds.add(foodId);
  });

  return merged;
}

export function extractDailyLogs(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.dailyLogs)) return data.dailyLogs;
  if (data?.date) return [data];
  return [];
}

export function downloadJson(filename, payload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
