import React from 'react';

export const JEJI_LOGO_SRC = '/assets/aistudio/JEJI_847b5c9e.png';

interface BrandLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  cropped?: boolean;
  className?: string;
}

const SIZE_MAP: Record<NonNullable<BrandLogoProps['size']>, string> = {
  xs: 'w-8 h-8 rounded-lg',
  sm: 'w-10 h-10 rounded-xl',
  md: 'w-14 h-14 rounded-2xl',
  lg: 'w-20 h-20 rounded-2xl',
  xl: 'w-32 h-32 rounded-3xl',
};

/**
 * Logo chính thức của JeJi Coffee (/assets/aistudio/JEJI_847b5c9e.png).
 * Tùy chọn cropped giúp phóng to nhẹ phần nhân vật ly cà phê & chữ "jeji" ở kích thước nhỏ.
 */
export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = 'sm',
  cropped = true,
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center justify-center overflow-hidden bg-[#FCE5D0] border border-[#EDB9B3]/80 shrink-0 select-none ${SIZE_MAP[size]} ${className}`}
    >
      <img
        src={JEJI_LOGO_SRC}
        alt="Logo JeJi Coffee Shop"
        referrerPolicy="no-referrer"
        className={`w-full h-full object-cover ${cropped ? 'scale-[1.38]' : 'scale-105'}`}
      />
    </span>
  );
};
