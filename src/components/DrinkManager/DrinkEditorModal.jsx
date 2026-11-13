import React, { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  ACTION_DICTIONARY,
  BUILD_TEMPLATES,
  COLD_FOAM_MAP,
  COLD_FOAM_PRESETS,
  TOPPING_OPTIONS,
  compileDrink,
  generateWorkflow,
  getActionLabel,
  getDefaultIngredientsForDrink,
} from "../../utils/drinkEngine.js";
import styles from "../../pages/DrinkManager.module.css";

const DrinkEditorModal = ({
  initialDrink,
  rawDrinks,
  families,
  familiesMap,
  curvesMap,
  metricsMap,
  ingredientOptions,
  seasonOptions,
  addIngredientOption,
  onSave,
  onClose,
}) => {
  const [editingDrink, setEditingDrink] = useState(initialDrink);
  const [selectedSyrupToAdd, setSelectedSyrupToAdd] = useState("");
  const [newSyrupInput, setNewSyrupInput] = useState("");
  const [selectedToppingToAdd, setSelectedToppingToAdd] = useState("");
  const [newToppingInput, setNewToppingInput] = useState("");
  const [newFinishingToggleInput, setNewFinishingToggleInput] = useState("");
  const [stepToAddByTemp, setStepToAddByTemp] = useState({ hot: "", iced: "" });
  const [customStepTextByTemp, setCustomStepTextByTemp] = useState({ hot: "", iced: "" });

  const similarNames = useMemo(() => {
    if (!editingDrink || !editingDrink.name.trim()) return [];
    const q = editingDrink.name.trim().toLowerCase();
    return rawDrinks.filter((d) => d.id !== editingDrink.id && d.name.toLowerCase().includes(q));
  }, [editingDrink, rawDrinks]);

  const liveCompiledDrink = useMemo(() => {
    if (!editingDrink) return null;
    return compileDrink(editingDrink, familiesMap, curvesMap, metricsMap);
  }, [editingDrink, familiesMap, curvesMap, metricsMap]);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    const slugId =
      editingDrink.id.startsWith("drink_") && editingDrink.name.trim()
        ? editingDrink.name
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_|_$/g, "")
        : editingDrink.id;
    onSave({ ...editingDrink, id: slugId });
  };

  return createPortal(
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContentWide} onClick={(e) => e.stopPropagation()}>
        <h3>{editingDrink.name ? `Edit Drink: ${editingDrink.name}` : "Create New Drink"}</h3>
        <div className={styles.splitEditorGrid}>
          <form onSubmit={handleSubmit} className={styles.formGrid}>
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
              <button type="button" className={styles.cancelBtn} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={styles.saveBtn}>
                Save Drink
              </button>
            </div>
          </form>

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
    </div>,
    document.body
  );
};

export default DrinkEditorModal;
