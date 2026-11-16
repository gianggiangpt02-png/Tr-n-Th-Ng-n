import { Combo, Product } from '../types';
import { getTodayVNDateStr } from './format';

export interface ParsedComboItem {
  product_id: string;
  quantity: number;
  product?: Product;
  name: string;
}

/**
 * Parse chuỗi items dạng "SP001:1|SP012:1" thành danh sách món kèm tên từ Products.
 */
export function parseComboItems(itemsStr: string, products: Product[]): ParsedComboItem[] {
  if (!itemsStr) return [];
  return itemsStr
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [pid, qtyRaw] = part.split(':');
      const product_id = (pid || '').trim();
      const quantity = Math.max(1, parseInt(qtyRaw || '1', 10) || 1);
      const product = products.find((p) => p.product_id === product_id);
      return {
        product_id,
        quantity,
        product,
        name: product ? product.name : product_id,
      };
    });
}

/**
 * Kiểm tra combo có is_active = TRUE và ngày hôm nay nằm trong [start_date, end_date].
 */
export function isComboActive(combo: Combo, todayStr: string = getTodayVNDateStr()): boolean {
  return combo.is_active && todayStr >= combo.start_date && todayStr <= combo.end_date;
}

/**
 * Tính % tiết kiệm của combo so với giá gốc.
 */
export function getComboSavingsPercent(combo: Combo): number {
  if (combo.original_price <= 0 || combo.combo_price >= combo.original_price) return 0;
  return Math.round(((combo.original_price - combo.combo_price) / combo.original_price) * 100);
}
