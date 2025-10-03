import React, { useState, useEffect } from "react";
import styles from "./Flashcard.module.css";

const formatComponentName = (name) => {
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const Flashcard = ({ recipe, basicCard }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeTab, setActiveTab] = useState("components");

  const cardData = recipe || basicCard;
  const isRecipe = !!recipe;

  useEffect(() => {
    setIsFlipped(false);
  }, [cardData]);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
    if (isFlipped) {
      setTimeout(() => setActiveTab("components"), 300);
    }
  };

  if (!cardData) return null;

    const renderRecipeBack = () => (
    <>
      <h3>{recipe.name}</h3>
      <div className={styles.tabContainer}>
        <button
          className={`${styles.tabButton} ${activeTab === "components" ? styles.activeTab : ""}`}
          onClick={(e) => { e.stopPropagation(); setActiveTab("components"); }}
        >
          Components
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === "steps" ? styles.activeTab : ""}`}
          onClick={(e) => { e.stopPropagation(); setActiveTab("steps"); }}
        >
          Steps
        </button>
        {recipe.comments && (
          <button
            className={`${styles.tabButton} ${activeTab === "comments" ? styles.activeTab : ""}`}
            onClick={(e) => { e.stopPropagation(); setActiveTab("comments"); }}
          >
            Comments
          </button>
        )}
      </div>

      <div className={styles.tabContent}>
        {activeTab === "components" && (
          <div className={styles.detailsGrid}>
            {recipe.components && Object.entries(recipe.components).map(([name, values]) => (
              <div key={name} className={styles.detailItem}>
                <strong>{formatComponentName(name)}:</strong>
                <p>{Array.isArray(values) ? values.join(" / ") : values}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === "steps" && (
          <div className={styles.stepsContainer}>
            {recipe.steps?.hot && (
              <div><h4>Hot Steps</h4><ol>{recipe.steps.hot.map((step, i) => <li key={i}>{step}</li>)}</ol></div>
            )}
            {recipe.steps?.iced && (
              <div><h4>Iced Steps</h4><ol>{recipe.steps.iced.map((step, i) => <li key={i}>{step}</li>)}</ol></div>
            )}
          </div>
        )}

        {activeTab === "comments" && recipe.comments && (
          <div className={styles.commentsContainer}>
            <p>{recipe.comments}</p>
          </div>
        )}
      </div>
    </>
  );

  // Renders the simple answer for a basic quiz card
  const renderBasicBack = () => (
    <>
      <h3>Answer</h3>
      <p className={styles.basicAnswer}>{basicCard.answer}</p>
    </>
  );

  return (
    <div className={styles.flashcardContainer} onClick={handleFlip}>
      <div className={`${styles.flashcard} ${isFlipped ? styles.flipped : ""}`}>
        <div className={styles.cardFace}>
          {cardData.masteryLevel === 1 && (
            <div className={styles.masteryIndicator}>⭐</div>
          )}
          <h2>{isRecipe ? recipe.name : basicCard.question}</h2>
        </div>
        <div className={`${styles.cardFace} ${styles.cardBack}`}>
          {isRecipe ? renderRecipeBack() : (<div> {/* Basic back */} </div>)}
        </div>
      </div>
    </div>
  );
};

export default Flashcard;