import React, { useState, useEffect, useRef } from 'react';
import { ViewMode, GameRules, HandType, Action, Hand, Card as CardType, Rank, Suit, SimState } from './types';
import { createDeck, shuffleDeck, createHand, calculateHandValue, getHandType, isSoftHand, playDealerTurn } from './services/blackjackLogic';
import { getBasicStrategyAction, getStrategyKey, getStrategyExplanation } from './services/strategyEngine';
import { loadStats, recordPracticeResult, clearStats, saveStats } from './services/statsService';
import { calculateAllActionEVs, EVResult } from './services/evCalculator';

import StrategyGrid from './components/StrategyGrid';
import Card from './components/Card';
import ActionControls from './components/ActionControls';

// --- Icons ---
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const ChartIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>;
const LightningIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>;
const ChipIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const BookOpenIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>;

// --- Constants ---
const DEFAULT_RULES: GameRules = {
  deckCount: 6,
  dealerHitSoft17: true,
  doubleAfterSplit: true,
  surrender: 'late',
  blackjackPayout: 1.5,
};

// --- App Component ---
const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.Rules);
  const [rules, setRules] = useState<GameRules>(DEFAULT_RULES);
  const [stats, setStats] = useState(loadStats());
  
  // Navigation Handler
  const navigate = (newView: ViewMode) => {
    setView(newView);
    window.location.hash = newView.toLowerCase();
  };

  useEffect(() => {
    setStats(loadStats());
  }, [view]);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4 sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-green-400 tracking-wider">BLACKJACK TRAINER</h1>
          <div className="flex space-x-2">
            <div className="text-xs text-gray-400 bg-gray-900 px-2 py-1 rounded border border-gray-700">
              {rules.dealerHitSoft17 ? 'H17' : 'S17'} • {rules.deckCount}D
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow p-4 pb-24 max-w-5xl mx-auto w-full">
        {view === ViewMode.Rules && (
          <RulesView rules={rules} setRules={setRules} onStart={() => navigate(ViewMode.Practice)} />
        )}
        {view === ViewMode.Strategy && (
          <StrategyView rules={rules} navigate={navigate} />
        )}
        {view === ViewMode.Practice && (
          <PracticeView globalRules={rules} stats={stats} />
        )}
        {view === ViewMode.Scenario && (
            <ScenarioView globalRules={rules} />
        )}
        {view === ViewMode.Simulation && (
          <SimulationView globalRules={rules} />
        )}
        {view === ViewMode.Stats && (
          <StatsView stats={stats} onReset={() => { clearStats(); setStats(loadStats()); }} />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 pb-safe">
        <div className="flex justify-around max-w-5xl mx-auto">
          <NavButton icon={<SettingsIcon/>} label="Rules" active={view === ViewMode.Rules} onClick={() => navigate(ViewMode.Rules)} />
          <NavButton icon={<ChartIcon/>} label="Strategy" active={view === ViewMode.Strategy} onClick={() => navigate(ViewMode.Strategy)} />
          <NavButton icon={<LightningIcon/>} label="Practice" active={view === ViewMode.Practice} onClick={() => navigate(ViewMode.Practice)} />
          <NavButton icon={<ChipIcon/>} label="Sim" active={view === ViewMode.Simulation} onClick={() => navigate(ViewMode.Simulation)} />
          <NavButton icon={<BookOpenIcon/>} label="Stats" active={view === ViewMode.Stats} onClick={() => navigate(ViewMode.Stats)} />
        </div>
      </nav>
    </div>
  );
};

const NavButton = ({ icon, label, active, onClick }: any) => (
  <button onClick={onClick} className={`flex flex-col items-center justify-center w-full py-3 ${active ? 'text-green-400' : 'text-gray-500 hover:text-gray-300'}`}>
    {icon}
    <span className="text-[10px] mt-1 font-medium">{label}</span>
  </button>
);

// --- Sub-Views ---

