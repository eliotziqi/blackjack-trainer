import React, { useState, useEffect } from 'react';
import { ViewMode, GameRules } from './types';
import { loadStats, clearStats } from './services/statsService';

// Import icons
import { SettingsIcon, ChartIcon, LightningIcon, CountingIcon, ChipIcon, BookOpenIcon } from './components/icons';

// Import UI components
import NavButton from './components/ui/NavButton';

// Import views
import RulesView from './views/RulesView';
import StrategyView from './views/StrategyView';
import PracticeView from './views/PracticeView';
import ScenarioView from './views/ScenarioView';
import CountingView from './views/CountingView';
import SimulationView from './views/SimulationView';
import StatsView from './views/StatsView';

// --- Constants ---
const DEFAULT_RULES: GameRules = {
  deckCount: 6,
  dealerHitSoft17: true,
  doubleAfterSplit: true,
  surrender: 'late',
  blackjackPayout: 1.5,
  simMinBet: 10,
  simDecisionDelay: 0,
};

// --- App Component ---
const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>(ViewMode.Rules);
  const [rules, setRules] = useState<GameRules>(() => {
    // Try to restore rules from localStorage
    try {
      const saved = localStorage.getItem('bj_rules_v1');
      if (saved) {
        return { ...DEFAULT_RULES, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.error('Failed to load rules from localStorage:', e);
    }
    return DEFAULT_RULES;
  });
  const [stats, setStats] = useState(loadStats());
  const [isCountingInProgress, setIsCountingInProgress] = useState(false);
  
  // Save rules to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('bj_rules_v1', JSON.stringify(rules));
  }, [rules]);

  // Navigation Handler
  const navigate = (newView: ViewMode) => {
    setView(newView);
    window.location.hash = newView.toLowerCase();
  };

  useEffect(() => {
    setStats(loadStats());
  }, [view]);

  // ⌨️ 键盘快捷键：1-5 对应底部导航栏
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // 如果用户在输入框中，不触发快捷键
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // 1=Rules, 2=Strategy, 3=Practice, 4=Counting, 5=Sim, 6=Stats
      const keyToView: { [key: string]: ViewMode } = {
        '1': ViewMode.Rules,
        '2': ViewMode.Strategy,
        '3': ViewMode.Practice,
        '4': ViewMode.Counting,
        '5': ViewMode.Simulation,
        '6': ViewMode.Stats,
      };

      if (keyToView[e.key]) {
        navigate(keyToView[e.key]);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4 sticky top-0 z-[60]">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <h1
            className="text-xl font-bold text-green-400 tracking-wider group"
            title="Your Best Journey to Advantage Play"
          >
            <span className="group-hover:hidden">BJAP: Blackjack Advantage Player</span>
            <span className="hidden group-hover:inline">Your Best Journey to Advantage Play</span>
          </h1>
          <div className="flex space-x-2">
            <div className="text-xs text-gray-400 bg-gray-900 px-2 py-1 rounded border border-gray-700">
              {rules.dealerHitSoft17 ? 'H17' : 'S17'} • {rules.doubleAfterSplit ? 'DAS' : 'No DAS'} • {rules.surrender === 'none' ? 'None' : (rules.surrender === 'late' ? 'Late' : 'Early')} • {rules.deckCount}D
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow p-4 pb-24 max-w-5xl mx-auto w-full">
        {view === ViewMode.Rules && (
          <RulesView 
            rules={rules} 
            setRules={setRules}
            isCountingInProgress={isCountingInProgress}
          />
        )}
        {view === ViewMode.Strategy && (
          <StrategyView rules={rules} navigate={navigate} />
        )}
        {view === ViewMode.Practice && (
          <PracticeView globalRules={rules} stats={stats} />
        )}
        {view === ViewMode.Scenario && (
          <ScenarioView globalRules={rules} navigate={navigate} />
        )}
        {view === ViewMode.Counting && (
          <CountingView 
            globalRules={rules}
            onCountingStateChange={setIsCountingInProgress}
          />
        )}
        {view === ViewMode.Simulation && (
          <SimulationView globalRules={rules} />
        )}
        {view === ViewMode.Stats && (
          <StatsView stats={stats} onReset={() => { 
            clearStats(); 
            setStats(loadStats()); 
            localStorage.removeItem('bj_sim_state_v1');
          }} />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 pb-safe">
        <div className="flex justify-around max-w-5xl mx-auto">
          <NavButton icon={<SettingsIcon/>} label="Rules" active={view === ViewMode.Rules} onClick={() => navigate(ViewMode.Rules)} shortcut="1" />
          <NavButton icon={<ChartIcon/>} label="Strategy" active={view === ViewMode.Strategy} onClick={() => navigate(ViewMode.Strategy)} shortcut="2" />
          <NavButton icon={<LightningIcon/>} label="Practice" active={view === ViewMode.Practice} onClick={() => navigate(ViewMode.Practice)} shortcut="3" />
          <NavButton icon={<CountingIcon/>} label="Counting" active={view === ViewMode.Counting} onClick={() => navigate(ViewMode.Counting)} shortcut="4" />
          <NavButton icon={<ChipIcon/>} label="Sim" active={view === ViewMode.Simulation} onClick={() => navigate(ViewMode.Simulation)} shortcut="5" />
          <NavButton icon={<BookOpenIcon/>} label="Stats" active={view === ViewMode.Stats} onClick={() => navigate(ViewMode.Stats)} shortcut="6" />
        </div>
      </nav>
    </div>
  );
};

export default App;