export const SUPPLEMENTS = [
  {
    id: "morning-routine",
    name: "Reggeli vitamin/kiegészítő rutin",
    category: "rutin",
    unit: "adag",
    baseDose: 1,
    step: 1,
    defaultDose: 1,
    targetNutrients: {
      magnesium: 120,
      vitaminC: 180,
      vitaminD3: 2000,
      vitaminK2: 100,
      epaDha: 1000,
      zinc: 10
    }
  },
  {
    id: "evening-routine",
    name: "Esti vitamin/kiegészítő rutin",
    category: "rutin",
    unit: "adag",
    baseDose: 1,
    step: 1,
    defaultDose: 1,
    targetNutrients: {
      magnesium: 240,
      vitaminC: 120,
      calcium: 250
    }
  },
  {
    id: "gal-omega3-8ml",
    name: "GAL Omega-3 8 ml",
    category: "omega",
    unit: "ml",
    baseDose: 8,
    step: 1,
    defaultDose: 8,
    targetNutrients: { epaDha: 2000 }
  },
  {
    id: "gal-magnesium-2caps",
    name: "GAL Magnézium 2 kapszula",
    category: "ásványi anyag",
    unit: "kapszula",
    baseDose: 2,
    step: 1,
    defaultDose: 2,
    targetNutrients: { magnesium: 240 }
  },
  {
    id: "gal-multivitamin",
    name: "GAL Multivitamin",
    category: "multivitamin",
    unit: "adag",
    baseDose: 1,
    step: 1,
    defaultDose: 1,
    targetNutrients: {
      vitaminC: 200,
      vitaminD3: 2000,
      vitaminK2: 100,
      magnesium: 80,
      iron: 4,
      calcium: 120,
      zinc: 10
    }
  },
  {
    id: "biotech-one-a-day",
    name: "BioTechUSA One-A-Day",
    category: "multivitamin",
    unit: "tabletta",
    baseDose: 1,
    step: 1,
    defaultDose: 1,
    targetNutrients: {
      vitaminC: 80,
      vitaminD3: 800,
      magnesium: 60,
      iron: 14,
      calcium: 120,
      zinc: 10
    }
  },
  {
    id: "gal-kd3-9drops",
    name: "GAL K+D3 9 csepp",
    category: "vitamin",
    unit: "csepp",
    baseDose: 9,
    step: 1,
    defaultDose: 9,
    targetNutrients: {
      vitaminD3: 4000,
      vitaminK2: 200
    }
  }
];

export const TARGET_FOOD_IDS = [
  "spinach",
  "arugula",
  "broccoli-sprout",
  "red-cabbage",
  "blackcurrant",
  "pumpkin-seed"
];
