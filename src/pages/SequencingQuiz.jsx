import React, { useState, useEffect, useRef } from "react";
import { useDrinkCatalog } from "../context/DrinkContext.jsx";
import {
  ACTION_META,
  generateSequencingOrder,
  getActionLabel,
  isFinishingAction,
  isSteamAction,
  isWandReleaseAction,
} from "../utils/drinkEngine.js";
import styles from "./SequencingQuiz.module.css";

const TOTAL_DRINKS = 10;

const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const SequencingQuiz = ({ stationMode = "hot_bar" }) => {
  const { drinks, familiesMap, isLoading } = useDrinkCatalog();
  const isColdBar = stationMode === "cold_bar";

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

  useEffect(() => {
    clearInterval(timerRef.current);
    setGameState("menu");
    setActiveQueue([]);
    setFeedback(null);
  }, [stationMode]);

  const buildOrderCatalog = () => {
    const orders = [];
    drinks
      .filter(
        (d) =>
          d.isActive &&
          d.curriculum?.allowInSequencing &&
          (isColdBar ? d.station !== "espresso_bar" : d.station === "espresso_bar")
      )
      .forEach((d) => {
        if (d.temps.includes("hot")) {
          const hotOrder = generateSequencingOrder(d, "hot", null, familiesMap);
          if (hotOrder) orders.push(hotOrder);
        }
        if (d.temps.includes("iced")) {
          const icedOrder = generateSequencingOrder(d, "iced", null, familiesMap);
          if (icedOrder) orders.push(icedOrder);
        }
      });
    return orders;
  };

  const startQuiz = () => {
    const catalog = buildOrderCatalog();
    if (!catalog.length) return;

    const picked = [];
    while (picked.length < TOTAL_DRINKS) {
      picked.push(...shuffleArray(catalog));
    }
    const selectedTen = picked.slice(0, TOTAL_DRINKS).map((order, index) => ({
      ...order,
      queueKey: `${order.id}_${index}_${Date.now()}`,
    }));

    const initialProgress = {};
    selectedTen.forEach((d) => {
      initialProgress[d.queueKey] = {
        currentStepIdx: 0,
        completedActionIds: [],
        reachedStopPoint: false,
        isCompleted: false,
        hasSleeve: false,
        hasSteamedMilk: false,
        isShotsPulling: false,
        isSyrupPumped: false,
        isBlending: false,
      };
    });

    setActiveQueue(selectedTen);
    setDrinkProgress(initialProgress);
    setSlotAIdx(0);
    setSlotBIdx(selectedTen.length > 1 ? 1 : null);
    setSelectedSlot("A");
    setSteamWandUser(null);
    setFeedback(null);
    setElapsedSeconds(0);
    setCompletedCount(0);
    setFaults({
      stopPointViolations: 0,
      wandResourceViolations: 0,
      sleeveErrors: 0,
      wrongSteps: 0,
    });
    setGameState("playing");
  };

  useEffect(() => {
    if (gameState === "playing") {
      timerRef.current = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [gameState]);

  if (isLoading) {
    return (
      <div className={styles.container}>
        <p>Loading sequencing simulator...</p>
      </div>
    );
  }

  const drinkA = slotAIdx !== null ? activeQueue[slotAIdx] || null : null;
  const drinkB = slotBIdx !== null ? activeQueue[slotBIdx] || null : null;
  const activeDrink = selectedSlot === "A" ? drinkA : selectedSlot === "B" ? drinkB : null;
  const activeProg = activeDrink ? drinkProgress[activeDrink.queueKey] : null;

  const isDrinkBReadyForWandExchange = (d2, prog2) => {
    if (!d2 || !prog2) return true;
    if (prog2.reachedStopPoint || prog2.isCompleted) return true;
    if (d2.requiresSteamedMilk) {
      const nextExpectedAction = d2.steps[prog2.currentStepIdx]?.actionId;
      return isSteamAction(nextExpectedAction);
    }
    return prog2.reachedStopPoint;
  };

  const advanceQueueOnHandoff = () => {
    const newCount = completedCount + 1;
    setCompletedCount(newCount);
    if (newCount >= activeQueue.length) {
      clearInterval(timerRef.current);
      setGameState("summary");
      return;
    }
    const nextSlotA = slotBIdx;
    const nextSlotB = slotBIdx !== null && slotBIdx + 1 < activeQueue.length ? slotBIdx + 1 : null;
    setSlotAIdx(nextSlotA);
    setSlotBIdx(nextSlotB);
    setSelectedSlot(nextSlotA !== null ? "A" : null);
    setFeedback({ type: "success", msg: "Drink Handed Off!" });
  };

  const handleActionClick = (actionId) => {
    if (!activeDrink || !activeProg) return;
    const progA = drinkA ? drinkProgress[drinkA.queueKey] : null;
    const progB = drinkB ? drinkProgress[drinkB.queueKey] : null;

    // 1. Dual-Drink Interleaving Cadence Locks
    if (selectedSlot === "B") {
      if (progA && !progA.reachedStopPoint && !progA.isCompleted) {
        setFaults((prev) => ({ ...prev, stopPointViolations: prev.stopPointViolations + 1 }));
        setFeedback({
          type: "error",
          msg: `Initiate Drink #${slotAIdx + 1} (${drinkA.name}) to its Stop Point before starting Drink #${slotBIdx + 1}!`,
        });
        return;
      }
      if (progB?.reachedStopPoint && progA && !progA.isCompleted) {
        setFaults((prev) => ({ ...prev, stopPointViolations: prev.stopPointViolations + 1 }));
        setFeedback({
          type: "error",
          msg: `Stop Point reached on Drink #${slotBIdx + 1}! Finish & hand off Drink #${slotAIdx + 1} first!`,
        });
        return;
      }
    }

    if (selectedSlot === "A" && progA?.reachedStopPoint && drinkB && !progA.isCompleted) {
      if (!isDrinkBReadyForWandExchange(drinkB, progB)) {
        setFaults((prev) => ({ ...prev, stopPointViolations: prev.stopPointViolations + 1 }));
        setFeedback({
          type: "warning",
          msg: `Prep Drink #${slotBIdx + 1} (${drinkB.name}) to its Stop Point before finishing Drink #${slotAIdx + 1}!`,
        });
        return;
      }
    }

    // 2. Steam Wand Mutex Lock (includes steam_lemonade, steam_all_pitcher, etc.)
    if (isSteamAction(actionId)) {
      if (steamWandUser !== null && steamWandUser !== activeDrink.queueKey) {
        const busyDrink = activeQueue.find((d) => d.queueKey === steamWandUser);
        setFaults((prev) => ({ ...prev, wandResourceViolations: prev.wandResourceViolations + 1 }));
        setFeedback({
          type: "error",
          msg: `Steam wand occupied by ${busyDrink?.name}. Clean wand before steaming for another drink!`,
        });
        return;
      }
    }

    // 3. Keep-Wand-Active Cadence Check
    if (selectedSlot === "A" && isFinishingAction(actionId)) {
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
          msg: `Start steaming for Drink #${slotBIdx + 1} (${drinkB.name}) before finishing Drink #${slotAIdx + 1}!`,
        });
        return;
      }
    }

    // 4. Pure Linear Step Progression (with Oct 2026 Sleeve Validation Built-In)
    const currentStepTarget = activeDrink.steps[activeProg.currentStepIdx];
    if (!currentStepTarget) return;

    if (actionId === currentStepTarget.actionId) {
      const nextStepIdx = activeProg.currentStepIdx + 1;
      const isDrinkDone = nextStepIdx >= activeDrink.steps.length;
      const meta = ACTION_META[actionId] || {};

      if (isSteamAction(actionId)) setSteamWandUser(activeDrink.queueKey);
      else if (isWandReleaseAction(actionId)) setSteamWandUser(null);

      setDrinkProgress((prev) => {
        const cur = prev[activeDrink.queueKey];
        return {
          ...prev,
          [activeDrink.queueKey]: {
            ...cur,
            currentStepIdx: nextStepIdx,
            completedActionIds: [...cur.completedActionIds, actionId],
            reachedStopPoint: currentStepTarget.isStopPoint || cur.reachedStopPoint,
            hasSteamedMilk: isSteamAction(actionId) || cur.hasSteamedMilk,
            hasSleeve: actionId === "add_sleeve" || cur.hasSleeve,
            isCompleted: isDrinkDone,
            isShotsPulling: meta.startsShots ? true : meta.catchesShots ? false : cur.isShotsPulling,
            isSyrupPumped: meta.pumpsSyrup ? true : cur.isSyrupPumped,
            isBlending:
              actionId === "blend_pitcher" || actionId === "blend_cold_foam"
                ? true
                : isFinishingAction(actionId)
                ? false
                : cur.isBlending,
          },
        };
      });

      setFeedback({ type: "success", msg: getActionLabel(actionId) });

      if (isDrinkDone) {
        advanceQueueOnHandoff();
      }
    } else if (actionId === "add_sleeve" && !activeDrink.needsSleeve) {
      setFaults((prev) => ({ ...prev, sleeveErrors: prev.sleeveErrors + 1 }));
      setFeedback({
        type: "error",
        msg: `No sleeve needed on ${activeDrink.size}! Oct 2026 rule: all hot drinks get sleeves EXCEPT Short (8oz).`,
      });
    } else if (currentStepTarget.actionId === "add_sleeve" && actionId === "add_lid") {
      setFaults((prev) => ({ ...prev, sleeveErrors: prev.sleeveErrors + 1 }));
      setFeedback({
        type: "error",
        msg: `Missing Cup Sleeve! Oct 2026 rule: all hot drinks except Short (8oz) require a sleeve before lidding.`,
      });
    } else {
      setFaults((prev) => ({ ...prev, wrongSteps: prev.wrongSteps + 1 }));
      setFeedback({
        type: "error",
        msg: `Incorrect step. Expected next: ${getActionLabel(currentStepTarget.actionId)}`,
      });
    }
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
          <h2>{isColdBar ? "Cold Bar & Blended Sequencing" : "Hot Bar Sequencing"}</h2>
          <p>
            {isColdBar
              ? "Master interleaved Cold Bar & Blended workflows (Frappuccinos, Refreshers, Iced Matcha, and Cold Brews with Cold Foam)."
              : "Master the dual-drink interleaved routine across 10 randomized orders."}
          </p>
          <ul className={styles.ruleList}>
            <li><strong>Initiation Lock:</strong> Drink #1 must reach its Stop Point before Drink #2 starts.</li>
            {isColdBar ? (
              <>
                <li><strong>Cold Foam First:</strong> Start Cold Foam spinning at the very beginning of any Cold Foam drink.</li>
                <li><strong>Blender &amp; Shaker Stop Points:</strong> Start Frappuccinos/Matchas blending or Refreshers prepped with ice before switching to Drink #2.</li>
                <li><strong>Finish &amp; Handoff:</strong> Complete whip, drizzles, cold foam pour, lid, and handoff on Drink #1 once Drink #2 is at its Stop Point.</li>
              </>
            ) : (
              <>
                <li><strong>Pre-Steam Lock:</strong> Prep Drink #2 to steam before finishing Drink #1.</li>
                <li><strong>Keep Wand Active:</strong> Start Drink #2 milk/lemonade steaming before pouring Drink #1.</li>
                <li><strong>Oct 2026 Sleeve Standard:</strong> Sleeve EVERY hot drink EXCEPT <strong>Short (8oz)</strong>.</li>
              </>
            )}
          </ul>
          <button className={styles.startBtn} onClick={startQuiz}>
            Start 10-Drink {isColdBar ? "Cold Bar" : "Hot Bar"} Rush Drill
          </button>
        </div>
      </div>
    );
  }

  if (gameState === "summary") {
    const totalFaults =
      faults.stopPointViolations +
      faults.wandResourceViolations +
      faults.sleeveErrors +
      faults.wrongSteps;
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
              <span className={styles.statVal}>{completedCount} / {activeQueue.length}</span>
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
              {!isColdBar && <li>Wand Resource Faults: {faults.wandResourceViolations}</li>}
              {!isColdBar && <li>Sleeve Packaging Errors (Oct 2026 Rule): {faults.sleeveErrors}</li>}
              <li>Step Sequence Faults: {faults.wrongSteps}</li>
            </ul>
          </div>
          <button className={styles.startBtn} style={{ marginTop: "1rem" }} onClick={startQuiz}>
            Run Drill Again
          </button>
        </div>
      </div>
    );
  }

  const visibleButtons =
    activeDrink && activeProg ? activeDrink.steps[activeProg.currentStepIdx]?.choices || [] : [];
  const currentHighlightedNum =
    selectedSlot === "A" ? slotAIdx + 1 : selectedSlot === "B" ? slotBIdx + 1 : "None";

  return (
    <div className={styles.container}>
      <div className={styles.topStatus}>
        <button className={styles.exitBtn} onClick={() => setGameState("menu")}>
          &times; Exit
        </button>
        <div className={styles.highlightBanner}>
          Active: {selectedSlot ? `Drink #${currentHighlightedNum}` : "Select a Drink"}
        </div>
        <div className={styles.timerBadge}>{formatTime(elapsedSeconds)}</div>
      </div>

      <div className={styles.dualHeaderContainer}>
        {drinkA && (
          <div
            className={`${styles.drinkCard} ${selectedSlot === "A" ? styles.cardGreenActive : ""}`}
            onClick={() => setSelectedSlot("A")}
          >
            <div className={styles.cardHeaderRow}>
              <span className={styles.badgeGreen}>#{slotAIdx + 1} Slot 1</span>
              <span className={styles.tempBadge}>{drinkA.temp}</span>
            </div>
            <div className={styles.drinkName}>{drinkA.name}</div>
            <div className={styles.drinkSize}>
              {drinkA.size}
              {drinkA.hasColdFoam && drinkA.coldFoamRecipe
                ? ` • Foam: ${drinkA.coldFoamRecipe}`
                : ""}
            </div>
            <div className={styles.badgeRow}>
              {steamWandUser === drinkA.queueKey && (
                <span className={styles.indicatorPillSteaming}>Steaming</span>
              )}
              {drinkProgress[drinkA.queueKey]?.isBlending && (
                <span className={styles.indicatorPillSteaming}>Blending</span>
              )}
              {drinkProgress[drinkA.queueKey]?.isShotsPulling && (
                <span className={styles.indicatorPillShots}>Shots</span>
              )}
              {drinkProgress[drinkA.queueKey]?.isSyrupPumped && (
                <span className={styles.indicatorPillSyrup}>Syrup</span>
              )}
              {drinkProgress[drinkA.queueKey]?.hasSleeve && (
                <span className={styles.indicatorPillSleeve}>Sleeved</span>
              )}
            </div>
          </div>
        )}

        {drinkB && (
          <div
            className={`${styles.drinkCard} ${selectedSlot === "B" ? styles.cardGoldActive : ""}`}
            onClick={() => setSelectedSlot("B")}
          >
            <div className={styles.cardHeaderRow}>
              <span className={styles.badgeGold}>#{slotBIdx + 1} Slot 2</span>
              <span className={styles.tempBadge}>{drinkB.temp}</span>
            </div>
            <div className={styles.drinkName}>{drinkB.name}</div>
            <div className={styles.drinkSize}>
              {drinkB.size}
              {drinkB.hasColdFoam && drinkB.coldFoamRecipe
                ? ` • Foam: ${drinkB.coldFoamRecipe}`
                : ""}
            </div>
            <div className={styles.badgeRow}>
              {steamWandUser === drinkB.queueKey && (
                <span className={styles.indicatorPillSteaming}>Steaming</span>
              )}
              {drinkProgress[drinkB.queueKey]?.isBlending && (
                <span className={styles.indicatorPillSteaming}>Blending</span>
              )}
              {drinkProgress[drinkB.queueKey]?.isShotsPulling && (
                <span className={styles.indicatorPillShots}>Shots</span>
              )}
              {drinkProgress[drinkB.queueKey]?.isSyrupPumped && (
                <span className={styles.indicatorPillSyrup}>Syrup</span>
              )}
              {drinkProgress[drinkB.queueKey]?.hasSleeve && (
                <span className={styles.indicatorPillSleeve}>Sleeved</span>
              )}
            </div>
          </div>
        )}
      </div>

      {activeProg && (
        <div className={styles.stepHistoryContainer}>
          <span className={styles.stepHistoryLabel}>
            Drink #{currentHighlightedNum} Completed Actions:
          </span>
          <div className={styles.stepPillList}>
            {activeProg.completedActionIds.length === 0 ? (
              <span className={styles.unstartedText}>No actions performed yet</span>
            ) : (
              activeProg.completedActionIds.map((actId, i) => (
                <span key={i} className={styles.completedStepPill}>
                  {getActionLabel(actId)}
                </span>
              ))
            )}
          </div>
        </div>
      )}

      {feedback && (
        <div
          className={`${styles.feedbackAlert} ${
            feedback.type === "success"
              ? styles.alertSuccess
              : feedback.type === "warning"
              ? styles.alertWarning
              : styles.alertError
          }`}
        >
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
                className={`${styles.actionBtn} ${
                  selectedSlot === "A" ? styles.btnGreenTheme : styles.btnGoldTheme
                }`}
                onClick={() => handleActionClick(btnId)}
              >
                {getActionLabel(btnId)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SequencingQuiz;
