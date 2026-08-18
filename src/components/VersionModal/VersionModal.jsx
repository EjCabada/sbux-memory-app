import React, { useState } from "react";
import styles from "./VersionModal.module.css";

const CURRENT_VERSION = "v2.2.0-hotbar";
const RELEASE_DATE = "August 2026";
const CHANGES = [
  "Hot Bar Sequencing Drill: Dual-slot sliding queue simulator for training real-time barista pipelining and cadence.",
  "Initiation & Stop-Point Locks: Enforces workflow timing, requiring Drink #1 to reach its stop point before initiating Drink #2.",
  "Exchange Like-for-Like Steam Wand Cadence: Manages steam wand resources and prevents conflicts across active orders.",
  "Context-Aware Packaging Rules: Enforces dynamic sleeve requirements for Venti Hot and hot water drinks (Americanos)."
];

const PREVIOUS_VERSION = "v2.1.0-hotbar";
const PREVIOUS_DATE = "August 2026";
const PREVIOUS_CHANGES = [
  "Timed & Perfection Hot Bar Quiz: 1 min, 2 min, 5 min, and 100% mastery drill modes.",
  "Per-Drink Random Size Testing: Test Tl, Gr, Vt Ht, and Vt Icd sequentially in random order.",
  "Immediate Feedback Keypad: Tap shot/pump buttons with instant green/red validation.",
  "Spaced Retest Queue: Failed drinks retested after 1 buffer drink, or immediately on repeat errors.",
  "Post-Quiz Diagnosis: Displays top 3 drinks to study based on error counts."
];

const OLD_VERSION = "v2.0.0-beta";
const OLD_DATE = "August 2026";
const OLD_CHANGES = [
  "Hot Bar Training Focus: Core drinks, cortados, and hot chocolate added.",
  "New Multi-Card Flashcards: Flip individual size cards (Tl, Gr, Vt Ht, Vt Icd).",
  "Mobile-First Responsive Layout: Vertical stacked cards on phones, grid on desktop.",
  "Spaced repetition tracking per drink."
];

const VersionModal = ({ onClose }) => {
  // Current version expanded by default, older versions collapsed by default on mobile
  const [expandedSections, setExpandedSections] = useState({
    current: true,
    previous: false,
    old: false,
  });

  const toggleSection = (key) => {
    setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          &times;
        </button>

        <div className={styles.scrollContainer}>
          {/* Current Version */}
          <button
            className={styles.versionSectionHeader}
            onClick={() => toggleSection("current")}
          >
            <div className={styles.versionTitleGroup}>
              <h3>
                What's New <span className={styles.versionTag}>{CURRENT_VERSION}</span>
              </h3>
              <small style={{ color: "#888" }}>Released: {RELEASE_DATE}</small>
            </div>
            <span className={styles.toggleIcon}>
              {expandedSections.current ? "▲ Collapse" : "▼ Expand"}
            </span>
          </button>
          {expandedSections.current && (
            <ul className={styles.featuresList}>
              {CHANGES.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          )}

          {/* Previous Version */}
          <button
            className={styles.versionSectionHeader}
            onClick={() => toggleSection("previous")}
          >
            <div className={styles.versionTitleGroup}>
              <h3>
                Previous <span className={styles.versionTagMuted}>{PREVIOUS_VERSION}</span>
              </h3>
              <small style={{ color: "#888" }}>Released: {PREVIOUS_DATE}</small>
            </div>
            <span className={styles.toggleIcon}>
              {expandedSections.previous ? "▲ Collapse" : "▼ Expand"}
            </span>
          </button>
          {expandedSections.previous && (
            <ul className={styles.featuresList}>
              {PREVIOUS_CHANGES.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          )}

          {/* Legacy Version */}
          <button
            className={styles.versionSectionHeader}
            onClick={() => toggleSection("old")}
          >
            <div className={styles.versionTitleGroup}>
              <h3>
                Legacy <span className={styles.versionTagMuted}>{OLD_VERSION}</span>
              </h3>
              <small style={{ color: "#888" }}>Released: {OLD_DATE}</small>
            </div>
            <span className={styles.toggleIcon}>
              {expandedSections.old ? "▲ Collapse" : "▼ Expand"}
            </span>
          </button>
          {expandedSections.old && (
            <ul className={styles.featuresList}>
              {OLD_CHANGES.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export { CURRENT_VERSION };
export default VersionModal;
