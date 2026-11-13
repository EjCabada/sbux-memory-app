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

const HOT_PILLARS = [
  { id: "shots", num: "1", label: "Shots" },
  { id: "syrup", num: "2", label: "Syrup" },
  { id: "steam", num: "3", label: "Steam / Ice", isStopPillar: true },
  { id: "finish", num: "4", label: "Finish" },
];

const COLD_PILLARS = [
  { id: "shots", num: "1", label: "Foam / Prep" },
  { id: "syrup", num: "2", label: "Base & Syrup" },
  { id: "steam", num: "3", label: "Ice & Blend", isStopPillar: true },
  { id: "finish", num: "4", label: "Finish" },
];

const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/**
 * Classifies each micro-action into one of the 4 overarching routine pillars
 * without altering the internal engine execution order.
 * Note: Both Queue Shots and Catch Shots map to Pillar 1 ("Shots") so the barista
 * sees Pillar 1 stay "Pulling..." while they pump syrup, then complete on Catch.
 */
function getActionPillarId(actionId, isColdBar, allStepIds = []) {
  if (
    actionId === "queue_shots" ||
    actionId === "queue_ristretto" ||
    actionId === "catch_cup" ||
    actionId === "catch_glass" ||
    actionId === "blend_cold_foam" ||
    actionId === "add_tea_bags"
  ) {
    return "shots";
  }

  if (
    ACTION_META[actionId]?.pumpsSyrup ||
    actionId === "pour_refresher_base" ||
    actionId === "pour_tea_shaker" ||
    actionId === "add_water_lemonade" ||
    actionId === "add_matcha_shaker" ||
    actionId === "add_line_cup_caramel"
  ) {
    return "syrup";
  }

  if (actionId === "pour_cold_milk") {
    return isColdBar ? "syrup" : "steam";
  }

  if (actionId === "add_hot_water") {
    return allStepIds.includes("steam_lemonade") ? "syrup" : "finish";
  }

  if (actionId === "add_inclusions") {
    return isColdBar ? "syrup" : "finish";
  }

  if (
    isSteamAction(actionId) ||
    actionId === "clean_wand" ||
    actionId === "groom_milk" ||
    actionId === "add_ice" ||
    actionId === "blend_pitcher"
  ) {
    return "steam";
  }

  return "finish";
}

/**
 * Derives live visual state for a single drink's cup/vessel & equipment badges.
 */
function deriveDrinkVisualState(drinkObj, prog, isSteamingThisDrink) {
  if (!drinkObj || !prog) {
    return {
      shotsPulling: false,
      shotsCaught: false,
      usesShotGlass: false,
      hasSyrup: false,
      isSteaming: false,
      needsWandWipe: false,
      milkReady: false,
      isBlending: false,
      hasFoamPrepped: false,
      hasSleeve: false,
      hasToppingsOrWhip: false,
      hasLid: false,
    };
  }

  const done = prog.completedActionIds || [];
  const allStepIds = drinkObj.steps.map((s) => s.actionId);

  const startedShots = done.some((id) => ACTION_META[id]?.startsShots);
  const shotsCaught = done.some((id) => ACTION_META[id]?.catchesShots);
  const shotsPulling = startedShots && !shotsCaught;
  const usesShotGlass = allStepIds.includes("catch_glass");

  const hasSyrup = done.some(
    (id) =>
      ACTION_META[id]?.pumpsSyrup ||
      id === "pour_refresher_base" ||
      id === "pour_tea_shaker" ||
      id === "add_matcha_shaker"
  );

  const startedSteam = done.some(isSteamAction);
  const wipedWand = done.includes("clean_wand");
  const needsWandWipe = startedSteam && !wipedWand;
  const milkPoured = done.some(
    (id) =>
      id === "free_pour_milk" ||
      id === "pour_foam" ||
      id === "pour_foam_dot" ||
      id === "pour_cold_milk" ||
      id === "top_milk"
  );

  const hasFoamPrepped = done.includes("blend_cold_foam") && !done.includes("add_cold_foam");
  const isBlending = done.includes("blend_pitcher") && !done.includes("add_lid");
  const hasSleeve = done.includes("add_sleeve");
  const hasLid = done.includes("add_lid");
  const hasToppingsOrWhip = done.some(
    (id) => id === "add_whip" || id === "add_cold_foam" || id.startsWith("add_caramel") || id.startsWith("add_mocha") || id.startsWith("add_cd") || id.startsWith("add_cinnamon")
  );

  return {
    shotsPulling,
    shotsCaught,
    usesShotGlass,
    hasSyrup,
    isSteaming: isSteamingThisDrink,
    needsWandWipe,
    milkReady: milkPoured || (startedSteam && wipedWand),
    isBlending,
    hasFoamPrepped,
    hasSleeve,
    hasToppingsOrWhip,
    hasLid,
  };
}

