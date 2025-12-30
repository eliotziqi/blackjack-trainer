import React from 'react';
import StatCard from '../components/ui/StatCard';
import { clearStats, saveStats } from '../services/statsService';

interface StatsViewProps {
  stats: any;
  onReset: () => void;
}

const StatsView: React.FC<StatsViewProps> = ({ stats, onReset }) => {
  const calcAccuracy = (cat: 'hard'|'soft'|'pairs') => {
    let correct = 0;
    let total = 0;
    Object.values(stats[cat]).forEach((e: any) => {
      correct += e.correct;
      total += e.total;
    });
    return total === 0 ? 0 : Math.round((correct / total) * 100);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-4">Performance</h2>
      
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Hard" percent={calcAccuracy('hard')} />
        <StatCard label="Soft" percent={calcAccuracy('soft')} />
        <StatCard label="Pairs" percent={calcAccuracy('pairs')} />
      </div>

      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-lg font-bold mb-4">Current Streak</h3>
        <div className="text-4xl text-green-400 font-mono text-center">{stats.streak}</div>
      </div>

      <button onClick={onReset} className="w-full py-3 text-red-400 border border-red-900 rounded hover:bg-red-900/20">
        Reset Statistics
      </button>
    </div>
  );
};

export default StatsView;
