import { Action, Card, GameRules, Hand, HandType, Rank } from '../types';
import { calculateHandValue, getHandType } from './blackjackLogic';

// Basic Strategy Matrix Logic
// Returns the optimal action based on Rules, Player Hand, and Dealer Upcard

export const getBasicStrategyAction = (
  hand: Hand,
  dealerUpCard: Card,
  rules: GameRules
): Action => {
  const type = getHandType(hand.cards);
  const total = calculateHandValue(hand.cards);
  const dealerVal = dealerUpCard.value; // 2-11 (Ace is 11)

  // Surrender Logic (Late Surrender assumed as standard for MVP unless specified)
  if (rules.surrender !== 'none' && hand.cards.length === 2) {
    if (type === 'HARD' && total === 16 && (dealerVal === 9 || dealerVal === 10 || dealerVal === 11)) return Action.Surrender;
    if (type === 'HARD' && total === 15 && dealerVal === 10) return Action.Surrender;
  }

  // Pair Logic
  if (type === 'PAIR' && hand.cards.length === 2) {
    const pairRank = hand.cards[0].rank;
    
    // Always Split Aces and Eights
    if (pairRank === Rank.Ace || pairRank === Rank.Eight) return Action.Split;
    
    // Never Split Tens
    if (hand.cards[0].value === 10) return Action.Stand;

    // Split 9s
    if (pairRank === Rank.Nine) {
      if (dealerVal === 7 || dealerVal === 10 || dealerVal === 11) return Action.Stand;
      return Action.Split;
    }

    // Split 7s
    if (pairRank === Rank.Seven) {
      if (dealerVal <= 7) return Action.Split;
      return Action.Hit;
    }

    // Split 6s
    if (pairRank === Rank.Six) {
      if (dealerVal <= 6) return Action.Split; // Often split vs 2-6. Some charts say 2 is Hit if DAS off. Assuming DAS ON for simplicity or typical defaults.
       // Refinement: If DAS is OFF, split 6 vs 2 might be hit.
       // For MVP we stick to standard "DAS allowed" common charts.
      return Action.Hit;
    }
    
    // Split 4s (Only if DAS allowed usually, otherwise Hit)
    if (pairRank === Rank.Four) {
        if (rules.doubleAfterSplit && (dealerVal === 5 || dealerVal === 6)) return Action.Split;
        return Action.Hit;
    }

    // Split 2s and 3s
    if (pairRank === Rank.Two || pairRank === Rank.Three) {
      if (dealerVal <= 7 && rules.doubleAfterSplit) return Action.Split; // With DAS
      if (dealerVal <= 3 && !rules.doubleAfterSplit) return Action.Hit; // No DAS
      if (dealerVal <= 7) return Action.Split; // General fallback
      return Action.Hit;
    }

    // Pair of 5s -> Treat as Hard 10
    // (Proceed to Hard logic)
  }

  // Soft Totals
  if (type === 'SOFT') {
    // Soft 20 (A,9) -> Stand
    if (total >= 20) return Action.Stand;

    // Soft 19 (A,8) -> Double vs 6, else Stand. 
    // (Some rules say Double vs 5-6 if H17)
    if (total === 19) {
      if (rules.dealerHitSoft17 && dealerVal === 6) return Action.Double;
      return Action.Stand;
    }

    // Soft 18 (A,7)
    if (total === 18) {
      if (dealerVal >= 2 && dealerVal <= 6) return Action.Double; // Double 2-6
      if (dealerVal >= 9) return Action.Hit;
      return Action.Stand; // Stand vs 7, 8
    }

    // Soft 17 (A,6)
    if (total === 17) {
       if (dealerVal >= 3 && dealerVal <= 6) return Action.Double;
       return Action.Hit;
    }

    // Soft 15, 16 (A,4 / A,5)
    if (total === 15 || total === 16) {
      if (dealerVal >= 4 && dealerVal <= 6) return Action.Double;
      return Action.Hit;
    }

    // Soft 13, 14 (A,2 / A,3)
    if (total === 13 || total === 14) {
      if (dealerVal === 5 || dealerVal === 6) return Action.Double;
      return Action.Hit;
    }
  }

  // Hard Totals
  if (total >= 17) return Action.Stand;
  
  if (total === 16) {
    if (dealerVal >= 7) return Action.Hit;
    return Action.Stand;
  }
  
  if (total === 15) {
    if (dealerVal >= 7) return Action.Hit;
    return Action.Stand;
  }
  
  if (total === 13 || total === 14) {
    if (dealerVal >= 7) return Action.Hit;
    return Action.Stand;
  }
  
  if (total === 12) {
    if (dealerVal >= 4 && dealerVal <= 6) return Action.Stand;
    return Action.Hit;
  }
  
  if (total === 11) {
    if (rules.dealerHitSoft17 && dealerVal === 11) return Action.Double; // Double vs A if H17
    return Action.Double;
  }
  
  if (total === 10) {
    if (dealerVal >= 10) return Action.Hit;
    return Action.Double;
  }
  
  if (total === 9) {
    if (dealerVal >= 3 && dealerVal <= 6) return Action.Double;
    return Action.Hit;
  }
  
  return Action.Hit; // 8 or less
};