/**
 * Compact dynamic SVG cup/vessel illustration showing live layers inside each drink card.
 */
const DrinkVesselGraphic = ({ drinkObj, visual }) => {
  const isIced = drinkObj?.temp === "Iced";
  return (
    <div className={styles.vesselGraphicWrap} title={`${drinkObj?.temp} ${drinkObj?.size}`}>
      <svg viewBox="0 0 56 68" className={styles.vesselSvg} aria-hidden="true">
        {/* Steam waves when actively steaming */}
        {visual.isSteaming && (
          <g className={styles.steamWaves}>
            <path d="M20 12 Q17 7 21 3" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M28 11 Q25 6 29 2" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M36 12 Q33 7 37 3" fill="none" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round" />
          </g>
        )}

        {/* Lid when lidded */}
        {visual.hasLid && (
          <rect x="10" y="13" width="36" height="5" rx="2.5" fill="#1e3932" />
        )}

        {/* Whip / Cold Foam dome */}
        {visual.hasToppingsOrWhip && (
          <path d="M14 18 Q28 8 42 18 Z" fill="#fffbeb" stroke="#d4b16a" strokeWidth="1.5" />
        )}

        {/* Cup Body Outline */}
        <path
          d="M13 18 L43 18 L39 60 C38.8 62 37 63 35 63 L21 63 C19 63 17.2 62 17 60 Z"
          fill={isIced ? "rgba(219, 234, 254, 0.32)" : "#f9f8f5"}
          stroke="#4a5d56"
          strokeWidth="2.2"
        />

        {/* Milk / Water fill layer */}
        {visual.milkReady && (
          <path d="M15.5 28 L40.5 28 L38 60 L18 60 Z" fill="#efe6d5" />
        )}

        {/* Caught Espresso Shots layer */}
        {visual.shotsCaught && (
          <path d="M16.8 44 L39.2 44 L38 60 L18 60 Z" fill="#5c3a21" />
        )}

        {/* Syrup layer at bottom */}
        {visual.hasSyrup && (
          <path d="M17.5 54 L38.5 54 L38 61 L18 61 Z" fill="#d49b35" />
        )}

        {/* Kraft Sleeve Band (Oct 2026 Hot Rule) */}
        {visual.hasSleeve && (
          <path d="M14.8 32 L41.2 32 L40 46 L16 46 Z" fill="#c89d66" stroke="#8c6239" strokeWidth="1.2" />
        )}

        {/* Pulling Shots animated drop badge */}
        {visual.shotsPulling && (
          <circle cx="28" cy="36" r="5.5" fill="#d97706" className={styles.pulsingDot} />
        )}
      </svg>
    </div>
  );
};

