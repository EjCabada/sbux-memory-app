import React from "react";
import styles from "./VersionModal.module.css";

const CURRENT_VERSION = "v2.0.0-beta";
const RELEASE_DATE = "August 2026";
const CHANGES = [
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
      </div>
    </div>
  );
};

export { CURRENT_VERSION };
export default VersionModal;
