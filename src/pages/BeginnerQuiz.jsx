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

// Helper to shuffle array
const shuffle = (array) => [...array].sort(() => Math.random() - 0.5);

const BeginnerQuiz = () => {
  // Game State
  const [selectedMode, setSelectedMode] = useState(null);
  const [gameState, setGameState] = useState("menu"); // "menu" | "playing" | "summary"
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  // Queue & Card State
  const [drinkPool, setDrinkPool] = useState([]);
  const [currentDrink, setCurrentDrink] = useState(null);
  const [shuffledSizes, setShuffledSizes] = useState([]);
  const [currentSizeIndex, setCurrentSizeIndex] = useState(0);

  // User input selection & feedback
  const [selectedShot, setSelectedShot] = useState(null);
  const [selectedPump, setSelectedPump] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Drink Retest Tracking Algorithm
  // drinkTracking: { [drinkId]: { consecutiveFails: number, errorsThisSession: number, cleanPasses: number } }
  const [drinkTracking, setDrinkTracking] = useState({});
  const [currentDrinkHadError, setCurrentDrinkHadError] = useState(false);
  const retestQueueRef = useRef([]); // Holds scheduled retest drink IDs

  // Stats & Timers
  const [timeLeft, setTimeLeft] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [totalCardsAttempted, setTotalCardsAttempted] = useState(0);
  const [correctCardsCount, setCorrectCardsCount] = useState(0);
  const [wrongCardsCount, setWrongCardsCount] = useState(0);
  const timerIntervalRef = useRef(null);

  // Start a new quiz session
  const startQuiz = (mode) => {
    setSelectedMode(mode);
    setGameState("playing");
    setTotalCardsAttempted(0);
    setCorrectCardsCount(0);
    setWrongCardsCount(0);
    setElapsedSeconds(0);
    setCurrentDrinkHadError(false);
    retestQueueRef.current = [];

    // Initialize tracking dictionary
    const initialTracking = {};
    basicsData.forEach((d) => {
      initialTracking[d.id] = { consecutiveFails: 0, errorsThisSession: 0, cleanPasses: 0 };
    });
    setDrinkTracking(initialTracking);

    // Initial randomized pool of all drinks
    const shuffledPool = shuffle(basicsData);
    const firstDrink = shuffledPool[0];
    const remainingPool = shuffledPool.slice(1);

    setDrinkPool(remainingPool);
    loadDrink(firstDrink);

    // Setup Timers
    if (mode === MODES.TIME_1) setTimeLeft(60);
    else if (mode === MODES.TIME_2) setTimeLeft(120);
    else if (mode === MODES.TIME_5) setTimeLeft(300);
    else setTimeLeft(0);
  };

  // Timer Tick
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

  // Load a drink and randomize its sizes
  const loadDrink = (drink) => {
    setCurrentDrink(drink);
    setShuffledSizes(shuffle(drink.sizes));
    setCurrentSizeIndex(0);
    setCurrentDrinkHadError(false);
    setSelectedShot(null);
    setSelectedPump(null);
    setIsEvaluating(false);
  };

  // End quiz and trigger summary
  const endQuiz = () => {
    clearInterval(timerIntervalRef.current);
    setGameState("summary");
  };

  // Current active size card
  const activeSize = shuffledSizes[currentSizeIndex];

  // Handle Shot Button Click
  const handleShotClick = (val) => {
    if (isEvaluating || selectedShot !== null) return;
    setSelectedShot(val);
    checkAutoAdvance(val, selectedPump);
  };

  // Handle Pump Button Click
  const handlePumpClick = (val) => {
    if (isEvaluating || selectedPump !== null) return;
    setSelectedPump(val);
    checkAutoAdvance(selectedShot, val);
  };

  // Evaluate answer once both are chosen
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

      // Record drink error
      setDrinkTracking((prev) => ({
        ...prev,
        [currentDrink.id]: {
          ...prev[currentDrink.id],
          errorsThisSession: (prev[currentDrink.id]?.errorsThisSession || 0) + 1,
        },
      }));
    }

    // Delay to let the barista see the green/red highlight
    setTimeout(() => {
      handleNextCard(isPass);
    }, isPass ? 600 : 1300);
  };

  // Advance card or finish drink set
  const handleNextCard = (wasCardCorrect) => {
    setSelectedShot(null);
    setSelectedPump(null);
    setIsEvaluating(false);

    if (currentSizeIndex < shuffledSizes.length - 1) {
      // Move to next size of the current drink
      setCurrentSizeIndex((prev) => prev + 1);
    } else {
      // Completed all sizes for this drink! Apply retest algorithm
      handleDrinkCompletion();
    }
  };

  // Core Spaced-Repetition Queue Logic
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
        // Failed 1st time: Insert 1 other drink first, then retest this drink
        if (nextPool.length > 0) {
          const bufferDrink = nextPool.shift();
          nextQueue = [bufferDrink.id, drinkId, ...nextQueue];
        } else {
          // If pool empty, retest next
          nextQueue.push(drinkId);
        }
      } else {
        // Failed 2+ times in a row: Retest IMMEDIATELY
        nextQueue.unshift(drinkId);
      }
    } else {
      // Clean pass with 0 errors across all sizes!
      setDrinkTracking((prev) => ({
        ...prev,
        [drinkId]: { ...prev[drinkId], consecutiveFails: 0, cleanPasses: prev[drinkId].cleanPasses + 1 },
      }));
    }

    retestQueueRef.current = nextQueue;
    setDrinkPool(nextPool);

    // Pick Next Drink
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
      // Pool and retest queue are completely empty!
      if (selectedMode === MODES.PERFECTION) {
        endQuiz();
      } else {
        // For timed modes, recycle drinks to keep drilling until time is up
        const recycled = shuffle(basicsData);
        const nextDrink = recycled[0];
        setDrinkPool(recycled.slice(1));
        loadDrink(nextDrink);
      }
    }
  };

  // Top 3 Recommended Drinks to Study
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

  // Format MM:SS
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // -------------------------------------------------------------
  // RENDER: Menu State
  // -------------------------------------------------------------
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
                <li><strong>Randomized Size Order:</strong> When a drink appears, you will test all of its sizes in random sequence.</li>
                <li><strong>Instant Feedback:</strong> Tapping an option immediately turns green (correct) or red (incorrect).</li>
                <li><strong>Smart Retest Queue:</strong>
                  <ul>
                    <li>1st mistake on a drink: Tested again after 1 intervening drink.</li>
                    <li>2+ mistakes in a row: Retested immediately!</li>
                  </ul>
                </li>
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

  // -------------------------------------------------------------
  // RENDER: Summary State
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // RENDER: Active Quiz Card View
  // -------------------------------------------------------------
  const shotOptions = currentDrink.isRistretto ? SHOT_OPTIONS_RISTRETTO : SHOT_OPTIONS_STANDARD;

  return (
    <div className={styles.quizWrapper}>
      {/* Top Status Bar */}
      <div className={styles.topStatus}>
        <button className={styles.exitBtn} onClick={() => setGameState("menu")}>
          ✕ Exit
        </button>
        <div className={styles.timerBadge}>
          {selectedMode === MODES.PERFECTION
            ? `⏱️ ${formatTime(elapsedSeconds)}`
            : selectedMode === MODES.UNLIMITED
            ? `Cards: ${correctCardsCount}`
            : `⏳ ${formatTime(timeLeft)}`}
        </div>
      </div>

      {/* Drink Banner Card */}
      <div className={styles.drinkHeaderCard}>
        <span className={styles.drinkCategory}>Hot Bar Core Drink</span>
        <h2 className={styles.drinkName}>{currentDrink.name}</h2>
        <div className={styles.sizeBadge}>{activeSize.size}</div>
      </div>

      {/* Inputs Section (Mobile Viewport Optimized) */}
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
