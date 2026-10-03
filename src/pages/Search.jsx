import React, { useState, useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useDrinkCatalog } from "../context/DrinkContext.jsx";
import FilterControls from "../components/FilterControls/FilterControls.jsx";
import SearchBar from "../components/SearchBar/SearchBar.jsx";
import RecipeModal from "../components/RecipeModal/RecipeModal.jsx";
import styles from "./Search.module.css";

const Search = () => {
  const { drinks, isLoading } = useDrinkCatalog();
  const location = useLocation();
  const initialSearchTerm = location.state?.searchTerm || "";
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [activeFilters, setActiveFilters] = useState([]);
  const [filterLogic, setFilterLogic] = useState("AND");
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  const filteredRecipes = useMemo(() => {
    return drinks.filter((recipe) => {
      const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilters = () => {
        if (activeFilters.length === 0) return true;
        if (filterLogic === "AND") {
          return activeFilters.every((filter) => recipe.tags?.includes(filter));
        } else {
          return activeFilters.some((filter) => recipe.tags?.includes(filter));
        }
      };
      return matchesSearch && matchesFilters();
    });
  }, [drinks, searchTerm, activeFilters, filterLogic]);

  useEffect(() => {
    if (location.state?.searchTerm) {
      setSearchTerm(location.state.searchTerm);
    }
  }, [location.state]);

  const handleFilterToggle = (tag) => {
    setActiveFilters((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  if (isLoading) return <div className={styles.searchContainer}><p>Loading drinks...</p></div>;

  return (
    <div className={styles.searchContainer}>
      <div className={styles.controls}>
        <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
        <FilterControls
          activeFilters={activeFilters}
          onFilterToggle={handleFilterToggle}
          filterLogic={filterLogic}
          onLogicChange={setFilterLogic}
        />
      </div>
      <div className={styles.resultsGrid}>
        {filteredRecipes.length > 0 ? (
          filteredRecipes.map((recipe) => (
            <div
              key={recipe.id || recipe.name}
              className={styles.recipeCard}
              onClick={() => setSelectedRecipe(recipe)}
              tabIndex="0"
              onKeyDown={(e) => e.key === "Enter" && setSelectedRecipe(recipe)}
            >
              <h3>{recipe.name}</h3>
              <div className={styles.tags}>
                {recipe.tags?.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className={styles.noResults}>No recipes found matching your criteria.</p>
        )}
      </div>
      {selectedRecipe && (
        <RecipeModal
          recipe={selectedRecipe}
          onClose={() => setSelectedRecipe(null)}
        />
      )}
    </div>
  );
};

export default Search;
