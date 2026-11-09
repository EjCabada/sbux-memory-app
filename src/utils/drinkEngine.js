/**
 * src/utils/drinkEngine.js
 * Pure relational recipe calculator & dynamic state-machine workflow compiler.
 */

export const CATALOG_SCHEMA_VERSION = 2;
export const CATALOG_SCHEMA_REVISION = "2.4";

// ============================================================================
// 1. CUP SIZES & SEED MATHEMATICAL CURVES (USER-EXTENSIBLE IN GUI)
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

export const SEED_CURVES = [
  {
    id: "espressoShots",
    label: "Standard Espresso Shots (1 / 1 / 2 / 2 / 3)",
    category: "shots",
    values: { short: 1, tall: 1, grande: 2, venti_hot: 2, venti_iced: 3 },
  },
  {
    id: "flatWhiteShots",
    label: "Flat White / Shaken Shots (2 / 2 / 3 / 3 / 4)",
    category: "shots",
    values: { short: 2, tall: 2, grande: 3, venti_hot: 3, venti_iced: 4 },
  },
  {
    id: "americanoShots",
    label: "Americano Shots (1 / 2 / 3 / 4 / 4)",
    category: "shots",
    values: { short: 1, tall: 2, grande: 3, venti_hot: 4, venti_iced: 4 },
  },
  {
    id: "cortadoShots",
    label: "Cortado Short Shots (3)",
    category: "shots",
    values: { short: 3 },
  },
  {
    id: "curve_cortado_shots",
    label: "Cortado Shots (3)",
    category: "shots",
    values: { short: 3 },
  },
  {
    id: "hotBarPumps",
    label: "Hot Bar Full Pumps (2 / 3 / 4 / 5 / 6)",
    category: "pumps",
    values: { short: 2, tall: 3, grande: 4, venti_hot: 5, venti_iced: 6, trenta: 7 },
  },
  {
    id: "coldBarPumps",
    label: "Cold Bar / Shaken Pumps (1 / 2 / 3 / 4)",
    category: "pumps",
    values: { short: 1, tall: 1, grande: 2, venti_iced: 3, trenta: 4 },
  },
  {
    id: "blendedPumps",
    label: "Frappuccino / Blended Pumps (2 / 3 / 4)",
    category: "pumps",
    values: { short: 1, tall: 2, grande: 3, venti_hot: 4, venti_iced: 4, trenta: 5 },
  },
  {
    id: "energyPumps",
    label: "Energy Progression (4 / 5 / 6 / 7)",
    category: "pumps",
    values: { short: 3, tall: 4, grande: 5, venti_iced: 6, trenta: 7 },
  },
  {
    id: "hotTeaPumps",
    label: "Hot Tea Honey Progression (1 / 1 / 2 / 2)",
    category: "pumps",
    values: { short: 1, tall: 1, grande: 2, venti_hot: 2 },
  },
  {
    id: "frapRoastCurve",
    label: "Frap Roast Pumps (2 / 3 / 4)",
    category: "parameter",
    values: { tall: 2, grande: 3, venti_iced: 4 },
  },
  {
    id: "matchaScoopsCurve",
    label: "Matcha Scoops (2 / 3 / 4)",
    category: "parameter",
    values: { short: 1, tall: 2, grande: 3, venti_hot: 4, venti_iced: 4 },
  },
  {
    id: "fruitInclusionsCurve",
    label: "Fruit Inclusions (1 / 1 / 1 / 2)",
    category: "parameter",
    values: { tall: 1, grande: 1, venti_iced: 1, trenta: 2 },
  },
  {
    id: "hotTeaBagsCurve",
    label: "Steeped Tea Bags (1 / 2 / 2 / 2)",
    category: "parameter",
    values: { short: 1, tall: 2, grande: 2, venti_hot: 2 },
  },
];

export const SEED_METRICS = [
  { key: "shots", label: "Shots" },
  { key: "syrup_pumps", label: "Syrup Pumps" },
  { key: "frap_roast", label: "Frap Roast" },
  { key: "caffeine_pumps", label: "Caffeine Pumps" },
  { key: "fruit_inclusions", label: "Fruit Inclusions" },
  { key: "matcha_scoops", label: "Matcha Scoops" },
  { key: "tea_bags", label: "Tea Bags" },
];

export const SEED_INGREDIENT_OPTIONS = {
  roasts: [
    "Signature Espresso",
    "Blonde Espresso",
    "Decaf Espresso",
    "Frap Roast",
    "Cold Brew",
    "Nitro Cold Brew",
    "Chai Concentrate",
    "Chamomile Mint Blossom Tea",
    "Earl Grey Tea",
    "Matcha Green Tea",
    "Strawberry Açaí Base",
    "Mango Dragonfruit Base",
    "Pineapple Passionfruit Base",
    "None (Crème / Steamer)",
  ],
  milks: [
    "2% Milk",
    "Whole Milk",
    "Oatmilk",
    "Almondmilk",
    "Soymilk",
    "Coconutmilk",
    "Nonfat Milk",
    "Vanilla Sweet Cream",
    "Breve (Half & Half)",
    "Water",
    "Water + Steamed Lemonade",
    "Lemonade",
    "None",
  ],
  syrups: [
    "Classic Syrup",
    "Vanilla Syrup",
    "Brown Sugar Syrup",
    "Caramel Syrup",
    "Cinnamon Dolce Syrup",
    "Hazelnut Syrup",
    "Peppermint Syrup",
    "Mocha Sauce",
    "White Chocolate Mocha Sauce",
    "Dark Caramel Sauce",
    "Pumpkin Sauce",
    "Honey Blend",
    "Liquid Cane Sugar",
    "Apple Brown Sugar",
    "pistachio Sauce",
    "Lavender Powder",
  ],
  toppings: [
    "Cinnamon Powder (2 shakes)",
    "Caramel Drizzle",
    "Mocha Drizzle",
    "Cinnamon Dolce Sprinkles",
    "Pumpkin Spice Topping",
    "Chocolate Curls",
    "Cookie Crumble Topping",
    "Caramel Crunch Topping",
    "Freeze-Dried Strawberries",
    "Dragonfruit Inclusions",
  ],
};

