import React, { useState, useEffect, useRef } from 'react';
import { GameRules, Action, Hand, Card as CardType, SimState } from '../types';
import { createDeck, shuffleDeck, createHand, calculateHandValue, playDealerTurn } from '../services/blackjackLogic';
import { getBasicStrategyAction } from '../services/strategyEngine';
import Card from '../components/Card';
import ActionControls from '../components/ActionControls';

interface SimulationViewProps {
  globalRules: GameRules;
}

const SimulationView: React.FC<SimulationViewProps> = ({ globalRules }) => {
  // Snapshot Rules
  const rules = useRef(globalRules).current;
  
  // Sim State
  const [gameState, setGameState] = useState<SimState>(SimState.Setup);
  const [bankroll, setBankroll] = useState(100);
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
    const d1 = d.pop()!;
    const p2 = d.pop()!;
    const d2 = d.pop()!;
    
    // Setup hands
    const pHand = createHand(currentBet);
    pHand.cards = [p1, p2];
    const dHand = createHand();
    dHand.cards = [d1, d2];
    dHand.cards[1].isHidden = true;
    
    setDeck(d);
    setPlayerHands([pHand]);
    setActiveHandIndex(0);
    setDealerHand(dHand);
    setHasUsedHints(false);
    setHintAction(null);

    // Check for instant blackjack
    const pBJ = calculateHandValue([p1, p2]) === 21;
    const dBJ = calculateHandValue([d1, d2]) === 21;

    if (pBJ || dBJ) {
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
      if (bankroll < currentHand.bet) return;
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
      if (bankroll < currentHand.bet) return;
      setBankroll(b => b - currentHand.bet);
      
      const card1 = currentHand.cards[0];
      const card2 = currentHand.cards[1];
      
      const hand1 = createHand(currentHand.bet);
      hand1.cards = [card1, d.pop()!];
      
      const hand2 = createHand(currentHand.bet);
      hand2.cards = [card2, d.pop()!];
      
      const newHands = [...playerHands];
      newHands.splice(activeHandIndex, 1, hand1, hand2);
      setPlayerHands(newHands);
      
      setDeck(d);
      return;
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
    const dHasBJ = calculateHandValue(dealerHand.cards) === 21 && dealerHand.cards.length === 2;

    playerHands.forEach(h => {
      const pVal = calculateHandValue(h.cards);
      const pHasBJ = pVal === 21 && h.cards.length === 2 && !h.canSplit;
      
      if (h.hasSurrendered) {
        payout += h.bet * 0.5;
        return;
      }
      if (h.isBusted) return;
      
      if (pHasBJ && !dHasBJ) {
        payout += h.bet + (h.bet * rules.blackjackPayout);
      } else if (dVal > 21) {
        payout += h.bet * 2;
      } else if (pVal > dVal) {
        payout += h.bet * 2;
      } else if (pVal === dVal) {
        payout += h.bet;
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
      <div className="max-w-md mx-auto space-y-6 pt-6">
        <div className="mb-6 text-center">
          <h2 className="text-3xl font-bold text-green-400 mb-2">Simulation Setup</h2>
          <p className="text-gray-400 text-sm md:text-base"></p>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 space-y-6">
          <div className="space-y-3">
            <label className="text-gray-300 font-semibold text-sm">Starting Bankroll</label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setBankroll(Math.max(10, bankroll - 10))}
                className="w-10 h-10 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition font-bold flex items-center justify-center"
              >
                −
              </button>
              <input
                type="number"
                value={bankroll}
                onChange={e => setBankroll(Math.max(10, parseInt(e.target.value) || 10))}
                className="flex-1 bg-gray-900 p-3 rounded-lg text-center text-2xl font-mono text-green-400 border border-gray-700 focus:border-green-400 focus:outline-none"
              />
              <button
                onClick={() => setBankroll(bankroll + 10)}
                className="w-10 h-10 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition font-bold flex items-center justify-center"
              >
                +
              </button>
            </div>
            
            {/* Quick Adjust Buttons */}
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setBankroll(Math.max(10, Math.floor(bankroll / 2)))}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm font-semibold transition"
              >
                Half
              </button>
              <button
                onClick={() => setBankroll(bankroll * 2)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm font-semibold transition"
              >
                Double
              </button>
              <button
                onClick={() => setBankroll(100)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm font-semibold transition"
              >
                Reset (100)
              </button>
            </div>
          </div>
        </div>

        <button
          onClick={startGame}
          className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-4 rounded-lg shadow-lg transition text-lg"
        >
          Start Table
        </button>
      </div>
    );
  }

  const activeHand = playerHands[activeHandIndex];
  const canPlay = gameState === SimState.PlayerTurn;

  return (
    <div className="flex flex-col h-full relative">
      <div className="mb-6 text-center w-full pt-6">
        <h2 className="text-3xl font-bold text-green-400 mb-2">Simulation</h2>
        {/* <p className="text-gray-400 text-sm md:text-base">Full blackjack game with bankroll tracking</p> */}
      </div>

      {/* Top Info Bar - Modern Cards */}
      <div className="flex justify-between items-center gap-3 mb-6 px-2">
        <div className="flex-1 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-700 px-4 py-3">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Bankroll</div>
          <div className="text-2xl font-bold text-green-400 font-mono">${bankroll}</div>
        </div>
        <div className="flex-1 bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg border border-gray-700 px-4 py-3">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">Current Bet</div>
          <div className="text-2xl font-bold text-yellow-400 font-mono">${currentBet}</div>
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

      {/* Warning if Hints Used */}
      {hasUsedHints && (
        <div className="text-center text-sm text-red-400 bg-red-950/30 border border-red-900 rounded-lg px-4 py-2 mb-4 mx-auto max-w-md">
          ⚠️ Hints used - Statistics disabled for this session
        </div>
      )}

      {/* Dealer & Player 左右分布区域 */}
      <div className="w-full flex gap-12 md:gap-16 px-8 py-6 mb-4">
        {/* Dealer 区域 - 左侧 */}
        <div className="flex-1 text-center">
          {/* Title Row - 统一高度确保对齐 */}
          <h3 className="text-gray-400 text-sm tracking-widest uppercase mb-4 h-6 flex items-center justify-center">
            Dealer {gameState !== SimState.Betting && dealerHand.cards.length > 0 && (
              <span className="text-gray-400 ml-2">({calculateHandValue(dealerHand.cards)})</span>
            )}
          </h3>
          {/* Card Stage - 顶部对齐 */}
          <div className="flex justify-center -space-x-4 min-h-[56px]">
            {dealerHand.cards.length > 0 ? (
              dealerHand.cards.map((c, i) => <Card key={i} card={c} mini />)
            ) : (
              <div className="h-14 w-10 border-2 border-dashed border-gray-700 rounded bg-gray-900/50"/>
            )}
          </div>
        </div>

        {/* Player 区域 - 右侧 */}
        <div className="flex-1 text-center">
          {/* Title Row - 统一高度确保对齐，数字在标题中 */}
          <h3 className="text-gray-400 text-sm tracking-widest uppercase mb-4 h-6 flex items-center justify-center">
            {playerHands.length === 0 ? 'Waiting' : 
             playerHands.length === 1 ? `Your Hand (${calculateHandValue(playerHands[0].cards)})` :
             'Your Hands'}
          </h3>
          {/* Card Stage - 顶部对齐 */}
          <div className="flex justify-center gap-8 overflow-x-auto">
            {playerHands.map((h, idx) => (
              <div 
                key={idx} 
                className={`flex flex-col items-center transition-all duration-300 ${
                  idx === activeHandIndex 
                    ? 'opacity-100' 
                    : 'opacity-60'
                }`}
              >
                {/* Hand Label - 只在多手牌时显示，包含点数 */}
                {playerHands.length > 1 && (
                  <div className="text-xs font-semibold text-gray-400 mb-2 px-2 py-1 bg-gray-800 rounded-full border border-gray-700">
                    Hand {idx + 1} ({calculateHandValue(h.cards)}) • <span className="text-yellow-400">${h.bet}</span>
                  </div>
                )}
                
                {/* Cards */}
                <div className="flex -space-x-10 mb-2">
                  {h.cards.map((c, i) => <Card key={i} card={c} />)}
                </div>

                {/* Bust Indicator */}
                {h.isBusted && (
                  <span className="text-red-500 font-bold text-xs bg-red-950/50 px-2 py-1 rounded-full border border-red-800">
                    BUST
                  </span>
                )}
              </div>
            ))}
            {playerHands.length === 0 && (
              <div className="text-gray-500 italic">Place your bet to start</div>
            )}
          </div>
        </div>
      </div>

      {/* Hint Overlay - Modern Design */}
      {hintsEnabled && hintAction && canPlay && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-black px-6 py-3 rounded-xl font-bold shadow-2xl animate-pulse border-2 border-yellow-400">
            <div className="text-xs uppercase tracking-wider opacity-80">Suggested Action</div>
            <div className="text-xl">{hintAction}</div>
          </div>
        </div>
      )}

      {/* Controls - Modern Betting & Actions */}
      <div className="pb-6">
        {gameState === SimState.Betting && (
          <div className="flex flex-col items-center gap-4">
            {/* Chip Selection */}
            <div className="flex justify-center gap-3 flex-wrap">
              {[10, 25, 50, 100].map(amt => (
                <button 
                  key={amt} 
                  onClick={() => setCurrentBet(amt)} 
                  className={`relative w-20 h-20 rounded-full border-4 flex flex-col items-center justify-center font-bold transition-all duration-200 ${
                    currentBet === amt 
                      ? 'border-yellow-400 bg-gradient-to-br from-yellow-600 to-yellow-700 text-black shadow-lg shadow-yellow-500/50 scale-110' 
                      : 'border-gray-600 bg-gradient-to-br from-gray-700 to-gray-800 text-gray-300 hover:border-yellow-500 hover:scale-105'
                  }`}
                >
                  <div className="text-xs opacity-70">$</div>
                  <div className="text-xl">{amt}</div>
                </button>
              ))}
            </div>
            
            {/* Deal Button */}
            <button 
              onClick={placeBet} 
              disabled={bankroll < currentBet}
              className={`w-full max-w-md px-8 py-4 rounded-xl font-bold text-lg shadow-xl transition-all duration-200 ${
                bankroll < currentBet 
                  ? 'bg-gray-700 cursor-not-allowed text-gray-500 border-2 border-gray-600' 
                  : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white border-2 border-green-500 hover:shadow-green-500/50'
              }`}
            >
              {bankroll < currentBet ? 'Insufficient Funds' : 'DEAL CARDS'}
            </button>
          </div>
        )}
        
        {gameState === SimState.PlayerTurn && activeHand && (
          <div className="max-w-2xl mx-auto">
            <ActionControls 
              onAction={handleAction} 
              allowedActions={[Action.Hit, Action.Stand, Action.Double, Action.Split, Action.Surrender]} 
            />
          </div>
        )}
        
        {gameState === SimState.Resolving && (
          <div className="text-center">
            <div className="inline-block bg-gradient-to-r from-green-600 to-blue-600 text-white text-xl font-bold px-8 py-4 rounded-xl shadow-xl animate-bounce">
              🎲 Round Complete
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SimulationView;
