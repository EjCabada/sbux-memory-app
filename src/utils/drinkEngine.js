/**
 * src/utils/drinkEngine.js
 * Pure relational recipe calculator & dynamic state-machine workflow compiler.
 */

export const CATALOG_SCHEMA_VERSION = 2;

// ============================================================================
// 1. CUP SIZES & STORE-WIDE MATHEMATICAL CURVES
// ============================================================================

export const SIZE_SPECS = {
  short: { key: "short", label: "Short (8oz)", shortLabel: "Short", rank: 1, barHeight: 16, temp: "hot" },
  tall: { key: "tall", label: "Tall (12oz)", shortLabel: "Tall", rank: 2, barHeight: 24, temp: "both" },
  grande: { key: "grande", label: "Grande (16oz)", shortLabel: "Grande", rank: 3, barHeight: 32, temp: "both" },
  venti_hot: { key: "venti_hot", label: "Venti Hot (20oz)", shortLabel: "Vt Ht", rank: 4, barHeight: 40, temp: "hot" },
  venti_iced: { key: "venti_iced", label: "Venti Iced (26oz)", shortLabel: "Vt Icd", rank: 5, barHeight: 48, temp: "iced" },
  trenta: { key: "trenta", label: "Trenta (30oz)", shortLabel: "Trenta", rank: 6, barHeight: 54, temp: "iced" },
};

export const ALL_SIZE_KEYS = Object.keys(SIZE_SPECS);

export const CURVES = {
  none: {},
  espressoShots: { short: 1, tall: 1, grande: 2, venti_hot: 2, venti_iced: 3, trenta: 0 },
  americanoShots: { short: 1, tall: 2, grande: 3, venti_hot: 4, venti_iced: 4, trenta: 0 },
  hotBarPumps: { short: 2, tall: 3, grande: 4, venti_hot: 5, venti_iced: 6, trenta: 7 },
  coldBarPumps: { short: 1, tall: 1, grande: 2, venti_iced: 3, trenta: 4 },
  blendedPumps: { short: 1, tall: 2, grande: 3, venti_hot: 4, venti_iced: 4, trenta: 5 },
  energyPumps: { short: 3, tall: 4, grande: 5, venti_iced: 6, trenta: 7 },
  hotTeaPumps: { short: 1, tall: 1, grande: 2, venti_hot: 2 },
  frapRoastCurve: { tall: 2, grande: 3, venti_iced: 4 },
  matchaScoopsCurve: { short: 1, tall: 2, grande: 3, venti_hot: 4, venti_iced: 4 },
  fruitInclusionsCurve: { tall: 1, grande: 1, venti_iced: 1, trenta: 2 },
  hotTeaBagsCurve: { short: 1, tall: 2, grande: 2, venti_hot: 2 },
};

export const CURVE_OPTIONS = [
  { id: "none", label: "None (0 / Omitted)" },
  { id: "espressoShots", label: "Espresso Shots (1 / 1 / 2 / 2 / 3)" },
  { id: "americanoShots", label: "Americano Shots (1 / 2 / 3 / 4 / 4)" },
  { id: "hotBarPumps", label: "Hot Bar Full Pumps (2 / 3 / 4 / 5 / 6)" },
  { id: "coldBarPumps", label: "Cold Bar / Shaken Pumps (1 / 2 / 3 / 4)" },
  { id: "blendedPumps", label: "Blended / Matcha Progression (2 / 3 / 4)" },
  { id: "energyPumps", label: "Energy Progression (4 / 5 / 6 / 7)" },
  { id: "hotTeaPumps", label: "Hot Tea Honey Progression (1 / 1 / 2 / 2)" },
  { id: "frapRoastCurve", label: "Frap Roast Pumps (2 / 3 / 4)" },
  { id: "matchaScoopsCurve", label: "Matcha Scoops (2 / 3 / 4)" },
  { id: "fruitInclusionsCurve", label: "Fruit Inclusions (1 / 1 / 1 / 2)" },
  { id: "hotTeaBagsCurve", label: "Steeped Tea Bags (1 / 2 / 2 / 2)" },
];

export const METRIC_LABELS = {
  shots: "Shots",
  syrup_pumps: "Syrup Pumps",
  pumps: "Syrup Pumps",
  frap_roast: "Frap Roast",
  caffeine_pumps: "Caffeine Pumps",
  fruit_inclusions: "Fruit Inclusions",
  matcha_scoops: "Matcha Scoops",
  tea_bags: "Tea Bags",
};

export const EXTRA_METRIC_KEYS = [
  "frap_roast",
  "caffeine_pumps",
  "fruit_inclusions",
  "matcha_scoops",
  "tea_bags",
];

export const BUILD_TEMPLATES = [
  { id: "espresso_standard", label: "Standard Latte / Mocha (Steam 2%, Free Pour)" },
  { id: "macchiato", label: "Macchiato (Catch in Glass, Shots Over Top)" },
  { id: "cappuccino", label: "Cappuccino (6-8s Aeration, Dense Foam)" },
  { id: "flat_white", label: "Flat White / Cortado (Whole Milk, Dot of Foam)" },
  { id: "americano", label: "Americano (Water + Espresso)" },
  { id: "shaken_espresso", label: "Shaken Espresso (Shaker + Ice + Splash Milk)" },
  { id: "chai_latte", label: "Chai / Concentrate Latte" },
  { id: "steamer", label: "Hot Chocolate / Crème Steamer (No Espresso)" },
  { id: "hot_tea_lemonade", label: "Honey Citrus Mint / Steamed Tea Lemonade" },
  { id: "iced_tea", label: "Cold Bar Shaken Iced Tea" },
  { id: "refresher", label: "Cold Bar Refresher (Base + Inclusions + Shake)" },
  { id: "matcha_iced", label: "Cold Bar Iced Matcha" },
  { id: "frappuccino", label: "Blended Frappuccino" },
  { id: "cold_brew", label: "Cold Brew / Nitro" },
];

