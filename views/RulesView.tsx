import React, { useEffect, useState } from 'react';
import { GameRules, SimState, ViewMode } from '../types';
import RuleToggle from '../components/ui/RuleToggle';
import RuleItemWithInfo from '../components/ui/RuleItemWithInfo';
import RuleExplanation from '../components/ui/RuleExplanation';

interface RulesViewProps {
  rules: GameRules;
  setRules: (rules: GameRules) => void;
}

const RulesView: React.FC<RulesViewProps> = ({ rules, setRules }) => {
  // 默认规则常量
  const DEFAULT_RULES: GameRules = {
    deckCount: 6,
    dealerHitSoft17: true,
    doubleAfterSplit: true,
    surrender: 'late',
    blackjackPayout: 1.5,
  };

  const SIM_STATE_KEY = 'bj_sim_state_v1';
  const [simLocked, setSimLocked] = useState(false);

  const evaluateSimLock = () => {
    try {
      const raw = localStorage.getItem(SIM_STATE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw);
      const state = parsed?.gameState as SimState | undefined;
      return state !== undefined && state !== SimState.Setup;
    } catch {
      return false;
    }
  };

  useEffect(() => {
    setSimLocked(evaluateSimLock());
    const onStorage = (e: StorageEvent) => {
      if (e.key === SIM_STATE_KEY) setSimLocked(evaluateSimLock());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // 规则说明状态
  const [explanationState, setExplanationState] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
  }>({
    isOpen: false,
    title: '',
    description: '',
  });

  const showExplanation = (title: string, description: string) => {
    setExplanationState({ isOpen: true, title, description });
  };

  const closeExplanation = () => {
    setExplanationState({ ...explanationState, isOpen: false });
  };

  const handleResetToDefault = () => {
    setRules({
      ...DEFAULT_RULES,
      blackjackPayout: simLocked ? rules.blackjackPayout : DEFAULT_RULES.blackjackPayout,
    });
  };
  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="mb-6 text-center pt-6">
        <h2 className="text-3xl font-bold text-green-400 mb-2">Rules Configuration</h2>
        <p className="text-gray-400 text-sm md:text-base"></p>
      </div>
      
      <div className="bg-gray-800 p-6 rounded-lg space-y-4 shadow-lg border border-gray-700">
        <RuleItemWithInfo
          label="Dealer Hits Soft 17"
          description="When dealer shows A+6, whether dealer must hit (H17) or stand (S17)"
          onInfoClick={() => showExplanation(
            'Dealer Hits Soft 17',
            `When the dealer's hand totals exactly 17 with an Ace counted as 11 (called "Soft 17"), they must either hit or stand depending on this rule.

If ENABLED (H17): Dealer must hit on Soft 17
If DISABLED (S17): Dealer stands on Soft 17

This rule affects the dealer's final hand and your optimal strategy decisions.`
          )}
        >
          <RuleToggle
            value={rules.dealerHitSoft17}
            onChange={(v) => setRules({...rules, dealerHitSoft17: v})}
          />
        </RuleItemWithInfo>

        <RuleItemWithInfo
          label="Double After Split"
          description="Whether you can double down on a hand after splitting a pair"
          onInfoClick={() => showExplanation(
            'Double After Split',
            `After you split a pair, this rule determines if you can double down on the resulting hands.

If ENABLED (DAS): You can double down after splitting
If DISABLED: No doubling allowed after splitting

This rule is generally favorable to the player and affects strategic decisions after splits.`
          )}
        >
          <RuleToggle
            value={rules.doubleAfterSplit}
            onChange={(v) => setRules({...rules, doubleAfterSplit: v})}
          />
        </RuleItemWithInfo>

        <RuleItemWithInfo
          label="Surrender"
          description="Option to surrender and lose half your bet: None / Late (after dealer checks blackjack) / Early (before dealer checks)"
          onInfoClick={() => showExplanation(
            'Surrender',
            `Surrender allows you to give up your hand and lose only half your bet instead of the full bet.

NONE: Surrender is not allowed

LATE SURRENDER: Available after the dealer checks for blackjack. Most common rule in casinos.

EARLY SURRENDER: Available before the dealer checks. Very rare and more favorable to players.

Surrender is most useful when you have a weak hand against a strong dealer card.`
          )}
        >
          <select
            className="bg-gray-700 text-white rounded p-2"
            value={rules.surrender}
            onChange={(e) => setRules({...rules, surrender: e.target.value})}
          >
            <option value="none">None</option>
            <option value="late">Late</option>
            <option value="early">Early</option>
          </select>
        </RuleItemWithInfo>

        <RuleItemWithInfo
          label="Blackjack Payout"
          description="Payout when you hit a natural blackjack. 3:2 is player-favorable; 6:5 increases house edge."
          onInfoClick={() => showExplanation(
            'Blackjack Payout',
            `How a natural blackjack (Ace + 10-value) pays out:

3:2 (1.5x): Standard, more favorable to players. A $20 bet pays $30 profit.
6:5 (1.2x): Worse for players. A $20 bet pays $24 profit.

Choosing 6:5 increases the house edge. Stick with 3:2 when possible.`
          )}
        >
          {simLocked && (
            <div className="mt-2 inline-flex items-center gap-2 text-xs text-amber-300 bg-amber-900/20 border border-amber-700/60 rounded pl-2 pr-0.5 py-1">
              <span role="img" aria-label="lock">🔒</span>
              <span>Simulation in progress, leave table to change</span>
            </div>
          )}
          <select
            className="bg-gray-700 text-white rounded p-2"
            value={rules.blackjackPayout}
            onChange={(e) => setRules({...rules, blackjackPayout: parseFloat(e.target.value) as 1.5 | 1.2})}
            disabled={simLocked}
          >
            <option value={1.5}>3:2 (1.5x)</option>
            <option value={1.2}>6:5 (1.2x)</option>
          </select>

        </RuleItemWithInfo>

        <RuleItemWithInfo
          label="Decks"
          description="Number of card decks in the shoe. More decks reduce player advantage."
          onInfoClick={() => showExplanation(
            'Decks',
            `The number of standard decks shuffled together in the shoe. This significantly affects the game:

1 DECK: Best for players. Smallest house edge.

2 DECKS: Still quite favorable for players.

6 DECKS: Standard in most casinos. Moderate house edge.

8 DECKS: Common in casinos. Less favorable for players.

More decks mean the house has a greater advantage. The basic strategy may need slight adjustments based on deck count.`
          )}
        >
          <select
            className="bg-gray-700 text-white rounded p-2"
            value={rules.deckCount}
            onChange={(e) => setRules({...rules, deckCount: parseInt(e.target.value)})}
          >
            <option value={1}>1 Deck</option>
            <option value={2}>2 Decks</option>
            <option value={6}>6 Decks</option>
            <option value={8}>8 Decks</option>
          </select>
        </RuleItemWithInfo>
      </div>

      <button 
        onClick={handleResetToDefault} 
        className="w-full bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 rounded-lg shadow-lg transition duration-150"
      >
        Reset to Default
      </button>

      <RuleExplanation
        isOpen={explanationState.isOpen}
        title={explanationState.title}
        description={explanationState.description}
        onClose={closeExplanation}
      />
    </div>
  );
};

export default RulesView;
