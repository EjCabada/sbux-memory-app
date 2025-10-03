import React from "react";
import styles from "./RecipeModal.module.css";

// Helper function to format component names
const formatComponentName = (name) => {
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const RecipeModal = ({ recipe, onClose }) => {
  // Prevents modal from closing when clicking on its content
  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  // Renders the recipe details
  const renderRecipeDetails = () => (
    <>
      <h3>{recipe.name}</h3>

      {/* Components Section */}
      <div className={styles.detailsGrid}>
        {recipe.components &&
          Object.entries(recipe.components).map(([name, values]) => (
            <div key={name} className={styles.detailItem}>
              <strong>{formatComponentName(name)}:</strong>
              <p>{Array.isArray(values) ? values.join(" / ") : values}</p>
            </div>
          ))}
      </div>

      {(recipe.steps?.hot || recipe.steps?.iced) && <hr />}
      <div className={styles.stepsContainer}>
        {recipe.steps?.hot && (
          <div>
            <h4>Hot Steps</h4>
            <ol>
              {recipe.steps.hot.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        )}
        {recipe.steps?.iced && (
          <div>
            <h4>Iced Steps</h4>
            <ol>
              {recipe.steps.iced.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {recipe.comments && <hr />}
      {recipe.comments && (
        <div className={styles.commentsContainer}>
          <h4>Comments</h4>
          <p>{recipe.comments}</p>
        </div>
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