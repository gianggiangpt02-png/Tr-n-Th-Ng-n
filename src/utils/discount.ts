import { Discount } from '../types';
import { formatVND, getTodayVNDateStr } from './format';

export interface DiscountValidationResult {
  valid: boolean;
  error?: string;
  discount?: Discount;
  /** Số tiền giảm trực tiếp vào tiền hàng (percent / fixed) */
  orderDiscountAmount: number;
  /** Số tiền giảm vào phí giao hàng (freeship) */
  shippingDiscountAmount: number;
  /** Tổng tiền được giảm thực tế */
  totalDiscountAmount: number;
}

/**
 * Kiểm tra tính hợp lệ và tính số tiền giảm của mã khuyến mãi.
 * - type = percent: giảm value% trên subtotal, tối đa max_discount
 * - type = fixed: giảm cố định value, tối đa max_discount (nếu có) và không vượt subtotal
 * - type = freeship: giảm phí ship tối đa bằng max_discount
 */
export function validateAndCalculateDiscount(
  rawCode: string,
  discounts: Discount[],
  subtotal: number,
  shippingFee: number = 0,
  todayStr: string = getTodayVNDateStr()
): DiscountValidationResult {
  const code = rawCode.trim().toUpperCase();
  if (!code) {
    return {
      valid: false,
      error: 'Vui lòng nhập mã giảm giá.',
      orderDiscountAmount: 0,
      shippingDiscountAmount: 0,
      totalDiscountAmount: 0,
    };
  }

  const found = discounts.find((d) => d.code.toUpperCase() === code);
  if (!found || !found.is_active) {
    return {
      valid: false,
      error: `Mã "${code}" không tồn tại hoặc đã ngừng áp dụng.`,
      orderDiscountAmount: 0,
      shippingDiscountAmount: 0,
      totalDiscountAmount: 0,
    };
  }

  if (todayStr < found.start_date) {
    return {
      valid: false,
      error: `Mã "${code}" chưa đến thời gian áp dụng.`,
      orderDiscountAmount: 0,
      shippingDiscountAmount: 0,
      totalDiscountAmount: 0,
    };
  }

  if (todayStr > found.end_date) {
    return {
      valid: false,
      error: `Mã "${code}" đã hết hạn sử dụng.`,
      orderDiscountAmount: 0,
      shippingDiscountAmount: 0,
      totalDiscountAmount: 0,
    };
  }

  if (found.used_count >= found.usage_limit) {
    return {
      valid: false,
      error: `Mã "${code}" đã hết lượt sử dụng.`,
      orderDiscountAmount: 0,
      shippingDiscountAmount: 0,
      totalDiscountAmount: 0,
    };
  }

  if (subtotal < found.min_order) {
    const missing = found.min_order - subtotal;
    return {
      valid: false,
      error: `Đơn tối thiểu ${formatVND(found.min_order)} (cần thêm ${formatVND(missing)}).`,
      orderDiscountAmount: 0,
      shippingDiscountAmount: 0,
      totalDiscountAmount: 0,
    };
  }

  let orderDiscountAmount = 0;
  let shippingDiscountAmount = 0;

  if (found.type === 'percent') {
    const raw = Math.round((subtotal * found.value) / 100);
    const capped = found.max_discount > 0 ? Math.min(raw, found.max_discount) : raw;
    orderDiscountAmount = Math.min(capped, subtotal);
  } else if (found.type === 'fixed') {
    const capped = found.max_discount > 0 ? Math.min(found.value, found.max_discount) : found.value;
    orderDiscountAmount = Math.min(capped, subtotal);
  } else if (found.type === 'freeship') {
    const cap = found.max_discount > 0 ? found.max_discount : found.value;
    shippingDiscountAmount = shippingFee > 0 ? Math.min(shippingFee, cap) : 0;
  }

  return {
    valid: true,
    discount: found,
    orderDiscountAmount,
    shippingDiscountAmount,
    totalDiscountAmount: orderDiscountAmount + shippingDiscountAmount,
  };
}

/**
 * Kiểm tra nhanh mã giảm giá có đang còn hiệu lực để hiển thị trên trang chủ/ưu đãi.
 */
export function isDiscountCurrentlyValid(
  discount: Discount,
  todayStr: string = getTodayVNDateStr()
): boolean {
  return (
    discount.is_active &&
    todayStr >= discount.start_date &&
    todayStr <= discount.end_date &&
    discount.used_count < discount.usage_limit
  );
}
