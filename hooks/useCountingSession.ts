import { useState, useRef, useCallback } from 'react';
import {
  GameRules,
  Card,
  Hand,
  Action,
  CountingState,
  CountingSetupConfig,
  CountingSessionSnapshot,
  CountingRound,
  CountingPlayerHand,
  CountingInputs,
  CountingFeedback,
  InputFieldType,
  FieldMode,
} from '../types';
import {
  createDeck,
  shuffleDeck,
  calculateHandValue,
  createHand,
  playDealerTurn,
} from '../services/blackjackLogic';
import { getBasicStrategyAction } from '../services/strategyEngine';
import {
  calculateDeltaRC,
  calculateTrueCount,
  calculateDecksRemaining,
  recordCountingResult,
} from '../services/countingService';

const COUNTING_SESSION_KEY = 'bj_counting_session_v1';

interface CountingSessionState {
  config: CountingSetupConfig;
  snapshot: CountingSessionSnapshot | null;
  state: CountingState;
  roundNumber: number;
  deck: Card[];
  cardsDealtTotal: number; // Total cards dealt in session
  runningCount: number;
  currentRound: CountingRound | null;
  userInputs: CountingInputs;
  feedback: CountingFeedback | null;
  timerStart: number | null; // Timestamp when timer started
  entryTime: number | null; // Time taken to enter (in seconds)
}

