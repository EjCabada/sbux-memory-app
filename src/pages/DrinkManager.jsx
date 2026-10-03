import React, { useState, useMemo } from "react";
import { useDrinkCatalog } from "../context/DrinkContext.jsx";
import styles from "./DrinkManager.module.css";

const COLD_FOAM_RECIPES = [
  { name: "Vanilla Sweet Cream Cold Foam (VSC)", base: "100ml Sweet Cream", flavor: "Standard default (2 pumps vanilla in pitcher optional for extra sweetness)" },
  { name: "Salted Caramel Cold Foam", base: "100ml Sweet Cream", flavor: "2 pumps Caramel Syrup + 2 Salt Packets in foaming pitcher" },
  { name: "Chocolate Cold Foam", base: "100ml Sweet Cream", flavor: "2 scoops Malt Powder in foaming pitcher" },
  { name: "Matcha Cold Foam", base: "100ml Sweet Cream", flavor: "1-2 scoops Matcha Powder in foaming pitcher" },
  { name: "White Mocha Cold Foam", base: "100ml Sweet Cream", flavor: "2 pumps White Chocolate Mocha sauce in foaming pitcher" },
  { name: "Strawberry Cold Foam", base: "100ml Sweet Cream", flavor: "Strawberry puree to 50ml + Sweet Cream to 100ml line" },
];

const EMPTY_DRINK = {
  id: "",
  name: "",
  family: "latte",
  station: "espresso_bar",
  season: "core",
  isActive: true,
  isRistretto: false,
  curriculum: { isFundamental: false, allowInSpeedQuiz: true, allowInSequencing: true },
  tags: ["espresso bar"],
  comments: "",
  sizes: {
    tall: { shots: "1", pumps: "3" },
    grande: { shots: "2", pumps: "4" },
    venti_hot: { shots: "2", pumps: "5" },
    venti_iced: { shots: "3", pumps: "6" },
  },
  hot: {
    needsSleeve: false,
    hasHotWater: false,
    requiresSteamedMilk: true,
    stopPoint: "steam_milk",
    steps: ["queue_shots", "catch_cup", "steam_milk", "clean_wand", "groom_milk", "free_pour_milk", "add_lid", "connect_handoff"],
  },
};

