import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useDrinkCatalog } from "../context/DrinkContext.jsx";
import { getWeakSpotIds, loadTraineeStats, recordDrinkStudyResult } from "../utils/studyStats.js";
import styles from "./BeginnerQuiz.module.css";

const MODES = {
  PERFECTION: "perfection",
  TIME_1: "1min",
  TIME_2: "2min",
  TIME_5: "5min",
  UNLIMITED: "unlimited",
};

const SIZE_BAR_HEIGHTS = {
  short: 16,
  tall: 24,
  grande: 32,
  venti_hot: 40,
  venti_iced: 48,
  trenta: 54,
};

const SHOT_OPTIONS_STANDARD = ["0", "1", "2", "3", "4"];
const SHOT_OPTIONS_RISTRETTO = ["0", "1R", "2R", "3R", "4R"];
const PUMP_OPTIONS = ["0", "1", "2", "3", "4", "5", "6"];
const SMALL_COUNT_OPTIONS = ["0", "1", "2", "3", "4"];

const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);

function getKeypadOptionsForMetric(metricKey, isRistretto) {
  if (metricKey === "shots") {
    return isRistretto ? SHOT_OPTIONS_RISTRETTO : SHOT_OPTIONS_STANDARD;
  }
  if (
    metricKey === "frap_roast" ||
    metricKey === "matcha_scoops" ||
    metricKey === "fruit_inclusions" ||
    metricKey === "tea_bags"
  ) {
    return SMALL_COUNT_OPTIONS;
  }
  return PUMP_OPTIONS;
}

function buildIngredientQuestionsForDrink(drink, allDrinks) {
  const ing = drink.ingredients || {};
  const correctRoast = ing.roast || "Signature Espresso";
  const correctMilk = ing.milk && ing.milk !== "-" ? ing.milk : "None";
  const correctSyrup =
    Array.isArray(ing.syrups) && ing.syrups.length > 0 ? ing.syrups.join(" + ") : "Unsweetened";

  const finishParts = [...(ing.toppings || [])];
  if (drink.hasWhip && !finishParts.some((t) => t.toLowerCase().includes("whip"))) {
    finishParts.unshift("Whipped Cream");
  }
  if (drink.hasColdFoam && drink.coldFoamLabel) {
    finishParts.push(drink.coldFoamLabel);
  }
  const correctFinish = finishParts.length > 0 ? finishParts.join(", ") : "None";

  const pickChoices = (correctVal, poolValues) => {
    const distractors = shuffle(
      Array.from(new Set(poolValues.filter((v) => v && v !== correctVal)))
    ).slice(0, 3);
    return shuffle([correctVal, ...distractors]);
  };

  const roastPool = [
    "Signature Espresso",
    "Blonde Espresso",
    "Frap Roast",
    "Cold Brew",
    "Matcha Green Tea",
    "Strawberry Açaí Base",
    "Mango Dragonfruit Base",
    ...allDrinks.map((d) => d.ingredients?.roast),
  ];
  const milkPool = [
    "2% Milk",
    "Whole Milk",
    "Oatmilk",
    "Vanilla Sweet Cream",
    "Water",
    "Water / Lemonade",
    "Lemonade",
    "None",
    ...allDrinks.map((d) => d.ingredients?.milk).filter((m) => m && m !== "-"),
  ];
  const syrupPool = [
    "Unsweetened",
    "Vanilla Syrup",
    "Brown Sugar Syrup",
    "Classic Syrup",
    "Caramel Syrup",
    "Dark Caramel Sauce",
    "Mocha Sauce",
    "White Chocolate Mocha Sauce",
    "Cinnamon Dolce Syrup",
    ...allDrinks.map((d) =>
      d.ingredients?.syrups?.length ? d.ingredients.syrups.join(" + ") : "Unsweetened"
    ),
  ];
  const finishPool = [
    "None",
    "Whipped Cream",
    "Whipped Cream, Caramel Drizzle",
    "Caramel Crosshatch",
    "Cinnamon Powder",
    "Vanilla Sweet Cream Cold Foam",
    "Salted Caramel Cream Cold Foam",
    ...allDrinks.map((d) => {
      const p = [...(d.ingredients?.toppings || [])];
      if (d.hasWhip && !p.some((t) => t.toLowerCase().includes("whip"))) p.unshift("Whipped Cream");
      if (d.hasColdFoam && d.coldFoamLabel) p.push(d.coldFoamLabel);
      return p.length > 0 ? p.join(", ") : "None";
    }),
  ];

  return [
    { key: "roast", label: "Roast / Base", value: correctRoast, options: pickChoices(correctRoast, roastPool) },
    { key: "milk", label: "Milk / Liquid", value: correctMilk, options: pickChoices(correctMilk, milkPool) },
    { key: "syrup", label: "Syrup / Sauce", value: correctSyrup, options: pickChoices(correctSyrup, syrupPool) },
    { key: "finish", label: "Toppings / Foam", value: correctFinish, options: pickChoices(correctFinish, finishPool) },
  ];
}

