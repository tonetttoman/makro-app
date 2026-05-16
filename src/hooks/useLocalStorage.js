import { useEffect, useState } from "react";
import { readJson, removeJson, writeJson } from "../lib/storage";

function readStoredValue(key, fallback, legacyKeys = []) {
  const primaryValue = readJson(key, undefined);
  if (primaryValue !== undefined) return primaryValue;

  for (const legacyKey of legacyKeys) {
    const legacyValue = readJson(legacyKey, undefined);
    if (legacyValue !== undefined) return legacyValue;
  }

  return fallback;
}

export function useLocalStorage(key, fallback, options = {}) {
  const legacyKeys = options.legacyKeys || [];
  const [value, setValue] = useState(() => readStoredValue(key, fallback, legacyKeys));

  useEffect(() => {
    legacyKeys.forEach((legacyKey) => {
      if (legacyKey !== key) removeJson(legacyKey);
    });
  }, [key, legacyKeys]);

  useEffect(() => {
    writeJson(key, value);
  }, [key, value]);

  return [value, setValue];
}
