import { ProductCategory } from '../types';

export interface ProductTheme {
  bg: string;
  bgSecondary: string;
  accent: string;
  text: string;
  badgeBg: string;
  badgeText: string;
}

/**
 * Bảng màu riêng cho từng sản phẩm [nền thẻ, màu nhấn giá/nút].
 * Chữ trên nền pastel dùng nâu đậm #5A2E1C để đạt tương phản WCAG AA.
 */
const PRODUCT_COLOR_PAIRS: Record<string, [string, string]> = {
  SP001: ['#F9DCC4', '#914F1E'],
  SP002: ['#FFEFD6', '#BE5B50'],
  SP003: ['#E3CDB8', '#6F3F2A'],
  SP004: ['#F0D2B4', '#9B3922'],
  SP005: ['#F6D8D0', '#A5503A'],
  SP006: ['#FFD6CC', '#D4573F'],
  SP007: ['#FAD0D6', '#C4455A'],
  SP008: ['#EFD8C4', '#8A5A3A'],
  SP009: ['#DCE9C9', '#5F8A56'],
  SP010: ['#FFE7A8', '#E08A1E'],
  SP011: ['#FFDDB0', '#D4701E'],
  SP012: ['#F6D9D4', '#9B3922'],
  SP013: ['#FFF0B8', '#C97A1E'],
  SP014: ['#F3DDD5', '#9B3922'],
  SP015: ['#F6E2DA', '#8A5036'],
};

const CATEGORY_FALLBACK_PAIRS: Record<ProductCategory | 'Combo', [string, string]> = {
  'Cà phê': ['#F9DCC4', '#914F1E'],
  'Trà': ['#FFD6CC', '#D4573F'],
  'Sinh tố': ['#DCE9C9', '#5F8A56'],
  'Nước ép': ['#FFDDB0', '#D4701E'],
  'Bánh': ['#F6D9D4', '#9B3922'],
  'Topping': ['#F3DDD5', '#9B3922'],
  'Combo': ['#F9D5D3', '#C4535A'],
};

export function getProductTheme(
  productId: string,
  category?: ProductCategory | 'Combo'
): ProductTheme {
  const pair =
    PRODUCT_COLOR_PAIRS[productId] ||
    (category && CATEGORY_FALLBACK_PAIRS[category]) ||
    PRODUCT_COLOR_PAIRS.SP001;

  const [bg, accent] = pair;
  return {
    bg,
    bgSecondary: '#FFF4EA',
    accent,
    text: '#5A2E1C',
    badgeBg: '#AA2B1D',
    badgeText: '#FFFFFF',
  };
}
