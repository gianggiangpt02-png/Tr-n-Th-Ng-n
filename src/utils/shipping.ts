import { ShippingProvider } from '../types';

/**
 * Tính khoảng cách đường chim bay (km) giữa 2 tọa độ bằng công thức Haversine.
 */
export function calculateHaversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 100) / 100;
}

export interface ShippingCalculationResult {
  provider: ShippingProvider;
  eligible: boolean;
  reason?: string;
  fee: number;
  distanceKm: number;
}

/**
 * Tính phí vận chuyển cho một đơn vị giao hàng dựa trên khoảng cách.
 * Công thức: base_fee + fee_per_km * max(0, khoảng_cách - free_radius_km)
 * Nếu khoảng_cách > max_distance_km → vô hiệu hóa kèm lý do rõ ràng.
 */
export function calculateShippingFee(
  provider: ShippingProvider,
  distanceKm: number
): ShippingCalculationResult {
  if (!provider.is_active) {
    return {
      provider,
      eligible: false,
      reason: 'Đơn vị vận chuyển tạm ngưng hoạt động',
      fee: 0,
      distanceKm,
    };
  }

  if (distanceKm > provider.max_distance_km) {
    return {
      provider,
      eligible: false,
      reason: `Ngoài phạm vi giao (${distanceKm.toFixed(1)} km > tối đa ${provider.max_distance_km} km)`,
      fee: 0,
      distanceKm,
    };
  }

  const chargeableKm = Math.max(0, distanceKm - provider.free_radius_km);
  // Làm tròn phí lên bội số 1.000đ cho gọn đẹp
  const rawFee = provider.base_fee + provider.fee_per_km * chargeableKm;
  const fee = Math.round(rawFee / 1000) * 1000;

  return {
    provider,
    eligible: true,
    fee,
    distanceKm,
  };
}
