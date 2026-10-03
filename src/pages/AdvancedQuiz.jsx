import React, { useState, useEffect, useMemo } from "react";
import { useDrinkCatalog } from "../context/DrinkContext.jsx";
import Flashcard from "../components/Flashcard/Flashcard.jsx";
import FilterControls from "../components/FilterControls/FilterControls.jsx";
import styles from "./Quiz.module.css";

const MASTERY_THRESHOLD = 2;

const AdvancedQuiz = () => {
  const { drinks, isLoading } = useDrinkCatalog();
  const [deck, setDeck] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [activeFilters, setActiveFilters] = useState([]);
  const [filterLogic, setFilterLogic] = useState("AND");

  useEffect(() => {
    if (!drinks.length) return;
    const savedDeck = sessionStorage.getItem("srs-deck-advanced");
    if (savedDeck) {
      const parsed = JSON.parse(savedDeck);
      setDeck(parsed.map((card) => ({ ...card, masteryLevel: card.masteryLevel || 0 })));
    } else {
      setDeck(drinks.map((recipe) => ({ ...recipe, masteryLevel: 0 })));
    }
  }, [drinks]);

  const handleFilterToggle = (tag) => {
    setActiveFilters((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setCurrentCardIndex(0);
  };

  const activeDeck = useMemo(() => {
    const filteredByTag = drinks.filter((recipe) => {
      if (activeFilters.length === 0) return true;
      if (filterLogic === "AND") {
        return activeFilters.every((f) => recipe.tags?.includes(f));
      } else {
        return activeFilters.some((f) => recipe.tags?.includes(f));
      }
    });
    const filteredIds = new Set(filteredByTag.map((r) => r.id));
    return deck.filter(
      (card) => filteredIds.has(card.id) && card.masteryLevel < MASTERY_THRESHOLD
    );
  }, [drinks, deck, activeFilters, filterLogic]);

  const handleKnowledgeUpdate = (level) => {
    if (activeDeck.length === 0) return;
    const currentCard = activeDeck[currentCardIndex];
    let cardWasMastered = false;

    const updatedDeck = deck.map((card) => {
      if (card.id === currentCard.id) {
        let newMasteryLevel = card.masteryLevel;
        if (level === 2) newMasteryLevel++;
        else newMasteryLevel = 0;

        if (newMasteryLevel >= MASTERY_THRESHOLD) cardWasMastered = true;
        return { ...card, masteryLevel: newMasteryLevel };
      }
      return card;
    });

    setDeck(updatedDeck);
    sessionStorage.setItem("srs-deck-advanced", JSON.stringify(updatedDeck));

    if (cardWasMastered && currentCardIndex >= activeDeck.length - 1) {
      setCurrentCardIndex(0);
    } else if (!cardWasMastered) {
      setCurrentCardIndex((prev) => (prev + 1) % activeDeck.length);
    }
  };

  const resetProgress = () => {
    const initialDeck = drinks.map((recipe) => ({
      ...recipe,
      masteryLevel: 0,
    }));
    setDeck(initialDeck);
    sessionStorage.setItem("srs-deck-advanced", JSON.stringify(initialDeck));
    setCurrentCardIndex(0);
  };

  if (isLoading) return <div className={styles.quizContainer}><p>Loading Quiz...</p></div>;

  const currentRecipe = activeDeck[currentCardIndex];
  const knownCardsCount = deck.filter((c) => c.masteryLevel >= MASTERY_THRESHOLD).length;

  return (
    <div className={styles.quizContainer}>
      <h2>Drink Build Quiz</h2>
      <p>Filter by category and master the steps for each drink.</p>
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
            Don't Know
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
            ? `Card ${currentCardIndex + 1} of ${activeDeck.length}`
            : "No cards left in this filter."}
        </div>
        <div className={styles.knownCounter}>
          ({knownCardsCount} / {drinks.length} total mastered)
        </div>
        <button onClick={resetProgress} className={styles.resetButton}>
          Reset All Progress
        </button>
      </div>
    </div>
  );
};

export default AdvancedQuiz;
