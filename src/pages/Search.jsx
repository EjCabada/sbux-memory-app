import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
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

  const cardRefs = useRef(new Map());
  const prevRectsRef = useRef(new Map());

  const activeDrinks = useMemo(() => drinks.filter((r) => r.isActive), [drinks]);

  const filteredRecipes = useMemo(() => {
    return activeDrinks.filter((recipe) => {
      const matchesSearch = recipe.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;
      if (activeFilters.length === 0) return true;
      return filterLogic === "AND"
        ? activeFilters.every((filter) => recipe.tags?.includes(filter))
        : activeFilters.some((filter) => recipe.tags?.includes(filter));
    });
  }, [activeDrinks, searchTerm, activeFilters, filterLogic]);

  useEffect(() => {
    if (location.state?.searchTerm) {
      setSearchTerm(location.state.searchTerm);
    }
  }, [location.state]);

  // FLIP glide transition for surviving recipe cards + fade-in for newly appearing ones
  useLayoutEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    const prevRects = prevRectsRef.current;
    const nextRects = new Map();

    filteredRecipes.forEach((recipe) => {
      const el = cardRefs.current.get(recipe.id);
      if (!el) return;
      const newRect = el.getBoundingClientRect();
      nextRects.set(recipe.id, newRect);

      if (prefersReducedMotion || prevRects.size === 0) return;

      const oldRect = prevRects.get(recipe.id);
      if (oldRect) {
        const dx = oldRect.left - newRect.left;
        const dy = oldRect.top - newRect.top;
        if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
          el.style.transition = "none";
          el.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
          el.getBoundingClientRect();
          el.style.transition = "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)";
          el.style.transform = "";
        }
      } else {
        el.animate(
          [
            { opacity: 0, transform: "translateY(8px) scale(0.96)" },
            { opacity: 1, transform: "translateY(0) scale(1)" },
          ],
          { duration: 220, easing: "cubic-bezier(0.22, 1, 0.36, 1)" }
        );
      }
    });

    prevRectsRef.current = nextRects;
  }, [filteredRecipes]);

  const handleFilterToggle = (tag) => {
    setActiveFilters((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  if (isLoading) {
    return (
      <div className={styles.searchContainer}>
        <p className={styles.loadingText}>Loading drinks...</p>
      </div>
    );
  }

  return (
    <div className={styles.searchContainer}>
      <header className={styles.header}>
        <h1>Recipe Book</h1>
        <p>
          Showing {filteredRecipes.length} of {activeDrinks.length} drinks
        </p>
      </header>

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
              key={recipe.id}
              ref={(el) => {
                if (el) cardRefs.current.set(recipe.id, el);
                else cardRefs.current.delete(recipe.id);
              }}
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
