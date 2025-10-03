import React, { useState, useEffect, useMemo } from "react"; 
import { useLocation } from "react-router-dom";
import recipesData from "../data/recipes.json";
import FilterControls from "../components/FilterControls/FilterControls";
import SearchBar from "../components/SearchBar/SearchBar";
import styles from "./Search.module.css";
import RecipeModal from "../components/RecipeModal/RecipeModal";

const Search = () => {
  const location = useLocation();
  const initialSearchTerm = location.state?.searchTerm || "";

  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [activeFilters, setActiveFilters] = useState([]);
    const [filterLogic, setFilterLogic] = useState("AND");
  const [selectedRecipe, setSelectedRecipe] = useState(null); 

  const filteredRecipes = useMemo(() => { 
    return recipesData.filter((recipe) => {
      const matchesSearch = recipe.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      
      const matchesFilters = () => {
        if (activeFilters.length === 0) return true;
        if (filterLogic === "AND") {
          return activeFilters.every((filter) => recipe.tags.includes(filter));
        } else { // OR logic
          return activeFilters.some((filter) => recipe.tags.includes(filter));
        }
      };

      return matchesSearch && matchesFilters();
    });
  }, [searchTerm, activeFilters, filterLogic]); 

  useEffect(() => {
    if (location.state?.searchTerm) {
      setSearchTerm(location.state.searchTerm);
    }
  }, [location.state]);

  const handleFilterToggle = (tag) => {
    setActiveFilters((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

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
            // Replaced button with a div for better styling control
            <div
              key={recipe.name}
              className={styles.recipeCard}
              onClick={() => setSelectedRecipe(recipe)}
              tabIndex="0" // Makes it focusable
              onKeyPress={(e) => e.key === 'Enter' && setSelectedRecipe(recipe)} // Accessibility
            >
              <h3>{recipe.name}</h3>
              <div className={styles.tags}>
                {recipe.tags.map((tag) => (
                  <span key={tag} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p>No recipes found matching your criteria.</p>
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
