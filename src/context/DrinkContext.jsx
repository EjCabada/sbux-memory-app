/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from "react";
import {
  SEED_FAMILIES,
  buildFamiliesMap,
  compileCatalog,
  normalizeFamilyBlueprint,
  normalizeRawDrink,
  parseUnifiedCatalogPayload,
  selectBalancedPool,
  serializeUnifiedCatalog,
} from "../utils/drinkEngine.js";

const DrinkContext = createContext(null);

const UNIFIED_STORAGE_KEY = "sbux_raw_catalog_v2";
const LEGACY_STORAGE_KEYS = ["sbux_drink_catalog_overrides", "sbux_family_archetypes"];

export const DrinkProvider = ({ children }) => {
  const [sourceCatalog, setSourceCatalog] = useState({ families: SEED_FAMILIES, drinks: [] });
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
          setFamilies(parsedLocal.families);
          setRawDrinks(parsedLocal.drinks);
          setHasLocalOverrides(true);
        } else {
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

  const familiesMap = useMemo(() => buildFamiliesMap(families), [families]);
  const drinks = useMemo(() => compileCatalog(rawDrinks, families), [rawDrinks, families]);

  const persistRelationalState = useCallback((nextFamilies, nextDrinks) => {
    const payload = serializeUnifiedCatalog(nextFamilies, nextDrinks);
    setFamilies(payload.families);
    setRawDrinks(payload.drinks);
    setHasLocalOverrides(true);
    localStorage.setItem(UNIFIED_STORAGE_KEY, JSON.stringify(payload));
  }, []);

  // --- Drink Catalog Operations (Tab A) ---
  const upsertDrink = useCallback(
    (drinkInput) => {
      const clean = normalizeRawDrink(drinkInput, familiesMap);
      const exists = rawDrinks.some((d) => d.id === clean.id);
      const nextDrinks = exists
        ? rawDrinks.map((d) => (d.id === clean.id ? clean : d))
        : [...rawDrinks, clean];
      persistRelationalState(families, nextDrinks);
    },
    [families, familiesMap, persistRelationalState, rawDrinks]
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

  // --- Family Blueprint Operations (Tab B) ---
  const upsertFamily = useCallback(
    (familyInput) => {
      const cleanFam = normalizeFamilyBlueprint(familyInput);
      const exists = families.some((f) => f.id === cleanFam.id);
      const nextFamilies = exists
        ? families.map((f) => (f.id === cleanFam.id ? cleanFam : f))
        : [...families, cleanFam];
      persistRelationalState(nextFamilies, rawDrinks);
    },
    [families, persistRelationalState, rawDrinks]
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

  // --- JSON Dashboard & Sync Operations ---
  const exportUnifiedCatalogJSON = useCallback(() => {
    return JSON.stringify(serializeUnifiedCatalog(families, rawDrinks), null, 2);
  }, [families, rawDrinks]);

  const resetCatalogToSource = useCallback(() => {
    localStorage.removeItem(UNIFIED_STORAGE_KEY);
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
      isLoading,
      hasLocalOverrides,
      upsertDrink,
      deleteDrink,
      toggleDrinkFlag,
      upsertFamily,
      deleteFamily,
      exportUnifiedCatalogJSON,
      resetCatalogToSource,
      getBalancedQuizPool,
    }),
    [
      drinks,
      rawDrinks,
      families,
      familiesMap,
      isLoading,
      hasLocalOverrides,
      upsertDrink,
      deleteDrink,
      toggleDrinkFlag,
      upsertFamily,
      deleteFamily,
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
