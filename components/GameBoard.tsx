import React from 'react';
import { Card as CardType, Hand, Rank, SimState, Action } from '../types';
import { EVResult } from '../services/evCalculator';
import Card from './Card';

interface GameBoardProps {
  gameState: number;
  playerHands: Hand[];
  activeHandIndex: number;
  dealerHand: Hand;
  hintAction: Action | null;
  hintEVs: EVResult[];
  hintsEnabled: boolean;
  canPlay: boolean;
  formatHandValue: (cards: CardType[]) => string;
}

const GameBoard: React.FC<GameBoardProps> = ({
  gameState,
  playerHands,
  activeHandIndex,
  dealerHand,
  hintAction,
  hintEVs,
  hintsEnabled,
  canPlay,
  formatHandValue,
}) => {
  return (
    <>
      {/* Dealer & Player 左右分布区域 */}
      {playerHands.length === 0 && gameState === SimState.Betting ? (
        <div className="w-full flex justify-center items-center py-8">
          <div className="text-gray-500 italic text-center">Place your bet to start</div>
        </div>
      ) : (
        <div className="w-full flex gap-12 md:gap-16 px-8 py-6 mb-4">
          {/* Dealer 区域 - 左侧 */}
          <div className="flex-1 text-center">
            {/* Title Row - 统一高度确保对齐 */}
            <h3 className="text-gray-400 text-sm tracking-widest uppercase mb-4 h-6 flex items-center justify-center">
              {gameState !== SimState.Betting && dealerHand.cards.length > 0 && (
                <span className="text-gray-400">Dealer ({formatHandValue(dealerHand.cards)})</span>
              )}
            </h3>
            {/* Card Stage - 顶部对齐 */}
            <div className="flex flex-col items-center">
              <div className="flex justify-center -space-x-10 min-h-[72px] mb-2">
                {gameState === SimState.Betting ? null : dealerHand.cards.length > 0 ? (
                  dealerHand.cards.map((c, i) => <Card key={i} card={c} />)
                ) : (
                  <div className="h-16 w-12 border-2 border-dashed border-gray-700 rounded bg-gray-900/50" />
                )}
              </div>
              {/* Bust Indicator */}
              {dealerHand.isBusted && (
                <span className="text-red-500 font-bold text-xs bg-red-950/50 px-2 py-1 rounded-full border border-red-800">
                  BUST
                </span>
              )}
            </div>
          </div>

          {/* Player 区域 - 右侧 */}
          <div className="flex-1 text-center">
            {/* Title Row - 统一高度确保对齐，数字在标题中 */}
            <h3 className="text-gray-400 text-sm tracking-widest uppercase mb-4 h-6 flex items-center justify-center">
              {playerHands.length === 0
                ? 'Waiting'
                : playerHands.length === 1
                ? `Your Hand (${formatHandValue(playerHands[0].cards)})`
                : 'Your Hands'}
            </h3>
            {/* Card Stage - 顶部对齐 */}
            <div className="flex justify-center gap-8 overflow-x-auto">
              {playerHands.map((h, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col items-center transition-all duration-300 ${
                    idx === activeHandIndex ? 'opacity-100' : 'opacity-60'
                  }`}
                >
                  {/* Hand Label - 只在多手牌时显示，包含点数 */}
                  {playerHands.length > 1 && (
                    <div className="text-xs font-semibold text-gray-400 mb-2 px-2 py-1 bg-gray-800 rounded-full border border-gray-700">
                      Hand {idx + 1} ({formatHandValue(h.cards)}) • <span className="text-yellow-400">${h.bet}</span>
                    </div>
                  )}

                  {/* Cards */}
                  <div className="flex -space-x-10 mb-2">
                    {h.cards.map((c, i) => (
                      <Card key={i} card={c} />
                    ))}
                  </div>

                  {/* Bust Indicator */}
                  {h.isBusted && (
                    <span className="text-red-500 font-bold text-xs bg-red-950/50 px-2 py-1 rounded-full border border-red-800">
                      BUST
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hint Overlay - Show all action EVs */}
      {hintsEnabled && hintEVs.length > 0 && canPlay && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <div className="bg-blue-600 text-white px-4 py-3 rounded-lg shadow-2xl border-2 border-blue-400">
            <div className="text-xs uppercase tracking-wider mb-2 font-bold">Expected Value</div>
            <div className="space-y-1">
              {hintEVs.map((ev, idx) => (
                <div
                  key={idx}
                  className={`text-sm font-mono ${
                    idx === 0
                      ? 'text-yellow-300 font-bold text-base'
                      : 'text-gray-200'
                  }`}
                >
                  {ev.action}: {ev.ev >= 0 ? '+' : ''}{ev.ev.toFixed(3)}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GameBoard;
