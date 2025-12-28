import { Action, Card, GameRules, Rank } from '../types';

// --- Types ---

export interface EVResult {
  action: Action;
  ev: number;
}

export interface DealerDist {
  17: number;
  18: number;
  19: number;
  20: number;
  21: number;
  bust: number;
  bj: number; // Blackjack (natural 21)
}

// --- Constants ---

// Infinite Deck Probabilities
// 2-9: 1/13 each
// 10, J, Q, K: 4/13 total
// A: 1/13
const PROB_CARD = (val: number): number => {
  if (val >= 2 && val <= 9) return 1 / 13;
  if (val === 10) return 4 / 13;
  if (val === 11) return 1 / 13;
  return 0;
};

// Memoization Caches (reset per calc session if needed, or kept simple)
let dealerCache: Record<string, DealerDist> = {};
let playerCache: Record<string, number> = {};

export const clearEVCache = () => {
  dealerCache = {};
  playerCache = {};
};

// --- Dealer Distribution Logic ---

const getDealerRulesKey = (rules: GameRules, upCardVal: number) => {
  return `${upCardVal}-${rules.dealerHitSoft17 ? 'H17' : 'S17'}`;
};

/**
 * Calculates the probability distribution of the dealer's final hand.
 */
const getDealerOutcomeProbs = (
  currentVal: number,
  isSoft: boolean,
  rules: GameRules,
  isFirstCard: boolean = false
): DealerDist => {
  const cacheKey = `${currentVal}-${isSoft ? 'S' : 'H'}-${rules.dealerHitSoft17 ? 'H17' : 'S17'}`;
  
  // Base cases are not cached inside recursion usually to avoid overhead for trivial returns,
  // but for consistent struct return we can.
  // Note: We only strictly cache the Upcard entry point in the main wrapper, 
  // but caching intermediate states speeds up deep recursion.
  
  if (!isFirstCard && dealerCache[cacheKey]) return dealerCache[cacheKey];

  const dist: DealerDist = { 17: 0, 18: 0, 19: 0, 20: 0, 21: 0, bust: 0, bj: 0 };

  // Check Stand conditions
  if (currentVal > 21) {
    dist.bust = 1.0;
    return dist;
  }

  // Dealer Standing Rules
  let mustHit = false;
  if (currentVal < 17) {
    mustHit = true;
  } else if (currentVal === 17) {
    // H17 rule: Hit Soft 17
    if (isSoft && rules.dealerHitSoft17) mustHit = true;
    else mustHit = false; // Stand on Hard 17 or Soft 17 (if S17)
  } else {
    mustHit = false; // Stand on 18+
  }

  if (!mustHit) {
    // Dealer Stands
    if (currentVal === 21 && isFirstCard) dist.bj = 1.0; // Simplify: Logic usually handles BJ check before playing
    else (dist as any)[currentVal] = 1.0;
    return dist;
  }

  // Recursive Hit
  // Iterate cards 2 (val 2) through A (val 11)
  // Cards 2-9, 10 (includes JQK), 11 (Ace)
  const cardValues = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  for (const cardVal of cardValues) {
    const p = PROB_CARD(cardVal);
    
    let nextVal = currentVal + cardVal;
    let nextSoft = isSoft;

    if (cardVal === 11) nextSoft = true;

    if (nextVal > 21 && nextSoft) {
      nextVal -= 10;
      nextSoft = false; // Hardened
    }

    const subDist = getDealerOutcomeProbs(nextVal, nextSoft, rules, false);

    // Accumulate probabilities
    dist[17] += p * subDist[17];
    dist[18] += p * subDist[18];
    dist[19] += p * subDist[19];
    dist[20] += p * subDist[20];
    dist[21] += p * subDist[21];
    dist.bust += p * subDist.bust;
    dist.bj += p * subDist.bj;
  }

  if (!isFirstCard) dealerCache[cacheKey] = dist;
  return dist;
};

// --- Player EV Logic ---

/**
 * Calculate EV of "Standing" against a specific dealer distribution
 */
const calculateStandEV = (playerTotal: number, dealerDist: DealerDist): number => {
  if (playerTotal > 21) return -1; // Should not happen in Stand calc but safety

  let ev = 0;
  // Win if Dealer Busts
  ev += dealerDist.bust * 1.0;

  // Compare totals
  for (let d = 17; d <= 21; d++) {
    const p = (dealerDist as any)[d];
    if (playerTotal > d) ev += p * 1.0;
    else if (playerTotal < d) ev += p * -1.0;
    else ev += p * 0.0; // Push
  }
  
  return ev;
};

/**
 * Recursive function to find the MAX EV for a given hand state.
 * This effectively simulates "playing optimally" from this point forward.
 */
const calculateHandMaxEV = (
  total: number,
  isSoft: boolean,
  dealerDist: DealerDist,
  canDouble: boolean = false, // Not used in recursion usually, only top level
  canSplit: boolean = false,
  rules: GameRules
): number => {
  // Check Cache
  const cacheKey = `${total}-${isSoft ? 'S' : 'H'}`;
  if (playerCache[cacheKey] !== undefined) return playerCache[cacheKey];

  if (total > 21) return -1; // Busted

  // 1. Stand EV
  const evStand = calculateStandEV(total, dealerDist);

  // 2. Hit EV
  // Sum(P(card) * MaxEV(newHand))
  let evHit = 0;
  const cardValues = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  
  for (const c of cardValues) {
    let nextTotal = total + c;
    let nextSoft = isSoft || (c === 11);
    if (nextTotal > 21 && nextSoft) {
      nextTotal -= 10;
      nextSoft = false;
    }
    
    // Recursive call: What is the best I can do with the new hand?
    // Note: We don't allow Double/Split after a hit in standard recursion
    const nextEV = calculateHandMaxEV(nextTotal, nextSoft, dealerDist, false, false, rules);
    evHit += PROB_CARD(c) * nextEV;
  }

  // We only compare Hit vs Stand in the recursion (Basic Strategy Core)
  // Double/Split are only available at the root decision node usually, 
  // or specifically handled if "Double after Split" is being calc'd.
  // For the generic "Value of this hand state", we assume Hit or Stand.
  
  const maxEV = Math.max(evStand, evHit);
  playerCache[cacheKey] = maxEV;
  return maxEV;
};


