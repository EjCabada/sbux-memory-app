import React from "react";
import styles from "./FilterControls.module.css";

const filterTags = [
  "espresso bar", "cold bar", "core drinks", "seasonal drinks", 
  "Frappuccinos", "refreshers", "iced teas", "cold brew",
];

const FilterControls = ({ activeFilters, onFilterToggle, filterLogic, onLogicChange }) => {
  return (
    <div className={styles.filterWrapper}>
      <div className={styles.logicToggle}>
        <span>Filter by:</span>
        <button
          onClick={() => onLogicChange("AND")}
          className={filterLogic === "AND" ? styles.activeLogic : ""}
        >
          Match All (AND)
        </button>
        <button
          onClick={() => onLogicChange("OR")}
          className={filterLogic === "OR" ? styles.activeLogic : ""}
        >
          Match Any (OR)
        </button>
      </div>
      <div className={styles.filterContainer}>
        {filterTags.map((tag) => (
          <button
            key={tag}
            onClick={() => onFilterToggle(tag)}
            className={`${styles.filterButton} ${
              activeFilters.includes(tag) ? styles.active : ""
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FilterControls;
