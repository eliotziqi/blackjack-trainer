import { useState, useEffect } from 'react';
import { Action, Hand, SimState } from '../types';
import { GameRules } from '../types';
import { calculateHandValue } from '../services/blackjackLogic';
import { calculateAllActionEVs, EVResult } from '../services/evCalculator';

export const useHintSystem = (
  gameState: number | string,
  hintsEnabled: boolean,
  playerHands: Hand[],
  activeHandIndex: number,
  dealerHand: Hand,
  rules: GameRules,
  getAllowedActions: () => Action[]
) => {
  const [hintAction, setHintAction] = useState<Action | null>(null);
  const [hintEVs, setHintEVs] = useState<EVResult[]>([]);
  const [hasUsedHints, setHasUsedHints] = useState(false);

  useEffect(() => {
    if (gameState === SimState.PlayerTurn && hintsEnabled) {
      // 3 = SimState.PlayerTurn
      const currentHand = playerHands[activeHandIndex];
      const dealerUp = dealerHand.cards[0];
      if (!currentHand || !dealerUp) {
        setHintAction(null);
        setHintEVs([]);
        return;
      }

      // Calculate all action EVs
      const playerTotal = calculateHandValue(currentHand.cards);
      const isSoft = currentHand.cards.some(c => c.rank === 'A') && playerTotal < 21;
      const isPair = currentHand.cards.length === 2 && currentHand.cards[0].rank === currentHand.cards[1].rank;
      const pairRank = isPair ? currentHand.cards[0].rank : null;
      const dealerUpVal = dealerUp.value === 10 ? 10 : (dealerUp.rank === 'A' ? 11 : dealerUp.value);

      try {
        let allEVs = calculateAllActionEVs(playerTotal, isSoft, isPair, pairRank, dealerUpVal, rules);
        const allowedActions = getAllowedActions();

        // Filter to only allowed actions
        const filteredEVs = allEVs.filter(ev => allowedActions.includes(ev.action));

        if (filteredEVs.length > 0) {
          // Sort by EV (highest first)
          filteredEVs.sort((a, b) => b.ev - a.ev);
          setHintEVs(filteredEVs);
          setHintAction(filteredEVs[0].action); // Best action
          setHasUsedHints(true);
          
          // Log EV values for debugging
          console.log(`[HINT EV] Player: ${playerTotal} (${isSoft ? 'soft' : 'hard'}) | Dealer: ${dealerUpVal} | EVs:`, filteredEVs.map(e => `${e.action}=${e.ev.toFixed(3)}`).join(', '));
        } else {
          setHintAction(null);
          setHintEVs([]);
        }
      } catch (error) {
        console.error('Error calculating EV:', error);
        setHintAction(null);
        setHintEVs([]);
      }
    } else {
      setHintAction(null);
      setHintEVs([]);
    }
  }, [gameState, activeHandIndex, hintsEnabled, playerHands, dealerHand, rules]);

  return {
    hintAction,
    hintEVs,
    hasUsedHints,
    setHintAction,
    setHasUsedHints,
  };
};