// ============================================================================
// 2. ACTION REGISTRY (SINGLE SOURCE OF TRUTH FOR WORKFLOWS & SIMULATOR)
// ============================================================================

export const ACTION_META = {
  queue_shots: { label: "Queue Shots", locksWand: false, releasesWand: false, isFinishing: false, startsShots: true },
  queue_ristretto: { label: "Queue Ristretto Shots", locksWand: false, releasesWand: false, isFinishing: false, startsShots: true },
  pump_syrups: { label: "Pump Syrups in Cup", locksWand: false, releasesWand: false, isFinishing: false, pumpsSyrup: true },
  pump_frap_roast: { label: "Pump Frap Roast", locksWand: false, releasesWand: false, isFinishing: false, pumpsSyrup: true },
  pump_shaker: { label: "Pump Syrup in Shaker", locksWand: false, releasesWand: false, isFinishing: false, pumpsSyrup: true },
  pump_caffeine: { label: "Pump Caffeine Base", locksWand: false, releasesWand: false, isFinishing: false, pumpsSyrup: true },
  pump_liquid_cane: { label: "Pump Liquid Cane", locksWand: false, releasesWand: false, isFinishing: false, pumpsSyrup: true },
  pump_honey: { label: "Pump Honey Blend", locksWand: false, releasesWand: false, isFinishing: false, pumpsSyrup: true },
  catch_cup: { label: "Catch in Cup", locksWand: false, releasesWand: false, isFinishing: false, catchesShots: true },
  catch_glass: { label: "Catch in Shot Glass", locksWand: false, releasesWand: false, isFinishing: false, catchesShots: true },
  steam_milk: { label: "Steam 2% Milk", locksWand: true, releasesWand: false, isFinishing: false },
  steam_cappuccino: { label: "Steam Milk (6-8s Aeration)", locksWand: true, releasesWand: false, isFinishing: false },
  steam_whole_milk: { label: "Steam Whole Milk", locksWand: true, releasesWand: false, isFinishing: false },
  steam_lemonade: { label: "Steam Lemonade", locksWand: true, releasesWand: false, isFinishing: false },
  steam_all_pitcher: { label: "Steam Chai + Classic + Milk", locksWand: true, releasesWand: false, isFinishing: false },
  clean_wand: { label: "Clean Steam Wand", locksWand: false, releasesWand: true, isFinishing: false },
  groom_milk: { label: "Groom Milk Pitcher", locksWand: false, releasesWand: false, isFinishing: false },
  free_pour_milk: { label: "Pour Steamed Milk / Lemonade", locksWand: false, releasesWand: false, isFinishing: true },
  pour_foam_dot: { label: "Pour Milk (Dot of Foam)", locksWand: false, releasesWand: false, isFinishing: true },
  pour_foam: { label: "Pour Dense Foam", locksWand: false, releasesWand: false, isFinishing: true },
  pour_shots_over: { label: "Pour Shots Over Top", locksWand: false, releasesWand: false, isFinishing: true },
  pour_cold_milk: { label: "Pour Cold Milk to Upper Line", locksWand: false, releasesWand: false, isFinishing: true },
  pour_tea_shaker: { label: "Pour Tea to Shaker Line", locksWand: false, releasesWand: false, isFinishing: false },
  pour_refresher_base: { label: "Pour Refresher Base", locksWand: false, releasesWand: false, isFinishing: false },
  add_water_lemonade: { label: "Add Water / Lemonade / Coconutmilk", locksWand: false, releasesWand: false, isFinishing: false },
  add_tea_bags: { label: "Add Tea Bags to Cup", locksWand: false, releasesWand: false, isFinishing: false },
  add_inclusions: { label: "Add Fruit Inclusions", locksWand: false, releasesWand: false, isFinishing: false },
  add_matcha_shaker: { label: "Add Matcha Scoops", locksWand: false, releasesWand: false, isFinishing: false },
  add_hot_water: { label: "Add Hot Water", locksWand: false, releasesWand: false, isFinishing: true },
  add_cold_water: { label: "Add Cold Water", locksWand: false, releasesWand: false, isFinishing: true },
  add_ice: { label: "Add Ice", locksWand: false, releasesWand: false, isFinishing: true },
  shake_10x: { label: "Shake 10 Times", locksWand: false, releasesWand: false, isFinishing: true },
  top_milk: { label: "Top with Splash of Milk", locksWand: false, releasesWand: false, isFinishing: true },
  add_cold_foam: { label: "Top with Cold Foam", locksWand: false, releasesWand: false, isFinishing: true },
  blend_pitcher: { label: "Blend on #1", locksWand: false, releasesWand: false, isFinishing: false },
  add_whip: { label: "Add Whipped Cream", locksWand: false, releasesWand: false, isFinishing: true },
  add_caramel: { label: "Add Caramel Crosshatch", locksWand: false, releasesWand: false, isFinishing: true },
  add_cd_topping: { label: "Add Cinnamon Dolce Topping", locksWand: false, releasesWand: false, isFinishing: true },
  add_mocha_drizzle: { label: "Add Mocha Drizzle", locksWand: false, releasesWand: false, isFinishing: true },
  add_sleeve: { label: "Add Cup Sleeve", locksWand: false, releasesWand: false, isFinishing: true },
  add_lid: { label: "Add Lid", locksWand: false, releasesWand: false, isFinishing: true },
  connect_handoff: { label: "Connect & Hand-off", locksWand: false, releasesWand: false, isFinishing: true },
};

