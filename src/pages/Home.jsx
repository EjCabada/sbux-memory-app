import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar/SearchBar.jsx";
import VersionModal, { CURRENT_VERSION } from "../components/VersionModal/VersionModal.jsx";
import recipesData from "../data/recipes.json";
import styles from "./Home.module.css";

const Home = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isVersionOpen, setIsVersionOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearchChange = (term) => {
    setSearchTerm(term);
    if (term.length > 1) {
      const filtered = recipesData
        .filter((recipe) =>
          recipe.name.toLowerCase().includes(term.toLowerCase())
        )
        .slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  };

  const navigateToSearch = (term) => {
    if (!term.trim()) return;
    setSearchTerm("");
    setSuggestions([]);
    navigate("/search", { state: { searchTerm: term } });
  };

  return (
    <div className={styles.homeContainer}>
      <div className={styles.topBar}>
        <button
          className={styles.versionBadge}
          onClick={() => setIsVersionOpen(true)}
        >
          {CURRENT_VERSION} &bull; What's New?
        </button>
      </div>

      <header className={styles.hero}>
        <h1>Barista Memory Deck</h1>
        <p>Master Hot Bar recipes, shot counts, and syrup pumps.</p>
      </header>

      <SearchBar
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onSearchSubmit={navigateToSearch}
        suggestions={suggestions}
        onSuggestionClick={navigateToSearch}
      />

      <div className={styles.modeGrid}>
        <Link to="/quiz/beginner" className={styles.modeCard}>
          <div className={styles.cardHeader}>
            <span className={styles.badge}>Hot Bar Focus</span>
            <h3>Flashcard Mode</h3>
          </div>
          <p>Drill shots and pumps across all cup sizes with multi-size flip cards.</p>
        </Link>

        <Link to="/quiz/advanced" className={styles.modeCard}>
          <div className={styles.cardHeader}>
            <span className={styles.badgeSecondary}>Full Builds</span>
            <h3>Drink Build Quiz</h3>
          </div>
          <p>Practice complete step-by-step beverage recipes and sequencing.</p>
        </Link>
      </div>

      {isVersionOpen && <VersionModal onClose={() => setIsVersionOpen(false)} />}
    </div>
  );
};

export default Home;
