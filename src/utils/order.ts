import { Order } from '../types';

/**
 * Sinh mã đơn hàng dạng JJ + yymmdd + số thứ tự 3 chữ số (vd JJ261116001).
 */
export function generateOrderId(existingOrders: Order[], now: Date = new Date()): string {
  const vnParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);

  const yy = vnParts.find((p) => p.type === 'year')?.value || '26';
  const mm = vnParts.find((p) => p.type === 'month')?.value || '11';
  const dd = vnParts.find((p) => p.type === 'day')?.value || '16';
  const prefix = `JJ${yy}${mm}${dd}`;

  const todayCount = existingOrders.filter((o) => o.order_id.startsWith(prefix)).length;
  const seq = String(todayCount + 1).padStart(3, '0');
  return `${prefix}${seq}`;
}

/**
 * Tính tổng đơn hàng thuần túy:
 * total = max(0, subtotal - orderDiscount) + max(0, shippingFee - shippingDiscount)
 */
export function calculateOrderTotals(params: {
  subtotal: number;
  shippingFee: number;
  orderDiscountAmount: number;
  shippingDiscountAmount: number;
}): {
  subtotal: number;
  shippingFee: number;
  totalDiscount: number;
  finalShippingFee: number;
  totalAmount: number;
} {
  const subtotal = Math.max(0, params.subtotal);
  const shippingFee = Math.max(0, params.shippingFee);
  const orderDiscount = Math.min(subtotal, Math.max(0, params.orderDiscountAmount));
  const shippingDiscount = Math.min(shippingFee, Math.max(0, params.shippingDiscountAmount));
  const finalShippingFee = shippingFee - shippingDiscount;
  const totalAmount = subtotal - orderDiscount + finalShippingFee;

  return {
    subtotal,
    shippingFee,
    totalDiscount: orderDiscount + shippingDiscount,
    finalShippingFee,
    totalAmount,
  };
}

/**
 * Tạo link theo dõi vận đơn từ tracking_url_template và tracking_code.
 */
export function buildTrackingUrl(template: string, trackingCode: string): string {
  if (!template || !trackingCode) return '';
  return template.replace('{tracking_code}', encodeURIComponent(trackingCode.trim()));
}
