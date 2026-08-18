import React from "react";
import styles from "./VersionModal.module.css";

const CURRENT_VERSION = "v2.1.0-hotbar";
const RELEASE_DATE = "August 2026";
const CHANGES = [
  "Timed & Perfection Hot Bar Quiz: 1 min, 2 min, 5 min, and 100% mastery drill modes.",
  "Per-Drink Random Size Testing: Test Tl, Gr, Vt Ht, and Vt Icd sequentially in random order.",
  "Immediate Feedback Keypad: Tap shot/pump buttons with instant green/red validation.",
  "Spaced Retest Queue: Failed drinks retested after 1 buffer drink, or immediately on repeat errors.",
  "Post-Quiz Diagnosis: Displays top 3 drinks to study based on error counts."
];

const PREVIOUS_VERSION = "v2.0.0-beta";
const PREVIOUS_DATE = "August 2026";
const PREVIOUS_CHANGES = [
  "Hot Bar Training Focus: Core drinks, cortados, and hot chocolate added.",
  "New Multi-Card Flashcards: Flip individual size cards (Tl, Gr, Vt Ht, Vt Icd).",
  "Mobile-First Responsive Layout: Vertical stacked cards on phones, grid on desktop.",
  "Spaced repetition tracking per drink."
];

const VersionModal = ({ onClose }) => {
  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose}>
          &times;
        </button>

        {/* Current Version */}
        <div className={styles.modalHeader}>
          <h3>
            What's New <span className={styles.versionTag}>{CURRENT_VERSION}</span>
          </h3>
          <small style={{ color: "#888" }}>Released: {RELEASE_DATE}</small>
        </div>
        <ul className={styles.featuresList}>
          {CHANGES.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>

        {/* Previous Version */}
        <div className={styles.modalHeader} style={{ marginTop: "1.5rem" }}>
          <h3>
            Previous <span className={styles.versionTagMuted}>{PREVIOUS_VERSION}</span>
          </h3>
          <small style={{ color: "#888" }}>Released: {PREVIOUS_DATE}</small>
        </div>
        <ul className={styles.featuresList}>
          {PREVIOUS_CHANGES.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export { CURRENT_VERSION };
export default VersionModal;