const SequencingQuiz = ({ stationMode = "hot_bar" }) => {
  const { drinks, familiesMap, isLoading } = useDrinkCatalog();
  const isColdBar = stationMode === "cold_bar";
  const pillars = isColdBar ? COLD_PILLARS : HOT_PILLARS;

  const [gameState, setGameState] = useState("menu");
  const [assistMode, setAssistMode] = useState("guided"); // "guided" | "rush"
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
  const progA = drinkA ? drinkProgress[drinkA.queueKey] : null;
  const progB = drinkB ? drinkProgress[drinkB.queueKey] : null;
  const activeDrink = selectedSlot === "A" ? drinkA : selectedSlot === "B" ? drinkB : null;
  const activeProg = activeDrink ? drinkProgress[activeDrink.queueKey] : null;

  const visualA = deriveDrinkVisualState(drinkA, progA, drinkA && steamWandUser === drinkA.queueKey);
  const visualB = deriveDrinkVisualState(drinkB, progB, drinkB && steamWandUser === drinkB.queueKey);

  const isDrinkBReadyForWandExchange = (d2, p2) => {
    if (!d2 || !p2) return true;
    if (p2.reachedStopPoint || p2.isCompleted) return true;
    if (d2.requiresSteamedMilk) {
      const nextExpectedAction = d2.steps[p2.currentStepIdx]?.actionId;
      return isSteamAction(nextExpectedAction);
    }
    return p2.reachedStopPoint;
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
    setFeedback({ type: "success", msg: "Drink Handed Off! Next ticket pulled." });
  };

  const handleActionClick = (actionId) => {
    if (!activeDrink || !activeProg) return;

    if (selectedSlot === "B") {
      if (progA && !progA.reachedStopPoint && !progA.isCompleted) {
        setFaults((prev) => ({ ...prev, stopPointViolations: prev.stopPointViolations + 1 }));
        setFeedback({
          type: "error",
          msg: `Stop-Point Lock: Reach Drink #${slotAIdx + 1}'s Stop Point (Pillar 3) before starting Drink #${slotBIdx + 1}!`,
        });
        return;
      }
      if (progB?.reachedStopPoint && progA && !progA.isCompleted) {
        setFaults((prev) => ({ ...prev, stopPointViolations: prev.stopPointViolations + 1 }));
        setFeedback({
          type: "error",
          msg: `Drink #${slotBIdx + 1} reached its Stop Point! Switch back to finish & hand off Drink #${slotAIdx + 1} first.`,
        });
        return;
      }
    }

    if (selectedSlot === "A" && progA?.reachedStopPoint && drinkB && !progA.isCompleted) {
      if (!isDrinkBReadyForWandExchange(drinkB, progB)) {
        setFaults((prev) => ({ ...prev, stopPointViolations: prev.stopPointViolations + 1 }));
        setFeedback({
          type: "warning",
          msg: `Pipeline Pause: Drink #${slotAIdx + 1} is at its Stop Point! Tap Drink #${slotBIdx + 1} above and bring it to Pillar 3 first.`,
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
          msg: `Steam Wand Busy (${busyDrink?.name}): Wipe & purge the wand on the other drink before steaming!`,
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
          msg: `Keep Wand Active: Start steaming Drink #${slotBIdx + 1} (${drinkB.name}) before pouring Drink #${slotAIdx + 1}!`,
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

      setFeedback({ type: "success", msg: `✓ ${getActionLabel(actionId)}` });

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
          <span className={styles.stationTag}>
            {isColdBar ? "Cold Bar & Blended" : "Espresso Bar"}
          </span>
          <h2>{isColdBar ? "Cold Bar Sequencing" : "Hot Bar Sequencing"}</h2>
          <p className={styles.menuSubtitle}>
            {isColdBar
              ? "Interleave 10 Cold Bar orders using the 4-Pillar Routine and blender/shaker stop points."
              : "Interleave 10 Espresso Bar orders using the 4-Pillar Routine while keeping machines active."}
          </p>

          <div className={styles.modeToggleWrap}>
            <span className={styles.modeToggleLabel}>Training Assistance</span>
            <div className={styles.modeSegmented}>
              <button
                type="button"
                className={`${styles.modeSegBtn} ${assistMode === "guided" ? styles.modeSegActive : ""}`}
                onClick={() => setAssistMode("guided")}
              >
                Guided Routine
              </button>
              <button
                type="button"
                className={`${styles.modeSegBtn} ${assistMode === "rush" ? styles.modeSegActive : ""}`}
                onClick={() => setAssistMode("rush")}
              >
                Pro Rush
              </button>
            </div>
            <span className={styles.modeHintText}>
              {assistMode === "guided"
                ? "Shows Stop-Point switch prompts and micro-step breadcrumbs under the 4-Pillar bar."
                : "Keeps the 4-Pillar bar and live equipment dock, but hides step/switch prompts."}
            </span>
          </div>

          <div className={styles.pillarsPreviewBox}>
            <span className={styles.pillarsPreviewTitle}>The 4 Overarching Pillars</span>
            <div className={styles.pillarsPreviewGrid}>
              {pillars.map((p) => (
                <div key={p.id} className={styles.pillarPreviewChip}>
                  <span className={styles.pillarNumBadge}>{p.num}</span>
                  <span>{p.label}</span>
                  {p.isStopPillar && <span className={styles.stopStar}>★</span>}
                </div>
              ))}
            </div>
          </div>

          <ul className={styles.ruleList}>
            <li>
              <strong>★ Stop Point (Pillar 3):</strong> Lock in Drink #1&apos;s machine/ice step before initiating Drink #2.
            </li>
            {isColdBar ? (
              <>
                <li>
                  <strong>Cold Foam First:</strong> Spin Cold Foam in Pillar 1 at the very start of any Cold Foam order.
                </li>
                <li>
                  <strong>Blender &amp; Shaker Cadence:</strong> Start blending or prep ice before switching tickets.
                </li>
              </>
            ) : (
              <>
                <li>
                  <strong>Exchange the Steam Wand:</strong> Wipe &amp; purge after steaming, and start Drink #2 steaming before pouring Drink #1.
                </li>
                <li>
                  <strong>Oct 2026 Sleeve Rule:</strong> Sleeve every hot drink EXCEPT <strong>Short (8oz)</strong>.
                </li>
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
          <span className={styles.stationTag}>Rush Complete</span>
          <h2>{totalFaults === 0 ? "Flawless Bar Cadence!" : "10-Drink Rush Summary"}</h2>
          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <span className={styles.statVal}>{formatTime(elapsedSeconds)}</span>
              <span className={styles.statLbl}>Total Time</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statVal}>
                {completedCount} / {activeQueue.length}
              </span>
              <span className={styles.statLbl}>Handed Off</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statVal}>{totalFaults}</span>
              <span className={styles.statLbl}>Total Faults</span>
            </div>
          </div>
          <div className={styles.faultBreakdown}>
            <h4>Cadence &amp; Routine Breakdown</h4>
            <ul className={styles.faultList}>
              <li>
                <span>Stop-Point / Switch Cadence Faults</span>
                <strong>{faults.stopPointViolations}</strong>
              </li>
              {!isColdBar && (
                <li>
                  <span>Steam Wand Resource Faults</span>
                  <strong>{faults.wandResourceViolations}</strong>
                </li>
              )}
              {!isColdBar && (
                <li>
                  <span>Sleeve Rule Faults (Oct 2026)</span>
                  <strong>{faults.sleeveErrors}</strong>
                </li>
              )}
              <li>
                <span>Step Sequence Faults</span>
                <strong>{faults.wrongSteps}</strong>
              </li>
            </ul>
          </div>
          <div className={styles.summaryBtnRow}>
            <button className={styles.startBtn} onClick={startQuiz}>
              Run Another 10-Drink Rush
            </button>
            <button className={styles.secondaryMenuBtn} onClick={() => setGameState("menu")}>
              Change Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- LIVE STATION EQUIPMENT DOCK COMPUTATION ---
  const renderEquipmentDock = () => {
    if (!isColdBar) {
      // Hot Bar: 1) Steam Wand + Pitcher, 2) Mastrena Espresso Head
      let wandStatus = "Free — Ready";
      let wandStateClass = styles.equipIdle;
      let wandOwnerBadge = null;

      if (steamWandUser) {
        const isA = drinkA && steamWandUser === drinkA.queueKey;
        const ownerNum = isA ? slotAIdx + 1 : slotBIdx + 1;
        const ownerVis = isA ? visualA : visualB;
        wandOwnerBadge = (
          <span className={isA ? styles.ownerTagGreen : styles.ownerTagGold}>#{ownerNum}</span>
        );
        if (ownerVis.needsWandWipe) {
          wandStatus = "Steaming (Wipe Next)";
          wandStateClass = styles.equipBusyAmber;
        } else {
          wandStatus = "In Use";
          wandStateClass = styles.equipBusyAmber;
        }
      }

      const pullingList = [];
      if (visualA.shotsPulling && drinkA) {
        pullingList.push({
          num: slotAIdx + 1,
          slot: "A",
          vessel: visualA.usesShotGlass ? "Shot Glass" : "Cup",
        });
      }
      if (visualB.shotsPulling && drinkB) {
        pullingList.push({
          num: slotBIdx + 1,
          slot: "B",
          vessel: visualB.usesShotGlass ? "Shot Glass" : "Cup",
        });
      }

      return (
        <div className={styles.equipmentDock} aria-label="Live Bar Equipment Status">
          <div className={`${styles.equipSlot} ${wandStateClass}`}>
            <span className={styles.equipIcon} aria-hidden="true">♨️</span>
            <div className={styles.equipTextCol}>
              <span className={styles.equipTitle}>Steam Wand &amp; Pitcher</span>
              <span className={styles.equipSub}>
                {wandOwnerBadge} {wandStatus}
              </span>
            </div>
          </div>

          <div
            className={`${styles.equipSlot} ${
              pullingList.length > 0 ? styles.equipBusyEspresso : styles.equipIdle
            }`}
          >
            <span className={styles.equipIcon} aria-hidden="true">☕</span>
            <div className={styles.equipTextCol}>
              <span className={styles.equipTitle}>Espresso Spout</span>
              <span className={styles.equipSub}>
                {pullingList.length === 0 ? (
                  "Idle — Ready"
                ) : (
                  pullingList.map((item) => (
                    <span key={item.num} className={styles.pullingTagWrap}>
                      <span className={item.slot === "A" ? styles.ownerTagGreen : styles.ownerTagGold}>
                        #{item.num}
                      </span>{" "}
                      Pulling &rarr; {item.vessel}
                    </span>
                  ))
                )}
              </span>
            </div>
          </div>
        </div>
      );
    }

    // Cold Bar: 1) Cold Foam Blender, 2) Blender / Shaker Station
    const foamingSlot = visualA.hasFoamPrepped
      ? { num: slotAIdx + 1, slot: "A" }
      : visualB.hasFoamPrepped
      ? { num: slotBIdx + 1, slot: "B" }
      : null;

    const blendingSlot = visualA.isBlending
      ? { num: slotAIdx + 1, slot: "A", label: "Blending Pitcher" }
      : visualB.isBlending
      ? { num: slotBIdx + 1, slot: "B", label: "Blending Pitcher" }
      : null;

    return (
      <div className={styles.equipmentDock} aria-label="Live Cold Bar Equipment Status">
        <div className={`${styles.equipSlot} ${foamingSlot ? styles.equipBusyAmber : styles.equipIdle}`}>
          <span className={styles.equipIcon} aria-hidden="true">🌪️</span>
          <div className={styles.equipTextCol}>
            <span className={styles.equipTitle}>Cold Foam Blender</span>
            <span className={styles.equipSub}>
              {foamingSlot ? (
                <>
                  <span className={foamingSlot.slot === "A" ? styles.ownerTagGreen : styles.ownerTagGold}>
                    #{foamingSlot.num}
                  </span>{" "}
                  Foam Ready to Pour
                </>
              ) : (
                "Idle — Ready"
              )}
            </span>
          </div>
        </div>

        <div className={`${styles.equipSlot} ${blendingSlot ? styles.equipBusyEspresso : styles.equipIdle}`}>
          <span className={styles.equipIcon} aria-hidden="true">🧊</span>
          <div className={styles.equipTextCol}>
            <span className={styles.equipTitle}>Blender / Shaker</span>
            <span className={styles.equipSub}>
              {blendingSlot ? (
                <>
                  <span className={blendingSlot.slot === "A" ? styles.ownerTagGreen : styles.ownerTagGold}>
                    #{blendingSlot.num}
                  </span>{" "}
                  {blendingSlot.label}
                </>
              ) : (
                "Idle — Ready"
              )}
            </span>
          </div>
        </div>
      </div>
    );
  };

  // --- 4-PILLAR ROUTINE RAIL COMPUTATION FOR SELECTED DRINK ---
  const renderFourPillarRail = () => {
    if (!activeDrink || !activeProg) return null;
    const allStepIds = activeDrink.steps.map((s) => s.actionId);
    const doneIds = activeProg.completedActionIds || [];
    const currentStepObj = activeDrink.steps[activeProg.currentStepIdx];
    const currentActionId = currentStepObj?.actionId;
    const currentPillarId = currentActionId
      ? getActionPillarId(currentActionId, isColdBar, allStepIds)
      : "finish";

    // Determine if a cadence switch to the other drink is advised right now
    let cadenceSwitchPrompt = null;
    if (
      selectedSlot === "A" &&
      progA?.reachedStopPoint &&
      !progA?.isCompleted &&
      drinkB &&
      !isDrinkBReadyForWandExchange(drinkB, progB)
    ) {
      cadenceSwitchPrompt = `★ Stop Point reached on Drink #${slotAIdx + 1}! Tap Drink #${slotBIdx + 1} above to start it in parallel.`;
    } else if (
      selectedSlot === "B" &&
      progB?.reachedStopPoint &&
      progA &&
      !progA?.isCompleted
    ) {
      cadenceSwitchPrompt = `★ Drink #${slotBIdx + 1} reached its Stop Point! Tap Drink #${slotAIdx + 1} above to finish & hand off.`;
    } else if (
      selectedSlot === "A" &&
      currentActionId &&
      isFinishingAction(currentActionId) &&
      drinkB &&
      drinkB.requiresSteamedMilk &&
      progB &&
      !progB.hasSteamedMilk &&
      steamWandUser === null &&
      isDrinkBReadyForWandExchange(drinkB, progB)
    ) {
      cadenceSwitchPrompt = `♨️ Keep Steam Wand Active: Tap Drink #${slotBIdx + 1} and start steaming before finishing Drink #${slotAIdx + 1}!`;
    }

    return (
      <div className={styles.routineRailCard}>
        <div className={styles.pillarsRow}>
          {pillars.map((pillar) => {
            const pillarActions = allStepIds.filter(
              (actId) => getActionPillarId(actId, isColdBar, allStepIds) === pillar.id
            );
            const isSkipped = pillarActions.length === 0;
            const completedInPillar = pillarActions.filter((actId) => doneIds.includes(actId));
            const isAllDone = !isSkipped && completedInPillar.length === pillarActions.length;
            const isPartial = !isSkipped && completedInPillar.length > 0 && !isAllDone;
            const isCurrent = !isSkipped && currentPillarId === pillar.id;

            let statusLabel = "";
            if (isSkipped) statusLabel = "N/A";
            else if (isAllDone) statusLabel = "Done ✓";
            else if (pillar.id === "shots" && isPartial) statusLabel = "Pulling…";
            else if (isCurrent) statusLabel = `${completedInPillar.length}/${pillarActions.length}`;
            else statusLabel = `${completedInPillar.length}/${pillarActions.length}`;

            return (
              <div
                key={pillar.id}
                className={`${styles.pillarStep} ${
                  isCurrent ? styles.pillarCurrent : ""
                } ${isAllDone ? styles.pillarDone : ""} ${
                  isPartial && !isCurrent ? styles.pillarPulling : ""
                } ${isSkipped ? styles.pillarSkipped : ""}`}
              >
                <div className={styles.pillarTopLine}>
                  <span className={styles.pillarIndex}>{pillar.num}</span>
                  <span className={styles.pillarName}>{pillar.label}</span>
                  {pillar.isStopPillar && assistMode === "guided" && (
                    <span className={styles.pillarStopBadge} title="Stop Point Pillar">
                      ★
                    </span>
                  )}
                </div>
                <span className={styles.pillarSubStatus}>{statusLabel}</span>
              </div>
            );
          })}
        </div>

        {assistMode === "guided" && (
          <div className={styles.guidedCoachBar}>
            {cadenceSwitchPrompt ? (
              <span className={styles.coachSwitchAlert}>{cadenceSwitchPrompt}</span>
            ) : (
              <div className={styles.microBreadcrumbRow}>
                <span className={styles.microPillarTag}>
                  Pillar {pillars.find((p) => p.id === currentPillarId)?.num}:{" "}
                  {pillars.find((p) => p.id === currentPillarId)?.label}
                </span>
                <div className={styles.microStepsInline}>
                  {allStepIds
                    .filter((actId) => getActionPillarId(actId, isColdBar, allStepIds) === currentPillarId)
                    .map((actId) => {
                      const isDone = doneIds.includes(actId);
                      const isNext = actId === currentActionId;
                      return (
                        <span
                          key={actId}
                          className={`${styles.microChip} ${
                            isDone ? styles.microChipDone : isNext ? styles.microChipNext : ""
                          }`}
                        >
                          {isDone ? "✓ " : ""}
                          {getActionLabel(actId)}
                        </span>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // --- DUAL DRINK TICKET CARDS ---
  const renderSlotCard = (drinkObj, slotIdx, slotCode, visual) => {
    if (!drinkObj) return null;
    const prog = drinkProgress[drinkObj.queueKey];
    const isSelected = selectedSlot === slotCode;
    const allStepIds = drinkObj.steps.map((s) => s.actionId);
    const nextActionId = drinkObj.steps[prog?.currentStepIdx]?.actionId;
    const nextPillarId = nextActionId ? getActionPillarId(nextActionId, isColdBar, allStepIds) : null;
    const nextPillarObj = pillars.find((p) => p.id === nextPillarId);

    // Build concise equipment & state tags for this drink
    const activeTags = [];
    if (visual.isSteaming) activeTags.push({ key: "steam", label: "♨️ Steaming", cls: styles.tagSteaming });
    if (visual.shotsPulling) {
      activeTags.push({
        key: "shots",
        label: visual.usesShotGlass ? "☕ Pulling -> Glass" : "☕ Pulling -> Cup",
        cls: styles.tagPulling,
      });
    } else if (visual.shotsCaught) {
      activeTags.push({ key: "caught", label: "☕ Shots In", cls: styles.tagDone });
    }
    if (visual.isBlending) activeTags.push({ key: "blend", label: "🧊 Blending", cls: styles.tagSteaming });
    if (visual.hasFoamPrepped) activeTags.push({ key: "foam", label: "🌪️ Foam Ready", cls: styles.tagPulling });
    if (visual.hasSyrup) activeTags.push({ key: "syrup", label: "🍯 Syrup", cls: styles.tagDone });
    if (visual.hasSleeve) activeTags.push({ key: "sleeve", label: "🟫 Sleeved", cls: styles.tagSleeve });

    return (
      <button
        type="button"
        className={`${styles.drinkCard} ${
          isSelected
            ? slotCode === "A"
              ? styles.cardGreenActive
              : styles.cardGoldActive
            : ""
        }`}
        onClick={() => setSelectedSlot(slotCode)}
      >
        <div className={styles.cardTopSplit}>
          <div className={styles.cardTitleCol}>
            <div className={styles.cardHeaderRow}>
              <span className={slotCode === "A" ? styles.badgeGreen : styles.badgeGold}>
                Drink #{slotIdx + 1}
              </span>
              <span className={styles.tempBadge}>{drinkObj.size}</span>
            </div>
            <div className={styles.drinkName}>{drinkObj.name}</div>
            {drinkObj.hasColdFoam && drinkObj.coldFoamRecipe && (
              <div className={styles.foamSubtext}>Foam: {drinkObj.coldFoamRecipe}</div>
            )}
          </div>
          <DrinkVesselGraphic drinkObj={drinkObj} visual={visual} />
        </div>

        <div className={styles.badgeRow}>
          {activeTags.length === 0 ? (
            <span className={styles.tagIdle}>New Ticket</span>
          ) : (
            activeTags.map((t) => (
              <span key={t.key} className={t.cls}>
                {t.label}
              </span>
            ))
          )}
        </div>

        <div className={styles.cardFooterRow}>
          {prog?.reachedStopPoint && !prog?.isCompleted ? (
            <span className={styles.statusStopPoint}>★ At Stop Point</span>
          ) : prog?.currentStepIdx === 0 ? (
            <span className={styles.statusUnstarted}>Not Started</span>
          ) : (
            <span className={styles.statusActive}>In Progress</span>
          )}
          {nextPillarObj && (
            <span className={styles.cardPillarPill}>
              P{nextPillarObj.num}: {nextPillarObj.label}
            </span>
          )}
        </div>
      </button>
    );
  };

  const visibleButtons =
    activeDrink && activeProg ? activeDrink.steps[activeProg.currentStepIdx]?.choices || [] : [];
  const activeAllSteps = activeDrink ? activeDrink.steps.map((s) => s.actionId) : [];

  return (
    <div className={styles.container}>
      <div className={styles.topStatus}>
        <button className={styles.exitBtn} onClick={() => setGameState("menu")}>
          &larr; Exit
        </button>
        <div className={styles.topCenterPills}>
          <span className={styles.queueProgressBadge}>
            Handed Off: {completedCount}/{TOTAL_DRINKS}
          </span>
          <button
            type="button"
            className={styles.modeQuickToggle}
            onClick={() => setAssistMode((m) => (m === "guided" ? "rush" : "guided"))}
            title="Toggle Guided vs Pro Rush mode"
          >
            {assistMode === "guided" ? "★ Guided" : "⚡ Rush"}
          </button>
        </div>
        <div className={styles.timerBadge}>{formatTime(elapsedSeconds)}</div>
      </div>

      {renderEquipmentDock()}

      <div className={styles.dualHeaderContainer}>
        {renderSlotCard(drinkA, slotAIdx, "A", visualA)}
        {renderSlotCard(drinkB, slotBIdx, "B", visualB)}
      </div>

      {renderFourPillarRail()}

      {feedback && (
        <div
          key={feedback.msg}
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
            {visibleButtons.map((btnId) => {
              const btnPillarId = getActionPillarId(btnId, isColdBar, activeAllSteps);
              const btnPillarObj = pillars.find((p) => p.id === btnPillarId);
              return (
                <button
                  key={btnId}
                  type="button"
                  className={`${styles.actionBtn} ${
                    selectedSlot === "A" ? styles.btnGreenTheme : styles.btnGoldTheme
                  }`}
                  onClick={() => handleActionClick(btnId)}
                >
                  {btnPillarObj && (
                    <span className={styles.btnPillarBadge}>
                      {btnPillarObj.num}. {btnPillarObj.label}
                    </span>
                  )}
                  <span className={styles.btnActionLabel}>{getActionLabel(btnId)}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SequencingQuiz;
