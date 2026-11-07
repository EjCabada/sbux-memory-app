import React, { useState, useMemo } from "react";
import { useDrinkCatalog } from "../context/DrinkContext.jsx";
import {
  ALL_SIZE_KEYS,
  BUILD_TEMPLATES,
  CURVE_OPTIONS,
  EXTRA_METRIC_KEYS,
  METRIC_LABELS,
  SIZE_SPECS,
  TOPPING_OPTIONS,
  compileDrink,
  normalizeFamilyBlueprint,
} from "../utils/drinkEngine.js";
import styles from "./DrinkManager.module.css";

const SUGGESTED_SEASONS = ["Core", "Fall 2025", "Winter 2026", "Spring 2026", "Summer 2026", "Fall 2026"];

const createBlankDrink = (defaultFamily) => ({
  id: `drink_${Date.now()}`,
  name: "",
  family: defaultFamily?.id || "latte",
  station: defaultFamily?.defaultStation || "espresso_bar",
  season: "Core",
  isActive: true,
  temps: defaultFamily?.defaultTemps ? [...defaultFamily.defaultTemps] : ["hot", "iced"],
  shotType: defaultFamily?.defaultShotType || "standard",
  shotsDelta: 0,
  pumpsDelta: 0,
  hasWhip: Boolean(defaultFamily?.defaultHasWhip),
  includeSyrupStep: defaultFamily?.includeSyrupStep !== undefined ? defaultFamily.includeSyrupStep : true,
  toppings: [],
  curriculum: {
    isFundamental: true,
    allowInSequencing: true,
  },
  comments: "",
});

const createBlankFamily = () => ({
  id: "",
  label: "",
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
});