export function normalizeIngredientOptions(rawOptions = {}) {
  const mergeUnique = (seedArr, customArr) => {
    const seen = new Set();
    const out = [];
    for (const item of [...seedArr, ...(Array.isArray(customArr) ? customArr : [])]) {
      const trimmed = String(item || "").trim();
      if (!trimmed) continue;
      const lower = trimmed.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        out.push(trimmed);
      }
    }
    return out;
  };
  return {
    roasts: mergeUnique(SEED_INGREDIENT_OPTIONS.roasts, rawOptions?.roasts),
    milks: mergeUnique(SEED_INGREDIENT_OPTIONS.milks, rawOptions?.milks),
    syrups: mergeUnique(SEED_INGREDIENT_OPTIONS.syrups, rawOptions?.syrups),
    toppings: mergeUnique(SEED_INGREDIENT_OPTIONS.toppings, rawOptions?.toppings),
  };
}

export function getDefaultIngredientsForDrink(resolvedFamilyId, raw = {}) {
  const defaultRoast =
    raw.hasEspresso === false
      ? "None (Crème / Steamer)"
      : resolvedFamilyId === "cold_brew"
      ? "Cold Brew"
      : resolvedFamilyId === "refresher"
      ? "Strawberry Açaí Base"
      : resolvedFamilyId === "frappuccino"
      ? "Frap Roast"
      : "Signature Espresso";

  const defaultMilk =
    resolvedFamilyId === "flat_white"
      ? "Whole Milk"
      : resolvedFamilyId === "americano" || resolvedFamilyId === "cold_brew"
      ? "Water"
      : resolvedFamilyId === "frappuccino"
      ? "Whole Milk"
      : "2% Milk";

  return {
    roast: defaultRoast,
    milk: defaultMilk,
    syrups: [],
    toppings: [],
  };
}

export const COLD_FOAM_PRESETS = [
  {
    id: "vsc",
    label: "Vanilla Sweet Cream Cold Foam",
    recipe: "100mL Vanilla Sweet Cream only (no extra syrup)",
  },
  {
    id: "salted_caramel",
    label: "Salted Caramel Cream Cold Foam",
    recipe: "100mL Sweet Cream + 2 pumps Caramel + 2 Salt packets",
  },
  {
    id: "brown_sugar",
    label: "Brown Sugar Cream Cold Foam",
    recipe: "100mL Sweet Cream + 2 pumps Brown Sugar",
  },
  {
    id: "chocolate",
    label: "Chocolate Cream Cold Foam",
    recipe: "100mL Sweet Cream + 2 scoops Chocolate Malt powder",
  },
  {
    id: "matcha",
    label: "Matcha Cream Cold Foam",
    recipe: "100mL Sweet Cream + 2 scoops Matcha powder",
  },
  {
    id: "white_mocha",
    label: "White Chocolate Cream Cold Foam",
    recipe: "100mL Sweet Cream + 2 pumps White Mocha sauce",
  },
  {
    id: "pumpkin",
    label: "Pumpkin Cream Cold Foam",
    recipe: "100mL Sweet Cream + 2 pumps Pumpkin sauce",
  },
  {
    id: "strawberry",
    label: "Strawberry Cream Cold Foam",
    recipe: "100mL Sweet Cream + Strawberry purée to 150mL line",
  },
  {
    id: "custom",
    label: "Custom Cold Foam Build",
    recipe: "100mL Sweet Cream + custom flavor additions",
  },
];

export const COLD_FOAM_MAP = Object.fromEntries(COLD_FOAM_PRESETS.map((p) => [p.id, p]));

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
  { id: "refresher", label: "Cold Bar Refresher (Base + Water/Lemonade + Inclusions + Shake)" },
  { id: "refresher_cannonball", label: "Cannonball / Lemonade-First Refresher (Lemonade + Bases + Ice + Inclusions on Top)" },
  { id: "matcha_iced", label: "Cold Bar Iced Matcha" },
  { id: "frappuccino", label: "Blended Frappuccino" },
  { id: "cold_brew", label: "Cold Brew / Nitro" },
];

// ============================================================================
// 2. ACTION REGISTRY (SINGLE SOURCE OF TRUTH FOR WORKFLOWS & SIMULATOR)
// ============================================================================

export const ACTION_META = {
  blend_cold_foam: { label: "Foam Sweet Cream in Blender", locksWand: false, releasesWand: false, isFinishing: false },
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
  add_caramel_drizzle: { label: "Add Caramel Drizzle (Standard)", locksWand: false, releasesWand: false, isFinishing: true },
  add_cd_topping: { label: "Add Cinnamon Dolce Topping", locksWand: false, releasesWand: false, isFinishing: true },
  add_mocha_drizzle: { label: "Add Mocha Drizzle", locksWand: false, releasesWand: false, isFinishing: true },
  add_cinnamon_powder: { label: "Add Cinnamon Powder", locksWand: false, releasesWand: false, isFinishing: true },
  add_line_cup_caramel: { label: "Line Cup with Caramel / Dark Caramel", locksWand: false, releasesWand: false, isFinishing: false },
  add_sleeve: { label: "Add Cup Sleeve", locksWand: false, releasesWand: false, isFinishing: true },
  add_lid: { label: "Add Lid", locksWand: false, releasesWand: false, isFinishing: true },
  connect_handoff: { label: "Connect & Hand-off", locksWand: false, releasesWand: false, isFinishing: true },
};

