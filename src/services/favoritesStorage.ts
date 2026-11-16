/**
 * Tầng lưu trữ danh sách món yêu thích tách riêng (Giai đoạn 1: localStorage, khóa jj_fav).
 * Sau này khi chuyển sang lưu theo tài khoản người dùng (Firebase/API),
 * chỉ cần thay phần cài đặt bên trong các hàm này mà không phải sửa giao diện.
 */

export const FAVORITES_STORAGE_KEY = 'jj_fav';

export function getFavoriteIds(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function saveFavoriteIds(ids: string[]): void {
  try {
    const unique = Array.from(new Set(ids));
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(unique));
  } catch {
    // Bỏ qua nếu bộ nhớ trình duyệt bị giới hạn
  }
}
