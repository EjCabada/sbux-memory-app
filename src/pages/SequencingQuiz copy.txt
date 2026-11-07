import React, { useState, useEffect, useRef } from "react";
import { useDrinkCatalog } from "../context/DrinkContext.jsx";
import { toSequencingFormat, ACTION_DICTIONARY } from "../utils/drinkAdapters.js";
import styles from "./SequencingQuiz.module.css";

const TOTAL_DRINKS = 10;
const STEAM_ACTIONS = ["steam_milk", "steam_cappuccino", "steam_whole_milk", "steam_all_pitcher"];
const FINISHING_ACTIONS = [
  "free_pour_milk", "pour_foam_dot", "pour_foam", "pour_shots_over",
  "add_hot_water", "add_cold_water", "add_ice", "shake_10x",
  "top_milk", "add_whip", "add_cd_topping", "add_caramel",
  "add_lid", "connect_handoff"
];

const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const SequencingQuiz = () => {
  const { drinks, isLoading } = useDrinkCatalog();
  const [gameState, setGameState] = useState("menu");
  const [activeQueue, setActiveQueue] = useState([]);
  const [slotAIdx, setSlotAIdx] = useState(0);
  const [slotBIdx, setSlotBIdx] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState("A");
  const [drinkProgress, setDrinkProgress] = useState({});
  const [steamWandUser, setSteamWandUser] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [faults, setFaults] = useState({
    stopPointViolations: 0,
    wandResourceViolations: 0,
    sleeveErrors: 0,
    wrongSteps: 0,
  });
  const timerRef = useRef(null);

  const buildCatalog = () => {
    const list = [];
    drinks
      .filter((d) => d.isActive && d.curriculum?.allowInSequencing)
      .forEach((d) => {
        if (d.hot) list.push(toSequencingFormat(d, "hot"));
        if (d.iced) list.push(toSequencingFormat(d, "iced"));
      });
    return list.filter(Boolean);
  };

  const startQuiz = () => {
    const catalog = buildCatalog();
    if (!catalog.length) return;

    const shuffled = shuffleArray(catalog);
    const selectedTen = shuffled.slice(0, TOTAL_DRINKS).map((drink, index) => ({
      ...drink,
      queueKey: `${drink.id}_${index}_${Date.now()}`,
    }));

    setActiveQueue(selectedTen);
    setGameState("playing");
    setSlotAIdx(0);
    setSlotBIdx(1);
    setSelectedSlot("A");
    setElapsedSeconds(0);
    setCompletedCount(0);
    setSteamWandUser(null);
    setFeedback(null);
    setFaults({
      stopPointViolations: 0,
      wandResourceViolations: 0,
      sleeveErrors: 0,
      wrongSteps: 0,
    });

    const initial = {};
    selectedTen.forEach((d) => {
      initial[d.queueKey] = {
        currentStepIdx: 0,
        completedActionIds: [],
        reachedStopPoint: false,
        isCompleted: false,
        hasSleeve: false,
        hasSteamedMilk: false,
        isShotsPulling: false,
        isSyrupPumped: false,
      };
    });
    setDrinkProgress(initial);
  };

  useEffect(() => {
    if (gameState === "playing") {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [gameState]);

  if (isLoading) return <div className={styles.container}><p>Loading sequencing simulator...</p></div>;

  const drinkA = activeQueue[slotAIdx] || null;
  const drinkB = slotBIdx !== null ? activeQueue[slotBIdx] : null;
  const activeDrink = selectedSlot === "A" ? drinkA : selectedSlot === "B" ? drinkB : null;
  const activeProg = activeDrink ? drinkProgress[activeDrink.queueKey] : null;

  const getVisibleOptions = () => {
    if (!activeDrink || !activeProg) return [];
    let baseOptions = [];
    if (activeProg.currentStepIdx === 0) {
      baseOptions = activeDrink.initialOptions;
    } else {
      const previousStep = activeDrink.steps[activeProg.currentStepIdx - 1];
      baseOptions = previousStep ? previousStep.options : [];
    }
    if (activeProg.hasSleeve) {
      baseOptions = baseOptions.filter((opt) => opt !== "add_sleeve");
    }
    return baseOptions;
  };

  const isDrinkBReadyForWandExchange = (d2, prog2) => {
    if (!d2 || !prog2) return true;
    if (prog2.reachedStopPoint || prog2.isCompleted) return true;
    if (d2.requiresSteamedMilk) {
      const nextExpectedAction = d2.steps[prog2.currentStepIdx]?.actionId;
      return STEAM_ACTIONS.includes(nextExpectedAction);
    }
    return prog2.reachedStopPoint;
  };

  const handleActionClick = (actionId) => {
    if (!activeDrink || !activeProg) return;
    const progA = drinkA ? drinkProgress[drinkA.queueKey] : null;
    const progB = drinkB ? drinkProgress[drinkB.queueKey] : null;

    if (selectedSlot === "B") {
      if (progA && !progA.reachedStopPoint && !progA.isCompleted) {
        setFaults((prev) => ({ ...prev, stopPointViolations: prev.stopPointViolations + 1 }));
        setFeedback({
          type: "error",
          msg: `You must initiate Drink #${slotAIdx + 1} (${drinkA.name}) and reach its Stop Point before touching Drink #${slotBIdx + 1}!`,
        });
        return;
      }
      if (progB?.reachedStopPoint && progA && !progA.isCompleted) {
        setFaults((prev) => ({ ...prev, stopPointViolations: prev.stopPointViolations + 1 }));
        setFeedback({
          type: "error",
          msg: `Stop Point reached on Drink #${slotBIdx + 1}! Finish Drink #${slotAIdx + 1} (${drinkA.name}) first!`,
        });
        return;
      }
    }

    if (selectedSlot === "A" && progA?.reachedStopPoint && drinkB && !progA.isCompleted) {
      const isD2Ready = isDrinkBReadyForWandExchange(drinkB, progB);
      if (!isD2Ready) {
        setFaults((prev) => ({ ...prev, stopPointViolations: prev.stopPointViolations + 1 }));
        setFeedback({
          type: "warning",
          msg: `Prep Drink #${slotBIdx + 1} (${drinkB.name}) before resuming Drink #${slotAIdx + 1}!`,
        });
        return;
      }
    }

    if (STEAM_ACTIONS.includes(actionId)) {
      if (steamWandUser !== null && steamWandUser !== activeDrink.queueKey) {
        const busyDrink = activeQueue.find((d) => d.queueKey === steamWandUser);
        setFaults((prev) => ({ ...prev, wandResourceViolations: prev.wandResourceViolations + 1 }));
        setFeedback({
          type: "error",
          msg: `Steam wand is occupied by ${busyDrink?.name}. Clean wand & groom milk before steaming for this drink!`,
        });
        return;
      }
    }

    if (selectedSlot === "A" && FINISHING_ACTIONS.includes(actionId)) {
      if (
        drinkB &&
        drinkB.requiresSteamedMilk &&
        progB &&
        !progB.hasSteamedMilk &&
        steamWandUser === null &&
        isDrinkBReadyForWandExchange(drinkB, progB)
      ) {
        setFaults((prev) => ({ ...prev, stopPointViolations: prev.stopPointViolations + 1 }));
        setFeedback({
          type: "warning",
          msg: `Start steaming milk for Drink #${slotBIdx + 1} (${drinkB.name}) before finishing Drink #${slotAIdx + 1}!`,
        });
        return;
      }
    }

    if (actionId === "add_sleeve") {
      if (!activeDrink.needsSleeve) {
        setFaults((prev) => ({ ...prev, sleeveErrors: prev.sleeveErrors + 1 }));
        setFeedback({
          type: "error",
          msg: `No sleeve needed! Sleeves are for Venti Hot or hot water drinks (Americanos).`,
        });
        return;
      } else {
        setDrinkProgress((prev) => ({
          ...prev,
          [activeDrink.queueKey]: {
            ...prev[activeDrink.queueKey],
            hasSleeve: true,
            completedActionIds: [...prev[activeDrink.queueKey].completedActionIds, "add_sleeve"],
          },
        }));
        setFeedback({ type: "success", msg: `Cup Sleeve Added!` });
        return;
      }
    }

    const currentStepTarget = activeDrink.steps[activeProg.currentStepIdx];
    if (currentStepTarget && actionId === currentStepTarget.actionId) {
      const nextStepIdx = activeProg.currentStepIdx + 1;
      const isDrinkDone = nextStepIdx >= activeDrink.steps.length;

      if (STEAM_ACTIONS.includes(actionId)) setSteamWandUser(activeDrink.queueKey);
      else if (actionId === "clean_wand") setSteamWandUser(null);

      const isQueueShot = actionId.startsWith("queue_");
      const isCatchShot = actionId.startsWith("catch_");
      const isSyrup = actionId.startsWith("pump_");

      setDrinkProgress((prev) => ({
        ...prev,
        [activeDrink.queueKey]: {
          ...prev[activeDrink.queueKey],
          currentStepIdx: nextStepIdx,
          completedActionIds: [...prev[activeDrink.queueKey].completedActionIds, actionId],
          reachedStopPoint: currentStepTarget.isStopPoint || prev[activeDrink.queueKey].reachedStopPoint,
          hasSteamedMilk: STEAM_ACTIONS.includes(actionId) || prev[activeDrink.queueKey].hasSteamedMilk,
          isCompleted: isDrinkDone,
          isShotsPulling: isQueueShot ? true : isCatchShot ? false : prev[activeDrink.queueKey].isShotsPulling,
          isSyrupPumped: isSyrup ? true : prev[activeDrink.queueKey].isSyrupPumped,
        },
      }));

      setFeedback({ type: "success", msg: `${ACTION_DICTIONARY[actionId] || actionId}` });

      if (isDrinkDone) {
        if (activeDrink.needsSleeve && !activeProg.hasSleeve) {
          setFaults((prev) => ({ ...prev, sleeveErrors: prev.sleeveErrors + 1 }));
          setFeedback({ type: "error", msg: `Missing Sleeve on ${activeDrink.name}!` });
        }
        handleDrinkCompleted();
      }
    } else {
      setFaults((prev) => ({ ...prev, wrongSteps: prev.wrongSteps + 1 }));
      setFeedback({
        type: "error",
        msg: `Incorrect action. Next step needed: ${
          currentStepTarget ? ACTION_DICTIONARY[currentStepTarget.actionId] || currentStepTarget.actionId : "None"
        }`,
      });
    }
  };

  const handleDrinkCompleted = () => {
    const newCount = completedCount + 1;
    setCompletedCount(newCount);
    if (newCount >= TOTAL_DRINKS) {
      clearInterval(timerRef.current);
      setGameState("summary");
      return;
    }
    const nextSlotA = slotBIdx;
    const nextSlotB = slotBIdx + 1 < TOTAL_DRINKS ? slotBIdx + 1 : null;
    setSlotAIdx(nextSlotA);
    setSlotBIdx(nextSlotB);
    setSelectedSlot(null);
    setFeedback({ type: "success", msg: `Drink Handed off!` });
  };

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  if (gameState === "menu") {
    return (
      <div className={styles.container}>
        <div className={styles.menuCard}>
          <h2>Hot Bar Sequencing</h2>
          <p>Master the dual-drink interleaved routine across 10 randomized orders.</p>
          <ul className={styles.ruleList}>
            <li><strong>Initiation Lock:</strong> Drink #1 must reach stop point before Drink #2 starts.</li>
            <li><strong>Pre-Steam Lock:</strong> Prep Drink #2 to steam before grooming Drink #1 milk.</li>
            <li><strong>Keep Wand Active:</strong> Put Drink #2 milk on steam before finishing Drink #1.</li>
            <li><strong>Stop Point Hard-Lock:</strong> Drink #2 is locked at stop point until Drink #1 hands off.</li>
          </ul>
          <button className={styles.startBtn} onClick={startQuiz}>Start 10-Drink Rush Drill</button>
        </div>
      </div>
    );
  }

  if (gameState === "summary") {
    const totalFaults = faults.stopPointViolations + faults.wandResourceViolations + faults.sleeveErrors + faults.wrongSteps;
    return (
      <div className={styles.container}>
        <div className={styles.summaryCard}>
          <h2>Rush Queue Mastered!</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <span className={styles.statVal}>{formatTime(elapsedSeconds)}</span>
              <span className={styles.statLbl}>Time Elapsed</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statVal}>10 / 10</span>
              <span className={styles.statLbl}>Handed Off</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statVal}>{totalFaults}</span>
              <span className={styles.statLbl}>Total Faults</span>
            </div>
          </div>
          <div className={styles.faultBreakdown}>
            <strong>Audit Breakdown:</strong>
            <ul className={styles.faultList}>
              <li>Stop-Point / Cadence Violations: {faults.stopPointViolations}</li>
              <li>Wand Resource Faults: {faults.wandResourceViolations}</li>
              <li>Sleeve Packaging Errors: {faults.sleeveErrors}</li>
              <li>Step Sequence Faults: {faults.wrongSteps}</li>
            </ul>
          </div>
          <button className={styles.startBtn} style={{ marginTop: "1rem" }} onClick={startQuiz}>Run Drill Again</button>
        </div>
      </div>
    );
  }

  const visibleButtons = getVisibleOptions();
  const currentHighlightedNum = selectedSlot === "A" ? slotAIdx + 1 : selectedSlot === "B" ? slotBIdx + 1 : "None";

  return (
    <div className={styles.container}>
      <div className={styles.topStatus}>
        <button className={styles.exitBtn} onClick={() => setGameState("menu")}>&times; Exit</button>
        <div className={styles.highlightBanner}>Active: {selectedSlot ? `Drink #${currentHighlightedNum}` : "Select a Drink"}</div>
        <div className={styles.timerBadge}>{formatTime(elapsedSeconds)}</div>
      </div>
      <div className={styles.dualHeaderContainer}>
        {drinkA && (
          <div className={`${styles.drinkCard} ${selectedSlot === "A" ? styles.cardGreenActive : ""}`} onClick={() => setSelectedSlot("A")}>
            <div className={styles.cardHeaderRow}>
              <span className={styles.badgeGreen}>#{slotAIdx + 1} Slot 1</span>
              <span className={styles.tempBadge}>{drinkA.temp}</span>
            </div>
            <div className={styles.drinkName}>{drinkA.name}</div>
            <div className={styles.drinkSize}>{drinkA.size}</div>
            <div className={styles.badgeRow}>
              {steamWandUser === drinkA.queueKey && <span className={styles.indicatorPillSteaming}>Steaming</span>}
              {drinkProgress[drinkA.queueKey]?.isShotsPulling && <span className={styles.indicatorPillShots}>Shots</span>}
              {drinkProgress[drinkA.queueKey]?.isSyrupPumped && <span className={styles.indicatorPillSyrup}>Syrup</span>}
              {drinkProgress[drinkA.queueKey]?.hasSleeve && <span className={styles.indicatorPillSleeve}>Sleeved</span>}
            </div>
          </div>
        )}
        {drinkB && (
          <div className={`${styles.drinkCard} ${selectedSlot === "B" ? styles.cardGoldActive : ""}`} onClick={() => setSelectedSlot("B")}>
            <div className={styles.cardHeaderRow}>
              <span className={styles.badgeGold}>#{slotBIdx + 1} Slot 2</span>
              <span className={styles.tempBadge}>{drinkB.temp}</span>
            </div>
            <div className={styles.drinkName}>{drinkB.name}</div>
            <div className={styles.drinkSize}>{drinkB.size}</div>
            <div className={styles.badgeRow}>
              {steamWandUser === drinkB.queueKey && <span className={styles.indicatorPillSteaming}>Steaming</span>}
              {drinkProgress[drinkB.queueKey]?.isShotsPulling && <span className={styles.indicatorPillShots}>Shots</span>}
              {drinkProgress[drinkB.queueKey]?.isSyrupPumped && <span className={styles.indicatorPillSyrup}>Syrup</span>}
              {drinkProgress[drinkB.queueKey]?.hasSleeve && <span className={styles.indicatorPillSleeve}>Sleeved</span>}
            </div>
          </div>
        )}
      </div>
      {activeProg && (
        <div className={styles.stepHistoryContainer}>
          <span className={styles.stepHistoryLabel}>Drink #{currentHighlightedNum} Completed Actions:</span>
          <div className={styles.stepPillList}>
            {activeProg.completedActionIds.length === 0 ? (
              <span className={styles.unstartedText}>No actions performed yet</span>
            ) : (
              activeProg.completedActionIds.map((actId, i) => (
                <span key={i} className={styles.completedStepPill}>{ACTION_DICTIONARY[actId] || actId}</span>
              ))
            )}
          </div>
        </div>
      )}
      {feedback && (
        <div className={`${styles.feedbackAlert} ${feedback.type === "success" ? styles.alertSuccess : feedback.type === "warning" ? styles.alertWarning : styles.alertError}`}>
          {feedback.msg}
        </div>
      )}
      <div className={styles.actionCenter}>
        {!selectedSlot ? (
          <div className={styles.noSelectionPrompt}>
            Tap <strong>Drink #{slotAIdx + 1}</strong> or <strong>Drink #{slotBIdx + 1}</strong> above to open actions.
          </div>
        ) : (
          <div className={styles.actionGrid}>
            {visibleButtons.map((btnId) => (
              <button
                key={btnId}
                className={`${styles.actionBtn} ${selectedSlot === "A" ? styles.btnGreenTheme : styles.btnGoldTheme}`}
                onClick={() => handleActionClick(btnId)}
              >
                {ACTION_DICTIONARY[btnId] || btnId}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SequencingQuiz;
