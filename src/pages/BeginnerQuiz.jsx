import React, { useState, useEffect, useRef } from "react";
import basicsData from "../data/basics.json";
import styles from "./BeginnerQuiz.module.css";

const MODES = {
  PERFECTION: "perfection",
  TIME_1: "1min",
  TIME_2: "2min",
  TIME_5: "5min",
  UNLIMITED: "unlimited",
};

const SHOT_OPTIONS_STANDARD = ["0", "1", "2", "3", "4"];
const SHOT_OPTIONS_RISTRETTO = ["0", "1R", "2R", "3R", "4R"];
const PUMP_OPTIONS = ["0", "1", "2", "3", "4", "5", "6"];

// Ascending Cup Size Spec (Short -> Tall -> Grande -> Venti Hot -> Venti Iced)
const getSizeBarSpec = (sizeStr) => {
  if (sizeStr.includes("Short")) return { rank: 1, height: 16, label: "Short" };
  if (sizeStr.includes("Tall")) return { rank: 2, height: 24, label: "Tall" };
  if (sizeStr.includes("Grande")) return { rank: 3, height: 32, label: "Grande" };
  if (sizeStr.includes("Venti Hot")) return { rank: 4, height: 40, label: "Vt Ht" };
  if (sizeStr.includes("Venti Iced")) return { rank: 5, height: 48, label: "Vt Icd" };
  return { rank: 3, height: 30, label: sizeStr };
};

const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);

