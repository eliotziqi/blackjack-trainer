import React, { useState, useEffect, useMemo } from 'react';
import { GameRules, CountingState, InputFieldType, FieldMode } from '../types';
import { useCountingSession } from '../hooks/useCountingSession';
import { loadCountingStats, getCardValue, getCardBreakdown } from '../services/countingService';
import Card from '../components/Card';
import { calculateHandValue } from '../services/blackjackLogic';

interface CountingViewProps {
  globalRules: GameRules;
  isCountingLocked?: boolean;
  onLockStateRequest?: (isLocked: boolean) => void;
}

const CountingView: React.FC<CountingViewProps> = ({ 
  globalRules,
  isCountingLocked = false,
  onLockStateRequest 
}) => {
  const session = useCountingSession(globalRules);
  const [stats, setStats] = useState(loadCountingStats());

  // Notify parent about lock state
  useEffect(() => {
    const isLocked = session.state !== CountingState.Setup;
    if (onLockStateRequest) {
      onLockStateRequest(isLocked);
    }
  }, [session.state, onLockStateRequest]);

  // Load session on mount
  useEffect(() => {
    session.loadSession();
  }, []);

  // Save session on state change
  useEffect(() => {
    if (session.state !== CountingState.Setup) {
      session.saveSession();
    }
  }, [session.state, session.roundNumber, session.userInputs, session.feedback]);

  // Update stats when feedback changes
  useEffect(() => {
    if (session.feedback) {
      setStats(loadCountingStats());
    }
  }, [session.feedback]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const key = e.key.toUpperCase();

      // Feedback stage - only allow F and E
      if (session.state === CountingState.Feedback) {
        if (key === 'F') {
          e.preventDefault();
          session.nextRound();
        } else if (key === 'E') {
          e.preventDefault();
          session.endSession();
        }
        return;
      }

      // Setup stage - allow quick start
      if (session.state === CountingState.Setup) {
        if (key === 'F') {
          e.preventDefault();
          if (!isCountingLocked) {
            session.startSession();
          }
        }
        return;
      }

      // Playing stage
      if (session.state === CountingState.Playing && !session.feedback) {
        if (session.isWaiting) return; // Block confirm while delay is active
        if (key === 'F') {
          e.preventDefault();
          session.submitCount();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [session.state, session.feedback, session.isWaiting, isCountingLocked, session]);

  if (session.state === CountingState.Setup) {
    return <SetupPage session={session} globalRules={globalRules} />;
  }

  return <LivePage session={session} stats={stats} />;
};

// --- Setup Page ---
interface SetupPageProps {
  session: ReturnType<typeof useCountingSession>;
  globalRules: GameRules;
}

const SetupPage: React.FC<SetupPageProps> = ({ session, globalRules }) => {
  const { config, updateConfig, startSession } = session;
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const resetToDefault = () => {
    updateConfig({
      numPlayers: 1,
      autoPlayStrategy: 'basic',
      decisionDelay: 0,
      countingSystem: 'Hi-Lo',
      showBreakdown: false,
      requiredInputs: ['deltaRC', 'trueCount'],
      timerStart: 'after-final-card',
    });
  };

  const setFieldMode = (field: InputFieldType, mode: FieldMode) => {
    // Respect constraints: deltaRC and trueCount must be 'input'
    if (field === 'deltaRC' || field === 'trueCount') return;
    updateConfig({ fieldModes: { ...config.fieldModes, [field]: mode } });
  };

  return (
    <div className="space-y-6">
      <div className="mb-6 text-center pt-6">
        <h2 className="text-3xl font-bold text-green-400 mb-2">Counting Setup</h2>
        <p className="text-gray-400 text-sm">Configure your card counting training session</p>
      </div>

      {/* Table Rules Reference */}
      <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
        <h3 className="text-lg font-semibold text-gray-200 mb-3">Table Rules</h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Dealer:</span>
            <span className="text-gray-200 font-medium">{globalRules.dealerHitSoft17 ? 'Hit S17' : 'Stand S17'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">DAS:</span>
            <span className="text-gray-200 font-medium">{globalRules.doubleAfterSplit ? 'Yes' : 'No'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Surrender:</span>
            <span className="text-gray-200 font-medium capitalize">{globalRules.surrender}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Decks:</span>
            <span className="text-gray-200 font-medium">{globalRules.deckCount}</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-3">
          These rules are referenced from the Rules page. Modify them there if needed.
        </p>
      </div>

      {/* Table Flow */}
      <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
        <h3 className="text-lg font-semibold text-gray-200 mb-3">Table Flow</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2"># Players</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map(num => (
                <button
                  key={num}
                  onClick={() => updateConfig({ numPlayers: num })}
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    config.numPlayers === num
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Auto-play Strategy</label>
            <div className="bg-gray-700 rounded px-4 py-2 text-gray-300">
              Basic (fixed)
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Players will follow basic strategy. This drives the dealing flow only.
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Decision Delay</label>
            <div className="flex gap-2">
              {[0, 1, 2, 3].map(delay => (
                <button
                  key={delay}
                  onClick={() => updateConfig({ decisionDelay: delay })}
                  className={`px-4 py-2 rounded font-medium transition-colors ${
                    config.decisionDelay === delay
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {delay}s
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Time between each player/dealer action
            </p>
          </div>
        </div>
      </div>

      {/* Counting Rule */}
      <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
        <h3 className="text-lg font-semibold text-gray-200 mb-3">Counting Rule</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Counting System</label>
            <div className="bg-gray-700 rounded px-4 py-2 text-gray-300">
              Hi-Lo (fixed)
            </div>
          </div>

          <div>
            {/* Hi-Lo Scoring System Dropdown */}
            <div className="mt-3 ml-6">
              <button
                type="button"
                onClick={() => setBreakdownOpen(!breakdownOpen)}
                className="flex items-center gap-2 text-xs px-2 py-1 rounded border border-gray-700 bg-gray-900 hover:bg-gray-800 text-gray-300"
              >
                <span className={`transform transition-transform ${breakdownOpen ? 'rotate-90' : ''}`}>▶</span>
                <span>Hi-Lo Scoring System</span>
              </button>
              {breakdownOpen && (
                <div className="mt-3 bg-gray-900 border border-gray-700 rounded p-3">
                  <div className="text-xs text-gray-400 mb-2">Mapping:</div>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="bg-gray-800 rounded p-2 border border-gray-700">
                      <div className="text-gray-300 font-semibold mb-1">2–6</div>
                      <div className="font-mono font-bold text-green-400">+1</div>
                    </div>
                    <div className="bg-gray-800 rounded p-2 border border-gray-700">
                      <div className="text-gray-300 font-semibold mb-1">7–9</div>
                      <div className="font-mono font-bold text-gray-400">0</div>
                    </div>
                    <div className="bg-gray-800 rounded p-2 border border-gray-700">
                      <div className="text-gray-300 font-semibold mb-1">10–A</div>
                      <div className="font-mono font-bold text-red-400">−1</div>
                    </div>
                  </div>
                  <div className="mt-3 text-[11px] text-gray-300 leading-relaxed space-y-2">
                    <p>Hi-Lo is a basic card counting system that tracks cards already dealt to infer the composition of the remaining shoe.</p>
                    <p>
                      <span className="font-semibold text-gray-200">Low Cards (2–6)</span>: When low cards have been dealt in large quantities, the remaining shoe becomes richer in high cards. High cards favor the player (easier to make 20/21 or Blackjack), so each low card dealt counts as <span className="font-mono text-green-400">+1</span>.
                    </p>
                    <p>
                      <span className="font-semibold text-gray-200">Neutral Cards (7–9)</span>: These cards have minimal impact on the ratio of high to low cards in the remaining shoe and don't significantly affect player vs. dealer advantage, so they count as <span className="font-mono text-gray-400">0</span>.
                    </p>
                    <p>
                      <span className="font-semibold text-gray-200">High Cards (10–A)</span>: When high cards have been dealt, the remaining shoe becomes depleted in high cards. The player has a harder time making large hands or Blackjack, so each high card dealt counts as <span className="font-mono text-red-400">−1</span>.
                    </p>
                    <p className="text-gray-400">Sum all card values to get the Running Count (RC); divide RC by the number of remaining decks and round to get the True Count (TC).</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Inputs / Modes */}
      <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
        <h3 className="text-lg font-semibold text-gray-200 mb-3">Inputs & Modes</h3>

        <div className="space-y-4">
          {([
            { field: 'decksRemaining', label: 'Decks Remaining', allow: ['hidden','input','computed'] },
            { field: 'rcBefore', label: 'RC Before', allow: ['hidden','input','computed'] },
            { field: 'deltaRC', label: 'ΔRC', allow: ['input'] },
            { field: 'rcAfter', label: 'RC After', allow: ['hidden','input','computed'] },
            { field: 'trueCount', label: 'True Count (TC)', allow: ['input'] },
          ] as Array<{ field: InputFieldType; label: string; allow: FieldMode[] }> ).map(item => (
            <div key={item.field} className="flex items-center justify-between">
              <span className="text-sm text-gray-300 w-1/3">{item.label}</span>
              <div className="flex gap-2">
                {(['hidden','input','computed'] as FieldMode[]).map(mode => (
                  <button
                    key={mode}
                    disabled={!item.allow.includes(mode)}
                    onClick={() => setFieldMode(item.field, mode)}
                    className={`px-3 py-1 rounded text-xs font-medium border ${
                      config.fieldModes[item.field] === mode
                        ? 'bg-green-600 text-white border-green-700'
                        : 'bg-gray-700 text-gray-300 border-gray-600 hover:bg-gray-600'
                    } ${!item.allow.includes(mode) ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    {mode === 'hidden' ? 'Hide' : mode === 'input' ? 'Input' : 'Auto'}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-700">
          <label className="block text-sm text-gray-400 mb-2">Timer Start</label>
          <div className="flex gap-2">
            <button
              onClick={() => updateConfig({ timerStart: 'after-final-card' })}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                config.timerStart === 'after-final-card'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              After Final Card
            </button>
            <button
              onClick={() => updateConfig({ timerStart: 'from-round-start' })}
              className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                config.timerStart === 'from-round-start'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              From Round Start
            </button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={startSession}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          Start Counting <span className="text-xs opacity-75">(F)</span>
        </button>
        <button
          onClick={resetToDefault}
          className="bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-3 px-6 rounded-lg transition-colors"
        >
          Reset to Default
        </button>
      </div>
    </div>
  );
};

// --- Live Page ---
interface LivePageProps {
  session: ReturnType<typeof useCountingSession>;
  stats: ReturnType<typeof loadCountingStats>;
}

const LivePage: React.FC<LivePageProps> = ({ session, stats }) => {
  const {
    config,
    snapshot,
    roundNumber,
    currentRound,
    userInputs,
    feedback,
    timerStart,
    isWaiting,
    waitingPlayerIndex,
    updateUserInput,
    submitCount,
    nextRound,
    endSession,
  } = session;

  const [currentTime, setCurrentTime] = useState(Date.now());

  // Update timer
  useEffect(() => {
    if (timerStart && !feedback) {
      const interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 100);
      return () => clearInterval(interval);
    }
  }, [timerStart, feedback]);

  const elapsedTime = timerStart ? (currentTime - timerStart) / 1000 : 0;

  const handleInputChange = (field: InputFieldType, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      updateUserInput(field, numValue);
    }
  };

  // Ensure fieldModes exists (safety check for old sessions)
  const fieldModes = config.fieldModes || {
    decksRemaining: 'computed',
    rcBefore: 'computed',
    deltaRC: 'input',
    rcAfter: 'computed',
    trueCount: 'input',
  };

  const snapshotText = snapshot 
    ? `${snapshot.numPlayers} Player(s) • ${snapshot.decisionDelay}s Delay`
    : '';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-green-400">Counting</h2>
        {snapshotText && (
          <p className="text-sm text-gray-400 mt-1">{snapshotText}</p>
        )}
        <p className="text-sm text-gray-500 mt-1">Round #{roundNumber}</p>
      </div>

      {/* Timer */}
      {timerStart && !feedback && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
          <div className="text-center">
            <div className="text-sm text-gray-400 mb-1">Entry Time</div>
            <div className="text-3xl font-mono font-bold text-green-400">
              {elapsedTime.toFixed(1)}s
            </div>
          </div>
        </div>
      )}

      {/* Table Area */}
      {currentRound && (
        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
          {/* Dealer */}
          <div className="mb-6">
            <div className="text-sm text-gray-400 mb-2">Dealer</div>
            <div className="flex gap-2 flex-wrap items-center">
              {currentRound.dealerHand.map((card, idx) => (
                <Card key={idx} card={card} mini />
              ))}
              {/* Waiting indicator */}
              {isWaiting && waitingPlayerIndex === -1 && (
                <div className="ml-2 flex items-center gap-2 text-gray-400 text-sm">
                  <div className="animate-spin w-4 h-4 border-2 border-gray-600 border-t-green-400 rounded-full"></div>
                  <span>Thinking...</span>
                </div>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Total: {calculateHandValue(currentRound.dealerHand)}
            </div>
          </div>

          {/* Players */}
          <div className="space-y-4">
            {currentRound.playerHands.map((hands, idx) => (
              <div key={idx}>
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                  <span>Player {idx + 1}</span>
                  {isWaiting && waitingPlayerIndex === idx && (
                    <div className="flex items-center gap-2 text-gray-400 text-xs">
                      <div className="animate-spin w-3 h-3 border-2 border-gray-600 border-t-green-400 rounded-full"></div>
                      <span>Thinking...</span>
                    </div>
                  )}
                </div>
                {hands ? (
                  <div className="space-y-2">
                    {hands.map((hand, handIdx) => (
                      <div key={handIdx} className="flex items-start gap-3">
                        {hand.isSplit && (
                          <span className="text-xs text-gray-500 mt-2">
                            Hand {String.fromCharCode(65 + handIdx)}:
                          </span>
                        )}
                        <div>
                          <div className="flex gap-2 flex-wrap">
                            {hand.cards.map((card, cardIdx) => (
                              <Card key={cardIdx} card={card} mini />
                            ))}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Total: {calculateHandValue(hand.cards)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center text-gray-600">
                    Empty
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Card Breakdown (if enabled) */}
          {config.showBreakdown && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <div className="text-sm text-gray-400 mb-2">Hi-Lo Breakdown</div>
              <div className="flex flex-wrap gap-2">
                {getCardBreakdown(currentRound.allCards).map((item, idx) => (
                  <div
                    key={idx}
                    className="bg-gray-700 rounded px-2 py-1 text-xs font-mono"
                  >
                    <span className="text-gray-300">{item.card.rank}{item.card.suit}</span>
                    <span className={`ml-1 font-bold ${
                      item.value > 0 ? 'text-green-400' : item.value < 0 ? 'text-red-400' : 'text-gray-500'
                    }`}>
                      {item.value > 0 ? '+' : ''}{item.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Counting Panel */}
      {!feedback && (
        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
          <h3 className="text-lg font-semibold text-gray-200 mb-4">Enter Your Count</h3>
          
          <div className="space-y-3">
            {/* Decks Remaining */}
            <FieldRow
              label="Decks Remaining:"
              mode={fieldModes.decksRemaining}
              valueBox={(() => {
                if (!currentRound || !snapshot) return '—';
                const cardsCount = currentRound.allCards.length + 0; // current round
                const decksLeft = Math.round(((snapshot.deckCount * 52 - (session.cardsDealtTotal + cardsCount)) / 52) * 2) / 2;
                return decksLeft.toString();
              })()}
              inputProps={{
                step: 0.5,
                value: session.userInputs.decksRemaining ?? '',
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('decksRemaining', e.target.value),
              }}
            />

            {/* RC Before */}
            <FieldRow
              label="RC Before:"
              mode={fieldModes.rcBefore}
              valueBox={(session.runningCount ?? 0).toString()}
              inputProps={{
                value: session.userInputs.rcBefore ?? '',
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('rcBefore', e.target.value),
              }}
            />

            {/* Delta RC */}
            <FieldRow
              label="ΔRC:"
              mode={'input'}
              valueBox={''}
              inputProps={{
                value: session.userInputs.deltaRC ?? '',
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('deltaRC', e.target.value),
              }}
            />

            {/* RC After */}
            <FieldRow
              label="RC After:"
              mode={fieldModes.rcAfter}
              valueBox={((): string => {
                const before = fieldModes.rcBefore === 'input' ? (session.userInputs.rcBefore ?? session.runningCount) : session.runningCount;
                const delta = session.userInputs.deltaRC;
                if (fieldModes.rcAfter === 'computed') {
                  if (delta === undefined) return '—';
                  return ((before ?? 0) + (delta ?? 0)).toString();
                }
                return '';
              })()}
              inputProps={{
                value: session.userInputs.rcAfter ?? '',
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('rcAfter', e.target.value),
              }}
            />

            {/* True Count */}
            <FieldRow
              label="True Count (TC):"
              mode={'input'}
              valueBox={''}
              inputProps={{
                value: session.userInputs.trueCount ?? '',
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('trueCount', e.target.value),
              }}
            />
          </div>

          <button
            disabled={isWaiting}
            onClick={() => {
              if (isWaiting) return;
              submitCount();
            }}
            className={`w-full mt-4 font-bold py-3 rounded-lg transition-colors ${
              isWaiting
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            Confirm Count <span className="text-xs opacity-75">(F)</span>
          </button>
        </div>
      )}

      {/* Feedback Overlay */}
      {feedback && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full border border-gray-700">
            <div className="text-center mb-4">
              {feedback.isCorrect ? (
                <div>
                  <div className="text-5xl mb-2">✓</div>
                  <div className="text-2xl font-bold text-green-400">Correct!</div>
                </div>
              ) : (
                <div>
                  <div className="text-5xl mb-2">✗</div>
                  <div className="text-2xl font-bold text-red-400">Incorrect</div>
                </div>
              )}
            </div>

            {/* Error Details */}
            {!feedback.isCorrect && feedback.errors.length > 0 && (
              <div className="mb-4 bg-gray-900 rounded p-4">
                <div className="text-sm font-semibold text-gray-300 mb-2">Errors:</div>
                <div className="space-y-2">
                  {feedback.errors.map((error, idx) => (
                    <div key={idx} className="text-xs text-gray-400">
                      <span className="font-mono text-red-400">{error.field}</span>: 
                      Your {error.userValue ?? 'N/A'} → Correct {error.correctValue}
                      <span className="text-gray-600 ml-2">({error.errorType})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Correct Values */}
            <div className="mb-6 bg-gray-900 rounded p-4">
              <div className="text-sm font-semibold text-gray-300 mb-2">Correct Values:</div>
              <div className="space-y-1 text-xs font-mono text-gray-400">
                {feedback.correctInputs.decksRemaining !== undefined && (
                  <div>Decks Remaining: {feedback.correctInputs.decksRemaining}</div>
                )}
                {feedback.correctInputs.rcBefore !== undefined && (
                  <div>RC Before: {feedback.correctInputs.rcBefore}</div>
                )}
                {feedback.correctInputs.deltaRC !== undefined && (
                  <div>ΔRC: {feedback.correctInputs.deltaRC > 0 ? '+' : ''}{feedback.correctInputs.deltaRC}</div>
                )}
                {feedback.correctInputs.rcAfter !== undefined && (
                  <div>RC After: {feedback.correctInputs.rcAfter}</div>
                )}
                {feedback.correctInputs.trueCount !== undefined && (
                  <div>True Count: {feedback.correctInputs.trueCount > 0 ? '+' : ''}{feedback.correctInputs.trueCount}</div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="mb-6 bg-gray-900 rounded p-4">
              <div className="grid grid-cols-2 gap-3 text-center text-sm">
                <div>
                  <div className="text-gray-500 text-xs">Current Streak</div>
                  <div className="text-lg font-bold text-green-400">{stats.currentStreak}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-xs">Best Streak</div>
                  <div className="text-lg font-bold text-blue-400">{stats.bestStreak}</div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={nextRound}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors"
              >
                Next Round <span className="text-xs opacity-75">(F)</span>
              </button>
              <button
                onClick={endSession}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-gray-300 font-medium py-3 rounded-lg transition-colors"
              >
                End Session <span className="text-xs opacity-75">(E)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CountingView;

// --- Helpers ---
interface FieldRowProps {
  label: string;
  mode: FieldMode;
  valueBox: string;
  inputProps: React.InputHTMLAttributes<HTMLInputElement>;
}

const FieldRow: React.FC<FieldRowProps> = ({ label, mode, valueBox, inputProps }) => {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm text-gray-400 w-1/3">{label}</label>
      {mode === 'input' ? (
        <input
          type="number"
          className="bg-gray-700 border border-gray-600 text-gray-200 rounded px-3 py-2 w-32 text-center font-mono"
          placeholder="0"
          {...inputProps}
        />
      ) : mode === 'computed' ? (
        <div className="bg-gray-900 border border-gray-700 text-gray-200 rounded px-3 py-2 w-32 text-center font-mono">
          {valueBox || '—'}
        </div>
      ) : (
        <div className="w-32"></div>
      )}
    </div>
  );
};
