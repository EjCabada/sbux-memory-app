import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import SearchBar from "../components/SearchBar/SearchBar.jsx";
import VersionModal, { CURRENT_VERSION } from "../components/VersionModal/VersionModal.jsx";
import { useDrinkCatalog } from "../context/DrinkContext.jsx";
import { getWeakSpotIds, loadTraineeStats, clearWeakSpots } from "../utils/studyStats.js";
import styles from "./Home.module.css";

const STATION_TABS = [
  { key: "hot", label: "Hot Bar" },
  { key: "cold", label: "Cold Bar & Blended" },
  { key: "all", label: "Full Build" },
];

const Home = () => {
  const { drinks } = useDrinkCatalog();
  const [activeStation, setActiveStation] = useState("hot"); // "hot" | "cold" | "all"
  const [slideDir, setSlideDir] = useState("right");
  const activeStationIndex = Math.max(
    0,
    STATION_TABS.findIndex((t) => t.key === activeStation)
  );

  const handleStationChange = (nextKey) => {
    if (nextKey === activeStation) return;
    const nextIdx = STATION_TABS.findIndex((t) => t.key === nextKey);
    setSlideDir(nextIdx >= activeStationIndex ? "right" : "left");
    setActiveStation(nextKey);
  };
  const [searchTerm, setSearchTerm] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isVersionOpen, setIsVersionOpen] = useState(false);
  const [traineeStats, setTraineeStats] = useState(loadTraineeStats);
  const navigate = useNavigate();

  const missedIds = useMemo(() => new Set(getWeakSpotIds(traineeStats)), [traineeStats]);
  const missedHotCount = useMemo(
    () => drinks.filter((d) => d.isActive && d.station === "espresso_bar" && missedIds.has(d.id)).length,
    [drinks, missedIds]
  );
  const missedColdCount = useMemo(
    () => drinks.filter((d) => d.isActive && d.station !== "espresso_bar" && missedIds.has(d.id)).length,
    [drinks, missedIds]
  );

  const handleSearchChange = (term) => {
    setSearchTerm(term);
    if (term.length > 1) {
      const filtered = (drinks || [])
        .filter(
          (recipe) =>
            recipe.isActive && recipe.name.toLowerCase().includes(term.toLowerCase())
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

  const handleClearWeakSpots = () => {
    setTraineeStats(clearWeakSpots());
  };

  return (
    <div className={styles.homeContainer}>
      <div className={styles.topBar}>
        <button
          className={styles.versionBadge}
          onClick={() => setIsVersionOpen(true)}
        >
          <span className={styles.versionDot} />
          {CURRENT_VERSION}
        </button>
      </div>

      <header className={styles.hero}>
        <h1>Barista Training</h1>
        <p>Proportions, ingredients, and two-drink sequencing.</p>
      </header>

      <SearchBar
        searchTerm={searchTerm}
        onSearchChange={handleSearchChange}
        onSearchSubmit={navigateToSearch}
        suggestions={suggestions}
        onSuggestionClick={navigateToSearch}
      />

      {(missedHotCount > 0 || missedColdCount > 0) && (
        <div className={styles.weakSpotBanner}>
          <div className={styles.weakSpotText}>
            <strong>Missed Drinks to Review</strong>
            <span>Clear each drink by passing it twice in a row.</span>
          </div>
          <div className={styles.weakSpotActions}>
            {missedHotCount > 0 && (
              <Link to="/quiz/flashcards?scope=missed" className={styles.weakSpotBtn}>
                Hot Bar ({missedHotCount})
              </Link>
            )}
            {missedColdCount > 0 && (
              <Link to="/quiz/cold-flashcards?scope=missed" className={styles.weakSpotBtn}>
                Cold Bar ({missedColdCount})
              </Link>
            )}
            <button
              type="button"
              className={styles.weakSpotClearBtn}
              onClick={handleClearWeakSpots}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <div className={styles.stationSwitcher} role="tablist" aria-label="Bar Station">
        <span
          className={styles.stationGlider}
          style={{ transform: `translateX(${activeStationIndex * 100}%)` }}
          aria-hidden="true"
        />
        {STATION_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={activeStation === tab.key}
            className={`${styles.stationTab} ${activeStation === tab.key ? styles.stationTabActive : ""}`}
            onClick={() => handleStationChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeStation === "hot" && (
        <div
          key="hot"
          className={`${styles.cardsGrid} ${slideDir === "left" ? styles.slideFromLeft : styles.slideFromRight}`}
        >
          <Link to="/quiz/flashcards?scope=essentials" className={`${styles.actionCard} ${styles.cardPrimaryForest}`}>
            <div className={styles.cardBody}>
              <h3>Hot Bar Flashcards</h3>
              <p>Flip cup sizes for Essentials or the full espresso menu.</p>
            </div>
            <span className={styles.cardArrow}>&rarr;</span>
          </Link>

          <Link to="/quiz/beginner" className={`${styles.actionCard} ${styles.cardSage}`}>
            <div className={styles.cardBody}>
              <h3>Hot Bar Essentials Quiz</h3>
              <p>Shots, syrup pumps, and what goes in the cup.</p>
            </div>
            <span className={styles.cardArrow}>&rarr;</span>
          </Link>

          <Link to="/quiz/sequencing" className={`${styles.actionCard} ${styles.cardReserveGold}`}>
            <div className={styles.cardBody}>
              <h3>Hot Bar Sequencing</h3>
              <p>10-drink interleaved rush with steam wand &amp; sleeve rules.</p>
            </div>
            <span className={styles.cardArrow}>&rarr;</span>
          </Link>
        </div>
      )}

      {activeStation === "cold" && (
        <div
          key="cold"
          className={`${styles.cardsGrid} ${slideDir === "left" ? styles.slideFromLeft : styles.slideFromRight}`}
        >
          <Link to="/quiz/cold-flashcards?scope=essentials" className={`${styles.actionCard} ${styles.cardPrimaryForest}`}>
            <div className={styles.cardBody}>
              <h3>Cold Bar Flashcards</h3>
              <p>Flip multi-size cards for Cold Brews, Refreshers, and Blended.</p>
            </div>
            <span className={styles.cardArrow}>&rarr;</span>
          </Link>

          <Link to="/quiz/cold-beginner" className={`${styles.actionCard} ${styles.cardSage}`}>
            <div className={styles.cardBody}>
              <h3>Cold Bar Essentials Quiz</h3>
              <p>Frap Roast, Matcha scoops, Refresher ratios, and ingredients.</p>
            </div>
            <span className={styles.cardArrow}>&rarr;</span>
          </Link>

          <Link to="/quiz/cold-sequencing" className={`${styles.actionCard} ${styles.cardReserveGold}`}>
            <div className={styles.cardBody}>
              <h3>Cold Bar Sequencing</h3>
              <p>10-drink Cold Bar rush with Cold Foam first &amp; blender stop points.</p>
            </div>
            <span className={styles.cardArrow}>&rarr;</span>
          </Link>
        </div>
      )}

      {activeStation === "all" && (
        <div
          key="all"
          className={`${styles.cardsGrid} ${slideDir === "left" ? styles.slideFromLeft : styles.slideFromRight}`}
        >
          <Link to="/quiz/advanced" className={`${styles.actionCard} ${styles.cardPrimaryForest}`}>
            <div className={styles.cardBody}>
              <h3>Full Drink Build Flashcards</h3>
              <p>Complete recipe steps, toppings, and routine order across all bars.</p>
            </div>
            <span className={styles.cardArrow}>&rarr;</span>
          </Link>
        </div>
      )}

      {isVersionOpen && <VersionModal onClose={() => setIsVersionOpen(false)} />}
    </div>
  );
};

export default Home;
