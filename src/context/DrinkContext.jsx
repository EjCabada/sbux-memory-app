/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import {
  SEED_CURVES,
  SEED_FAMILIES,
  SEED_INGREDIENT_OPTIONS,
  SEED_METRICS,
  buildCurvesMap,
  buildFamiliesMap,
  buildMetricsMap,
  compileCatalog,
  normalizeCurve,
  normalizeFamilyBlueprint,
  normalizeIngredientOptions,
  normalizeMetricDefinition,
  normalizeRawDrink,
  parseUnifiedCatalogPayload,
  selectBalancedPool,
  serializeUnifiedCatalog,
} from "../utils/drinkEngine.js";

const DrinkContext = createContext(null);

const UNIFIED_STORAGE_KEY = "sbux_raw_catalog_v2";
const LEGACY_STORAGE_KEYS = ["sbux_drink_catalog_overrides", "sbux_family_archetypes"];

export const DrinkProvider = ({ children }) => {
  const [sourceCatalog, setSourceCatalog] = useState({
    ingredientOptions: SEED_INGREDIENT_OPTIONS,
    curves: SEED_CURVES,
    metrics: SEED_METRICS,
    families: SEED_FAMILIES,
    drinks: [],
  });
  const [ingredientOptions, setIngredientOptions] = useState(SEED_INGREDIENT_OPTIONS);
  const [curves, setCurves] = useState(SEED_CURVES);
  const [metrics, setMetrics] = useState(SEED_METRICS);
  const [families, setFamilies] = useState(SEED_FAMILIES);
  const [rawDrinks, setRawDrinks] = useState([]);
  const [hasLocalOverrides, setHasLocalOverrides] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));

    const loadCatalog = async () => {
      try {
        const baseUrl = import.meta.env.BASE_URL || "./";
        const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
        const res = await fetch(`${normalizedBase}data/drinks.json`);
        if (!res.ok) throw new Error(`HTTP ${res.status} fetching drinks.json`);

        const filePayload = await res.json();
        const parsedSource = parseUnifiedCatalogPayload(filePayload);
        setSourceCatalog(parsedSource);

        const localRaw = localStorage.getItem(UNIFIED_STORAGE_KEY);
        if (localRaw) {
          const parsedLocal = parseUnifiedCatalogPayload(JSON.parse(localRaw));
          // Merge any newly added ingredients from drinks.json into local overrides
          const mergedIngOptions = normalizeIngredientOptions({
            roasts: [...parsedSource.ingredientOptions.roasts, ...parsedLocal.ingredientOptions.roasts],
            milks: [...parsedSource.ingredientOptions.milks, ...parsedLocal.ingredientOptions.milks],
            syrups: [...parsedSource.ingredientOptions.syrups, ...parsedLocal.ingredientOptions.syrups],
            toppings: [...parsedSource.ingredientOptions.toppings, ...parsedLocal.ingredientOptions.toppings],
          });
          setIngredientOptions(mergedIngOptions);
          setCurves(parsedLocal.curves);
          setMetrics(parsedLocal.metrics);
          setFamilies(parsedLocal.families);
          setRawDrinks(parsedLocal.drinks);
          setHasLocalOverrides(true);
        } else {
          setIngredientOptions(parsedSource.ingredientOptions);
          setCurves(parsedSource.curves);
          setMetrics(parsedSource.metrics);
          setFamilies(parsedSource.families);
          setRawDrinks(parsedSource.drinks);
          setHasLocalOverrides(false);
        }
      } catch (err) {
        console.error("Error loading unified drink catalog:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadCatalog();
  }, []);

  const curvesMap = useMemo(() => buildCurvesMap(curves), [curves]);
  const metricsMap = useMemo(() => buildMetricsMap(metrics), [metrics]);
  const familiesMap = useMemo(() => buildFamiliesMap(families, curvesMap), [families, curvesMap]);
  const drinks = useMemo(
    () => compileCatalog(rawDrinks, families, curves, metrics),
    [rawDrinks, families, curves, metrics]
  );

  const persistRelationalState = useCallback(
    (
      nextFamilies,
      nextDrinks,
      nextCurves = curves,
      nextMetrics = metrics,
      nextIngredientOptions = ingredientOptions
    ) => {
      const payload = serializeUnifiedCatalog(
        nextFamilies,
        nextDrinks,
        nextCurves,
        nextMetrics,
        nextIngredientOptions
      );
      setIngredientOptions(payload.ingredientOptions);
      setCurves(payload.curves);
      setMetrics(payload.metrics);
      setFamilies(payload.families);
      setRawDrinks(payload.drinks);
      setHasLocalOverrides(true);
      localStorage.setItem(UNIFIED_STORAGE_KEY, JSON.stringify(payload));
    },
    [curves, ingredientOptions, metrics]
  );

  // --- Drink Catalog & Dynamic Ingredient Operations (Tab A) ---
  const upsertDrink = useCallback(
    (drinkInput) => {
      const clean = normalizeRawDrink(drinkInput, familiesMap);
      const exists = rawDrinks.some((d) => d.id === clean.id);
      const nextDrinks = exists
        ? rawDrinks.map((d) => (d.id === clean.id ? clean : d))
        : [...rawDrinks, clean];
      // Also auto-register any new syrups, toppings, roasts, or milks used on this drink
      const nextIngOptions = normalizeIngredientOptions({
        roasts: [...ingredientOptions.roasts, clean.ingredients?.roast].filter(Boolean),
        milks: [...ingredientOptions.milks, clean.ingredients?.milk].filter(Boolean),
        syrups: [...ingredientOptions.syrups, ...(clean.ingredients?.syrups || [])],
        toppings: [...ingredientOptions.toppings, ...(clean.ingredients?.toppings || [])],
      });
      persistRelationalState(families, nextDrinks, curves, metrics, nextIngOptions);
    },
    [curves, families, familiesMap, ingredientOptions, metrics, persistRelationalState, rawDrinks]
  );

  const addIngredientOption = useCallback(
    (category, value) => {
      const trimmed = String(value || "").trim();
      if (!trimmed || !ingredientOptions[category]) return null;
      const nextIngOptions = normalizeIngredientOptions({
        ...ingredientOptions,
        [category]: [...ingredientOptions[category], trimmed],
      });
      persistRelationalState(families, rawDrinks, curves, metrics, nextIngOptions);
      return trimmed;
    },
    [curves, families, ingredientOptions, metrics, persistRelationalState, rawDrinks]
  );

  const deleteDrink = useCallback(
    (drinkId) => {
      persistRelationalState(
        families,
        rawDrinks.filter((d) => d.id !== drinkId)
      );
    },
    [families, persistRelationalState, rawDrinks]
  );

  const toggleDrinkFlag = useCallback(
    (drinkId, field) => {
      const nextDrinks = rawDrinks.map((d) => {
        if (d.id !== drinkId) return d;
        if (field === "isActive") return { ...d, isActive: !d.isActive };
        if (field === "isFundamental" || field === "allowInSequencing") {
          return {
            ...d,
            curriculum: { ...d.curriculum, [field]: !d.curriculum?.[field] },
          };
        }
        return d;
      });
      persistRelationalState(families, nextDrinks);
    },
    [families, persistRelationalState, rawDrinks]
  );

  // --- Family Blueprint, Curve & Parameter Operations (Tab B) ---
  const upsertFamily = useCallback(
    (familyInput) => {
      const cleanFam = normalizeFamilyBlueprint(familyInput, curvesMap);
      const exists = families.some((f) => f.id === cleanFam.id);
      const nextFamilies = exists
        ? families.map((f) => (f.id === cleanFam.id ? cleanFam : f))
        : [...families, cleanFam];
      persistRelationalState(nextFamilies, rawDrinks);
    },
    [curvesMap, families, persistRelationalState, rawDrinks]
  );

  const deleteFamily = useCallback(
    (familyId) => {
      const dependentCount = rawDrinks.filter((d) => d.family === familyId).length;
      if (dependentCount > 0) {
        return {
          ok: false,
          reason: `Cannot delete "${familyId}": ${dependentCount} drink(s) are assigned to this family.`,
        };
      }
      persistRelationalState(
        families.filter((f) => f.id !== familyId),
        rawDrinks
      );
      return { ok: true };
    },
    [families, persistRelationalState, rawDrinks]
  );

  const upsertCurve = useCallback(
    (curveInput) => {
      const cleanCurve = normalizeCurve(curveInput);
      const exists = curves.some((c) => c.id === cleanCurve.id);
      const nextCurves = exists
        ? curves.map((c) => (c.id === cleanCurve.id ? cleanCurve : c))
        : [...curves, cleanCurve];
      persistRelationalState(families, rawDrinks, nextCurves, metrics);
      return cleanCurve;
    },
    [curves, families, metrics, persistRelationalState, rawDrinks]
  );

  const upsertMetric = useCallback(
    (metricInput) => {
      const cleanMetric = normalizeMetricDefinition(metricInput);
      const exists = metrics.some((m) => m.key === cleanMetric.key);
      const nextMetrics = exists
        ? metrics.map((m) => (m.key === cleanMetric.key ? cleanMetric : m))
        : [...metrics, cleanMetric];
      persistRelationalState(families, rawDrinks, curves, nextMetrics);
      return cleanMetric;
    },
    [curves, families, metrics, persistRelationalState, rawDrinks]
  );

  // --- JSON Dashboard & Sync Operations ---
  const exportUnifiedCatalogJSON = useCallback(() => {
    return JSON.stringify(
      serializeUnifiedCatalog(families, rawDrinks, curves, metrics, ingredientOptions),
      null,
      2
    );
  }, [curves, families, ingredientOptions, metrics, rawDrinks]);

  const resetCatalogToSource = useCallback(() => {
    localStorage.removeItem(UNIFIED_STORAGE_KEY);
    setIngredientOptions(sourceCatalog.ingredientOptions);
    setCurves(sourceCatalog.curves);
    setMetrics(sourceCatalog.metrics);
    setFamilies(sourceCatalog.families);
    setRawDrinks(sourceCatalog.drinks);
    setHasLocalOverrides(false);
  }, [sourceCatalog]);

  const getBalancedQuizPool = useCallback(
    (options) => selectBalancedPool(drinks, options),
    [drinks]
  );

  const value = useMemo(
    () => ({
      drinks,
      rawDrinks,
      families,
      familiesMap,
      curves,
      curvesMap,
      metrics,
      metricsMap,
      ingredientOptions,
      isLoading,
      hasLocalOverrides,
      upsertDrink,
      addIngredientOption,
      deleteDrink,
      toggleDrinkFlag,
      upsertFamily,
      deleteFamily,
      upsertCurve,
      upsertMetric,
      exportUnifiedCatalogJSON,
      resetCatalogToSource,
      getBalancedQuizPool,
    }),
    [
      drinks,
      rawDrinks,
      families,
      familiesMap,
      curves,
      curvesMap,
      metrics,
      metricsMap,
      ingredientOptions,
      isLoading,
      hasLocalOverrides,
      upsertDrink,
      addIngredientOption,
      deleteDrink,
      toggleDrinkFlag,
      upsertFamily,
      deleteFamily,
      upsertCurve,
      upsertMetric,
      exportUnifiedCatalogJSON,
      resetCatalogToSource,
      getBalancedQuizPool,
    ]
  );

  return <DrinkContext.Provider value={value}>{children}</DrinkContext.Provider>;
};

export const useDrinkCatalog = () => {
  const context = useContext(DrinkContext);
  if (!context) {
    throw new Error("useDrinkCatalog must be used within a DrinkProvider");
  }
  return context;
};