export const ACTION_DICTIONARY = Object.fromEntries(
  Object.entries(ACTION_META).map(([k, v]) => [k, v.label])
);

export const TOPPING_OPTIONS = [
  { id: "add_caramel", label: "Caramel Crosshatch" },
  { id: "add_cd_topping", label: "Cinnamon Dolce Topping" },
  { id: "add_mocha_drizzle", label: "Mocha Drizzle" },
  { id: "add_cold_foam", label: "Cold Foam" },
];

export const isSteamAction = (actionId) => Boolean(ACTION_META[actionId]?.locksWand);
export const isWandReleaseAction = (actionId) => Boolean(ACTION_META[actionId]?.releasesWand);
export const isFinishingAction = (actionId) => Boolean(ACTION_META[actionId]?.isFinishing);
export const getActionLabel = (actionId) => ACTION_META[actionId]?.label || actionId;

// ============================================================================
// 3. SEED RELATIONAL FAMILY BLUEPRINTS (DEFAULT DYNAMIC TABLE)
// ============================================================================

export const SEED_FAMILIES = [
  {
    id: "latte",
    label: "Standard Espresso Latte",
    defaultStation: "espresso_bar",
    defaultTemps: ["hot", "iced"],
    baseSizes: ["tall", "grande", "venti_hot", "venti_iced"],
    shotCurve: "espressoShots",
    baseShotsDelta: 0,
    defaultShotType: "standard",
    primaryPumpMetric: "syrup_pumps",
    pumpCurve: "hotBarPumps",
    basePumpsDelta: 0,
    extraMetrics: {},
    buildTemplate: "espresso_standard",
    includeSyrupStep: true,
    defaultHasWhip: false,
  },
  {
    id: "macchiato",
    label: "Espresso Macchiato (Layered)",
    defaultStation: "espresso_bar",
    defaultTemps: ["hot", "iced"],
    baseSizes: ["tall", "grande", "venti_hot", "venti_iced"],
    shotCurve: "espressoShots",
    baseShotsDelta: 0,
    defaultShotType: "standard",
    primaryPumpMetric: "syrup_pumps",
    pumpCurve: "hotBarPumps",
    basePumpsDelta: 0,
    extraMetrics: {},
    buildTemplate: "macchiato",
    includeSyrupStep: true,
    defaultHasWhip: false,
  },
  {
    id: "cappuccino",
    label: "Cappuccino (High Foam)",
    defaultStation: "espresso_bar",
    defaultTemps: ["hot"],
    baseSizes: ["tall", "grande", "venti_hot"],
    shotCurve: "espressoShots",
    baseShotsDelta: 0,
    defaultShotType: "standard",
    primaryPumpMetric: "syrup_pumps",
    pumpCurve: "hotBarPumps",
    basePumpsDelta: 0,
    extraMetrics: {},
    buildTemplate: "cappuccino",
    includeSyrupStep: false,
    defaultHasWhip: false,
  },
  {
    id: "americano",
    label: "Caffè Americano (Water Base)",
    defaultStation: "espresso_bar",
    defaultTemps: ["hot", "iced"],
    baseSizes: ["tall", "grande", "venti_hot", "venti_iced"],
    shotCurve: "americanoShots",
    baseShotsDelta: 0,
    defaultShotType: "standard",
    primaryPumpMetric: "syrup_pumps",
    pumpCurve: "hotBarPumps",
    basePumpsDelta: 0,
    extraMetrics: {},
    buildTemplate: "americano",
    includeSyrupStep: true,
    defaultHasWhip: false,
  },
  {
    id: "flat_white",
    label: "Flat White (+1 Ristretto, Whole Milk)",
    defaultStation: "espresso_bar",
    defaultTemps: ["hot", "iced"],
    baseSizes: ["tall", "grande", "venti_hot", "venti_iced"],
    shotCurve: "espressoShots",
    baseShotsDelta: 1,
    defaultShotType: "ristretto",
    primaryPumpMetric: "syrup_pumps",
    pumpCurve: "hotBarPumps",
    basePumpsDelta: 0,
    extraMetrics: {},
    buildTemplate: "flat_white",
    includeSyrupStep: false,
    defaultHasWhip: false,
  },
  {
    id: "mocha",
    label: "Mocha / Sauce Espresso Build",
    defaultStation: "espresso_bar",
    defaultTemps: ["hot", "iced"],
    baseSizes: ["tall", "grande", "venti_hot", "venti_iced"],
    shotCurve: "espressoShots",
    baseShotsDelta: 0,
    defaultShotType: "standard",
    primaryPumpMetric: "syrup_pumps",
    pumpCurve: "hotBarPumps",
    basePumpsDelta: 0,
    extraMetrics: {},
    buildTemplate: "espresso_standard",
    includeSyrupStep: true,
    defaultHasWhip: true,
  },
  {
    id: "cortado",
    label: "Cortado (Short Only, 3R)",
    defaultStation: "espresso_bar",
    defaultTemps: ["hot"],
    baseSizes: ["short"],
    shotCurve: "espressoShots",
    baseShotsDelta: 2,
    defaultShotType: "ristretto",
    primaryPumpMetric: "syrup_pumps",
    pumpCurve: "hotBarPumps",
    basePumpsDelta: 0,
    extraMetrics: {},
    buildTemplate: "flat_white",
    includeSyrupStep: false,
    defaultHasWhip: false,
  },
  {
    id: "shaken_espresso",
    label: "Iced Shaken Espresso (+1 Shot, 1-2-3 Pumps)",
    defaultStation: "espresso_bar",
    defaultTemps: ["iced"],
    baseSizes: ["tall", "grande", "venti_iced"],
    shotCurve: "espressoShots",
    baseShotsDelta: 1,
    defaultShotType: "standard",
    primaryPumpMetric: "syrup_pumps",
    pumpCurve: "coldBarPumps",
    basePumpsDelta: 0,
    extraMetrics: {},
    buildTemplate: "shaken_espresso",
    includeSyrupStep: true,
    defaultHasWhip: false,
  },
  {
    id: "chai_latte",
    label: "Chai / Tea Concentrate Latte",
    defaultStation: "espresso_bar",
    defaultTemps: ["hot", "iced"],
    baseSizes: ["tall", "grande", "venti_hot", "venti_iced"],
    shotCurve: "none",
    baseShotsDelta: 0,
    defaultShotType: "standard",
    primaryPumpMetric: "syrup_pumps",
    pumpCurve: "hotBarPumps",
    basePumpsDelta: 0,
    extraMetrics: {},
    buildTemplate: "chai_latte",
    includeSyrupStep: true,
    defaultHasWhip: false,
  },
  {
    id: "hot_chocolate",
    label: "Hot Chocolate / Crème Steamer",
    defaultStation: "espresso_bar",
    defaultTemps: ["hot"],
    baseSizes: ["tall", "grande", "venti_hot"],
    shotCurve: "none",
    baseShotsDelta: 0,
    defaultShotType: "standard",
    primaryPumpMetric: "syrup_pumps",
    pumpCurve: "hotBarPumps",
    basePumpsDelta: 0,
    extraMetrics: {},
    buildTemplate: "steamer",
    includeSyrupStep: true,
    defaultHasWhip: true,
  },
  {
    id: "hot_tea",
    label: "Steeped Hot Tea / Honey Citrus Mint",
    defaultStation: "espresso_bar",
    defaultTemps: ["hot"],
    baseSizes: ["short", "tall", "grande", "venti_hot"],
    shotCurve: "none",
    baseShotsDelta: 0,
    defaultShotType: "standard",
    primaryPumpMetric: "syrup_pumps",
    pumpCurve: "hotTeaPumps",
    basePumpsDelta: 0,
    extraMetrics: { tea_bags: "hotTeaBagsCurve" },
    buildTemplate: "hot_tea_lemonade",
    includeSyrupStep: true,
    defaultHasWhip: false,
  },
  {
    id: "iced_tea",
    label: "Shaken Iced Tea (1-2-3-4)",
    defaultStation: "cold_bar",
    defaultTemps: ["iced"],
    baseSizes: ["tall", "grande", "venti_iced", "trenta"],
    shotCurve: "none",
    baseShotsDelta: 0,
    defaultShotType: "standard",
    primaryPumpMetric: "syrup_pumps",
    pumpCurve: "coldBarPumps",
    basePumpsDelta: 0,
    extraMetrics: {},
    buildTemplate: "iced_tea",
    includeSyrupStep: true,
    defaultHasWhip: false,
  },
  {
    id: "refresher_standard",
    label: "Standard Refresher (1-2-3-4 Caffeine + Fruit)",
    defaultStation: "cold_bar",
    defaultTemps: ["iced"],
    baseSizes: ["tall", "grande", "venti_iced", "trenta"],
    shotCurve: "none",
    baseShotsDelta: 0,
    defaultShotType: "standard",
    primaryPumpMetric: "caffeine_pumps",
    pumpCurve: "coldBarPumps",
    basePumpsDelta: 0,
    extraMetrics: { fruit_inclusions: "fruitInclusionsCurve" },
    buildTemplate: "refresher",
    includeSyrupStep: false,
    defaultHasWhip: false,
  },
  {
    id: "refresher_energy",
    label: "Energy Refresher (4-5-6-7 Caffeine + Fruit)",
    defaultStation: "cold_bar",
    defaultTemps: ["iced"],
    baseSizes: ["tall", "grande", "venti_iced", "trenta"],
    shotCurve: "none",
    baseShotsDelta: 0,
    defaultShotType: "standard",
    primaryPumpMetric: "caffeine_pumps",
    pumpCurve: "energyPumps",
    basePumpsDelta: 0,
    extraMetrics: { fruit_inclusions: "fruitInclusionsCurve" },
    buildTemplate: "refresher",
    includeSyrupStep: false,
    defaultHasWhip: false,
  },
  {
    id: "matcha_cold_bar",
    label: "Cold Bar Iced Matcha (Matcha Scoops + Syrup)",
    defaultStation: "cold_bar",
    defaultTemps: ["iced"],
    baseSizes: ["tall", "grande", "venti_iced"],
    shotCurve: "none",
    baseShotsDelta: 0,
    defaultShotType: "standard",
    primaryPumpMetric: "syrup_pumps",
    pumpCurve: "blendedPumps",
    basePumpsDelta: 0,
    extraMetrics: { matcha_scoops: "matchaScoopsCurve" },
    buildTemplate: "matcha_iced",
    includeSyrupStep: true,
    defaultHasWhip: false,
  },
  {
    id: "frappuccino_coffee",
    label: "Coffee Frappuccino (Frap Roast + Syrup)",
    defaultStation: "blended",
    defaultTemps: ["iced"],
    baseSizes: ["tall", "grande", "venti_iced"],
    shotCurve: "none",
    baseShotsDelta: 0,
    defaultShotType: "standard",
    primaryPumpMetric: "syrup_pumps",
    pumpCurve: "blendedPumps",
    basePumpsDelta: 0,
    extraMetrics: { frap_roast: "frapRoastCurve" },
    buildTemplate: "frappuccino",
    includeSyrupStep: true,
    defaultHasWhip: true,
  },
  {
    id: "frappuccino_creme",
    label: "Crème Frappuccino (No Frap Roast)",
    defaultStation: "blended",
    defaultTemps: ["iced"],
    baseSizes: ["tall", "grande", "venti_iced"],
    shotCurve: "none",
    baseShotsDelta: 0,
    defaultShotType: "standard",
    primaryPumpMetric: "syrup_pumps",
    pumpCurve: "blendedPumps",
    basePumpsDelta: 0,
    extraMetrics: {},
    buildTemplate: "frappuccino",
    includeSyrupStep: true,
    defaultHasWhip: true,
  },
  {
    id: "cold_brew",
    label: "Cold Brew / Nitro (1-2-3-4)",
    defaultStation: "cold_bar",
    defaultTemps: ["iced"],
    baseSizes: ["tall", "grande", "venti_iced", "trenta"],
    shotCurve: "none",
    baseShotsDelta: 0,
    defaultShotType: "standard",
    primaryPumpMetric: "syrup_pumps",
    pumpCurve: "coldBarPumps",
    basePumpsDelta: 0,
    extraMetrics: {},
    buildTemplate: "cold_brew",
    includeSyrupStep: true,
    defaultHasWhip: false,
  },
];

