import { useEffect, useState } from "react";
import { FOODS_KEY, readJson, writeJson } from "../lib/storage";

function getInitialValue(key, fallback) {
  if (key === FOODS_KEY) {
    const storedValue = readJson(key, null);
    return Array.isArray(storedValue) ? storedValue : fallback;
  }

  return readJson(key, fallback);
}

export function useLocalStorage(key, fallback) {
  const [value, setValue] = useState(() => getInitialValue(key, fallback));

  useEffect(() => {
    writeJson(key, value);
  }, [key, value]);

  return [value, setValue];
}