// --- Top Level Entry Point ---

export const calculateAllActionEVs = (
  playerHandTotal: number,
  isSoft: boolean,
  isPair: boolean,
  pairRank: Rank | null, // 'A', '10', '9'...
  dealerUpVal: number,
  rules: GameRules
): EVResult[] => {
  // 1. Clear Caches for new scenario
  clearEVCache();

  // 2. Compute Dealer Distribution
  // Dealer starts with Upcard (val) + Unknown Hole Card
  // We simulate the dealer's final outcome by summing prob of hole cards
  // Hole card can be 2-11 (A) (Assuming dealer checked for BJ already or European No Hole Card style effectively for calculation)
  // Note: Standard US Blackjack, dealer checks for BJ. If we are here, dealer likely doesn't have blackjack.
  // For EV Calc MVP: We simulate dealer hand starting from Upcard value.
  const dealerDist = getDealerOutcomeProbs(dealerUpVal, dealerUpVal === 11, rules, true);

  // 3. Calculate Actions
  const results: EVResult[] = [];

  // --- STAND ---
  results.push({
    action: Action.Stand,
    ev: calculateStandEV(playerHandTotal, dealerDist)
  });

  // --- HIT ---
  // One card + Recursive Optimal
  let evHit = 0;
  [2, 3, 4, 5, 6, 7, 8, 9, 10, 11].forEach(c => {
    let nextTotal = playerHandTotal + c;
    let nextSoft = isSoft || (c === 11);
    if (nextTotal > 21 && nextSoft) { nextTotal -= 10; nextSoft = false; }
    
    // We get the max value of the next state
    evHit += PROB_CARD(c) * calculateHandMaxEV(nextTotal, nextSoft, dealerDist, false, false, rules);
  });
  results.push({ action: Action.Hit, ev: evHit });


  // --- DOUBLE ---
  // One card + Forced Stand + 2x Bet (Normalized to 1 unit: Expected Return / 1 unit)
  // Standard EV = (WinProb * 2 - LoseProb * 2).
  // In our units: 2 * (EV of single card hand forced stand).
  let evDouble = 0;
  [2, 3, 4, 5, 6, 7, 8, 9, 10, 11].forEach(c => {
    let nextTotal = playerHandTotal + c;
    // Handle soft logic for final stand calculation
    let nextSoft = isSoft || (c === 11);
    if (nextTotal > 21 && nextSoft) { nextTotal -= 10; nextSoft = false; }
    
    // Forced Stand
    evDouble += PROB_CARD(c) * calculateStandEV(nextTotal, dealerDist);
  });
  // The EV calculated is for the hand outcome. Since we bet 2 units, the swing is doubled.
  results.push({ action: Action.Double, ev: 2 * evDouble });


  // --- SURRENDER ---
  if (rules.surrender !== 'none') {
    results.push({ action: Action.Surrender, ev: -0.5 });
  }

  // --- SPLIT ---
  if (isPair && pairRank) {
    // EV Split = 2 * EV(Hand starting with [Card, NewCard])
    // Why 2*? Because we play two hands. The total expected return is sum of both.
    // If we normalize to "per initial hand", it is still sum of expected outcome of 2 units bet total.
    
    // Logic: Start with the single card value. Add one card. Then play optimally.
    let singleHandEV = 0;
    
    // Value of one card of the pair
    let cardVal = 0;
    if (['J','Q','K','10'].includes(pairRank)) cardVal = 10;
    else if (pairRank === 'A') cardVal = 11;
    else cardVal = parseInt(pairRank);

    // Iterating the second card received after split
    [2, 3, 4, 5, 6, 7, 8, 9, 10, 11].forEach(c => {
       let nextTotal = cardVal + c;
       let nextSoft = (cardVal === 11) || (c === 11);
       if (nextTotal > 21 && nextSoft) { nextTotal -= 10; nextSoft = false; }
       
       // Handling Split Aces: Usually one card only.
       if (pairRank === 'A' && !rules.doubleAfterSplit) { // Simplified logic for Split Aces
           // Forced Stand after one card usually
           singleHandEV += PROB_CARD(c) * calculateStandEV(nextTotal, dealerDist);
       } else {
           // Normal play (Hit/Stand/Double if allowed)
           // If DAS allowed, we should theoretically check Double. 
           // For MVP recursion, calculating HandMaxEV usually assumes Hit/Stand.
           // To support DAS perfectly, calculateHandMaxEV needs a flag.
           // For now, we assume standard optimal play (Hit/Stand) on split hands.
           singleHandEV += PROB_CARD(c) * calculateHandMaxEV(nextTotal, nextSoft, dealerDist, false, false, rules);
       }
    });

    results.push({ action: Action.Split, ev: 2 * singleHandEV });
  }

  return results.sort((a, b) => b.ev - a.ev);
};
