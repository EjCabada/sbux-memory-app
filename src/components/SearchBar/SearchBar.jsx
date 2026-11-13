import React, { useState } from "react";
import styles from "./SearchBar.module.css";

function SearchBar({
  searchTerm,
  onSearchChange,
  onSearchSubmit,
  suggestions,
  onSuggestionClick,
}) {
  const [isFocused, setIsFocused] = useState(false);

  const handleChange = (event) => {
    if (typeof onSearchChange === "function") {
      onSearchChange(event.target.value);
    }
  };

  const handleClear = () => {
    if (typeof onSearchChange === "function") {
      onSearchChange("");
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (typeof onSearchSubmit === "function") {
      onSearchSubmit(searchTerm);
    }
  };

  const showSuggestions = isFocused && Array.isArray(suggestions) && suggestions.length > 0;

  return (
    <div className={styles.searchBarContainer}>
      <form onSubmit={handleSubmit} autoComplete="off" className={styles.searchForm}>
        <input
          type="text"
          placeholder="Search for a drink recipe..."
          value={searchTerm}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={styles.searchInput}
        />
        {searchTerm && (
          <button
            type="button"
            className={styles.clearBtn}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
            aria-label="Clear search"
          >
            &times;
          </button>
        )}
      </form>
      {showSuggestions && (
        <ul className={styles.suggestionsList}>
          {suggestions.map((recipe, idx) => (
            <li
              key={recipe.id}
              style={{ animationDelay: `${idx * 30}ms` }}
              className={styles.suggestionItem}
              onMouseDown={() => onSuggestionClick(recipe.name)}
            >
              <span>{recipe.name}</span>
              <span className={styles.suggestionArrow}>&rarr;</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SearchBar;
