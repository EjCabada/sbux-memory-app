import React from "react";
import styles from "./SearchBar.module.css";

function SearchBar({
  searchTerm,
  onSearchChange,
  onSearchSubmit,
  suggestions,
  onSuggestionClick,
}) {
  const handleChange = (event) => {
    // This function is used by both versions of the search bar
    if (typeof onSearchChange === "function") {
      onSearchChange(event.target.value);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (typeof onSearchSubmit === "function") {
      onSearchSubmit(searchTerm);
    }
  };

  // This determines if we should show the suggestions dropdown
  const showSuggestions = suggestions && suggestions.length > 0;

  return (
    <div className={styles.searchBarContainer}>
      <form onSubmit={handleSubmit} autoComplete="off">
        <input
          type="text"
          placeholder="Search for a drink recipe..."
          value={searchTerm}
          onChange={handleChange}
          className={styles.searchInput}
        />
      </form>
      {showSuggestions && (
        <ul className={styles.suggestionsList}>
          {suggestions.map((recipe) => (
            <li
              key={recipe.id}
              className={styles.suggestionItem}
              // Use onMouseDown to trigger before the input's blur event
              onMouseDown={() => onSuggestionClick(recipe.name)}
            >
              {recipe.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SearchBar;
