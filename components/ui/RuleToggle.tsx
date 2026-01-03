import React from 'react';

interface RuleToggleProps {
  label?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

const RuleToggle: React.FC<RuleToggleProps> = ({ label, value, onChange, disabled = false }) => (
  <div className="flex justify-between items-center">
    {label && <span className={`text-gray-300 ${disabled ? 'opacity-50' : ''}`}>{label}</span>}
    <button 
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`w-14 h-8 rounded-full p-1 transition-colors ${
        disabled ? 'bg-gray-700 cursor-not-allowed opacity-50' : (value ? 'bg-green-600' : 'bg-gray-600')
      }`}
    >
      <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform ${
        value ? 'translate-x-6' : 'translate-x-0'
      }`} />
    </button>
  </div>
);

export default RuleToggle;
