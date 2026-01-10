import { PlayerStats, StatEntry } from "../types";
import { loadCountingStats, getTcAccuracy, getAvgEntryTime, clearCountingStats } from './countingService';

const STATS_KEY = 'bj_trainer_stats';

const initialStats: PlayerStats = {
  hard: {},
  soft: {},
  pairs: {},
  heatmap: {},
  streak: 0,
  maxStreak: 0,
  streakMilestones: [],
  simMaxMultiplier: null,
  simMaxDrawdown: null,
  simCurrentWinStreak: 0,
  simMaxWinStreak: 0,
  simAchievements: [],
};

export const loadStats = (): PlayerStats => {
  try {
    const data = localStorage.getItem(STATS_KEY);
    if (!data) return getInitialStatsWithCounting();
    
    const parsed = JSON.parse(data);
    
    // Load counting stats separately
    const countingStats = loadCountingStats();
    const tcAccuracy = getTcAccuracy(countingStats);
    const avgEntryTime = getAvgEntryTime(countingStats);
    
    // 数据迁移：确保新字段存在
    return {
      hard: parsed.hard || {},
      soft: parsed.soft || {},
      pairs: parsed.pairs || {},
      heatmap: parsed.heatmap || {},
      streak: parsed.streak || 0,
      maxStreak: parsed.maxStreak || 0,
      streakMilestones: parsed.streakMilestones || [],
      simMaxMultiplier: parsed.simMaxMultiplier ?? null,
      simMaxDrawdown: parsed.simMaxDrawdown ?? null,
      simCurrentWinStreak: parsed.simCurrentWinStreak ?? 0,
      simMaxWinStreak: parsed.simMaxWinStreak ?? 0,
      simAchievements: parsed.simAchievements || [],
      // Counting stats
      countingTcAccuracy: tcAccuracy,
      countingAvgEntryTime: avgEntryTime,
      countingCurrentStreak: countingStats.currentStreak,
      countingBestStreak: countingStats.bestStreak,
    };
  } catch (e) {
    return getInitialStatsWithCounting();
  }
};

const getInitialStatsWithCounting = (): PlayerStats => {
  const countingStats = loadCountingStats();
  const tcAccuracy = getTcAccuracy(countingStats);
  const avgEntryTime = getAvgEntryTime(countingStats);
  
  return {
    ...initialStats,
    countingTcAccuracy: tcAccuracy,
    countingAvgEntryTime: avgEntryTime,
    countingCurrentStreak: countingStats.currentStreak,
    countingBestStreak: countingStats.bestStreak,
  };
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
  
  // Update maxStreak
  if (stats.streak > stats.maxStreak) {
    stats.maxStreak = stats.streak;
  }
  
  // Check for milestones (10, 25, 50, 100, 150, ...)
  const milestones = [10, 25, 50, 100, 150, 200, 250, 300];
  if (milestones.includes(stats.streak) && !stats.streakMilestones.includes(stats.streak)) {
    stats.streakMilestones.push(stats.streak);
    stats.streakMilestones.sort((a, b) => a - b);
  }

  // Update Heatmap
  const today = new Date().toISOString().split('T')[0];
  stats.heatmap[today] = (stats.heatmap[today] || 0) + 1;

  saveStats(stats);
  return stats; // return updated stats
};

export const clearStats = () => {
  localStorage.removeItem(STATS_KEY);
  clearCountingStats();
  return initialStats;
}

// 更新 Simulation 最大乘数（仅在 leave table 时调用）
export const updateSimMaxMultiplier = (multiplier: number) => {
  if (Number.isNaN(multiplier)) return loadStats();
  const stats = loadStats();
  if (stats.simMaxMultiplier === null || stats.simMaxMultiplier === undefined || multiplier > stats.simMaxMultiplier) {
    stats.simMaxMultiplier = multiplier;
    saveStats(stats);
  }
  return stats;
};

// 记录 Simulation 每局数据：连赢、最大回撤、成就
export const recordSimRoundStats = ({
  delta,
  drawdown,
  achievements = [],
}: {
  delta: number; // 本局净变化（新总额-本局开始总额）
  drawdown: number; // 本局结束时的回撤比例（0-1）
  achievements?: string[];
}) => {
  const stats = loadStats();

  // 连赢：胜利+1，其他归零
  const current = delta > 0 ? (stats.simCurrentWinStreak || 0) + 1 : 0;
  stats.simCurrentWinStreak = current;
  if (!stats.simMaxWinStreak || current > stats.simMaxWinStreak) {
    stats.simMaxWinStreak = current;
  }

  // 最大回撤：取最大值
  if (!Number.isNaN(drawdown)) {
    const clamped = Math.max(0, drawdown);
    if (stats.simMaxDrawdown === null || stats.simMaxDrawdown === undefined || clamped > stats.simMaxDrawdown) {
      stats.simMaxDrawdown = clamped;
    }
  }

  // 成就去重合并
  if (achievements.length) {
    const existing = new Set(stats.simAchievements || []);
    achievements.forEach(a => existing.add(a));
    stats.simAchievements = Array.from(existing);
  }

  saveStats(stats);
  return stats;
};

// 结束一段 Simulation 会话时重置当前连赢（不清空最大值）
export const resetSimCurrentWinStreak = () => {
  const stats = loadStats();
  stats.simCurrentWinStreak = 0;
  saveStats(stats);
  return stats;
};
