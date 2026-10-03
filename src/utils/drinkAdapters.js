export const ACTION_DICTIONARY = {
  queue_shots: "Queue Shots",
  queue_ristretto: "Queue Ristretto Shots",
  pump_syrups: "Pump Syrups in Cup",
  pump_shaker: "Pump Syrup in Shaker",
  pump_caffeine: "Pump Caffeine Base",
  pump_liquid_cane: "Pump Liquid Cane",
  pump_honey: "Pump Honey Blend",
  catch_cup: "Catch in Cup",
  catch_glass: "Catch in Shot Glass",
  steam_milk: "Steam 2% Milk",
  steam_cappuccino: "Steam Milk (6-8s Aeration)",
  steam_whole_milk: "Steam Whole Milk",
  steam_lemonade: "Steam Lemonade",
  steam_all_pitcher: "Steam Chai + Classic + Milk",
  clean_wand: "Clean Steam Wand",
  groom_milk: "Groom Milk Pitcher",
  free_pour_milk: "Pour Steamed Milk / Lemonade",
  pour_cold_milk: "Pour Cold Milk to Upper Line",
  pour_tea_shaker: "Pour Tea to Shaker Line",
  pour_refresher_base: "Pour Refresher Base",
  add_water_lemonade: "Add Water / Lemonade / Coconut Milk",
  add_tea_bags: "Add Tea Bags to Cup",
  add_inclusions: "Add Fruit Inclusions",
  add_pearls: "Add Popping Pearls",
  add_matcha_shaker: "Add Matcha Powder",
  pour_foam_dot: "Pour Milk (Dot of Foam)",
  pour_foam: "Pour Dense Foam",
  pour_shots_over: "Pour Shots Over Top",
  add_hot_water: "Add Hot Water",
  add_cold_water: "Add Cold Water",
  add_ice: "Add Ice",
  shake_10x: "Shake 10 Times",
  top_milk: "Top with Splash of Milk",
  add_cold_foam: "Top with Cold Foam",
  blend_pitcher: "Blend on #1 / #3",
  add_whip: "Add Whipped Cream",
  add_cd_topping: "Add CD Topping",
  add_caramel: "Add Caramel Crosshatch",
  add_sleeve: "Add Cup Sleeve",
  add_lid: "Add Lid",
  connect_handoff: "Connect & Hand-off",
};

const METRIC_LABELS = {
  shots: "Shots",
  pumps: "Syrup Pumps",
  honey_pumps: "Honey Blend",
  classic_pumps: "Classic Pumps",
  caffeine_pumps: "Caffeine Pumps",
  scoops: "Matcha Scoops",
  tea_bags: "Tea Bags",
  fruit_inclusions: "Fruit Scoops",
  powder_scoops: "Powder Scoops",
  pearl_scoops: "Pearl Scoops",
};

const SIZE_LABELS = {
  short: "Short (8oz)",
  tall: "Tall (12oz)",
  grande: "Grande (16oz)",
  venti_hot: "Venti Hot (20oz)",
  venti_iced: "Venti Iced (26oz)",
  trenta: "Trenta (30oz)",
};

export function toFlashcardFormat(drink) {
  const sizeEntries = Object.entries(drink.sizes || {});
  return {
    id: drink.id,
    name: drink.name,
    family: drink.family,
    station: drink.station,
    isRistretto: Boolean(drink.isRistretto),
    question: drink.station === "espresso_bar" ? "Shots & Syrup Pumps" : "Recipe Specifications",
    notes: drink.comments || "",
    sizes: sizeEntries.map(([key, val]) => {
      // Unpack all dynamic metrics present for this size
      const metrics = Object.entries(val).map(([metricKey, metricVal]) => ({
        key: metricKey,
        label: METRIC_LABELS[metricKey] || metricKey.replace(/_/g, " "),
        value: String(metricVal),
      }));

      return {
        sizeKey: key,
        size: SIZE_LABELS[key] || key,
        shots: val.shots ?? "0",
        pumps: val.pumps ?? "0",
        metrics,
      };
    }),
  };
}

export function toSequencingFormat(drink, tempMode = "hot") {
  const config = drink[tempMode];
  if (!config || !config.steps) return null;

  const stepsWithTraps = config.steps.map((actionId, index) => {
    const isStopPoint = actionId === config.stopPoint;
    const remainingSteps = config.steps.slice(index + 1);
    const options = remainingSteps.slice(0, 2);

    if (actionId.startsWith("queue_")) options.push("steam_milk");
    if (actionId.startsWith("steam_")) options.push("add_sleeve");
    if (actionId.includes("shaker")) options.push("add_ice");
    if (options.length < 3) options.push("connect_handoff");

    return {
      actionId,
      isStopPoint,
      options: Array.from(new Set(options)),
    };
  });

  const sizeLabel = tempMode === "hot" ? "Grande (16oz)" : "Venti Iced (26oz)";

  return {
    id: `${drink.id}_${tempMode}`,
    name: `${tempMode === "iced" && !drink.name.includes("Iced") ? "Iced " : ""}${drink.name}`,
    temp: tempMode === "hot" ? "Hot" : "Iced",
    size: sizeLabel,
    isVentiHot: sizeLabel.includes("Venti Hot"),
    hasHotWater: Boolean(config.hasHotWater),
    needsSleeve: Boolean(config.needsSleeve),
    requiresSteamedMilk: Boolean(config.requiresSteamedMilk),
    initialOptions: config.steps.slice(0, 3),
    steps: stepsWithTraps,
  };
}
