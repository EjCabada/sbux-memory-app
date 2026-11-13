import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useDrinkCatalog } from "../context/DrinkContext.jsx";
import { getWeakSpotIds, loadTraineeStats, recordDrinkStudyResult } from "../utils/studyStats.js";
import MultiSizeCard from "../components/MultiSizeCard/MultiSizeCard.jsx";
import styles from "./Quiz.module.css";

const MASTERY_THRESHOLD = 2;

const loadMasteryMap = (storageKey) => {
  try {
    const saved = sessionStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const HotBarFlashcards = ({ stationMode = "hot_bar" }) => {
  const { drinks, isLoading } = useDrinkCatalog();
  const [searchParams, setSearchParams] = useSearchParams();
  const isColdBar = stationMode === "cold_bar";

  const initialScope = searchParams.get("scope") || "essentials";
  const [deckScope, setDeckScope] = useState(initialScope);
  const [traineeStats, setTraineeStats] = useState(loadTraineeStats);

  const storageKey = `${isColdBar ? "srs-coldbar" : "srs-hotbar"}-${deckScope}-v2`;
  const [masteryMap, setMasteryMap] = useState(() => loadMasteryMap(storageKey));
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  useEffect(() => {
    setMasteryMap(loadMasteryMap(storageKey));
    setCurrentCardIndex(0);
  }, [storageKey]);

  const stationDrinks = useMemo(
    () =>
      drinks.filter(
        (d) =>
          d.isActive && (isColdBar ? d.station !== "espresso_bar" : d.station === "espresso_bar")
      ),
    [drinks, isColdBar]
  );

  const essentialsDrinks = useMemo(
    () => stationDrinks.filter((d) => d.curriculum?.isFundamental),
    [stationDrinks]
  );

  const missedIds = useMemo(() => new Set(getWeakSpotIds(traineeStats)), [traineeStats]);
  const missedDrinks = useMemo(
    () => stationDrinks.filter((d) => missedIds.has(d.id)),
    [stationDrinks, missedIds]
  );

  const scopedDrinks = useMemo(() => {
    if (deckScope === "missed") return missedDrinks;
    if (deckScope === "all") return stationDrinks;
    return essentialsDrinks;
  }, [deckScope, essentialsDrinks, missedDrinks, stationDrinks]);

  const deck = useMemo(
    () =>
      scopedDrinks.map((d) => ({
        ...d,
        masteryLevel: masteryMap[d.id] || 0,
      })),
    [scopedDrinks, masteryMap]
  );

  const activeDeck = useMemo(
    () => deck.filter((card) => card.masteryLevel < MASTERY_THRESHOLD),
    [deck]
  );

  const safeIndex = activeDeck.length > 0 ? currentCardIndex % activeDeck.length : 0;

  const handleScopeChange = (nextScope) => {
    setDeckScope(nextScope);
    setSearchParams({ scope: nextScope }, { replace: true });
    setCurrentCardIndex(0);
  };

  const handleKnowledgeUpdate = (level) => {
    if (activeDeck.length === 0) return;
    const currentCard = activeDeck[safeIndex];
    const prevLevel = masteryMap[currentCard.id] || 0;
    const nextLevel = level === 2 ? prevLevel + 1 : 0;
    const cardWasMastered = nextLevel >= MASTERY_THRESHOLD;

    const nextMap = { ...masteryMap, [currentCard.id]: nextLevel };
    setMasteryMap(nextMap);
    sessionStorage.setItem(storageKey, JSON.stringify(nextMap));

    const updatedStats = recordDrinkStudyResult(currentCard.id, level === 2);
    setTraineeStats(updatedStats);

    if (cardWasMastered) {
      const nextLen = activeDeck.length - 1;
      setCurrentCardIndex(nextLen > 0 ? safeIndex % nextLen : 0);
    } else {
      setCurrentCardIndex((safeIndex + 1) % activeDeck.length);
    }
  };

  const resetProgress = () => {
    setMasteryMap({});
    sessionStorage.removeItem(storageKey);
    setCurrentCardIndex(0);
  };

  if (isLoading) {
    return (
      <div className={styles.quizContainer}>
        <p>Loading flashcards...</p>
      </div>
    );
  }

  const currentCard = activeDeck[safeIndex];
  const knownCardsCount = deck.length - activeDeck.length;

  return (
    <div className={styles.quizContainer}>
      <div className={styles.topHeaderBar}>
        <h2>{isColdBar ? "Cold Bar Flashcards" : "Hot Bar Flashcards"}</h2>
        <div className={styles.scopeSegmented}>
          <button
            type="button"
            className={`${styles.scopeBtn} ${deckScope === "essentials" ? styles.scopeBtnActive : ""}`}
            onClick={() => handleScopeChange("essentials")}
          >
            Essentials ({essentialsDrinks.length})
          </button>
          <button
            type="button"
            className={`${styles.scopeBtn} ${deckScope === "all" ? styles.scopeBtnActive : ""}`}
            onClick={() => handleScopeChange("all")}
          >
            All Drinks ({stationDrinks.length})
          </button>
          {missedDrinks.length > 0 && (
            <button
              type="button"
              className={`${styles.scopeBtn} ${deckScope === "missed" ? styles.scopeBtnMissedActive : ""}`}
              onClick={() => handleScopeChange("missed")}
            >
              Missed ({missedDrinks.length})
            </button>
          )}
        </div>
      </div>

      <div className={styles.flashcardArea}>
        {currentCard ? (
          <MultiSizeCard item={currentCard} />
        ) : (
          <div className={styles.allDone}>
            <h3>
              {deckScope === "missed"
                ? "All missed drinks cleared!"
                : "Deck mastered!"}
            </h3>
            <p>
              {deckScope === "essentials"
                ? "Switch to All Drinks or reset progress to drill again."
                : "Reset progress to drill this deck again."}
            </p>
          </div>
        )}
      </div>

      {activeDeck.length > 0 && (
        <div className={styles.srsControls}>
          <button className={styles.dontKnow} onClick={() => handleKnowledgeUpdate(0)}>
            Miss
          </button>
          <button className={styles.somewhat} onClick={() => handleKnowledgeUpdate(1)}>
            Almost
          </button>
          <button className={styles.knowWell} onClick={() => handleKnowledgeUpdate(2)}>
            Got It
          </button>
        </div>
      )}

      <div className={styles.quizStats}>
        <span>
          {activeDeck.length > 0
            ? `${safeIndex + 1} / ${activeDeck.length} remaining`
            : "Completed"}{" "}
          &bull; {knownCardsCount}/{deck.length} mastered
        </span>
        {knownCardsCount > 0 && (
          <button onClick={resetProgress} className={styles.resetButton}>
            Reset Deck
          </button>
        )}
      </div>
    </div>
  );
};

export default HotBarFlashcards;
