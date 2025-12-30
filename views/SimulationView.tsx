import React, { useState, useEffect, useRef } from 'react';
import { GameRules, Action, Hand, Card as CardType, SimState, Rank } from '../types';
import { createDeck, shuffleDeck, createHand, calculateHandValue, playDealerTurn } from '../services/blackjackLogic';
import { recordSimRoundStats, resetSimCurrentWinStreak, updateSimMaxMultiplier } from '../services/statsService';
import { getBasicStrategyAction } from '../services/strategyEngine';
import Card from '../components/Card';
import ActionControls from '../components/ActionControls';

interface SimulationViewProps {
  globalRules: GameRules;
}

const SimulationView: React.FC<SimulationViewProps> = ({ globalRules }) => {
  const ALL_IN_THRESHOLD = 100; // 触发 All-In 成就的下注下限
  const roundFlagsRef = useRef({ hadBlackjack: false, didAllIn: false, splitUsed: false, das: false });
  const pendingSimStatsRef = useRef<{ delta: number; drawdown: number; achievements: string[] } | null>(null);
  const sessionAchievementsRef = useRef<Set<string>>(new Set());
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [leaveSummary, setLeaveSummary] = useState<{
    delta: number;
    multiplier: number;
    achievements: number;
    usedHints: boolean;
    hasPlayed: boolean;
    rounds: number;
  } | null>(null);
  // Snapshot Rules
  const rules = useRef(globalRules).current;
  
  // Sim State
  const [gameState, setGameState] = useState<SimState>(SimState.Setup);
  const [bankroll, setBankroll] = useState(100);
  const [initialBankroll, setInitialBankroll] = useState<number | null>(null);
  const [peakBankroll, setPeakBankroll] = useState<number | null>(null);
  const [currentBet, setCurrentBet] = useState(25);
  const [deck, setDeck] = useState<CardType[]>([]);
  const [roundStartBankroll, setRoundStartBankroll] = useState<number | null>(null);
  const [roundResult, setRoundResult] = useState<{ delta: number; total: number } | null>(null);
  
  // Hands
  const [playerHands, setPlayerHands] = useState<Hand[]>([]);
  const [activeHandIndex, setActiveHandIndex] = useState(0);
  const [dealerHand, setDealerHand] = useState<Hand>(createHand());
  
  // Hints
  const [hintsEnabled, setHintsEnabled] = useState(false);
  const [hasUsedHints, setHasUsedHints] = useState(false);
  const [hintAction, setHintAction] = useState<Action | null>(null);

  // Session persistence
  const SIM_STATE_KEY = 'bj_sim_state_v1';

  // 载入本地保存的牌桌状态
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SIM_STATE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed.bankroll) setBankroll(parsed.bankroll);
      if (parsed.initialBankroll !== undefined) setInitialBankroll(parsed.initialBankroll);
      if (parsed.peakBankroll !== undefined) setPeakBankroll(parsed.peakBankroll);
      if (parsed.currentBet) setCurrentBet(parsed.currentBet);
      if (parsed.deck) setDeck(parsed.deck);
      if (parsed.playerHands) setPlayerHands(parsed.playerHands);
      if (parsed.activeHandIndex !== undefined) setActiveHandIndex(parsed.activeHandIndex);
      if (parsed.dealerHand) setDealerHand(parsed.dealerHand);
      if (parsed.gameState) setGameState(parsed.gameState);
      if (parsed.hintsEnabled !== undefined) setHintsEnabled(parsed.hintsEnabled);
      if (parsed.hasUsedHints !== undefined) setHasUsedHints(parsed.hasUsedHints);
      if (parsed.roundStartBankroll !== undefined) setRoundStartBankroll(parsed.roundStartBankroll);
      if (parsed.roundResult) setRoundResult(parsed.roundResult);
      if (parsed.roundsPlayed !== undefined) setRoundsPlayed(parsed.roundsPlayed);
    } catch (e) {
      // ignore bad data
    }
  }, []);

  // 保存牌桌状态
  useEffect(() => {
    const payload = {
      bankroll,
      initialBankroll,
      peakBankroll,
      currentBet,
      deck,
      playerHands,
      activeHandIndex,
      dealerHand,
      gameState,
      hintsEnabled,
      hasUsedHints,
      roundStartBankroll,
      roundResult,
      roundsPlayed,
    };
    localStorage.setItem(SIM_STATE_KEY, JSON.stringify(payload));
  }, [bankroll, initialBankroll, peakBankroll, currentBet, deck, playerHands, activeHandIndex, dealerHand, gameState, hintsEnabled, hasUsedHints, roundStartBankroll, roundResult, roundsPlayed]);

  // 更新峰值
  useEffect(() => {
    setPeakBankroll(prev => {
      if (prev === null) return bankroll;
      return bankroll > prev ? bankroll : prev;
    });
  }, [bankroll]);

  // Initial Setup
  const startGame = () => {
    setInitialBankroll(bankroll);
    setPeakBankroll(bankroll);
    setGameState(SimState.Betting);
    setDeck(shuffleDeck(createDeck(rules.deckCount)));
  };

  // 格式化点数显示（软/硬主态规则，匹配 Practice 视图）
  const formatHandValue = (cards: CardType[]): string => {
    const value = calculateHandValue(cards);
    const visibleCards = cards.filter(c => !c.isHidden);
    const hasAce = visibleCards.some(c => c.rank === Rank.Ace);

    if (visibleCards.length === 2 && value === 21) return 'Blackjack!';
    if (!hasAce) return `${value}`;

    const hardValue = visibleCards.reduce((sum, c) => sum + (c.rank === Rank.Ace ? 1 : c.value), 0);
    if (value === hardValue) return `${value}`;

    return `${value}/${hardValue}`;
  };

  const placeBet = () => {
    if (bankroll < currentBet) return;
    const preBetBankroll = bankroll;
    const allIn = preBetBankroll > 0 && currentBet >= preBetBankroll && preBetBankroll >= ALL_IN_THRESHOLD;
    roundFlagsRef.current = { hadBlackjack: false, didAllIn: allIn, splitUsed: false, das: false };
    setRoundStartBankroll(bankroll);
    setRoundResult(null);
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
      setTimeout(() => resolveRound(), 1000);
    } else {
      setGameState(SimState.PlayerTurn);
    }
  };

  const handleAction = (action: Action) => {
    const currentHand = playerHands[activeHandIndex];
    let d = [...deck];
    let nextHand = false;
    const updatedHands = [...playerHands];
    let newHand = { ...currentHand };

    if (action === Action.Hit) {
      const card = d.pop()!;
      newHand = { ...currentHand, cards: [...currentHand.cards, card] };
      if (calculateHandValue(newHand.cards) > 21) {
        newHand.isBusted = true;
        newHand.isCompleted = true;
        nextHand = true;
      }
    } else if (action === Action.Stand) {
      newHand = { ...currentHand, isCompleted: true };
      nextHand = true;
    } else if (action === Action.Double) {
      if (bankroll < currentHand.bet) return;
      setBankroll(b => b - currentHand.bet);
      const card = d.pop()!;
      newHand = { ...currentHand, cards: [...currentHand.cards, card], bet: currentHand.bet * 2, isCompleted: true, hasDoubled: true };
      if (calculateHandValue(newHand.cards) > 21) newHand.isBusted = true;
      if (roundFlagsRef.current.splitUsed) {
        roundFlagsRef.current.das = true;
      }
      nextHand = true;
    } else if (action === Action.Surrender) {
      newHand = { ...currentHand, isCompleted: true, hasSurrendered: true };
      nextHand = true;
    } else if (action === Action.Split) {
      if (bankroll < currentHand.bet) return;
      setBankroll(b => b - currentHand.bet);
      roundFlagsRef.current.splitUsed = true;
      
      const card1 = currentHand.cards[0];
      const card2 = currentHand.cards[1];
      
      const hand1 = createHand(currentHand.bet);
      hand1.cards = [card1, d.pop()!];
      
      const hand2 = createHand(currentHand.bet);
      hand2.cards = [card2, d.pop()!];
      
      updatedHands.splice(activeHandIndex, 1, hand1, hand2);
      setPlayerHands(updatedHands);
      
      setDeck(d);
      return;
    }

    updatedHands[activeHandIndex] = newHand;
    setPlayerHands(updatedHands);
    setDeck(d);

    if (nextHand) {
      const allHandsDone = updatedHands.every(h => h.isCompleted);
      const onlySurrenderOrBust = allHandsDone && updatedHands.every(h => h.hasSurrendered || h.isBusted);

      if (onlySurrenderOrBust) {
        // 如果所有手牌都是投降或爆牌，直接结算，跳过庄家补牌
        const revealedDealer = { ...dealerHand, cards: dealerHand.cards.map((c, idx) => idx === 1 ? { ...c, isHidden: false } : c) };
        setDealerHand(revealedDealer);
        resolveRound(revealedDealer, updatedHands);
        return;
      }

      if (activeHandIndex < updatedHands.length - 1) {
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
      setTimeout(() => resolveRound(finalHand), 1000);
    }, 500);
  };

  const resolveRound = (finalDealerHand?: Hand, handsOverride?: Hand[]) => {
    setGameState(SimState.Resolving);
    
    // 使用传入的finalDealerHand，如果没有则用状态中的（用于instant blackjack情况）
    const dHand = finalDealerHand || dealerHand;
    const hands = handsOverride || playerHands;
    
    let payout = 0;
    const dVal = calculateHandValue(dHand.cards);
    const dBusted = dVal > 21;
    const dHasBJ = dVal === 21 && dHand.cards.length === 2;

    console.log('=== Round Resolution ===');
    console.log('Dealer:', dVal, 'Busted:', dBusted, 'Blackjack:', dHasBJ);
    console.log('Player hands:', hands.length);

    hands.forEach((h, idx) => {
      const pVal = calculateHandValue(h.cards);
      const pHasBJ = pVal === 21 && h.cards.length === 2 && !h.canSplit;
      if (pHasBJ) {
        roundFlagsRef.current.hadBlackjack = true;
      }
      
      console.log(`Hand ${idx + 1}: Value=${pVal}, Bet=${h.bet}, Busted=${h.isBusted}, BJ=${pHasBJ}, Surrendered=${h.hasSurrendered}`);
      
      // Surrender: 返回一半本金
      if (h.hasSurrendered) {
        payout += h.bet * 0.5;
        console.log(`  → Surrendered, payout +${h.bet * 0.5}`);
        return;
      }
      
      // Player bust: 输掉全部，不返还任何钱
      if (h.isBusted) {
        console.log(`  → Player busted, payout +0`);
        return;
      }
      
      // Player Blackjack vs Dealer Blackjack: Push，返还本金
      if (pHasBJ && dHasBJ) {
        payout += h.bet;
        console.log(`  → Both BJ (push), payout +${h.bet}`);
        return;
      }
      
      // Player Blackjack vs No Dealer Blackjack: 按照规则赔付(3:2或6:5) + 本金
      if (pHasBJ && !dHasBJ) {
        const win = h.bet * (1 + rules.blackjackPayout);
        payout += win;
        console.log(`  → Player BJ wins, payout +${win}`);
        return;
      }
      
      // Dealer bust: Player wins，返还本金 + 奖金
      if (dBusted) {
        payout += h.bet * 2;
        console.log(`  → Dealer busted, player wins, payout +${h.bet * 2}`);
        return;
      }
      
      // 比点数
      if (pVal > dVal) {
        // Player wins: 返还本金 + 奖金
        payout += h.bet * 2;
        console.log(`  → Player wins (${pVal} > ${dVal}), payout +${h.bet * 2}`);
      } else if (pVal === dVal) {
        // Push: 只返还本金
        payout += h.bet;
        console.log(`  → Push (${pVal} = ${dVal}), payout +${h.bet}`);
      } else {
        console.log(`  → Player loses (${pVal} < ${dVal}), payout +0`);
      }
      // pVal < dVal: Player loses，不返还任何钱
    });
    
    console.log('Total payout:', payout);
    console.log('======================');
    
    setBankroll(b => {
      const newBank = b + payout;
      const start = roundStartBankroll ?? (initialBankroll ?? b);
      const delta = newBank - start;
      const peak = peakBankroll ?? newBank;
      const drawdown = peak > 0 ? Math.max(0, (peak - newBank) / peak) : 0;
      const achievements: string[] = [];
      if (roundFlagsRef.current.hadBlackjack) achievements.push('Blackjack');
      if (roundFlagsRef.current.didAllIn) achievements.push(`All-In (>=${ALL_IN_THRESHOLD})`);
      if (roundFlagsRef.current.das) achievements.push('DAS');
      achievements.forEach(a => sessionAchievementsRef.current.add(a));
      pendingSimStatsRef.current = { delta, drawdown, achievements };
      setRoundResult({ delta, total: newBank });
      return newBank;
    });
    setRoundsPlayed(c => c + 1);
    
    setTimeout(() => {
      setPlayerHands([]);
      setDealerHand(createHand());
      setGameState(SimState.Betting);
    }, 2500);
  };

  const handleLeaveTable = () => {
    const base = initialBankroll ?? bankroll;
    const hasPlayed = roundsPlayed > 0;
    const totalValue = bankroll;
    const multiplier = base > 0 ? totalValue / base : 1;
    const delta = totalValue - base;
    const achievementsCount = hasUsedHints ? 0 : sessionAchievementsRef.current.size;

    setLeaveSummary({
      delta,
      rounds: roundsPlayed,
      multiplier,
      achievements: achievementsCount,
      usedHints: hasUsedHints,
      hasPlayed,
    });

    // 仅在有对局且未使用提示时更新统计，避免 Start Table 立刻 Leave 的误统计
    if (hasPlayed && base > 0 && !hasUsedHints) {
      updateSimMaxMultiplier(multiplier);
    }

    resetSimCurrentWinStreak();
    pendingSimStatsRef.current = null;
    roundFlagsRef.current = { hadBlackjack: false, didAllIn: false, splitUsed: false, das: false };
    sessionAchievementsRef.current.clear();

    // 重置到 Setup，但保留当前bankroll作为默认值
    setGameState(SimState.Setup);
    setDeck([]);
    setPlayerHands([]);
    setDealerHand(createHand());
    setActiveHandIndex(0);
    setRoundStartBankroll(null);
    setRoundResult(null);
    setHintAction(null);
    setHasUsedHints(false);
    setHintsEnabled(false);
    setInitialBankroll(null);
    setPeakBankroll(null);
    setRoundsPlayed(0);
    // 清理本地存档
    localStorage.removeItem(SIM_STATE_KEY);
  };

  // Hint Logic
  useEffect(() => {
    if (gameState === SimState.PlayerTurn && hintsEnabled) {
      const currentHand = playerHands[activeHandIndex];
      const dealerUp = dealerHand.cards[0];
      if (!currentHand || !dealerUp) {
        setHintAction(null);
        return;
      }
      const action = getBasicStrategyAction(currentHand, dealerUp, rules);
      setHintAction(action);
      setHasUsedHints(true);
    } else {
      setHintAction(null);
    }
  }, [gameState, activeHandIndex, hintsEnabled, playerHands, dealerHand]);

  // 在每局结算后，将待写入的 Simulation 统计落盘（不记录使用提示的局）
  useEffect(() => {
    if (!roundResult) return;
    if (hasUsedHints) {
      pendingSimStatsRef.current = null;
      return;
    }
    if (!pendingSimStatsRef.current) return;
    recordSimRoundStats(pendingSimStatsRef.current);
    pendingSimStatsRef.current = null;
  }, [roundResult, hasUsedHints]);

  if (gameState === SimState.Setup) {
    return (
      <div className="relative max-w-md mx-auto space-y-6 pt-6">
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
                100
              </button>
              <button
                onClick={() => setBankroll(500)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm font-semibold transition"
              >
                500
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

        {leaveSummary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl px-6 py-5 max-w-md w-full text-center space-y-3">
              <div className="text-sm uppercase tracking-widest text-gray-400">Session Summary</div>
              <div
                className={`text-2xl md:text-3xl font-black ${
                  leaveSummary.delta > 0
                    ? 'text-green-400'
                    : leaveSummary.delta < 0
                    ? 'text-red-400'
                    : 'text-gray-200'
                }`}
              >
                {leaveSummary.delta > 0 &&
                  `You win $${leaveSummary.delta} in total, that is x(${leaveSummary.multiplier.toFixed(2)})!`}
                {leaveSummary.delta < 0 &&
                  `You lose $${Math.abs(leaveSummary.delta)} in total, that is x(${leaveSummary.multiplier.toFixed(2)})!`}
                {leaveSummary.delta === 0 &&
                  `You broke even, that is x(${leaveSummary.multiplier.toFixed(2)})!`}
              </div>
              <div className="text-lg text-white font-semibold">Rounds played: {leaveSummary.rounds}</div>
              {leaveSummary.achievements > 0 && (
                <div className="text-yellow-300 font-semibold">
                  ({leaveSummary.achievements} more achievement{leaveSummary.achievements > 1 ? 's' : ''} gained!)
                </div>
              )}
              {leaveSummary.usedHints && (
                <div className="text-xs text-red-300">Stats disabled for this session (hints used).</div>
              )}
              {!leaveSummary.hasPlayed && (
                <div className="text-xs text-gray-400">No rounds played this table.</div>
              )}
              <button
                onClick={() => setLeaveSummary(null)}
                className="w-full mt-2 px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-semibold border border-gray-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const activeHand = playerHands[activeHandIndex];
  const canPlay = gameState === SimState.PlayerTurn;

  // 动态计算允许的操作（根据当前活动手牌）
  const getAllowedActions = (): Action[] => {
    if (!activeHand) return [];

    // Blackjack 只能 Stand
    const isBlackjack = activeHand.cards.length === 2 && calculateHandValue(activeHand.cards) === 21;
    if (isBlackjack) return [Action.Stand];

    const actions: Action[] = [Action.Hit, Action.Stand];

    // Double: 只在前两张牌时允许，且需要足够资金
    if (activeHand.cards.length === 2 && bankroll >= activeHand.bet) {
      actions.push(Action.Double);
    }

    // Split: 只在前两张牌且相同rank时允许，且需要足够资金
    const canSplit = activeHand.cards.length === 2 && 
                     activeHand.cards[0].rank === activeHand.cards[1].rank &&
                     bankroll >= activeHand.bet;
    if (canSplit) {
      actions.push(Action.Split);
    }

    // Surrender: 只在前两张牌时允许，且规则允许；拆牌后不允许再投降
    if (activeHand.cards.length === 2 && rules.surrender !== 'none' && !roundFlagsRef.current.splitUsed) {
      actions.push(Action.Surrender);
    }

    return actions;
  };

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
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-0.5">
            {gameState === SimState.Betting ? 'Current Bet' : 'Total Bet'}
          </div>
          <div className="text-2xl font-bold text-yellow-400 font-mono">
            ${gameState === SimState.Betting 
              ? currentBet 
              : playerHands.reduce((sum, h) => sum + h.bet, 0)}
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

      {/* Warning if Hints Used */}
      {hasUsedHints && (
        <div className="text-center text-sm text-red-400 bg-red-950/30 border border-red-900 rounded-lg px-4 py-2 mb-4 mx-auto max-w-md">
          ⚠️ Hints used - Statistics disabled for this session
        </div>
      )}

      {/* Blackjack Payout Info */}
      <div className="text-gray-400 text-sm tracking-widest uppercase mb-4 h-6 flex items-center justify-center">
        Blackjack pays {rules.blackjackPayout === 1.5 ? '3:2' : '6:5'}
      </div>

      {/* Dealer & Player 左右分布区域 */}
      <div className="w-full flex gap-12 md:gap-16 px-8 py-6 mb-4">
        {/* Dealer 区域 - 左侧 */}
        <div className="flex-1 text-center">
          {/* Title Row - 统一高度确保对齐 */}
          <h3 className="text-gray-400 text-sm tracking-widest uppercase mb-4 h-6 flex items-center justify-center">
            Dealer {gameState !== SimState.Betting && dealerHand.cards.length > 0 && (
              <span className="text-gray-400 ml-2">({formatHandValue(dealerHand.cards)})</span>
            )}
          </h3>
          {/* Card Stage - 顶部对齐 */}
          <div className="flex justify-center -space-x-10 min-h-[72px]">
            {dealerHand.cards.length > 0 ? (
              dealerHand.cards.map((c, i) => <Card key={i} card={c} />)
            ) : (
              <div className="h-16 w-12 border-2 border-dashed border-gray-700 rounded bg-gray-900/50"/>
            )}
          </div>
        </div>

        {/* Player 区域 - 右侧 */}
        <div className="flex-1 text-center">
          {/* Title Row - 统一高度确保对齐，数字在标题中 */}
          <h3 className="text-gray-400 text-sm tracking-widest uppercase mb-4 h-6 flex items-center justify-center">
            {playerHands.length === 0 ? 'Waiting' : 
             playerHands.length === 1 ? `Your Hand (${formatHandValue(playerHands[0].cards)})` :
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
                    Hand {idx + 1} ({formatHandValue(h.cards)}) • <span className="text-yellow-400">${h.bet}</span>
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

            {/* Leave Table */}
            <button
              onClick={handleLeaveTable}
              className="w-full max-w-md px-8 py-4 rounded-xl font-bold text-lg shadow-xl transition-all duration-200 bg-gradient-to-r from-red-700 to-red-800 hover:from-red-600 hover:to-red-700 text-white border-2 border-red-500 hover:shadow-red-500/50"
            >
              Leave Table
            </button>
          </div>
        )}
        
        {gameState === SimState.PlayerTurn && activeHand && (
          <div className="max-w-2xl mx-auto">
            <ActionControls 
              onAction={handleAction} 
              allowedActions={getAllowedActions()} 
            />
          </div>
        )}
        
        {gameState === SimState.Resolving && (
          <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-black bg-opacity-40 backdrop-blur-sm pointer-events-none px-4 text-center space-y-2">
            {roundResult && (
              <>
                <div className={`text-4xl md:text-5xl font-black drop-shadow-lg ${
                  roundResult.delta > 0 ? 'text-green-400' : 
                  roundResult.delta < 0 ? 'text-red-400' : 
                  'text-gray-200'
                }`}>
                  {roundResult.delta > 0 && `You win $${roundResult.delta}`}
                  {roundResult.delta < 0 && `You lose $${Math.abs(roundResult.delta)}`}
                  {roundResult.delta === 0 && 'Even'}
                </div>
                <div className="text-xl md:text-2xl font-semibold text-white">Total ${roundResult.total}</div>
              </>
            )}
          </div>
        )}
      </div>

      {leaveSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl px-6 py-5 max-w-md w-full text-center space-y-3">
            <div className="text-sm uppercase tracking-widest text-gray-400">Session Summary</div>
            <div
              className={`text-2xl md:text-3xl font-black ${
                leaveSummary.delta > 0
                  ? 'text-green-400'
                  : leaveSummary.delta < 0
                  ? 'text-red-400'
                  : 'text-gray-200'
              }`}
            >
              {leaveSummary.delta > 0 &&
                `You win $${leaveSummary.delta} in total, that is x(${leaveSummary.multiplier.toFixed(2)})!`}
              {leaveSummary.delta < 0 &&
                `You lose $${Math.abs(leaveSummary.delta)} in total, that is x(${leaveSummary.multiplier.toFixed(2)})!`}
              {leaveSummary.delta === 0 &&
                `You broke even, that is x(${leaveSummary.multiplier.toFixed(2)})!`}
            </div>
            {/* <div className="text-lg text-white font-semibold">Total ${leaveSummary.total}</div> */}
            {!leaveSummary.hasPlayed && (
              <div className="text-lg text-gray-400 font-semibold">No rounds played this table.</div>
            )}
            {leaveSummary.achievements > 0 && (
              <div className="text-yellow-300 font-semibold">
                ({leaveSummary.achievements} more achievement{leaveSummary.achievements > 1 ? 's' : ''} gained!)
              </div>
            )}
            {leaveSummary.usedHints && (
              <div className="text-xs text-red-300">Stats disabled for this session (hints used).</div>
            )}

            <button
              onClick={() => setLeaveSummary(null)}
              className="w-full mt-2 px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-semibold border border-gray-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimulationView;
