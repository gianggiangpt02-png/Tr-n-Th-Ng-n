import React, { useEffect, useState } from 'react';
import { getProductTheme } from '../theme/productColors';
import { ProductCategory } from '../types';

interface ProductImageProps {
  src?: string;
  alt: string;
  productId: string;
  category?: ProductCategory | 'Combo';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

function isPlaceholderUrl(url?: string): boolean {
  if (!url) return true;
  return url.includes('example.com') || url.trim() === '';
}

/**
 * Hiển thị ảnh sản phẩm từ image_url.
 * Nếu ảnh mẫu (example.com) hoặc tải lỗi → tự động hiển thị minh họa SVG/gradient
 * đồng bộ theo màu sắc từng sản phẩm từ getProductTheme(productId).
 */
export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  productId,
  category,
  className = '',
  size = 'md',
}) => {
  const [hasError, setHasError] = useState<boolean>(() => isPlaceholderUrl(src));
  const theme = getProductTheme(productId, category);

  useEffect(() => {
    setHasError(isPlaceholderUrl(src));
  }, [src]);

  const showFallback = hasError || isPlaceholderUrl(src);

  const renderIllustration = () => {
    if (category === 'Bánh') {
      return (
        <svg viewBox="0 0 120 120" className={size === 'sm' ? 'w-12 h-12' : size === 'lg' ? 'w-32 h-32' : 'w-20 h-20'} aria-hidden="true">
          <ellipse cx="60" cy="94" rx="40" ry="8" fill={theme.accent} opacity="0.18" />
          <path d="M24 78 L96 78 L92 50 L36 42 Z" fill={theme.accent} opacity="0.9" />
          <path d="M24 78 L96 78 L94 66 L26 66 Z" fill={theme.bgSecondary} opacity="0.95" />
          <path d="M36 42 Q64 34 92 50 L88 56 Q62 44 34 50 Z" fill={theme.accent} />
          <circle cx="62" cy="38" r="6" fill="#AA2B1D" />
          <path d="M62 32 Q66 25 70 28" stroke="#556638" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        </svg>
      );
    }

    if (category === 'Topping') {
      return (
        <svg viewBox="0 0 120 120" className={size === 'sm' ? 'w-12 h-12' : size === 'lg' ? 'w-32 h-32' : 'w-20 h-20'} aria-hidden="true">
          <ellipse cx="60" cy="92" rx="34" ry="7" fill={theme.accent} opacity="0.16" />
          <path d="M26 56 C26 82 94 82 94 56 Z" fill={theme.accent} opacity="0.9" />
          <ellipse cx="60" cy="56" rx="34" ry="9" fill={theme.bgSecondary} stroke={theme.accent} strokeWidth="2" />
          <circle cx="46" cy="55" r="5" fill={theme.text} opacity="0.8" />
          <circle cx="60" cy="58" r="5.5" fill={theme.text} opacity="0.9" />
          <circle cx="72" cy="54" r="4.5" fill={theme.text} opacity="0.75" />
          <circle cx="53" cy="51" r="4" fill={theme.text} opacity="0.7" />
        </svg>
      );
    }

    if (category === 'Combo') {
      return (
        <svg viewBox="0 0 120 120" className={size === 'sm' ? 'w-12 h-12' : size === 'lg' ? 'w-32 h-32' : 'w-24 h-24'} aria-hidden="true">
          <ellipse cx="60" cy="98" rx="44" ry="8" fill={theme.accent} opacity="0.15" />
          {/* Ly đồ uống bên trái */}
          <path d="M32 42 L58 42 L54 90 L36 90 Z" fill={theme.accent} opacity="0.92" />
          <rect x="29" y="36" width="32" height="7" rx="3" fill={theme.text} opacity="0.85" />
          <path d="M46 20 L49 20 L46 42 L43 42 Z" fill="#AA2B1D" />
          <path d="M34 52 L56 52 L55 62 L35 62 Z" fill="#FBDB93" opacity="0.9" />
          {/* Đĩa bánh bên phải */}
          <path d="M62 88 L98 88 L95 68 L68 62 Z" fill="#914F1E" />
          <path d="M63 82 L97 82 L96 75 L65 75 Z" fill="#FFF8EA" opacity="0.9" />
          <circle cx="82" cy="60" r="4.5" fill="#AA2B1D" />
        </svg>
      );
    }

    if (category === 'Trà' || category === 'Nước ép' || category === 'Sinh tố') {
      return (
        <svg viewBox="0 0 120 120" className={size === 'sm' ? 'w-12 h-12' : size === 'lg' ? 'w-32 h-32' : 'w-20 h-20'} aria-hidden="true">
          <ellipse cx="60" cy="100" rx="30" ry="6" fill={theme.accent} opacity="0.18" />
          {/* Ống hút */}
          <path d="M68 18 L74 18 L63 54 L57 54 Z" fill={theme.accent} opacity="0.85" />
          {/* Thân ly */}
          <path d="M36 38 L84 38 L76 94 C75 97 45 97 44 94 Z" fill={theme.accent} opacity="0.88" />
          {/* Nắp vòm / viền ly */}
          <ellipse cx="60" cy="38" rx="24" ry="6" fill={theme.bgSecondary} stroke={theme.accent} strokeWidth="2" />
          {/* Đá / trái cây */}
          <rect x="47" y="48" width="12" height="12" rx="3" transform="rotate(14 53 54)" fill="#FFF8EA" opacity="0.5" />
          <rect x="61" y="54" width="11" height="11" rx="3" transform="rotate(-12 66 59)" fill="#FFF8EA" opacity="0.45" />
          <circle cx="52" cy="76" r="6" fill="#FBDB93" opacity="0.85" />
          <circle cx="66" cy="72" r="5" fill="#FBDB93" opacity="0.7" />
        </svg>
      );
    }

    // Mặc định: Cà phê (ly signature JeJi với lớp kem muối / bọt sữa)
    return (
      <svg viewBox="0 0 120 120" className={size === 'sm' ? 'w-12 h-12' : size === 'lg' ? 'w-32 h-32' : 'w-20 h-20'} aria-hidden="true">
        <ellipse cx="60" cy="100" rx="30" ry="6" fill={theme.accent} opacity="0.2" />
        {/* Ly cà phê */}
        <path
          d="M36 42 L84 42 L77 92 C76 96 44 96 43 92 Z"
          fill={theme.accent}
        />
        {/* Lớp kem muối / sữa đặc */}
        <path
          d="M36 42 L84 42 L82 55 C70 59 50 53 38 56 Z"
          fill="#FFF4EA"
          opacity="0.92"
        />
        {/* Vành ly */}
        <ellipse
          cx="60"
          cy="42"
          rx="24"
          ry="6"
          fill="#FFF4EA"
          stroke={theme.accent}
          strokeWidth="2"
        />
        {/* Hạt cà phê trang trí */}
        <ellipse cx="60" cy="42" rx="6" ry="3.5" fill="#6F3F2A" />
        {/* Hơi ấm nhẹ */}
        <path
          d="M50 28 Q47 22 51 16 M62 26 Q59 20 63 14 M72 28 Q69 22 73 16"
          stroke={theme.accent}
          strokeWidth="2"
          strokeLinecap="round"
          fill="none"
          opacity="0.55"
        />
      </svg>
    );
  };

  if (!showFallback && src) {
    return (
      <div
        className={`relative overflow-hidden ${className}`}
        style={{ backgroundColor: theme.bg }}
      >
        <img
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          onError={() => setHasError(true)}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className={`relative overflow-hidden flex flex-col items-center justify-center select-none ${className}`}
      style={{
        background: `radial-gradient(circle at 30% 25%, ${theme.bgSecondary}, ${theme.bg})`,
        color: theme.text,
      }}
    >
      <div
        className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full opacity-15 pointer-events-none"
        style={{ backgroundColor: theme.accent }}
      />
      <div
        className="absolute -top-6 -left-6 w-20 h-20 rounded-full opacity-10 pointer-events-none"
        style={{ backgroundColor: theme.accent }}
      />
      <div className="relative z-10 flex flex-col items-center">
        {renderIllustration()}
        {size !== 'sm' && (
          <span
            className="mt-1.5 text-[10px] font-medium tracking-wider uppercase opacity-70"
            style={{ color: theme.text }}
          >
            JeJi Craft
          </span>
        )}
      </div>
    </div>
  );
};