export const ACTION_DICTIONARY = Object.fromEntries(
  Object.entries(ACTION_META).map(([k, v]) => [k, v.label])
);

export const SEED_TOPPING_OPTIONS = [
  { id: "add_caramel", label: "Caramel Crosshatch" },
  { id: "add_caramel_drizzle", label: "Caramel Drizzle (Standard)" },
  { id: "add_cd_topping", label: "Cinnamon Dolce Topping" },
  { id: "add_mocha_drizzle", label: "Mocha Drizzle" },
  { id: "add_cinnamon_powder", label: "Cinnamon Powder" },
];

export const TOPPING_OPTIONS = SEED_TOPPING_OPTIONS;

export const isSteamAction = (actionId) => Boolean(ACTION_META[actionId]?.locksWand);
export const isWandReleaseAction = (actionId) => Boolean(ACTION_META[actionId]?.releasesWand);
export const isFinishingAction = (actionId) => Boolean(ACTION_META[actionId]?.isFinishing);
export const getActionLabel = (actionId) => {
  if (ACTION_META[actionId]) return ACTION_META[actionId].label;
  if (String(actionId).startsWith("custom_step:")) {
    return String(actionId).slice("custom_step:".length);
  }
  if (String(actionId).startsWith("add_topping_")) {
    return `Add ${String(actionId)
      .slice("add_topping_".length)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())}`;
  }
  return actionId;
};

// ============================================================================
// 3. SEED RELATIONAL FAMILY BLUEPRINTS (9 STREAMLINED STRUCTURAL FAMILIES)
// ============================================================================

export const SEED_FAMILIES = [
  {
    id: "latte",
    label: "Standard Espresso Latte",
    defaultStation: "espresso_bar",
    defaultTemps: ["hot", "iced"],
    baseSizes: ["tall", "grande", "venti_hot", "venti_iced"],
    shotCurve: "espressoShots",
    defaultShotType: "standard",
    primaryPumpMetric: "syrup_pumps",
    pumpCurve: "hotBarPumps",
    extraMetrics: {},
    buildTemplate: "espresso_standard",
  },
  {
    id: "macchiato",
    label: "Espresso Macchiato (Layered)",
    defaultStation: "espresso_bar",
    defaultTemps: ["hot", "iced"],
    baseSizes: ["tall", "grande", "venti_hot", "venti_iced"],
    shotCurve: "espressoShots",
    defaultShotType: "standard",
    primaryPumpMetric: "syrup_pumps",
    pumpCurve: "hotBarPumps",
    extraMetrics: {},
    buildTemplate: "macchiato",
  },
  {
    id: "cappuccino",
    label: "Cappuccino (High Foam)",
    defaultStation: "espresso_bar",
    defaultTemps: ["hot"],
    baseSizes: ["tall", "grande", "venti_hot"],
    shotCurve: "espressoShots",
    defaultShotType: "standard",
    primaryPumpMetric: "syrup_pumps",
    pumpCurve: "hotBarPumps",
    extraMetrics: {},
    buildTemplate: "cappuccino",
  },
  {
    id: "americano",
    label: "Caffè Americano (Water Base)",
    defaultStation: "espresso_bar",
    defaultTemps: ["hot", "iced"],
    baseSizes: ["tall", "grande", "venti_hot", "venti_iced"],
    shotCurve: "americanoShots",
    defaultShotType: "standard",
    primaryPumpMetric: "syrup_pumps",
    pumpCurve: "hotBarPumps",
    extraMetrics: {},
    buildTemplate: "americano",
  },
  {
    id: "flat_white",
    label: "Flat White (+1 Ristretto, Whole Milk)",
    defaultStation: "espresso_bar",
    defaultTemps: ["hot", "iced"],
    baseSizes: ["tall", "grande", "venti_hot", "venti_iced"],
    shotCurve: "flatWhiteShots",
    defaultShotType: "ristretto",
    primaryPumpMetric: "syrup_pumps",
    pumpCurve: "hotBarPumps",
    extraMetrics: {},
    buildTemplate: "flat_white",
  },
  {
    id: "shaken_espresso",
    label: "Iced Shaken Espresso (+1 Shot, 1-2-3 Pumps)",
    defaultStation: "espresso_bar",
    defaultTemps: ["iced"],
    baseSizes: ["tall", "grande", "venti_iced"],
    shotCurve: "flatWhiteShots",
    defaultShotType: "standard",
    primaryPumpMetric: "syrup_pumps",
    pumpCurve: "coldBarPumps",
    extraMetrics: {},
    buildTemplate: "shaken_espresso",
  },
  {
    id: "cold_brew",
    label: "Cold Brew / Nitro (1-2-3-4)",
    defaultStation: "cold_bar",
    defaultTemps: ["iced"],
    baseSizes: ["tall", "grande", "venti_iced", "trenta"],
    shotCurve: "none",
    defaultShotType: "standard",
    primaryPumpMetric: "syrup_pumps",
    pumpCurve: "coldBarPumps",
    extraMetrics: {},
    buildTemplate: "cold_brew",
  },
  {
    id: "refresher",
    label: "Refresher (1-2-3-4 Caffeine + Fruit)",
    defaultStation: "cold_bar",
    defaultTemps: ["iced"],
    baseSizes: ["tall", "grande", "venti_iced", "trenta"],
    shotCurve: "none",
    defaultShotType: "standard",
    primaryPumpMetric: "caffeine_pumps",
    pumpCurve: "coldBarPumps",
    extraMetrics: { fruit_inclusions: "fruitInclusionsCurve" },
    buildTemplate: "refresher",
  },
  {
    id: "frappuccino",
    label: "Frappuccino Blended Beverage (2-3-4)",
    defaultStation: "blended",
    defaultTemps: ["iced"],
    baseSizes: ["tall", "grande", "venti_iced"],
    shotCurve: "none",
    defaultShotType: "standard",
    primaryPumpMetric: "syrup_pumps",
    pumpCurve: "blendedPumps",
    extraMetrics: { frap_roast: "frapRoastCurve" },
    buildTemplate: "frappuccino",
  },
  {
    id: "iced_matcha",
    label: "Iced Matcha",
    defaultStation: "cold_bar",
    defaultTemps: ["iced"],
    baseSizes: ["tall", "grande", "venti_iced"],
    shotCurve: "none",
    defaultShotType: "standard",
    primaryPumpMetric: "syrup_pumps",
    pumpCurve: "hotBarPumps",
    extraMetrics: { matcha_scoops: "matchaScoopsCurve" },
    buildTemplate: "matcha_iced",
  },
  {
    id: "cortados",
    label: "Cortados",
    defaultStation: "espresso_bar",
    defaultTemps: ["hot"],
    baseSizes: ["short"],
    shotCurve: "curve_cortado_shots",
    defaultShotType: "ristretto",
    primaryPumpMetric: "syrup_pumps",
    pumpCurve: "hotBarPumps",
    extraMetrics: {},
    buildTemplate: "flat_white",
  },
];

