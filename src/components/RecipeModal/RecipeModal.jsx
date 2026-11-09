import React from "react";
import styles from "./RecipeModal.module.css";

const RecipeModal = ({ recipe, onClose }) => {
  const handleContentClick = (e) => e.stopPropagation();
  if (!recipe) return null;

  const hotSteps = recipe.workflows?.hot?.stepLabels || [];
  const icedSteps = recipe.workflows?.iced?.stepLabels || [];
  const containsList = recipe.containsList || [];

  const renderRecipeDetails = () => (
    <>
      <h3>{recipe.name}</h3>

      {containsList.length > 0 && (
        <div className={styles.containsSection}>
          <h4>What It Contains</h4>
          <div className={styles.containsGrid}>
            {containsList.map((item, idx) => (
              <div key={idx} className={styles.containsItem}>
                <span className={styles.containsCategory}>{item.category}:</span>
                <span className={styles.containsValue}>{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {recipe.sizeList && recipe.sizeList.length > 0 && (
        <>
          <h4 className={styles.sectionSubheader}>Size Proportions</h4>
          <div className={styles.detailsGrid}>
            {recipe.sizeList.map((s) => (
              <div key={s.sizeKey} className={styles.detailItem}>
                <strong>{s.size}:</strong>
                <p>{s.metrics.map((m) => `${m.label}: ${m.value}`).join(" | ")}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {(hotSteps.length > 0 || icedSteps.length > 0) && <hr />}
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

      {recipe.comments && (
        <>
          <hr />
          <div className={styles.commentsContainer}>
            <h4>Barista Technique Notes</h4>
            <p>{recipe.comments}</p>
          </div>
        </>
      )}
    </>
  );

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={handleContentClick}>
        <button className={styles.closeButton} onClick={onClose}>
          &times;
        </button>
        <div className={styles.recipeDetails}>{renderRecipeDetails()}</div>
      </div>
    </div>
  );
};

export default RecipeModal;
