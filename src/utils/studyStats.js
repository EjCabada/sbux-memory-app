/**
 * src/utils/studyStats.js
 * Persistent cross-session trainee progress & weak-spot tracker (stored in localStorage).
 * Completely separate from the drink recipe catalog so catalog updates never wipe trainee progress.
 */

const STATS_STORAGE_KEY = "sbux_trainee_stats_v1";

export function loadTraineeStats() {
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveTraineeStats(statsMap) {
  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(statsMap));
  } catch {
    // Ignore storage quota errors in private browsing
  }
}

/**
 * Record whether a trainee passed or missed a drink in a quiz or flashcard.
 * A missed drink stays in the "Weak Spots" list until passed cleanly 2 times in a row.
 */
export function recordDrinkStudyResult(drinkId, isCleanPass) {
  if (!drinkId) return loadTraineeStats();
  const stats = loadTraineeStats();
  const prev = stats[drinkId] || { misses: 0, cleanStreak: 0, needsReview: false };

  if (isCleanPass) {
    const nextStreak = (prev.cleanStreak || 0) + 1;
    stats[drinkId] = {
      ...prev,
      cleanStreak: nextStreak,
      needsReview: prev.needsReview ? nextStreak < 2 : false,
    };
  } else {
    stats[drinkId] = {
      misses: (prev.misses || 0) + 1,
      cleanStreak: 0,
      needsReview: true,
    };
  }

  saveTraineeStats(stats);
  return stats;
}

export function getWeakSpotIds(statsMap = null) {
  const map = statsMap || loadTraineeStats();
  return Object.entries(map)
    .filter(([, entry]) => Boolean(entry?.needsReview))
    .map(([id]) => id);
}

export function clearWeakSpots() {
  saveTraineeStats({});
  return {};
}
