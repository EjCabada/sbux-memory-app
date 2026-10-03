import React from "react";
import { ACTION_DICTIONARY } from "../../utils/drinkAdapters";
import styles from "./RecipeModal.module.css";

const formatKey = (k) => k.replace(/_/g, " ").toUpperCase();

const RecipeModal = ({ recipe, onClose }) => {
  const handleContentClick = (e) => e.stopPropagation();
  if (!recipe) return null;

  const renderRecipeDetails = () => (
    <>
      <h3>{recipe.name}</h3>

      {recipe.sizes && (
        <div className={styles.detailsGrid}>
          {Object.entries(recipe.sizes).map(([sizeKey, values]) => (
            <div key={sizeKey} className={styles.detailItem}>
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

      {(recipe.hot?.steps || recipe.iced?.steps) && <hr />}
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

      {recipe.comments && (
        <>
          <hr />
          <div className={styles.commentsContainer}>
            <h4>Comments</h4>
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
