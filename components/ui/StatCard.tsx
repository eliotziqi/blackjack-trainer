import React from 'react';

interface StatCardProps {
  label: string;
  percent: number;
}

const StatCard: React.FC<StatCardProps> = ({ label, percent }) => (
  <div className="bg-gray-800 p-4 rounded-lg text-center border border-gray-700">
    <div className="text-gray-400 text-xs uppercase mb-1">{label}</div>
    <div className={`text-2xl font-bold ${
      percent >= 90 ? 'text-green-400' : 
      percent >= 70 ? 'text-yellow-400' : 
      'text-red-400'
    }`}>
      {percent}%
    </div>
  </div>
);

export default StatCard;
