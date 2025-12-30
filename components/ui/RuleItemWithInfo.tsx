import React from 'react';

interface RuleItemWithInfoProps {
  label: string;
  description: string;
  children: React.ReactNode;
  onInfoClick: () => void;
}

const RuleItemWithInfo: React.FC<RuleItemWithInfoProps> = ({ label, description, children, onInfoClick }) => {
  return (
    <div className="flex justify-between items-center group">
      <div className="flex items-center gap-2">
        <label className="text-gray-300">{label}</label>
        <button
          onClick={onInfoClick}
          className="w-5 h-5 rounded-full border border-gray-500 text-gray-400 hover:text-green-400 hover:border-green-400 flex items-center justify-center text-xs font-bold transition"
          title={description}
        >
          ?
        </button>
      </div>
      {children}
    </div>
  );
};

export default RuleItemWithInfo;
