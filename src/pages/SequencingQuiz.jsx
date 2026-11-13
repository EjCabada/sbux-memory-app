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

function getStatusPillsForProgress(completedActionIds = [], isSteaming = false) {
  const pills = [];
  if (isSteaming) pills.push({ key: "steam", label: "Steaming", style: styles.indicatorPillSteaming });

  const startedShots = completedActionIds.some((id) => ACTION_META[id]?.startsShots);
  const caughtShots = completedActionIds.some((id) => ACTION_META[id]?.catchesShots);
  if (startedShots && !caughtShots) {
    pills.push({ key: "shots", label: "Shots Pulling", style: styles.indicatorPillShots });
  }

  const startedBlend = completedActionIds.includes("blend_pitcher") || completedActionIds.includes("blend_cold_foam");
  const finishedDrink = completedActionIds.includes("add_lid");
  if (startedBlend && !finishedDrink) {
    pills.push({ key: "blend", label: "Blending", style: styles.indicatorPillSteaming });
  }

  if (completedActionIds.some((id) => ACTION_META[id]?.pumpsSyrup)) {
    pills.push({ key: "syrup", label: "Syrup", style: styles.indicatorPillSyrup });
  }

  if (completedActionIds.includes("add_sleeve")) {
    pills.push({ key: "sleeve", label: "Sleeved", style: styles.indicatorPillSleeve });
  }

  return pills;
}

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
        hasSteamedMilk: false,
        isCompleted: false,
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

    const currentStepTarget = activeDrink.steps[activeProg.currentStepIdx];
    if (!currentStepTarget) return;

    if (actionId === currentStepTarget.actionId) {
      const nextStepIdx = activeProg.currentStepIdx + 1;
      const isDrinkDone = nextStepIdx >= activeDrink.steps.length;

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
            isCompleted: isDrinkDone,
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
          <h2>{isColdBar ? "Cold Bar Sequencing" : "Hot Bar Sequencing"}</h2>
          <p>
            {isColdBar
              ? "Interleave 10 Cold Bar & Blended orders using Cold Foam first and blender/shaker stop points."
              : "Interleave 10 Espresso Bar orders while keeping the steam wand active."}
          </p>
          <ul className={styles.ruleList}>
            <li><strong>Initiation Lock:</strong> Reach Drink #1&apos;s Stop Point before starting Drink #2.</li>
            {isColdBar ? (
              <>
                <li><strong>Cold Foam First:</strong> Spin Cold Foam at the very beginning of any Cold Foam drink.</li>
                <li><strong>Blender &amp; Shaker Stop Points:</strong> Start blending or prep shaker with ice before switching to Drink #2.</li>
              </>
            ) : (
              <>
                <li><strong>Keep Wand Active:</strong> Start Drink #2 steaming before pouring Drink #1.</li>
                <li><strong>Oct 2026 Sleeve Rule:</strong> Sleeve every hot drink EXCEPT <strong>Short (8oz)</strong>.</li>
              </>
            )}
          </ul>
          <button className={styles.startBtn} onClick={startQuiz}>
            Start 10-Drink Rush
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
          <h2>Rush Queue Complete!</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <span className={styles.statVal}>{formatTime(elapsedSeconds)}</span>
              <span className={styles.statLbl}>Time</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statVal}>{completedCount} / {activeQueue.length}</span>
              <span className={styles.statLbl}>Handed Off</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statVal}>{totalFaults}</span>
              <span className={styles.statLbl}>Faults</span>
            </div>
          </div>
          <div className={styles.faultBreakdown}>
            <ul className={styles.faultList}>
              <li>Stop-Point / Cadence Violations: {faults.stopPointViolations}</li>
              {!isColdBar && <li>Wand Resource Faults: {faults.wandResourceViolations}</li>}
              {!isColdBar && <li>Sleeve Errors (Oct 2026 Rule): {faults.sleeveErrors}</li>}
              <li>Step Sequence Faults: {faults.wrongSteps}</li>
            </ul>
          </div>
          <button className={styles.startBtn} style={{ marginTop: "1rem" }} onClick={startQuiz}>
            Run Again
          </button>
        </div>
      </div>
    );
  }

  const visibleButtons =
    activeDrink && activeProg ? activeDrink.steps[activeProg.currentStepIdx]?.choices || [] : [];
  const currentHighlightedNum =
    selectedSlot === "A" ? slotAIdx + 1 : selectedSlot === "B" ? slotBIdx + 1 : "None";

  const renderSlotCard = (drinkObj, slotIdx, slotCode) => {
    if (!drinkObj) return null;
    const prog = drinkProgress[drinkObj.queueKey];
    const isSelected = selectedSlot === slotCode;
    const pills = getStatusPillsForProgress(
      prog?.completedActionIds || [],
      steamWandUser === drinkObj.queueKey
    );

    return (
      <div
        className={`${styles.drinkCard} ${
          isSelected
            ? slotCode === "A"
              ? styles.cardGreenActive
              : styles.cardGoldActive
            : ""
        }`}
        onClick={() => setSelectedSlot(slotCode)}
      >
        <div className={styles.cardHeaderRow}>
          <span className={slotCode === "A" ? styles.badgeGreen : styles.badgeGold}>
            #{slotIdx + 1}
          </span>
          <span className={styles.tempBadge}>{drinkObj.size}</span>
        </div>
        <div className={styles.drinkName}>{drinkObj.name}</div>
        {drinkObj.hasColdFoam && drinkObj.coldFoamRecipe && (
          <div className={styles.drinkSize}>Foam: {drinkObj.coldFoamRecipe}</div>
        )}
        {pills.length > 0 && (
          <div className={styles.badgeRow}>
            {pills.map((p) => (
              <span key={p.key} className={p.style}>
                {p.label}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.topStatus}>
        <button className={styles.exitBtn} onClick={() => setGameState("menu")}>
          &times; Exit
        </button>
        <div className={styles.highlightBanner}>
          Drink #{currentHighlightedNum}
        </div>
        <div className={styles.timerBadge}>{formatTime(elapsedSeconds)}</div>
      </div>

      <div className={styles.dualHeaderContainer}>
        {renderSlotCard(drinkA, slotAIdx, "A")}
        {renderSlotCard(drinkB, slotBIdx, "B")}
      </div>

      {activeProg && (
        <div className={styles.stepHistoryContainer}>
          <div className={styles.stepPillList}>
            {activeProg.completedActionIds.length === 0 ? (
              <span className={styles.unstartedText}>Select first action below</span>
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
            Tap a drink card above to choose its next action.
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
