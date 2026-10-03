import React, { createContext, useContext, useState, useEffect } from "react";

const DrinkContext = createContext(null);
const LOCAL_STORAGE_KEY = "sbux_drink_catalog_overrides";
const ARCHETYPES_STORAGE_KEY = "sbux_family_archetypes";

export const DEFAULT_ARCHETYPES = {
  latte: {
    id: "latte",
    name: "Standard Espresso Latte",
    station: "espresso_bar",
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
      steps: ["queue_shots", "pump_syrups", "catch_cup", "steam_milk", "clean_wand", "groom_milk", "free_pour_milk", "add_lid", "connect_handoff"],
    },
  },
  shaken_espresso: {
    id: "shaken_espresso",
    name: "Shaken Espresso Build",
    station: "espresso_bar",
    sizes: {
      tall: { shots: "2", pumps: "1" },
      grande: { shots: "3", pumps: "2" },
      venti_iced: { shots: "4", pumps: "3" },
    },
    iced: {
      needsSleeve: false,
      hasHotWater: false,
      requiresSteamedMilk: false,
      stopPoint: "catch_glass",
      steps: ["queue_shots", "pump_shaker", "catch_glass", "add_ice", "shake_10x", "top_milk", "add_lid", "connect_handoff"],
    },
  },
  iced_tea: {
    id: "iced_tea",
    name: "Standard Iced Tea (Sweetened Standard)",
    station: "cold_bar",
    sizes: {
      tall: { classic_pumps: "1" },
      grande: { classic_pumps: "2" },
      venti_iced: { classic_pumps: "3" },
      trenta: { classic_pumps: "4" },
    },
    iced: {
      needsSleeve: false,
      hasHotWater: false,
      requiresSteamedMilk: false,
      stopPoint: "add_ice",
      steps: ["pour_tea_shaker", "add_water_lemonade", "pump_liquid_cane", "add_ice", "shake_10x", "add_lid", "connect_handoff"],
    },
  },
  refresher_standard: {
    id: "refresher_standard",
    name: "Standard Refresher (Juice + Hand-Pumped Caffeine)",
    station: "cold_bar",
    sizes: {
      tall: { caffeine_pumps: "1", fruit_inclusions: "1" },
      grande: { caffeine_pumps: "2", fruit_inclusions: "1" },
      venti_iced: { caffeine_pumps: "3", fruit_inclusions: "1" },
      trenta: { caffeine_pumps: "4", fruit_inclusions: "2" },
    },
    iced: {
      needsSleeve: false,
      hasHotWater: false,
      requiresSteamedMilk: false,
      stopPoint: "add_ice",
      steps: ["pour_refresher_base", "add_water_lemonade", "pump_caffeine", "add_inclusions", "add_ice", "shake_10x", "add_lid", "connect_handoff"],
    },
  },
  refresher_energy: {
    id: "refresher_energy",
    name: "Energy Refresher (High Caffeine Boost)",
    station: "cold_bar",
    sizes: {
      tall: { caffeine_pumps: "4", fruit_inclusions: "1" },
      grande: { caffeine_pumps: "5", fruit_inclusions: "1" },
      venti_iced: { caffeine_pumps: "6", fruit_inclusions: "1" },
      trenta: { caffeine_pumps: "7", fruit_inclusions: "2" },
    },
    iced: {
      needsSleeve: false,
      hasHotWater: false,
      requiresSteamedMilk: false,
      stopPoint: "add_ice",
      steps: ["pour_refresher_base", "add_water_lemonade", "pump_caffeine", "add_inclusions", "add_ice", "shake_10x", "add_lid", "connect_handoff"],
    },
  },
  matcha_cold_bar: {
    id: "matcha_cold_bar",
    name: "Cold Bar Iced Matcha",
    station: "cold_bar",
    sizes: {
      tall: { scoops: "2", classic_pumps: "2" },
      grande: { scoops: "3", classic_pumps: "3" },
      venti_iced: { scoops: "4", classic_pumps: "4" },
    },
    iced: {
      needsSleeve: false,
      hasHotWater: false,
      requiresSteamedMilk: false,
      stopPoint: "blend_pitcher",
      steps: ["pour_cold_milk", "add_matcha_shaker", "pump_syrups", "blend_pitcher", "add_ice", "add_cold_foam", "add_lid", "connect_handoff"],
    },
  },
  frappuccino: {
    id: "frappuccino",
    name: "Standard Frappuccino (Coffee / Crème Base)",
    station: "blended",
    sizes: {
      tall: { pumps: "2" },
      grande: { pumps: "3" },
      venti_iced: { pumps: "4" },
    },
    iced: {
      needsSleeve: false,
      hasHotWater: false,
      requiresSteamedMilk: false,
      stopPoint: "blend_pitcher",
      steps: ["pump_syrups", "pour_cold_milk", "add_ice", "blend_pitcher", "add_whip", "add_lid", "connect_handoff"],
    },
  },
  cold_brew: {
    id: "cold_brew",
    name: "Cold Brew / Nitro Base",
    station: "cold_bar",
    sizes: {
      tall: { pumps: "1" },
      grande: { pumps: "2" },
      venti_iced: { pumps: "3" },
      trenta: { pumps: "4" },
    },
    iced: {
      needsSleeve: false,
      hasHotWater: false,
      requiresSteamedMilk: false,
      stopPoint: "add_ice",
      steps: ["pump_syrups", "pour_cold_milk", "add_ice", "add_cold_foam", "add_lid", "connect_handoff"],
    },
  },
  hot_tea: {
    id: "hot_tea",
    name: "Hot Tea / Honey Citrus Mint",
    station: "espresso_bar",
    sizes: {
      short: { tea_bags: "1", honey_pumps: "1" },
      tall: { tea_bags: "2", honey_pumps: "1" },
      grande: { tea_bags: "2", honey_pumps: "2" },
      venti_hot: { tea_bags: "2", honey_pumps: "2" },
    },
    hot: {
      needsSleeve: true,
      hasHotWater: true,
      requiresSteamedMilk: true,
      stopPoint: "steam_lemonade",
      steps: ["add_tea_bags", "pump_honey", "add_hot_water", "steam_lemonade", "clean_wand", "free_pour_milk", "add_sleeve", "add_lid", "connect_handoff"],
    },
  },
};

