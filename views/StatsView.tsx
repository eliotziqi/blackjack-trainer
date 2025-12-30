import React from 'react';
import { clearStats } from '../services/statsService';

interface StatsViewProps {
  stats: any;
  onReset: () => void;
}

const StatsView: React.FC<StatsViewProps> = ({ stats, onReset }) => {
  // 返回 {correct, total, accuracy}，total为0表示无数据
  const calcAccuracy = (cat: 'hard'|'soft'|'pairs') => {
    let correct = 0;
    let total = 0;
    Object.values(stats[cat]).forEach((e: any) => {
      correct += e.correct;
      total += e.total;
    });
    const accuracy = total === 0 ? -1 : Math.round((correct / total) * 100);
    return { correct, total, accuracy };
  };

  const getColorByPercent = (percent: number): string => {
    if (percent === -1) return 'text-gray-400'; // 无数据
    if (percent === 0) return 'text-red-400'; // 0% 准确度（做错了）
    if (percent >= 90) return 'text-green-400';
    if (percent >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getColorByStreak = (streak: number): string => {
    if (streak === 0) return 'text-gray-400';
    if (streak >= 10) return 'text-green-400';
    return 'text-yellow-400';
  };

  const getColorByDrawdown = (drawdown?: number | null): string => {
    if (drawdown === null || drawdown === undefined) return 'text-gray-400';
    if (drawdown < 0.1) return 'text-green-400';
    if (drawdown < 0.25) return 'text-yellow-400';
    return 'text-red-400';
  };

  const formatAccuracy = (percent: number): string => {
    return percent === -1 ? 'N/A' : `${percent}%`;
  };

  const getColorByMultiplier = (val?: number | null): string => {
    if (val === null || val === undefined) return 'text-gray-400';
    if (val < 1) return 'text-red-400';
    if (val < 1.5) return 'text-yellow-400';
    return 'text-green-400';
  };

  const renderSimDrawdown = () => {
    const val = stats.simMaxDrawdown;
    if (val === null || val === undefined) return 'N/A';
    return `${(val * 100).toFixed(1)}%`;
  };

  const renderSimWinStreak = () => {
    const val = stats.simMaxWinStreak ?? 0;
    return val > 0 ? val : 'N/A';
  };

  const handleReset = () => {
    clearStats();
    onReset();
  };

  const renderSimMax = () => {
    const val = stats.simMaxMultiplier;
    if (val === null || val === undefined) return 'N/A';
    return `${val.toFixed(2)}x`;
  };

  const hardAccuracy = calcAccuracy('hard');
  const softAccuracy = calcAccuracy('soft');
  const pairsAccuracy = calcAccuracy('pairs');

  return (
    <div className="space-y-6">
      <div className="mb-6 text-center pt-6">
        <h2 className="text-3xl font-bold text-green-400 mb-2">Statistics</h2>
        <p className="text-gray-400 text-sm md:text-base"></p>
      </div>
      
      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-bold mb-4">Practice Performance</h3>
        <div className="grid grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-400 uppercase tracking-widest mb-2">Hard</div>
            <div className={`text-3xl font-mono font-bold ${getColorByPercent(hardAccuracy.accuracy)}`}>
              {formatAccuracy(hardAccuracy.accuracy)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400 uppercase tracking-widest mb-2">Soft</div>
            <div className={`text-3xl font-mono font-bold ${getColorByPercent(softAccuracy.accuracy)}`}>
              {formatAccuracy(softAccuracy.accuracy)}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400 uppercase tracking-widest mb-2">Pairs</div>
            <div className={`text-3xl font-mono font-bold ${getColorByPercent(pairsAccuracy.accuracy)}`}>
              {formatAccuracy(pairsAccuracy.accuracy)}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-bold mb-4">Practice Streaks</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="text-sm text-gray-400 uppercase tracking-widest mb-2">Current</div>
            <div className={`text-3xl font-mono font-bold ${getColorByStreak(stats.streak)}`}>
              {stats.streak}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400 uppercase tracking-widest mb-2">Personal Best</div>
            <div className={`text-3xl font-mono font-bold ${getColorByStreak(stats.maxStreak)}`}>
              {stats.maxStreak}
            </div>
          </div>
        </div>
        {stats.streakMilestones.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <div className="text-sm text-gray-400 uppercase tracking-widest mb-2">Milestones Reached</div>
            <div className="flex flex-wrap gap-2">
              {stats.streakMilestones.map(milestone => (
                <span key={milestone} className="bg-yellow-900/30 text-yellow-300 px-2 py-1 rounded text-sm font-mono">
                  {milestone}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-bold mb-4">Simulation</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <div className="text-sm text-gray-400 uppercase tracking-widest mb-2">Max Multiplier</div>
            <div className={`text-3xl font-mono font-bold ${getColorByMultiplier(stats.simMaxMultiplier)}`}>
              {renderSimMax()}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400 uppercase tracking-widest mb-2">Max Drawdown</div>
            <div className={`text-3xl font-mono font-bold ${getColorByDrawdown(stats.simMaxDrawdown)}`}>
              {renderSimDrawdown()}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-400 uppercase tracking-widest mb-2">Max Win Streak</div>
            <div className={`text-3xl font-mono font-bold ${getColorByStreak(stats.simMaxWinStreak ?? 0)}`}>
              {renderSimWinStreak()}
            </div>
          </div>
        </div>
        {stats.simAchievements && stats.simAchievements.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-700">
            <div className="text-sm text-gray-400 uppercase tracking-widest mb-2">Achievements</div>
            <div className="flex flex-wrap gap-2">
              {stats.simAchievements.map((ach: string) => (
                <span key={ach} className="bg-green-900/30 text-green-300 px-2 py-1 rounded text-sm font-mono">
                  {ach}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <button onClick={handleReset} className="w-full py-3 text-red-400 border border-red-900 rounded hover:bg-red-900/20">
        Reset Statistics
      </button>
    </div>
  );
};

export default StatsView;
