import React from 'react';
import { Action, GameRules, HandType, Rank, Card, Suit } from '../types';
import { getBasicStrategyAction } from '../services/strategyEngine';
import { createHand } from '../services/blackjackLogic';

interface StrategyGridProps {
  rules: GameRules;
  onCellClick: (handType: HandType, pVal: number | string, dVal: number) => void;
}

const StrategyGrid: React.FC<StrategyGridProps> = ({ rules, onCellClick }) => {
  const dealerUpCards = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]; // 11 represents Ace
  
  const getActionColor = (action: Action) => {
    switch (action) {
      case Action.Hit: return 'bg-green-600 text-white';
      case Action.Stand: return 'bg-red-600 text-white';
      case Action.Double: return 'bg-blue-500 text-white'; 
      case Action.Split: return 'bg-yellow-500 text-black';
      case Action.Surrender: return 'bg-white text-black border border-gray-400';
      default: return 'bg-gray-200';
    }
  };

  const getActionLabel = (action: Action) => {
    switch (action) {
      case Action.Hit: return 'H';
      case Action.Stand: return 'S';
      case Action.Double: return 'D';
      case Action.Split: return 'P';
      case Action.Surrender: return 'R';
      default: return '?';
    }
  };

  const renderGrid = (title: string, rows: { label: string, type: HandType, val: number, isPair?: boolean }[]) => (
    <div className="mb-8 overflow-x-auto rounded-lg border border-gray-700 bg-gray-800">
      <h3 className="text-xl font-bold p-4 pb-2 text-gray-200">{title}</h3>
      <div className="min-w-max p-4 pt-2">
        <div className="flex">
          <div className="w-12 sticky left-0 bg-gray-900 z-10"></div>
          {dealerUpCards.map(d => (
            <div key={d} className="w-10 h-8 text-center font-bold text-gray-400 pb-1 flex items-center justify-center">
              {d === 11 ? 'A' : d}
            </div>
          ))}
        </div>
        {rows.map((row) => (
          <div key={row.label} className="flex mb-1">
            <div className="w-12 font-bold text-gray-300 flex items-center justify-center bg-gray-700 sticky left-0 z-10 rounded-l border border-gray-600">
              {row.label}
            </div>
            {dealerUpCards.map((dVal) => {
              // Construct a temporary hand to check strategy
              const dummyHand = createHand();
              if (row.isPair) {
                 dummyHand.cards = [
                    { rank: row.label as Rank, suit: Suit.Spades, value: 0 },
                    { rank: row.label as Rank, suit: Suit.Hearts, value: 0 }
                 ];
                 const rVal = (row.label === 'A') ? 11 : (['J','Q','K','10'].includes(row.label) ? 10 : parseInt(row.label));
                 dummyHand.cards.forEach(c => c.value = rVal);
              } else if (row.type === HandType.Soft) {
                 const otherVal = row.val - 11;
                 dummyHand.cards = [
                    { rank: Rank.Ace, suit: Suit.Spades, value: 11 },
                    { rank: Rank.Two, suit: Suit.Hearts, value: otherVal }
                 ];
              } else {
                 const c1Val = Math.floor(row.val / 2);
                 const c2Val = row.val - c1Val;
                 dummyHand.cards = [
                     { rank: Rank.Two, suit: Suit.Spades, value: c1Val },
                     { rank: Rank.Three, suit: Suit.Hearts, value: c2Val }
                 ];
              }
              
              const dummyDealer = { rank: dVal === 11 ? Rank.Ace : Rank.Two, suit: Suit.Clubs, value: dVal };
              const action = getBasicStrategyAction(dummyHand, dummyDealer, rules);

              return (
                <div
                  key={`${row.label}-${dVal}`}
                  onClick={() => onCellClick(row.type, row.isPair ? row.label : row.val, dVal)}
                  className={`w-10 h-8 flex items-center justify-center font-bold cursor-pointer transition-all duration-150 hover:scale-110 hover:shadow-lg hover:z-20 border border-gray-700 text-xs md:text-sm ${getActionColor(action)} rounded`}
                  title={`${row.label} vs ${dVal === 11 ? 'A' : dVal}: ${action}`}
                >
                  {getActionLabel(action)}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );

  const hardRows = Array.from({ length: 13 }, (_, i) => 20 - i).filter(v => v >= 8).map(v => ({ label: v.toString(), type: HandType.Hard, val: v }));
  const softRows = Array.from({ length: 8 }, (_, i) => 20 - i).filter(v => v >= 13).map(v => ({ label: `A,${v-11}`, type: HandType.Soft, val: v }));
  const pairRows = [Rank.Ace, Rank.Ten, Rank.Nine, Rank.Eight, Rank.Seven, Rank.Six, Rank.Five, Rank.Four, Rank.Three, Rank.Two].map(r => ({ label: r, type: HandType.Pair, val: 0, isPair: true }));

  return (
    <div className="flex flex-col p-4 w-full max-w-4xl mx-auto">
      {renderGrid("Hard Totals", hardRows)}
      {renderGrid("Soft Totals", softRows)}
      {renderGrid("Pairs", pairRows)}
    </div>
  );
};

export default StrategyGrid;