const BeginnerQuiz = ({ stationMode = "hot_bar" }) => {
  const { drinks, isLoading, getBalancedQuizPool } = useDrinkCatalog();
  const isColdBar = stationMode === "cold_bar";

  const [quizFocus, setQuizFocus] = useState("proportions"); // "proportions" | "ingredients"
  const [deckFilter, setDeckFilter] = useState("essentials"); // "essentials" | "missed"
  const [traineeStats, setTraineeStats] = useState(loadTraineeStats);

  const [selectedMode, setSelectedMode] = useState(null);
  const [gameState, setGameState] = useState("menu");
  const [drinkPool, setDrinkPool] = useState([]);
  const [currentDrink, setCurrentDrink] = useState(null);
  const [shuffledSizes, setShuffledSizes] = useState([]);
  const [currentSizeIndex, setCurrentSizeIndex] = useState(0);
  const [ingredientPrompts, setIngredientPrompts] = useState([]);
  const [selectedValues, setSelectedValues] = useState({});
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [drinkTracking, setDrinkTracking] = useState({});
  const [currentDrinkHadError, setCurrentDrinkHadError] = useState(false);

  const sessionDeckRef = useRef([]);
  const retestQueueRef = useRef([]);
  const timerIntervalRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalCardsAttempted, setTotalCardsAttempted] = useState(0);
  const [correctCardsCount, setCorrectCardsCount] = useState(0);
  const [wrongCardsCount, setWrongCardsCount] = useState(0);

  useEffect(() => {
    clearInterval(timerIntervalRef.current);
    setGameState("menu");
    setCurrentDrink(null);
    setSelectedValues({});
    setIsEvaluating(false);
    setTraineeStats(loadTraineeStats());
  }, [stationMode]);

  const stationEssentials = useMemo(
    () =>
      drinks.filter(
        (d) =>
          d.isActive &&
          d.curriculum?.isFundamental &&
          d.sizeList.length > 0 &&
          (isColdBar ? d.station !== "espresso_bar" : d.station === "espresso_bar")
      ),
    [drinks, isColdBar]
  );

  const missedIds = useMemo(() => new Set(getWeakSpotIds(traineeStats)), [traineeStats]);
  const missedStationDrinks = useMemo(
    () =>
      drinks.filter(
        (d) =>
          d.isActive &&
          d.sizeList.length > 0 &&
          missedIds.has(d.id) &&
          (isColdBar ? d.station !== "espresso_bar" : d.station === "espresso_bar")
      ),
    [drinks, isColdBar, missedIds]
  );

  const endQuiz = useCallback(() => {
    clearInterval(timerIntervalRef.current);
    setGameState("summary");
  }, []);

  const loadDrink = useCallback(
    (drink) => {
      setCurrentDrink(drink);
      if (quizFocus === "ingredients") {
        setShuffledSizes([drink.sizeList[0]]);
        setIngredientPrompts(buildIngredientQuestionsForDrink(drink, drinks));
      } else {
        setShuffledSizes(shuffle(drink.sizeList));
        setIngredientPrompts([]);
      }
      setCurrentSizeIndex(0);
      setCurrentDrinkHadError(false);
      setSelectedValues({});
      setIsEvaluating(false);
    },
    [drinks, quizFocus]
  );

  const startQuiz = (mode) => {
    const useMissed = deckFilter === "missed" && missedStationDrinks.length > 0;
    const freshDeck = useMissed
      ? shuffle(missedStationDrinks)
      : getBalancedQuizPool({
          count: 12,
          filterFn: (d) =>
            d.isActive &&
            d.curriculum?.isFundamental &&
            d.sizeList.length > 0 &&
            (isColdBar ? d.station !== "espresso_bar" : d.station === "espresso_bar"),
        });
    if (!freshDeck.length) return;

    sessionDeckRef.current = freshDeck;
    retestQueueRef.current = [];

    setSelectedMode(mode);
    setGameState("playing");
    setTotalCardsAttempted(0);
    setCorrectCardsCount(0);
    setWrongCardsCount(0);
    setElapsedSeconds(0);
    setCurrentDrinkHadError(false);

    const initialTracking = {};
    freshDeck.forEach((d) => {
      initialTracking[d.id] = { consecutiveFails: 0, errorsThisSession: 0, cleanPasses: 0 };
    });
    setDrinkTracking(initialTracking);

    const shuffledPool = shuffle(freshDeck);
    const firstDrink = shuffledPool[0];
    setDrinkPool(shuffledPool.slice(1));
    loadDrink(firstDrink);

    if (mode === MODES.TIME_1) setTimeLeft(60);
    else if (mode === MODES.TIME_2) setTimeLeft(120);
    else if (mode === MODES.TIME_5) setTimeLeft(300);
    else setTimeLeft(0);
  };

  useEffect(() => {
    if (gameState !== "playing") return undefined;
    timerIntervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
      if (
        selectedMode === MODES.TIME_1 ||
        selectedMode === MODES.TIME_2 ||
        selectedMode === MODES.TIME_5
      ) {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            endQuiz();
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(timerIntervalRef.current);
  }, [gameState, selectedMode, endQuiz]);

  const activeSize = shuffledSizes[currentSizeIndex];

  const activeQuizMetrics = useMemo(() => {
    if (!currentDrink || !activeSize) return [];
    if (quizFocus === "ingredients") return ingredientPrompts;
    if (!isColdBar) {
      return [
        { key: "shots", label: "Shots", value: String(activeSize.shots ?? "0") },
        { key: "syrup_pumps", label: "Syrup Pumps", value: String(activeSize.pumps ?? "0") },
      ];
    }
    if (Array.isArray(activeSize.metrics) && activeSize.metrics.length > 0) {
      return activeSize.metrics.filter((m) => m.key !== "shots");
    }
    return [{ key: "syrup_pumps", label: "Syrup Pumps", value: String(activeSize.pumps ?? "0") }];
  }, [currentDrink, activeSize, ingredientPrompts, isColdBar, quizFocus]);

  const handleDrinkCompletion = () => {
    const drinkId = currentDrink.id;
    const currentTrack = drinkTracking[drinkId] || { consecutiveFails: 0, cleanPasses: 0 };
    let nextQueue = [...retestQueueRef.current];
    let nextPool = [...drinkPool];

    const updatedStats = recordDrinkStudyResult(drinkId, !currentDrinkHadError);
    setTraineeStats(updatedStats);

    if (currentDrinkHadError) {
      const newFails = currentTrack.consecutiveFails + 1;
      setDrinkTracking((prev) => ({
        ...prev,
        [drinkId]: { ...prev[drinkId], consecutiveFails: newFails },
      }));

      if (newFails === 1) {
        if (nextPool.length > 0) {
          const bufferDrink = nextPool.shift();
          nextQueue = [bufferDrink.id, drinkId, ...nextQueue];
        } else {
          nextQueue.push(drinkId);
        }
      } else {
        nextQueue.unshift(drinkId);
      }
    } else {
      setDrinkTracking((prev) => ({
        ...prev,
        [drinkId]: {
          ...prev[drinkId],
          consecutiveFails: 0,
          cleanPasses: (prev[drinkId]?.cleanPasses || 0) + 1,
        },
      }));
    }

    retestQueueRef.current = nextQueue;
    setDrinkPool(nextPool);

    const lockedDeck = sessionDeckRef.current;

    if (nextQueue.length > 0) {
      const nextDrinkId = nextQueue.shift();
      retestQueueRef.current = nextQueue;
      const drinkObj = lockedDeck.find((d) => d.id === nextDrinkId) || lockedDeck[0];
      loadDrink(drinkObj);
    } else if (nextPool.length > 0) {
      const nextDrink = nextPool.shift();
      setDrinkPool(nextPool);
      loadDrink(nextDrink);
    } else if (selectedMode === MODES.PERFECTION) {
      endQuiz();
    } else {
      const recycled = shuffle(lockedDeck);
      setDrinkPool(recycled.slice(1));
      loadDrink(recycled[0]);
    }
  };

  const handleNextCard = () => {
    setSelectedValues({});
    setIsEvaluating(false);
    if (currentSizeIndex < shuffledSizes.length - 1) {
      setCurrentSizeIndex((prev) => prev + 1);
    } else {
      handleDrinkCompletion();
    }
  };

  const handleMetricSelect = (metricKey, val) => {
    if (isEvaluating || selectedValues[metricKey] !== undefined || !activeSize) return;
    const nextSelected = { ...selectedValues, [metricKey]: val };
    setSelectedValues(nextSelected);

    const allAnswered = activeQuizMetrics.every((m) => nextSelected[m.key] !== undefined);
    if (!allAnswered) return;

    setIsEvaluating(true);
    setTotalCardsAttempted((prev) => prev + 1);

    const isPass = activeQuizMetrics.every((m) => nextSelected[m.key] === String(m.value));

    if (isPass) {
      setCorrectCardsCount((prev) => prev + 1);
    } else {
      setWrongCardsCount((prev) => prev + 1);
      setCurrentDrinkHadError(true);
      setDrinkTracking((prev) => ({
        ...prev,
        [currentDrink.id]: {
          ...prev[currentDrink.id],
          errorsThisSession: (prev[currentDrink.id]?.errorsThisSession || 0) + 1,
        },
      }));
    }

    setTimeout(() => {
      handleNextCard();
    }, isPass ? 550 : 1200);
  };

  const getTopDrinksToStudy = () => {
    const lockedDeck = sessionDeckRef.current;
    return Object.entries(drinkTracking)
      .map(([id, data]) => {
        const drink = lockedDeck.find((d) => d.id === id);
        return { name: drink ? drink.name : id, errors: data.errorsThisSession };
      })
      .filter((item) => item.errors > 0)
      .sort((a, b) => b.errors - a.errors)
      .slice(0, 3);
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <p>Loading drinks catalog...</p>
      </div>
    );
  }

  if (gameState === "menu") {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>{isColdBar ? "Cold Bar Essentials" : "Hot Bar Essentials"}</h2>
          <div className={styles.segmentedRow}>
            <button
              type="button"
              className={`${styles.segBtn} ${quizFocus === "proportions" ? styles.segBtnActive : ""}`}
              onClick={() => setQuizFocus("proportions")}
            >
              Numbers (Shots &amp; Pumps)
            </button>
            <button
              type="button"
              className={`${styles.segBtn} ${quizFocus === "ingredients" ? styles.segBtnActive : ""}`}
              onClick={() => setQuizFocus("ingredients")}
            >
              What&apos;s in the Cup?
            </button>
          </div>

          {missedStationDrinks.length > 0 && (
            <div className={styles.segmentedRow}>
              <button
                type="button"
                className={`${styles.segBtn} ${deckFilter === "essentials" ? styles.segBtnActive : ""}`}
                onClick={() => setDeckFilter("essentials")}
              >
                All Essentials ({stationEssentials.length})
              </button>
              <button
                type="button"
                className={`${styles.segBtn} ${deckFilter === "missed" ? styles.segBtnMissed : ""}`}
                onClick={() => setDeckFilter("missed")}
              >
                Missed Drinks ({missedStationDrinks.length})
              </button>
            </div>
          )}
        </div>

        <div className={styles.modeSection}>
          <div className={styles.modeList}>
            <button className={styles.perfectionCard} onClick={() => startQuiz(MODES.PERFECTION)}>
              <div className={styles.modeTitle}>Perfection Mode</div>
              <div className={styles.modeDesc}>
                Pass every drink in the deck cleanly with zero mistakes.
              </div>
            </button>
            <div className={styles.timedRow}>
              <button className={styles.timedBtn} onClick={() => startQuiz(MODES.TIME_1)}>1 Min</button>
              <button className={styles.timedBtn} onClick={() => startQuiz(MODES.TIME_2)}>2 Min</button>
              <button className={styles.timedBtn} onClick={() => startQuiz(MODES.TIME_5)}>5 Min</button>
            </div>
            <button className={styles.unlimitedBtn} onClick={() => startQuiz(MODES.UNLIMITED)}>
              Unlimited Free Drill
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === "summary") {
    const studyList = getTopDrinksToStudy();
    const accuracy = totalCardsAttempted > 0 ? Math.round((correctCardsCount / totalCardsAttempted) * 100) : 0;
    return (
      <div className={styles.container}>
        <div className={styles.summaryCard}>
          <h2>{selectedMode === MODES.PERFECTION ? "Deck Mastered!" : "Session Complete"}</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <span className={styles.statVal}>
                {selectedMode === MODES.PERFECTION
                  ? formatTime(elapsedSeconds)
                  : `${correctCardsCount}/${totalCardsAttempted}`}
              </span>
              <span className={styles.statLbl}>
                {selectedMode === MODES.PERFECTION ? "Time" : "Correct"}
              </span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statVal}>{accuracy}%</span>
              <span className={styles.statLbl}>Accuracy</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statVal}>{wrongCardsCount}</span>
              <span className={styles.statLbl}>Mistakes</span>
            </div>
          </div>
          {studyList.length > 0 && (
            <div className={styles.studySection}>
              <h4>Saved to Missed Drinks</h4>
              <ol className={styles.studyList}>
                {studyList.map((d, i) => (
                  <li key={i}>
                    <span>{d.name}</span>
                    <span className={styles.errorPill}>{d.errors}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className={styles.summaryActions}>
            <button className={styles.primaryAction} onClick={() => startQuiz(selectedMode)}>Try Again</button>
            <button className={styles.secondaryAction} onClick={() => setGameState("menu")}>Change Mode</button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentDrink || !activeSize) return null;

  return (
    <div className={styles.quizWrapper}>
      <div className={styles.topStatus}>
        <button className={styles.exitBtn} onClick={() => setGameState("menu")}>&times; Exit</button>
        <div className={styles.timerBadge}>
          {selectedMode === MODES.PERFECTION
            ? formatTime(elapsedSeconds)
            : selectedMode === MODES.UNLIMITED
            ? `Cards: ${correctCardsCount}`
            : formatTime(timeLeft)}
        </div>
      </div>

      <div className={styles.drinkHeaderCard}>
        <h2 className={styles.drinkName}>{currentDrink.name}</h2>
        {quizFocus === "proportions" ? (
          <>
            <div className={styles.visualSizeContainer}>
              {currentDrink.sizeList.map((s) => {
                const isActive = s.sizeKey === activeSize.sizeKey;
                const barPx = SIZE_BAR_HEIGHTS[s.sizeKey] || 32;
                return (
                  <div
                    key={s.sizeKey}
                    className={`${styles.sizeBarWrapper} ${isActive ? styles.activeSizeBarWrapper : ""}`}
                  >
                    <div
                      className={`${styles.sizeBar} ${isActive ? styles.activeSizeBar : ""}`}
                      style={{ height: `${barPx}px` }}
                    />
                    <span className={styles.sizeBarLabel}>{s.shortLabel}</span>
                  </div>
                );
              })}
            </div>
            <div className={styles.sizeBadge}>{activeSize.size}</div>
          </>
        ) : (
          <div className={styles.sizeBadge}>What&apos;s in the Cup?</div>
        )}
      </div>

      <div className={styles.inputArea}>
        {activeQuizMetrics.map((metric) => {
          const isIngredientChoice = Array.isArray(metric.options);
          const keypadOptions = isIngredientChoice
            ? metric.options
            : getKeypadOptionsForMetric(metric.key, currentDrink.isRistretto);
          const selectedVal = selectedValues[metric.key];
          const expectedVal = String(metric.value);
          return (
            <div key={metric.key} className={styles.selectorGroup}>
              <div className={styles.groupLabel}>
                <span>{metric.label}</span>
                {isEvaluating && (
                  <span className={selectedVal === expectedVal ? styles.okLabel : styles.errLabel}>
                    {selectedVal === expectedVal ? "Correct" : expectedVal}
                  </span>
                )}
              </div>
              <div className={isIngredientChoice ? styles.chipGrid : styles.keypadRow}>
                {keypadOptions.map((val) => {
                  const isSelected = selectedVal === val;
                  const isCorrect = val === expectedVal;
                  let btnClass = isIngredientChoice ? styles.chipBtn : styles.keyBtn;
                  if (isEvaluating) {
                    if (isCorrect) btnClass += ` ${styles.correctKey}`;
                    else if (isSelected && !isCorrect) btnClass += ` ${styles.wrongKey}`;
                  } else if (isSelected) {
                    btnClass += ` ${styles.selectedKey}`;
                  }
                  return (
                    <button
                      key={val}
                      className={btnClass}
                      onClick={() => handleMetricSelect(metric.key, val)}
                      disabled={isEvaluating}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BeginnerQuiz;
