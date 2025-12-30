import React, { useState, useEffect, useRef } from 'react';
import { GameRules, Action, Hand, Card as CardType, Rank, Suit } from '../types';
import { createDeck, shuffleDeck, createHand, calculateHandValue, getHandType } from '../services/blackjackLogic';
import { getBasicStrategyAction, getStrategyKey } from '../services/strategyEngine';
import { recordPracticeResult } from '../services/statsService';
import Card from '../components/Card';
import ActionControls from '../components/ActionControls';

interface PracticeViewProps {
  globalRules: GameRules;
  stats: any;
}

const PracticeView: React.FC<PracticeViewProps> = ({ globalRules, stats }) => {
  // Snapshot rules
  const rules = useRef(globalRules).current;

  const [deck, setDeck] = useState<CardType[]>([]);
  const [playerHand, setPlayerHand] = useState<Hand>(createHand());
  const [dealerUpCard, setDealerUpCard] = useState<CardType>({ rank: Rank.Two, suit: Suit.Clubs, value: 2 });
  const [feedback, setFeedback] = useState<{ correct: boolean, message: string, optimal: Action } | null>(null);
  
  // 🔒 交互锁：防止动画期间重复点击
  const [animationStage, setAnimationStage] = useState<'idle' | 'busy'>('idle');
  const isBusy = animationStage !== 'idle';

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
    setAnimationStage('idle'); // 🔓 解锁
  };

  useEffect(() => {
    dealNewHand();
  }, []);

  const handleAction = (action: Action) => {
    // 🚪 防止重复触发
    if (isBusy) return;
    
    // 🔒 上锁
    setAnimationStage('busy');
    
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
            disabled={isBusy}
         />
      </div>
    </div>
  );
};

export default PracticeView;