export const DrinkProvider = ({ children }) => {
  const [drinks, setDrinks] = useState([]);
  const [archetypes, setArchetypes] = useState(DEFAULT_ARCHETYPES);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const baseUrl = import.meta.env.BASE_URL || "./";
        const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
        const res = await fetch(`${normalizedBase}data/drinks.json`);
        const baseData = await res.json();
        
        const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
        const localArch = localStorage.getItem(ARCHETYPES_STORAGE_KEY);

        setDrinks(localData ? JSON.parse(localData) : baseData);
        if (localArch) setArchetypes(JSON.parse(localArch));
      } catch (err) {
        console.error("Error loading catalog:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadCatalog();
  }, []);

  const saveCatalog = (updatedList) => {
    setDrinks(updatedList);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updatedList));
  };

  const saveArchetypes = (updatedArchetypes) => {
    setArchetypes(updatedArchetypes);
    localStorage.setItem(ARCHETYPES_STORAGE_KEY, JSON.stringify(updatedArchetypes));
  };

  /** Updates an archetype and immediately propagates changes to all matching drinks */
  const updateArchetypeAndSyncDrinks = (archetypeId, newArchetypeData) => {
    const updatedArchs = { ...archetypes, [archetypeId]: newArchetypeData };
    saveArchetypes(updatedArchs);

    const updatedDrinks = drinks.map((drink) => {
      if (drink.family === archetypeId) {
        return {
          ...drink,
          station: newArchetypeData.station || drink.station,
          sizes: JSON.parse(JSON.stringify(newArchetypeData.sizes)),
          hot: newArchetypeData.hot ? JSON.parse(JSON.stringify(newArchetypeData.hot)) : drink.hot,
          iced: newArchetypeData.iced ? JSON.parse(JSON.stringify(newArchetypeData.iced)) : drink.iced,
        };
      }
      return drink;
    });

    saveCatalog(updatedDrinks);
  };

  const getBalancedQuizPool = ({
    count = 10,
    filterFn = (d) => d.isActive,
  } = {}) => {
    const eligible = drinks.filter(filterFn);
    const byFamily = {};

    eligible.forEach((d) => {
      const fam = d.family || d.id;
      if (!byFamily[fam]) byFamily[fam] = [];
      byFamily[fam].push(d);
    });

    const shuffledFamilies = Object.keys(byFamily).sort(() => Math.random() - 0.5);
    const selected = [];

    for (const fam of shuffledFamilies) {
      if (selected.length >= count) break;
      const variants = byFamily[fam];
      const pick = variants[Math.floor(Math.random() * variants.length)];
      selected.push(pick);
    }

    if (selected.length < count) {
      const remaining = eligible.filter((d) => !selected.some((s) => s.id === d.id));
      const filler = remaining.sort(() => Math.random() - 0.5).slice(0, count - selected.length);
      selected.push(...filler);
    }

    return selected;
  };

  return (
    <DrinkContext.Provider
      value={{
        drinks,
        archetypes,
        isLoading,
        saveCatalog,
        saveArchetypes,
        updateArchetypeAndSyncDrinks,
        getBalancedQuizPool,
      }}
    >
      {children}
    </DrinkContext.Provider>
  );
};

export const useDrinkCatalog = () => {
  const context = useContext(DrinkContext);
  if (!context) {
    throw new Error("useDrinkCatalog must be used within a DrinkProvider");
  }
  return context;
};
