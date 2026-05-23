function toNumber(value) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeImportedTargets(importedTargets, currentTargets) {
  if (!importedTargets || typeof importedTargets !== "object") return currentTargets;

  const nextTargets = { ...currentTargets };

  ["kcal", "protein", "fat", "carbs"].forEach((key) => {
    const rawValue = importedTargets[key];
    if (rawValue === null || rawValue === undefined || rawValue === "") return;
    const value = toNumber(rawValue);
    if (Number.isFinite(value) && value >= 0) {
      nextTargets[key] = value;
    }
  });

  return nextTargets;
}

export function roundTargetNumber(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

export function calculateKcalFromMacros(protein, fat, carbs) {
  return roundTargetNumber(protein * 4 + fat * 9 + carbs * 4);
}

export function scaleMacrosToCalories(targetKcal, currentProtein, currentFat, currentCarbs, fallbackTargets) {
  const protein = Math.max(0, Number(currentProtein) || 0);
  const fat = Math.max(0, Number(currentFat) || 0);
  const carbs = Math.max(0, Number(currentCarbs) || 0);
  const safeTargetKcal = roundTargetNumber(targetKcal);
  const currentMacroKcal = calculateKcalFromMacros(protein, fat, carbs);
  const fallbackProtein = Math.max(0, Number(fallbackTargets?.protein) || 0);
  const fallbackFat = Math.max(0, Number(fallbackTargets?.fat) || 0);
  const fallbackCarbs = Math.max(0, Number(fallbackTargets?.carbs) || 0);
  const fallbackMacroKcal = calculateKcalFromMacros(fallbackProtein, fallbackFat, fallbackCarbs);
  const baseProtein = currentMacroKcal > 0 ? protein : fallbackProtein;
  const baseFat = currentMacroKcal > 0 ? fat : fallbackFat;
  const baseCarbs = currentMacroKcal > 0 ? carbs : fallbackCarbs;
  const baseKcal = currentMacroKcal > 0 ? currentMacroKcal : fallbackMacroKcal || 1;
  const proteinRatio = (baseProtein * 4) / baseKcal;
  const fatRatio = (baseFat * 9) / baseKcal;
  const carbsRatio = (baseCarbs * 4) / baseKcal;
  const nextProtein = roundTargetNumber((safeTargetKcal * proteinRatio) / 4);
  const nextFat = roundTargetNumber((safeTargetKcal * fatRatio) / 9);
  const nextCarbs = roundTargetNumber((safeTargetKcal * carbsRatio) / 4);

  return {
    protein: nextProtein,
    fat: nextFat,
    carbs: nextCarbs,
    kcal: calculateKcalFromMacros(nextProtein, nextFat, nextCarbs)
  };
}