// ============================================================================
// 4. NORMALIZERS & DYNAMIC METRIC CALCULATOR
// ============================================================================

export function normalizeFamilyBlueprint(rawFam = {}) {
  const cleanExtra = {};
  if (rawFam.extraMetrics && typeof rawFam.extraMetrics === "object") {
    for (const [k, curveId] of Object.entries(rawFam.extraMetrics)) {
      if (curveId && curveId !== "none" && CURVES[curveId]) {
        cleanExtra[k] = curveId;
      }
    }
  }

  return {
    id: String(rawFam.id || `family_${Date.now()}`).trim().toLowerCase().replace(/\s+/g, "_"),
    label: (rawFam.label || rawFam.id || "Custom Family").trim(),
    defaultStation: rawFam.defaultStation || "espresso_bar",
    defaultTemps:
      Array.isArray(rawFam.defaultTemps) && rawFam.defaultTemps.length > 0
        ? rawFam.defaultTemps
        : ["hot", "iced"],
    baseSizes:
      Array.isArray(rawFam.baseSizes) && rawFam.baseSizes.length > 0
        ? rawFam.baseSizes.filter((s) => SIZE_SPECS[s])
        : ["tall", "grande", "venti_hot", "venti_iced"],
    shotCurve: CURVES[rawFam.shotCurve] ? rawFam.shotCurve : "none",
    baseShotsDelta: Number(rawFam.baseShotsDelta) || 0,
    defaultShotType: rawFam.defaultShotType === "ristretto" ? "ristretto" : "standard",
    primaryPumpMetric: rawFam.primaryPumpMetric || "syrup_pumps",
    pumpCurve: CURVES[rawFam.pumpCurve] ? rawFam.pumpCurve : "none",
    basePumpsDelta: Number(rawFam.basePumpsDelta) || 0,
    extraMetrics: cleanExtra,
    buildTemplate: rawFam.buildTemplate || "espresso_standard",
    includeSyrupStep: rawFam.includeSyrupStep !== undefined ? Boolean(rawFam.includeSyrupStep) : true,
    defaultHasWhip: Boolean(rawFam.defaultHasWhip),
  };
}

