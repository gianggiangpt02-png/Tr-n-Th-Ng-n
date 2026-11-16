import React, { useState } from 'react';
import { Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { useFavorites } from '../hooks/useFavorites';

interface FavoriteButtonProps {
  productId: string;
  productName: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  productId,
  productName,
  className = '',
  size = 'md',
}) => {
  const { isFav, toggle } = useFavorites();
  const favorited = isFav(productId);
  const [bounceKey, setBounceKey] = useState(0);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggle(productId);
    setBounceKey((k) => k + 1);
  };

  const label = favorited
    ? `Bỏ ${productName} khỏi yêu thích`
    : `Thêm ${productName} vào yêu thích`;

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label}
      aria-pressed={favorited}
      title={label}
      className={`inline-flex items-center justify-center rounded-full bg-[#FFF4EA]/90 hover:bg-[#FFF4EA] border border-[#8A5036]/15 shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-[#D4606A] ${
        size === 'sm' ? 'w-8 h-8' : 'w-9 h-9'
      } ${className}`}
    >
      <motion.span
        key={bounceKey}
        initial={bounceKey > 0 ? { scale: 0.78 } : false}
        animate={bounceKey > 0 ? { scale: [1, 1.32, 0.92, 1.05, 1] } : { scale: 1 }}
        transition={{ duration: 0.36, ease: 'easeOut' }}
        className="flex items-center justify-center"
      >
        <Heart
          className={`${size === 'sm' ? 'w-4 h-4' : 'w-[18px] h-[18px]'} transition-colors ${
            favorited ? 'fill-[#D4606A] text-[#D4606A]' : 'text-[#6F3F2A] hover:text-[#D4606A]'
          }`}
        />
      </motion.span>
    </button>
  );
};
