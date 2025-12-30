import React from 'react';

interface RuleToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

const RuleToggle: React.FC<RuleToggleProps> = ({ label, value, onChange }) => (
  <div className="flex justify-between items-center">
    <span className="text-gray-300">{label}</span>
    <button 
      onClick={() => onChange(!value)}
      className={`w-14 h-8 rounded-full p-1 transition-colors ${
        value ? 'bg-green-600' : 'bg-gray-600'
      }`}
    >
      <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
        value ? 'translate-x-6' : 'translate-x-0'
      }`} />
    </button>
  </div>
);

export default RuleToggle;
