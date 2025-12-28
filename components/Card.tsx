import React from 'react';
import { Card as CardType, Suit } from '../types';

interface CardProps {
  card: CardType;
  className?: string;
  mini?: boolean;
}

const Card: React.FC<CardProps> = ({ card, className = '', mini = false }) => {
  const isRed = card.suit === Suit.Hearts || card.suit === Suit.Diamonds;
  
  if (card.isHidden) {
    return (
      <div className={`relative bg-blue-900 border-2 border-white rounded-lg shadow-md flex items-center justify-center ${mini ? 'w-10 h-14' : 'w-20 h-28'} ${className}`}>
        <div className="w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]"></div>
      </div>
    );
  }

  return (
    <div className={`relative bg-white rounded-lg shadow-lg flex flex-col justify-between p-1 select-none border border-gray-200 ${mini ? 'w-10 h-14 text-xs' : 'w-24 h-36 text-xl'} ${className}`}>
      <div className={`font-bold ${isRed ? 'text-red-600' : 'text-black'} text-left leading-none`}>
        {card.rank}
        <div className="text-[0.8em]">{card.suit}</div>
      </div>
      
      <div className={`absolute inset-0 flex items-center justify-center ${mini ? 'text-xl' : 'text-4xl'} ${isRed ? 'text-red-600' : 'text-black'}`}>
        {card.suit}
      </div>

      <div className={`font-bold ${isRed ? 'text-red-600' : 'text-black'} text-right leading-none transform rotate-180`}>
        {card.rank}
        <div className="text-[0.8em]">{card.suit}</div>
      </div>
    </div>
  );
};

export default Card;
