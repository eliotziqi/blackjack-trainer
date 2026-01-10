import { Card, Rank, CountingStats } from '../types';

const COUNTING_STATS_KEY = 'bj_counting_stats_v1';
const MAX_ENTRY_TIMES = 10; // Keep last 10 entry times for averaging

// Hi-Lo Card Values
const HI_LO_VALUES: Record<Rank, number> = {
  [Rank.Two]: 1,
  [Rank.Three]: 1,
  [Rank.Four]: 1,
  [Rank.Five]: 1,
  [Rank.Six]: 1,
  [Rank.Seven]: 0,
  [Rank.Eight]: 0,
  [Rank.Nine]: 0,
  [Rank.Ten]: -1,
  [Rank.Jack]: -1,
  [Rank.Queen]: -1,
  [Rank.King]: -1,
  [Rank.Ace]: -1,
};

/**
 * Get Hi-Lo value for a single card
 */
export const getCardValue = (card: Card): number => {
  return HI_LO_VALUES[card.rank];
};

/**
 * Calculate delta RC for a set of cards
 */
export const calculateDeltaRC = (cards: Card[]): number => {
  return cards.reduce((sum, card) => sum + getCardValue(card), 0);
};

/**
 * Calculate True Count (TC) from Running Count and Decks Remaining
 * TC is rounded to the nearest integer
 */
export const calculateTrueCount = (runningCount: number, decksRemaining: number): number => {
  if (decksRemaining <= 0) return 0;
  const tc = runningCount / decksRemaining;
  return Math.round(tc);
};

/**
 * Calculate decks remaining based on cards dealt
 * @param totalDecks - Total number of decks in shoe
 * @param cardsDealt - Number of cards dealt so far
 * @returns Decks remaining (rounded to 0.5)
 */
export const calculateDecksRemaining = (totalDecks: number, cardsDealt: number): number => {
  const cardsPerDeck = 52;
  const totalCards = totalDecks * cardsPerDeck;
  const cardsLeft = totalCards - cardsDealt;
  const decksLeft = cardsLeft / cardsPerDeck;
  
  // Round to nearest 0.5
  return Math.round(decksLeft * 2) / 2;
};

/**
 * Get card value breakdown for display
 */
export const getCardBreakdown = (cards: Card[]): { card: Card; value: number }[] => {
  return cards.map(card => ({
    card,
    value: getCardValue(card),
  }));
};

// --- Stats Management ---

const initialStats: CountingStats = {
  totalRounds: 0,
  correctRounds: 0,
  entryTimes: [],
  currentStreak: 0,
  bestStreak: 0,
};

export const loadCountingStats = (): CountingStats => {
  try {
    const data = localStorage.getItem(COUNTING_STATS_KEY);
    if (!data) return { ...initialStats };
    
    const parsed = JSON.parse(data);
    return {
      totalRounds: parsed.totalRounds || 0,
      correctRounds: parsed.correctRounds || 0,
      entryTimes: parsed.entryTimes || [],
      currentStreak: parsed.currentStreak || 0,
      bestStreak: parsed.bestStreak || 0,
    };
  } catch (e) {
    console.error('Failed to load counting stats:', e);
    return { ...initialStats };
  }
};

export const saveCountingStats = (stats: CountingStats): void => {
  try {
    localStorage.setItem(COUNTING_STATS_KEY, JSON.stringify(stats));
  } catch (e) {
    console.error('Failed to save counting stats:', e);
  }
};

export const recordCountingResult = (isCorrect: boolean, entryTime: number): CountingStats => {
  const stats = loadCountingStats();
  
  stats.totalRounds += 1;
  if (isCorrect) {
    stats.correctRounds += 1;
    stats.currentStreak += 1;
    if (stats.currentStreak > stats.bestStreak) {
      stats.bestStreak = stats.currentStreak;
    }
  } else {
    stats.currentStreak = 0;
  }
  
  // Update entry times (keep last N)
  stats.entryTimes.push(entryTime);
  if (stats.entryTimes.length > MAX_ENTRY_TIMES) {
    stats.entryTimes = stats.entryTimes.slice(-MAX_ENTRY_TIMES);
  }
  
  saveCountingStats(stats);
  return stats;
};

export const clearCountingStats = (): CountingStats => {
  localStorage.removeItem(COUNTING_STATS_KEY);
  return { ...initialStats };
};

/**
 * Get TC accuracy (0-1) from stats
 */
export const getTcAccuracy = (stats: CountingStats): number | null => {
  if (stats.totalRounds === 0) return null;
  return stats.correctRounds / stats.totalRounds;
};

/**
 * Get average entry time from last N rounds
 */
export const getAvgEntryTime = (stats: CountingStats): number | null => {
  if (stats.entryTimes.length === 0) return null;
  const sum = stats.entryTimes.reduce((a, b) => a + b, 0);
  return sum / stats.entryTimes.length;
};
