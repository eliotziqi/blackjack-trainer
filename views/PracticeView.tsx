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
  
  // ⌨️ 键盘触发的按钮视觉反馈
  const [pressedAction, setPressedAction] = useState<Action | null>(null);
  
  // 📊 本地追踪 stats（用于实时更新 Streak）
  const [localStats, setLocalStats] = useState(stats);
  
  // ✨ Streak 动效状态：检测里程碑/新纪录
  const [streakAnimationTrigger, setStreakAnimationTrigger] = useState<'milestone' | 'newRecord' | null>(null);

  // 🔄 当外部 stats 重置时同步更新（修复 Reset 按钮后的状态不一致）
  useEffect(() => {
    setLocalStats(stats);
  }, [stats]);

  // 🎮 动态计算允许的 action（根据实际手牌和规则）
  const allowedActions = React.useMemo(() => {
    // 🎰 Blackjack 特殊情况：只能 Stand
    const isBlackjack = playerHand.cards.length === 2 && calculateHandValue(playerHand.cards) === 21;
    if (isBlackjack) {
      return [Action.Stand];
    }
    
    const actions = [Action.Hit, Action.Stand, Action.Double];
    
    // 只有配对的初始手牌才能 Split
    const canSplit = 
      playerHand.cards.length === 2 && 
      playerHand.cards[0].rank === playerHand.cards[1].rank;
    
    if (canSplit) {
      actions.push(Action.Split);
    }
    
    // 只有当规则允许时才能 Surrender
    if (rules.surrender !== 'none') {
      actions.push(Action.Surrender);
    }
    
    return actions;
  }, [playerHand.cards, rules.surrender]);

  // 格式化点数显示（软/硬主态规则）
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
    
    // 如果软点数和硬点数相同（爆牌或只能算硬），只显示一个
    if (value === hardValue) return `${value}`;
    
    // 主态规则：软点数在前（更重要），硬点数在后
    return `${value}/${hardValue}`;
  };

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

  // ⌨️ 键盘快捷键支持
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (isBusy) return;
      
      const key = e.key.toUpperCase();
      const keyMap: Record<string, Action> = {
        'H': Action.Hit,
        'S': Action.Stand,
        'D': Action.Double,
        'P': Action.Split,
        'R': Action.Surrender,
      };
      
      const action = keyMap[key];
      if (action) {
        e.preventDefault();
        
        // 触发视觉反馈
        setPressedAction(action);
        setTimeout(() => setPressedAction(null), 150);
        
        handleAction(action);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isBusy, playerHand, dealerUpCard]);

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
    const updatedStats = recordPracticeResult(key, category.toLowerCase() as any, isCorrect);
    
    // 📊 更新本地 stats（触发 Streak 实时更新）
    setLocalStats(updatedStats);
    
    // ✨ 检测里程碑或新纪录
    if (isCorrect) {
      const milestones = [10, 25, 50, 100, 150, 200, 250, 300];
      if (milestones.includes(updatedStats.streak)) {
        setStreakAnimationTrigger('milestone');
        setTimeout(() => setStreakAnimationTrigger(null), 1500);
      } else if (updatedStats.streak > 0 && updatedStats.streak === updatedStats.maxStreak && updatedStats.streak > 1) {
        setStreakAnimationTrigger('newRecord');
        setTimeout(() => setStreakAnimationTrigger(null), 1500);
      }
    }

    setTimeout(() => {
        dealNewHand();
    }, 1500);
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-[60vh] overflow-hidden">
      {/* 键盘快捷键提示 */}
      <div className="w-full text-center pt-2 pb-4 text-gray-400 text-sm">
        Use keyboard shortcuts: Hit(H), Stand(S), Double(D), Split(P), Surrender(R).
      </div>

      {/* 连胜计数 */}
      <div className="w-full text-center mb-4">
        <div className="text-sm text-gray-400 uppercase tracking-widest">Streak</div>
        <div className={`text-3xl font-bold font-mono transition-all duration-300
          ${streakAnimationTrigger === 'milestone' ? 'text-yellow-400 scale-110 animate-pulse' : ''}
          ${streakAnimationTrigger === 'newRecord' ? 'text-orange-400 scale-110 animate-pulse drop-shadow-lg' : ''}
          ${streakAnimationTrigger === null && localStats.streak > 0 ? 'text-green-400' : ''}
          ${localStats.streak === 0 ? 'text-gray-400' : ''}
        `}>
          {localStats.streak}
          {streakAnimationTrigger === 'milestone' && <span className="text-lg ml-2">🎯</span>}
          {streakAnimationTrigger === 'newRecord' && <span className="text-lg ml-2">🏆</span>}
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

      {/* Dealer & Player 左右分布区域 */}
      <div className="w-full flex gap-8 px-8 py-8">
        {/* Dealer 区域 - 左侧 */}
        <div className="flex-1 text-center">
          {/* Title Row - 统一高度确保对齐 */}
          <h3 className="text-gray-400 text-sm tracking-widest uppercase mb-4 h-6 flex items-center justify-center">Dealer Upcard ({formatHandValue([dealerUpCard])})</h3>
          {/* Card Stage - 顶部对齐 */}
          <div className="flex justify-center">
            <Card card={dealerUpCard} />
          </div>
        </div>

        {/* Player 区域 - 右侧 */}
        <div className="flex-1 text-center">
          {/* Title Row - 统一高度确保对齐 */}
          <h3 className="text-gray-400 text-sm tracking-widest uppercase mb-4 h-6 flex items-center justify-center">Your Hand ({formatHandValue(playerHand.cards)})</h3>
          {/* Card Stage - 顶部对齐 */}
          <div className="flex justify-center -space-x-12">
            {playerHand.cards.map((c, i) => <Card key={i} card={c} />)}
          </div>
        </div>
      </div>

      <div className="w-full pb-8">
         <ActionControls 
            onAction={handleAction} 
            allowedActions={allowedActions}
            disabled={isBusy}
            pressedAction={pressedAction}
         />
      </div>
    </div>
  );
};

export default PracticeView;
