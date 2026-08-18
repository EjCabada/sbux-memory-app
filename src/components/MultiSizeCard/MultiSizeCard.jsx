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

  return (
    <div className={styles.container}>
      <div className={styles.questionHeader}>
        <span className={styles.categoryBadge}>HOT BAR CORE DRINK</span>
        <h2 className={styles.drinkTitle}>{item.name}</h2>
        <p className={styles.questionSubtext}>{item.question}</p>
        <span className={styles.tapInstruction}>Tap each size card to reveal shots & pumps</span>
      </div>

      <div className={styles.cardsGrid}>
        {item.sizes.map((s, idx) => {
          const isFlipped = !!flippedCards[idx];
          return (
            <div
              key={idx}
              className={`${styles.flipCard} ${isFlipped ? styles.flipped : ""}`}
              onClick={() => toggleCard(idx)}
            >
              <div className={styles.flipCardInner}>
                <div className={styles.cardFront}>
                  <span className={styles.sizeLabel}>{s.size}</span>
                  <span className={styles.tapHint}>Tap to flip</span>
                </div>
                <div className={styles.cardBack}>
                  <div className={styles.dataRow}>
                    <span className={styles.dataLabel}>Shots:</span>
                    <span className={styles.dataValue}>{s.shots}</span>
                  </div>
                  <div className={styles.dataRow}>
                    <span className={styles.dataLabel}>Pumps:</span>
                    <span className={styles.dataValue}>{s.pumps}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {item.notes && <div className={styles.notesBox}>{item.notes}</div>}
    </div>
  );
};

export default MultiSizeCard;
