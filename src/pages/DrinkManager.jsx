import React, { useState, useMemo } from "react";
import { useDrinkCatalog } from "../context/DrinkContext.jsx";
import { COLD_FOAM_MAP, getDefaultIngredientsForDrink } from "../utils/drinkEngine.js";
import DrinkEditorModal from "../components/DrinkManager/DrinkEditorModal.jsx";
import FamilyBlueprintTab from "../components/DrinkManager/FamilyBlueprintTab.jsx";
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
  const [statusBanner, setStatusBanner] = useState(null);

  const [editingDrink, setEditingDrink] = useState(null);
  const [isDrinkModalOpen, setIsDrinkModalOpen] = useState(false);

  const seasonOptions = useMemo(() => {
    const set = new Set([...SUGGESTED_SEASONS, ...rawDrinks.map((d) => d.season).filter(Boolean)]);
    return Array.from(set);
  }, [rawDrinks]);

  const filteredDrinks = useMemo(() => {
    return rawDrinks.filter((d) => {
      const matchesName = d.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSeason = filterSeason === "all" || d.season === filterSeason;
      const matchesFam = filterFamily === "all" || d.family === filterFamily;
      return matchesName && matchesSeason && matchesFam;
    });
  }, [rawDrinks, searchQuery, filterSeason, filterFamily]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <p>Loading Relational Drink Manager...</p>
      </div>
    );
  }

  const handleDownloadUnifiedJSON = () => {
    const jsonStr = exportUnifiedCatalogJSON();
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "drinks.json";
    link.click();
    URL.revokeObjectURL(url);
    setStatusBanner("Downloaded unified drinks.json.");
  };

  const handleCopyUnifiedJSON = async () => {
    await navigator.clipboard.writeText(exportUnifiedCatalogJSON());
    setStatusBanner("Copied unified catalog JSON to clipboard.");
  };

  const handleResetToSource = () => {
    if (window.confirm("Discard local browser edits and reload public/data/drinks.json?")) {
      resetCatalogToSource();
      setStatusBanner("Restored catalog from public/data/drinks.json.");
    }
  };

  const handleOpenAddDrink = () => {
    setEditingDrink(createBlankDrink(families[0]));
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
    setIsDrinkModalOpen(true);
  };

  const handleSaveDrink = (savedDrink) => {
    upsertDrink(savedDrink);
    setIsDrinkModalOpen(false);
    setStatusBanner(`Saved "${savedDrink.name}" into catalog.`);
  };

  return (
    <div className={styles.container}>
      <div className={styles.topJsonDashboard}>
        <div className={styles.dashboardLeft}>
          <span className={styles.schemaBadge}>Schema v2.4</span>
          <span className={styles.overrideStatus}>
            {hasLocalOverrides
              ? "Unsaved Local Edits Active"
              : "Synced with public/data/drinks.json"}
          </span>
        </div>
        <div className={styles.dashboardActions}>
          <button
            className={styles.secondaryBtn}
            onClick={() => setIsJsonPreviewOpen((prev) => !prev)}
          >
            {isJsonPreviewOpen ? "Hide Raw JSON" : "View Raw JSON"}
          </button>
          <button className={styles.secondaryBtn} onClick={handleCopyUnifiedJSON}>
            Copy JSON
          </button>
          <button className={styles.primaryExportBtn} onClick={handleDownloadUnifiedJSON}>
            Download drinks.json
          </button>
          {hasLocalOverrides && (
            <button className={styles.resetSourceBtn} onClick={handleResetToSource}>
              Reset to Source JSON
            </button>
          )}
        </div>
      </div>

      {statusBanner && (
        <div className={styles.statusToast} onClick={() => setStatusBanner(null)}>
          <span>{statusBanner}</span>
          <button>&times;</button>
        </div>
      )}

      {isJsonPreviewOpen && (
        <div className={styles.jsonCodeDrawer}>
          <div className={styles.jsonDrawerHeader}>
            <strong>Unified public/data/drinks.json Output</strong>
            <span>Replace public/data/drinks.json with this output to commit changes</span>
          </div>
          <pre className={styles.jsonPre}>{exportUnifiedCatalogJSON()}</pre>
        </div>
      )}

      <div className={styles.tabBar}>
        <button
          className={`${styles.tabBtn} ${activeTab === "catalog" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("catalog")}
        >
          Drink Catalog ({rawDrinks.length})
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "families" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("families")}
        >
          Family Blueprints &amp; Curves ({families.length} Families &bull; {curves.length} Curves)
        </button>
      </div>

      {activeTab === "catalog" && (
        <>
          <div className={styles.headerRow}>
            <div>
              <h2>Drink Catalog</h2>
              <p>Configure what each drink contains, cold foam recipes, and quiz flags.</p>
            </div>
            <button className={styles.addBtn} onClick={handleOpenAddDrink}>
              + Add New Drink
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
                  <th>Family</th>
                  <th>Season</th>
                  <th>Essentials</th>
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

      {activeTab === "families" && (
        <FamilyBlueprintTab
          families={families}
          familiesMap={familiesMap}
          curves={curves}
          curvesMap={curvesMap}
          metrics={metrics}
          metricsMap={metricsMap}
          upsertFamily={upsertFamily}
          deleteFamily={deleteFamily}
          upsertCurve={upsertCurve}
          upsertMetric={upsertMetric}
          setStatusBanner={setStatusBanner}
        />
      )}

      {isDrinkModalOpen && editingDrink && (
        <DrinkEditorModal
          initialDrink={editingDrink}
          rawDrinks={rawDrinks}
          families={families}
          familiesMap={familiesMap}
          curvesMap={curvesMap}
          metricsMap={metricsMap}
          ingredientOptions={ingredientOptions}
          seasonOptions={seasonOptions}
          addIngredientOption={addIngredientOption}
          onSave={handleSaveDrink}
          onClose={() => setIsDrinkModalOpen(false)}
        />
      )}
    </div>
  );
};

export default DrinkManager;
