import React, { useState, useMemo } from "react";
import { useDrinkCatalog } from "../context/DrinkContext.jsx";
import {
  ACTION_DICTIONARY,
  ALL_SIZE_KEYS,
  BUILD_TEMPLATES,
  COLD_FOAM_MAP,
  COLD_FOAM_PRESETS,
  SIZE_SPECS,
  TOPPING_OPTIONS,
  compileDrink,
  generateWorkflow,
  getActionLabel,
  getDefaultIngredientsForDrink,
  normalizeCurve,
  normalizeFamilyBlueprint,
} from "../utils/drinkEngine.js";
import styles from "./DrinkManager.module.css";

const SUGGESTED_SEASONS = ["Core", "Fall 2025", "Winter 2026", "Spring 2026", "Summer 2026", "Fall 2026"];

const createBlankDrink = (defaultFamily) => {
  const famId = defaultFamily?.id || "latte";
  const defaultIng = getDefaultIngredientsForDrink(famId);
  return {
    id: `drink_${Date.now()}`,
    name: "",
    family: famId,
    station: defaultFamily?.defaultStation || "espresso_bar",
    season: "Core",
    isActive: true,
    temps: defaultFamily?.defaultTemps ? [...defaultFamily.defaultTemps] : ["hot", "iced"],
    shotType: defaultFamily?.defaultShotType || "standard",
    pumpsDelta: 0,
    hasWhip: false,
    hasColdFoam: false,
    coldFoamType: "vsc",
    coldFoamRecipe: COLD_FOAM_MAP.vsc.recipe,
    includeSyrupStep: famId !== "cappuccino" && famId !== "flat_white",
    ingredients: {
      roast: defaultIng.roast,
      milk: defaultIng.milk,
      syrups: [],
      toppings: [],
    },
    toppings: [],
    curriculum: {
      isFundamental: true,
      allowInSequencing: true,
    },
    comments: "",
  };
};

const createBlankFamily = () => ({
  id: "",
  label: "",
  defaultStation: "espresso_bar",
  defaultTemps: ["hot", "iced"],
  baseSizes: ["tall", "grande", "venti_hot", "venti_iced"],
  shotCurve: "espressoShots",
  defaultShotType: "standard",
  primaryPumpMetric: "syrup_pumps",
  pumpCurve: "hotBarPumps",
  extraMetrics: {},
  buildTemplate: "espresso_standard",
});

const createBlankCurveDraft = (category = "pumps") => ({
  id: "",
  label: "",
  category,
  values: {
    short: "",
    tall: 2,
    grande: 3,
    venti_hot: 4,
    venti_iced: 4,
    trenta: "",
  },
});

