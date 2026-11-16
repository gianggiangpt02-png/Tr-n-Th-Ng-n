import React, { useMemo } from 'react';
import { Copy } from 'lucide-react';
import { Combo, Product } from '../types';
import { formatVND } from '../utils/format';
import { BrandLogo } from './BrandLogo';

interface FloatingBannerShowcaseProps {
  visualType: 'coffee' | 'combo' | 'student';
  products: Product[];
  combos: Combo[];
  customBgUrl?: string;
  onSelectProduct: (product: Product) => void;
  onCopyCoupon: (code: string) => void;
}

type CupVariant =
  | 'coffee'
  | 'milkCoffee'
  | 'tea'
  | 'roseTea'
  | 'milkTea'
  | 'smoothie'
  | 'mango'
  | 'orange'
  | 'cake';

function hasRealImageUrl(url?: string): boolean {
  return Boolean(url && url.trim() !== '' && !url.includes('example.com'));
}

function resolveVariant(product: Product): CupVariant {
  switch (product.product_id) {
    case 'SP001':
      return 'coffee';
    case 'SP002':
    case 'SP003':
    case 'SP004':
    case 'SP005':
      return 'milkCoffee';
    case 'SP006':
      return 'tea';
    case 'SP007':
      return 'roseTea';
    case 'SP008':
      return 'milkTea';
    case 'SP009':
      return 'smoothie';
    case 'SP010':
      return 'mango';
    case 'SP011':
      return 'orange';
    default:
      if (product.category === 'Bánh') return 'cake';
      if (product.category === 'Trà') return 'tea';
      if (product.category === 'Sinh tố') return 'smoothie';
      if (product.category === 'Nước ép') return 'orange';
      return 'coffee';
  }
}

/**
 * Kẹp gỗ / nhựa màu kem bám trực tiếp lên dây thừng ngang.
 */
