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
      {/* Top Bar with Version Tag */}
      <div className={styles.topBar}>
        <button
          className={styles.versionBadge}
          onClick={() => setIsVersionOpen(true)}
        >
          <span className={styles.versionDot}></span>
          {CURRENT_VERSION} &bull; What's New?
        </button>
      </div>

      {/* Hero Header */}
      <header className={styles.hero}>
        <h1>Barista Training Deck</h1>
        <p>Master hot bar routines, pump ratios, and recipe sequencing.</p>
      </header>

      {/* Global Recipe Search */}
      <SearchBar
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onSearchSubmit={navigateToSearch}
        suggestions={suggestions}
        onSuggestionClick={navigateToSearch}
      />

      {/* Curriculum Sections */}
      <div className={styles.curriculumContainer}>
        {/* Section: Week 2 */}
        <section className={styles.curriculumSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleGroup}>
              <span className={styles.weekBadge}>Active Training</span>
              <h2>Week 2: Hot Bar</h2>
            </div>
            <p className={styles.sectionSubtext}>
              Core espresso drinks, cortados, shots, and syrup pumps.
            </p>
          </div>

          <div className={styles.cardsGrid}>
            {/* Mode 1: Flashcards */}
            <Link to="/quiz/flashcards" className={styles.curriculumCard}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTag}>Study Mode</span>
                <span className={styles.cardIcon}>📇</span>
              </div>
              <h3>Hot Bar Flashcards</h3>
              <p>
                Flip individual size cards (Tl, Gr, Vt Ht, Vt Icd) to drill shot and pump ratios.
              </p>
              <div className={styles.cardFooter}>
                <span>Multi-Size Drill</span>
                <span className={styles.arrowIcon}>&rarr;</span>
              </div>
            </Link>

            {/* Mode 2: Quiz */}
            <Link to="/quiz/beginner" className={styles.curriculumCard}>
              <div className={styles.cardHeader}>
                <span className={styles.cardTagQuiz}>Timed / Mastery</span>
                <span className={styles.cardIcon}>⏱️</span>
              </div>
              <h3>Hot Bar Speed Quiz</h3>
              <p>
                Rapid-fire shots and pumps test with 1/2/5-min timers, perfection mode, and spaced retesting.
              </p>
              <div className={styles.cardFooter}>
                <span>Instant Feedback</span>
                <span className={styles.arrowIcon}>&rarr;</span>
              </div>
            </Link>
          </div>
        </section>

        {/* Section: Final Exam */}
        <section className={styles.curriculumSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleGroup}>
              <span className={styles.lockedBadge}>🔒 Locked</span>
              <h2 className={styles.lockedTitle}>Final (Do not look yet!)</h2>
            </div>
            <p className={styles.sectionSubtext}>
              Comprehensive beverage build process, sequencing, and step-by-step assembly.
            </p>
          </div>

          <div className={styles.cardsGrid}>
            <Link to="/quiz/advanced" className={`${styles.curriculumCard} ${styles.finalCard}`}>
              <div className={styles.cardHeader}>
                <span className={styles.finalTag}>Full Build Evaluation</span>
                <span className={styles.cardIcon}>🎓</span>
              </div>
              <h3>Drink Build Quiz</h3>
              <p>
                Full beverage recipe steps, routine ordering, toppings, and modifiers across all bar stations.
              </p>
              <div className={styles.cardFooter}>
                <span>Comprehensive Test</span>
                <span className={styles.arrowIcon}>&rarr;</span>
              </div>
            </Link>
          </div>
        </section>
      </div>

      {isVersionOpen && <VersionModal onClose={() => setIsVersionOpen(false)} />}
    </div>
  );
};

export default Home;