export function buildFamiliesMap(familiesArray = SEED_FAMILIES) {
  const map = {};
  for (const fam of familiesArray) {
    if (fam && fam.id) {
      map[fam.id] = normalizeFamilyBlueprint(fam);
    }
  }
  if (!Object.keys(map).length) {
    for (const seed of SEED_FAMILIES) map[seed.id] = seed;
  }
  return map;
}

export function normalizeRawDrink(raw = {}, familiesMap = null) {
  const fMap = familiesMap || buildFamiliesMap();
  const fallbackFamId = Object.keys(fMap)[0] || "latte";
  const resolvedFamilyId = fMap[raw.family] ? raw.family : fallbackFamId;
  const blueprint = fMap[resolvedFamilyId] || SEED_FAMILIES[0];

  const isFundamental = Boolean(raw.curriculum?.isFundamental);
  const allowInSequencing = Boolean(raw.curriculum?.allowInSequencing);

  return {
    id: String(raw.id || `drink_${Date.now()}`).trim(),
    name: (raw.name || "Untitled Drink").trim(),
    family: resolvedFamilyId,
    station: raw.station || blueprint.defaultStation,
    season: String(raw.season || "Core").trim() || "Core",
    isActive: raw.isActive !== undefined ? Boolean(raw.isActive) : true,
    temps:
      Array.isArray(raw.temps) && raw.temps.length > 0
        ? raw.temps
        : [...blueprint.defaultTemps],
    shotType: raw.shotType || blueprint.defaultShotType || "standard",
    shotsDelta: Number(raw.shotsDelta) || 0,
    pumpsDelta: Number(raw.pumpsDelta) || 0,
    hasWhip: raw.hasWhip !== undefined ? Boolean(raw.hasWhip) : blueprint.defaultHasWhip,
    includeSyrupStep:
      raw.includeSyrupStep !== undefined
        ? Boolean(raw.includeSyrupStep)
        : Boolean(blueprint.includeSyrupStep),
    toppings: Array.isArray(raw.toppings) ? raw.toppings : [],
    curriculum: {
      isFundamental,
      allowInSequencing,
    },
    comments: raw.comments || "",
  };
}

