import React from 'react';
import { Action } from '../types';

interface ActionControlsProps {
  onAction: (action: Action) => void;
  allowedActions: Action[];
  disabled?: boolean;
}

const ActionControls: React.FC<ActionControlsProps> = ({ onAction, allowedActions, disabled }) => {
  const getButtonColor = (action: Action) => {
    switch(action) {
      case Action.Hit: return 'bg-green-600 hover:bg-green-700';
      case Action.Stand: return 'bg-red-600 hover:bg-red-700';
      case Action.Double: return 'bg-yellow-600 hover:bg-yellow-700';
      case Action.Split: return 'bg-blue-600 hover:bg-blue-700';
      case Action.Surrender: return 'bg-gray-500 hover:bg-gray-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="flex flex-wrap gap-2 justify-center w-full max-w-md mx-auto p-4">
      {Object.values(Action).map((action) => {
        const isAllowed = allowedActions.includes(action);
        if (!isAllowed) return null; // Or render disabled state based on preference

        return (
          <button
            key={action}
            onClick={() => onAction(action)}
            disabled={disabled}
            className={`${getButtonColor(action)} text-white font-bold py-3 px-6 rounded-lg shadow-lg transform transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex-1 min-w-[80px]`}
          >
            {action}
          </button>
        );
      })}
    </div>
  );
};

export default ActionControls;
