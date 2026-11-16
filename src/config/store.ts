import { StoreConfig } from '../types';

/**
 * CẤU HÌNH THÔNG TIN CỬA HÀNG JEJI COFFEE
 * Bạn chỉ cần thay thế các giá trị có dấu [ngoặc vuông] bằng thông tin thật của quán.
 * Giao diện sẽ tự động ẩn dấu [ ] và hiển thị "Đang cập nhật" nếu chưa điền.
 */
export const STORE_CONFIG: StoreConfig = {
  store_name: 'JeJi Coffee',
  slogan: 'Một ly cà phê - Một khoảnh khắc Jeji',
  address: 'Liên Bảo',
  district_city: 'Phường Vĩnh Yên, Phú Thọ',
  hotline: '0888436462',
  email: 'chao@jejicoffee.vn',
  open_time: '07:00',
  close_time: '22:30',
  // Tọa độ khu vực Liên Bảo, Phường Vĩnh Yên, Phú Thọ (dùng tính khoảng cách giao hàng & bản đồ)
  lat: 21.3089,
  lng: 105.6049,
  facebook_url: '[https://facebook.com/jejicoffee.vinhyen]',
  zalo_url: 'https://zalo.me/0888436462',
  google_maps_embed:
    'https://maps.google.com/maps?q=Li%C3%AAn%20B%E1%BA%A3o,%20V%C4%A9nh%20Y%C3%AAn,%20Ph%C3%BA%20Th%E1%BB%8D&hl=vi&z=16&output=embed',
  bank_name: 'MB Bank (Ngân hàng Quân đội)',
  bank_id: 'MB',
  bank_account_number: '0855983130',
  bank_account_name: 'TRAN THI NGAN',
  bank_qr_image: '/assets/aistudio/qr_b54590da.jpg',
  // LƯU Ý BẢO MẬT: Đây chỉ là mã PIN demo phía client cho giai đoạn 1 (localStorage).
  // Khi triển khai thực tế với backend/Firebase, cần thay bằng xác thực server-side.
  admin_pin: '2026',
};

/**
 * TÀI KHOẢN QUẢN TRỊ DEMO (GIAI ĐOẠN 1 - LOCALSTORAGE)
 * Thông tin này chỉ dùng để khởi tạo sẵn 1 tài khoản role = 'admin' trong localStorage
 * (mật khẩu sẽ được băm SHA-256 kèm salt ngẫu nhiên trước khi lưu; không in ra giao diện).
 * Khi chuyển sang Firebase Authentication thật, hãy xóa phần seed demo này và phân quyền qua Custom Claims / Firestore Rules.
 */
export const ADMIN_DEMO_ACCOUNT = {
  user_id: 'USR_ADMIN_01',
  full_name: 'Quản trị viên JeJi',
  phone: '0900002026',
  email: 'admin@jejicoffee.vn',
  passcode: 'JejiAdmin2026',
} as const;

/**
 * Kiểm tra xem giá trị cấu hình có đang là placeholder [ngoặc vuông] hay không.
 */
export function isPlaceholderValue(value?: string | null): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  return trimmed.length === 0 || (trimmed.startsWith('[') && trimmed.endsWith(']'));
}

/**
 * Trả về giá trị hiển thị an toàn, không bao giờ để lộ dấu [ ] ra giao diện.
 */
export function formatStoreField(value?: string | null, fallback = 'Đang cập nhật'): string {
  if (isPlaceholderValue(value)) return fallback;
  return value!.trim();
}

/**
 * Trả về địa chỉ đầy đủ của cửa hàng.
 */
export function getStoreFullAddress(): string {
  const addr = formatStoreField(STORE_CONFIG.address, '');
  return addr ? `${addr}, ${STORE_CONFIG.district_city}` : STORE_CONFIG.district_city;
}
