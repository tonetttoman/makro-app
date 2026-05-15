# Étrend és célanyag PWA - technikai terv

## Cél

Mobilról gyorsan használható, költségmentesen futtatható PWA, amely első körben étel/makró naplóként működik, később vitamin-, kiegészítő- és célanyag-követéssel bővíthető.

## Technológiai döntések

- React + Vite: egyszerű, gyors, jól bővíthető frontend.
- PWA manifest + service worker: főképernyőre kirakható és alap offline működésre alkalmas.
- localStorage első verzióban: nulla backendköltség, könnyű exportálhatóság.
- Későbbi IndexedDB migráció: nagyobb historikus adatokhoz és felhőszinkron előkészítéséhez.
- Moduláris adatmodell: az ételek opcionálisan célanyag-hozzájárulásokat is tartalmazhatnak.

## Adatmodell javaslat

```ts
type NutrientId =
  | "magnesium"
  | "vitaminC"
  | "vitaminD3"
  | "vitaminK2"
  | "epaDha"
  | "iron"
  | "nitrate"
  | "fiber"
  | "potassium"
  | "calcium"
  | "zinc";

type Food = {
  id: string;
  name: string;
  category: "Fehérje" | "Tejtermék" | "Hús" | "Tojás" | "Gyümölcs" | "Magvak" | "Gabona" | "Zöldség" | "Egyéb";
  unit: "g" | "ml" | "db" | "adag";
  baseAmount: number;
  step: number;
  defaultAmount: number;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  targetNutrients?: Partial<Record<NutrientId, number>>;
};

type DiaryEntry = {
  entryId: string;
  foodId: string;
  amount: number;
  createdAt: string;
};

type DailyDiary = {
  date: string;
  entries: DiaryEntry[];
};

type Supplement = {
  id: string;
  name: string;
  category: "vitamin" | "mineral" | "omega" | "routine" | "targetFood";
  unit: "db" | "ml" | "csepp" | "adag" | "g";
  baseDose: number;
  step: number;
  targetNutrients: Partial<Record<NutrientId, number>>;
};
```

## Tárolási stratégia

- `macroDiary.v1`: napi naplók objektumban, kulcs: `YYYY-MM-DD`.
- `dailyLogs.v1`: visszamenőleg importált vagy kézzel mentett napi összesítések tömbje, summary-only napokhoz.
- `supplementDiary.v1`: napi kiegészítő/célanyag naplók objektumban, kulcs: `YYYY-MM-DD`.
- `foodsCatalog.v1`: szerkeszthető élelmiszer-katalógus.
- `supplementsCatalog.v1`: szerkeszthető kiegészítő-katalógus.
- `macroTargets.v1`: napi kcal, fehérje, zsír, szénhidrát cél.
- `nutrientTargets.v1`: szerkeszthető célanyag célértékek.
- `uiPrefs.v1`: téma, utolsó aktív kategória, opcionális beállítások.
- Későbbi szinkron: ugyanilyen domain objektumok küldhetők Supabase/Firebase/egyedi API felé.

## Komponensstruktúra

```text
src/
  App.jsx
  main.jsx
  data/
    foods.js
    nutrients.js
  hooks/
    useLocalStorage.js
  lib/
    calculations.js
    dates.js
    storage.js
  components/
    AppShell.jsx
    BottomNav.jsx
    CategoryPicker.jsx
    FoodGrid.jsx
    DailyEntryList.jsx
    MacroSummary.jsx
    ProgressBar.jsx
    StatsView.jsx
    PlaceholderView.jsx
```

## Első verzió funkciói

- Mai napi étel/makró napló.
- Kategóriák és élelmiszergombok.
- Tétel hozzáadása egy kattintással.
- Mennyiség szerkesztése a napi listában plusz/mínusz gombbal és inputtal.
- Egyedi lépték élelmiszerenként.
- Automatikus kcal, fehérje, zsír, szénhidrát újraszámolás.
- Napi cél progress sávok és makróarány.
- Heti/havi nézet első, historikus localStorage-adatokból számolt táblázatos és egyszerű grafikonos összesítővel.
- Vitaminok lap célanyag progress sávokkal, gyors kiegészítő gombokkal, reggeli/esti rutinnal és célzöldség hozzáadással.
- Az ételnapló `targetNutrients` adatai automatikusan beleszámítanak a Vitaminok oldal napi értékeibe.
- Adatok lap élelmiszer-, kiegészítő- és célérték-szerkesztéssel, valamint JSON export/import mentéssel.

## Későbbi bővítés

- Vitamin/célanyag gyorsgombok és rutinok.
- Ételnaplóból automatikusan átszámolt célanyagok.
- IndexedDB adapter a `storage.js` mögött.
- Export/import JSON.
- Felhőszinkron adapter opcionális auth réteggel.
