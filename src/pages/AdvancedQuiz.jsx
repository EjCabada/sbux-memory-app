import React, { useState, useMemo } from "react";
import { useDrinkCatalog } from "../context/DrinkContext.jsx";
import Flashcard from "../components/Flashcard/Flashcard.jsx";
import FilterControls from "../components/FilterControls/FilterControls.jsx";
import styles from "./Quiz.module.css";

const MASTERY_THRESHOLD = 2;
const STORAGE_KEY = "srs-mastery-advanced-v2";

const loadMasteryMap = () => {
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const AdvancedQuiz = () => {
  const { drinks, isLoading } = useDrinkCatalog();
  const [masteryMap, setMasteryMap] = useState(loadMasteryMap);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [activeFilters, setActiveFilters] = useState([]);
  const [filterLogic, setFilterLogic] = useState("AND");

  const activeCatalog = useMemo(() => drinks.filter((d) => d.isActive), [drinks]);

  const deck = useMemo(
    () =>
      activeCatalog.map((recipe) => ({
        ...recipe,
        masteryLevel: masteryMap[recipe.id] || 0,
      })),
    [activeCatalog, masteryMap]
  );

  const activeDeck = useMemo(() => {
    return deck.filter((card) => {
      if (card.masteryLevel >= MASTERY_THRESHOLD) return false;
      if (activeFilters.length === 0) return true;
      return filterLogic === "AND"
        ? activeFilters.every((f) => card.tags?.includes(f))
        : activeFilters.some((f) => card.tags?.includes(f));
    });
  }, [deck, activeFilters, filterLogic]);

  const safeIndex = activeDeck.length > 0 ? currentCardIndex % activeDeck.length : 0;

  const handleFilterToggle = (tag) => {
    setActiveFilters((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
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
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextMap));

    if (cardWasMastered) {
      const nextLen = activeDeck.length - 1;
      setCurrentCardIndex(nextLen > 0 ? safeIndex % nextLen : 0);
    } else {
      setCurrentCardIndex((safeIndex + 1) % activeDeck.length);
    }
  };

  const resetProgress = () => {
    setMasteryMap({});
    sessionStorage.removeItem(STORAGE_KEY);
    setCurrentCardIndex(0);
  };

  if (isLoading) {
    return (
      <div className={styles.quizContainer}>
        <p>Loading Quiz...</p>
      </div>
    );
  }

  const currentRecipe = activeDeck[safeIndex];
  const knownCardsCount = deck.filter((c) => c.masteryLevel >= MASTERY_THRESHOLD).length;

  return (
    <div className={styles.quizContainer}>
      <h2>Drink Build Quiz</h2>
      <p>Filter by category and master the steps and ratios for each drink.</p>
      <FilterControls
        activeFilters={activeFilters}
        onFilterToggle={handleFilterToggle}
        filterLogic={filterLogic}
        onLogicChange={setFilterLogic}
      />
      <div className={styles.flashcardArea}>
        {currentRecipe ? (
          <Flashcard recipe={currentRecipe} />
        ) : (
          <div className={styles.allDone}>
            <h3>
              {activeFilters.length > 0
                ? "You've mastered this category!"
                : "You've mastered all drinks!"}
            </h3>
            <p>Clear filters or reset your progress to continue.</p>
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
          {activeDeck.length > 0
            ? `Card ${safeIndex + 1} of ${activeDeck.length}`
            : "No cards left in this filter."}
        </div>
        <div className={styles.knownCounter}>
          ({knownCardsCount} / {deck.length} total mastered)
        </div>
        <button onClick={resetProgress} className={styles.resetButton}>
          Reset All Progress
        </button>
      </div>
    </div>
  );
};

export default AdvancedQuiz;