export function computeSizes(drink, blueprint) {
  const hasHot = drink.temps.includes("hot");
  const hasIced = drink.temps.includes("iced");

  const activeSizeKeys = blueprint.baseSizes.filter((sizeKey) => {
    const spec = SIZE_SPECS[sizeKey];
    if (!spec) return false;
    if (spec.temp === "hot") return hasHot;
    if (spec.temp === "iced") return hasIced;
    return hasHot || hasIced;
  });

  const sizes = {};
  const sizeList = [];

  for (const sizeKey of activeSizeKeys) {
    const spec = SIZE_SPECS[sizeKey];
    const sizeMetricsObj = {};

    // 1. Shots calculation
    if (blueprint.shotCurve && blueprint.shotCurve !== "none") {
      const baseShots = CURVES[blueprint.shotCurve]?.[sizeKey] ?? 0;
      const count = Math.max(0, baseShots + blueprint.baseShotsDelta + drink.shotsDelta);
      const suffix = count > 0 && drink.shotType === "ristretto" ? "R" : "";
      sizeMetricsObj.shots = `${count}${suffix}`;
    } else if (drink.station === "espresso_bar") {
      sizeMetricsObj.shots = "0";
    }

    // 2. Primary Pump Metric (syrup_pumps or caffeine_pumps)
    if (
      blueprint.primaryPumpMetric &&
      blueprint.primaryPumpMetric !== "none" &&
      blueprint.pumpCurve &&
      blueprint.pumpCurve !== "none"
    ) {
      const basePumps = CURVES[blueprint.pumpCurve]?.[sizeKey];
      if (basePumps !== undefined) {
        const count = Math.max(0, basePumps + blueprint.basePumpsDelta + drink.pumpsDelta);
        sizeMetricsObj[blueprint.primaryPumpMetric] = String(count);
      }
    }

    // 3. Extended Cold Bar & Specialty Metrics (frap_roast, caffeine_pumps, fruit_inclusions, matcha_scoops, tea_bags)
    if (blueprint.extraMetrics) {
      for (const [metricKey, curveName] of Object.entries(blueprint.extraMetrics)) {
        const val = CURVES[curveName]?.[sizeKey];
        if (val !== undefined) {
          sizeMetricsObj[metricKey] = String(val);
        }
      }
    }

    const metrics = Object.entries(sizeMetricsObj).map(([key, value]) => ({
      key,
      label: METRIC_LABELS[key] || key.replace(/_/g, " "),
      value,
    }));

    const primaryPumpsVal =
      sizeMetricsObj.syrup_pumps ??
      sizeMetricsObj.pumps ??
      sizeMetricsObj.caffeine_pumps ??
      "0";

    sizes[sizeKey] = sizeMetricsObj;
    sizeList.push({
      sizeKey,
      size: spec.label,
      shortLabel: spec.shortLabel,
      rank: spec.rank,
      barHeight: spec.barHeight,
      shots: sizeMetricsObj.shots ?? "0",
      pumps: primaryPumpsVal,
      metrics,
    });
  }

  return { sizes, sizeList };
}

// ============================================================================
// 5. DYNAMIC WORKFLOW & SEQUENCING COMPILER (OCT 2026 SLEEVE STANDARD)
// ============================================================================

