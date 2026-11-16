import React from 'react';
import { motion } from 'motion/react';

export const VIDU5_COFFEE_SRC = '/assets/aistudio/vidu5-removebg-preview_483cc8b0.png';

/**
 * Hiển thị ảnh ly cà phê đá văng sữa nền trong suốt,
 * đổ nghiêng 30 độ về bên trái, không viền và chuyển động nổi nhẹ nhàng.
 */
export const FallingCoffeeVisual: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      aria-hidden="true"
      className={`relative flex items-center justify-center select-none pointer-events-none ${className}`}
    >
      <motion.img
        src={VIDU5_COFFEE_SRC}
        alt="Ly cà phê sữa đá JeJi Coffee"
        initial={{ rotate: -30, y: 0 }}
        animate={{
          rotate: [-30, -32.5, -28.5, -30],
          y: [0, -8, 2, 0],
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 4.8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{ transformOrigin: '55% 60%' }}
        className="w-[78%] h-[88%] object-contain drop-shadow-[0_18px_24px_rgba(90,46,28,0.24)]"
      />
    </div>
  );
};
