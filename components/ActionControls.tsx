import React from 'react';
import { Action } from '../types';

interface ActionControlsProps {
  onAction: (action: Action) => void;
  allowedActions: Action[];
  disabled?: boolean;
  pressedAction?: Action | null;
}

const ActionControls: React.FC<ActionControlsProps> = ({ onAction, allowedActions, disabled, pressedAction }) => {
  const META: Record<Action, { label: string; hotkey: string; desc: string; theme: string; shadow: string; text: string }> = {
    [Action.Hit]: {
      label: 'Hit',
      hotkey: 'H',
      desc: 'Draw one card',
      theme: 'bg-gradient-to-r from-emerald-500 via-emerald-500 to-green-600 border border-emerald-300/70',
      shadow: 'shadow-emerald-500/30',
      text: 'text-white',
    },
    [Action.Stand]: {
      label: 'Stand',
      hotkey: 'S',
      desc: 'Hold your total',
      theme: 'bg-gradient-to-r from-rose-500 via-rose-500 to-red-600 border border-rose-300/70',
      shadow: 'shadow-rose-500/30',
      text: 'text-white',
    },
    [Action.Double]: {
      label: 'Double',
      hotkey: 'D',
      desc: 'Double bet, one card',
      theme: 'bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 border border-amber-200/80',
      shadow: 'shadow-amber-400/40',
      text: 'text-slate-900',
    },
    [Action.Split]: {
      label: 'Split',
      hotkey: 'P',
      desc: 'Split the pair',
      theme: 'bg-gradient-to-r from-sky-400 via-sky-500 to-blue-600 border border-sky-200/80',
      shadow: 'shadow-sky-500/30',
      text: 'text-white',
    },
    [Action.Surrender]: {
      label: 'Surrender',
      hotkey: 'R',
      desc: 'Lose half, exit',
      theme: 'bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 border border-slate-300/30',
      shadow: 'shadow-slate-500/20',
      text: 'text-white',
    },
  };

  const isActionAllowed = (action: Action) => allowedActions.includes(action);

  // 主操作：Hit & Stand
  const primaryActions = [Action.Hit, Action.Stand];
  
  // 次要操作：Double, Split, Surrender
  const secondaryActions = [Action.Double, Action.Split, Action.Surrender];

  return (
    <div className={`w-full max-w-3xl mx-auto ${disabled ? 'pointer-events-none' : ''}`}>
      <div className="bg-gray-900/70 border border-gray-800 rounded-2xl shadow-2xl backdrop-blur p-4 space-y-3">
        {/* 第一排：主操作（Hit & Stand） */}
        <div className="grid grid-cols-2 gap-3">
          {primaryActions.map((action) => {
            const isAllowed = isActionAllowed(action);
            const isDisabled = disabled || !isAllowed;
            const isPressed = pressedAction === action;
            const meta = META[action];

            return (
              <button
                key={action}
                onClick={() => !isDisabled && onAction(action)}
                disabled={isDisabled}
                className={`
                  group relative overflow-hidden rounded-xl px-4 py-4 text-left ${meta.text}
                  ${isDisabled ? 'bg-gray-800 border border-gray-700' : `${meta.theme} ${meta.shadow}`}
                  transition-all duration-200 ease-out
                  ${!isDisabled ? 'hover:-translate-y-0.5 hover:shadow-xl' : 'opacity-30 cursor-not-allowed'}
                  ${!isDisabled ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60' : ''}
                  ${isPressed ? 'translate-y-[1px] scale-[0.99]' : ''}
                `}
              >
              <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold tracking-wide uppercase">{meta.label} <span className="text-xs opacity-75">({meta.hotkey})</span></div>
                    <div className="text-xs opacity-80">{meta.desc}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* 第二排：次要操作（Double, Split, Surrender） */}
        <div className="grid grid-cols-3 gap-3">
          {secondaryActions.map((action) => {
            const isAllowed = isActionAllowed(action);
            const isDisabled = disabled || !isAllowed;
            const isPressed = pressedAction === action;
            const meta = META[action];

            return (
              <button
                key={action}
                onClick={() => !isDisabled && onAction(action)}
                disabled={isDisabled}
                className={`
                  group relative overflow-hidden rounded-xl px-3 py-3 text-left ${meta.text}
                  ${isDisabled ? 'bg-gray-800 border border-gray-700' : `${meta.theme} ${meta.shadow}`}
                  transition-all duration-200 ease-out
                  ${!isDisabled ? 'hover:-translate-y-0.5 hover:shadow-xl' : 'opacity-30 cursor-not-allowed'}
                  ${!isDisabled ? 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60' : ''}
                  ${isPressed ? 'translate-y-[1px] scale-[0.99]' : ''}
                `}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-semibold tracking-wide uppercase">{meta.label} <span className="text-[10px] opacity-75">({meta.hotkey})</span></div>
                    <div className="text-[11px] opacity-80 leading-tight">{meta.desc}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ActionControls;