const DrinkManager = () => {
  const { drinks, archetypes, saveCatalog, updateArchetypeAndSyncDrinks, isLoading } = useDrinkCatalog();
  const [activeTab, setActiveTab] = useState("catalog");
  const [filterSeason, setFilterSeason] = useState("all");
  const [editingDrink, setEditingDrink] = useState(null);
  const [isDrinkModalOpen, setIsDrinkModalOpen] = useState(false);

  // Archetype Editing State
  const [selectedArchKey, setSelectedArchKey] = useState("latte");
  const [archSizesJson, setArchSizesJson] = useState("");

  const existingSeasons = useMemo(() => {
    return Array.from(new Set(drinks.map((d) => d.season).filter(Boolean)));
  }, [drinks]);

  const similarNames = useMemo(() => {
    if (!editingDrink || !editingDrink.name.trim()) return [];
    const query = editingDrink.name.trim().toLowerCase();
    return drinks.filter(
      (d) => d.id !== editingDrink.id && d.name.toLowerCase().includes(query)
    );
  }, [editingDrink?.name, drinks, editingDrink?.id]);

  const filteredDrinks = drinks.filter((d) => {
    if (filterSeason === "all") return true;
    return d.season === filterSeason;
  });

  const handleToggleActive = (id) => {
    saveCatalog(drinks.map((d) => (d.id === id ? { ...d, isActive: !d.isActive } : d)));
  };

  const handleDeleteDrink = (id) => {
    if (window.confirm("Delete this drink from the catalog?")) {
      saveCatalog(drinks.filter((d) => d.id !== id));
    }
  };

  const handleOpenAdd = () => {
    setEditingDrink({ ...EMPTY_DRINK, id: `drink_${Date.now()}` });
    setIsDrinkModalOpen(true);
  };

  const handleOpenEdit = (drink) => {
    setEditingDrink(JSON.parse(JSON.stringify(drink)));
    setIsDrinkModalOpen(true);
  };

  const applyArchetypeToDrink = (key) => {
    const preset = archetypes[key];
    if (!preset) return;
    setEditingDrink((prev) => ({
      ...prev,
      family: key,
      station: preset.station,
      sizes: JSON.parse(JSON.stringify(preset.sizes)),
      hot: preset.hot ? JSON.parse(JSON.stringify(preset.hot)) : undefined,
      iced: preset.iced ? JSON.parse(JSON.stringify(preset.iced)) : undefined,
    }));
  };

  const handleSaveDrink = (e) => {
    e.preventDefault();
    const exists = drinks.some((d) => d.id === editingDrink.id);
    const updated = exists
      ? drinks.map((d) => (d.id === editingDrink.id ? editingDrink : d))
      : [...drinks, editingDrink];

    saveCatalog(updated);
    setIsDrinkModalOpen(false);
  };

  const handleOpenArchEditor = (archKey) => {
    setSelectedArchKey(archKey);
    setArchSizesJson(JSON.stringify(archetypes[archKey].sizes, null, 2));
  };

  const handleSaveArchetypeAndSync = () => {
    try {
      const parsedSizes = JSON.parse(archSizesJson);
      const current = archetypes[selectedArchKey];
      const updated = { ...current, sizes: parsedSizes };
      updateArchetypeAndSyncDrinks(selectedArchKey, updated);
      alert(`Updated archetype "${current.name}" and synced changes across all drinks in this family!`);
    } catch (err) {
      alert("Invalid JSON in sizes specification.");
    }
  };

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(drinks, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "drinks.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className={styles.container}><p>Loading Manager...</p></div>;

  return (
    <div className={styles.container}>
      <div className={styles.navTabs}>
        <button
          className={`${styles.tabBtn} ${activeTab === "catalog" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("catalog")}
        >
          Drink Catalog ({drinks.length})
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "archetypes" ? styles.activeTab : ""}`}
          onClick={() => {
            setActiveTab("archetypes");
            handleOpenArchEditor(selectedArchKey);
          }}
        >
          Family Archetypes & Formulas
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "coldfoam" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("coldfoam")}
        >
          Cold Foam Reference
        </button>
      </div>

      {activeTab === "catalog" && (
        <>
          <div className={styles.headerRow}>
            <div>
              <h2>Drink Catalog</h2>
              <p>Add, edit, or disable core & seasonal beverages.</p>
            </div>
            <div className={styles.headerActions}>
              <button className={styles.addBtn} onClick={handleOpenAdd}>+ New Drink</button>
              <button className={styles.exportBtn} onClick={handleExportJSON}>Export drinks.json</button>
            </div>
          </div>

          <div className={styles.filterRow}>
            <label>Filter Season:</label>
            <select value={filterSeason} onChange={(e) => setFilterSeason(e.target.value)}>
              <option value="all">All Seasons</option>
              {existingSeasons.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.drinkTable}>
              <thead>
                <tr>
                  <th>Active</th>
                  <th>Drink Name</th>
                  <th>Family</th>
                  <th>Station</th>
                  <th>Season</th>
                  <th>Fundamental</th>
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
                        onChange={() => handleToggleActive(d.id)}
                      />
                    </td>
                    <td><strong>{d.name}</strong></td>
                    <td><code>{d.family}</code></td>
                    <td>{d.station}</td>
                    <td><span className={styles.seasonTag}>{d.season}</span></td>
                    <td>{d.curriculum?.isFundamental ? "Yes" : "No"}</td>
                    <td>
                      <button className={styles.actionBtnEdit} onClick={() => handleOpenEdit(d)}>Edit</button>
                      <button className={styles.actionBtnDel} onClick={() => handleDeleteDrink(d.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === "archetypes" && (
        <div className={styles.archContainer}>
          <h2>Family Archetype Editor</h2>
          <p>Modify standard ratios (e.g. 1/2/3/4 tea sweetness, 4/5/6/7 energy pumps) and sync them across all drinks assigned to that family in one click.</p>

          <div className={styles.archSelectorRow}>
            <label>Select Family Archetype to Manage:</label>
            <select
              value={selectedArchKey}
              onChange={(e) => handleOpenArchEditor(e.target.value)}
            >
              {Object.entries(archetypes).map(([k, arch]) => (
                <option key={k} value={k}>{arch.name} ({k})</option>
              ))}
            </select>
          </div>

          <div className={styles.archEditCard}>
            <h3>Editing: {archetypes[selectedArchKey]?.name}</h3>
            <p>Modify sizes JSON structure below (pumps, caffeine_pumps, scoops, tea_bags, shots):</p>
            <textarea
              rows="12"
              className={styles.jsonTextarea}
              value={archSizesJson}
              onChange={(e) => setArchSizesJson(e.target.value)}
            />
            <div className={styles.archActionRow}>
              <button className={styles.saveBtn} onClick={handleSaveArchetypeAndSync}>
                Sync Formula to All Family Drinks
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === "coldfoam" && (
        <div className={styles.archContainer}>
          <h2>Cold Foam Formulations & Build Standards</h2>
          <p>Standard portions for Cold Foam routines on Cold Bar:</p>
          <div className={styles.foamGrid}>
            {COLD_FOAM_RECIPES.map((foam, i) => (
              <div key={i} className={styles.foamCard}>
                <h4>{foam.name}</h4>
                <p><strong>Base:</strong> {foam.base}</p>
                <p><strong>Flavoring:</strong> {foam.flavor}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drink Edit / Add Modal */}
      {isDrinkModalOpen && editingDrink && (
        <div className={styles.modalBackdrop}>
          <div className={styles.modalContent}>
            <h3>{editingDrink.name ? `Edit: ${editingDrink.name}` : "Create New Drink"}</h3>

            <div className={styles.presetBar}>
              <label>Apply Archetype Defaults:</label>
              <select onChange={(e) => applyArchetypeToDrink(e.target.value)} defaultValue="">
                <option value="" disabled>-- Select Preset --</option>
                {Object.entries(archetypes).map(([k, p]) => (
                  <option key={k} value={k}>{p.name}</option>
                ))}
              </select>
            </div>

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
                    Similar drinks exist: {similarNames.map((d) => d.name).join(", ")}
                  </div>
                )}
              </div>

              <div className={styles.inlineTwo}>
                <div className={styles.formGroup}>
                  <label>Family Archetype:</label>
                  <select
                    value={editingDrink.family}
                    onChange={(e) => setEditingDrink({ ...editingDrink, family: e.target.value })}
                  >
                    {Object.keys(archetypes).map((k) => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Season:</label>
                  <input
                    type="text"
                    required
                    value={editingDrink.season}
                    onChange={(e) => setEditingDrink({ ...editingDrink, season: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Station:</label>
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
                <label>Comments / Exceptions:</label>
                <textarea
                  rows="2"
                  value={editingDrink.comments || ""}
                  onChange={(e) => setEditingDrink({ ...editingDrink, comments: e.target.value })}
                />
              </div>

              <div className={styles.sectionDivider}>Workflow & Packaging Rules</div>
              <div className={styles.checkboxGrid}>
                <label>
                  <input
                    type="checkbox"
                    checked={editingDrink.isRistretto || false}
                    onChange={(e) => setEditingDrink({ ...editingDrink, isRistretto: e.target.checked })}
                  />
                  Ristretto Shots
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={editingDrink.curriculum?.isFundamental || false}
                    onChange={(e) =>
                      setEditingDrink({
                        ...editingDrink,
                        curriculum: { ...editingDrink.curriculum, isFundamental: e.target.checked },
                      })
                    }
                  />
                  Fundamental Deck
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={editingDrink.hot?.hasHotWater || false}
                    onChange={(e) =>
                      setEditingDrink({
                        ...editingDrink,
                        hot: { ...editingDrink.hot, hasHotWater: e.target.checked },
                      })
                    }
                  />
                  Has Hot Water (Americano/Hot Tea)
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={editingDrink.hot?.needsSleeve || false}
                    onChange={(e) =>
                      setEditingDrink({
                        ...editingDrink,
                        hot: { ...editingDrink.hot, needsSleeve: e.target.checked },
                      })
                    }
                  />
                  Requires Cup Sleeve
                </label>
              </div>

              <div className={styles.modalBtnRow}>
                <button type="button" className={styles.cancelBtn} onClick={() => setIsDrinkModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.saveBtn}>Save Drink</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DrinkManager;
