/* eslint-disable react-refresh/only-export-components */
import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import styles from "./VersionModal.module.css";

const CURRENT_VERSION = "v3.0.0";

const RELEASES = [
  {
    key: "v3_0_0",
    version: "v3.0.0",
    title: "Reserve Redesign, Active Recall & Auto-Sync",
    date: "November 2026",
    isLatest: true,
    changes: [
      "Reserve Mobile-First UI: New borderless layout with a segmented Hot Bar / Cold Bar / Full Build switcher and thumb-zone mobile navigation.",
      "Essentials Flashcards: Hot Bar and Cold Bar flashcards now open on the Essentials deck with instant toggles for All Drinks and Missed Drinks.",
      "What's in the Cup? Quiz Mode: Active-recall mode in Essentials Quizzes to test Roast/Base, Milk, Syrups, Toppings, and Cold Foam ingredients.",
      "Cross-Session Weak-Spot Tracker: Missed drinks automatically queue for review across sessions until passed twice in a row.",
      "Zero-Touch Auto-Sync: Baristas automatically receive updated drinks.json menus on reload without clearing browser storage or losing personal study stats.",
    ],
  },
  {
    key: "v2_5_0",
    version: "v2.5.0",
    title: "Cold Bar Suite & Dynamic Recipe Engine",
    date: "October – November 2026",
    isLatest: false,
    changes: [
      "Cold Bar Training Suite: Added Cold Bar Essentials Quiz, Cold Bar Multi-Size Flashcards, and Cold Bar Sequencing (Frappuccino, Matcha, Refresher, and Cold Brew).",
      "Cold Foam & Blender Cadence: Trains Cold Foam-first blender prep at the start of orders plus cold bar stop points.",
      "What It Contains & Custom Builds: Added structured ingredient tags (roast, milk, multiple syrups, toppings, drizzles, and Cold Foam recipes) plus custom per-drink build overrides.",
      "Dynamic Recipe & Family Engine: Replaced hardcoded step lists with mathematical shot/pump curves, extended cold bar metrics, and the October 2026 Hot Sleeve rule (all hot drinks except Short).",
    ],
  },
  {
    key: "v2_2_0",
    version: "v2.2.0-hotbar",
    title: "Hot Bar Sequencing Drill",
    date: "August 2026",
    isLatest: false,
    changes: [
      "Dual-slot sliding queue simulator for training two-drink espresso bar pipelining and stop-point cadence.",
      "Steam wand exchange lock management across active beverage orders.",
    ],
  },
  {
    key: "v2_1_0",
    version: "v2.1.0-hotbar",
    title: "Timed & Perfection Hot Bar Quizzes",
    date: "August 2026",
    isLatest: false,
    changes: [
      "1 min, 2 min, 5 min, and 100% Perfection drill modes with instant green/red feedback.",
      "Random cup size testing and post-quiz weak-spot breakdown.",
    ],
  },
  {
    key: "v2_0_0",
    version: "v2.0.0-beta",
    title: "Multi-Card Flashcards & Core Espresso Deck",
    date: "August 2026",
    isLatest: false,
    changes: [
      "Flip individual cup size cards (Short, Tall, Grande, Venti) on responsive mobile/desktop grids.",
    ],
  },
];

const VersionModal = ({ onClose }) => {
  const [expandedKey, setExpandedKey] = useState("v3_0_0");

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const toggleRelease = (key) => {
    setExpandedKey((prev) => (prev === key ? null : key));
  };

  return createPortal(
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div>
            <h2>What&apos;s New</h2>
            <p className={styles.headerSub}>Barista Training Changelog</p>
          </div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close release notes"
          >
            &times;
          </button>
        </div>

        <div className={styles.scrollContainer}>
          {RELEASES.map((release) => {
            const isOpen = expandedKey === release.key;
            return (
              <div
                key={release.key}
                className={`${styles.releaseCard} ${release.isLatest ? styles.releaseCardLatest : ""}`}
              >
                <button
                  type="button"
                  className={styles.releaseHeader}
                  onClick={() => toggleRelease(release.key)}
                >
                  <div className={styles.releaseMeta}>
                    <div className={styles.releaseTitleRow}>
                      <span className={release.isLatest ? styles.versionTag : styles.versionTagMuted}>
                        {release.version}
                      </span>
                      <span className={styles.releaseTitle}>{release.title}</span>
                    </div>
                    <span className={styles.releaseDate}>{release.date}</span>
                  </div>
                  <span className={styles.chevron}>{isOpen ? "−" : "+"}</span>
                </button>

                {isOpen && (
                  <ul className={styles.featuresList}>
                    {release.changes.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>,
    document.body
  );
};

export { CURRENT_VERSION };
export default VersionModal;
