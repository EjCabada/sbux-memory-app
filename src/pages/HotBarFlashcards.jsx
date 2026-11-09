import React, { useState, useMemo, useEffect } from "react";
import { useDrinkCatalog } from "../context/DrinkContext.jsx";
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
  const isColdBar = stationMode === "cold_bar";
  const storageKey = isColdBar ? "srs-mastery-coldbar-v2" : "srs-mastery-hotbar-v2";

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

  const deck = useMemo(
    () =>
      stationDrinks.map((d) => ({
        ...d,
        masteryLevel: masteryMap[d.id] || 0,
      })),
    [stationDrinks, masteryMap]
  );

  const activeDeck = useMemo(
    () => deck.filter((card) => card.masteryLevel < MASTERY_THRESHOLD),
    [deck]
  );

  const safeIndex = activeDeck.length > 0 ? currentCardIndex % activeDeck.length : 0;

  const handleKnowledgeUpdate = (level) => {
    if (activeDeck.length === 0) return;
    const currentCard = activeDeck[safeIndex];
    const prevLevel = masteryMap[currentCard.id] || 0;
    const nextLevel = level === 2 ? prevLevel + 1 : 0;
    const cardWasMastered = nextLevel >= MASTERY_THRESHOLD;

    const nextMap = { ...masteryMap, [currentCard.id]: nextLevel };
    setMasteryMap(nextMap);
    sessionStorage.setItem(storageKey, JSON.stringify(nextMap));

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
      <h2>{isColdBar ? "Cold Bar & Blended Flashcards" : "Hot Bar Multi-Size Flashcards"}</h2>
      <p>
        {isColdBar
          ? "Tap each size card to test Frap Roast, Matcha scoops, Refresher caffeine & inclusions, and syrup pumps."
          : "Tap each size card to test shots and pumps before grading."}
      </p>
      <div className={styles.flashcardArea}>
        {currentCard ? (
          <MultiSizeCard item={currentCard} />
        ) : (
          <div className={styles.allDone}>
            <h3>All {isColdBar ? "Cold Bar & Blended" : "Hot Bar"} drinks mastered!</h3>
            <p>Reset progress to drill again.</p>
          </div>
        )}
      </div>
      {activeDeck.length > 0 && (
        <div className={styles.srsControls}>
          <button className={styles.dontKnow} onClick={() => handleKnowledgeUpdate(0)}>
            Don&apos;t Know
          </button>
          <button className={styles.somewhat} onClick={() => handleKnowledgeUpdate(1)}>
            Know Somewhat
          </button>
          <button className={styles.knowWell} onClick={() => handleKnowledgeUpdate(2)}>
            Know Well
          </button>
        </div>
      )}
      <div className={styles.quizStats}>
        <div className={styles.cardCounter}>
          {activeDeck.length > 0 ? `Drink ${safeIndex + 1} of ${activeDeck.length}` : "Deck Completed"}
        </div>
        <div className={styles.knownCounter}>
          ({knownCardsCount} / {deck.length} mastered)
        </div>
        <button onClick={resetProgress} className={styles.resetButton}>
          Reset Progress
        </button>
      </div>
    </div>
  );
};

export default HotBarFlashcards;
