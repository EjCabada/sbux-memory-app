import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar/SearchBar.jsx";
import QuizChoiceMenu from "../components/QuizChoiceMenu/QuizChoiceMenu.jsx";
import recipesData from "../data/recipes.json"; // Import recipe data

const Home = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const navigate = useNavigate();

  // Handles changes in the search input
  const handleSearchChange = (term) => {
    setSearchTerm(term);
    if (term.length > 1) {
      // Filter recipes based on the input term
      const filtered = recipesData
        .filter((recipe) =>
          recipe.name.toLowerCase().includes(term.toLowerCase()),
        )
        .slice(0, 5); // Get the top 5 matches
      setSuggestions(filtered);
    } else {
      setSuggestions([]); // Clear suggestions if search term is short
    }
  };

  // Navigates to the search page with the selected term
  const navigateToSearch = (term) => {
    if (!term.trim()) return;
    setSearchTerm("");
    setSuggestions([]);
    navigate("/search", { state: { searchTerm: term } });
  };

  // Handler for submitting the search form (e.g., pressing Enter)
  const handleSearchSubmit = (term) => {
    navigateToSearch(term);
  };

  // Handler for clicking a suggestion from the dropdown
  const handleSuggestionClick = (term) => {
    navigateToSearch(term);
  };

  return (
    <div>
      <p>
        Your digital flashcard deck to help memorize recipes and succeed on the
        floor.
      </p>
      <SearchBar
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onSearchSubmit={handleSearchSubmit}
        suggestions={suggestions}
        onSuggestionClick={handleSuggestionClick}
      />
      <QuizChoiceMenu />
    </div>
  );
};

export default Home;