const HangingClip: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 44 48"
    className={`w-9 h-10 drop-shadow-[0_4px_6px_rgba(90,46,28,0.22)] pointer-events-none select-none ${className}`}
    aria-hidden="true"
  >
    <path
      d="M12 18 C12 7, 32 7, 32 18 L32 25 L12 25 Z"
      fill="#DFC4A4"
      stroke="#B9936C"
      strokeWidth="1.5"
    />
    <circle cx="22" cy="14.5" r="4" fill="#FCE8D5" stroke="#B9936C" strokeWidth="1.4" />
    <rect x="13" y="23" width="18" height="6" rx="2.5" fill="#C6A17B" />
    <path
      d="M6 29 L38 29 C39.5 29 40.5 30.2 40.5 31.8 L39 40 C38.8 41.5 37.5 42.5 36 42.5 L8 42.5 C6.5 42.5 5.2 41.5 5 40 L3.5 31.8 C3.5 30.2 4.5 29 6 29 Z"
      fill="#EAD2B5"
      stroke="#B9936C"
      strokeWidth="1.5"
    />
    <line x1="8" y1="35" x2="36" y2="35" stroke="#C9A581" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const FloatingProductVisual: React.FC<{
  product: Product;
  variant: CupVariant;
}> = ({ product, variant }) => {
  if (hasRealImageUrl(product.image_url)) {
    return (
      <div className="w-32 h-40 sm:w-36 sm:h-44 rounded-[26px] overflow-hidden border-4 border-[#FFFDF8] bg-[#FCE8D5] shadow-[0_18px_30px_-10px_rgba(90,46,28,0.38)]">
        <img
          src={product.image_url}
          alt={product.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  if (variant === 'cake') {
    return (
      <div className="w-32 h-36 sm:w-36 sm:h-40 rounded-2xl bg-[#FFFDF8] border-2 border-[#EDB9B3] p-3 shadow-[0_18px_28px_-10px_rgba(90,46,28,0.28)] flex flex-col items-center justify-center">
        <svg viewBox="0 0 110 90" className="w-24 h-20" aria-hidden="true">
          <ellipse cx="55" cy="76" rx="38" ry="8" fill="#8A5036" opacity="0.16" />
          <path d="M20 66 L90 66 L86 36 L34 26 Z" fill="#9B3922" />
          <path d="M20 66 L90 66 L88 52 L22 52 Z" fill="#F9DCC4" />
          <path d="M34 26 Q62 18 86 36 L82 43 Q58 30 32 36 Z" fill="#6F3F2A" />
          <circle cx="58" cy="24" r="5" fill="#D4606A" />
        </svg>
        <span className="mt-1 text-[11px] font-bold text-[#7A3B26] text-center leading-tight line-clamp-1">
          {product.name}
        </span>
      </div>
    );
  }

  const cupPalettes: Record<
    Exclude<CupVariant, 'cake'>,
    { top: string; mid: string; bottom: string; rim: string; foam: string; accent: string }
  > = {
    coffee: {
      top: '#FFF8F0',
      mid: '#B86B38',
      bottom: '#5A2E1C',
      rim: '#EED9C4',
      foam: '#FFFDF8',
      accent: '#7A3B26',
    },
    milkCoffee: {
      top: '#FFF5E8',
      mid: '#C78A5B',
      bottom: '#6F3F2A',
      rim: '#E7C8AA',
      foam: '#FFF8EE',
      accent: '#8A5036',
    },
    tea: {
      top: '#FFD2BA',
      mid: '#EE8262',
      bottom: '#C4535A',
      rim: '#EDB9B3',
      foam: '#FFFDF8',
      accent: '#F4A261',
    },
    roseTea: {
      top: '#FAD0D6',
      mid: '#E57F90',
      bottom: '#C4455A',
      rim: '#EDB9B3',
      foam: '#FFF7F8',
      accent: '#F9D5D3',
    },
    milkTea: {
      top: '#FCE8D5',
      mid: '#D4A57B',
      bottom: '#9A6845',
      rim: '#DFBFA2',
      foam: '#FFFDF8',
      accent: '#5A2E1C',
    },
    smoothie: {
      top: '#94BA76',
      mid: '#C4DCAA',
      bottom: '#FFF8EE',
      rim: '#B7CE9E',
      foam: '#EFF7E6',
      accent: '#5F8A56',
    },
    mango: {
      top: '#FFE7A8',
      mid: '#F6B94E',
      bottom: '#E08A1E',
      rim: '#F5CE87',
      foam: '#FFF7DF',
      accent: '#D4701E',
    },
    orange: {
      top: '#FFDDB0',
      mid: '#F49B3E',
      bottom: '#D4701E',
      rim: '#F2BE86',
      foam: '#FFF6E8',
      accent: '#FFE7A8',
    },
  };

  const p = cupPalettes[variant];
  const gradId = `jejiCup-${product.product_id}`;

  return (
    <svg
      viewBox="0 0 150 205"
      className="w-32 h-44 sm:w-36 sm:h-48 drop-shadow-[0_20px_24px_rgba(90,46,28,0.3)]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.top} />
          <stop offset="55%" stopColor={p.mid} />
          <stop offset="100%" stopColor={p.bottom} />
        </linearGradient>
      </defs>
      <path
        d="M22 36 L128 36 L114 176 C112.5 186 102 192 75 192 C48 192 37.5 186 36 176 Z"
        fill={`url(#${gradId})`}
        stroke="#FFFDF8"
        strokeWidth="3"
      />
      <path
        d="M30 105 Q54 92 75 114 T120 104 L115 152 Q92 140 72 158 T34 146 Z"
        fill={p.bottom}
        opacity="0.55"
      />
      <rect
        x="45"
        y="66"
        width="20"
        height="19"
        rx="5"
        transform="rotate(-12 55 75)"
        fill="#FFFDF8"
        opacity="0.48"
      />
      <rect
        x="78"
        y="72"
        width="22"
        height="20"
        rx="5"
        transform="rotate(14 89 82)"
        fill="#FFFDF8"
        opacity="0.44"
      />
      {variant === 'milkTea' && (
        <g fill="#5A2E1C" opacity="0.85">
          <circle cx="52" cy="172" r="6" />
          <circle cx="67" cy="175" r="6.5" />
          <circle cx="83" cy="174" r="6" />
          <circle cx="97" cy="170" r="5.5" />
          <circle cx="60" cy="161" r="5.5" />
          <circle cx="76" cy="162" r="6" />
        </g>
      )}
      <path
        d="M17 36 C17 26, 37 21, 75 21 C113 21, 133 26, 133 36 C133 43, 113 48, 75 48 C37 48, 17 43, 17 36 Z"
        fill={p.foam}
        stroke={p.rim}
        strokeWidth="2.2"
      />
      <ellipse cx="75" cy="31" rx="44" ry="7" fill={p.top} opacity="0.6" />
      <path
        d="M35 55 L43 166"
        stroke="#FFFDF8"
        strokeWidth="4.5"
        strokeLinecap="round"
        opacity="0.42"
      />
    </svg>
  );
};

export const FloatingBannerShowcase: React.FC<FloatingBannerShowcaseProps> = ({
  visualType,
  products,
  combos,
  customBgUrl,
  onSelectProduct,
  onCopyCoupon,
}) => {
  const hangingProducts = useMemo(() => {
    const available = products.filter((p) => p.category !== 'Topping' && p.is_available);
    const orderedIds =
      visualType === 'combo'
        ? ['SP001', 'SP012', 'SP006', 'SP013', 'SP002', 'SP009']
        : visualType === 'student'
        ? ['SP006', 'SP008', 'SP009', 'SP001', 'SP010', 'SP011']
        : ['SP001', 'SP006', 'SP009', 'SP002', 'SP007', 'SP008', 'SP012'];

    const picked: Product[] = [];
    for (const id of orderedIds) {
      const found = available.find((p) => p.product_id === id);
      if (found) picked.push(found);
    }
    for (const p of available) {
      if (picked.length >= 7) break;
      if (!picked.some((x) => x.product_id === p.product_id)) picked.push(p);
    }
    return picked;
  }, [products, visualType]);

  const cb001 = combos.find((c) => c.combo_id === 'CB001') || combos[0];

  type ShowcaseItem =
    | { kind: 'product'; key: string; product: Product; offsetClass: string; delay: string }
    | { kind: 'brand'; key: string; offsetClass: string; delay: string }
    | { kind: 'coupon'; key: string; offsetClass: string; delay: string };

  const trackItems: ShowcaseItem[] = useMemo(() => {
    const offsets = ['mt-0', 'mt-4', 'mt-1', 'mt-5', 'mt-0', 'mt-3', 'mt-2'];
    const items: ShowcaseItem[] = hangingProducts.map((product, idx) => ({
      kind: 'product',
      key: product.product_id,
      product,
      offsetClass: offsets[idx % offsets.length],
      delay: `${(idx * 0.55).toFixed(2)}s`,
    }));

    // Chèn thẻ logo JeJi hoặc thẻ mã ưu đãi vào giữa đoàn treo dây
    if (visualType === 'student') {
      items.splice(2, 0, {
        kind: 'coupon',
        key: 'coupon-hssv15',
        offsetClass: 'mt-2',
        delay: '1.1s',
      });
    } else {
      items.splice(2, 0, {
        kind: 'brand',
        key: 'brand-card',
        offsetClass: 'mt-3',
        delay: '1.1s',
      });
    }

    return items;
  }, [hangingProducts, visualType]);

  const renderTrackGroup = (dupIndex: number) =>
    trackItems.map((item) => {
      if (item.kind === 'brand') {
        return (
          <div
            key={`g${dupIndex}-${item.key}`}
            className="shrink-0 px-3 sm:px-4 flex flex-col items-center"
          >
            <div
              className={`animate-jeji-sway flex flex-col items-center ${item.offsetClass}`}
              style={{ animationDelay: item.delay }}
            >
              <HangingClip className="-mb-3 z-20" />
              <div className="w-32 rounded-2xl bg-[#FFFDF8] border-2 border-[#EDB9B3] p-3 shadow-lg text-center space-y-1.5">
                <BrandLogo size="md" cropped={false} className="mx-auto" />
                <p className="text-[11px] font-bold text-[#7A3B26] leading-tight">
                  {visualType === 'combo' && cb001 ? cb001.name : 'JeJi Craft'}
                </p>
                <p className="text-[11px] font-bold text-[#C4535A] tabular-nums">
                  {visualType === 'combo' && cb001 ? formatVND(cb001.combo_price) : 'Pha mới mỗi sáng'}
                </p>
              </div>
            </div>
          </div>
        );
      }

      if (item.kind === 'coupon') {
        return (
          <div
            key={`g${dupIndex}-${item.key}`}
            className="shrink-0 px-3 sm:px-4 flex flex-col items-center"
          >
            <button
              type="button"
              onClick={() => onCopyCoupon('HSSV15')}
              className={`animate-jeji-sway group flex flex-col items-center cursor-pointer focus-visible:outline-none ${item.offsetClass}`}
              style={{ animationDelay: item.delay }}
            >
              <HangingClip className="-mb-3 z-20" />
              <div className="w-32 rounded-2xl bg-[#FFFDF8] border-2 border-[#D4606A]/65 p-3.5 shadow-lg text-center space-y-1 group-hover:scale-105 transition-transform">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-[#9B3922]">
                  Ưu đãi HSSV
                </span>
                <span className="block font-mono text-lg font-extrabold text-[#AA2B1D]">
                  HSSV15
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6F3F2A]">
                  <Copy className="w-3 h-3" /> Chạm sao chép
                </span>
              </div>
            </button>
          </div>
        );
      }

      const variant = resolveVariant(item.product);
      return (
        <div
          key={`g${dupIndex}-${item.key}`}
          className="shrink-0 px-3 sm:px-4 flex flex-col items-center"
        >
          <button
            type="button"
            onClick={() => onSelectProduct(item.product)}
            aria-label={`Chọn món ${item.product.name}`}
            className={`animate-jeji-sway group flex flex-col items-center cursor-pointer focus-visible:outline-none ${item.offsetClass}`}
            style={{ animationDelay: item.delay }}
          >
            <HangingClip className="-mb-3.5 z-20 transition-transform group-hover:scale-105" />
            <div className="transition-transform duration-200 group-hover:scale-105">
              <FloatingProductVisual product={item.product} variant={variant} />
            </div>
            <span className="mt-2 px-3 py-1 rounded-xl bg-[#FFFDF8]/95 border border-[#EDB9B3] shadow-sm text-[11px] sm:text-xs font-bold text-[#5A2E1C] group-hover:bg-[#8A5036] group-hover:text-[#FBDB93] transition-colors whitespace-nowrap">
              {item.product.name} ·{' '}
              <span className="text-[#C4535A] group-hover:text-[#FBDB93] tabular-nums">
                {formatVND(item.product.price_m)}
              </span>
            </span>
          </button>
        </div>
      );
    });

  return (
    <div className="relative w-full h-[340px] sm:h-[380px] lg:h-[440px] flex items-center overflow-hidden select-none">
      {/* Ảnh nền banner tùy chỉnh (nếu người dùng đã đổi ảnh) */}
      {customBgUrl && (
        <img
          src={customBgUrl}
          alt="Nền banner JeJi Coffee"
          className="absolute inset-0 w-full h-full object-cover opacity-30 mix-blend-multiply rounded-3xl"
        />
      )}

      {/* Quầng sáng nắng ấm phía sau dải sản phẩm */}
      <div
        className="absolute inset-x-6 top-14 bottom-10 rounded-full pointer-events-none blur-2xl opacity-60"
        style={{
          background:
            'radial-gradient(circle at 55% 45%, rgba(251,219,147,0.85) 0%, rgba(249,213,211,0.45) 55%, transparent 78%)',
        }}
      />

      {/* Sợi dây thừng bện ngang chạy suốt chiều rộng khung banner */}
      <div
        aria-hidden="true"
        className="absolute top-[58px] sm:top-[64px] inset-x-0 h-5 z-10 pointer-events-none flex items-center"
      >
        <div className="w-full h-2.5 rounded-full bg-gradient-to-b from-[#B9865D] via-[#9B6B46] to-[#7A4E2F] shadow-[0_4px_10px_rgba(90,46,28,0.22)] relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-55"
            style={{
              backgroundImage:
                'repeating-linear-gradient(120deg, transparent 0px, transparent 6px, #E5C8A6 6px, #E5C8A6 10px)',
            }}
          />
        </div>
      </div>

      {/* Băng chuyền sản phẩm treo dây chuyển động liên tục từ phải sang trái */}
      <div
        className="relative z-20 w-full h-full overflow-hidden pt-[48px] sm:pt-[54px]"
        style={{
          WebkitMaskImage:
            'linear-gradient(to right, transparent 0%, rgba(255,255,255,1) 7%, rgba(255,255,255,1) 93%, transparent 100%)',
          maskImage:
            'linear-gradient(to right, transparent 0%, rgba(255,255,255,1) 7%, rgba(255,255,255,1) 93%, transparent 100%)',
        }}
      >
        <div className="animate-jeji-hanging-track items-start">
          <div className="flex items-start shrink-0">{renderTrackGroup(0)}</div>
          <div className="flex items-start shrink-0" aria-hidden="true">
            {renderTrackGroup(1)}
          </div>
        </div>
      </div>
    </div>
  );
};
