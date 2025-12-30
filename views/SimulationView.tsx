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
};

export default SimulationView;
