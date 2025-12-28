export enum Suit {
  Hearts = '♥',
  Diamonds = '♦',
  Clubs = '♣',
  Spades = '♠',
}

export enum Rank {
  Two = '2', Three = '3', Four = '4', Five = '5', Six = '6',
  Seven = '7', Eight = '8', Nine = '9', Ten = '10',
  Jack = 'J', Queen = 'Q', King = 'K', Ace = 'A',
}

export interface Card {
  suit: Suit;
  rank: Rank;
  value: number; // 2-10, 10 for JQK, 11 for A (initially)
  isHidden?: boolean;
}

export enum Action {
  Hit = 'HIT',
  Stand = 'STAND',
  Double = 'DOUBLE',
  Split = 'SPLIT',
  Surrender = 'SURRENDER',
}

export enum HandType {
  Hard = 'HARD',
  Soft = 'SOFT',
  Pair = 'PAIR',
}

export interface Hand {
  cards: Card[];
  bet: number;
  isCompleted: boolean;
  isBusted: boolean;
  isBlackjack: boolean;
  hasDoubled: boolean;
  hasSurrendered: boolean;
  canSplit?: boolean; // Computed property
}

// Rules Configuration
export interface GameRules {
  deckCount: number;
  dealerHitSoft17: boolean; // H17 vs S17
  doubleAfterSplit: boolean;
  surrender: 'none' | 'early' | 'late';
  blackjackPayout: 1.5 | 1.2; // 3:2 vs 6:5
}

// Stats Structure
export interface StatEntry {
  correct: number;
  total: number;
}

export interface HeatmapData {
  [dateKey: string]: number; // dateKey: YYYY-MM-DD
}

export interface PlayerStats {
  hard: Record<string, StatEntry>; // Key format: "PlayerTotal-DealerUp"
  soft: Record<string, StatEntry>;
  pairs: Record<string, StatEntry>;
  heatmap: HeatmapData;
  streak: number;
}

export enum ViewMode {
  Rules = 'RULES',
  Strategy = 'STRATEGY',
  Practice = 'PRACTICE',
  Simulation = 'SIMULATION',
  Stats = 'STATS',
  Scenario = 'SCENARIO', // Guided learning specific
}

export enum SimState {
  Setup = 'SETUP', // Bankroll config
  Betting = 'BETTING',
  Dealing = 'DEALING',
  PlayerTurn = 'PLAYER_TURN',
  DealerTurn = 'DEALER_TURN',
  Resolving = 'RESOLVING',
}