const LEGACY_FAMILY_REMAP = {
  mocha: "latte",
  cortado: "flat_white",
  chai_latte: "latte",
  hot_chocolate: "latte",
  hot_tea: "americano",
  iced_tea: "cold_brew",
  refresher_standard: "refresher",
  refresher_energy: "refresher",
  matcha_cold_bar: "cold_brew",
  frappuccino_coffee: "frappuccino",
  frappuccino_creme: "frappuccino",
};

// ============================================================================
// 4. NORMALIZERS & DYNAMIC METRIC / CURVE REGISTRIES
// ============================================================================

export function normalizeCurve(rawCurve = {}) {
  const cleanValues = {};
  if (rawCurve.values && typeof rawCurve.values === "object") {
    for (const sizeKey of ALL_SIZE_KEYS) {
      if (
        rawCurve.values[sizeKey] !== undefined &&
        rawCurve.values[sizeKey] !== "" &&
        rawCurve.values[sizeKey] !== null
      ) {
        cleanValues[sizeKey] = Math.max(0, Number(rawCurve.values[sizeKey]) || 0);
      }
    }
  }
  return {
    id: String(rawCurve.id || `curve_${Date.now()}`).trim().replace(/\s+/g, "_"),
    label: (rawCurve.label || rawCurve.id || "Custom Curve").trim(),
    category: rawCurve.category || "parameter",
    values: cleanValues,
  };
}

export function buildCurvesMap(curvesArray = SEED_CURVES) {
  const map = { none: {} };
  for (const c of SEED_CURVES) {
    map[c.id] = { ...c.values };
  }
  if (Array.isArray(curvesArray)) {
    for (const c of curvesArray) {
      if (c && c.id) {
        const norm = normalizeCurve(c);
        map[norm.id] = norm.values;
      }
    }
  }
  return map;
}

export function normalizeMetricDefinition(rawMetric = {}) {
  return {
    key: String(rawMetric.key || `metric_${Date.now()}`)
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_"),
    label: (rawMetric.label || rawMetric.key || "Custom Metric").trim(),
  };
}

export function buildMetricsMap(metricsArray = SEED_METRICS) {
  const map = {
    pumps: "Syrup Pumps",
  };
  for (const m of SEED_METRICS) {
    map[m.key] = m.label;
  }
  if (Array.isArray(metricsArray)) {
    for (const m of metricsArray) {
      if (m && m.key) {
        const norm = normalizeMetricDefinition(m);
        map[norm.key] = norm.label;
      }
    }
  }
  return map;
}

export function normalizeFamilyBlueprint(rawFam = {}, curvesMap = null) {
  const cMap = curvesMap || buildCurvesMap();
  const cleanExtra = {};
  if (rawFam.extraMetrics && typeof rawFam.extraMetrics === "object") {
    for (const [k, curveId] of Object.entries(rawFam.extraMetrics)) {
      if (curveId && curveId !== "none" && cMap[curveId]) {
        cleanExtra[k] = curveId;
      }
    }
  }

  // Upgrade legacy flat_white / shaken_espresso shotCurve if migrating from 2.0
  let resolvedShotCurve = rawFam.shotCurve;
  if (
    (rawFam.id === "flat_white" || rawFam.id === "shaken_espresso") &&
    rawFam.shotCurve === "espressoShots" &&
    Number(rawFam.baseShotsDelta) === 1
  ) {
    resolvedShotCurve = "flatWhiteShots";
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
    shotCurve: cMap[resolvedShotCurve] ? resolvedShotCurve : "none",
    defaultShotType: rawFam.defaultShotType === "ristretto" ? "ristretto" : "standard",
    primaryPumpMetric: rawFam.primaryPumpMetric || "syrup_pumps",
    pumpCurve: cMap[rawFam.pumpCurve] ? rawFam.pumpCurve : "none",
    extraMetrics: cleanExtra,
    buildTemplate: rawFam.buildTemplate || "espresso_standard",
  };
}

