import React, { useState, useEffect, useMemo } from 'react';
import { GameRules, Action, Card as CardType, SimState, Rank } from '../types';
import { calculateHandValue } from '../services/blackjackLogic';
import { useSimulationGame } from '../hooks/useSimulationGame';
import { useHintSystem } from '../hooks/useHintSystem';
import { useSimulationPersistence } from '../hooks/useSimulationPersistence';
import ActionControls from '../components/ActionControls';
import BettingPanel from '../components/BettingPanel';
import GameBoard from '../components/GameBoard';
import SessionSummaryModal from '../components/SessionSummaryModal';
import { primaryButtonBase, primaryButtonHover, primaryButtonDisabled, buttonTransition, buttonPressStyle } from '../components/ui/buttonStyles';

interface SimulationViewProps {
  globalRules: GameRules;
}

const SimulationView: React.FC<SimulationViewProps> = ({ globalRules }) => {
  const ALL_IN_THRESHOLD = 100;
  const rules = globalRules;

  // Game state management
  const game = useSimulationGame(rules, ALL_IN_THRESHOLD);

  // Betting state
  const [chipCounts, setChipCounts] = useState<Record<number, number>>({ 0.5: 0, 1: 0, 5: 2, 25: 0, 100: 0 });
  const [hintsEnabled, setHintsEnabled] = useState(false);
  const [pressedAction, setPressedAction] = useState<Action | null>(null);
  const [roundsPlayed, setRoundsPlayed] = useState(0);

  // Restore state from localStorage on mount
  useEffect(() => {
    const SIM_STATE_KEY = 'bj_sim_state_v1';
    try {
      const saved = localStorage.getItem(SIM_STATE_KEY);
      if (saved) {
        const savedState = JSON.parse(saved);
        game.restoreState(savedState);
        setChipCounts(savedState.chipCounts ?? { 0.5: 0, 1: 0, 5: 2, 25: 0, 100: 0 });
        setHintsEnabled(savedState.hintsEnabled ?? false);
        setRoundsPlayed(savedState.roundsPlayed ?? 0);
      }
    } catch (e) {
      console.error('Failed to restore simulation state:', e);
    }
  }, []);

  // Hint system
  const { hintAction, hintEVs, hasUsedHints, setHasUsedHints } = useHintSystem(
    game.gameState,
    hintsEnabled,
    game.playerHands,
    game.activeHandIndex,
    game.dealerHand,
    rules,
    game.getAllowedActions
  );

  // Persistence
  const { leaveSummary, setLeaveSummary, handleLeaveTable, clearPersistence } = useSimulationPersistence(
    {
      bankroll: game.bankroll,
      initialBankroll: game.initialBankroll,
      peakBankroll: game.peakBankroll,
      chipCounts,
      deck: game.deck,
      playerHands: game.playerHands,
      activeHandIndex: game.activeHandIndex,
      dealerHand: game.dealerHand,
      gameState: game.gameState,
      hintsEnabled,
      hasUsedHints,
      roundStartBankroll: game.roundStartBankroll,
      roundResult: game.roundResult,
      roundsPlayed,
      insuranceBet: game.insuranceBet,
      insuranceOffered: game.insuranceOffered,
      evenMoneyTaken: game.evenMoneyTaken,
    },
    game.sessionAchievementsRef,
    game.pendingSimStatsRef
  );

  const minSimBet = rules.simMinBet || 10;
  const currentBet = useMemo(() => {
    const entries = Object.entries(chipCounts) as Array<[string, number]>;
    const sum = entries.reduce((acc, [denom, count]) => acc + parseFloat(denom) * count, 0);
    return Math.round(sum * 100) / 100;
  }, [chipCounts]);

  const mainHandBet = game.playerHands[0]?.bet ?? currentBet;
  const maxInsuranceCost = Math.round((mainHandBet / 2) * 100) / 100;
  const canBuyInsurance = game.bankroll >= maxInsuranceCost && maxInsuranceCost > 0;
  const playerHasBJ = useMemo(() => {
    const cards = game.playerHands[0]?.cards ?? [];
    return cards.length === 2 && calculateHandValue(cards) === 21;
  }, [game.playerHands]);

  const canAfford = (addAmount: number) => currentBet + addAmount <= game.bankroll;

  // Update peak bankroll when bankroll changes
  useEffect(() => {
    game.setPeakBankroll((prev) => {
      if (prev === null) return game.bankroll;
      return game.bankroll > prev ? game.bankroll : prev;
    });
  }, [game.bankroll]);

  // Format hand value display
  const formatHandValue = (cards: CardType[]): string => {
    const value = calculateHandValue(cards);
    const visibleCards = cards.filter((c) => !c.isHidden);
    const hasAce = visibleCards.some((c) => c.rank === Rank.Ace);

    if (visibleCards.length === 2 && value === 21) return 'Blackjack!';
    if (!hasAce) return `${value}`;

    const hardValue = visibleCards.reduce((sum, c) => sum + (c.rank === Rank.Ace ? 1 : c.value), 0);
    if (value === hardValue) return `${value}`;

    return `${value}/${hardValue}`;
  };

  // Chip management
  const adjustChips = (denom: number, delta: number) => {
    if (delta > 0 && !canAfford(denom * delta)) return;
    setChipCounts((prev) => {
      const next = { ...prev } as Record<number, number>;
      const current = next[denom] || 0;
      const updated = Math.max(0, current + delta);
      next[denom] = updated;
      return next;
    });
  };

  const setPreset = (target: number, cap?: number) => {
    const ceiling = cap ?? game.bankroll;
    const amount = Math.max(minSimBet, Math.min(target, ceiling));
    const next: Record<number, number> = { 0.5: 0, 1: 0, 5: 0, 25: 0, 100: 0 };
    let remaining = Math.round(amount * 100);
    const order = [10000, 2500, 500, 100, 50];
    order.forEach((cents) => {
      const denom = cents / 100;
      const cnt = Math.floor(remaining / cents);
      if (cnt > 0) {
        next[denom] = cnt;
        remaining -= cnt * cents;
      }
    });
    setChipCounts(next);
  };

  const clearChips = () => setChipCounts({ 0.5: 0, 1: 0, 5: 0, 25: 0, 100: 0 });

  const handleLeaveSummaryClose = () => {
    setLeaveSummary(null);
    game.resetGame();
    clearPersistence();
    setRoundsPlayed(0);
    setHintsEnabled(false); // Reset hints to default OFF
    setHasUsedHints(false); // Reset hasUsedHints flag
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const key = e.key.toUpperCase();

      if (leaveSummary) {
        if (key === 'F') {
          e.preventDefault();
          handleLeaveSummaryClose();
        }
        return;
      }

      if (game.gameState === SimState.Setup && key === 'F') {
        e.preventDefault();
        if (game.bankroll > 0 && game.bankroll >= minSimBet) {
          game.startGame();
        }
        return;
      }

      if (game.gameState === SimState.Betting) {
        if (key === 'F') {
          e.preventDefault();
          game.placeBet(currentBet, roundsPlayed + 1);
          return;
        }
        if (key === 'E') {
          e.preventDefault();
          handleLeaveTable(game.bankroll, game.initialBankroll, roundsPlayed, hasUsedHints);
          return;
        }
      }

      if (game.gameState !== SimState.PlayerTurn) return;
      const keyMap: Record<string, Action> = {
        H: Action.Hit,
        S: Action.Stand,
        D: Action.Double,
        P: Action.Split,
        R: Action.Surrender,
      };
      const action = keyMap[key];
      if (!action) return;

      const allowed = game.getAllowedActions();
      if (!allowed.includes(action)) return;
      if (game.isPlayerWaiting) return;

      e.preventDefault();
      setPressedAction(action);
      setTimeout(() => setPressedAction(null), 150);
      game.handleAction(action);
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [game.gameState, game.bankroll, leaveSummary, currentBet, roundsPlayed, hasUsedHints, game]);

  // Track rounds
  useEffect(() => {
    if (game.gameState === SimState.Betting && game.roundResult) {
      setRoundsPlayed((prev) => prev + 1);
    }
  }, [game.roundResult, game.gameState]);

  if (game.gameState === SimState.Setup) {
    return (
      <div className="relative max-w-md mx-auto space-y-6 pt-6">
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold text-green-400 mb-2">Simulation Setup</h2>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 space-y-6">
          <div className="space-y-3">
            <label className="text-gray-300 font-semibold text-sm">Starting Bankroll</label>
            <div className="hidden md:flex items-center gap-2">
              <button
                onClick={() => game.setBankroll(Math.max(10, game.bankroll - 10))}
                className="w-10 h-10 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition font-bold flex items-center justify-center flex-shrink-0"
              >
                −
              </button>
              <input
                type="number"
                value={game.bankroll}
                onChange={(e) => game.setBankroll(Math.max(10, parseInt(e.target.value) || 10))}
                className="flex-1 bg-gray-900 p-3 rounded-lg text-center text-2xl font-mono text-green-400 border border-gray-700 focus:border-green-400 focus:outline-none"
              />
              <button
                onClick={() => game.setBankroll(game.bankroll + 10)}
                className="w-10 h-10 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition font-bold flex items-center justify-center flex-shrink-0"
              >
                +
              </button>
            </div>
            <input
              type="number"
              value={game.bankroll}
              onChange={(e) => game.setBankroll(Math.max(10, parseInt(e.target.value) || 10))}
              className="md:hidden w-full bg-gray-900 p-3 rounded-lg text-center text-2xl font-mono text-green-400 border border-gray-700 focus:border-green-400 focus:outline-none"
            />

            <div className="flex gap-2 justify-center">
              <button
                onClick={() => game.setBankroll(Math.max(10, Math.floor(game.bankroll / 2)))}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm font-semibold transition"
              >
                Half
              </button>
              <button
                onClick={() => game.setBankroll(game.bankroll * 2)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm font-semibold transition"
              >
                Double
              </button>
              <button
                onClick={() => game.setBankroll(100)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm font-semibold transition"
              >
                100
              </button>
              <button
                onClick={() => game.setBankroll(500)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm font-semibold transition"
              >
                500
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={game.startGame}
          disabled={game.bankroll <= 0 || game.bankroll < minSimBet}
          className={`relative w-full py-4 rounded-lg shadow-lg overflow-hidden ${buttonTransition} ${buttonPressStyle} text-lg ${
            game.bankroll <= 0 || game.bankroll < minSimBet
              ? primaryButtonDisabled
              : `${primaryButtonBase} ${primaryButtonHover}`
          }`}
        >
          <span className="block text-center">Start Table <span className="text-xs opacity-75">(F)</span></span>
        </button>

        <SessionSummaryModal leaveSummary={leaveSummary} onClose={handleLeaveSummaryClose} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full relative">
      <div className="mb-6 text-center w-full pt-6">
        <h2 className="text-3xl font-bold text-green-400 mb-2">Simulation</h2>
      </div>

      <div className="flex justify-between items-center gap-3 mb-6 px-2">
        <div className="flex-1 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-700 px-4 py-3">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Bankroll</div>
          <div className="text-2xl font-bold text-green-400 font-mono">${game.bankroll}</div>
        </div>
        <div className="flex-1 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-700 px-4 py-3">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">
            {game.gameState === SimState.Betting ? 'Current Bet' : 'Total Bet'}
          </div>
          <div className="text-2xl font-bold text-yellow-400 font-mono">
            $
            {game.gameState === SimState.Betting
              ? currentBet.toFixed(2)
              : game.playerHands.reduce((sum, h) => sum + h.bet, 0)}
          </div>
        </div>
        <button
          onClick={() => setHintsEnabled(!hintsEnabled)}
          className={`px-5 py-3 rounded-lg font-semibold transition-all duration-200 border-2 ${
            hintsEnabled
              ? 'bg-yellow-500 text-black border-yellow-400 hover:bg-yellow-400'
              : 'bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-600'
          }`}
        >
          <div className="text-xs uppercase tracking-wider">Hints</div>
          <div className="text-sm font-bold">{hintsEnabled ? 'ON' : 'OFF'}</div>
        </button>
      </div>

      {hasUsedHints && (
        <div className="text-center text-sm text-red-400 bg-red-950/30 border border-red-900 rounded-lg px-4 py-2 mb-4 mx-auto max-w-md">
          ⚠️ Hints used - Statistics disabled for this session
        </div>
      )}

      <div className="text-gray-400 text-sm tracking-widest uppercase mb-1 h-6 flex items-center justify-center">
        Blackjack pays {rules.blackjackPayout === 1.5 ? '3:2' : '6:5'}
      </div>
      <div className="text-gray-400 text-sm tracking-widest uppercase mb-4 h-6 flex items-center justify-center">
        Simulation min bet: ${minSimBet}
      </div>

      {game.gameState === SimState.Insurance && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4 max-w-2xl mx-auto shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="text-lg font-semibold text-yellow-300">Dealer shows A — Insurance?</div>
            <div className="text-sm text-gray-400">Up to half bet</div>
          </div>
          <div className="text-sm text-gray-300 mb-4">
            Insurance costs ${maxInsuranceCost.toFixed(2)} (2:1 if dealer has blackjack). Even Money locks 1:1 on your blackjack.
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => game.handleInsuranceDecision('insure')}
              disabled={!canBuyInsurance}
              className={`px-4 py-2 rounded-lg font-semibold border transition ${
                canBuyInsurance
                  ? 'bg-yellow-500 text-black border-yellow-400 hover:bg-yellow-400'
                  : 'bg-gray-700 text-gray-500 border-gray-600 cursor-not-allowed'
              }`}
            >
              Buy Insurance (${maxInsuranceCost.toFixed(2)})
            </button>

            {rules.evenMoneyAllowed && playerHasBJ && (
              <button
                onClick={() => game.handleInsuranceDecision('even')}
                className="px-4 py-2 rounded-lg font-semibold border bg-green-500 text-black border-green-400 hover:bg-green-400 transition"
              >
                Take Even Money (1:1)
              </button>
            )}

            <button
              onClick={() => game.handleInsuranceDecision('decline')}
              className="px-4 py-2 rounded-lg font-semibold border bg-gray-800 text-gray-200 border-gray-600 hover:border-gray-500 transition"
            >
              No Insurance
            </button>
          </div>
        </div>
      )}

      <GameBoard
        gameState={game.gameState}
        playerHands={game.playerHands}
        activeHandIndex={game.activeHandIndex}
        dealerHand={game.dealerHand}
        hintAction={hintAction}
        hintEVs={hintEVs}
        hintsEnabled={hintsEnabled}
        canPlay={game.canPlay}
        formatHandValue={formatHandValue}
      />

      <div className="pb-6">
        {game.gameState === SimState.Betting && (
          <BettingPanel
            bankroll={game.bankroll}
            currentBet={currentBet}
            minSimBet={minSimBet}
            chipCounts={chipCounts}
            onAdjustChips={adjustChips}
            onSetPreset={setPreset}
            onClearChips={clearChips}
            onPlaceBet={() => game.placeBet(currentBet, roundsPlayed + 1)}
            onLeaveTable={() => handleLeaveTable(game.bankroll, game.initialBankroll, roundsPlayed, hasUsedHints)}
            canAfford={canAfford}
          />
        )}

        {game.gameState === SimState.PlayerTurn && 
         game.activeHand && 
         !game.activeHand.isCompleted && 
         !game.activeHand.isBusted && 
         !game.activeHand.hasSurrendered && (
          <div className="max-w-2xl mx-auto">
            <ActionControls
              onAction={game.handleAction}
              allowedActions={game.getAllowedActions()}
              pressedAction={pressedAction}
              disabled={game.isPlayerWaiting}
            />
          </div>
        )}

        {game.gameState === SimState.PlayerTurn && game.isPlayerWaiting && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-200">
            <div className="w-4 h-4 border-2 border-gray-500 border-t-white rounded-full animate-spin" />
            <span>Thinking...</span>
          </div>
        )}

        {game.gameState === SimState.Resolving && (
          <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm pointer-events-none px-4 text-center space-y-2">
            {game.roundResult && (
              <>
                <div
                  className={`text-4xl md:text-5xl font-black drop-shadow-lg ${
                    game.roundResult.delta > 0
                      ? 'text-green-400'
                      : game.roundResult.delta < 0
                      ? 'text-red-400'
                      : 'text-gray-200'
                  }`}
                >
                  {game.roundResult.delta > 0 && `You win $${game.roundResult.delta}`}
                  {game.roundResult.delta < 0 && `You lose $${Math.abs(game.roundResult.delta)}`}
                  {game.roundResult.delta === 0 && 'Even'}
                </div>
                <div className="text-xl md:text-2xl font-semibold text-white">Total ${game.roundResult.total}</div>
              </>
            )}
          </div>
        )}
      </div>

      <SessionSummaryModal leaveSummary={leaveSummary} onClose={handleLeaveSummaryClose} />
    </div>
  );
};

export default SimulationView;
