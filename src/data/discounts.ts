import { Discount } from '../types';

/**
 * Dữ liệu seed Discounts (giữ nguyên tên cột như sheet Discounts).
 */
export const SEED_DISCOUNTS: Discount[] = [
  {
    code: 'JEJI10',
    description: 'Giảm 10% tối đa 20.000đ cho đơn từ 50.000đ',
    type: 'percent',
    value: 10,
    min_order: 50000,
    max_discount: 20000,
    usage_limit: 200,
    used_count: 24,
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    is_active: true,
  },
  {
    code: 'FREESHIP',
    description: 'Miễn phí vận chuyển tối đa 15.000đ cho đơn từ 60.000đ',
    type: 'freeship',
    value: 15000,
    min_order: 60000,
    max_discount: 15000,
    usage_limit: 300,
    used_count: 41,
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    is_active: true,
  },
  {
    code: 'HSSV15',
    description: 'Ưu đãi HSSV Vĩnh Yên — Giảm 15% tối đa 25.000đ cho đơn từ 45.000đ',
    type: 'percent',
    value: 15,
    min_order: 45000,
    max_discount: 25000,
    usage_limit: 150,
    used_count: 19,
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    is_active: true,
  },
  {
    code: 'CHAOBAN20',
    description: 'Giảm trực tiếp 20.000đ cho đơn từ 100.000đ',
    type: 'fixed',
    value: 20000,
    min_order: 100000,
    max_discount: 20000,
    usage_limit: 100,
    used_count: 12,
    start_date: '2026-01-01',
    end_date: '2026-12-31',
    is_active: true,
  },
];
