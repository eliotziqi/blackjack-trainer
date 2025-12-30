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
    <div className="flex flex-col h-full pt-6">
      <div className="mb-6 text-center">
        <h2 className="text-3xl font-bold text-green-400 mb-2">Basic Strategy</h2>
        <p className="text-gray-400 text-sm md:text-base">Tap any cell to see the mathematical reasoning behind each action.</p>
      </div>
      <div className="flex-1 flex flex-col px-2 md:px-0 w-full">
        <div className="mb-4 flex-1 overflow-x-auto overflow-y-auto">
          <div className="w-full flex justify-center">
            <StrategyGrid rules={rules} onCellClick={handleCellClick} />
          </div>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-700 text-xs md:text-sm text-gray-400">
          <div className="flex justify-center gap-4 md:gap-6 flex-wrap">
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-green-600 rounded"></span>H = Hit</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-red-600 rounded"></span>S = Stand</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-blue-500 rounded"></span>D = Double</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-yellow-500 rounded"></span>P = Split</div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 bg-white rounded border border-gray-400"></span>R = Surrender</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StrategyView;