const DrinkManager = () => {
  const {
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
  } = useDrinkCatalog();

  const [activeTab, setActiveTab] = useState("catalog");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeason, setFilterSeason] = useState("all");
  const [filterFamily, setFilterFamily] = useState("all");
  const [isJsonPreviewOpen, setIsJsonPreviewOpen] = useState(false);

  // Tab A Modal State
  const [editingDrink, setEditingDrink] = useState(null);
  const [isDrinkModalOpen, setIsDrinkModalOpen] = useState(false);

  // Tab B Editor State
  const [selectedFamilyId, setSelectedFamilyId] = useState("latte");
  const [familyDraft, setFamilyDraft] = useState(() =>
    normalizeFamilyBlueprint(families[0] || createBlankFamily())
  );
  const [isCreatingNewFamily, setIsCreatingNewFamily] = useState(false);
  const [statusBanner, setStatusBanner] = useState(null);

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

  const similarNames = useMemo(() => {
    if (!editingDrink || !editingDrink.name.trim()) return [];
    const q = editingDrink.name.trim().toLowerCase();
    return rawDrinks.filter((d) => d.id !== editingDrink.id && d.name.toLowerCase().includes(q));
  }, [editingDrink, rawDrinks]);

  // Live Engine Output Preview for Tab A Modal
  const liveCompiledDrink = useMemo(() => {
    if (!editingDrink) return null;
    return compileDrink(editingDrink, familiesMap);
  }, [editingDrink, familiesMap]);

  // Live Engine Output Preview for Tab B Family Editor
  const liveFamilyPreview = useMemo(() => {
    if (!familyDraft) return null;
    const normalizedFam = normalizeFamilyBlueprint(familyDraft);
    const previewMap = { ...familiesMap, [normalizedFam.id]: normalizedFam };
    const sampleRaw = createBlankDrink(normalizedFam);
    sampleRaw.name = `${normalizedFam.label || "Sample"} (Baseline Preview)`;
    return compileDrink(sampleRaw, previewMap);
  }, [familyDraft, familiesMap]);

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
    setStatusBanner("Downloaded unified drinks.json (schema v2: families + drinks) ready for GitHub Pages.");
  };

  const handleCopyUnifiedJSON = async () => {
    await navigator.clipboard.writeText(exportUnifiedCatalogJSON());
    setStatusBanner("Copied unified catalog JSON to clipboard.");
  };

  const handleResetToSource = () => {
    if (window.confirm("Discard local browser edits and reload public/data/drinks.json?")) {
      resetCatalogToSource();
      setStatusBanner("Restored catalog and family blueprints from public/data/drinks.json.");
    }
  };

  // --- Tab A Handlers ---
  const handleOpenAddDrink = () => {
    const defaultFam = families[0];
    setEditingDrink(createBlankDrink(defaultFam));
    setIsDrinkModalOpen(true);
  };

  const handleOpenEditDrink = (rawDrink) => {
    setEditingDrink({
      ...rawDrink,
      temps: [...rawDrink.temps],
      toppings: [...(rawDrink.toppings || [])],
      curriculum: { ...rawDrink.curriculum },
    });
    setIsDrinkModalOpen(true);
  };

  const handleDrinkFamilyChange = (newFamId) => {
    const fam = familiesMap[newFamId];
    if (!fam) return;
    setEditingDrink((prev) => ({
      ...prev,
      family: newFamId,
      station: fam.defaultStation,
      temps: [...fam.defaultTemps],
      shotType: fam.defaultShotType,
      hasWhip: fam.defaultHasWhip,
      includeSyrupStep: fam.includeSyrupStep,
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

  const handleSaveFamilyBlueprint = (e) => {
    e.preventDefault();
    if (!familyDraft.id.trim() || !familyDraft.label.trim()) return;
    const normalized = normalizeFamilyBlueprint(familyDraft);
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

  return (
    <div className={styles.container}>
      {/* JSON DEPLOYMENT DASHBOARD */}
      <div className={styles.jsonDashboard}>
        <div className={styles.dashboardInfo}>
          <div className={styles.dashboardTitleRow}>
            <h3>Unified Relational Catalog (Schema v2)</h3>
            <span className={hasLocalOverrides ? styles.overrideBadgeActive : styles.overrideBadgeSynced}>
              {hasLocalOverrides ? "Local Browser Edits Active" : "Synced with public/data/drinks.json"}
            </span>
          </div>
          <p>
            <strong>{rawDrinks.length}</strong> Drinks &bull; <strong>{families.length}</strong> Family Blueprints &bull; Oct 2026 Sleeve Standard Active
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
              <p>Assign drinks to dynamic families, toggle Essentials &amp; Sequencing flags, and manage seasonal lineups.</p>
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
                  <th>Drink Name</th>
                  <th>Family Blueprint</th>
                  <th>Season</th>
                  <th>Essentials (isFundamental)</th>
                  <th>Sequencing</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrinks.map((d) => (
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
                        {d.temps.join("/")} &bull; {d.station.replace(/_/g, " ")}
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
                ))}
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
              <h2>Family Blueprint Editor</h2>
              <p>Create new drink families or adjust corporate pump/shot baselines. Linked drinks recompile automatically.</p>
            </div>
            <button className={styles.addBtn} onClick={handleStartNewFamily}>
              + New Family Blueprint
            </button>
          </div>

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

              <div className={styles.sectionDivider}>Shot &amp; Primary Pump Baselines</div>
              <div className={styles.inlineThree}>
                <div className={styles.formGroup}>
                  <label>Shot Curve:</label>
                  <select
                    value={familyDraft.shotCurve}
                    onChange={(e) => setFamilyDraft({ ...familyDraft, shotCurve: e.target.value })}
                  >
                    <option value="none">None (0 Shots)</option>
                    <option value="espressoShots">Espresso (1/1/2/2/3)</option>
                    <option value="americanoShots">Americano (1/2/3/4/4)</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Base Shots Delta:</label>
                  <input
                    type="number"
                    value={familyDraft.baseShotsDelta}
                    onChange={(e) => setFamilyDraft({ ...familyDraft, baseShotsDelta: Number(e.target.value) })}
                  />
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

              <div className={styles.inlineThree}>
                <div className={styles.formGroup}>
                  <label>Primary Pump Parameter:</label>
                  <select
                    value={familyDraft.primaryPumpMetric}
                    onChange={(e) => setFamilyDraft({ ...familyDraft, primaryPumpMetric: e.target.value })}
                  >
                    <option value="syrup_pumps">syrup_pumps</option>
                    <option value="caffeine_pumps">caffeine_pumps</option>
                    <option value="none">None</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Pump Curve:</label>
                  <select
                    value={familyDraft.pumpCurve}
                    onChange={(e) => setFamilyDraft({ ...familyDraft, pumpCurve: e.target.value })}
                  >
                    {CURVE_OPTIONS.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Base Pumps Delta:</label>
                  <input
                    type="number"
                    value={familyDraft.basePumpsDelta}
                    onChange={(e) => setFamilyDraft({ ...familyDraft, basePumpsDelta: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className={styles.sectionDivider}>Extended Cold Bar &amp; Tea Parameters</div>
              <div className={styles.inlineTwo}>
                {EXTRA_METRIC_KEYS.map((metricKey) => (
                  <div key={metricKey} className={styles.formGroup}>
                    <label>{METRIC_LABELS[metricKey]} ({metricKey}):</label>
                    <select
                      value={familyDraft.extraMetrics?.[metricKey] || "none"}
                      onChange={(e) => handleExtraMetricChange(metricKey, e.target.value)}
                    >
                      {CURVE_OPTIONS.map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className={styles.checkboxRow}>
                <label>
                  <input
                    type="checkbox"
                    checked={familyDraft.includeSyrupStep}
                    onChange={(e) => setFamilyDraft({ ...familyDraft, includeSyrupStep: e.target.checked })}
                  />
                  Include Syrup Step in Default Workflow
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={familyDraft.defaultHasWhip}
                    onChange={(e) => setFamilyDraft({ ...familyDraft, defaultHasWhip: e.target.checked })}
                  />
                  Whipped Cream by Default
                </label>
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
                    <label>Shot Type:</label>
                    <select
                      value={editingDrink.shotType}
                      onChange={(e) => setEditingDrink({ ...editingDrink, shotType: e.target.value })}
                    >
                      <option value="standard">Standard Shots</option>
                      <option value="ristretto">Ristretto Shots (R)</option>
                    </select>
                  </div>
                </div>

                <div className={styles.inlineTwo}>
                  <div className={styles.formGroup}>
                    <label>Shots Delta (vs Family):</label>
                    <input
                      type="number"
                      value={editingDrink.shotsDelta}
                      onChange={(e) => setEditingDrink({ ...editingDrink, shotsDelta: Number(e.target.value) })}
                    />
                  </div>
                  <div className={styles.formGroup}>
                    <label>Pumps Delta (vs Family):</label>
                    <input
                      type="number"
                      value={editingDrink.pumpsDelta}
                      onChange={(e) => setEditingDrink({ ...editingDrink, pumpsDelta: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div className={styles.sectionDivider}>Temperatures, Modifiers &amp; Toppings</div>
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
                      checked={editingDrink.hasWhip}
                      onChange={(e) => setEditingDrink({ ...editingDrink, hasWhip: e.target.checked })}
                    />
                    Whipped Cream
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

                <div className={styles.checkboxGrid}>
                  {TOPPING_OPTIONS.map((top) => (
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
                  <label>Barista Notes / Exceptions:</label>
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
