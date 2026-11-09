import React, { useState, useEffect } from "react";
import styles from "./Flashcard.module.css";

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

  const hotSteps = recipe?.workflows?.hot?.stepLabels || [];
  const icedSteps = recipe?.workflows?.iced?.stepLabels || [];
  const containsList = recipe?.containsList || [];

  const renderRecipeBack = () => (
    <>
      <h3>{recipe.name}</h3>
      <div className={styles.tabContainer}>
        <button
          className={`${styles.tabButton} ${activeTab === "components" ? styles.activeTab : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            setActiveTab("components");
          }}
        >
          Ingredients &amp; Ratios
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === "steps" ? styles.activeTab : ""}`}
          onClick={(e) => {
            e.stopPropagation();
            setActiveTab("steps");
          }}
        >
          Steps
        </button>
        {recipe.comments && (
          <button
            className={`${styles.tabButton} ${activeTab === "comments" ? styles.activeTab : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab("comments");
            }}
          >
            Notes
          </button>
        )}
      </div>
      <div className={styles.tabContent}>
        {activeTab === "components" && (
          <>
            {containsList.length > 0 && (
              <div className={styles.containsBox}>
                <h4>What It Contains</h4>
                <div className={styles.containsList}>
                  {containsList.map((item, idx) => (
                    <div key={idx} className={styles.containsRow}>
                      <span className={styles.containsLabel}>{item.category}:</span>
                      <span className={styles.containsVal}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {recipe.sizeList && (
              <div className={styles.detailsGrid}>
                {recipe.sizeList.map((s) => (
                  <div key={s.sizeKey} className={styles.sizeDetail}>
                    <strong>{s.size}:</strong>
                    <p>
                      {s.metrics.map((m) => `${m.label}: ${m.value}`).join(" | ")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {activeTab === "steps" && (
          <div className={styles.stepsContainer}>
            {hotSteps.length > 0 && (
              <div>
                <h4>Hot Steps ({recipe.workflows.hot.sizeLabel})</h4>
                <ol>
                  {hotSteps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            )}
            {icedSteps.length > 0 && (
              <div>
                <h4>Iced Steps ({recipe.workflows.iced.sizeLabel})</h4>
                <ol>
                  {icedSteps.map((step, i) => (
                    <li key={i}>{step}</li>
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
          {cardData.masteryLevel === 1 && <div className={styles.masteryIndicator}> </div>}
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
