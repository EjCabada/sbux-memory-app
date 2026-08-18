import React, { useState, useEffect, useMemo } from "react";
import basicsData from "../data/basics.json";
import MultiSizeCard from "../components/MultiSizeCard/MultiSizeCard.jsx";
import styles from "./Quiz.module.css";

const MASTERY_THRESHOLD = 2;

const HotBarFlashcards = () => {
  const [deck, setDeck] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  useEffect(() => {
    const savedDeck = localStorage.getItem("srs-deck-hotbar-flashcards");
    if (savedDeck) {
      setDeck(JSON.parse(savedDeck));
    } else {
      const initialDeck = basicsData.map((card) => ({
        ...card,
        masteryLevel: 0,
      }));
      setDeck(initialDeck);
    }
  }, []);

  const activeDeck = useMemo(
    () => deck.filter((card) => card.masteryLevel < MASTERY_THRESHOLD),
    [deck]
  );

  const handleKnowledgeUpdate = (level) => {
    if (activeDeck.length === 0) return;
    const currentCard = activeDeck[currentCardIndex];
    let cardWasMastered = false;

    const updatedDeck = deck.map((card) => {
      if (card.id === currentCard.id) {
        let newMasteryLevel = card.masteryLevel;
        if (level === 2) {
          newMasteryLevel++;
        } else {
          newMasteryLevel = 0;
        }
        if (newMasteryLevel >= MASTERY_THRESHOLD) {
          cardWasMastered = true;
        }
        return { ...card, masteryLevel: newMasteryLevel };
      }
      return card;
    });

    setDeck(updatedDeck);
    localStorage.setItem("srs-deck-hotbar-flashcards", JSON.stringify(updatedDeck));

    if (cardWasMastered && currentCardIndex >= activeDeck.length - 1) {
      setCurrentCardIndex(0);
    } else if (!cardWasMastered) {
      setCurrentCardIndex((prev) => (prev + 1) % activeDeck.length);
    }
  };

  const resetProgress = () => {
    const initialDeck = basicsData.map((card) => ({
      ...card,
      masteryLevel: 0,
    }));
    setDeck(initialDeck);
    localStorage.setItem("srs-deck-hotbar-flashcards", JSON.stringify(initialDeck));
    setCurrentCardIndex(0);
  };

  const currentCard = activeDeck[currentCardIndex];
  const knownCardsCount = deck.length - activeDeck.length;

  return (
    <div className={styles.quizContainer}>
      <h2>Hot Bar Multi-Size Flashcards</h2>
      <p>Tap each size card to test shots and pumps before grading.</p>

      <div className={styles.flashcardArea}>
        {currentCard ? (
          <MultiSizeCard item={currentCard} />
        ) : (
          <div className={styles.allDone}>
            <h3>All Hot Bar drinks mastered!</h3>
            <p>Reset progress to drill again.</p>
          </div>
        )}
      </div>

      {activeDeck.length > 0 && (
        <div className={styles.srsControls}>
          <button
            className={styles.dontKnow}
            onClick={() => handleKnowledgeUpdate(0)}
          >
            Don't Know
          </button>
          <button
            className={styles.somewhat}
            onClick={() => handleKnowledgeUpdate(1)}
          >
            Know Somewhat
          </button>
          <button
            className={styles.knowWell}
            onClick={() => handleKnowledgeUpdate(2)}
          >
            Know Well
          </button>
        </div>
      )}

      <div className={styles.quizStats}>
        <div className={styles.cardCounter}>
          {activeDeck.length > 0
            ? `Drink ${currentCardIndex + 1} of ${activeDeck.length}`
            : "Deck Completed"}
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
