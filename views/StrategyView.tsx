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
    <div>
      <div className="mb-4 text-center text-gray-400 text-sm">Tap any cell to learn WHY.</div>
      <StrategyGrid rules={rules} onCellClick={handleCellClick} />
    </div>
  );
};

export default StrategyView;