export function buildFamiliesMap(familiesArray = SEED_FAMILIES, curvesMap = null) {
  const cMap = curvesMap || buildCurvesMap();
  const map = {};
  for (const fam of familiesArray) {
    if (fam && fam.id) {
      map[fam.id] = normalizeFamilyBlueprint(fam, cMap);
    }
  }
  if (!Object.keys(map).length) {
    for (const seed of SEED_FAMILIES) map[seed.id] = normalizeFamilyBlueprint(seed, cMap);
  }
  return map;
}

export function normalizeRawDrink(raw = {}, familiesMap = null) {
  const fMap = familiesMap || buildFamiliesMap();
  const fallbackFamId = Object.keys(fMap)[0] || "latte";
  const mappedCandidate = LEGACY_FAMILY_REMAP[raw.family] || raw.family;
  const resolvedFamilyId = fMap[mappedCandidate] ? mappedCandidate : fallbackFamId;
  const blueprint = fMap[resolvedFamilyId] || SEED_FAMILIES[0];

  const isFundamental = Boolean(raw.curriculum?.isFundamental);
  const allowInSequencing = Boolean(raw.curriculum?.allowInSequencing);
  const defaultIncludeSyrup =
    resolvedFamilyId !== "cappuccino" && resolvedFamilyId !== "flat_white";

  const hasColdFoam = Boolean(raw.hasColdFoam);
  const coldFoamType = hasColdFoam
    ? COLD_FOAM_MAP[raw.coldFoamType]
      ? raw.coldFoamType
      : "vsc"
    : "none";
  const defaultFoamRecipe = COLD_FOAM_MAP[coldFoamType]?.recipe || "";
  const coldFoamRecipe = hasColdFoam
    ? (raw.coldFoamRecipe || defaultFoamRecipe).trim()
    : "";

  // Frappuccinos do not use espresso bar pump deltas
  const rawPumpsDelta = resolvedFamilyId === "frappuccino" ? 0 : Number(raw.pumpsDelta) || 0;

  const defaultIng = getDefaultIngredientsForDrink(resolvedFamilyId, raw);
  const rawIng = raw.ingredients && typeof raw.ingredients === "object" ? raw.ingredients : {};
  const cleanSyrups = Array.isArray(rawIng.syrups)
    ? rawIng.syrups.map((s) => String(s || "").trim()).filter(Boolean)
    : defaultIng.syrups;

  // Map legacy action topping IDs to human-readable labels if ingredients.toppings is not provided
  const fallbackToppings = Array.isArray(raw.toppings)
    ? raw.toppings
        .filter((t) => t !== "add_cold_foam")
        .map((tId) => TOPPING_OPTIONS.find((opt) => opt.id === tId)?.label || tId)
    : defaultIng.toppings;
  const cleanToppings = Array.isArray(rawIng.toppings)
    ? rawIng.toppings.map((t) => String(t || "").trim()).filter(Boolean)
    : fallbackToppings;

  const ingredients = {
    roast: String(rawIng.roast ?? defaultIng.roast).trim() || defaultIng.roast,
    milk: String(rawIng.milk ?? defaultIng.milk).trim() || defaultIng.milk,
    syrups: cleanSyrups,
    toppings: cleanToppings,
  };

  const normalized = {
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
    pumpsDelta: rawPumpsDelta,
    hasWhip: Boolean(raw.hasWhip),
    hasColdFoam,
    coldFoamType,
    coldFoamRecipe,
    includeSyrupStep:
      raw.includeSyrupStep !== undefined
        ? Boolean(raw.includeSyrupStep)
        : defaultIncludeSyrup,
    ingredients,
    toppings: Array.isArray(raw.toppings)
      ? raw.toppings.filter((t) => t !== "add_cold_foam")
      : [],
    curriculum: {
      isFundamental,
      allowInSequencing,
    },
    comments: raw.comments || "",
  };

  if (Array.isArray(raw.allowedSizes) && raw.allowedSizes.length > 0) {
    normalized.allowedSizes = raw.allowedSizes.filter((s) => SIZE_SPECS[s]);
  }
  if (raw.hasEspresso !== undefined) {
    normalized.hasEspresso = Boolean(raw.hasEspresso);
  }
  if (raw.buildOverride) {
    normalized.buildOverride = raw.buildOverride;
  }
  if (raw.shotCurveOverride) {
    normalized.shotCurveOverride = raw.shotCurveOverride;
  }
  if (raw.pumpCurveOverride) {
    normalized.pumpCurveOverride = raw.pumpCurveOverride;
  }
  if (raw.extraMetricsOverride && typeof raw.extraMetricsOverride === "object") {
    normalized.extraMetricsOverride = raw.extraMetricsOverride;
  }
  if (raw.customSteps && typeof raw.customSteps === "object") {
    const cleanCustomSteps = {};
    if (Array.isArray(raw.customSteps.hot) && raw.customSteps.hot.length > 0) {
      cleanCustomSteps.hot = raw.customSteps.hot.map((s) => String(s || "").trim()).filter(Boolean);
    }
    if (Array.isArray(raw.customSteps.iced) && raw.customSteps.iced.length > 0) {
      cleanCustomSteps.iced = raw.customSteps.iced.map((s) => String(s || "").trim()).filter(Boolean);
    }
    if (Object.keys(cleanCustomSteps).length > 0) {
      normalized.customSteps = cleanCustomSteps;
    }
  }

  return normalized;
}

