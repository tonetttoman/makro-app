import { DEFAULT_TARGETS } from "./calculations";

export const DIARY_KEY = "macroDiary.v1";
export const WORKSPACE_KEY = "todayWorkspace.v1";
export const TARGETS_KEY = "targets.v1";
export const LEGACY_TARGETS_KEY = "macroTargets.v1";
export const SUPPLEMENT_DIARY_KEY = "supplementDiary.v1";
export const DAILY_LOGS_KEY = "dailyLogs.v1";
export const FOODS_KEY = "foodsCatalog.v1";
export const SUPPLEMENTS_KEY = "supplementsCatalog.v1";
export const NUTRIENT_TARGETS_KEY = "nutrientTargets.v1";

export function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeJson(key) {
  localStorage.removeItem(key);
}

export function readDiary() {
  return readJson(DIARY_KEY, {});
}

export function writeDiary(diary) {
  writeJson(DIARY_KEY, diary);
}

export function readTargets() {
  return readJson(TARGETS_KEY, DEFAULT_TARGETS);
}

export function writeTargets(targets) {
  writeJson(TARGETS_KEY, targets);
}
