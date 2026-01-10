import React from 'react';

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  shortcut?: string; // e.g., "1", "2", etc.
  disabled?: boolean;
}

const NavButton: React.FC<NavButtonProps> = ({ icon, label, active, onClick, shortcut, disabled = false }) => (
  <button 
    onClick={disabled ? undefined : onClick}
    title={shortcut ? `${label} (Press ${shortcut})` : label}
    disabled={disabled}
    className={`flex flex-col items-center justify-center w-full py-3 relative group ${
      disabled 
        ? 'text-gray-700 cursor-not-allowed opacity-50'
        : active 
          ? 'text-green-400' 
          : 'text-gray-500 hover:text-gray-300'
    }`}
  >
    {icon}
    <span className="text-[10px] mt-1 font-medium">{label}</span>
    {shortcut && !disabled && (
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[8px] text-gray-600 group-hover:text-gray-400 transition opacity-0 group-hover:opacity-100">
        {shortcut}
      </span>
    )}
  </button>
);

export default NavButton;
