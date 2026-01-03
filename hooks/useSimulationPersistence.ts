import React, { useState, useEffect } from 'react';
import { recordSimRoundStats, resetSimCurrentWinStreak, updateSimMaxMultiplier } from '../services/statsService';

interface SimulationState {
  bankroll: number;
  initialBankroll: number | null;
  peakBankroll: number | null;
  chipCounts: Record<number, number>;
  deck: any[];
  playerHands: any[];
  activeHandIndex: number;
  dealerHand: any;
  gameState: number;
  hintsEnabled: boolean;
  hasUsedHints: boolean;
  roundStartBankroll: number | null;
  roundResult: { delta: number; total: number } | null;
  roundsPlayed: number;
  insuranceBet?: number;
  insuranceOffered?: boolean;
  evenMoneyTaken?: boolean;
}

interface LeaveSummary {
  delta: number;
  multiplier: number;
  achievements: number;
  usedHints: boolean;
  hasPlayed: boolean;
  rounds: number;
}

export const useSimulationPersistence = (
  state: SimulationState,
  sessionAchievementsRef: React.MutableRefObject<Set<string>>,
  pendingSimStatsRef: React.MutableRefObject<{ delta: number; drawdown: number; achievements: string[] } | null>
) => {
  const SIM_STATE_KEY = 'bj_sim_state_v1';
  const [leaveSummary, setLeaveSummary] = useState<LeaveSummary | null>(null);

  // Save state to localStorage on every change
  useEffect(() => {
    const payload = {
      bankroll: state.bankroll,
      initialBankroll: state.initialBankroll,
      peakBankroll: state.peakBankroll,
      deck: state.deck,
      playerHands: state.playerHands,
      activeHandIndex: state.activeHandIndex,
      dealerHand: state.dealerHand,
      gameState: state.gameState,
      hintsEnabled: state.hintsEnabled,
      hasUsedHints: state.hasUsedHints,
      roundStartBankroll: state.roundStartBankroll,
      roundResult: state.roundResult,
      roundsPlayed: state.roundsPlayed,
      chipCounts: state.chipCounts,
      insuranceBet: state.insuranceBet ?? 0,
      insuranceOffered: state.insuranceOffered ?? false,
      evenMoneyTaken: state.evenMoneyTaken ?? false,
    };
    localStorage.setItem(SIM_STATE_KEY, JSON.stringify(payload));
  }, [state]);

  // Record round statistics
  useEffect(() => {
    if (!state.roundResult) return;
    if (state.hasUsedHints) {
      pendingSimStatsRef.current = null;
      return;
    }
    if (!pendingSimStatsRef.current) return;
    recordSimRoundStats(pendingSimStatsRef.current);
    pendingSimStatsRef.current = null;
  }, [state.roundResult, state.hasUsedHints, pendingSimStatsRef]);

  const clearPersistence = () => {
    localStorage.removeItem(SIM_STATE_KEY);
  };

  const generateLeaveSummary = (
    bankroll: number,
    initialBankroll: number | null,
    roundsPlayed: number,
    hasUsedHints: boolean
  ): LeaveSummary => {
    const base = initialBankroll ?? bankroll;
    const hasPlayed = roundsPlayed > 0;
    const totalValue = bankroll;
    const multiplier = base > 0 ? totalValue / base : 1;
    const delta = totalValue - base;
    const achievementsCount = hasUsedHints ? 0 : sessionAchievementsRef.current.size;

    return {
      delta,
      rounds: roundsPlayed,
      multiplier,
      achievements: achievementsCount,
      usedHints: hasUsedHints,
      hasPlayed,
    };
  };

  const handleLeaveTable = (
    bankroll: number,
    initialBankroll: number | null,
    roundsPlayed: number,
    hasUsedHints: boolean
  ) => {
    const summary = generateLeaveSummary(bankroll, initialBankroll, roundsPlayed, hasUsedHints);

    setLeaveSummary(summary);

    // 仅在有对局且未使用提示时更新统计，避免 Start Table 立刻 Leave 的误统计
    if (summary.hasPlayed && (initialBankroll ?? bankroll) > 0 && !hasUsedHints) {
      updateSimMaxMultiplier(summary.multiplier);
    }

    resetSimCurrentWinStreak();
    pendingSimStatsRef.current = null;
    sessionAchievementsRef.current.clear();
  };

  return {
    leaveSummary,
    setLeaveSummary,
    handleLeaveTable,
    clearPersistence,
  };
};
