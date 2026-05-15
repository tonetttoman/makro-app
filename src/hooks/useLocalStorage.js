import { useEffect, useState } from "react";
import { readJson, writeJson } from "../lib/storage";

export function useLocalStorage(key, fallback) {
  const [value, setValue] = useState(() => readJson(key, fallback));

  useEffect(() => {
    writeJson(key, value);
  }, [key, value]);

  return [value, setValue];
}
