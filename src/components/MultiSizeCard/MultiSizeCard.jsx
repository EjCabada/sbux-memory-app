import React, { useState, useEffect } from "react";
import styles from "./MultiSizeCard.module.css";

const MultiSizeCard = ({ item }) => {
  const [flippedCards, setFlippedCards] = useState({});

  useEffect(() => {
    setFlippedCards({});
  }, [item]);

  const toggleCard = (index) => {
    setFlippedCards((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  if (!item) return null;

  const sizes = item.sizeList || [];
  const containsList = item.containsList || [];
  const noteText = item.comments || item.notes || "";

  return (
    <div className={styles.container}>
      <div className={styles.questionHeader}>
        <span className={styles.categoryBadge}>
          {item.station?.replace(/_/g, " ") || "Hot Bar"} &bull; {item.season || "Core"}
        </span>
        <h2 className={styles.drinkTitle}>{item.name}</h2>
        <p className={styles.questionSubtext}>{item.question}</p>
        <span className={styles.tapInstruction}>Tap each size card to reveal proportions</span>
      </div>

      {containsList.length > 0 && (
        <div className={styles.containsSection}>
          <div className={styles.containsHeader}>What It Contains</div>
          <div className={styles.containsBadgeGrid}>
            {containsList.map((entry, i) => (
              <div key={i} className={styles.containsPill}>
                <span className={styles.containsCategory}>{entry.category}:</span>
                <span className={styles.containsValue}>{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.cardsGrid}>
        {sizes.map((s, idx) => {
          const isFlipped = Boolean(flippedCards[idx]);
          return (
            <div
              key={s.sizeKey || idx}
              className={`${styles.flipCard} ${isFlipped ? styles.flipped : ""}`}
              onClick={() => toggleCard(idx)}
            >
              <div className={styles.flipCardInner}>
                <div className={styles.cardFront}>
                  <span className={styles.sizeLabel}>{s.size}</span>
                  <span className={styles.tapHint}>Tap to flip</span>
                </div>
                <div className={styles.cardBack}>
                  {s.metrics && s.metrics.length > 0 ? (
                    s.metrics.map((m) => (
                      <div key={m.key} className={styles.dataRow}>
                        <span className={styles.dataLabel}>{m.label}:</span>
                        <span className={styles.dataValue}>{m.value}</span>
                      </div>
                    ))
                  ) : (
                    <>
                      <div className={styles.dataRow}>
                        <span className={styles.dataLabel}>Shots:</span>
                        <span className={styles.dataValue}>{s.shots}</span>
                      </div>
                      <div className={styles.dataRow}>
                        <span className={styles.dataLabel}>Pumps:</span>
                        <span className={styles.dataValue}>{s.pumps}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {noteText && (
        <div className={styles.notesBox}>
          <strong>Barista Note:</strong> {noteText}
        </div>
      )}
    </div>
  );
};

export default MultiSizeCard;
