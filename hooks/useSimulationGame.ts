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
  const [insuranceBet, setInsuranceBet] = useState(0);
  const [insuranceOffered, setInsuranceOffered] = useState(false);
  const [evenMoneyTaken, setEvenMoneyTaken] = useState(false);

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

  const placeBet = (currentBet: number, roundNumber: number = 1) => {
    console.log(`\n========== ROUND ${roundNumber} START ==========`);
    if (bankroll < currentBet) return;
    const preBetBankroll = bankroll;
    const allIn = preBetBankroll > 0 && currentBet >= preBetBankroll && preBetBankroll >= allInThreshold;
    roundFlagsRef.current = { hadBlackjack: false, didAllIn: allIn, splitUsed: false, das: false };
    setRoundStartBankroll(bankroll);
    setRoundResult(null);
    setInsuranceBet(0);
    setInsuranceOffered(false);
    setEvenMoneyTaken(false);
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

    // Insurance branch: dealer upcard Ace
    const dealerUpAce = rules.insuranceAllowed && dHand.cards[0]?.rank === Rank.Ace;

    // Check for natural blackjack (player) for even money option
    const pBJ = calculateHandValue([p1, p2]) === 21;
    const dBJ = calculateHandValue([d1, d2]) === 21;

    // Dealer 10-value card: peek for blackjack immediately
    const dealerUp10Value = dHand.cards[0]?.value === 10;
    if (dealerUp10Value && !dealerUpAce) {
      const peekCards = dHand.cards.map((c, idx) => (idx === 1 ? { ...c, isHidden: false } : c));
      const dHasBJ = calculateHandValue(peekCards) === 21 && peekCards.length === 2;
      if (dHasBJ) {
        // Reveal and resolve immediately
        const revealedDealerHand = { ...dHand, cards: peekCards };
        setDealerHand(revealedDealerHand);
        setTimeout(() => resolveRound(revealedDealerHand, [pHand]), 1000);
        return;
      }
      // No blackjack, keep hidden and continue to player turn
      setGameState(SimState.PlayerTurn);
      return;
    }

    if (dealerUpAce) {
      console.log(`[DEALER ACE] Insurance offered (rules: insurance=${rules.insuranceAllowed}, evenMoney=${rules.evenMoneyAllowed})`);
      setInsuranceOffered(true);
      setInsuranceBet(0);
      setEvenMoneyTaken(false);
      setGameState(SimState.Insurance);
      return;
    }

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
    let newHand = { ...currentHand };
    let updatedHands = [...playerHands];
    let isDoubleAction = false;

    console.log(`[ACTION] Hand ${activeHandIndex + 1}: ${action} | Cards: ${currentHand.cards.map(c => c.rank + c.suit).join(',')} (${calculateHandValue(currentHand.cards)}) | Bet: $${currentHand.bet.toFixed(2)}`);

    if (action === Action.Hit) {
      const card = d.pop()!;
      newHand = { ...currentHand, cards: [...currentHand.cards, card] };
      const newValue = calculateHandValue(newHand.cards);
      console.log(`  -> Drew: ${card.rank}${card.suit} | New value: ${newValue}`);
      if (newValue > 21) {
        newHand.isBusted = true;
        newHand.isCompleted = true;
        nextHand = true;
        console.log(`  -> BUSTED at ${newValue}`);
      }
    } else if (action === Action.Stand) {
      newHand = { ...currentHand, isCompleted: true };
      nextHand = true;
      console.log(`  -> Standing at ${calculateHandValue(currentHand.cards)}`);
    } else if (action === Action.Double) {
      if (bankroll < currentHand.bet) return;
      setBankroll((b) => b - currentHand.bet);
      const card = d.pop()!;
      const doubledBet = currentHand.bet * 2;
      const cards = [...currentHand.cards, card];
      const newValue = calculateHandValue(cards);
      const isBusted = newValue > 21;

      newHand = {
        ...currentHand,
        cards,
        bet: doubledBet,
        isCompleted: true,
        hasDoubled: true,
        isBusted,
      };

      console.log(`  -> Doubled bet from $${currentHand.bet.toFixed(2)} to $${doubledBet.toFixed(2)}`);
      console.log(`  -> Drew: ${card.rank}${card.suit} | New value: ${newValue}`);
      if (isBusted) {
        console.log(`  -> BUSTED at ${newValue}`);
      }

      if (roundFlagsRef.current.splitUsed) {
        roundFlagsRef.current.das = true;
      }

      nextHand = true;
      isDoubleAction = true;
    } else if (action === Action.Surrender) {
      newHand = { ...currentHand, isCompleted: true, hasSurrendered: true };
      nextHand = true;
      console.log(`  -> Surrendered, returns $${(currentHand.bet * 0.5).toFixed(2)} (50% of bet)`);
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

      console.log(`  -> Split pair: [${card1.rank}${card1.suit} + ${hand1.cards[1].rank}${hand1.cards[1].suit}] | [${card2.rank}${card2.suit} + ${hand2.cards[1].rank}${hand2.cards[1].suit}]`);
      console.log(`  -> Each hand bet: $${currentHand.bet.toFixed(2)}, total: $${(currentHand.bet * 2).toFixed(2)}`);

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
        playDealer(updatedHands);
      }
    }
  };

  const handleInsuranceDecision = (choice: 'insure' | 'decline' | 'even') => {
    if (!insuranceOffered) return;
    const mainBet = playerHands[0]?.bet ?? 0;
    const maxInsurance = Math.min(mainBet / 2, bankroll);
    let placed = 0;
    let even = false;

    if (choice === 'insure') {
      placed = maxInsurance > 0 ? Math.round(maxInsurance * 100) / 100 : 0;
      if (placed > 0) setBankroll((b) => Math.round((b - placed) * 100) / 100);
      console.log(`[INSURANCE] Bought: $${placed.toFixed(2)} (max: $${maxInsurance.toFixed(2)})`);
    } else if (choice === 'even') {
      const pVal = calculateHandValue(playerHands[0]?.cards ?? []);
      const isBJ = pVal === 21 && (playerHands[0]?.cards.length ?? 0) === 2;
      if (!isBJ) return;
      even = true;
      placed = 0;
      console.log(`[INSURANCE] Even Money taken (1:1 payout locked)`);
    } else {
      console.log(`[INSURANCE] Declined`);
    }

    setInsuranceBet(placed);
    setEvenMoneyTaken(even);
    setInsuranceOffered(false);

    // Peek dealer for blackjack (without revealing in UI)
    const peekCards = dealerHand.cards.map((c, idx) => (idx === 1 ? { ...c, isHidden: false } : c));
    const dHasBJ = calculateHandValue(peekCards) === 21 && peekCards.length === 2;

    if (dHasBJ || even) {
      // Reveal dealer cards and resolve immediately (dealer blackjack or even-money chosen)
      const revealedDealerHand = { ...dealerHand, cards: peekCards };
      setDealerHand(revealedDealerHand);
      setTimeout(() => resolveRound(revealedDealerHand, [...playerHands]), 500);
      return;
    }

    // No dealer blackjack: insurance loses if any, keep dealer card hidden, continue to player turn
    setGameState(SimState.PlayerTurn);
  };

  const playDealer = (handsToUse?: Hand[]) => {
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
      setTimeout(() => resolveRound(finalHand, handsToUse), 1000);
    }, 500);
  };

  const resolveRound = (finalDealerHand?: Hand, handsOverride?: Hand[]) => {
    setGameState(SimState.Resolving);

    // 使用传入的finalDealerHand，如果没有则用状态中的（用于instant blackjack情况）
    const dHand = finalDealerHand || dealerHand;
    const hands = handsOverride || playerHands;

    let payout = 0;
    // Insurance payout (if dealer has blackjack) and Even Money handling will be applied below
    const dVal = calculateHandValue(dHand.cards);
    const dBusted = dVal > 21;
    const dHasBJ = dVal === 21 && dHand.cards.length === 2;

    console.log('\n=== ROUND RESOLUTION ===');
    console.log(`Dealer: ${dHand.cards.map(c => c.rank + c.suit).join(',')} | Value: ${dVal} | ${dBusted ? 'BUSTED' : dHasBJ ? 'BLACKJACK' : 'STAND'}`);

    hands.forEach((h, idx) => {
      const pVal = calculateHandValue(h.cards);
      const pHasBJ = pVal === 21 && h.cards.length === 2;
      if (pHasBJ) {
        roundFlagsRef.current.hadBlackjack = true;
      }

      console.log(`\nPlayer Hand ${idx + 1}: ${h.cards.map(c => c.rank + c.suit).join(',')} | Value: ${pVal} | Bet: $${h.bet.toFixed(2)}`);

      // Surrender: 返回一半本金
      if (h.hasSurrendered) {
        payout += h.bet * 0.5;
        console.log(`  -> SURRENDERED | Return: $${(h.bet * 0.5).toFixed(2)}`);
        return;
      }

      // Player bust: 输掉全部，不返还任何钱
      if (h.isBusted) {
        console.log(`  -> BUSTED at ${pVal} | Loss: -$${h.bet.toFixed(2)}`);
        return;
      }

      // Player Blackjack vs Dealer Blackjack: Push，返还本金
      if (pHasBJ && dHasBJ) {
        if (evenMoneyTaken) {
          payout += h.bet * 2;
          console.log(`  -> BLACKJACK vs BJ (even money) | Return: $${(h.bet * 2).toFixed(2)}`);
        } else {
          payout += h.bet;
          console.log(`  -> BLACKJACK vs BJ (push) | Return: $${h.bet.toFixed(2)}`);
        }
        return;
      }

      // Player Blackjack vs No Dealer Blackjack: 按照规则赔付(3:2或6:5) + 本金
      if (pHasBJ && !dHasBJ) {
        if (evenMoneyTaken) {
          const win = h.bet * 2;
          payout += win;
          console.log(`  -> BLACKJACK (even money) | Win: $${win.toFixed(2)}`);
          return;
        }
        const win = h.bet * (1 + rules.blackjackPayout);
        payout += win;
        console.log(`  -> BLACKJACK WIN | Payout: $${win.toFixed(2)} (${(rules.blackjackPayout * 100).toFixed(0)}%)`);
        return;
      }

      // Dealer bust: Player wins，返还本金 + 奖金
      if (dBusted) {
        payout += h.bet * 2;
        console.log(`  -> DEALER BUSTED at ${dVal} | Win: $${(h.bet * 2).toFixed(2)}`);
        return;
      }

      // 比点数
      if (pVal > dVal) {
        payout += h.bet * 2;
        console.log(`  -> WIN | ${pVal} > ${dVal} | Win: $${(h.bet * 2).toFixed(2)}`);
      } else if (pVal === dVal) {
        payout += h.bet;
        console.log(`  -> PUSH | Both ${pVal} | Return: $${h.bet.toFixed(2)}`);
      } else {
        console.log(`  -> LOSS | ${pVal} < ${dVal} | Loss: -$${h.bet.toFixed(2)}`);
      }
    });

    // Insurance settle after knowing dealer blackjack outcome
    if (insuranceBet > 0) {
      if (dHasBJ) {
        payout += insuranceBet * 3;
        console.log(`\nINSURANCE WON | Bet: $${insuranceBet.toFixed(2)} | Win: $${(insuranceBet * 3).toFixed(2)}`);
      } else {
        console.log(`\nINSURANCE LOST | Bet: $${insuranceBet.toFixed(2)} | Loss: -$${insuranceBet.toFixed(2)}`);
      }
    }

    console.log(`\nROUND TOTAL PAYOUT: $${payout.toFixed(2)}`);

    setBankroll((b) => {
      const totalBet = hands.reduce((sum, h) => sum + h.bet, 0);
      const newBank = b + payout;
      const inferredStart = b + totalBet;
      const delta = newBank - inferredStart;
      
      console.log('\nBankroll Settlement:');
      console.log(`  Before payout: $${b.toFixed(2)}`);
      console.log(`  Total bet: $${totalBet.toFixed(2)}`);
      console.log(`  Round payout: $${payout.toFixed(2)}`);
      console.log(`  After payout: $${newBank.toFixed(2)}`);
      console.log(`  Net delta: ${delta >= 0 ? '+' : ''}$${delta.toFixed(2)}`);
      console.log('=====================================\n');
      
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
      setInsuranceBet(0);
      setInsuranceOffered(false);
      setEvenMoneyTaken(false);
      setGameState(SimState.Betting);
    }, 2500);
  };

  const resetGame = () => {
    setGameState(SimState.Setup);
    setPlayerHands([]);
    setActiveHandIndex(0);
    setDealerHand(createHand(null));
    setRoundResult(null);
    setInsuranceBet(0);
    setInsuranceOffered(false);
    setEvenMoneyTaken(false);
  };

  const restoreState = (savedState: any) => {
    if (!savedState) return;
    try {
      setGameState(savedState.gameState ?? SimState.Setup);
      setBankroll(savedState.bankroll ?? 100);
      setInitialBankroll(savedState.initialBankroll ?? null);
      setPeakBankroll(savedState.peakBankroll ?? null);
      setDeck(savedState.deck ?? []);
      setPlayerHands(savedState.playerHands ?? []);
      setActiveHandIndex(savedState.activeHandIndex ?? 0);
      setDealerHand(savedState.dealerHand ?? createHand());
      setRoundStartBankroll(savedState.roundStartBankroll ?? null);
      setRoundResult(savedState.roundResult ?? null);
      setInsuranceBet(savedState.insuranceBet ?? 0);
      setInsuranceOffered(savedState.insuranceOffered ?? false);
      setEvenMoneyTaken(savedState.evenMoneyTaken ?? false);
    } catch (e) {
      console.error('Failed to restore sim state:', e);
    }
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
    insuranceBet,
    insuranceOffered,
    evenMoneyTaken,
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
    restoreState,
    // Insurance
    handleInsuranceDecision,
  };
};