const BeginnerQuiz = () => {
  const [selectedMode, setSelectedMode] = useState(null);
  const [gameState, setGameState] = useState("menu");
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  const [drinkPool, setDrinkPool] = useState([]);
  const [currentDrink, setCurrentDrink] = useState(null);
  const [shuffledSizes, setShuffledSizes] = useState([]);
  const [currentSizeIndex, setCurrentSizeIndex] = useState(0);

  const [selectedShot, setSelectedShot] = useState(null);
  const [selectedPump, setSelectedPump] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const [drinkTracking, setDrinkTracking] = useState({});
  const [currentDrinkHadError, setCurrentDrinkHadError] = useState(false);
  const retestQueueRef = useRef([]);

  const [timeLeft, setTimeLeft] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalCardsAttempted, setTotalCardsAttempted] = useState(0);
  const [correctCardsCount, setCorrectCardsCount] = useState(0);
  const [wrongCardsCount, setWrongCardsCount] = useState(0);
  const timerIntervalRef = useRef(null);

  const startQuiz = (mode) => {
    setSelectedMode(mode);
    setGameState("playing");
    setTotalCardsAttempted(0);
    setCorrectCardsCount(0);
    setWrongCardsCount(0);
    setElapsedSeconds(0);
    setCurrentDrinkHadError(false);
    retestQueueRef.current = [];

    const initialTracking = {};
    basicsData.forEach((d) => {
      initialTracking[d.id] = { consecutiveFails: 0, errorsThisSession: 0, cleanPasses: 0 };
    });
    setDrinkTracking(initialTracking);

    const shuffledPool = shuffle(basicsData);
    const firstDrink = shuffledPool[0];
    setDrinkPool(shuffledPool.slice(1));
    loadDrink(firstDrink);

    if (mode === MODES.TIME_1) setTimeLeft(60);
    else if (mode === MODES.TIME_2) setTimeLeft(120);
    else if (mode === MODES.TIME_5) setTimeLeft(300);
    else setTimeLeft(0);
  };

  useEffect(() => {
    if (gameState !== "playing") return;

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
  }, [gameState, selectedMode]);

  const loadDrink = (drink) => {
    setCurrentDrink(drink);
    setShuffledSizes(shuffle(drink.sizes));
    setCurrentSizeIndex(0);
    setCurrentDrinkHadError(false);
    setSelectedShot(null);
    setSelectedPump(null);
    setIsEvaluating(false);
  };

  const endQuiz = () => {
    clearInterval(timerIntervalRef.current);
    setGameState("summary");
  };

  const activeSize = shuffledSizes[currentSizeIndex];

  const handleShotClick = (val) => {
    if (isEvaluating || selectedShot !== null) return;
    setSelectedShot(val);
    checkAutoAdvance(val, selectedPump);
  };

  const handlePumpClick = (val) => {
    if (isEvaluating || selectedPump !== null) return;
    setSelectedPump(val);
    checkAutoAdvance(selectedShot, val);
  };

  const checkAutoAdvance = (shotVal, pumpVal) => {
    if (shotVal === null || pumpVal === null) return;

    setIsEvaluating(true);
    setTotalCardsAttempted((prev) => prev + 1);

    const isShotCorrect = shotVal === activeSize.shots;
    const isPumpCorrect = pumpVal === activeSize.pumps;
    const isPass = isShotCorrect && isPumpCorrect;

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

  const handleNextCard = () => {
    setSelectedShot(null);
    setSelectedPump(null);
    setIsEvaluating(false);

    if (currentSizeIndex < shuffledSizes.length - 1) {
      setCurrentSizeIndex((prev) => prev + 1);
    } else {
      handleDrinkCompletion();
    }
  };

  const handleDrinkCompletion = () => {
    const drinkId = currentDrink.id;
    const currentTrack = drinkTracking[drinkId] || { consecutiveFails: 0, cleanPasses: 0 };
    let nextQueue = [...retestQueueRef.current];
    let nextPool = [...drinkPool];

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
        [drinkId]: { ...prev[drinkId], consecutiveFails: 0, cleanPasses: prev[drinkId].cleanPasses + 1 },
      }));
    }

    retestQueueRef.current = nextQueue;
    setDrinkPool(nextPool);

    if (nextQueue.length > 0) {
      const nextDrinkId = nextQueue.shift();
      retestQueueRef.current = nextQueue;
      const drinkObj = basicsData.find((d) => d.id === nextDrinkId);
      loadDrink(drinkObj);
    } else if (nextPool.length > 0) {
      const nextDrink = nextPool.shift();
      setDrinkPool(nextPool);
      loadDrink(nextDrink);
    } else {
      if (selectedMode === MODES.PERFECTION) {
        endQuiz();
      } else {
        const recycled = shuffle(basicsData);
        setDrinkPool(recycled.slice(1));
        loadDrink(recycled[0]);
      }
    }
  };

  const getTopDrinksToStudy = () => {
    return Object.entries(drinkTracking)
      .map(([id, data]) => {
        const drink = basicsData.find((d) => d.id === id);
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

  // Menu State
  if (gameState === "menu") {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>Hot Bar Quiz</h2>
          <p>Master shots & syrup pumps with instant feedback</p>
          <button className={styles.rulesBtn} onClick={() => setIsRulesModalOpen(true)}>
            ℹ️ How This Quiz Works
          </button>
        </div>

        <div className={styles.modeSection}>
          <h3>Select Practice Mode</h3>
          <div className={styles.modeList}>
            <button className={styles.perfectionCard} onClick={() => startQuiz(MODES.PERFECTION)}>
              <div className={styles.modeTitle}>Perfection Mode 🎯</div>
              <div className={styles.modeDesc}>
                Drill until every hot bar drink is passed 100% cleanly without errors.
              </div>
            </button>

            <div className={styles.timedRow}>
              <button className={styles.timedBtn} onClick={() => startQuiz(MODES.TIME_1)}>
                ⏱️ 1 Min
              </button>
              <button className={styles.timedBtn} onClick={() => startQuiz(MODES.TIME_2)}>
                ⏱️ 2 Min
              </button>
              <button className={styles.timedBtn} onClick={() => startQuiz(MODES.TIME_5)}>
                ⏱️ 5 Min
              </button>
            </div>

            <button className={styles.unlimitedBtn} onClick={() => startQuiz(MODES.UNLIMITED)}>
              ♾️ Unlimited Free Drill
            </button>
          </div>
        </div>

        {isRulesModalOpen && (
          <div className={styles.modalBackdrop} onClick={() => setIsRulesModalOpen(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <h3>How the Quiz Works</h3>
              <ul>
                <li><strong>One Drink & One Size:</strong> Each card tests shots & pumps for one specific cup size.</li>
                <li><strong>Visual Cup Indicators:</strong> Ascending height bars indicate which cup size is currently active.</li>
                <li><strong>Instant Feedback:</strong> Tapping an option immediately turns green (correct) or red (incorrect).</li>
                <li><strong>Smart Retest Queue:</strong> Missed drinks return after 1 intervening drink, or immediately on repeat errors.</li>
              </ul>
              <button className={styles.modalCloseBtn} onClick={() => setIsRulesModalOpen(false)}>
                Got It!
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Summary State
  if (gameState === "summary") {
    const studyList = getTopDrinksToStudy();
    const accuracy =
      totalCardsAttempted > 0 ? Math.round((correctCardsCount / totalCardsAttempted) * 100) : 0;

    return (
      <div className={styles.container}>
        <div className={styles.summaryCard}>
          <h2>{selectedMode === MODES.PERFECTION ? "🎉 Deck Mastered!" : "⏱️ Time's Up!"}</h2>

          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <span className={styles.statVal}>
                {selectedMode === MODES.PERFECTION
                  ? formatTime(elapsedSeconds)
                  : `${correctCardsCount}/${totalCardsAttempted}`}
              </span>
              <span className={styles.statLbl}>
                {selectedMode === MODES.PERFECTION ? "Time Elapsed" : "Cards Correct"}
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

          <div className={styles.studySection}>
            <h4>Top Drinks to Review</h4>
            {studyList.length > 0 ? (
              <ol className={styles.studyList}>
                {studyList.map((d, i) => (
                  <li key={i}>
                    <span>{d.name}</span>
                    <span className={styles.errorPill}>{d.errors} errors</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={styles.flawlessMsg}>Flawless run! No drinks had errors! ☕✨</p>
            )}
          </div>

          <div className={styles.summaryActions}>
            <button className={styles.primaryAction} onClick={() => startQuiz(selectedMode)}>
              Try Again
            </button>
            <button className={styles.secondaryAction} onClick={() => setGameState("menu")}>
              Choose Different Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active Quiz View
  const shotOptions = currentDrink.isRistretto ? SHOT_OPTIONS_RISTRETTO : SHOT_OPTIONS_STANDARD;

  // Order sizes for ascending visual bars
  const orderedSizes = [...currentDrink.sizes].sort((a, b) => {
    return getSizeBarSpec(a.size).rank - getSizeBarSpec(b.size).rank;
  });

  return (
    <div className={styles.quizWrapper}>
      {/* Top Status Bar */}
      <div className={styles.topStatus}>
        <button className={styles.exitBtn} onClick={() => setGameState("menu")}>
          &times; Exit
        </button>
        <div className={styles.timerBadge}>
          {selectedMode === MODES.PERFECTION
            ? `⏱️ ${formatTime(elapsedSeconds)}`
            : selectedMode === MODES.UNLIMITED
            ? `Cards: ${correctCardsCount}`
            : `⏳ ${formatTime(timeLeft)}`}
        </div>
      </div>

      {/* Drink Banner Card with Ascending Cup Size Bars */}
      <div className={styles.drinkHeaderCard}>
        <span className={styles.drinkCategory}>Hot Bar Core Drink</span>
        <h2 className={styles.drinkName}>{currentDrink.name}</h2>

        {/* Visual Ascending Cup Size Bars */}
        <div className={styles.visualSizeContainer}>
          {orderedSizes.map((s, idx) => {
            const { height, label } = getSizeBarSpec(s.size);
            const isActive = s.size === activeSize.size;
            return (
              <div
                key={idx}
                className={`${styles.sizeBarWrapper} ${
                  isActive ? styles.activeSizeBarWrapper : ""
                }`}
              >
                <div
                  className={`${styles.sizeBar} ${isActive ? styles.activeSizeBar : ""}`}
                  style={{ height: `${height}px` }}
                />
                <span className={styles.sizeBarLabel}>{label}</span>
              </div>
            );
          })}
        </div>

        <div className={styles.sizeBadge}>{activeSize.size}</div>
      </div>

      {/* Inputs Section */}
      <div className={styles.inputArea}>
        {/* Shots Selector */}
        <div className={styles.selectorGroup}>
          <div className={styles.groupLabel}>
            <span>Shots</span>
            {isEvaluating && (
              <span className={selectedShot === activeSize.shots ? styles.okLabel : styles.errLabel}>
                {selectedShot === activeSize.shots ? "✓ Correct" : `✗ Answer: ${activeSize.shots}`}
              </span>
            )}
          </div>
          <div className={styles.keypadRow}>
            {shotOptions.map((val) => {
              const isSelected = selectedShot === val;
              const isCorrect = val === activeSize.shots;
              let btnClass = styles.keyBtn;

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
                  onClick={() => handleShotClick(val)}
                  disabled={isEvaluating}
                >
                  {val}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pumps Selector */}
        <div className={styles.selectorGroup}>
          <div className={styles.groupLabel}>
            <span>Syrup Pumps</span>
            {isEvaluating && (
              <span className={selectedPump === activeSize.pumps ? styles.okLabel : styles.errLabel}>
                {selectedPump === activeSize.pumps ? "✓ Correct" : `✗ Answer: ${activeSize.pumps}`}
              </span>
            )}
          </div>
          <div className={styles.keypadRow}>
            {PUMP_OPTIONS.map((val) => {
              const isSelected = selectedPump === val;
              const isCorrect = val === activeSize.pumps;
              let btnClass = styles.keyBtn;

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
                  onClick={() => handlePumpClick(val)}
                  disabled={isEvaluating}
                >
                  {val}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BeginnerQuiz;
