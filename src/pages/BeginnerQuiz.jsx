import React, { useState, useEffect } from "react";
import basicsData from "../data/basics.json";
import Flashcard from "../components/Flashcard/Flashcard.jsx";
import styles from "./Quiz.module.css"; // Re-using the same styles

const MASTERY_THRESHOLD = 2;

const BeginnerQuiz = () => {
  const [deck, setDeck] = useState([]);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  useEffect(() => {
    const savedDeck = localStorage.getItem("srs-deck-beginner");
    let initialDeck;
    if (savedDeck) {
      initialDeck = JSON.parse(savedDeck);
    } else {
      initialDeck = basicsData.map((card) => ({
        ...card,
        masteryLevel: 0,
      }));
    }
    setDeck(initialDeck);
  }, []);

  const activeDeck = React.useMemo(
    () => deck.filter((card) => card.masteryLevel < MASTERY_THRESHOLD),
    [deck],
  );

  const handleKnowledgeUpdate = (level) => {
    if (activeDeck.length === 0) return;

    const currentCard = activeDeck[currentCardIndex];
    let cardWasMastered = false;

    const updatedDeck = deck.map((card) => {
      if (card.id === currentCard.id) {
        let newMasteryLevel = card.masteryLevel;
        if (level === 2) {
          // 2 = Know Well
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
    localStorage.setItem("srs-deck-beginner", JSON.stringify(updatedDeck));

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
    localStorage.setItem("srs-deck-beginner", JSON.stringify(initialDeck));
    setCurrentCardIndex(0);
  };

  const currentCard = activeDeck[currentCardIndex];
  const knownCardsCount = deck.length - activeDeck.length;

  return (
    <div className={styles.quizContainer}>
      <h2>Beginner Quiz</h2>
      <p>
        Learn the fundamentals. Master a card by marking it "Know Well" twice.
      </p>

      <div className={styles.flashcardArea}>
        {currentCard ? (
          <Flashcard basicCard={currentCard} />
        ) : (
          <div className={styles.allDone}>
            <h3>You've mastered all the basics!</h3>
            <p>Reset your progress to start again.</p>
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
            ? `Card ${currentCardIndex + 1} of ${activeDeck.length}`
            : "No cards left."}
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

export default BeginnerQuiz;
