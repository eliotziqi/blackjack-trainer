import { PlayerStats, StatEntry } from "../types";

const STATS_KEY = 'bj_trainer_stats';

const initialStats: PlayerStats = {
  hard: {},
  soft: {},
  pairs: {},
  heatmap: {},
  streak: 0,
};

export const loadStats = (): PlayerStats => {
  try {
    const data = localStorage.getItem(STATS_KEY);
    return data ? JSON.parse(data) : initialStats;
  } catch (e) {
    return initialStats;
  }
};

export const saveStats = (stats: PlayerStats) => {
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
};

export const recordPracticeResult = (
  key: string,
  category: 'hard' | 'soft' | 'pairs',
  isCorrect: boolean
) => {
  const stats = loadStats();
  
  // Update Matrix Stats
  const entry = stats[category][key] || { correct: 0, total: 0 };
  entry.total += 1;
  if (isCorrect) entry.correct += 1;
  stats[category][key] = entry;

  // Update Streak
  stats.streak = isCorrect ? stats.streak + 1 : 0;

  // Update Heatmap
  const today = new Date().toISOString().split('T')[0];
  stats.heatmap[today] = (stats.heatmap[today] || 0) + 1;

  saveStats(stats);
  return stats; // return updated stats
};

export const clearStats = () => {
    localStorage.removeItem(STATS_KEY);
    return initialStats;
}