const RulesView = ({ rules, setRules, onStart }: any) => {
  return (
    <div className="space-y-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold text-white mb-4">Table Rules</h2>
      
      <div className="bg-gray-800 p-6 rounded-lg space-y-4 shadow-lg border border-gray-700">
        <RuleToggle 
          label="Dealer Hits Soft 17" 
          value={rules.dealerHitSoft17} 
          onChange={(v) => setRules({...rules, dealerHitSoft17: v})} 
        />
        <RuleToggle 
          label="Double After Split" 
          value={rules.doubleAfterSplit} 
          onChange={(v) => setRules({...rules, doubleAfterSplit: v})} 
        />
        <div className="flex justify-between items-center">
            <label className="text-gray-300">Surrender</label>
            <select 
                className="bg-gray-700 text-white rounded p-2"
                value={rules.surrender}
                onChange={(e) => setRules({...rules, surrender: e.target.value})}
            >
                <option value="none">None</option>
                <option value="late">Late</option>
                <option value="early">Early</option>
            </select>
        </div>
        <div className="flex justify-between items-center">
            <label className="text-gray-300">Decks</label>
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
        </div>
      </div>

      <button onClick={onStart} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-lg shadow-lg text-lg transition">
        Start Training
      </button>
    </div>
  );
};

const RuleToggle = ({ label, value, onChange }: any) => (
  <div className="flex justify-between items-center">
    <span className="text-gray-300">{label}</span>
    <button 
      onClick={() => onChange(!value)}
      className={`w-14 h-8 rounded-full p-1 transition-colors ${value ? 'bg-green-600' : 'bg-gray-600'}`}
    >
      <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${value ? 'translate-x-6' : 'translate-x-0'}`} />
    </button>
  </div>
);

const StrategyView = ({ rules, navigate }: any) => {
    const handleCellClick = (type: HandType, pVal: number | string, dVal: number) => {
        localStorage.setItem('temp_scenario', JSON.stringify({ type, pVal, dVal }));
        // Manually trigger a "hash change" like effect if needed, but navigate prop does it
        navigate(ViewMode.Scenario);
    };

    return (
        <div>
             <div className="mb-4 text-center text-gray-400 text-sm">Tap any cell to learn WHY.</div>
            <StrategyGrid rules={rules} onCellClick={handleCellClick} />
        </div>
    )
};

const ScenarioView = ({ globalRules }: { globalRules: GameRules }) => {
    // Snapshot rules on entry
    const rules = useRef(globalRules).current;
    
    // State is now instant, no loading needed
    const [explanation, setExplanation] = useState<string>('');
    const [scenario, setScenario] = useState<any>(null);
    const [optimalAction, setOptimalAction] = useState<Action>(Action.Hit);
    const [displayHand, setDisplayHand] = useState<Hand | null>(null);
    const [evResults, setEvResults] = useState<EVResult[]>([]);
    const [showEvTable, setShowEvTable] = useState(false);

    useEffect(() => {
        const data = localStorage.getItem('temp_scenario');
        if (data) {
            const parsed = JSON.parse(data);
            setScenario(parsed);
            
            const dealerCard: CardType = { rank: parsed.dVal === 11 ? Rank.Ace : (parsed.dVal === 10 ? Rank.King : parsed.dVal.toString() as Rank), suit: Suit.Clubs, value: parsed.dVal };
            const playerHand = createHand();

            if (parsed.type === HandType.Pair) {
                 const rStr = parsed.pVal.toString();
                 // rank mapping
                 const r = rStr as Rank; 
                 // value mapping
                 const v = rStr === 'A' ? 11 : (['J','Q','K','10'].includes(rStr) ? 10 : parseInt(rStr));
                 playerHand.cards = [
                     {rank: r, value: v, suit: Suit.Spades}, 
                     {rank: r, value: v, suit: Suit.Hearts}
                 ];
            } else if (parsed.type === HandType.Soft) {
                 const otherVal = parsed.pVal - 11;
                 // find rank for otherVal
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
                 // Simple approximation for hard totals
                 playerHand.cards = [
                     {rank: Rank.Ten, value: 10, suit: Suit.Spades}, 
                     {rank: (parsed.pVal - 10).toString() as Rank, value: parsed.pVal - 10, suit: Suit.Hearts}
                 ];
                 // Fix for small hard totals
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
            
            // Sync call
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
            <h2 className="text-2xl font-bold text-green-400">Scenario Analysis</h2>
            
            <div className="flex gap-8">
                 <div className="text-center">
                    <p className="mb-2 text-gray-400">Dealer</p>
                    <Card card={{rank: (scenario.dVal === 11 ? 'A' : scenario.dVal).toString() as Rank, suit: Suit.Diamonds, value: scenario.dVal}} />
                 </div>
                 <div className="text-center">
                    <p className="mb-2 text-gray-400">You</p>
                    <div className="flex -space-x-12">
                         {displayHand.cards.map((c, i) => <Card key={i} card={c} />)}
                    </div>
                 </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg max-w-lg w-full border border-gray-700">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-400">Optimal Action</span>
                    <span className="text-xl font-bold text-green-400">{optimalAction}</span>
                </div>
                <hr className="border-gray-700 mb-4"/>
                <p className="text-gray-300 italic leading-relaxed mb-4">
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
            
             <button className="text-blue-400 underline" onClick={() => window.history.back()}>Back</button>
        </div>
    )
}

const PracticeView = ({ globalRules, stats }: { globalRules: GameRules, stats: any }) => {
  // Snapshot rules
  const rules = useRef(globalRules).current;

  const [deck, setDeck] = useState<CardType[]>([]);
  const [playerHand, setPlayerHand] = useState<Hand>(createHand());
  const [dealerUpCard, setDealerUpCard] = useState<CardType>({ rank: Rank.Two, suit: Suit.Clubs, value: 2 });
  const [feedback, setFeedback] = useState<{ correct: boolean, message: string, optimal: Action } | null>(null);

  const dealNewHand = () => {
    let d = deck;
    if (d.length < 15) {
        d = shuffleDeck(createDeck(rules.deckCount));
    }
    
    const p1 = d.pop()!;
    const p2 = d.pop()!;
    const dealer = d.pop()!;
    
    setDeck(d);
    setDealerUpCard(dealer);
    setPlayerHand({
        ...createHand(),
        cards: [p1, p2],
    });
    setFeedback(null);
  };

  useEffect(() => {
    dealNewHand();
  }, []);

  const handleAction = (action: Action) => {
    const optimal = getBasicStrategyAction(playerHand, dealerUpCard, rules);
    const isCorrect = action === optimal;
    
    setFeedback({
        correct: isCorrect,
        message: isCorrect ? 'Correct!' : 'Incorrect',
        optimal: optimal
    });

    const key = getStrategyKey(playerHand, dealerUpCard);
    const category = getHandType(playerHand.cards) === 'PAIR' ? 'pairs' : (getHandType(playerHand.cards) === 'SOFT' ? 'soft' : 'hard');
    recordPracticeResult(key, category.toLowerCase() as any, isCorrect);

    setTimeout(() => {
        dealNewHand();
    }, 1500);
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[60vh]">
      <div className="w-full text-center mt-4">
        <h3 className="text-gray-400 text-sm tracking-widest uppercase">Dealer Upcard</h3>
        <div className="flex justify-center mt-2">
           <Card card={dealerUpCard} />
        </div>
      </div>

      {feedback && (
          <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm pointer-events-none`}>
              <div className={`text-6xl font-black ${feedback.correct ? 'text-green-500' : 'text-red-500'} drop-shadow-lg transform scale-110`}>
                  {feedback.correct ? 'PERFECT' : 'MISS'}
                  {!feedback.correct && <div className="text-2xl text-white mt-2 font-normal text-center">Should {feedback.optimal}</div>}
              </div>
          </div>
      )}

      <div className="w-full text-center mb-8">
        <h3 className="text-gray-400 text-sm tracking-widest uppercase mb-2">Your Hand ({calculateHandValue(playerHand.cards)})</h3>
        <div className="flex justify-center -space-x-12">
            {playerHand.cards.map((c, i) => <Card key={i} card={c} />)}
        </div>
      </div>

      <div className="w-full pb-8">
         <ActionControls 
            onAction={handleAction} 
            allowedActions={[Action.Hit, Action.Stand, Action.Double, Action.Split, Action.Surrender]}
            disabled={!!feedback}
         />
      </div>
    </div>
  );
};

