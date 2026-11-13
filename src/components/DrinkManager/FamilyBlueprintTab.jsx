import React, { useState, useMemo } from "react";
import {
  ALL_SIZE_KEYS,
  BUILD_TEMPLATES,
  SIZE_SPECS,
  compileDrink,
  getDefaultIngredientsForDrink,
  normalizeCurve,
  normalizeFamilyBlueprint,
} from "../../utils/drinkEngine.js";
import styles from "../../pages/DrinkManager.module.css";

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

const FamilyBlueprintTab = ({
  families,
  familiesMap,
  curves,
  curvesMap,
  metrics,
  metricsMap,
  upsertFamily,
  deleteFamily,
  upsertCurve,
  upsertMetric,
  setStatusBanner,
}) => {
  const [selectedFamilyId, setSelectedFamilyId] = useState(families[0]?.id || "latte");
  const [familyDraft, setFamilyDraft] = useState(() =>
    normalizeFamilyBlueprint(families[0] || createBlankFamily(), curvesMap)
  );
  const [isCreatingNewFamily, setIsCreatingNewFamily] = useState(false);

  const [isCurveBuilderOpen, setIsCurveBuilderOpen] = useState(false);
  const [curveDraft, setCurveDraft] = useState(() => createBlankCurveDraft("pumps"));
  const [isMetricBuilderOpen, setIsMetricBuilderOpen] = useState(false);
  const [metricDraft, setMetricDraft] = useState({ key: "", label: "" });

  const extraMetricOptions = useMemo(
    () => metrics.filter((m) => m.key !== "shots" && m.key !== "syrup_pumps"),
    [metrics]
  );

  const shotCurves = curves.filter((c) => c.category === "shots");
  const pumpAndParamCurves = curves.filter((c) => c.category !== "shots");

  const liveFamilyPreview = useMemo(() => {
    if (!familyDraft) return null;
    const normalizedFam = normalizeFamilyBlueprint(familyDraft, curvesMap);
    const previewMap = { ...familiesMap, [normalizedFam.id]: normalizedFam };
    const defaultIng = getDefaultIngredientsForDrink(normalizedFam.id);
    const sampleRaw = {
      id: "preview_drink",
      name: `${normalizedFam.label || "Sample"} (Baseline Preview)`,
      family: normalizedFam.id,
      station: normalizedFam.defaultStation,
      temps: [...normalizedFam.defaultTemps],
      shotType: normalizedFam.defaultShotType,
      pumpsDelta: 0,
      hasWhip: false,
      hasColdFoam: false,
      includeSyrupStep: normalizedFam.id !== "cappuccino" && normalizedFam.id !== "flat_white",
      ingredients: defaultIng,
    };
    return compileDrink(sampleRaw, previewMap, curvesMap, metricsMap);
  }, [familyDraft, familiesMap, curvesMap, metricsMap]);

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

  const handleSaveCustomCurve = (e) => {
    e.preventDefault();
    if (!curveDraft.label.trim()) return;
    const slug =
      curveDraft.id.trim() ||
      `curve_${curveDraft.label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "")}`;

    const saved = upsertCurve(normalizeCurve({ ...curveDraft, id: slug }));
    if (saved.category === "shots") {
      setFamilyDraft((prev) => ({ ...prev, shotCurve: saved.id }));
    } else if (saved.category === "pumps") {
      setFamilyDraft((prev) => ({ ...prev, pumpCurve: saved.id }));
    }
    setIsCurveBuilderOpen(false);
    setStatusBanner(`Saved progression curve "${saved.label}" (${saved.id}).`);
  };

  const handleSaveCustomMetric = (e) => {
    e.preventDefault();
    if (!metricDraft.label.trim()) return;
    const keySlug =
      metricDraft.key.trim() ||
      metricDraft.label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
    const saved = upsertMetric({ key: keySlug, label: metricDraft.label.trim() });
    setMetricDraft({ key: "", label: "" });
    setIsMetricBuilderOpen(false);
    setStatusBanner(`Added parameter "${saved.label}" (${saved.key}).`);
  };

  const handleSaveFamilyBlueprint = (e) => {
    e.preventDefault();
    const cleanId =
      familyDraft.id.trim() ||
      familyDraft.label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");

    const payload = normalizeFamilyBlueprint({ ...familyDraft, id: cleanId }, curvesMap);
    upsertFamily(payload);
    setIsCreatingNewFamily(false);
    setSelectedFamilyId(payload.id);
    setFamilyDraft(payload);
    setStatusBanner(`Saved family blueprint "${payload.label}" (${payload.id}).`);
  };

  const handleRemoveFamily = () => {
    if (!window.confirm(`Delete family "${familyDraft.label}"?`)) return;
    const res = deleteFamily(familyDraft.id);
    if (!res.ok) {
      alert(res.reason);
      return;
    }
    const fallback = families.find((f) => f.id !== familyDraft.id) || families[0];
    if (fallback) handleSelectFamilyForEdit(fallback.id);
    setStatusBanner(`Deleted family "${familyDraft.id}".`);
  };

  return (
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
  );
};

export default FamilyBlueprintTab;
