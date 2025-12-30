import React, { useState, useEffect, useRef } from 'react';
import { GameRules, Action, Hand, Card as CardType, Rank, Suit, HandType, ViewMode } from '../types';
import { createHand, calculateHandValue, isSoftHand } from '../services/blackjackLogic';
import { getBasicStrategyAction, getStrategyExplanation } from '../services/strategyEngine';
import { calculateAllActionEVs, EVResult } from '../services/evCalculator';
import Card from '../components/Card';

interface ScenarioViewProps {
  globalRules: GameRules;
  navigate: (view: ViewMode) => void;
}

const ScenarioView: React.FC<ScenarioViewProps> = ({ globalRules, navigate }) => {
  // Snapshot rules on entry
  const rules = useRef(globalRules).current;
  
  // State is now instant, no loading needed
  const [explanation, setExplanation] = useState<string>('');
  const [scenario, setScenario] = useState<any>(null);
  const [optimalAction, setOptimalAction] = useState<Action>(Action.Hit);
  const [displayHand, setDisplayHand] = useState<Hand | null>(null);
  const [evResults, setEvResults] = useState<EVResult[]>([]);
  const [showEvTable, setShowEvTable] = useState(false);

  // 格式化点数显示（与PracticeView保持一致）
  const formatHandValue = (cards: CardType[]): string => {
    const value = calculateHandValue(cards);
    const hasAce = cards.some(c => c.rank === Rank.Ace);
    
    // 🎰 Blackjack 特殊显示
    if (cards.length === 2 && value === 21) {
      return 'Blackjack!';
    }
    
    if (!hasAce) return `${value}`;
    
    // 计算硬点数（所有 A 算 1）
    const hardValue = cards.reduce((sum, c) => sum + (c.rank === Rank.Ace ? 1 : c.value), 0);
    return `${value}/${hardValue}`;
  };

  useEffect(() => {
    const data = localStorage.getItem('temp_scenario');
    if (data) {
      const parsed = JSON.parse(data);
      setScenario(parsed);
      
      const dealerCard: CardType = { 
        rank: parsed.dVal === 11 ? Rank.Ace : (parsed.dVal === 10 ? Rank.King : parsed.dVal.toString() as Rank), 
        suit: Suit.Clubs, 
        value: parsed.dVal 
      };
      const playerHand = createHand();

      if (parsed.type === HandType.Pair) {
        const rStr = parsed.pVal.toString();
        const r = rStr as Rank; 
        const v = rStr === 'A' ? 11 : (['J','Q','K','10'].includes(rStr) ? 10 : parseInt(rStr));
        playerHand.cards = [
          {rank: r, value: v, suit: Suit.Spades}, 
          {rank: r, value: v, suit: Suit.Hearts}
        ];
      } else if (parsed.type === HandType.Soft) {
        const otherVal = parsed.pVal - 11;
        let otherRank = Rank.Two;
        if (otherVal === 10) otherRank = Rank.King;
        else otherRank = otherVal.toString() as Rank;
        
        playerHand.cards = [
          {rank: Rank.Ace, value: 11, suit: Suit.Spades},
          {rank: otherRank, value: otherVal, suit: Suit.Hearts}
        ];
      } else {
        const half = Math.floor(parsed.pVal / 2);
        const other = parsed.pVal - half;
        playerHand.cards = [
          {rank: Rank.Ten, value: 10, suit: Suit.Spades}, 
          {rank: (parsed.pVal - 10).toString() as Rank, value: parsed.pVal - 10, suit: Suit.Hearts}
        ];
        if (parsed.pVal < 12) {
          playerHand.cards = [
            {rank: half.toString() as Rank, value: half, suit: Suit.Spades},
            {rank: other.toString() as Rank, value: other, suit: Suit.Hearts}
          ];
        }
      }
      
      setDisplayHand(playerHand);
      
      const action = getBasicStrategyAction(playerHand, dealerCard, rules);
      setOptimalAction(action);
      
      const reason = getStrategyExplanation(playerHand, dealerCard, rules, action);
      setExplanation(reason);

      // Calculate EV
      const isPair = parsed.type === HandType.Pair;
      const total = calculateHandValue(playerHand.cards);
      const isSoft = isSoftHand(playerHand.cards);
      const evs = calculateAllActionEVs(
        total,
        isSoft,
        isPair,
        isPair ? playerHand.cards[0].rank : null,
        parsed.dVal,
        rules
      );
      setEvResults(evs);
    }
  }, []);

  if (!displayHand) return <div className="text-center mt-10">Loading Scenario...</div>;

  const topEv = evResults.length > 0 ? evResults[0] : null;

  return (
    <div className="flex flex-col items-center h-full space-y-6 mt-6 overflow-y-auto pb-20">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-green-400 mb-2">Scenario Analysis</h2>
      </div>
      
      <div className="flex gap-12 md:gap-16 w-full px-8 py-6">
        <div className="flex-1 text-center">
          <h3 className="text-gray-400 text-sm tracking-widest uppercase mb-4 h-6 flex items-center justify-center">Dealer Upcard ({scenario.dVal === 11 ? 'A' : scenario.dVal})</h3>
          <div className="flex justify-center">
            <Card card={{
              rank: (scenario.dVal === 11 ? 'A' : scenario.dVal).toString() as Rank, 
              suit: Suit.Diamonds, 
              value: scenario.dVal
            }} />
          </div>
        </div>
        <div className="flex-1 text-center">
          <h3 className="text-gray-400 text-sm tracking-widest uppercase mb-4 h-6 flex items-center justify-center">Your Hand ({formatHandValue(displayHand.cards)})</h3>
          <div className="flex justify-center -space-x-12">
            {displayHand.cards.map((c, i) => <Card key={i} card={c} />)}
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg max-w-2xl w-full border border-gray-700 shadow-lg">
        <div className="flex justify-between items-center mb-5 pb-4 border-b border-gray-700">
          <span className="text-gray-400 font-semibold">Optimal Action</span>
          <span className="text-2xl font-bold text-green-400 bg-green-400 bg-opacity-10 px-4 py-2 rounded">{optimalAction}</span>
        </div>
        <p className="text-gray-300 italic leading-relaxed mb-5">
          "{explanation}"
        </p>

        {topEv && (
          <div className="mt-4">
            <div 
              className="flex justify-between items-center text-sm font-mono cursor-pointer hover:text-green-300 transition"
              onClick={() => setShowEvTable(!showEvTable)}
            >
              <span>Expected Value (EV)</span>
              <span className="flex items-center">
                {topEv.ev > 0 ? '+' : ''}{topEv.ev.toFixed(4)}
                <svg className={`w-4 h-4 ml-1 transform transition ${showEvTable ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </div>
            
            {showEvTable && (
              <div className="mt-2 bg-gray-900 rounded p-2 text-xs font-mono space-y-1">
                <div className="grid grid-cols-2 text-gray-500 border-b border-gray-700 pb-1 mb-1">
                  <span>Action</span>
                  <span className="text-right">EV</span>
                </div>
                {evResults.map(res => (
                  <div key={res.action} className={`grid grid-cols-2 ${res.action === topEv.action ? 'text-green-400 font-bold' : 'text-gray-300'}`}>
                    <span>{res.action}</span>
                    <span className="text-right">{res.ev > 0 ? '+' : ''}{res.ev.toFixed(4)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      <button 
        className="mt-4 px-6 py-2 bg-gray-700 hover:bg-gray-600 text-blue-400 hover:text-blue-300 font-semibold transition-colors duration-150 rounded border border-gray-600 hover:border-gray-500"
        onClick={() => navigate(ViewMode.Strategy)}
      >
        ← Back to Strategy
      </button>
    </div>
  );
};

export default ScenarioView;
