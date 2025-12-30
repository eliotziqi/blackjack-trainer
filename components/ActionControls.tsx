import React from 'react';
import { Action } from '../types';

interface ActionControlsProps {
  onAction: (action: Action) => void;
  allowedActions: Action[];
  disabled?: boolean;
  pressedAction?: Action | null;
}

const ActionControls: React.FC<ActionControlsProps> = ({ onAction, allowedActions, disabled, pressedAction }) => {
  const getButtonColor = (action: Action, isAllowed: boolean) => {
    const baseColor = (() => {
      switch(action) {
        case Action.Hit: return 'bg-green-600';
        case Action.Stand: return 'bg-red-600';
        case Action.Double: return 'bg-yellow-600';
        case Action.Split: return 'bg-blue-600';
        case Action.Surrender: return 'bg-gray-500';
        default: return 'bg-gray-600';
      }
    })();
    
    const hoverColor = (() => {
      switch(action) {
        case Action.Hit: return 'hover:bg-green-700';
        case Action.Stand: return 'hover:bg-red-700';
        case Action.Double: return 'hover:bg-yellow-700';
        case Action.Split: return 'hover:bg-blue-700';
        case Action.Surrender: return 'hover:bg-gray-600';
        default: return 'hover:bg-gray-700';
      }
    })();
    
    // 如果不可用，不显示 hover 效果
    return isAllowed ? `${baseColor} ${hoverColor}` : baseColor;
  };

  const isActionAllowed = (action: Action) => allowedActions.includes(action);

  // 主操作：Hit & Stand
  const primaryActions = [Action.Hit, Action.Stand];
  
  // 次要操作：Double, Split, Surrender
  const secondaryActions = [Action.Double, Action.Split, Action.Surrender];

  return (
    <div className={`w-full max-w-md mx-auto p-4 space-y-2 ${disabled ? 'pointer-events-none' : ''}`}>
      {/* 第一排：主操作（Hit & Stand） */}
      <div className="flex gap-2">
        {primaryActions.map((action) => {
          const isAllowed = isActionAllowed(action);
          const isDisabled = disabled || !isAllowed;
          
          const isPressed = pressedAction === action;
          
          return (
            <button
              key={action}
              onClick={() => !isDisabled && onAction(action)}
              disabled={isDisabled}
              className={`
                ${getButtonColor(action, isAllowed)}
                text-white font-bold py-4 px-6 rounded-lg
                flex items-center justify-center
                w-1/2
                transition-transform transition-shadow duration-150 ease-out
                ${!isDisabled ? 'hover:scale-[1.02] hover:brightness-110 hover:shadow-lg' : ''}
                ${!isDisabled ? 'active:scale-[0.98] active:brightness-95' : ''}
                ${!isDisabled ? 'focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none' : ''}
                ${isDisabled ? 'opacity-30 cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none disabled:brightness-100' : ''}
                ${isPressed ? 'scale-[0.98] brightness-95 ring-2 ring-white/40' : ''}
              `}
            >
              {action}
            </button>
          );
        })}
      </div>

      {/* 第二排：次要操作（Double, Split, Surrender） */}
      <div className="flex gap-2">
        {secondaryActions.map((action) => {
          const isAllowed = isActionAllowed(action);
          const isDisabled = disabled || !isAllowed;
          
          const isPressed = pressedAction === action;
          
          return (
            <button
              key={action}
              onClick={() => !isDisabled && onAction(action)}
              disabled={isDisabled}
              className={`
                ${getButtonColor(action, isAllowed)}
                text-white font-bold py-3 px-4 rounded-lg
                flex items-center justify-center
                flex-1
                transition-transform transition-shadow duration-150 ease-out
                ${!isDisabled ? 'hover:scale-[1.02] hover:brightness-110 hover:shadow-lg' : ''}
                ${!isDisabled ? 'active:scale-[0.98] active:brightness-95' : ''}
                ${!isDisabled ? 'focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:outline-none' : ''}
                ${isDisabled ? 'opacity-30 cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none disabled:brightness-100' : ''}
                ${isPressed ? 'scale-[0.98] brightness-95 ring-2 ring-white/40' : ''}
              `}
            >
              {action}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ActionControls;