const SimulationView = ({ globalRules }: { globalRules: GameRules }) => {
    // Snapshot Rules
    const rules = useRef(globalRules).current;
    
    // Sim State
    const [gameState, setGameState] = useState<SimState>(SimState.Setup);
    const [bankroll, setBankroll] = useState(1000);
    const [currentBet, setCurrentBet] = useState(25);
    const [deck, setDeck] = useState<CardType[]>([]);
    
    // Hands
    const [playerHands, setPlayerHands] = useState<Hand[]>([]);
    const [activeHandIndex, setActiveHandIndex] = useState(0);
    const [dealerHand, setDealerHand] = useState<Hand>(createHand());
    
    // Hints
    const [hintsEnabled, setHintsEnabled] = useState(false);
    const [hasUsedHints, setHasUsedHints] = useState(false);
    const [hintAction, setHintAction] = useState<Action | null>(null);

    // Initial Setup
    const startGame = () => {
        setGameState(SimState.Betting);
        setDeck(shuffleDeck(createDeck(rules.deckCount)));
    };

    const placeBet = () => {
        if (bankroll < currentBet) return;
        setBankroll(prev => prev - currentBet);
        setGameState(SimState.Dealing);
        
        // Deal logic
        let d = [...deck];
        if (d.length < 15) d = shuffleDeck(createDeck(rules.deckCount));
        
        const p1 = d.pop()!;
        const d1 = d.pop()!; // Hidden usually, but logic handles hiding
        const p2 = d.pop()!;
        const d2 = d.pop()!;
        
        // Setup hands
        const pHand = createHand(currentBet);
        pHand.cards = [p1, p2];
        const dHand = createHand();
        dHand.cards = [d1, d2];
        dHand.cards[1].isHidden = true; // 2nd card hidden
        
        setDeck(d);
        setPlayerHands([pHand]);
        setActiveHandIndex(0);
        setDealerHand(dHand);
        setHasUsedHints(false);
        setHintAction(null);

        // Check for instant blackjack
        const pBJ = calculateHandValue([p1, p2]) === 21;
        const dBJ = calculateHandValue([d1, d2]) === 21; // Check underlying value

        if (pBJ || dBJ) {
             // Immediate resolution
             setDealerHand(prev => {
                 const h = {...prev};
                 h.cards[1].isHidden = false;
                 return h;
             });
             setTimeout(() => resolveRound(pBJ, dBJ), 1000);
        } else {
             setGameState(SimState.PlayerTurn);
        }
    };

    const handleAction = (action: Action) => {
        const currentHand = playerHands[activeHandIndex];
        let d = [...deck];
        let nextHand = false;

        if (action === Action.Hit) {
            const card = d.pop()!;
            const newHand = {...currentHand, cards: [...currentHand.cards, card]};
            if (calculateHandValue(newHand.cards) > 21) {
                newHand.isBusted = true;
                newHand.isCompleted = true;
                nextHand = true;
            }
            updateHand(activeHandIndex, newHand);
        } else if (action === Action.Stand) {
            const newHand = {...currentHand, isCompleted: true};
            updateHand(activeHandIndex, newHand);
            nextHand = true;
        } else if (action === Action.Double) {
            if (bankroll < currentHand.bet) return; // Should disable btn
            setBankroll(b => b - currentHand.bet);
            const card = d.pop()!;
            const newHand = {...currentHand, cards: [...currentHand.cards, card], bet: currentHand.bet * 2, isCompleted: true, hasDoubled: true};
            if (calculateHandValue(newHand.cards) > 21) newHand.isBusted = true;
            updateHand(activeHandIndex, newHand);
            nextHand = true;
        } else if (action === Action.Surrender) {
            const newHand = {...currentHand, isCompleted: true, hasSurrendered: true};
            updateHand(activeHandIndex, newHand);
            nextHand = true;
        } else if (action === Action.Split) {
            // Check Pair
            // Check Money
            if (bankroll < currentHand.bet) return;
            setBankroll(b => b - currentHand.bet);
            
            const card1 = currentHand.cards[0];
            const card2 = currentHand.cards[1];
            
            // Create two new hands
            const hand1 = createHand(currentHand.bet);
            hand1.cards = [card1, d.pop()!];
            
            const hand2 = createHand(currentHand.bet);
            hand2.cards = [card2, d.pop()!];
            
            // Replace current hand with these two
            const newHands = [...playerHands];
            newHands.splice(activeHandIndex, 1, hand1, hand2);
            setPlayerHands(newHands);
            
            // Stay on same index (hand1) to play it
            // Logic automatically continues turn on index
            setDeck(d);
            return; // Return early, do not set nextHand, continue playing index
        }

        setDeck(d);

        if (nextHand) {
            if (activeHandIndex < playerHands.length - 1) {
                setActiveHandIndex(i => i + 1);
            } else {
                setGameState(SimState.DealerTurn);
                playDealer();
            }
        }
    };

    const updateHand = (index: number, hand: Hand) => {
        const newHands = [...playerHands];
        newHands[index] = hand;
        setPlayerHands(newHands);
    };

    const playDealer = () => {
        // Reveal
        setTimeout(() => {
            const { updatedDeck, finalHand } = playDealerTurn(deck, dealerHand, rules);
            setDeck(updatedDeck);
            setDealerHand(finalHand);
            setTimeout(() => resolveRound(), 1000);
        }, 500);
    };

    const resolveRound = (pBJ = false, dBJ = false) => {
        setGameState(SimState.Resolving);
        
        let payout = 0;
        const dVal = calculateHandValue(dealerHand.cards);
        const dHasBJ = calculateHandValue(dealerHand.cards) === 21 && dealerHand.cards.length === 2; // Rough check, assume logic handles real BJ flag if we added it

        playerHands.forEach(h => {
             const pVal = calculateHandValue(h.cards);
             const pHasBJ = pVal === 21 && h.cards.length === 2 && !h.canSplit; // Simplified BJ check
             
             if (h.hasSurrendered) {
                 payout += h.bet * 0.5;
                 return;
             }
             if (h.isBusted) return; // Lose
             
             if (pHasBJ && !dHasBJ) {
                 payout += h.bet + (h.bet * rules.blackjackPayout);
             } else if (dVal > 21) {
                 payout += h.bet * 2;
             } else if (pVal > dVal) {
                 payout += h.bet * 2;
             } else if (pVal === dVal) {
                 payout += h.bet; // Push
             }
        });
        
        setBankroll(b => b + payout);
        
        setTimeout(() => {
            setPlayerHands([]);
            setDealerHand(createHand());
            setGameState(SimState.Betting);
        }, 2500);
    };

    // Hint Logic
    useEffect(() => {
        if (gameState === SimState.PlayerTurn && hintsEnabled) {
            const currentHand = playerHands[activeHandIndex];
            const action = getBasicStrategyAction(currentHand, dealerHand.cards[0], rules);
            setHintAction(action);
            setHasUsedHints(true);
        } else {
            setHintAction(null);
        }
    }, [gameState, activeHandIndex, hintsEnabled]);

    if (gameState === SimState.Setup) {
        return (
            <div className="flex flex-col items-center justify-center space-y-6 pt-10">
                <h2 className="text-2xl font-bold">Simulation Setup</h2>
                <div className="flex flex-col space-y-2">
                    <label className="text-gray-400">Starting Bankroll</label>
                    <input type="number" value={bankroll} onChange={e => setBankroll(parseInt(e.target.value))} className="bg-gray-800 p-2 rounded text-center text-xl font-mono" />
                </div>
                <button onClick={startGame} className="bg-green-600 px-8 py-3 rounded font-bold">Start Table</button>
            </div>
        );
    }

    const activeHand = playerHands[activeHandIndex];
    const canPlay = gameState === SimState.PlayerTurn;

    return (
        <div className="flex flex-col h-full relative">
            {/* Top Info Bar */}
            <div className="flex justify-between items-center bg-gray-800 p-2 rounded mb-4 text-xs font-mono">
                 <div>Bank: ${bankroll}</div>
                 <div>Bet: ${currentBet}</div>
                 <button onClick={() => setHintsEnabled(!hintsEnabled)} className={`px-2 py-1 rounded ${hintsEnabled ? 'bg-yellow-600 text-black' : 'bg-gray-700'}`}>
                     {hintsEnabled ? 'Hints ON' : 'Hints OFF'}
                 </button>
            </div>

            {/* Warning if Hints Used */}
            {hasUsedHints && <div className="text-center text-xs text-red-400 mb-2">Hints used: Stats disabled</div>}

            {/* Dealer */}
            <div className="flex flex-col items-center mb-6">
                <div className="text-gray-500 text-xs mb-1">DEALER {gameState !== SimState.Betting ? `(${calculateHandValue(dealerHand.cards)})` : ''}</div>
                <div className="flex justify-center -space-x-4">
                     {dealerHand.cards.length > 0 ? dealerHand.cards.map((c, i) => <Card key={i} card={c} mini />) : <div className="h-14 w-10 border border-gray-700 rounded bg-gray-800"/>}
                </div>
            </div>

            {/* Player Hands */}
            <div className="flex-grow flex items-center justify-center space-x-4 overflow-x-auto">
                {playerHands.map((h, idx) => (
                    <div key={idx} className={`flex flex-col items-center transition-opacity ${idx === activeHandIndex ? 'opacity-100 scale-105' : 'opacity-50 scale-90'}`}>
                        <div className="text-xs text-gray-400 mb-1">Hand {idx+1} • ${h.bet}</div>
                        <div className="flex -space-x-8 mb-2">
                            {h.cards.map((c, i) => <Card key={i} card={c} />)}
                        </div>
                        <div className="font-bold text-xl">{calculateHandValue(h.cards)}</div>
                        {h.isBusted && <span className="text-red-500 font-bold text-xs">BUST</span>}
                    </div>
                ))}
                {playerHands.length === 0 && <div className="text-gray-600 italic">Place your bets</div>}
            </div>

            {/* Hint Overlay */}
            {hintsEnabled && hintAction && canPlay && (
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-yellow-500 text-black px-4 py-2 rounded-full font-bold shadow-xl z-10 animate-pulse pointer-events-none">
                    Suggestion: {hintAction}
                </div>
            )}

            {/* Controls */}
            <div className="pb-4">
                {gameState === SimState.Betting && (
                    <div className="flex justify-center gap-4">
                        {[10, 25, 50, 100].map(amt => (
                            <button key={amt} onClick={() => setCurrentBet(amt)} className={`w-16 h-16 rounded-full border-4 flex items-center justify-center font-bold ${currentBet === amt ? 'border-yellow-400 bg-gray-700' : 'border-gray-600 bg-gray-800'}`}>
                                {amt}
                            </button>
                        ))}
                        <button 
                            onClick={placeBet} 
                            disabled={bankroll < currentBet}
                            className={`px-6 rounded-lg font-bold shadow-lg ${bankroll < currentBet ? 'bg-gray-600 cursor-not-allowed text-gray-400' : 'bg-green-600 hover:bg-green-500'}`}
                        >
                            DEAL
                        </button>
                    </div>
                )}
                
                {gameState === SimState.PlayerTurn && activeHand && (
                    <ActionControls 
                        onAction={handleAction} 
                        allowedActions={[Action.Hit, Action.Stand, Action.Double, Action.Split, Action.Surrender]} 
                    />
                )}
                
                {gameState === SimState.Resolving && (
                    <div className="text-center text-2xl font-bold text-gray-200 animate-bounce">
                        Round Over
                    </div>
                )}
            </div>
        </div>
    );
}

