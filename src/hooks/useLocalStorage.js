import { useEffect, useState } from "react";
import { FOODS } from "../data/foods";
import { mergeFoodCatalog } from "../lib/foodCatalog";
import { FOODS_KEY, readJson, writeJson } from "../lib/storage";

function getInitialValue(key, fallback) {
  const storedValue = readJson(key, fallback);
  if (key === FOODS_KEY) {
    return mergeFoodCatalog(FOODS, storedValue);
  }
  return storedValue;
}

function getStoredValue(key, value) {
  if (key === FOODS_KEY) {
    return mergeFoodCatalog(FOODS, value);
  }
  return value;
}

export function useLocalStorage(key, fallback) {
  const [value, setValue] = useState(() => getInitialValue(key, fallback));

  useEffect(() => {
    writeJson(key, getStoredValue(key, value));
  }, [key, value]);

  return [value, setValue];
}