export function generateWorkflow(drink, tempMode = "hot", sizeKey = null, familiesMap = null) {
  if (!drink.temps.includes(tempMode)) return null;

  const fMap = familiesMap || buildFamiliesMap();
  const blueprint = fMap[drink.family] || SEED_FAMILIES[0];

  const resolvedSizeKey =
    sizeKey ||
    (tempMode === "hot"
      ? blueprint.baseSizes.includes("grande")
        ? "grande"
        : blueprint.baseSizes.find((k) => SIZE_SPECS[k]?.temp !== "iced") || blueprint.baseSizes[0]
      : blueprint.baseSizes.includes("venti_iced")
      ? "venti_iced"
      : blueprint.baseSizes.find((k) => SIZE_SPECS[k]?.temp !== "hot") || blueprint.baseSizes[0]);

  const queueAction = drink.shotType === "ristretto" ? "queue_ristretto" : "queue_shots";
  const tpl = blueprint.buildTemplate || "espresso_standard";
  const hasHotWater = tempMode === "hot" && (tpl === "americano" || tpl === "hot_tea_lemonade");

  // OCT 2026 CORPORATE SLEEVE RULE:
  // Every hot drink requires a sleeve EXCEPT Short (8oz).
  const needsSleeve = tempMode === "hot" && resolvedSizeKey !== "short";

  const steps = [];
  let preferredStopPoint = null;

  if (tempMode === "hot") {
    switch (tpl) {
      case "chai_latte":
        steps.push("steam_all_pitcher", "clean_wand", "groom_milk", "free_pour_milk");
        preferredStopPoint = "steam_all_pitcher";
        break;
      case "steamer":
        steps.push("pump_syrups", "steam_milk", "clean_wand", "groom_milk", "free_pour_milk");
        preferredStopPoint = "steam_milk";
        break;
      case "hot_tea_lemonade":
        steps.push("add_tea_bags", "pump_honey", "add_hot_water", "steam_lemonade", "clean_wand", "free_pour_milk");
        preferredStopPoint = "steam_lemonade";
        break;
      case "americano":
        steps.push(queueAction);
        if (drink.includeSyrupStep) steps.push("pump_syrups");
        steps.push("catch_cup", "add_hot_water");
        preferredStopPoint = "catch_cup";
        break;
      case "macchiato":
        steps.push(queueAction);
        if (drink.includeSyrupStep) steps.push("pump_syrups");
        steps.push("catch_glass", "steam_milk", "clean_wand", "groom_milk", "free_pour_milk", "pour_shots_over");
        preferredStopPoint = "steam_milk";
        break;
      case "cappuccino":
        steps.push(queueAction);
        if (drink.includeSyrupStep) steps.push("pump_syrups");
        steps.push("catch_cup", "steam_cappuccino", "clean_wand", "groom_milk", "pour_foam");
        preferredStopPoint = "steam_cappuccino";
        break;
      case "flat_white":
        steps.push(queueAction);
        if (drink.includeSyrupStep) steps.push("pump_syrups");
        steps.push(
          "catch_cup",
          "steam_whole_milk",
          "clean_wand",
          "groom_milk",
          resolvedSizeKey === "short" ? "free_pour_milk" : "pour_foam_dot"
        );
        preferredStopPoint = "steam_whole_milk";
        break;
      case "espresso_standard":
      default:
        steps.push(queueAction);
        if (drink.includeSyrupStep) steps.push("pump_syrups");
        steps.push("catch_cup", "steam_milk", "clean_wand", "groom_milk", "free_pour_milk");
        preferredStopPoint = "steam_milk";
        break;
    }
  } else {
    // ICED / BLENDED WORKFLOWS
    switch (tpl) {
      case "shaken_espresso":
        steps.push(queueAction, "pump_shaker", "catch_glass", "add_ice", "shake_10x", "top_milk");
        preferredStopPoint = "catch_glass";
        break;
      case "chai_latte":
        steps.push("pump_syrups", "pour_cold_milk", "add_ice");
        preferredStopPoint = "pump_syrups";
        break;
      case "iced_tea":
        steps.push("pour_tea_shaker", "add_water_lemonade", "pump_liquid_cane", "add_ice", "shake_10x");
        preferredStopPoint = "add_ice";
        break;
      case "refresher":
        steps.push("pour_refresher_base", "add_water_lemonade", "pump_caffeine", "add_inclusions", "add_ice", "shake_10x");
        preferredStopPoint = "add_ice";
        break;
      case "matcha_iced":
        steps.push("pour_cold_milk", "add_matcha_shaker", "pump_syrups", "blend_pitcher", "add_ice");
        preferredStopPoint = "blend_pitcher";
        break;
      case "frappuccino":
        if (blueprint.extraMetrics?.frap_roast) steps.push("pump_frap_roast");
        steps.push("pour_cold_milk");
        if (drink.includeSyrupStep) steps.push("pump_syrups");
        steps.push("add_ice", "blend_pitcher");
        preferredStopPoint = "blend_pitcher";
        break;
      case "cold_brew":
        if (drink.includeSyrupStep) steps.push("pump_syrups");
        steps.push("pour_cold_milk", "add_ice");
        preferredStopPoint = "add_ice";
        break;
      case "americano":
        steps.push(queueAction);
        if (drink.includeSyrupStep) steps.push("pump_syrups");
        steps.push("catch_cup", "add_cold_water", "add_ice");
        preferredStopPoint = "catch_cup";
        break;
      case "macchiato":
        steps.push(queueAction);
        if (drink.includeSyrupStep) steps.push("pump_syrups");
        steps.push("catch_glass", "pour_cold_milk", "add_ice", "pour_shots_over");
        preferredStopPoint = "add_ice";
        break;
      default:
        steps.push(queueAction);
        if (drink.includeSyrupStep) steps.push("pump_syrups");
        steps.push("catch_cup", "pour_cold_milk", "add_ice");
        preferredStopPoint = "catch_cup";
        break;
    }
  }

  // Whip & Toppings
  if (drink.hasWhip) steps.push("add_whip");
  for (const toppingId of drink.toppings) {
    if (ACTION_META[toppingId] && !steps.includes(toppingId)) {
      steps.push(toppingId);
    }
  }

  // Explicit Packaging Sequence (Oct 2026 Sleeve Standard)
  if (needsSleeve) {
    steps.push("add_sleeve");
  }
  steps.push("add_lid", "connect_handoff");

  // Hard Invariant: stopPoint MUST exist in steps
  const stopPoint = steps.includes(preferredStopPoint) ? preferredStopPoint : steps[0];
  const requiresSteamedMilk = steps.some(isSteamAction);

  return {
    tempMode,
    sizeKey: resolvedSizeKey,
    sizeLabel: SIZE_SPECS[resolvedSizeKey]?.label || resolvedSizeKey,
    hasHotWater,
    needsSleeve,
    requiresSteamedMilk,
    stopPoint,
    steps,
    stepLabels: steps.map(getActionLabel),
  };
}

