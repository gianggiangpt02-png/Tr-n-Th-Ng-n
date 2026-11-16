/**
 * Định dạng tiền VND thống nhất: "29.000đ"
 */
export function formatVND(amount: number): string {
  const safe = Math.max(0, Math.round(amount || 0));
  return `${safe.toLocaleString('vi-VN')}đ`;
}

/**
 * Loại bỏ dấu tiếng Việt để tìm kiếm không phân biệt dấu.
 */
export function removeVietnameseTones(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Lấy chuỗi ngày hôm nay theo múi giờ Việt Nam (YYYY-MM-DD).
 */
export function getTodayVNDateStr(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Định dạng ngày giờ hiển thị theo múi giờ Việt Nam.
 */
export function formatDateTimeVN(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  if (Number.isNaN(d.getTime())) return 'Đang cập nhật';
  return new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Định dạng ngày ngắn gọn dd/mm/yyyy.
 */
export function formatDateShortVN(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

/**
 * Kiểm tra quán đang mở cửa hay đã đóng cửa theo giờ Việt Nam.
 */
export function isStoreOpenNow(openTime: string, closeTime: string, now: Date = new Date()): {
  isOpen: boolean;
  currentTimeLabel: string;
} {
  const vnTimeStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);

  const [curH, curM] = vnTimeStr.split(':').map(Number);
  const [openH, openM] = openTime.split(':').map(Number);
  const [closeH, closeM] = closeTime.split(':').map(Number);

  const curMins = curH * 60 + curM;
  const openMins = openH * 60 + openM;
  const closeMins = closeH * 60 + closeM;

  return {
    isOpen: curMins >= openMins && curMins <= closeMins,
    currentTimeLabel: vnTimeStr,
  };
}

/**
 * Định dạng thời gian giao hàng dự kiến (eta_minutes).
 * Nếu >= 1440 phút → hiển thị "1–2 ngày".
 */
export function formatETA(etaMinutes: number): string {
  if (etaMinutes >= 1440) {
    return '1–2 ngày';
  }
  if (etaMinutes >= 60) {
    const hours = Math.floor(etaMinutes / 60);
    const mins = etaMinutes % 60;
    return mins > 0 ? `${hours} giờ ${mins} phút` : `${hours} giờ`;
  }
  return `Khoảng ${etaMinutes} phút`;
}

/**
 * Kiểm tra số điện thoại hợp lệ tại Việt Nam (10 số bắt đầu 03, 05, 07, 08, 09 hoặc +84).
 */
export function isValidVNPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s.-]/g, '');
  return /^(0|\+84)(3|5|7|8|9)[0-9]{8}$/.test(cleaned);
}

/**
 * Chuẩn hóa số điện thoại để so khớp khi tra cứu đơn hàng.
 */
export function normalizeVNPhone(phone: string): string {
  const cleaned = phone.replace(/[\s.-]/g, '');
  if (cleaned.startsWith('+84')) {
    return `0${cleaned.slice(3)}`;
  }
  return cleaned;
}
