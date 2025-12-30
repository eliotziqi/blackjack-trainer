import React from 'react';
import { GameRules, HandType, ViewMode } from '../types';
import StrategyGrid from '../components/StrategyGrid';

interface StrategyViewProps {
  rules: GameRules;
  navigate: (view: ViewMode) => void;
}

const StrategyView: React.FC<StrategyViewProps> = ({ rules, navigate }) => {
  const handleCellClick = (type: HandType, pVal: number | string, dVal: number) => {
    localStorage.setItem('temp_scenario', JSON.stringify({ type, pVal, dVal }));
    navigate(ViewMode.Scenario);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-bold text-green-400 mb-2">Basic Strategy</h2>
        <p className="text-gray-400 text-sm md:text-base">
          Tap any cell to see the mathematical reasoning behind each action
        </p>
      </div>
      <div className="overflow-auto flex-1">
        <StrategyGrid rules={rules} onCellClick={handleCellClick} />
      </div>
      <div className="mt-4 text-xs text-gray-500 text-center">
        <div className="flex justify-center gap-6 flex-wrap">
          <span>🟢 H = Hit</span>
          <span>🔴 S = Stand</span>
          <span>🔵 D = Double</span>
          <span>🟡 P = Split</span>
          <span>⚪ R = Surrender</span>
        </div>
      </div>
    </div>
  );
};

export default StrategyView;