export function generateSequencingOrder(drink, tempMode = "hot", explicitSizeKey = null, familiesMap = null) {
  const validSizeKeys = drink.sizeList
    .map((s) => s.sizeKey)
    .filter((k) => {
      const spec = SIZE_SPECS[k];
      return tempMode === "hot" ? spec.temp !== "iced" : spec.temp !== "hot";
    });

  if (!validSizeKeys.length) return null;

  const chosenSizeKey =
    explicitSizeKey && validSizeKeys.includes(explicitSizeKey)
      ? explicitSizeKey
      : validSizeKeys[Math.floor(Math.random() * validSizeKeys.length)];

  const wf = generateWorkflow(drink, tempMode, chosenSizeKey, familiesMap);
  if (!wf) return null;

  const buildChoicesForTarget = (targetIndex) => {
    const targetAction = wf.steps[targetIndex];
    const choiceSet = new Set([targetAction]);

    for (const nextStep of wf.steps.slice(targetIndex + 1, targetIndex + 3)) {
      choiceSet.add(nextStep);
    }

    if (targetIndex === 0 && wf.requiresSteamedMilk) choiceSet.add("steam_milk");
    if (isSteamAction(targetAction)) choiceSet.add("free_pour_milk");

    // Oct 2026 Sleeve Decision Point: Always pair add_sleeve & add_lid on hot drinks
    // so Short (8oz) tests skipping the sleeve while Tall/Grande/Venti Hot require it.
    if (tempMode === "hot" && (targetAction === "add_sleeve" || targetAction === "add_lid")) {
      choiceSet.add("add_sleeve");
      choiceSet.add("add_lid");
    }

    if (choiceSet.size < 3) choiceSet.add("connect_handoff");
    return Array.from(choiceSet);
  };

  return {
    id: `${drink.id}_${tempMode}_${chosenSizeKey}`,
    drinkId: drink.id,
    name: `${tempMode === "iced" && !drink.name.toLowerCase().includes("iced") ? "Iced " : ""}${drink.name}`,
    temp: tempMode === "hot" ? "Hot" : "Iced",
    sizeKey: chosenSizeKey,
    size: wf.sizeLabel,
    isShortHot: tempMode === "hot" && chosenSizeKey === "short",
    hasHotWater: wf.hasHotWater,
    needsSleeve: wf.needsSleeve,
    requiresSteamedMilk: wf.requiresSteamedMilk,
    stopPoint: wf.stopPoint,
    steps: wf.steps.map((actionId, idx) => ({
      actionId,
      isStopPoint: actionId === wf.stopPoint,
      choices: buildChoicesForTarget(idx),
    })),
  };
}

// ============================================================================
// 6. RELATIONAL CATALOG HYDRATION & POOL SAMPLER
// ============================================================================

export function deriveTags(drink) {
  const tags = new Set();
  if (drink.station === "espresso_bar") tags.add("espresso bar");
  if (drink.station === "cold_bar") tags.add("cold bar");
  if (drink.station === "blended") {
    tags.add("cold bar");
    tags.add("Frappuccinos");
  }

  const isCore = drink.season.trim().toLowerCase() === "core";
  tags.add(isCore ? "core drinks" : "seasonal drinks");

  if (drink.family.startsWith("refresher")) tags.add("refreshers");
  if (drink.family === "iced_tea") tags.add("iced teas");
  if (drink.family === "cold_brew") tags.add("cold brew");
  if (drink.family.startsWith("frappuccino")) tags.add("Frappuccinos");
  return Array.from(tags);
}

export function compileDrink(rawDrink, familiesMap = null) {
  const fMap = familiesMap || buildFamiliesMap();
  const normalized = normalizeRawDrink(rawDrink, fMap);
  const blueprint = fMap[normalized.family] || SEED_FAMILIES[0];
  const { sizes, sizeList } = computeSizes(normalized, blueprint);

  const workflows = {
    hot: normalized.temps.includes("hot") ? generateWorkflow(normalized, "hot", null, fMap) : null,
    iced: normalized.temps.includes("iced") ? generateWorkflow(normalized, "iced", null, fMap) : null,
  };

  return {
    ...normalized,
    familyLabel: blueprint.label,
    isRistretto: normalized.shotType === "ristretto",
    tags: deriveTags(normalized),
    question: normalized.station === "espresso_bar" ? "Shots & Syrup Pumps" : "Recipe Specifications",
    notes: normalized.comments,
    sizes,
    sizeList,
    workflows,
  };
}

export function compileCatalog(rawDrinks = [], familiesArray = SEED_FAMILIES) {
  const fMap = buildFamiliesMap(familiesArray);
  return rawDrinks.map((d) => compileDrink(d, fMap));
}

export function serializeUnifiedCatalog(familiesArray, rawDrinksArray) {
  const fMap = buildFamiliesMap(familiesArray);
  return {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    families: familiesArray.map(normalizeFamilyBlueprint),
    drinks: rawDrinksArray.map((d) => normalizeRawDrink(d, fMap)),
  };
}

export function parseUnifiedCatalogPayload(payload) {
  if (Array.isArray(payload)) {
    const families = SEED_FAMILIES.map(normalizeFamilyBlueprint);
    const fMap = buildFamiliesMap(families);
    return {
      families,
      drinks: payload.map((d) => normalizeRawDrink(d, fMap)),
    };
  }
  const families =
    Array.isArray(payload?.families) && payload.families.length > 0
      ? payload.families.map(normalizeFamilyBlueprint)
      : SEED_FAMILIES.map(normalizeFamilyBlueprint);
  const fMap = buildFamiliesMap(families);
  const drinks = Array.isArray(payload?.drinks)
    ? payload.drinks.map((d) => normalizeRawDrink(d, fMap))
    : [];
  return { families, drinks };
}

export function selectBalancedPool(drinks, { count = 12, filterFn = (d) => d.isActive } = {}) {
  const eligible = drinks.filter(filterFn);
  const byFamily = {};

  for (const drink of eligible) {
    const fam = drink.family || drink.id;
    if (!byFamily[fam]) byFamily[fam] = [];
    byFamily[fam].push(drink);
  }

  const shuffledFamilies = Object.keys(byFamily).sort(() => Math.random() - 0.5);
  const selected = [];

  for (const fam of shuffledFamilies) {
    if (selected.length >= count) break;
    const variants = byFamily[fam];
    selected.push(variants[Math.floor(Math.random() * variants.length)]);
  }

  if (selected.length < count) {
    const selectedIds = new Set(selected.map((s) => s.id));
    const filler = eligible
      .filter((d) => !selectedIds.has(d.id))
      .sort(() => Math.random() - 0.5)
      .slice(0, count - selected.length);
    selected.push(...filler);
  }

  return selected;
}
