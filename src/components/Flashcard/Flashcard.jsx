import React, { useState, useEffect } from "react";
import { ACTION_DICTIONARY } from "../../utils/drinkAdapters";
import styles from "./Flashcard.module.css";

const formatKey = (k) => k.replace(/_/g, " ").toUpperCase();

const Flashcard = ({ recipe, basicCard }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [activeTab, setActiveTab] = useState("components");
  const cardData = recipe || basicCard;
  const isRecipe = Boolean(recipe);

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
          Ratios
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
        {activeTab === "components" && recipe.sizes && (
          <div className={styles.detailsGrid}>
            {Object.entries(recipe.sizes).map(([sizeKey, values]) => (
              <div key={sizeKey} className={styles.sizeDetail}>
                <strong>{formatKey(sizeKey)}:</strong>
                <p>
                  {values.shots !== undefined && `Shots: ${values.shots}`}
                  {values.pumps !== undefined && ` | Pumps: ${values.pumps}`}
                  {values.scoops !== undefined && ` | Scoops: ${values.scoops}`}
                </p>
              </div>
            ))}
          </div>
        )}
        {activeTab === "steps" && (
          <div className={styles.stepsContainer}>
            {recipe.hot?.steps && (
              <div>
                <h4>Hot Steps</h4>
                <ol>
                  {recipe.hot.steps.map((step, i) => (
                    <li key={i}>{ACTION_DICTIONARY[step] || step}</li>
                  ))}
                </ol>
              </div>
            )}
            {recipe.iced?.steps && (
              <div>
                <h4>Iced Steps</h4>
                <ol>
                  {recipe.iced.steps.map((step, i) => (
                    <li key={i}>{ACTION_DICTIONARY[step] || step}</li>
                  ))}
                </ol>
              </div>
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
            <div className={styles.masteryIndicator}> </div>
          )}
          <h2>{isRecipe ? recipe.name : basicCard.question}</h2>
        </div>
        <div className={`${styles.cardFace} ${styles.cardBack}`}>
          {isRecipe ? renderRecipeBack() : renderBasicBack()}
        </div>
      </div>
    </div>
  );
};

export default Flashcard;