const DrinkManager = () => {
  const {
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
  } = useDrinkCatalog();

  const [activeTab, setActiveTab] = useState("catalog");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeason, setFilterSeason] = useState("all");
  const [filterFamily, setFilterFamily] = useState("all");
  const [isJsonPreviewOpen, setIsJsonPreviewOpen] = useState(false);

  // Tab A Modal State
  const [editingDrink, setEditingDrink] = useState(null);
  const [isDrinkModalOpen, setIsDrinkModalOpen] = useState(false);
  const [selectedSyrupToAdd, setSelectedSyrupToAdd] = useState("");
  const [newSyrupInput, setNewSyrupInput] = useState("");
  const [selectedToppingToAdd, setSelectedToppingToAdd] = useState("");
  const [newToppingInput, setNewToppingInput] = useState("");
  const [newFinishingToggleInput, setNewFinishingToggleInput] = useState("");
  const [stepToAddByTemp, setStepToAddByTemp] = useState({ hot: "", iced: "" });
  const [customStepTextByTemp, setCustomStepTextByTemp] = useState({ hot: "", iced: "" });

  // Tab B Editor State
  const [selectedFamilyId, setSelectedFamilyId] = useState("latte");
  const [familyDraft, setFamilyDraft] = useState(() =>
    normalizeFamilyBlueprint(families[0] || createBlankFamily(), curvesMap)
  );
  const [isCreatingNewFamily, setIsCreatingNewFamily] = useState(false);
  const [statusBanner, setStatusBanner] = useState(null);

  // Tab B Custom Curve & Parameter Builder State
  const [isCurveBuilderOpen, setIsCurveBuilderOpen] = useState(false);
  const [curveDraft, setCurveDraft] = useState(() => createBlankCurveDraft("pumps"));
  const [isMetricBuilderOpen, setIsMetricBuilderOpen] = useState(false);
  const [metricDraft, setMetricDraft] = useState({ key: "", label: "" });

  const seasonOptions = useMemo(() => {
    const set = new Set([...SUGGESTED_SEASONS, ...rawDrinks.map((d) => d.season).filter(Boolean)]);
    return Array.from(set);
  }, [rawDrinks]);

  const extraMetricOptions = useMemo(() => {
    return metrics.filter((m) => m.key !== "shots" && m.key !== "syrup_pumps");
  }, [metrics]);

  const filteredDrinks = useMemo(() => {
    return rawDrinks.filter((d) => {
      const matchesName = d.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSeason = filterSeason === "all" || d.season === filterSeason;
      const matchesFam = filterFamily === "all" || d.family === filterFamily;
      return matchesName && matchesSeason && matchesFam;
    });
  }, [rawDrinks, searchQuery, filterSeason, filterFamily]);

  const similarNames = useMemo(() => {
    if (!editingDrink || !editingDrink.name.trim()) return [];
    const q = editingDrink.name.trim().toLowerCase();
    return rawDrinks.filter((d) => d.id !== editingDrink.id && d.name.toLowerCase().includes(q));
  }, [editingDrink, rawDrinks]);

  // Live Engine Output Preview for Tab A Modal
  const liveCompiledDrink = useMemo(() => {
    if (!editingDrink) return null;
    return compileDrink(editingDrink, familiesMap, curvesMap, metricsMap);
  }, [editingDrink, familiesMap, curvesMap, metricsMap]);

  // Live Engine Output Preview for Tab B Family Editor
  const liveFamilyPreview = useMemo(() => {
    if (!familyDraft) return null;
    const normalizedFam = normalizeFamilyBlueprint(familyDraft, curvesMap);
    const previewMap = { ...familiesMap, [normalizedFam.id]: normalizedFam };
    const sampleRaw = createBlankDrink(normalizedFam);
    sampleRaw.name = `${normalizedFam.label || "Sample"} (Baseline Preview)`;
    return compileDrink(sampleRaw, previewMap, curvesMap, metricsMap);
  }, [familyDraft, familiesMap, curvesMap, metricsMap]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <p>Loading Relational Drink Manager...</p>
      </div>
    );
  }

  // --- JSON Dashboard Handlers ---
  const handleDownloadUnifiedJSON = () => {
    const jsonStr = exportUnifiedCatalogJSON();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "drinks.json";
    link.click();
    URL.revokeObjectURL(url);
    setStatusBanner("Downloaded unified drinks.json (schema v2.3: ingredients + curves + metrics + families + drinks).");
  };

  const handleCopyUnifiedJSON = async () => {
    await navigator.clipboard.writeText(exportUnifiedCatalogJSON());
    setStatusBanner("Copied unified catalog JSON to clipboard.");
  };

  const handleResetToSource = () => {
    if (window.confirm("Discard local browser edits and reload public/data/drinks.json?")) {
      resetCatalogToSource();
      setStatusBanner("Restored catalog, ingredient registries, curves, and family blueprints from public/data/drinks.json.");
    }
  };

  // --- Tab A Handlers ---
  const handleOpenAddDrink = () => {
    const defaultFam = families[0];
    setEditingDrink(createBlankDrink(defaultFam));
    setSelectedSyrupToAdd("");
    setNewSyrupInput("");
    setSelectedToppingToAdd("");
    setNewToppingInput("");
    setIsDrinkModalOpen(true);
  };

  const handleOpenEditDrink = (rawDrink) => {
    const hasColdFoam = Boolean(rawDrink.hasColdFoam);
    const foamType = hasColdFoam && COLD_FOAM_MAP[rawDrink.coldFoamType] ? rawDrink.coldFoamType : "vsc";
    const foamRecipe = hasColdFoam
      ? rawDrink.coldFoamRecipe || COLD_FOAM_MAP[foamType]?.recipe || ""
      : COLD_FOAM_MAP.vsc.recipe;
    const defaultIng = getDefaultIngredientsForDrink(rawDrink.family, rawDrink);
    const ing = rawDrink.ingredients || {};

    setEditingDrink({
      ...rawDrink,
      pumpsDelta: rawDrink.family === "frappuccino" ? 0 : Number(rawDrink.pumpsDelta) || 0,
      hasWhip: Boolean(rawDrink.hasWhip),
      hasColdFoam,
      coldFoamType: foamType,
      coldFoamRecipe: foamRecipe,
      ingredients: {
        roast: ing.roast || defaultIng.roast,
        milk: ing.milk || defaultIng.milk,
        syrups: Array.isArray(ing.syrups) ? [...ing.syrups] : [],
        toppings: Array.isArray(ing.toppings) ? [...ing.toppings] : [],
      },
      temps: [...rawDrink.temps],
      toppings: [...(rawDrink.toppings || [])],
      curriculum: { ...rawDrink.curriculum },
    });
    setSelectedSyrupToAdd("");
    setNewSyrupInput("");
    setSelectedToppingToAdd("");
    setNewToppingInput("");
    setIsDrinkModalOpen(true);
  };

  const handleDrinkFamilyChange = (newFamId) => {
    const fam = familiesMap[newFamId];
    if (!fam) return;
    const defaultIng = getDefaultIngredientsForDrink(newFamId);
    setEditingDrink((prev) => ({
      ...prev,
      family: newFamId,
      station: fam.defaultStation,
      temps: [...fam.defaultTemps],
      shotType: fam.defaultShotType,
      pumpsDelta: newFamId === "frappuccino" ? 0 : prev.pumpsDelta,
      includeSyrupStep: newFamId !== "cappuccino" && newFamId !== "flat_white",
      ingredients: {
        ...(prev.ingredients || {}),
        roast: prev.ingredients?.roast || defaultIng.roast,
        milk: prev.ingredients?.milk || defaultIng.milk,
        syrups: prev.ingredients?.syrups || [],
        toppings: prev.ingredients?.toppings || [],
      },
    }));
  };

  // --- Malleable Ingredients ("What It Contains") Handlers ---
  const handleIngredientFieldChange = (field, val) => {
    setEditingDrink((prev) => ({
      ...prev,
      ingredients: {
        ...(prev.ingredients || {}),
        [field]: val,
      },
    }));
  };

  const handleAddSyrupToDrink = (syrupName) => {
    const trimmed = String(syrupName || "").trim();
    if (!trimmed) return;
    addIngredientOption("syrups", trimmed);
    setEditingDrink((prev) => {
      const current = prev.ingredients?.syrups || [];
      if (current.some((s) => s.toLowerCase() === trimmed.toLowerCase())) return prev;
      return {
        ...prev,
        includeSyrupStep: true,
        ingredients: {
          ...(prev.ingredients || {}),
          syrups: [...current, trimmed],
        },
      };
    });
  };

  const handleRemoveSyrupFromDrink = (syrupName) => {
    setEditingDrink((prev) => ({
      ...prev,
      ingredients: {
        ...(prev.ingredients || {}),
        syrups: (prev.ingredients?.syrups || []).filter((s) => s !== syrupName),
      },
    }));
  };

  const handleAddToppingIngredientToDrink = (toppingName) => {
    const trimmed = String(toppingName || "").trim();
    if (!trimmed) return;
    addIngredientOption("toppings", trimmed);
    setEditingDrink((prev) => {
      const current = prev.ingredients?.toppings || [];
      if (current.some((t) => t.toLowerCase() === trimmed.toLowerCase())) return prev;
      return {
        ...prev,
        ingredients: {
          ...(prev.ingredients || {}),
          toppings: [...current, trimmed],
        },
      };
    });
  };

  const handleRemoveToppingIngredientFromDrink = (toppingName) => {
    setEditingDrink((prev) => ({
      ...prev,
      ingredients: {
        ...(prev.ingredients || {}),
        toppings: (prev.ingredients?.toppings || []).filter((t) => t !== toppingName),
      },
    }));
  };

  const handleColdFoamToggle = (checked) => {
    setEditingDrink((prev) => {
      const nextType = prev.coldFoamType && prev.coldFoamType !== "none" ? prev.coldFoamType : "vsc";
      const nextRecipe =
        prev.coldFoamRecipe || COLD_FOAM_MAP[nextType]?.recipe || COLD_FOAM_MAP.vsc.recipe;
      return {
        ...prev,
        hasColdFoam: checked,
        coldFoamType: checked ? nextType : "none",
        coldFoamRecipe: checked ? nextRecipe : "",
      };
    });
  };

  const handleColdFoamPresetChange = (presetId) => {
    const preset = COLD_FOAM_MAP[presetId];
    setEditingDrink((prev) => ({
      ...prev,
      coldFoamType: presetId,
      coldFoamRecipe: preset ? preset.recipe : prev.coldFoamRecipe,
    }));
  };

  const handleToggleDrinkTemp = (temp) => {
    setEditingDrink((prev) => {
      const exists = prev.temps.includes(temp);
      const nextTemps = exists ? prev.temps.filter((t) => t !== temp) : [...prev.temps, temp];
      return { ...prev, temps: nextTemps.length > 0 ? nextTemps : [temp] };
    });
  };

  const handleToggleDrinkTopping = (toppingId) => {
    setEditingDrink((prev) => {
      const exists = prev.toppings.includes(toppingId);
      const nextToppings = exists
        ? prev.toppings.filter((t) => t !== toppingId)
        : [...prev.toppings, toppingId];
      return { ...prev, toppings: nextToppings };
    });
  };

  const handleAddCustomFinishingToggle = () => {
    const label = String(newFinishingToggleInput || "").trim();
    if (!label) return;
    const slug = `add_topping_${label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")}`;
    addIngredientOption("toppings", label);
    setEditingDrink((prev) => {
      const nextToppings = prev.toppings.includes(slug) ? prev.toppings : [...prev.toppings, slug];
      const currentIngToppings = prev.ingredients?.toppings || [];
      const nextIngToppings = currentIngToppings.some((t) => t.toLowerCase() === label.toLowerCase())
        ? currentIngToppings
        : [...currentIngToppings, label];
      return {
        ...prev,
        toppings: nextToppings,
        ingredients: {
          ...(prev.ingredients || {}),
          toppings: nextIngToppings,
        },
      };
    });
    setNewFinishingToggleInput("");
  };

  // --- Drink-Specific Build Step Override Handlers (only saved when non-default) ---
  const handleEnableCustomBuildForTemp = (tempMode) => {
    setEditingDrink((prev) => {
      const withoutCustom = { ...prev, customSteps: undefined };
      const defaultWf = generateWorkflow(withoutCustom, tempMode, null, familiesMap);
      const baseSteps = defaultWf?.steps ? [...defaultWf.steps] : ["add_lid", "connect_handoff"];
      return {
        ...prev,
        customSteps: {
          ...(prev.customSteps || {}),
          [tempMode]: baseSteps,
        },
      };
    });
  };

  const handleResetBuildToDefault = (tempMode = null) => {
    setEditingDrink((prev) => {
      if (!tempMode) {
        const next = { ...prev };
        delete next.customSteps;
        delete next.buildOverride;
        return next;
      }
      const nextCustom = { ...(prev.customSteps || {}) };
      delete nextCustom[tempMode];
      const next = { ...prev };
      if (Object.keys(nextCustom).length > 0) {
        next.customSteps = nextCustom;
      } else {
        delete next.customSteps;
      }
      return next;
    });
  };

  const handleMoveCustomStep = (tempMode, index, direction) => {
    setEditingDrink((prev) => {
      const list = [...(prev.customSteps?.[tempMode] || [])];
      const targetIdx = index + direction;
      if (targetIdx < 0 || targetIdx >= list.length) return prev;
      const [item] = list.splice(index, 1);
      list.splice(targetIdx, 0, item);
      return {
        ...prev,
        customSteps: {
          ...(prev.customSteps || {}),
          [tempMode]: list,
        },
      };
    });
  };

  const handleRemoveCustomStep = (tempMode, index) => {
    setEditingDrink((prev) => {
      const list = (prev.customSteps?.[tempMode] || []).filter((_, idx) => idx !== index);
      return {
        ...prev,
        customSteps: {
          ...(prev.customSteps || {}),
          [tempMode]: list,
        },
      };
    });
  };

  const handleAddCustomStep = (tempMode, actionIdOrCustom) => {
    if (!actionIdOrCustom) return;
    setEditingDrink((prev) => {
      const list = [...(prev.customSteps?.[tempMode] || [])];
      const lidIdx = list.indexOf("add_lid");
      if (lidIdx >= 0) {
        list.splice(lidIdx, 0, actionIdOrCustom);
      } else {
        list.push(actionIdOrCustom);
      }
      return {
        ...prev,
        customSteps: {
          ...(prev.customSteps || {}),
          [tempMode]: list,
        },
      };
    });
  };

  const handleSaveDrink = (e) => {
    e.preventDefault();
    const slugId =
      editingDrink.id.startsWith("drink_") && editingDrink.name.trim()
        ? editingDrink.name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_|_$/g, "")
        : editingDrink.id;

    upsertDrink({ ...editingDrink, id: slugId });
    setIsDrinkModalOpen(false);
    setStatusBanner(`Saved "${editingDrink.name}" into catalog.`);
  };

  // --- Tab B Handlers ---
  const handleSelectFamilyForEdit = (famId) => {
    const found = familiesMap[famId] || families[0];
    if (!found) return;
    setIsCreatingNewFamily(false);
    setSelectedFamilyId(found.id);
    setFamilyDraft(JSON.parse(JSON.stringify(found)));
  };

  const handleStartNewFamily = () => {
    setIsCreatingNewFamily(true);
    setFamilyDraft(createBlankFamily());
  };

  const handleToggleFamilyTemp = (temp) => {
    setFamilyDraft((prev) => {
      const exists = prev.defaultTemps.includes(temp);
      const next = exists ? prev.defaultTemps.filter((t) => t !== temp) : [...prev.defaultTemps, temp];
      return { ...prev, defaultTemps: next.length > 0 ? next : [temp] };
    });
  };

  const handleToggleFamilySize = (sizeKey) => {
    setFamilyDraft((prev) => {
      const exists = prev.baseSizes.includes(sizeKey);
      const next = exists ? prev.baseSizes.filter((s) => s !== sizeKey) : [...prev.baseSizes, sizeKey];
      const ordered = ALL_SIZE_KEYS.filter((k) => next.includes(k));
      return { ...prev, baseSizes: ordered.length > 0 ? ordered : [sizeKey] };
    });
  };

  const handleExtraMetricChange = (metricKey, curveId) => {
    setFamilyDraft((prev) => {
      const nextExtra = { ...(prev.extraMetrics || {}) };
      if (!curveId || curveId === "none") delete nextExtra[metricKey];
      else nextExtra[metricKey] = curveId;
      return { ...prev, extraMetrics: nextExtra };
    });
  };

  const handleOpenCurveBuilder = (category = "pumps", existingCurveId = null) => {
    if (existingCurveId && existingCurveId !== "none") {
      const found = curves.find((c) => c.id === existingCurveId);
      if (found) {
        setCurveDraft({
          id: found.id,
          label: found.label,
          category: found.category || category,
          values: {
            short: found.values.short ?? "",
            tall: found.values.tall ?? "",
            grande: found.values.grande ?? "",
            venti_hot: found.values.venti_hot ?? "",
            venti_iced: found.values.venti_iced ?? "",
            trenta: found.values.trenta ?? "",
          },
        });
        setIsCurveBuilderOpen(true);
        return;
      }
    }
    setCurveDraft(createBlankCurveDraft(category));
    setIsCurveBuilderOpen(true);
  };

  const handleSaveCustomCurve = () => {
    if (!curveDraft.label.trim()) return;
    const rawId =
      curveDraft.id.trim() ||
      curveDraft.label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_");
    const saved = upsertCurve(normalizeCurve({ ...curveDraft, id: rawId }));

    if (saved.category === "shots") {
      setFamilyDraft((prev) => ({ ...prev, shotCurve: saved.id }));
    } else if (saved.category === "pumps") {
      setFamilyDraft((prev) => ({ ...prev, pumpCurve: saved.id }));
    }
    setIsCurveBuilderOpen(false);
    setStatusBanner(`Saved progression curve "${saved.label}" (${saved.id}).`);
  };

  const handleSaveCustomMetric = () => {
    if (!metricDraft.label.trim()) return;
    const rawKey =
      metricDraft.key.trim() ||
      metricDraft.label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_]+/g, "_");
    const saved = upsertMetric({ key: rawKey, label: metricDraft.label.trim() });
    setMetricDraft({ key: "", label: "" });
    setIsMetricBuilderOpen(false);
    setStatusBanner(`Added parameter "${saved.label}" (${saved.key}). Assign a curve below!`);
  };

  const handleSaveFamilyBlueprint = (e) => {
    e.preventDefault();
    if (!familyDraft.id.trim() || !familyDraft.label.trim()) return;
    const normalized = normalizeFamilyBlueprint(familyDraft, curvesMap);
    upsertFamily(normalized);
    setIsCreatingNewFamily(false);
    setSelectedFamilyId(normalized.id);
    setFamilyDraft(normalized);
    setStatusBanner(`Saved family blueprint "${normalized.label}" (${normalized.id}). All linked drinks updated.`);
  };

  const handleRemoveFamily = () => {
    if (!window.confirm(`Delete family blueprint "${familyDraft.label}"?`)) return;
    const result = deleteFamily(familyDraft.id);
    if (!result.ok) {
      alert(result.reason);
      return;
    }
    const fallback = families.find((f) => f.id !== familyDraft.id) || createBlankFamily();
    setSelectedFamilyId(fallback.id);
    setFamilyDraft(fallback);
    setStatusBanner("Deleted family blueprint.");
  };

  const shotCurves = curves.filter((c) => c.category === "shots");
  const pumpAndParamCurves = curves.filter((c) => c.category !== "shots");

  return (
    <div className={styles.container}>
      {/* JSON DEPLOYMENT DASHBOARD */}
      <div className={styles.jsonDashboard}>
        <div className={styles.dashboardInfo}>
          <div className={styles.dashboardTitleRow}>
            <h3>Unified Relational Catalog (Schema v2.3)</h3>
            <span className={hasLocalOverrides ? styles.overrideBadgeActive : styles.overrideBadgeSynced}>
              {hasLocalOverrides ? "Local Browser Edits Active" : "Synced with public/data/drinks.json"}
            </span>
          </div>
          <p>
            <strong>{rawDrinks.length}</strong> Drinks &bull; <strong>{families.length}</strong> Families &bull;{" "}
            <strong>{ingredientOptions.syrups.length}</strong> Syrups &bull;{" "}
            <strong>{curves.length}</strong> Curves
          </p>
        </div>
        <div className={styles.dashboardActions}>
          <button className={styles.exportBtn} onClick={handleDownloadUnifiedJSON}>
            Download Unified Catalog JSON
          </button>
          <button className={styles.secondaryBtn} onClick={handleCopyUnifiedJSON}>
            Copy JSON
          </button>
          <button
            className={styles.secondaryBtn}
            onClick={() => setIsJsonPreviewOpen((prev) => !prev)}
          >
            {isJsonPreviewOpen ? "Hide Raw JSON" : "Inspect JSON"}
          </button>
          {hasLocalOverrides && (
            <button className={styles.resetSourceBtn} onClick={handleResetToSource}>
              Reset to Repo JSON
            </button>
          )}
        </div>
      </div>

      {statusBanner && (
        <div className={styles.statusBanner} onClick={() => setStatusBanner(null)}>
          <span>{statusBanner}</span>
          <button type="button">&times;</button>
        </div>
      )}

      {isJsonPreviewOpen && (
        <pre className={styles.jsonInspectorPre}>{exportUnifiedCatalogJSON()}</pre>
      )}

      {/* MAIN NAVIGATION TABS */}
      <div className={styles.navTabs}>
        <button
          className={`${styles.tabBtn} ${activeTab === "catalog" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("catalog")}
        >
          Tab A: Drink Catalog ({rawDrinks.length})
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "families" ? styles.activeTab : ""}`}
          onClick={() => {
            setActiveTab("families");
            handleSelectFamilyForEdit(selectedFamilyId);
          }}
        >
          Tab B: Family Blueprint Editor ({families.length})
        </button>
      </div>

      {/* =================================================================== */}
      {/* TAB A: DRINK CATALOG                                                */}
      {/* =================================================================== */}
      {activeTab === "catalog" && (
        <>
          <div className={styles.headerRow}>
            <div>
              <h2>Drink Catalog</h2>
              <p>Configure drink ingredients (&ldquo;What It Contains&rdquo;), syrups, cold foams, and curriculum flags.</p>
            </div>
            <button className={styles.addBtn} onClick={handleOpenAddDrink}>
              + New Drink
            </button>
          </div>

          <div className={styles.filterRow}>
            <input
              type="text"
              placeholder="Search drinks..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <select value={filterSeason} onChange={(e) => setFilterSeason(e.target.value)}>
              <option value="all">All Seasons</option>
              {seasonOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <select value={filterFamily} onChange={(e) => setFilterFamily(e.target.value)}>
              <option value="all">All Families</option>
              {families.map((f) => (
                <option key={f.id} value={f.id}>{f.label}</option>
              ))}
            </select>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.drinkTable}>
              <thead>
                <tr>
                  <th>Active</th>
                  <th>Drink Name &amp; What It Contains</th>
                  <th>Family Blueprint</th>
                  <th>Season</th>
                  <th>Essentials (isFundamental)</th>
                  <th>Sequencing</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrinks.map((d) => {
                  const ing = d.ingredients || {};
                  const summaryParts = [
                    ing.roast,
                    ing.milk,
                    ...(ing.syrups || []),
                    ...(ing.toppings || []),
                  ].filter(Boolean);
                  return (
                    <tr key={d.id} className={!d.isActive ? styles.inactiveRow : ""}>
                      <td>
                        <input
                          type="checkbox"
                          checked={d.isActive}
                          onChange={() => toggleDrinkFlag(d.id, "isActive")}
                        />
                      </td>
                      <td>
                        <strong>{d.name}</strong>
                        <div className={styles.subMeta}>
                          {summaryParts.join(" • ")}
                          {d.hasColdFoam && d.coldFoamRecipe ? ` • Foam: ${d.coldFoamRecipe}` : ""}
                        </div>
                      </td>
                      <td>
                        <code>{d.family}</code>
                      </td>
                      <td>
                        <span className={styles.seasonTag}>{d.season}</span>
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={Boolean(d.curriculum?.isFundamental)}
                          onChange={() => toggleDrinkFlag(d.id, "isFundamental")}
                        />
                      </td>
                      <td>
                        <input
                          type="checkbox"
                          checked={Boolean(d.curriculum?.allowInSequencing)}
                          onChange={() => toggleDrinkFlag(d.id, "allowInSequencing")}
                        />
                      </td>
                      <td>
                        <button className={styles.actionBtnEdit} onClick={() => handleOpenEditDrink(d)}>
                          Edit
                        </button>
                        <button
                          className={styles.actionBtnDel}
                          onClick={() => {
                            if (window.confirm(`Delete "${d.name}"?`)) deleteDrink(d.id);
                          }}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* =================================================================== */}
      {/* TAB B: FAMILY BLUEPRINT EDITOR                                      */}
      {/* =================================================================== */}
      {activeTab === "families" && (
        <div className={styles.archContainer}>
          <div className={styles.headerRow}>
            <div>
              <h2>Family Blueprint &amp; Curve Editor</h2>
              <p>Create new drink families, define custom shot/pump progressions, or register new ingredient parameters.</p>
            </div>
            <div className={styles.dashboardActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => handleOpenCurveBuilder("pumps")}
              >
                + New Shot / Pump Curve
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => setIsMetricBuilderOpen((prev) => !prev)}
              >
                + New Parameter
              </button>
              <button className={styles.addBtn} onClick={handleStartNewFamily}>
                + New Family Blueprint
              </button>
            </div>
          </div>

          {/* INLINE CUSTOM CURVE BUILDER */}
          {isCurveBuilderOpen && (
            <div className={styles.builderPanel}>
              <div className={styles.builderHeader}>
                <h4>Create / Edit Progression Curve (Shots, Pumps, or Scoops per Size)</h4>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setIsCurveBuilderOpen(false)}
                >
                  Close
                </button>
              </div>
              <div className={styles.inlineThree}>
                <div className={styles.formGroup}>
                  <label>Curve Category:</label>
                  <select
                    value={curveDraft.category}
                    onChange={(e) => setCurveDraft({ ...curveDraft, category: e.target.value })}
                  >
                    <option value="shots">Shot Curve (Espresso / Ristretto)</option>
                    <option value="pumps">Pump Curve (Syrups / Sauces / Base)</option>
                    <option value="parameter">Ingredient Curve (Scoops / Bags / Packets)</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Display Label:</label>
                  <input
                    type="text"
                    placeholder="e.g. Half-Sweet Pumps (1 / 2 / 2 / 3)"
                    value={curveDraft.label}
                    onChange={(e) => setCurveDraft({ ...curveDraft, label: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Curve ID (optional slug):</label>
                  <input
                    type="text"
                    placeholder="e.g. halfSweetPumps"
                    value={curveDraft.id}
                    onChange={(e) => setCurveDraft({ ...curveDraft, id: e.target.value })}
                  />
                </div>
              </div>
              <div className={styles.sizeInputsGrid}>
                {ALL_SIZE_KEYS.map((sKey) => (
                  <div key={sKey} className={styles.formGroup}>
                    <label>{SIZE_SPECS[sKey].shortLabel}:</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="—"
                      value={curveDraft.values[sKey] ?? ""}
                      onChange={(e) =>
                        setCurveDraft({
                          ...curveDraft,
                          values: { ...curveDraft.values, [sKey]: e.target.value },
                        })
                      }
                    />
                  </div>
                ))}
              </div>
              <div className={styles.modalBtnRow}>
                <button type="button" className={styles.saveBtn} onClick={handleSaveCustomCurve}>
                  Save Progression Curve
                </button>
              </div>
            </div>
          )}

          {/* INLINE CUSTOM PARAMETER (METRIC) BUILDER */}
          {isMetricBuilderOpen && (
            <div className={styles.builderPanel}>
              <div className={styles.builderHeader}>
                <h4>Register New Ingredient Parameter (e.g. Salt Packets, Protein Scoops, Pearls)</h4>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setIsMetricBuilderOpen(false)}
                >
                  Close
                </button>
              </div>
              <div className={styles.inlineThree}>
                <div className={styles.formGroup}>
                  <label>Parameter Display Label:</label>
                  <input
                    type="text"
                    placeholder="e.g. Salt Packets"
                    value={metricDraft.label}
                    onChange={(e) => setMetricDraft({ ...metricDraft, label: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Parameter Key (slug):</label>
                  <input
                    type="text"
                    placeholder="e.g. salt_packets"
                    value={metricDraft.key}
                    onChange={(e) => setMetricDraft({ ...metricDraft, key: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup} style={{ justifyContent: "flex-end" }}>
                  <button type="button" className={styles.saveBtn} onClick={handleSaveCustomMetric}>
                    Save Parameter
                  </button>
                </div>
              </div>
            </div>
          )}

          {!isCreatingNewFamily && (
            <div className={styles.archSelectorRow}>
              <label>Select Existing Family Blueprint:</label>
              <select
                value={selectedFamilyId}
                onChange={(e) => handleSelectFamilyForEdit(e.target.value)}
              >
                {families.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label} ({f.id})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={styles.splitEditorGrid}>
            <form onSubmit={handleSaveFamilyBlueprint} className={styles.archEditCard}>
              <h3>{isCreatingNewFamily ? "Create New Family Blueprint" : `Editing: ${familyDraft.label}`}</h3>

              <div className={styles.inlineTwo}>
                <div className={styles.formGroup}>
                  <label>Family ID (slug):</label>
                  <input
                    type="text"
                    required
                    disabled={!isCreatingNewFamily}
                    placeholder="e.g. iced_energy_tea"
                    value={familyDraft.id}
                    onChange={(e) => setFamilyDraft({ ...familyDraft, id: e.target.value })}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Display Label:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Iced Energy Tea"
                    value={familyDraft.label}
                    onChange={(e) => setFamilyDraft({ ...familyDraft, label: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.inlineTwo}>
                <div className={styles.formGroup}>
                  <label>Default Bar Station:</label>
                  <select
                    value={familyDraft.defaultStation}
                    onChange={(e) => setFamilyDraft({ ...familyDraft, defaultStation: e.target.value })}
                  >
                    <option value="espresso_bar">Espresso Bar</option>
                    <option value="cold_bar">Cold Bar</option>
                    <option value="blended">Blended / Frappuccino</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Workflow Build Template:</label>
                  <select
                    value={familyDraft.buildTemplate}
                    onChange={(e) => setFamilyDraft({ ...familyDraft, buildTemplate: e.target.value })}
                  >
                    {BUILD_TEMPLATES.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>{tpl.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.sectionDivider}>Supported Temps &amp; Cup Sizes</div>
              <div className={styles.checkboxRow}>
                {["hot", "iced"].map((t) => (
                  <label key={t}>
                    <input
                      type="checkbox"
                      checked={familyDraft.defaultTemps.includes(t)}
                      onChange={() => handleToggleFamilyTemp(t)}
                    />
                    {t.toUpperCase()}
                  </label>
                ))}
              </div>
              <div className={styles.checkboxGrid}>
                {ALL_SIZE_KEYS.map((sKey) => (
                  <label key={sKey}>
                    <input
                      type="checkbox"
                      checked={familyDraft.baseSizes.includes(sKey)}
                      onChange={() => handleToggleFamilySize(sKey)}
                    />
                    {SIZE_SPECS[sKey].label}
                  </label>
                ))}
              </div>

              <div className={styles.sectionDivider}>
                <span>Shot &amp; Primary Pump Curves</span>
                <button
                  type="button"
                  className={styles.inlineLinkBtn}
                  onClick={() => handleOpenCurveBuilder("shots", familyDraft.shotCurve)}
                >
                  Edit / Add Curve
                </button>
              </div>
              <div className={styles.inlineTwo}>
                <div className={styles.formGroup}>
                  <label>Shot Curve:</label>
                  <select
                    value={familyDraft.shotCurve}
                    onChange={(e) => setFamilyDraft({ ...familyDraft, shotCurve: e.target.value })}
                  >
                    <option value="none">None (0 Shots)</option>
                    {shotCurves.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Default Shot Type:</label>
                  <select
                    value={familyDraft.defaultShotType}
                    onChange={(e) => setFamilyDraft({ ...familyDraft, defaultShotType: e.target.value })}
                  >
                    <option value="standard">Standard</option>
                    <option value="ristretto">Ristretto (R)</option>
                  </select>
                </div>
              </div>

              <div className={styles.inlineTwo}>
                <div className={styles.formGroup}>
                  <label>Primary Pump Parameter:</label>
                  <select
                    value={familyDraft.primaryPumpMetric}
                    onChange={(e) => setFamilyDraft({ ...familyDraft, primaryPumpMetric: e.target.value })}
                  >
                    <option value="none">None</option>
                    {metrics
                      .filter((m) => m.key !== "shots")
                      .map((m) => (
                        <option key={m.key} value={m.key}>
                          {m.label} ({m.key})
                        </option>
                      ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Pump Curve:</label>
                  <select
                    value={familyDraft.pumpCurve}
                    onChange={(e) => setFamilyDraft({ ...familyDraft, pumpCurve: e.target.value })}
                  >
                    <option value="none">None (0 Pumps)</option>
                    {pumpAndParamCurves.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className={styles.sectionDivider}>
                <span>Extended Parameters (Scoops, Inclusions, Bags, Custom)</span>
                <button
                  type="button"
                  className={styles.inlineLinkBtn}
                  onClick={() => setIsMetricBuilderOpen(true)}
                >
                  + Add Parameter
                </button>
              </div>
              <div className={styles.inlineTwo}>
                {extraMetricOptions.map((metric) => (
                  <div key={metric.key} className={styles.formGroup}>
                    <label>{metric.label} ({metric.key}):</label>
                    <select
                      value={familyDraft.extraMetrics?.[metric.key] || "none"}
                      onChange={(e) => handleExtraMetricChange(metric.key, e.target.value)}
                    >
                      <option value="none">None (0)</option>
                      {curves.map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className={styles.modalBtnRow}>
                {!isCreatingNewFamily && (
                  <button type="button" className={styles.actionBtnDel} onClick={handleRemoveFamily}>
                    Delete Family
                  </button>
                )}
                <button type="submit" className={styles.saveBtn}>
                  {isCreatingNewFamily ? "Create Family Blueprint" : "Save Family & Recompile Drinks"}
                </button>
              </div>
            </form>

            {/* LIVE BLUEPRINT PREVIEW */}
            {liveFamilyPreview && (
              <div className={styles.previewPanel}>
                <h4>Live Family Baseline Output</h4>
                <div className={styles.previewSizesGrid}>
                  {liveFamilyPreview.sizeList.map((s) => (
                    <div key={s.sizeKey} className={styles.previewSizeBox}>
                      <strong>{s.size}</strong>
                      {s.metrics.map((m) => (
                        <div key={m.key} className={styles.previewMetricLine}>
                          <span>{m.label}:</span> <b>{m.value}</b>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                {liveFamilyPreview.workflows.hot && (
                  <div className={styles.previewWorkflowBox}>
                    <strong>Hot Workflow ({liveFamilyPreview.workflows.hot.sizeLabel}):</strong>
                    <div className={styles.previewBadgeRow}>
                      <span>Stop: {liveFamilyPreview.workflows.hot.stopPoint}</span>
                      <span>Sleeve: {liveFamilyPreview.workflows.hot.needsSleeve ? "Yes (Oct 2026)" : "No (Short)"}</span>
                    </div>
                    <ol>
                      {liveFamilyPreview.workflows.hot.stepLabels.map((lbl, idx) => (
                        <li key={idx}>{lbl}</li>
                      ))}
                    </ol>
                  </div>
                )}
                {liveFamilyPreview.workflows.iced && (
                  <div className={styles.previewWorkflowBox}>
                    <strong>Iced Workflow ({liveFamilyPreview.workflows.iced.sizeLabel}):</strong>
                    <div className={styles.previewBadgeRow}>
                      <span>Stop: {liveFamilyPreview.workflows.iced.stopPoint}</span>
                    </div>
                    <ol>
                      {liveFamilyPreview.workflows.iced.stepLabels.map((lbl, idx) => (
                        <li key={idx}>{lbl}</li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* TAB A MODAL: CREATE / EDIT DRINK + LIVE ENGINE OUTPUT PREVIEW       */}
      {/* =================================================================== */}
      {isDrinkModalOpen && editingDrink && (
        <div className={styles.modalBackdrop} onClick={() => setIsDrinkModalOpen(false)}>
          <div className={styles.modalContentWide} onClick={(e) => e.stopPropagation()}>
            <h3>{editingDrink.name ? `Edit Drink: ${editingDrink.name}` : "Create New Drink"}</h3>
            <div className={styles.splitEditorGrid}>
              <form onSubmit={handleSaveDrink} className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Drink Name:</label>
                  <input
                    type="text"
                    required
                    value={editingDrink.name}
                    onChange={(e) => setEditingDrink({ ...editingDrink, name: e.target.value })}
                  />
                  {similarNames.length > 0 && (
                    <div className={styles.warningBox}>
                      Similar drinks: {similarNames.map((d) => d.name).join(", ")}
                    </div>
                  )}
                </div>

                <div className={styles.inlineTwo}>
                  <div className={styles.formGroup}>
                    <label>Family Blueprint (from Tab B):</label>
                    <select
                      value={editingDrink.family}
                      onChange={(e) => handleDrinkFamilyChange(e.target.value)}
                    >
                      {families.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label} ({f.id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Season (e.g. Core, Fall 2026):</label>
                    <input
                      type="text"
                      list="season-suggestions"
                      required
                      value={editingDrink.season}
                      onChange={(e) => setEditingDrink({ ...editingDrink, season: e.target.value })}
                    />
                    <datalist id="season-suggestions">
                      {seasonOptions.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className={styles.inlineTwo}>
                  <div className={styles.formGroup}>
                    <label>Bar Station:</label>
                    <select
                      value={editingDrink.station}
                      onChange={(e) => setEditingDrink({ ...editingDrink, station: e.target.value })}
                    >
                      <option value="espresso_bar">Espresso Bar</option>
                      <option value="cold_bar">Cold Bar</option>
                      <option value="blended">Blended / Frappuccino</option>
                    </select>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Shot Style (Standard vs Ristretto):</label>
                    <select
                      value={editingDrink.shotType}
                      onChange={(e) => setEditingDrink({ ...editingDrink, shotType: e.target.value })}
                    >
                      <option value="standard">Standard Shots</option>
                      <option value="ristretto">Ristretto Shots (R)</option>
                    </select>
                  </div>
                </div>

                {/* ========================================================= */}
                {/* WHAT IT CONTAINS (MALLEABLE INGREDIENTS BUILDER)          */}
                {/* ========================================================= */}
                <div className={styles.sectionDivider}>
                  <span>What It Contains (Recipe Card Ingredients)</span>
                </div>

                <div className={styles.ingredientsBuilderBox}>
                  <div className={styles.inlineTwo}>
                    <div className={styles.formGroup}>
                      <label>Espresso Roast / Tea / Base:</label>
                      <input
                        type="text"
                        list="roast-options-list"
                        placeholder="e.g. Blonde Espresso, Signature Espresso"
                        value={editingDrink.ingredients?.roast || ""}
                        onChange={(e) => handleIngredientFieldChange("roast", e.target.value)}
                      />
                      <datalist id="roast-options-list">
                        {ingredientOptions.roasts.map((r) => (
                          <option key={r} value={r} />
                        ))}
                      </datalist>
                    </div>

                    <div className={styles.formGroup}>
                      <label>Default Milk / Liquid Base:</label>
                      <input
                        type="text"
                        list="milk-options-list"
                        placeholder="e.g. 2% Milk, Oatmilk, Whole Milk"
                        value={editingDrink.ingredients?.milk || ""}
                        onChange={(e) => handleIngredientFieldChange("milk", e.target.value)}
                      />
                      <datalist id="milk-options-list">
                        {ingredientOptions.milks.map((m) => (
                          <option key={m} value={m} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  {/* SYRUPS / SAUCES MULTI-BUILDER */}
                  <div className={styles.formGroup}>
                    <label>Syrups / Sauces in Drink (supports multiple):</label>
                    <div className={styles.chipList}>
                      {(editingDrink.ingredients?.syrups || []).length === 0 ? (
                        <span className={styles.emptyChipHint}>No syrups/sauces added (Unsweetened)</span>
                      ) : (
                        (editingDrink.ingredients?.syrups || []).map((syrup) => (
                          <span key={syrup} className={styles.ingredientChip}>
                            {syrup}
                            <button
                              type="button"
                              onClick={() => handleRemoveSyrupFromDrink(syrup)}
                              title="Remove syrup"
                            >
                              &times;
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                    <div className={styles.quickAddRow}>
                      <select
                        value={selectedSyrupToAdd}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddSyrupToDrink(e.target.value);
                            setSelectedSyrupToAdd("");
                          }
                        }}
                      >
                        <option value="">+ Quick-Add Existing Syrup / Sauce...</option>
                        {ingredientOptions.syrups.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <div className={styles.customInputGroup}>
                        <input
                          type="text"
                          placeholder="Or type new Starbucks syrup..."
                          value={newSyrupInput}
                          onChange={(e) => setNewSyrupInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddSyrupToDrink(newSyrupInput);
                              setNewSyrupInput("");
                            }
                          }}
                        />
                        <button
                          type="button"
                          className={styles.smallAddBtn}
                          onClick={() => {
                            handleAddSyrupToDrink(newSyrupInput);
                            setNewSyrupInput("");
                          }}
                        >
                          + Add Syrup
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* TOPPINGS / POWDERS / DRIZZLES MULTI-BUILDER */}
                  <div className={styles.formGroup}>
                    <label>Toppings / Powders / Drizzles (e.g. Cinnamon Powder, Caramel Drizzle):</label>
                    <div className={styles.chipList}>
                      {(editingDrink.ingredients?.toppings || []).length === 0 ? (
                        <span className={styles.emptyChipHint}>No specialty toppings/powders</span>
                      ) : (
                        (editingDrink.ingredients?.toppings || []).map((top) => (
                          <span key={top} className={styles.ingredientChipTopping}>
                            {top}
                            <button
                              type="button"
                              onClick={() => handleRemoveToppingIngredientFromDrink(top)}
                              title="Remove topping"
                            >
                              &times;
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                    <div className={styles.quickAddRow}>
                      <select
                        value={selectedToppingToAdd}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAddToppingIngredientToDrink(e.target.value);
                            setSelectedToppingToAdd("");
                          }
                        }}
                      >
                        <option value="">+ Quick-Add Existing Topping / Powder...</option>
                        {ingredientOptions.toppings.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                      <div className={styles.customInputGroup}>
                        <input
                          type="text"
                          placeholder="Or type new topping / powder..."
                          value={newToppingInput}
                          onChange={(e) => setNewToppingInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddToppingIngredientToDrink(newToppingInput);
                              setNewToppingInput("");
                            }
                          }}
                        />
                        <button
                          type="button"
                          className={styles.smallAddBtn}
                          onClick={() => {
                            handleAddToppingIngredientToDrink(newToppingInput);
                            setNewToppingInput("");
                          }}
                        >
                          + Add Topping
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {editingDrink.family !== "frappuccino" && (
                  <div className={styles.formGroup}>
                    <label>Syrup Pumps Curve Adjustment:</label>
                    <select
                      value={editingDrink.pumpsDelta}
                      onChange={(e) =>
                        setEditingDrink({ ...editingDrink, pumpsDelta: Number(e.target.value) })
                      }
                    >
                      <option value={0}>Standard Family Curve (0)</option>
                      <option value={-1}>Reduced Sweetness (-1 Pump - Macchiato Rule)</option>
                      <option value={1}>Extra Pump (+1)</option>
                    </select>
                  </div>
                )}

                <div className={styles.sectionDivider}>Temperatures, Cold Foam &amp; Build Modifiers</div>
                <div className={styles.checkboxGrid}>
                  <label>
                    <input
                      type="checkbox"
                      checked={editingDrink.temps.includes("hot")}
                      onChange={() => handleToggleDrinkTemp("hot")}
                    />
                    Served Hot
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={editingDrink.temps.includes("iced")}
                      onChange={() => handleToggleDrinkTemp("iced")}
                    />
                    Served Iced
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={Boolean(editingDrink.hasWhip)}
                      onChange={(e) => setEditingDrink({ ...editingDrink, hasWhip: e.target.checked })}
                    />
                    Whipped Cream (hasWhip)
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={Boolean(editingDrink.hasColdFoam)}
                      onChange={(e) => handleColdFoamToggle(e.target.checked)}
                    />
                    Cold Foam (hasColdFoam)
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={editingDrink.includeSyrupStep}
                      onChange={(e) =>
                        setEditingDrink({ ...editingDrink, includeSyrupStep: e.target.checked })
                      }
                    />
                    Has Syrup Step in Build
                  </label>
                </div>

                {editingDrink.hasColdFoam && (
                  <div className={styles.foamConfigBox}>
                    <div className={styles.formGroup}>
                      <label>Cold Foam Type / Preset:</label>
                      <select
                        value={editingDrink.coldFoamType || "vsc"}
                        onChange={(e) => handleColdFoamPresetChange(e.target.value)}
                      >
                        {COLD_FOAM_PRESETS.map((preset) => (
                          <option key={preset.id} value={preset.id}>
                            {preset.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Foam Composition (What goes in the foaming pitcher):</label>
                      <input
                        type="text"
                        placeholder="e.g. 100mL Sweet Cream + 2 pumps Caramel + 2 Salt packets"
                        value={editingDrink.coldFoamRecipe || ""}
                        onChange={(e) =>
                          setEditingDrink({ ...editingDrink, coldFoamRecipe: e.target.value })
                        }
                      />
                    </div>
                  </div>
                )}

                <div className={styles.sectionDivider}>Sequencing Simulator Finishing Actions</div>
                <div className={styles.checkboxGrid}>
                  {[
                    ...TOPPING_OPTIONS,
                    ...(editingDrink.toppings || [])
                      .filter((tId) => !TOPPING_OPTIONS.some((opt) => opt.id === tId))
                      .map((tId) => ({ id: tId, label: getActionLabel(tId) })),
                  ].map((top) => (
                    <label key={top.id}>
                      <input
                        type="checkbox"
                        checked={editingDrink.toppings.includes(top.id)}
                        onChange={() => handleToggleDrinkTopping(top.id)}
                      />
                      {top.label}
                    </label>
                  ))}
                </div>
                <div className={styles.customInputGroup} style={{ marginTop: "0.4rem" }}>
                  <input
                    type="text"
                    placeholder="Add custom finishing drizzle/topping toggle (e.g. Dark Caramel Drizzle)..."
                    value={newFinishingToggleInput}
                    onChange={(e) => setNewFinishingToggleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomFinishingToggle();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={styles.smallAddBtn}
                    onClick={handleAddCustomFinishingToggle}
                  >
                    + Add Action Toggle
                  </button>
                </div>

                {/* ========================================================= */}
                {/* DRINK-SPECIFIC BUILD WORKFLOW OVERRIDE (DEFAULT VS CUSTOM) */}
                {/* ========================================================= */}
                <div className={styles.sectionDivider}>
                  <span>Build Workflow Steps (Default vs. Drink-Specific Override)</span>
                  {(editingDrink.customSteps || editingDrink.buildOverride) && (
                    <button
                      type="button"
                      className={styles.inlineLinkBtn}
                      onClick={() => handleResetBuildToDefault()}
                    >
                      Reset to Default Family Build
                    </button>
                  )}
                </div>

                <div className={styles.ingredientsBuilderBox}>
                  <div className={styles.formGroup}>
                    <label>Build Template Preset (only saved if overridden):</label>
                    <select
                      value={editingDrink.buildOverride || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingDrink((prev) => {
                          const next = { ...prev };
                          if (val) next.buildOverride = val;
                          else delete next.buildOverride;
                          return next;
                        });
                      }}
                    >
                      <option value="">
                        Use Family Default ({familiesMap[editingDrink.family]?.buildTemplate || "espresso_standard"})
                      </option>
                      {BUILD_TEMPLATES.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {editingDrink.temps.map((tempMode) => {
                    const customList = editingDrink.customSteps?.[tempMode];
                    const isCustomized = Array.isArray(customList) && customList.length > 0;
                    return (
                      <div key={tempMode} className={styles.customBuildTempBox}>
                        <div className={styles.customBuildHeader}>
                          <strong>
                            {tempMode === "hot" ? "Hot" : "Iced"} Step-by-Step Build:{" "}
                            {isCustomized ? "(Custom Drink Override Active)" : "(Using Default Build)"}
                          </strong>
                          {!isCustomized ? (
                            <button
                              type="button"
                              className={styles.smallAddBtn}
                              onClick={() => handleEnableCustomBuildForTemp(tempMode)}
                            >
                              Customize {tempMode === "hot" ? "Hot" : "Iced"} Steps
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={styles.cancelBtn}
                              onClick={() => handleResetBuildToDefault(tempMode)}
                            >
                              Use Default {tempMode === "hot" ? "Hot" : "Iced"} Steps
                            </button>
                          )}
                        </div>

                        {isCustomized && (
                          <>
                            <ol className={styles.customStepsList}>
                              {customList.map((stepId, idx) => (
                                <li key={`${stepId}_${idx}`} className={styles.customStepRow}>
                                  <span className={styles.customStepLabel}>
                                    {idx + 1}. {getActionLabel(stepId)}
                                  </span>
                                  <div className={styles.customStepBtns}>
                                    <button
                                      type="button"
                                      disabled={idx === 0}
                                      onClick={() => handleMoveCustomStep(tempMode, idx, -1)}
                                      title="Move Up"
                                    >
                                      &uarr;
                                    </button>
                                    <button
                                      type="button"
                                      disabled={idx === customList.length - 1}
                                      onClick={() => handleMoveCustomStep(tempMode, idx, 1)}
                                      title="Move Down"
                                    >
                                      &darr;
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveCustomStep(tempMode, idx)}
                                      title="Remove Step"
                                    >
                                      &times;
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ol>
                            <div className={styles.quickAddRow}>
                              <select
                                value={stepToAddByTemp[tempMode] || ""}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleAddCustomStep(tempMode, e.target.value);
                                    setStepToAddByTemp((prev) => ({ ...prev, [tempMode]: "" }));
                                  }
                                }}
                              >
                                <option value="">+ Insert Standard Bar Action...</option>
                                {Object.entries(ACTION_DICTIONARY).map(([actId, lbl]) => (
                                  <option key={actId} value={actId}>
                                    {lbl} ({actId})
                                  </option>
                                ))}
                              </select>
                              <div className={styles.customInputGroup}>
                                <input
                                  type="text"
                                  placeholder="Or type custom build step..."
                                  value={customStepTextByTemp[tempMode] || ""}
                                  onChange={(e) =>
                                    setCustomStepTextByTemp((prev) => ({
                                      ...prev,
                                      [tempMode]: e.target.value,
                                    }))
                                  }
                                />
                                <button
                                  type="button"
                                  className={styles.smallAddBtn}
                                  onClick={() => {
                                    const txt = (customStepTextByTemp[tempMode] || "").trim();
                                    if (txt) {
                                      handleAddCustomStep(tempMode, `custom_step:${txt}`);
                                      setCustomStepTextByTemp((prev) => ({
                                        ...prev,
                                        [tempMode]: "",
                                      }));
                                    }
                                  }}
                                >
                                  + Add Step
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className={styles.sectionDivider}>Curriculum Flags</div>
                <div className={styles.checkboxGrid}>
                  <label>
                    <input
                      type="checkbox"
                      checked={Boolean(editingDrink.curriculum?.isFundamental)}
                      onChange={(e) =>
                        setEditingDrink({
                          ...editingDrink,
                          curriculum: { ...editingDrink.curriculum, isFundamental: e.target.checked },
                        })
                      }
                    />
                    Essentials Quiz (isFundamental)
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={Boolean(editingDrink.curriculum?.allowInSequencing)}
                      onChange={(e) =>
                        setEditingDrink({
                          ...editingDrink,
                          curriculum: {
                            ...editingDrink.curriculum,
                            allowInSequencing: e.target.checked,
                          },
                        })
                      }
                    />
                    Sequencing Simulator (allowInSequencing)
                  </label>
                </div>

                <div className={styles.formGroup}>
                  <label>Barista Technique Notes (e.g. 7x7 crosshatch, aerate 6-8s):</label>
                  <textarea
                    rows="2"
                    value={editingDrink.comments}
                    onChange={(e) => setEditingDrink({ ...editingDrink, comments: e.target.value })}
                  />
                </div>

                <div className={styles.modalBtnRow}>
                  <button
                    type="button"
                    className={styles.cancelBtn}
                    onClick={() => setIsDrinkModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className={styles.saveBtn}>
                    Save Drink
                  </button>
                </div>
              </form>

              {/* LIVE ENGINE OUTPUT PREVIEW */}
              {liveCompiledDrink && (
                <div className={styles.previewPanel}>
                  <h4>Live Engine Output Preview</h4>
                  <p className={styles.previewSubtext}>
                    Family: <code>{liveCompiledDrink.family}</code> &bull; Auto-Tags:{" "}
                    {liveCompiledDrink.tags.join(", ")}
                  </p>

                  {liveCompiledDrink.containsList && liveCompiledDrink.containsList.length > 0 && (
                    <div className={styles.previewContainsBox}>
                      <strong>What It Contains:</strong>
                      <div className={styles.previewContainsGrid}>
                        {liveCompiledDrink.containsList.map((item, idx) => (
                          <div key={idx} className={styles.previewContainsItem}>
                            <span>{item.category}:</span> <b>{item.value}</b>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={styles.previewSizesGrid}>
                    {liveCompiledDrink.sizeList.map((s) => (
                      <div key={s.sizeKey} className={styles.previewSizeBox}>
                        <strong>{s.size}</strong>
                        {s.metrics.map((m) => (
                          <div key={m.key} className={styles.previewMetricLine}>
                            <span>{m.label}:</span> <b>{m.value}</b>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>

                  {liveCompiledDrink.workflows.hot && (
                    <div className={styles.previewWorkflowBox}>
                      <strong>Hot Build ({liveCompiledDrink.workflows.hot.sizeLabel})</strong>
                      <div className={styles.previewBadgeRow}>
                        <span>Stop Point: {liveCompiledDrink.workflows.hot.stopPoint}</span>
                        <span>
                          Sleeve: {liveCompiledDrink.workflows.hot.needsSleeve ? "Required" : "None (Short)"}
                        </span>
                      </div>
                      <ol>
                        {liveCompiledDrink.workflows.hot.stepLabels.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {liveCompiledDrink.workflows.iced && (
                    <div className={styles.previewWorkflowBox}>
                      <strong>Iced Build ({liveCompiledDrink.workflows.iced.sizeLabel})</strong>
                      <div className={styles.previewBadgeRow}>
                        <span>Stop Point: {liveCompiledDrink.workflows.iced.stopPoint}</span>
                      </div>
                      <ol>
                        {liveCompiledDrink.workflows.iced.stepLabels.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrinkManager;
