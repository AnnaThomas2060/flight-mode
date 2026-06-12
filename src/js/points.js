// Points economy (Section 6.3). All constants live here for easy balancing.

export const ECONOMY = {
  POINTS_PER_MINUTE: 1,         // base: 1 point per focus minute actually completed
  COMPLETION_BONUS_FACTOR: 0.2, // +20% of totalFocusMinutes if trip fully completes
  STREAK_BONUS_PER_DAY: 5,      // +5 * min(streak, cap), once per day's first trip
  STREAK_BONUS_CAP: 10
};

// Seat shop prices, in miles (cosmetic only — never gates the timer).
export const PRICES = {
  seat_business: 500,
  seat_first: 1500
};

/**
 * Score a trip.
 * - completedMinutes: focus minutes actually completed on *finished* legs
 *   (an abandoned partial leg earns nothing — Section 6.3).
 * - completedAll: true when the whole trip finished without early exit.
 */
export function scoreTrip({ completedMinutes, totalFocusMinutes, completedAll }) {
  const base = Math.round(completedMinutes * ECONOMY.POINTS_PER_MINUTE);
  const bonus = completedAll ? Math.round(ECONOMY.COMPLETION_BONUS_FACTOR * totalFocusMinutes) : 0;
  return { base, completionBonus: bonus, total: Math.max(0, base + bonus) };
}

function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Update streak state on a *completed* trip and return the streak bonus
 * (awarded only on the first completed trip of the day). Mutates `wallet`.
 */
export function applyStreak(wallet) {
  const today = dayKey();
  if (wallet.lastSessionDate === today) return 0; // already counted today

  const yesterday = dayKey(new Date(Date.now() - 86400000));
  wallet.currentStreak = wallet.lastSessionDate === yesterday ? wallet.currentStreak + 1 : 1;
  wallet.longestStreak = Math.max(wallet.longestStreak, wallet.currentStreak);
  wallet.lastSessionDate = today;
  return ECONOMY.STREAK_BONUS_PER_DAY * Math.min(wallet.currentStreak, ECONOMY.STREAK_BONUS_CAP);
}

/** Credit points; balance never goes negative (Section 6.3). */
export function credit(wallet, points) {
  const p = Math.max(0, Math.round(points));
  wallet.points += p;
  wallet.lifetimePoints += p;
}
