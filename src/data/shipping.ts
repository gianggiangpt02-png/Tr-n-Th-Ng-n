import { ShippingProvider } from '../types';

/**
 * Dữ liệu seed Shipping (giữ nguyên tên cột như sheet Shipping).
 * Công thức: base_fee + fee_per_km * max(0, khoảng_cách - free_radius_km)
 */
export const SEED_SHIPPING: ShippingProvider[] = [
  {
    provider_id: 'SHIP_JEJI',
    name: 'JeJi Giao Nhanh Nội Thành',
    description: 'Đội ngũ giao hàng riêng của quán, giữ đá tốt với túi giữ nhiệt',
    base_fee: 10000,
    fee_per_km: 4000,
    free_radius_km: 2,
    max_distance_km: 8,
    eta_minutes: 25,
    tracking_url_template: 'https://jejicoffee.vn/track/{tracking_code}',
    is_active: true,
  },
  {
    provider_id: 'SHIP_GRAB',
    name: 'GrabExpress Siêu Tốc',
    description: 'Giao hỏa tốc khu vực TP. Vĩnh Yên và vùng lân cận',
    base_fee: 15000,
    fee_per_km: 5000,
    free_radius_km: 1.5,
    max_distance_km: 15,
    eta_minutes: 20,
    tracking_url_template: 'https://express.grab.com/track/{tracking_code}',
    is_active: true,
  },
  {
    provider_id: 'SHIP_AHA',
    name: 'AhaMove Tiêu Chuẩn',
    description: 'Phù hợp đơn khoảng cách trung bình, cước phí tiết kiệm',
    base_fee: 12000,
    fee_per_km: 4000,
    free_radius_km: 2,
    max_distance_km: 20,
    eta_minutes: 35,
    tracking_url_template: 'https://ahamove.com/track/{tracking_code}',
    is_active: true,
  },
  {
    provider_id: 'SHIP_FAR',
    name: 'Vận chuyển Liên Huyện (Bánh & Hộp quà)',
    description: 'Áp dụng cho đơn khoảng cách xa, giao trong 1–2 ngày',
    base_fee: 25000,
    fee_per_km: 2000,
    free_radius_km: 5,
    max_distance_km: 50,
    eta_minutes: 1440,
    tracking_url_template: 'https://spx.vn/track?code={tracking_code}',
    is_active: true,
  },
];
