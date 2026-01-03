import { useState, useRef } from 'react';
import { GameRules, Action, Hand, Card as CardType, SimState, Rank } from '../types';
import {
  createDeck,
  shuffleDeck,
  createHand,
  calculateHandValue,
  playDealerTurn,
} from '../services/blackjackLogic';

interface RoundFlags {
  hadBlackjack: boolean;
  didAllIn: boolean;
  splitUsed: boolean;
  das: boolean;
}

interface PendingStats {
  delta: number;
  drawdown: number;
  achievements: string[];
}

interface RoundResult {
  delta: number;
  total: number;
}

export const useSimulationGame = (rules: GameRules, allInThreshold: number) => {
  const [gameState, setGameState] = useState<SimState>(SimState.Setup);
  const [bankroll, setBankroll] = useState(100);
  const [initialBankroll, setInitialBankroll] = useState<number | null>(null);
  const [peakBankroll, setPeakBankroll] = useState<number | null>(null);
  const [deck, setDeck] = useState<CardType[]>([]);
  const [roundStartBankroll, setRoundStartBankroll] = useState<number | null>(null);
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);

  const [playerHands, setPlayerHands] = useState<Hand[]>([]);
  const [activeHandIndex, setActiveHandIndex] = useState(0);
  const [dealerHand, setDealerHand] = useState<Hand>(createHand());

  const roundFlagsRef = useRef<RoundFlags>({
    hadBlackjack: false,
    didAllIn: false,
    splitUsed: false,
    das: false,
  });
  const pendingSimStatsRef = useRef<PendingStats | null>(null);
  const sessionAchievementsRef = useRef<Set<string>>(new Set());

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
    const canSplit =
      activeHand.cards.length === 2 &&
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

  const startGame = () => {
    setInitialBankroll(bankroll);
    setPeakBankroll(bankroll);
    setGameState(SimState.Betting);
    setDeck(shuffleDeck(createDeck(rules.deckCount)));
  };

  const placeBet = (currentBet: number) => {
    if (bankroll < currentBet) return;
    const preBetBankroll = bankroll;
    const allIn = preBetBankroll > 0 && currentBet >= preBetBankroll && preBetBankroll >= allInThreshold;
    roundFlagsRef.current = { hadBlackjack: false, didAllIn: allIn, splitUsed: false, das: false };
    setRoundStartBankroll(bankroll);
    setRoundResult(null);
    setBankroll((prev) => Math.round((prev - currentBet) * 100) / 100);
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

    // Check for instant blackjack
    const pBJ = calculateHandValue([p1, p2]) === 21;
    const dBJ = calculateHandValue([d1, d2]) === 21;

    if (pBJ || dBJ) {
      const revealedDealerHand = {
        ...dHand,
        cards: dHand.cards.map((c, idx) => (idx === 1 ? { ...c, isHidden: false } : c)),
      };
      setDealerHand(revealedDealerHand);
      setTimeout(() => resolveRound(revealedDealerHand, [pHand]), 1000);
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
      setBankroll((b) => b - currentHand.bet);
      const card = d.pop()!;
      newHand = {
        ...currentHand,
        cards: [...currentHand.cards, card],
        bet: currentHand.bet * 2,
        isCompleted: true,
        hasDoubled: true,
      };
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
      setBankroll((b) => b - currentHand.bet);
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
      const allHandsDone = updatedHands.every((h) => h.isCompleted);
      const onlySurrenderOrBust = allHandsDone && updatedHands.every((h) => h.hasSurrendered || h.isBusted);

      if (onlySurrenderOrBust) {
        // 如果所有手牌都是投降或爆牌，仍要展示庄家的隐藏牌，给用户反应时间
        const revealedDealer = {
          ...dealerHand,
          cards: dealerHand.cards.map((c, idx) => (idx === 1 ? { ...c, isHidden: false } : c)),
        };
        setDealerHand(revealedDealer);
        setTimeout(() => resolveRound(revealedDealer, updatedHands), 1500);
        return;
      }

      if (activeHandIndex < updatedHands.length - 1) {
        setActiveHandIndex((i) => i + 1);
      } else {
        setGameState(SimState.DealerTurn);
        playDealer();
      }
    }
  };

  const playDealer = () => {
    // First, reveal the dealer's hidden card in UI
    const revealedDealerHand = {
      ...dealerHand,
      cards: dealerHand.cards.map((c, idx) => (idx === 1 ? { ...c, isHidden: false } : c)),
    };
    setDealerHand(revealedDealerHand);

    setTimeout(() => {
      const { updatedDeck, finalHand } = playDealerTurn(deck, revealedDealerHand, rules);
      setDeck(updatedDeck);
      setDealerHand(finalHand);
      setTimeout(() => resolveRound(finalHand, undefined), 1000);
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
    console.log('Dealer cards:', dHand.cards.map(c => `${c.rank}${c.suit}`));
    console.log('Dealer:', dVal, 'Busted:', dBusted, 'Blackjack:', dHasBJ);
    console.log('Player hands:', hands.length);

    hands.forEach((h, idx) => {
      const pVal = calculateHandValue(h.cards);
      const pHasBJ = pVal === 21 && h.cards.length === 2;
      if (pHasBJ) {
        roundFlagsRef.current.hadBlackjack = true;
      }

      console.log(`Hand ${idx + 1}: Cards=[${h.cards.map(c => `${c.rank}${c.suit}`).join(',')}], Value=${pVal}, Bet=${h.bet}, Busted=${h.isBusted}, BJ=${pHasBJ}, Surrendered=${h.hasSurrendered}`);

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

    setBankroll((b) => {
      const newBank = b + payout;
      const start = roundStartBankroll ?? (initialBankroll ?? b);
      const delta = newBank - start;
      const peak = peakBankroll ?? newBank;
      const drawdown = peak > 0 ? Math.max(0, (peak - newBank) / peak) : 0;
      const achievements: string[] = [];
      if (roundFlagsRef.current.hadBlackjack) achievements.push('Blackjack');
      if (roundFlagsRef.current.didAllIn) achievements.push(`All-In (>=${allInThreshold})`);
      if (roundFlagsRef.current.das) achievements.push('DAS');
      achievements.forEach((a) => sessionAchievementsRef.current.add(a));
      pendingSimStatsRef.current = { delta, drawdown, achievements };
      setRoundResult({ delta, total: newBank });
      return newBank;
    });

    setTimeout(() => {
      setPlayerHands([]);
      setDealerHand(createHand());
      setGameState(SimState.Betting);
    }, 2500);
  };

  const resetGame = () => {
    setGameState(SimState.Setup);
    setPlayerHands([]);
    setActiveHandIndex(0);
    setDealerHand(createHand(null));
    setRoundResult(null);
  };

  return {
    // State
    gameState,
    bankroll,
    initialBankroll,
    peakBankroll,
    deck,
    roundStartBankroll,
    roundResult,
    playerHands,
    activeHandIndex,
    dealerHand,
    canPlay,
    activeHand,
    // Refs
    roundFlagsRef,
    pendingSimStatsRef,
    sessionAchievementsRef,
    // Functions
    getAllowedActions,
    startGame,
    placeBet,
    handleAction,
    setGameState,
    setBankroll,
    setInitialBankroll,
    setPeakBankroll,
    setDeck,
    setPlayerHands,
    setActiveHandIndex,
    setDealerHand,
    setRoundStartBankroll,
    setRoundResult,
    resetGame,
  };
};