export const useCountingSession = (globalRules: GameRules) => {
  const [config, setConfig] = useState<CountingSetupConfig>({
    numPlayers: 1,
    autoPlayStrategy: 'basic',
    decisionDelay: 0,
    countingSystem: 'Hi-Lo',
    showBreakdown: false,
    fieldModes: {
      decksRemaining: 'computed',
      rcBefore: 'computed',
      deltaRC: 'input',
      rcAfter: 'computed',
      trueCount: 'input',
    },
    timerStart: 'after-final-card',
  });

  const [snapshot, setSnapshot] = useState<CountingSessionSnapshot | null>(null);
  const [state, setState] = useState<CountingState>(CountingState.Setup);
  const [roundNumber, setRoundNumber] = useState(0);
  const [deck, setDeck] = useState<Card[]>([]);
  const [cardsDealtTotal, setCardsDealtTotal] = useState(0);
  const [runningCount, setRunningCount] = useState(0);
  const [currentRound, setCurrentRound] = useState<CountingRound | null>(null);
  const [userInputs, setUserInputs] = useState<CountingInputs>({});
  const [feedback, setFeedback] = useState<CountingFeedback | null>(null);
  const [timerStart, setTimerStart] = useState<number | null>(null);
  const [entryTime, setEntryTime] = useState<number | null>(null);
  const [isWaiting, setIsWaiting] = useState(false);
  const [waitingPlayerIndex, setWaitingPlayerIndex] = useState<number | null>(null);

  const isPlayingRef = useRef(false);

  // Update config
  const updateConfig = (updates: Partial<CountingSetupConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  // Start counting session
  const startSession = () => {
    // Create snapshot
    const newSnapshot: CountingSessionSnapshot = {
      deckCount: globalRules.deckCount,
      dealerHitSoft17: globalRules.dealerHitSoft17,
      doubleAfterSplit: globalRules.doubleAfterSplit,
      surrender: globalRules.surrender,
      numPlayers: config.numPlayers,
      decisionDelay: config.decisionDelay,
    };

    setSnapshot(newSnapshot);
    setRoundNumber(0);
    setRunningCount(0);
    setCardsDealtTotal(0);
    setDeck(shuffleDeck(createDeck(globalRules.deckCount)));
    setState(CountingState.Playing);
    setIsWaiting(false);
    setWaitingPlayerIndex(null);
    
    // Start first round
    setTimeout(() => {
      playRound(
        shuffleDeck(createDeck(globalRules.deckCount)),
        0,
        0,
        1,
        newSnapshot
      );
    }, 100);
  };

  // Play a round
  const playRound = async (
    currentDeck: Card[],
    currentRC: number,
    totalCardsDealt: number,
    round: number,
    sessionSnapshot: CountingSessionSnapshot
  ) => {
    if (isPlayingRef.current) return;
    isPlayingRef.current = true;

    // Check if we need to reshuffle (< 52 cards left)
    if (currentDeck.length < 52) {
      currentDeck = shuffleDeck(createDeck(sessionSnapshot.deckCount));
      currentRC = 0; // Reset RC on shuffle
      totalCardsDealt = 0;
    }

    setRunningCount(currentRC);
    setCardsDealtTotal(totalCardsDealt);
    setRoundNumber(round);
    
    // Initialize userInputs with 0 for 'input' mode fields
    const initialInputs: CountingInputs = {};
    (['deltaRC', 'rcAfter', 'trueCount', 'decksRemaining', 'rcBefore'] as InputFieldType[]).forEach(field => {
      if (config.fieldModes[field] === 'input') {
        initialInputs[field] = 0;
      }
    });
    setUserInputs(initialInputs);
    
    setFeedback(null);
    setEntryTime(null);

    // Start timer if configured for round start
    if (config.timerStart === 'from-round-start') {
      setTimerStart(Date.now());
    }

    const playerHands: (CountingPlayerHand[] | null)[] = Array(sessionSnapshot.numPlayers).fill(null);
    const dealerHand: Hand = createHand();

    // Initial deal (2 cards to each player + dealer)
    for (let i = 0; i < 2; i++) {
      for (let p = 0; p < sessionSnapshot.numPlayers; p++) {
        if (!playerHands[p]) playerHands[p] = [{ cards: [], isSplit: false }];
        const card = currentDeck.pop()!;
        playerHands[p]![0].cards.push(card);
        totalCardsDealt++;
      }
      
      const dealerCard = currentDeck.pop()!;
      if (i === 1) dealerCard.isHidden = true; // Hide hole card
      dealerHand.cards.push(dealerCard);
      totalCardsDealt++;
    }

    // Set initial round immediately after dealing to show cards on UI
    const initialAllCards: Card[] = [];
    dealerHand.cards.forEach(c => initialAllCards.push(c));
    playerHands.forEach(hands => {
      if (hands) {
        hands.forEach(hand => {
          hand.cards.forEach(c => initialAllCards.push(c));
        });
      }
    });

    const initialRound: CountingRound = {
      roundNumber: round,
      dealerHand: dealerHand.cards,
      playerHands: playerHands,
      allCards: initialAllCards,
    };

    setCurrentRound(initialRound);
    setDeck(currentDeck);
    setCardsDealtTotal(totalCardsDealt);

    // Delay if configured
    if (config.decisionDelay > 0) {
      setWaitingPlayerIndex(null);
      setIsWaiting(true);
      await new Promise(resolve => setTimeout(resolve, config.decisionDelay * 1000));
      setIsWaiting(false);
      setWaitingPlayerIndex(null);
    }

    // Play each player's hand using basic strategy
    for (let p = 0; p < sessionSnapshot.numPlayers; p++) {
      if (!playerHands[p]) continue;
      
      for (let h = 0; h < playerHands[p]!.length; h++) {
        const hand = playerHands[p]![h];
        
        // Check for blackjack
        if (hand.cards.length === 2 && calculateHandValue(hand.cards) === 21) {
          continue; // Stand on blackjack
        }

        // Play hand using basic strategy
        let handComplete = false;
        while (!handComplete) {
          const handValue = calculateHandValue(hand.cards);
          if (handValue >= 21) {
            handComplete = true;
            break;
          }

          // Get basic strategy action
          const dealerUpcard = dealerHand.cards.find(c => !c.isHidden)!;
          
          // Create a temporary Hand object for strategy engine
          const tempHand: Hand = {
            cards: hand.cards,
            bet: 0,
            isCompleted: false,
            isBusted: false,
            isBlackjack: false,
            hasDoubled: false,
            hasSurrendered: false,
          };
          
          const action = getBasicStrategyAction(
            tempHand,
            dealerUpcard,
            {
              ...globalRules,
              dealerHitSoft17: sessionSnapshot.dealerHitSoft17,
              doubleAfterSplit: sessionSnapshot.doubleAfterSplit,
              surrender: sessionSnapshot.surrender,
            }
          );

          // Show delay before executing the chosen action so UI can display spinner ahead of the move
          if (config.decisionDelay > 0) {
            setIsWaiting(true);
            setWaitingPlayerIndex(p);
            await new Promise(resolve => setTimeout(resolve, config.decisionDelay * 1000));
            setIsWaiting(false);
            setWaitingPlayerIndex(null);
          }

          if (action === Action.Hit || action === Action.Double) {
            const card = currentDeck.pop()!;
            hand.cards.push(card);
            totalCardsDealt++;
            
            // Update round with new card
            const updatedAllCards: Card[] = [];
            dealerHand.cards.forEach(c => updatedAllCards.push(c));
            playerHands.forEach(hands => {
              if (hands) {
                hands.forEach(hand => {
                  hand.cards.forEach(c => updatedAllCards.push(c));
                });
              }
            });
            setCurrentRound({
              roundNumber: round,
              dealerHand: dealerHand.cards,
              playerHands: playerHands,
              allCards: updatedAllCards,
            });
            setCardsDealtTotal(totalCardsDealt);
            
            if (action === Action.Double) {
              handComplete = true;
            }
          } else if (action === Action.Split && hand.cards.length === 2 && hand.cards[0].rank === hand.cards[1].rank) {
            // Handle split
            const card1 = hand.cards[0];
            const card2 = hand.cards[1];
            
            // Reset current hand with first card
            hand.cards = [card1];
            hand.isSplit = true;
            hand.splitIndex = 0;
            
            // Create second hand
            const newHand: CountingPlayerHand = {
              cards: [card2],
              isSplit: true,
              splitIndex: 1,
            };
            playerHands[p]!.push(newHand);
            
            // Deal one more card to each
            hand.cards.push(currentDeck.pop()!);
            totalCardsDealt++;
            
            // Update round after split
            const updatedAllCards: Card[] = [];
            dealerHand.cards.forEach(c => updatedAllCards.push(c));
            playerHands.forEach(hands => {
              if (hands) {
                hands.forEach(hand => {
                  hand.cards.forEach(c => updatedAllCards.push(c));
                });
              }
            });
            setCurrentRound({
              roundNumber: round,
              dealerHand: dealerHand.cards,
              playerHands: playerHands,
              allCards: updatedAllCards,
            });
            setCardsDealtTotal(totalCardsDealt);
            
            // Will continue playing this hand, then the new hand will be played in the loop
          } else {
            // Stand or Surrender
            handComplete = true;
          }
        }
      }
    }

    // Reveal dealer's hole card
    dealerHand.cards.forEach(c => c.isHidden = false);
    
    // Update round with revealed dealer card
    const revealedAllCards: Card[] = [];
    dealerHand.cards.forEach(c => revealedAllCards.push(c));
    playerHands.forEach(hands => {
      if (hands) {
        hands.forEach(hand => {
          hand.cards.forEach(c => revealedAllCards.push(c));
        });
      }
    });
    setCurrentRound({
      roundNumber: round,
      dealerHand: dealerHand.cards,
      playerHands: playerHands,
      allCards: revealedAllCards,
    });

    // Play dealer's hand
    const { updatedDeck: finalDeck, finalHand: finalDealerHand } = playDealerTurn(
      currentDeck,
      dealerHand,
      {
        ...globalRules,
        dealerHitSoft17: sessionSnapshot.dealerHitSoft17,
      }
    );

    // Dealer acts without artificial delay

    // Collect all cards for the round
    const allCards: Card[] = [];
    finalDealerHand.cards.forEach(c => allCards.push(c));
    playerHands.forEach(hands => {
      if (hands) {
        hands.forEach(hand => {
          hand.cards.forEach(c => allCards.push(c));
        });
      }
    });

    // Update total cards dealt
    totalCardsDealt = totalCardsDealt + (finalDealerHand.cards.length - dealerHand.cards.length);

    const newRound: CountingRound = {
      roundNumber: round,
      dealerHand: finalDealerHand.cards,
      playerHands: playerHands,
      allCards: allCards,
    };

    setCurrentRound(newRound);
    setDeck(finalDeck);
    setCardsDealtTotal(totalCardsDealt);

    // Start timer if configured for after final card
    if (config.timerStart === 'after-final-card') {
      setTimerStart(Date.now());
    }

    isPlayingRef.current = false;
  };

  // Submit count
  const submitCount = () => {
    if (!currentRound || !snapshot) return;

    const submitTime = Date.now();
    const elapsed = timerStart ? (submitTime - timerStart) / 1000 : 0;
    setEntryTime(elapsed);

    // Calculate correct values
    const deltaRC = calculateDeltaRC(currentRound.allCards);
    const rcBefore = runningCount;
    const rcAfter = rcBefore + deltaRC;
    const decksRemaining = calculateDecksRemaining(snapshot.deckCount, cardsDealtTotal + currentRound.allCards.length);
    const trueCount = calculateTrueCount(rcAfter, decksRemaining);

    const correctInputs: CountingInputs = {
      decksRemaining,
      rcBefore,
      deltaRC,
      rcAfter,
      trueCount,
    };

    // Validate user inputs
    const errors: CountingFeedback['errors'] = [];
    let isCorrect = true;

    (['deltaRC','rcAfter','trueCount','decksRemaining','rcBefore'] as InputFieldType[]).forEach(field => {
      const mode = config.fieldModes[field];
      if (mode !== 'input') return; // only validate user-entered fields
      const userValue = userInputs[field];
      const correctValue = correctInputs[field]!;
      if (userValue === undefined || userValue !== correctValue) {
        isCorrect = false;
        let errorType: 'mapping' | 'delta-sum' | 'rc-update' | 'tc-conversion' = 'mapping';
        if (field === 'deltaRC') errorType = 'delta-sum';
        else if (field === 'rcAfter' || field === 'rcBefore') errorType = 'rc-update';
        else if (field === 'trueCount') errorType = 'tc-conversion';
        errors.push({ field, userValue, correctValue, errorType });
      }
    });

    const newFeedback: CountingFeedback = {
      isCorrect,
      errors,
      correctInputs,
    };

    setFeedback(newFeedback);
    setState(CountingState.Feedback);

    // Record stats
    recordCountingResult(isCorrect, elapsed);

    // Update running count for next round
    setRunningCount(rcAfter);
  };

  // Next round
  const nextRound = () => {
    setState(CountingState.Playing);
    setFeedback(null);
    
    if (!snapshot) return;
    
    playRound(
      deck,
      runningCount,
      cardsDealtTotal + (currentRound?.allCards.length || 0),
      roundNumber + 1,
      snapshot
    );
  };

  // End session
  const endSession = () => {
    setState(CountingState.Setup);
    setSnapshot(null);
    setRoundNumber(0);
    setRunningCount(0);
    setCardsDealtTotal(0);
    setCurrentRound(null);
    setFeedback(null);
    setUserInputs({});
    setTimerStart(null);
    setEntryTime(null);
    clearSessionStorage();
  };

  // Update user input
  const updateUserInput = (field: InputFieldType, value: number) => {
    setUserInputs(prev => ({ ...prev, [field]: value }));
  };

  // Clear user inputs
  const clearUserInputs = () => {
    setUserInputs({});
  };

  // Save/Load session
  const saveSession = useCallback(() => {
    const sessionState: CountingSessionState = {
      config,
      snapshot,
      state,
      roundNumber,
      deck,
      cardsDealtTotal,
      runningCount,
      currentRound,
      userInputs,
      feedback,
      timerStart,
      entryTime,
    };
    
    try {
      localStorage.setItem(COUNTING_SESSION_KEY, JSON.stringify(sessionState));
    } catch (e) {
      console.error('Failed to save counting session:', e);
    }
  }, [config, snapshot, state, roundNumber, deck, cardsDealtTotal, runningCount, currentRound, userInputs, feedback, timerStart, entryTime]);

  const loadSession = useCallback(() => {
    try {
      const saved = localStorage.getItem(COUNTING_SESSION_KEY);
      if (!saved) return false;
      
      const sessionState: CountingSessionState = JSON.parse(saved);
      
      // Migrate old sessions: ensure fieldModes exists
      const migratedConfig = {
        ...sessionState.config,
        fieldModes: sessionState.config.fieldModes || {
          decksRemaining: 'computed',
          rcBefore: 'computed',
          deltaRC: 'input',
          rcAfter: 'computed',
          trueCount: 'input',
        },
      };
      
      setConfig(migratedConfig);
      setSnapshot(sessionState.snapshot);
      setState(sessionState.state);
      setRoundNumber(sessionState.roundNumber);
      setDeck(sessionState.deck);
      setCardsDealtTotal(sessionState.cardsDealtTotal);
      setRunningCount(sessionState.runningCount);
      setCurrentRound(sessionState.currentRound);
      setUserInputs(sessionState.userInputs);
      setFeedback(sessionState.feedback);
      setTimerStart(sessionState.timerStart);
      setEntryTime(sessionState.entryTime);
      
      return true;
    } catch (e) {
      console.error('Failed to load counting session:', e);
      return false;
    }
  }, []);

  const clearSessionStorage = () => {
    localStorage.removeItem(COUNTING_SESSION_KEY);
  };

  return {
    // State
    config,
    snapshot,
    state,
    roundNumber,
    deck,
    cardsDealtTotal,
    runningCount,
    currentRound,
    userInputs,
    feedback,
    timerStart,
    entryTime,
    isWaiting,
    waitingPlayerIndex,
    
    // Actions
    updateConfig,
    startSession,
    submitCount,
    nextRound,
    endSession,
    updateUserInput,
    clearUserInputs,
    saveSession,
    loadSession,
    clearSessionStorage,
  };
};
