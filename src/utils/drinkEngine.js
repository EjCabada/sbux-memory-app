/**
 * src/utils/drinkEngine.js
 * Pure relational recipe calculator & dynamic state-machine workflow compiler.
 */

import {
  ACTION_DICTIONARY,
  ACTION_META,
  ALL_SIZE_KEYS,
  BUILD_TEMPLATES,
  CATALOG_SCHEMA_REVISION,
  CATALOG_SCHEMA_VERSION,
  COLD_FOAM_MAP,
  COLD_FOAM_PRESETS,
  LEGACY_FAMILY_REMAP,
  SEED_CURVES,
  SEED_FAMILIES,
  SEED_INGREDIENT_OPTIONS,
  SEED_METRICS,
  SEED_TOPPING_OPTIONS,
  SIZE_SPECS,
  TOPPING_OPTIONS,
} from "./drinkConstants.js";

export {
  ACTION_DICTIONARY,
  ACTION_META,
  ALL_SIZE_KEYS,
  BUILD_TEMPLATES,
  CATALOG_SCHEMA_REVISION,
  CATALOG_SCHEMA_VERSION,
  COLD_FOAM_MAP,
  COLD_FOAM_PRESETS,
  SEED_CURVES,
  SEED_FAMILIES,
  SEED_INGREDIENT_OPTIONS,
  SEED_METRICS,
  SEED_TOPPING_OPTIONS,
  SIZE_SPECS,
  TOPPING_OPTIONS,
};

export function normalizeIngredientOptions(rawOptions = {}) {
  const mergeUnique = (seedArr, customArr) => {
    const set = new Set([
      ...seedArr,
      ...(Array.isArray(customArr) ? customArr.map((x) => String(x || "").trim()).filter(Boolean) : []),
    ]);
    return Array.from(set);
  };
  return {
    roasts: mergeUnique(SEED_INGREDIENT_OPTIONS.roasts, rawOptions?.roasts),
    milks: mergeUnique(SEED_INGREDIENT_OPTIONS.milks, rawOptions?.milks),
    syrups: mergeUnique(SEED_INGREDIENT_OPTIONS.syrups, rawOptions?.syrups),
    toppings: mergeUnique(SEED_INGREDIENT_OPTIONS.toppings, rawOptions?.toppings),
  };
}

export function getDefaultIngredientsForDrink(familyId = "latte", raw = {}) {
  let roast = "Signature Espresso";
  let milk = "2% Milk";

  if (raw.hasEspresso === false) {
    roast = "None (Crème / Steamer)";
  } else if (familyId === "flat_white" || familyId === "cortados") {
    milk = "Whole Milk";
  } else if (familyId === "americano") {
    milk = "Water";
  } else if (familyId === "cold_brew") {
    roast = "Cold Brew";
    milk = "None";
  } else if (familyId === "refresher") {
    roast = "Strawberry Açaí Base";
    milk = "Water / Lemonade";
  } else if (familyId === "frappuccino") {
    roast = "Frap Roast";
    milk = "Whole Milk";
  } else if (familyId === "iced_matcha") {
    roast = "Matcha Green Tea";
    milk = "2% Milk";
  }

  return { roast, milk, syrups: [], toppings: [] };
}

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
// NORMALIZERS & DYNAMIC METRIC / CURVE REGISTRIES
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
  const map = { pumps: "Syrup Pumps" };
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

  const rawPumpsDelta = resolvedFamilyId === "frappuccino" ? 0 : Number(raw.pumpsDelta) || 0;

  const defaultIng = getDefaultIngredientsForDrink(resolvedFamilyId, raw);
  const rawIng = raw.ingredients && typeof raw.ingredients === "object" ? raw.ingredients : {};
  const cleanSyrups = Array.isArray(rawIng.syrups)
    ? rawIng.syrups.map((s) => String(s || "").trim()).filter(Boolean)
    : defaultIng.syrups;

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

  const activeSizeKeys = ALL_SIZE_KEYS.filter((sizeKey) => {
    if (!candidateSizes.includes(sizeKey)) return false;
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

    // 1. Shots calculation
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

    // 2b. Refresher Syrup Pumps (when a Refresher also contains a syrup)
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
      shots: sizeMetricsObj.shots ?? "0",
      pumps: primaryPumpsVal,
      metrics,
    });
  }

  return { sizes, sizeList };
}

// ============================================================================
// DYNAMIC WORKFLOW & SEQUENCING COMPILER (OCT 2026 SLEEVE + COLD FOAM FIRST)
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

  // OCT 2026 CORPORATE SLEEVE RULE: Every hot drink requires a sleeve EXCEPT Short (8oz).
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

    if (drink.hasColdFoam) {
      steps.unshift("blend_cold_foam");
    }

    if (drink.hasWhip) steps.push("add_whip");
    for (const toppingId of drink.toppings) {
      if (toppingId && !steps.includes(toppingId)) {
        steps.push(toppingId);
      }
    }

    if (needsSleeve) {
      steps.push("add_sleeve");
    }
    if (drink.hasColdFoam) {
      steps.push("add_cold_foam");
    }
    steps.push("add_lid", "connect_handoff");
  }

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
    needsSleeve: wf.needsSleeve,
    hasColdFoam: drink.hasColdFoam,
    coldFoamRecipe: drink.coldFoamRecipe,
    requiresSteamedMilk: wf.requiresSteamedMilk,
    steps: wf.steps.map((actionId, idx) => ({
      actionId,
      isStopPoint: actionId === wf.stopPoint,
      choices: buildChoicesForTarget(idx),
    })),
  };
}

// ============================================================================
// RELATIONAL CATALOG HYDRATION & POOL SAMPLER
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
  if (ing.milk && ing.milk !== "None" && ing.milk !== "-") {
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