const StatsView = ({ stats, onReset }: any) => {
  const calcAccuracy = (cat: 'hard'|'soft'|'pairs') => {
      let correct = 0;
      let total = 0;
      Object.values(stats[cat]).forEach((e: any) => {
          correct += e.correct;
          total += e.total;
      });
      return total === 0 ? 0 : Math.round((correct / total) * 100);
  };

  return (
    <div className="space-y-6">
       <h2 className="text-2xl font-bold mb-4">Performance</h2>
       
       <div className="grid grid-cols-3 gap-4">
          <StatCard label="Hard" percent={calcAccuracy('hard')} />
          <StatCard label="Soft" percent={calcAccuracy('soft')} />
          <StatCard label="Pairs" percent={calcAccuracy('pairs')} />
       </div>

       <div className="bg-gray-800 p-6 rounded-lg">
           <h3 className="text-lg font-bold mb-4">Current Streak</h3>
           <div className="text-4xl text-green-400 font-mono text-center">{stats.streak}</div>
       </div>

       <button onClick={onReset} className="w-full py-3 text-red-400 border border-red-900 rounded hover:bg-red-900/20">
           Reset Statistics
       </button>
    </div>
  );
};

const StatCard = ({ label, percent }: any) => (
    <div className="bg-gray-800 p-4 rounded-lg text-center border border-gray-700">
        <div className="text-gray-400 text-xs uppercase mb-1">{label}</div>
        <div className={`text-2xl font-bold ${percent >= 90 ? 'text-green-400' : (percent >= 70 ? 'text-yellow-400' : 'text-red-400')}`}>
            {percent}%
        </div>
    </div>
)

export default App;