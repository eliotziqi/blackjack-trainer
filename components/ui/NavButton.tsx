import React from 'react';

interface NavButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  shortcut?: string; // e.g., "1", "2", etc.
}

const NavButton: React.FC<NavButtonProps> = ({ icon, label, active, onClick, shortcut }) => (
  <button 
    onClick={onClick}
    title={shortcut ? `${label} (Press ${shortcut})` : label}
    className={`flex flex-col items-center justify-center w-full py-3 relative group ${
      active ? 'text-green-400' : 'text-gray-500 hover:text-gray-300'
    }`}
  >
    {icon}
    <span className="text-[10px] mt-1 font-medium">{label}</span>
    {shortcut && (
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[8px] text-gray-600 group-hover:text-gray-400 transition opacity-0 group-hover:opacity-100">
        {shortcut}
      </span>
    )}
  </button>
);

export default NavButton;
