import React, { useEffect, useState } from 'react';
import { GameRules, SimState } from '../types';
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
    simMinBet: 10,
    insuranceAllowed: true,
    evenMoneyAllowed: true,
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
      simMinBet: simLocked ? rules.simMinBet : DEFAULT_RULES.simMinBet,
      insuranceAllowed: DEFAULT_RULES.insuranceAllowed,
      evenMoneyAllowed: DEFAULT_RULES.evenMoneyAllowed,
    });
  };
  return (
    <div className="space-y-6 max-w-md mx-auto">
      <div className="mb-6 text-center pt-6">
        <h2 className="text-3xl font-bold text-green-400 mb-2">Rules Configuration</h2>
        <p className="text-gray-400 text-sm md:text-base"></p>
      </div>
      
      {/* Table Rules */}
      <div className="bg-gray-800 p-6 rounded-lg space-y-4 shadow-lg border border-gray-700">
        <h3 className="text-lg font-bold mb-4">Table Rules</h3>
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

      {/* Simulation Rules */}
      <div className={`bg-gray-800 rounded-lg shadow-lg border p-6 space-y-4 ${simLocked ? 'border-amber-500 bg-amber-900/10 opacity-80' : 'border-gray-700'}`}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold">Simulation Rules</h3>
          {simLocked && (
            <div className="flex items-center gap-2 text-xs text-amber-900 bg-amber-300 px-2 py-1 rounded font-semibold">
              <span role="img" aria-label="lock">🔒</span>
              <span>Simulation in progress, leave table to change</span>
            </div>
          )}
        </div>
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
            label="Simulation Min Bet"
            description="Minimum table bet used in Simulation presets"
            onInfoClick={() => showExplanation(
              'Simulation Min Bet',
              `Sets the minimum chip preset for Simulation betting. Choices: $5, $10, $15, $25, $100. The Min preset in Simulation will use this value.`
            )}
          >
            <select
              className="bg-gray-700 text-white rounded p-2"
              value={rules.simMinBet}
              onChange={(e) => setRules({...rules, simMinBet: parseInt(e.target.value, 10) as GameRules['simMinBet']})}
              disabled={simLocked}
            >
              {[5,10,15,25,100].map(v => (
                <option key={v} value={v}>${v}</option>
              ))}
            </select>
          </RuleItemWithInfo>

          <RuleItemWithInfo
            label="Insurance"
            description="Allow insurance when dealer shows Ace; costs up to half of main bet, pays 2:1 if dealer has blackjack"
            onInfoClick={() => showExplanation(
              'Insurance',
              `When dealer shows an Ace, you may place an insurance bet up to half your main bet. If dealer has blackjack, insurance pays 2:1; otherwise it loses immediately.`
            )}
          >
            <RuleToggle
              value={!!rules.insuranceAllowed}
              onChange={(v) => setRules({ ...rules, insuranceAllowed: v })}
              disabled={simLocked}
            />
          </RuleItemWithInfo>

          <RuleItemWithInfo
            label="Even Money"
            description="If you have a blackjack vs dealer Ace, you may lock a 1:1 payout immediately (effectively insurance on your blackjack)"
            onInfoClick={() => showExplanation(
              'Even Money',
              `When you have a natural blackjack and dealer shows an Ace, Even Money lets you take an immediate 1:1 payout instead of 3:2, avoiding a push if dealer also has blackjack.`
            )}
          >
            <RuleToggle
              value={!!rules.evenMoneyAllowed}
              onChange={(v) => setRules({ ...rules, evenMoneyAllowed: v })}
              disabled={simLocked || !rules.insuranceAllowed}
            />
          </RuleItemWithInfo>
      </div>

      <button
        className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-3 rounded-lg border border-gray-600 transition"
        onClick={handleResetToDefault}
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