// Helper to get string key for Stats
export const getStrategyKey = (hand: Hand, dealerUpCard: Card): string => {
  const type = getHandType(hand.cards);
  const total = calculateHandValue(hand.cards);
  const dealerVal = dealerUpCard.value;
  
  if (type === 'PAIR') {
    return `${hand.cards[0].rank},${hand.cards[0].rank}-${dealerVal}`;
  }
  if (type === 'SOFT') {
    return `S${total}-${dealerVal}`;
  }
  return `H${total}-${dealerVal}`;
};

// Local lookup for explanations
export const getStrategyExplanation = (
    hand: Hand, 
    dealerUpCard: Card, 
    rules: GameRules, 
    action: Action
): string => {
    const type = getHandType(hand.cards);
    const total = calculateHandValue(hand.cards);
    const dVal = dealerUpCard.value;

    if (action === Action.Surrender) {
        return `Your hand (${total}) is statistically very weak against a dealer ${dVal}. Surrendering saves 50% of your bet, which is better than the expected loss from playing it out.`;
    }

    if (action === Action.Split) {
        if (hand.cards[0].rank === Rank.Ace) return "Always split Aces. You change one weak soft total into two hands starting with 11.";
        if (hand.cards[0].rank === Rank.Eight) return "Always split 8s. 16 is the worst possible hand. Splitting gives you two chances to make 18.";
        if (hand.cards[0].rank === Rank.Nine) return "Split 9s against weaker cards. Stand against 7 (dealer likely has 17) or 10/A (dealer too strong).";
        return "Splitting this pair maximizes your Expected Value (EV) by attacking the dealer's weak upcard.";
    }

    if (action === Action.Double) {
        if (type === 'SOFT') return `Double down. You have a safety net (the Ace) and the dealer shows weakness (${dVal}). You want more money on the table.`;
        if (total === 11) return "Always Double 11. You have a high probability of landing a 10-value card for a total of 21.";
        if (total === 10) return "Double 10 against a dealer showing less than 10. You are the statistical favorite.";
        return `Double. The dealer is showing a bust card (${dVal}). Capitalize on their weakness.`;
    }

    if (action === Action.Stand) {
        if (type === 'SOFT') return "You have a strong total. There is no benefit to taking another card.";
        if (type === 'PAIR' && hand.cards[0].value === 10) return "Never split 10s. A 20 is a winning hand ~80% of the time. Don't ruin a winning hand.";
        if (total >= 17) return "Always Stand on Hard 17 or higher. The risk of busting is too high.";
        if (total >= 12) return `Stand. The dealer has a weak card (${dVal}) and is likely to bust. Don't risk busting yourself.`;
        return "Stand to protect your hand.";
    }

    if (action === Action.Hit) {
        if (type === 'SOFT') return "Hit. You cannot bust, and your current total is not strong enough to win consistently.";
        if (total === 12 && (dVal === 2 || dVal === 3)) return "Hit against dealer 2 or 3. Their bust chance isn't high enough to justify standing on 12.";
        if (total >= 12) return "Hit. The dealer shows a strong card. You must improve your hand to have a fighting chance, even if risking a bust.";
        if (total <= 11) return "Always Hit. You cannot bust and need more value.";
        return "Hit to improve your hand.";
    }

    return "Follow Basic Strategy to minimize the house edge.";
};