export function computeSizes(drink, blueprint, curvesMap = null, metricsMap = null) {
  const cMap = curvesMap || buildCurvesMap();
  const mMap = metricsMap || buildMetricsMap();
  const hasHot = drink.temps.includes("hot");
  const hasIced = drink.temps.includes("iced");

  const candidateSizes =
    Array.isArray(drink.allowedSizes) && drink.allowedSizes.length > 0
      ? drink.allowedSizes
      : blueprint.baseSizes;

  const activeSizeKeys = candidateSizes.filter((sizeKey) => {
    const spec = SIZE_SPECS[sizeKey];
    if (!spec) return false;
    if (spec.temp === "hot") return hasHot;
    if (spec.temp === "iced") return hasIced;
    return hasHot || hasIced;
  });

  const sizes = {};
  const sizeList = [];

  const activeShotCurve = drink.shotCurveOverride || blueprint.shotCurve;
  const activePumpCurve = drink.pumpCurveOverride || blueprint.pumpCurve;

  for (const sizeKey of activeSizeKeys) {
    const spec = SIZE_SPECS[sizeKey];
    const sizeMetricsObj = {};

    // 1. Shots calculation (pure curve lookup, zero delta clutter)
    if (drink.hasEspresso === false) {
      if (drink.station === "espresso_bar") sizeMetricsObj.shots = "0";
    } else if (activeShotCurve && activeShotCurve !== "none" && cMap[activeShotCurve]) {
      const count = Math.max(0, cMap[activeShotCurve]?.[sizeKey] ?? 0);
      const suffix = count > 0 && drink.shotType === "ristretto" ? "R" : "";
      sizeMetricsObj.shots = `${count}${suffix}`;
    } else if (drink.station === "espresso_bar") {
      sizeMetricsObj.shots = "0";
    }

    // 2. Primary Pump Metric
    if (
      blueprint.primaryPumpMetric &&
      blueprint.primaryPumpMetric !== "none" &&
      activePumpCurve &&
      activePumpCurve !== "none" &&
      cMap[activePumpCurve]
    ) {
      const basePumps = cMap[activePumpCurve]?.[sizeKey];
      if (basePumps !== undefined) {
        const appliedDelta = drink.family === "frappuccino" ? 0 : drink.pumpsDelta;
        const count = Math.max(0, basePumps + appliedDelta);
        sizeMetricsObj[blueprint.primaryPumpMetric] = String(count);
      }
    }

    // 2b. Refresher Syrup Pumps (when a Refresher also contains a syrup like Mango Syrup)
    if (
      drink.family === "refresher" &&
      drink.includeSyrupStep &&
      Array.isArray(drink.ingredients?.syrups) &&
      drink.ingredients.syrups.length > 0 &&
      !sizeMetricsObj.syrup_pumps
    ) {
      const syrupCurve = cMap[activePumpCurve] || cMap.coldBarPumps;
      const baseSyrupPumps = syrupCurve?.[sizeKey];
      if (baseSyrupPumps !== undefined) {
        sizeMetricsObj.syrup_pumps = String(Math.max(0, baseSyrupPumps + drink.pumpsDelta));
      }
    }

    // 3. Extended & Custom Parameters
    const combinedExtras = {
      ...(blueprint.extraMetrics || {}),
      ...(drink.extraMetricsOverride || {}),
    };
    for (const [metricKey, curveName] of Object.entries(combinedExtras)) {
      const val = cMap[curveName]?.[sizeKey];
      if (val !== undefined) {
        sizeMetricsObj[metricKey] = String(val);
      }
    }

    const metrics = Object.entries(sizeMetricsObj).map(([key, value]) => ({
      key,
      label: mMap[key] || key.replace(/_/g, " "),
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
// 5. DYNAMIC WORKFLOW & SEQUENCING COMPILER (OCT 2026 SLEEVE + COLD FOAM FIRST)
// ============================================================================

export function generateWorkflow(drink, tempMode = "hot", sizeKey = null, familiesMap = null) {
  if (!drink.temps.includes(tempMode)) return null;

  const fMap = familiesMap || buildFamiliesMap();
  const blueprint = fMap[drink.family] || SEED_FAMILIES[0];
  const candidateSizes =
    Array.isArray(drink.allowedSizes) && drink.allowedSizes.length > 0
      ? drink.allowedSizes
      : blueprint.baseSizes;

  const resolvedSizeKey =
    sizeKey ||
    (tempMode === "hot"
      ? candidateSizes.includes("grande")
        ? "grande"
        : candidateSizes.find((k) => SIZE_SPECS[k]?.temp !== "iced") || candidateSizes[0]
      : candidateSizes.includes("venti_iced")
      ? "venti_iced"
      : candidateSizes.find((k) => SIZE_SPECS[k]?.temp !== "hot") || candidateSizes[0]);

  const queueAction = drink.shotType === "ristretto" ? "queue_ristretto" : "queue_shots";
  const tpl = drink.buildOverride || blueprint.buildTemplate || "espresso_standard";
  const hasHotWater = tempMode === "hot" && (tpl === "americano" || tpl === "hot_tea_lemonade");

  // OCT 2026 CORPORATE SLEEVE RULE:
  // Every hot drink requires a sleeve EXCEPT Short (8oz).
  const needsSleeve = tempMode === "hot" && resolvedSizeKey !== "short";

  const customStepArray =
    Array.isArray(drink.customSteps?.[tempMode]) && drink.customSteps[tempMode].length > 0
      ? [...drink.customSteps[tempMode]]
      : null;

  const steps = [];
  let preferredStopPoint = null;

  if (customStepArray) {
    for (const s of customStepArray) {
      if (s === "add_sleeve" && !needsSleeve) continue;
      steps.push(s);
    }
    if (tempMode === "hot" && needsSleeve && !steps.includes("add_sleeve")) {
      const lidIdx = steps.indexOf("add_lid");
      if (lidIdx >= 0) steps.splice(lidIdx, 0, "add_sleeve");
      else steps.push("add_sleeve");
    }
    preferredStopPoint =
      steps.find((s) => isSteamAction(s)) ||
      steps.find((s) => s === "blend_pitcher" || s === "add_ice" || s === "catch_cup" || s === "catch_glass") ||
      steps[0];
  } else {
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
      const hasRefresherSyrup =
        drink.includeSyrupStep &&
        Array.isArray(drink.ingredients?.syrups) &&
        drink.ingredients.syrups.length > 0;

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
        case "refresher_cannonball":
          steps.push("add_water_lemonade", "pour_refresher_base");
          if (hasRefresherSyrup) steps.push("pump_shaker");
          steps.push("pump_caffeine", "add_ice", "add_inclusions");
          preferredStopPoint = "add_ice";
          break;
        case "refresher":
          steps.push("pour_refresher_base", "add_water_lemonade");
          if (hasRefresherSyrup) steps.push("pump_shaker");
          steps.push("pump_caffeine", "add_inclusions", "add_ice", "shake_10x");
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

    // Cold Foam Rule:
    // 1. Start foaming at the VERY BEGINNING of the drink (before queueing shots).
    if (drink.hasColdFoam) {
      steps.unshift("blend_cold_foam");
    }

    // Whip & Toppings
    if (drink.hasWhip) steps.push("add_whip");
    for (const toppingId of drink.toppings) {
      if (toppingId && !steps.includes(toppingId)) {
        steps.push(toppingId);
      }
    }

    // Packaging & Cold Foam Pour Towards the End (right before add_lid)
    if (needsSleeve) {
      steps.push("add_sleeve");
    }
    if (drink.hasColdFoam) {
      steps.push("add_cold_foam");
    }
    steps.push("add_lid", "connect_handoff");
  }

  // Hard Invariant: stopPoint MUST exist in steps
  const stopPoint = steps.includes(preferredStopPoint) ? preferredStopPoint : steps[0];
  const requiresSteamedMilk = steps.some(isSteamAction);

  const stepLabels = steps.map((actId) => {
    if (actId === "blend_cold_foam" && drink.coldFoamRecipe) {
      return `${getActionLabel(actId)} (${drink.coldFoamRecipe})`;
    }
    if (
      (actId === "pump_shaker" || actId === "pump_syrups") &&
      Array.isArray(drink.ingredients?.syrups) &&
      drink.ingredients.syrups.length > 0 &&
      drink.family === "refresher"
    ) {
      return `${getActionLabel(actId)} (${drink.ingredients.syrups.join(" + ")})`;
    }
    return getActionLabel(actId);
  });

  return {
    tempMode,
    sizeKey: resolvedSizeKey,
    sizeLabel: SIZE_SPECS[resolvedSizeKey]?.label || resolvedSizeKey,
    hasHotWater,
    needsSleeve,
    requiresSteamedMilk,
    stopPoint,
    steps,
    stepLabels,
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
    if (targetIndex === 0 && wf.steps.includes("blend_pitcher")) choiceSet.add("blend_pitcher");
    if (targetIndex === 0 && wf.steps.includes("shake_10x")) choiceSet.add("shake_10x");
    if (targetAction === "blend_pitcher") choiceSet.add("add_lid");

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
    station: drink.station,
    name: `${tempMode === "iced" && !drink.name.toLowerCase().includes("iced") && drink.station === "espresso_bar" ? "Iced " : ""}${drink.name}`,
    temp: tempMode === "hot" ? "Hot" : "Iced",
    sizeKey: chosenSizeKey,
    size: wf.sizeLabel,
    isShortHot: tempMode === "hot" && chosenSizeKey === "short",
    hasHotWater: wf.hasHotWater,
    needsSleeve: wf.needsSleeve,
    hasColdFoam: drink.hasColdFoam,
    coldFoamLabel: drink.coldFoamLabel,
    coldFoamRecipe: drink.coldFoamRecipe,
    requiresSteamedMilk: wf.requiresSteamedMilk,
    requiresBlender: wf.steps.includes("blend_pitcher") || wf.steps.includes("blend_cold_foam"),
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

export function compileDrink(rawDrink, familiesMap = null, curvesMap = null, metricsMap = null) {
  const cMap = curvesMap || buildCurvesMap();
  const mMap = metricsMap || buildMetricsMap();
  const fMap = familiesMap || buildFamiliesMap(SEED_FAMILIES, cMap);
  const normalized = normalizeRawDrink(rawDrink, fMap);
  const blueprint = fMap[normalized.family] || SEED_FAMILIES[0];
  const { sizes, sizeList } = computeSizes(normalized, blueprint, cMap, mMap);

  const coldFoamPreset = COLD_FOAM_MAP[normalized.coldFoamType];
  const coldFoamLabel = normalized.hasColdFoam
    ? coldFoamPreset?.label || "Custom Cold Foam"
    : null;

  // Build structured "What It Contains" summary list for Recipe Cards & Quizzes
  const containsList = [];
  const ing = normalized.ingredients || {};
  if (ing.roast && ing.roast !== "None" && ing.roast !== "None (Crème / Steamer)") {
    const shotDetail =
      normalized.hasEspresso === false
        ? ""
        : normalized.shotType === "ristretto"
        ? " (Ristretto Shots)"
        : blueprint.shotCurve !== "none"
        ? " (Standard Shots)"
        : "";
    containsList.push({
      category: "Roast / Base",
      value: `${ing.roast}${shotDetail}`,
    });
  }
  if (ing.milk && ing.milk !== "None") {
    containsList.push({
      category: "Milk / Liquid",
      value: ing.milk,
    });
  }
  if (Array.isArray(ing.syrups) && ing.syrups.length > 0) {
    containsList.push({
      category: ing.syrups.length > 1 ? "Syrups / Sauces" : "Syrup / Sauce",
      value: ing.syrups.join(" + "),
    });
  }
  const combinedToppings = [...(ing.toppings || [])];
  if (normalized.hasWhip && !combinedToppings.some((t) => t.toLowerCase().includes("whip"))) {
    combinedToppings.unshift("Whipped Cream");
  }
  if (combinedToppings.length > 0) {
    containsList.push({
      category: "Toppings",
      value: combinedToppings.join(", "),
    });
  }
  if (normalized.hasColdFoam) {
    containsList.push({
      category: "Cold Foam",
      value: normalized.coldFoamRecipe
        ? `${coldFoamLabel} (${normalized.coldFoamRecipe})`
        : coldFoamLabel,
    });
  }

  const enriched = {
    ...normalized,
    coldFoamLabel,
    containsList,
  };

  const workflows = {
    hot: enriched.temps.includes("hot") ? generateWorkflow(enriched, "hot", null, fMap) : null,
    iced: enriched.temps.includes("iced") ? generateWorkflow(enriched, "iced", null, fMap) : null,
  };

  return {
    ...enriched,
    familyLabel: blueprint.label,
    isRistretto: enriched.shotType === "ristretto",
    tags: deriveTags(enriched),
    question: enriched.station === "espresso_bar" ? "Shots & Syrup Pumps" : "Recipe Specifications",
    notes: enriched.comments,
    sizes,
    sizeList,
    workflows,
  };
}

export function compileCatalog(
  rawDrinks = [],
  familiesArray = SEED_FAMILIES,
  curvesArray = SEED_CURVES,
  metricsArray = SEED_METRICS
) {
  const cMap = buildCurvesMap(curvesArray);
  const mMap = buildMetricsMap(metricsArray);
  const fMap = buildFamiliesMap(familiesArray, cMap);
  return rawDrinks.map((d) => compileDrink(d, fMap, cMap, mMap));
}

export function serializeUnifiedCatalog(
  familiesArray,
  rawDrinksArray,
  curvesArray = SEED_CURVES,
  metricsArray = SEED_METRICS,
  ingredientOptionsObj = SEED_INGREDIENT_OPTIONS
) {
  const cleanCurves = curvesArray.map(normalizeCurve);
  const cleanMetrics = metricsArray.map(normalizeMetricDefinition);
  const cleanIngredientOptions = normalizeIngredientOptions(ingredientOptionsObj);
  const cMap = buildCurvesMap(cleanCurves);
  const fMap = buildFamiliesMap(familiesArray, cMap);
  return {
    schemaVersion: CATALOG_SCHEMA_VERSION,
    schemaRevision: CATALOG_SCHEMA_REVISION,
    ingredientOptions: cleanIngredientOptions,
    curves: cleanCurves,
    metrics: cleanMetrics,
    families: familiesArray.map((f) => normalizeFamilyBlueprint(f, cMap)),
    drinks: rawDrinksArray.map((d) => normalizeRawDrink(d, fMap)),
  };
}

export function parseUnifiedCatalogPayload(payload) {
  if (Array.isArray(payload)) {
    const curves = SEED_CURVES.map(normalizeCurve);
    const metrics = SEED_METRICS.map(normalizeMetricDefinition);
    const ingredientOptions = normalizeIngredientOptions(SEED_INGREDIENT_OPTIONS);
    const cMap = buildCurvesMap(curves);
    const families = SEED_FAMILIES.map((f) => normalizeFamilyBlueprint(f, cMap));
    const fMap = buildFamiliesMap(families, cMap);
    return {
      ingredientOptions,
      curves,
      metrics,
      families,
      drinks: payload.map((d) => normalizeRawDrink(d, fMap)),
    };
  }

  const curves =
    Array.isArray(payload?.curves) && payload.curves.length > 0
      ? payload.curves.map(normalizeCurve)
      : SEED_CURVES.map(normalizeCurve);
  const metrics =
    Array.isArray(payload?.metrics) && payload.metrics.length > 0
      ? payload.metrics.map(normalizeMetricDefinition)
      : SEED_METRICS.map(normalizeMetricDefinition);
  const ingredientOptions = normalizeIngredientOptions(payload?.ingredientOptions);

  const cMap = buildCurvesMap(curves);
  const isCurrentRevision =
    (payload?.schemaRevision === "2.1" ||
      payload?.schemaRevision === "2.2" ||
      payload?.schemaRevision === "2.3" ||
      payload?.schemaRevision === CATALOG_SCHEMA_REVISION) &&
    Array.isArray(payload?.families) &&
    payload.families.length > 0;

  const families = isCurrentRevision
    ? payload.families.map((f) => normalizeFamilyBlueprint(f, cMap))
    : SEED_FAMILIES.map((f) => normalizeFamilyBlueprint(f, cMap));
  const fMap = buildFamiliesMap(families, cMap);
  const drinks = Array.isArray(payload?.drinks)
    ? payload.drinks.map((d) => normalizeRawDrink(d, fMap))
    : [];
  return { ingredientOptions, curves, metrics, families, drinks };
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
