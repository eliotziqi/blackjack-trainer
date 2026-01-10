import React, { useMemo } from 'react';
import { primaryButtonBase, primaryButtonHover, primaryButtonDisabled, secondaryButtonBase, secondaryButtonHover, buttonTransition, buttonPressStyle } from './ui/buttonStyles';

interface ChipDenom {
  value: number;
  label: string;
  color: string;
}

interface BettingPanelProps {
  bankroll: number;
  currentBet: number;
  minSimBet: number;
  chipCounts: Record<number, number>;
  onAdjustChips: (denom: number, delta: number) => void;
  onSetPreset: (target: number, cap?: number) => void;
  onClearChips: () => void;
  onPlaceBet: () => void;
  onLeaveTable: () => void;
  canAfford: (addAmount: number) => boolean;
}

const BettingPanel: React.FC<BettingPanelProps> = ({
  bankroll,
  currentBet,
  minSimBet,
  chipCounts,
  onAdjustChips,
  onSetPreset,
  onClearChips,
  onPlaceBet,
  onLeaveTable,
  canAfford,
}) => {
  const CHIP_DENOMS = useMemo(
    () => [
      { value: 0.5, label: '$0.50', color: 'bg-gradient-to-br from-sky-200 to-sky-400 text-slate-900' },
      { value: 1, label: '$1', color: 'bg-gradient-to-br from-white to-gray-200 text-slate-900' },
      { value: 5, label: '$5', color: 'bg-gradient-to-br from-red-500 to-red-600 text-white' },
      { value: 25, label: '$25', color: 'bg-gradient-to-br from-green-500 to-green-600 text-white' },
      { value: 100, label: '$100', color: 'bg-gradient-to-br from-black to-slate-900 text-yellow-200' },
    ],
    []
  );

  const canPlaceBet = bankroll >= currentBet && currentBet >= minSimBet;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Chip Rail */}
      <div className="w-full max-w-2xl bg-gray-900/60 border border-gray-800 rounded-2xl px-4 py-3 shadow-inner">
        <div className="flex flex-wrap gap-3 justify-center">
          {CHIP_DENOMS.map((chip) => {
            const count = chipCounts[chip.value] || 0;
            const disabled = !canAfford(chip.value);
            return (
              <div key={chip.value} className="flex flex-col items-center gap-2">
                <button
                  onClick={() => onAdjustChips(chip.value, 1)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onAdjustChips(chip.value, -1);
                  }}
                  className={`relative w-16 h-16 rounded-full border-4 flex flex-col items-center justify-center font-bold shadow-md transition-all duration-200 ${chip.color} ${
                    disabled ? 'opacity-40 cursor-not-allowed border-gray-600' : 'cursor-pointer hover:scale-105 border-yellow-300'
                  }`}
                  disabled={disabled}
                  aria-label={`Add ${chip.label}`}
                  title={disabled ? 'Insufficient funds' : 'Click to add, right-click to remove'}
                >
                  <div className="text-xs opacity-80">{chip.label}</div>
                  {count > 0 && (
                    <span className="absolute -top-2 -right-2 min-w-[28px] px-2 py-0.5 text-xs rounded-full bg-gray-900 text-yellow-300 border border-gray-700 text-center">
                      {count}
                    </span>
                  )}
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={() => onAdjustChips(chip.value, -1)}
                    className="px-2 py-1 text-xs rounded bg-gray-800 text-gray-200 border border-gray-700 hover:border-yellow-300"
                    disabled={count === 0}
                  >
                    −
                  </button>
                  <button
                    onClick={() => onAdjustChips(chip.value, 1)}
                    className="px-2 py-1 text-xs rounded bg-gray-800 text-gray-200 border border-gray-700 hover:border-green-300"
                    disabled={disabled}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 justify-center text-xs text-gray-300">
          <button
            onClick={() => onSetPreset(minSimBet)}
            className="px-3 py-1 rounded border border-gray-700 bg-gray-800 hover:border-yellow-300"
          >
            Min (${minSimBet})
          </button>
          <button
            onClick={() => onSetPreset(Math.max(minSimBet, currentBet / 2))}
            className="px-3 py-1 rounded border border-gray-700 bg-gray-800 hover:border-yellow-300"
          >
            Half
          </button>
          <button
            onClick={() => onSetPreset(Math.max(minSimBet, currentBet * 2))}
            className="px-3 py-1 rounded border border-gray-700 bg-gray-800 hover:border-yellow-300"
          >
            Double
          </button>
          <button
            onClick={() => onSetPreset(Math.max(minSimBet, bankroll / 2))}
            className="px-3 py-1 rounded border border-gray-700 bg-gray-800 hover:border-yellow-300"
          >
            Half Bankroll
          </button>
          <button
            onClick={() => onSetPreset(bankroll)}
            className="px-3 py-1 rounded border border-gray-700 bg-gray-800 hover:border-yellow-300"
          >
            All-in
          </button>
          <button
            onClick={onClearChips}
            className="px-3 py-1 rounded border border-gray-700 bg-gray-800 hover:border-red-400 text-red-200"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Deal Button */}
      <button
        onClick={onPlaceBet}
        disabled={!canPlaceBet}
        className={`w-full max-w-md px-8 py-4 rounded-xl font-bold text-lg shadow-lg overflow-hidden ${
          !canPlaceBet
            ? primaryButtonDisabled
            : `${primaryButtonBase} ${primaryButtonHover} ${buttonTransition} ${buttonPressStyle}`
        }`}
      >
        <span className="block text-center">{!canPlaceBet ? `Min $${minSimBet}` : 'DEAL CARDS'} <span className="text-xs opacity-75">(F)</span></span>
      </button>

      {/* Leave Table */}
      <button
        onClick={onLeaveTable}
        className={`w-full max-w-md px-8 py-4 rounded-xl font-bold text-lg shadow-lg ${secondaryButtonBase} ${secondaryButtonHover} ${buttonTransition} ${buttonPressStyle}`}
      >
        <span className="block text-center">Leave Table <span className="text-xs opacity-75">(E)</span></span>
      </button>
    </div>
  );
};

export default BettingPanel;
