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
  simMinBet: 5 | 10 | 15 | 25 | 100;
  insuranceAllowed?: boolean;
  evenMoneyAllowed?: boolean;
  simDecisionDelay?: number; // seconds; delay between player actions in simulation
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
  maxStreak: number; // 历史最高连胜
  streakMilestones: number[]; // 已达成的里程碑 [10, 25, 50, 100, ...]
  simMaxMultiplier?: number | null; // Simulation 最大乘数（相对初始资金）
  simMaxDrawdown?: number | null; // 最大回撤（0-1比例）
  simCurrentWinStreak?: number; // 当前连赢（Simulation）
  simMaxWinStreak?: number; // 最大连赢（Simulation）
  simAchievements?: string[]; // Simulation 成就列表
  // Counting stats
  countingTcAccuracy?: number | null; // TC 准确率 (0-1)
  countingAvgEntryTime?: number | null; // 最近10轮平均输入时间（秒）
  countingCurrentStreak?: number; // 当前连对（Counting）
  countingBestStreak?: number; // 最佳连对（Counting）
}

export enum ViewMode {
  Rules = 'RULES',
  Strategy = 'STRATEGY',
  Practice = 'PRACTICE',
  Counting = 'COUNTING',
  Simulation = 'SIMULATION',
  Stats = 'STATS',
  Scenario = 'SCENARIO', // Guided learning specific
}

export enum SimState {
  Setup = 'SETUP', // Bankroll config
  Betting = 'BETTING',
  Dealing = 'DEALING',
  Insurance = 'INSURANCE',
  PlayerTurn = 'PLAYER_TURN',
  DealerTurn = 'DEALER_TURN',
  Resolving = 'RESOLVING',
}

// --- Counting Module Types ---

export enum CountingState {
  Setup = 'SETUP',
  Playing = 'PLAYING',
  Feedback = 'FEEDBACK',
}

export type CountingSystem = 'Hi-Lo';
export type TimerStart = 'after-final-card' | 'from-round-start';
export type InputFieldType = 'decksRemaining' | 'rcBefore' | 'deltaRC' | 'rcAfter' | 'trueCount';

export type FieldMode = 'hidden' | 'input' | 'computed';

export interface CountingSetupConfig {
  numPlayers: number; // 1-5
  autoPlayStrategy: 'basic'; // Future: 'aggressive' | 'conservative' | 'random'
  decisionDelay: number; // 0, 1, 2, 3 (seconds)
  countingSystem: CountingSystem; // 'Hi-Lo' only for now
  showBreakdown: boolean;
  fieldModes: Record<InputFieldType, FieldMode>;
  timerStart: TimerStart;
}

export interface CountingSessionSnapshot {
  deckCount: number;
  dealerHitSoft17: boolean;
  doubleAfterSplit: boolean;
  surrender: 'none' | 'early' | 'late';
  numPlayers: number;
  decisionDelay: number;
}

export interface CountingPlayerHand {
  cards: Card[];
  isSplit: boolean; // If this is a split hand
  splitIndex?: number; // e.g., Hand A = 0, Hand B = 1
}

export interface CountingRound {
  roundNumber: number;
  dealerHand: Card[];
  playerHands: (CountingPlayerHand[] | null)[]; // null for empty positions
  allCards: Card[]; // All cards revealed in this round
}

export interface CountingInputs {
  decksRemaining?: number;
  rcBefore?: number;
  deltaRC?: number;
  rcAfter?: number;
  trueCount?: number;
}

export interface CountingFeedback {
  isCorrect: boolean;
  errors: {
    field: InputFieldType;
    userValue: number | undefined;
    correctValue: number;
    errorType: 'mapping' | 'delta-sum' | 'rc-update' | 'tc-conversion';
  }[];
  correctInputs: CountingInputs;
}

export interface CountingStats {
  totalRounds: number;
  correctRounds: number;
  entryTimes: number[]; // Last N entry times (for averaging)
  currentStreak: number;
  bestStreak: number;
}

