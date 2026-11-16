import { FIREBASE_CONFIG, isFirebaseConfigured } from '../config/firebase';
import { ADMIN_DEMO_ACCOUNT } from '../config/store';
import { Discount, MemberTier, Order, PointTransaction, User, UserAddress } from '../types';
import { isDiscountCurrentlyValid } from '../utils/discount';
import { isValidVNPhone, normalizeVNPhone, removeVietnameseTones } from '../utils/format';
import { api } from './api';

/**
 * TẦNG XÁC THỰC & TÀI KHOẢN TÁCH RIÊNG (src/services/auth.ts)
 * -----------------------------------------------------------------------------
 * LƯU Ý BẢO MẬT (GIAI ĐOẠN 1 - DEMO):
 * - Phiên bản mặc định lưu tài khoản trong localStorage và băm mật khẩu bằng
 *   Web Crypto API (SHA-256 + salt ngẫu nhiên 16 bytes) ngay trên trình duyệt.
 * - Đây là bản DEMO chạy không cần máy chủ, KHÔNG an toàn như hệ thống backend
 *   hoặc Firebase Authentication thật (dữ liệu localStorage có thể bị chỉnh sửa
 *   bởi người dùng trên máy cá nhân).
 * - Khi cấu hình các biến môi trường VITE_FIREBASE_* trong .env, service sẽ tự
 *   động chuyển sang sử dụng adapter Firebase Authentication (Identity Toolkit)
 *   mà không cần sửa mã nguồn giao diện.
 */

export const AUTH_STORAGE_KEYS = {
  USERS: 'jeji_users_v1',
  SESSION_LOCAL: 'jeji_auth_session_v1',
  SESSION_TEMP: 'jeji_auth_session_temp_v1',
  LOGIN_ATTEMPTS: 'jeji_login_attempts_v1',
  SEED_VERSION: 'jeji_users_seed_v1',
} as const;

const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 ngày khi chọn "Ghi nhớ đăng nhập"
const TEMP_SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 giờ cho sessionStorage
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 5 * 60 * 1000; // 5 phút

export interface AuthSession {
  user_id: string;
  expires_at: number;
  firebase_id_token?: string;
}

export interface RegisterInput {
  full_name: string;
  phone: string;
  email?: string;
  password: string;
  confirm_password: string;
  accepted_terms: boolean;
}

export interface LoginAttemptRecord {
  count: number;
  first_attempt_at: number;
  locked_until: number | null;
}

export interface RewardOption {
  id: string;
  title: string;
  description: string;
  points_cost: number;
  discount_type: 'fixed' | 'freeship';
  value: number;
  min_order: number;
  max_discount: number;
}

export const REWARD_CATALOG: RewardOption[] = [
  {
    id: 'RW_10K',
    title: 'Voucher giảm 10.000đ',
    description: 'Áp dụng cho đơn từ 40.000đ',
    points_cost: 50,
    discount_type: 'fixed',
    value: 10000,
    min_order: 40000,
    max_discount: 10000,
  },
  {
    id: 'RW_25K',
    title: 'Voucher giảm 25.000đ',
    description: 'Áp dụng cho đơn từ 80.000đ',
    points_cost: 100,
    discount_type: 'fixed',
    value: 25000,
    min_order: 80000,
    max_discount: 25000,
  },
  {
    id: 'RW_FREESHIP',
    title: 'Voucher Freeship 20.000đ',
    description: 'Giảm tối đa 20.000đ phí giao hàng cho đơn từ 50.000đ',
    points_cost: 150,
    discount_type: 'freeship',
    value: 20000,
    min_order: 50000,
    max_discount: 20000,
  },
  {
    id: 'RW_50K',
    title: 'Voucher giảm 50.000đ',
    description: 'Áp dụng cho đơn từ 150.000đ',
    points_cost: 250,
    discount_type: 'fixed',
    value: 50000,
    min_order: 150000,
    max_discount: 50000,
  },
];

export function computeMemberTier(points: number): MemberTier {
  if (points >= 1500) return 'Vàng';
  if (points >= 500) return 'Bạc';
  return 'Đồng';
}

export function getTierProgressInfo(points: number): {
  currentTier: MemberTier;
  nextTier: MemberTier | null;
  pointsToNext: number;
  progressPercent: number;
  rangeLabel: string;
} {
  if (points >= 1500) {
    return {
      currentTier: 'Vàng',
      nextTier: null,
      pointsToNext: 0,
      progressPercent: 100,
      rangeLabel: 'Hạng cao nhất (từ 1.500 điểm)',
    };
  }
  if (points >= 500) {
    const progress = Math.min(100, Math.round(((points - 500) / 1000) * 100));
    return {
      currentTier: 'Bạc',
      nextTier: 'Vàng',
      pointsToNext: 1500 - points,
      progressPercent: progress,
      rangeLabel: '500 – 1.499 điểm',
    };
  }
  const progress = Math.min(100, Math.round((points / 500) * 100));
  return {
    currentTier: 'Đồng',
    nextTier: 'Bạc',
    pointsToNext: 500 - points,
    progressPercent: progress,
    rangeLabel: '0 – 499 điểm',
  };
}

export function evaluatePasswordStrength(password: string): {
  score: number;
  label: string;
  barColor: string;
  hasMinLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
} {
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-ZÀ-ỹ]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialOrUpper = /[A-Z]/.test(password) && /[^a-zA-Z0-9]/.test(password);

  let score = 0;
  if (password.length > 0) score = 1;
  if (hasMinLength) score += 1;
  if (hasLetter && hasNumber) score += 1;
  if (hasMinLength && hasLetter && hasNumber && (password.length >= 11 || hasSpecialOrUpper)) {
    score = 4;
  }

  const map: Record<number, { label: string; barColor: string }> = {
    0: { label: 'Chưa nhập', barColor: '#E3CDB8' },
    1: { label: 'Yếu', barColor: '#AA2B1D' },
    2: { label: 'Trung bình', barColor: '#E08A1E' },
    3: { label: 'Mạnh', barColor: '#5F8A56' },
    4: { label: 'Rất mạnh', barColor: '#5F8A56' },
  };

  return {
    score,
    label: map[score].label,
    barColor: map[score].barColor,
    hasMinLength,
    hasLetter,
    hasNumber,
  };
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8 && /[a-zA-ZÀ-ỹ]/.test(password) && /[0-9]/.test(password);
}

export function isValidEmail(email: string): boolean {
  if (!email.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// === WEB CRYPTO HASHING (SHA-256 + SALT NGẪU NHIÊN) ===

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function generateSalt(byteLength = 16): string {
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buf = new Uint8Array(byteLength);
    crypto.getRandomValues(buf);
    return toHex(buf);
  }
  let fallback = '';
  for (let i = 0; i < byteLength; i++) {
    fallback += Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0');
  }
  return fallback;
}

export async function hashPassword(password: string, salt: string): Promise<string> {
  const payload = `${salt}:${password}`;
  if (typeof crypto !== 'undefined' && crypto.subtle && typeof TextEncoder !== 'undefined') {
    const encoded = new TextEncoder().encode(payload);
    const digest = await crypto.subtle.digest('SHA-256', encoded);
    return toHex(new Uint8Array(digest));
  }
  // Fallback chỉ dùng nếu trình duyệt không hỗ trợ Web Crypto Subtle
  let h1 = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    h1 ^= payload.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  return (h1 >>> 0).toString(16).padStart(8, '0');
}

// === STORAGE HELPERS ===

function readUsersRaw(): User[] {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.USERS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as User[]) : [];
  } catch {
    return [];
  }
}

function writeUsersRaw(users: User[]): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEYS.USERS, JSON.stringify(users));
  } catch {
    // Bỏ qua nếu bộ nhớ đầy
  }
}

function readAttemptMap(): Record<string, LoginAttemptRecord> {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEYS.LOGIN_ATTEMPTS);
    return raw ? (JSON.parse(raw) as Record<string, LoginAttemptRecord>) : {};
  } catch {
    return {};
  }
}

function writeAttemptMap(map: Record<string, LoginAttemptRecord>): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEYS.LOGIN_ATTEMPTS, JSON.stringify(map));
  } catch {
    // ignore
  }
}

function getAttemptKey(identifier: string): string {
  const cleaned = identifier.trim().toLowerCase();
  if (isValidVNPhone(cleaned)) {
    return normalizeVNPhone(cleaned);
  }
  return cleaned;
}

function checkLoginLockout(key: string): string | null {
  const map = readAttemptMap();
  const rec = map[key];
  if (!rec) return null;

  const now = Date.now();
  if (rec.locked_until && rec.locked_until > now) {
    const remainSec = Math.ceil((rec.locked_until - now) / 1000);
    const mins = Math.floor(remainSec / 60);
    const secs = remainSec % 60;
    const timeLabel = mins > 0 ? `${mins} phút ${secs} giây` : `${secs} giây`;
    return `Bạn đã nhập sai quá 5 lần. Vui lòng thử lại sau ${timeLabel}.`;
  }

  // Hết hạn khóa hoặc hết cửa sổ 5 phút -> reset
  if ((rec.locked_until && rec.locked_until <= now) || now - rec.first_attempt_at > LOCKOUT_WINDOW_MS) {
    delete map[key];
    writeAttemptMap(map);
  }
  return null;
}

function recordFailedLoginAttempt(key: string): string {
  const map = readAttemptMap();
  const now = Date.now();
  const prev = map[key];

  let nextCount = 1;
  let firstAt = now;

  if (prev && now - prev.first_attempt_at <= LOCKOUT_WINDOW_MS) {
    nextCount = prev.count + 1;
    firstAt = prev.first_attempt_at;
  }

  if (nextCount >= MAX_LOGIN_ATTEMPTS) {
    map[key] = {
      count: nextCount,
      first_attempt_at: firstAt,
      locked_until: now + LOCKOUT_WINDOW_MS,
    };
    writeAttemptMap(map);
    return 'Bạn đã nhập sai 5 lần liên tiếp. Tài khoản tạm khóa đăng nhập trong 5 phút.';
  }

  map[key] = {
    count: nextCount,
    first_attempt_at: firstAt,
    locked_until: null,
  };
  writeAttemptMap(map);
  const left = MAX_LOGIN_ATTEMPTS - nextCount;
  return `Số điện thoại/email hoặc mật khẩu chưa đúng (còn ${left} lần thử).`;
}

function clearFailedLoginAttempt(key: string): void {
  const map = readAttemptMap();
  if (map[key]) {
    delete map[key];
    writeAttemptMap(map);
  }
}

function saveSession(session: AuthSession, rememberMe: boolean): void {
  try {
    if (rememberMe) {
      localStorage.setItem(AUTH_STORAGE_KEYS.SESSION_LOCAL, JSON.stringify(session));
      sessionStorage.removeItem(AUTH_STORAGE_KEYS.SESSION_TEMP);
    } else {
      sessionStorage.setItem(AUTH_STORAGE_KEYS.SESSION_TEMP, JSON.stringify(session));
      localStorage.removeItem(AUTH_STORAGE_KEYS.SESSION_LOCAL);
    }
  } catch {
    // ignore
  }
}

function readSession(): AuthSession | null {
  try {
    const tempRaw = sessionStorage.getItem(AUTH_STORAGE_KEYS.SESSION_TEMP);
    if (tempRaw) {
      const parsed = JSON.parse(tempRaw) as AuthSession;
      if (parsed.expires_at > Date.now()) return parsed;
      sessionStorage.removeItem(AUTH_STORAGE_KEYS.SESSION_TEMP);
    }
    const localRaw = localStorage.getItem(AUTH_STORAGE_KEYS.SESSION_LOCAL);
    if (localRaw) {
      const parsed = JSON.parse(localRaw) as AuthSession;
      if (parsed.expires_at > Date.now()) return parsed;
      localStorage.removeItem(AUTH_STORAGE_KEYS.SESSION_LOCAL);
    }
    return null;
  } catch {
    return null;
  }
}

function clearSession(): void {
  try {
    sessionStorage.removeItem(AUTH_STORAGE_KEYS.SESSION_TEMP);
    localStorage.removeItem(AUTH_STORAGE_KEYS.SESSION_LOCAL);
  } catch {
    // ignore
  }
}

function findWelcomeDiscountCode(): string {
  const discounts = api.getDiscounts();
  const preferred = discounts.find(
    (d) => isDiscountCurrentlyValid(d) && d.type === 'percent' && d.value === 10
  );
  if (preferred) return preferred.code;
  const fallback = discounts.find((d) => isDiscountCurrentlyValid(d));
  return fallback ? fallback.code : '';
}

function generateUserId(users: User[]): string {
  const numeric = users
    .map((u) => {
      const m = u.user_id.match(/USR(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    })
    .reduce((max, n) => Math.max(max, n), 0);
  return `USR${String(numeric + 1).padStart(4, '0')}`;
}

function buildDefaultInitialsAvatar(name: string): string {
  const palette = ['#D4606A', '#8A5036', '#BE5B50', '#914F1E', '#5F8A56', '#C4535A'];
  const code = (name || 'J').charCodeAt(0) % palette.length;
  return `initials:${palette[code]}`;
}

// === KHỞI TẠO TÀI KHOẢN DEMO (ADMIN & KHÁCH HÀNG MẪU) ===

let seedPromise: Promise<void> | null = null;

export async function ensureSeedUsers(): Promise<void> {
  const users = readUsersRaw();
  const hasAdmin = users.some((u) => u.role === 'admin');
  if (hasAdmin && users.length > 0) return;

  if (!seedPromise) {
    seedPromise = (async () => {
      const current = readUsersRaw();
      const next = [...current];

      // 1. Tạo tài khoản Admin demo từ cấu hình src/config/store.ts
      if (!next.some((u) => u.role === 'admin')) {
        const adminSalt = generateSalt();
        const adminHash = await hashPassword(ADMIN_DEMO_ACCOUNT.passcode, adminSalt);
        next.push({
          user_id: ADMIN_DEMO_ACCOUNT.user_id,
          full_name: ADMIN_DEMO_ACCOUNT.full_name,
          phone: normalizeVNPhone(ADMIN_DEMO_ACCOUNT.phone),
          email: ADMIN_DEMO_ACCOUNT.email,
          password_hash: adminHash,
          salt: adminSalt,
          role: 'admin',
          avatar: 'initials:#8A5036',
          birthday: '',
          addresses: [],
          points: 0,
          tier: 'Đồng',
          favorites: [],
          notify_order_status: true,
          point_history: [],
          created_at: '2026-01-01T08:00:00+07:00',
        });
      }

      // 2. Tạo 1 tài khoản khách hàng mẫu khớp với đơn SEED_ORDERS JJ261116001
      if (!next.some((u) => normalizeVNPhone(u.phone) === '0912345678')) {
        const custSalt = generateSalt();
        const custHash = await hashPassword('JejiDemo123', custSalt);
        next.push({
          user_id: 'USR0001',
          full_name: 'Nguyễn Minh Anh',
          phone: '0912345678',
          email: 'minhanh@jejicoffee.vn',
          password_hash: custHash,
          salt: custSalt,
          role: 'customer',
          avatar: 'initials:#D4606A',
          birthday: '1999-08-18',
          addresses: [
            {
              address_id: 'ADDR-SEED-1',
              label: 'Nhà',
              recipient_name: 'Nguyễn Minh Anh',
              phone: '0912345678',
              full_address: '18 Đường Mê Linh, Liên Bảo, Vĩnh Yên',
              lat: 21.3125,
              lng: 105.6082,
              is_default: true,
            },
          ],
          points: 180,
          tier: 'Đồng',
          favorites: ['SP001', 'SP006'],
          notify_order_status: true,
          welcome_code: 'JEJI10',
          point_history: [
            {
              tx_id: 'PT-SEED-1',
              created_at: '2026-11-10T10:20:00+07:00',
              type: 'earn',
              points: 180,
              description: 'Tích điểm thành viên JeJi Coffee',
            },
          ],
          created_at: '2026-11-01T09:00:00+07:00',
        });
      }

      writeUsersRaw(next);
      localStorage.setItem(AUTH_STORAGE_KEYS.SEED_VERSION, '1');
    })();
  }
  await seedPromise;
}

// === TÍCH ĐIỂM TỰ ĐỘNG CHO ĐƠN "HOÀN THÀNH" ===

export function syncCompletedOrdersToUserPoints(): void {
  const orders = api.getOrders();
  const users = readUsersRaw();
  if (users.length === 0) return;

  let usersChanged = false;
  const updatedUsers = [...users];

  orders.forEach((order: Order) => {
    if (order.status !== 'Hoàn thành' || order.points_awarded) return;

    const earnedPoints = Math.floor(Math.max(0, order.total_amount) / 1000);
    const cleanOrderPhone = normalizeVNPhone(order.customer_phone);

    const userIndex = updatedUsers.findIndex(
      (u) =>
        (order.user_id && u.user_id === order.user_id) ||
        (cleanOrderPhone && normalizeVNPhone(u.phone) === cleanOrderPhone)
    );

    if (userIndex >= 0 && earnedPoints > 0) {
      const target = updatedUsers[userIndex];
      const alreadyCredited = (target.point_history || []).some(
        (tx) => tx.type === 'earn' && tx.order_id === order.order_id
      );

      if (!alreadyCredited) {
        const newPoints = target.points + earnedPoints;
        const tx: PointTransaction = {
          tx_id: `PT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          created_at: new Date().toISOString(),
          type: 'earn',
          points: earnedPoints,
          description: `Hoàn thành đơn ${order.order_id}`,
          order_id: order.order_id,
        };
        updatedUsers[userIndex] = {
          ...target,
          points: newPoints,
          tier: computeMemberTier(newPoints),
          point_history: [tx, ...(target.point_history || [])],
        };
        usersChanged = true;
      }
      api.updateOrder(order.order_id, { points_awarded: true });
    }
  });

  if (usersChanged) {
    writeUsersRaw(updatedUsers);
  }
}

// === ADAPTER FIREBASE IDENTITY TOOLKIT (KHI ĐÃ CẤU HÌNH ENV) ===

async function firebaseIdentityRequest(
  endpoint: string,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const url = `https://identitytoolkit.googleapis.com/v1/${endpoint}?key=${encodeURIComponent(
    FIREBASE_CONFIG.apiKey
  )}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const errObj = data.error as { message?: string } | undefined;
    const msg = errObj?.message || 'FIREBASE_AUTH_ERROR';
    throw new Error(mapFirebaseError(msg));
  }
  return data;
}

function mapFirebaseError(code: string): string {
  if (code.includes('EMAIL_EXISTS')) return 'Email này đã được sử dụng.';
  if (code.includes('INVALID_PASSWORD') || code.includes('INVALID_LOGIN_CREDENTIALS')) {
    return 'Email hoặc mật khẩu chưa chính xác.';
  }
  if (code.includes('EMAIL_NOT_FOUND')) return 'Không tìm thấy tài khoản với email này.';
  if (code.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
    return 'Thử đăng nhập quá nhiều lần. Vui lòng thử lại sau.';
  }
  return 'Không thể xác thực qua Firebase. Vui lòng kiểm tra lại thông tin.';
}

// === CÁC HÀM XÁC THỰC CHÍNH (INTERFACE THỐNG NHẤT) ===

export const authService = {
  isFirebaseActive(): boolean {
    return isFirebaseConfigured();
  },

  async register(input: RegisterInput): Promise<{ user: User; welcomeCode: string }> {
    await ensureSeedUsers();

    const fullName = input.full_name.trim();
    const email = (input.email || '').trim().toLowerCase();
    const rawPhone = input.phone.trim();

    if (!fullName || fullName.length < 2) {
      throw new Error('Vui lòng nhập họ và tên đầy đủ (tối thiểu 2 ký tự).');
    }
    if (!isValidVNPhone(rawPhone)) {
      throw new Error('Số điện thoại Việt Nam chưa hợp lệ (bắt đầu 0 hoặc +84, đủ 10 số).');
    }
    if (email && !isValidEmail(email)) {
      throw new Error('Địa chỉ email chưa đúng định dạng.');
    }
    if (!isValidPassword(input.password)) {
      throw new Error('Mật khẩu cần ít nhất 8 ký tự, bao gồm cả chữ và số.');
    }
    if (input.password !== input.confirm_password) {
      throw new Error('Mật khẩu nhập lại chưa khớp.');
    }
    if (!input.accepted_terms) {
      throw new Error('Vui lòng đồng ý với điều khoản thành viên của JeJi Coffee.');
    }

    const cleanPhone = normalizeVNPhone(rawPhone);
    const users = readUsersRaw();

    if (users.some((u) => normalizeVNPhone(u.phone) === cleanPhone)) {
      throw new Error('Số điện thoại này đã được đăng ký tài khoản.');
    }
    if (email && users.some((u) => u.email.toLowerCase() === email)) {
      throw new Error('Email này đã được sử dụng cho tài khoản khác.');
    }

    let firebaseIdToken: string | undefined;
    let userId = generateUserId(users);

    // Nếu đã cấu hình Firebase, tạo tài khoản trên Firebase Authentication (khi có email)
    if (isFirebaseConfigured() && email) {
      const fbRes = await firebaseIdentityRequest('accounts:signUp', {
        email,
        password: input.password,
        returnSecureToken: true,
      });
      firebaseIdToken = typeof fbRes.idToken === 'string' ? fbRes.idToken : undefined;
      if (typeof fbRes.localId === 'string') {
        userId = fbRes.localId;
      }
      if (firebaseIdToken) {
        await firebaseIdentityRequest('accounts:update', {
          idToken: firebaseIdToken,
          displayName: fullName,
          returnSecureToken: false,
        }).catch(() => {});
      }
    }

    const salt = generateSalt();
    const password_hash = await hashPassword(input.password, salt);
    const welcomeCode = findWelcomeDiscountCode();

    const newUser: User = {
      user_id: userId,
      full_name: fullName,
      phone: cleanPhone,
      email,
      password_hash,
      salt,
      role: 'customer',
      avatar: buildDefaultInitialsAvatar(fullName),
      birthday: '',
      addresses: [],
      points: 0,
      tier: 'Đồng',
      favorites: [],
      notify_order_status: true,
      welcome_code: welcomeCode || undefined,
      point_history: [],
      created_at: new Date().toISOString(),
    };

    writeUsersRaw([newUser, ...users]);

    saveSession(
      {
        user_id: newUser.user_id,
        expires_at: Date.now() + SESSION_DURATION_MS,
        firebase_id_token: firebaseIdToken,
      },
      true
    );

    syncCompletedOrdersToUserPoints();
    return { user: this.getCurrentUser() || newUser, welcomeCode };
  },

  async login(identifier: string, password: string, rememberMe: boolean): Promise<User> {
    await ensureSeedUsers();

    const rawId = identifier.trim();
    if (!rawId) {
      throw new Error('Vui lòng nhập số điện thoại hoặc email.');
    }
    if (!password) {
      throw new Error('Vui lòng nhập mật khẩu.');
    }

    const attemptKey = getAttemptKey(rawId);
    const lockMsg = checkLoginLockout(attemptKey);
    if (lockMsg) {
      throw new Error(lockMsg);
    }

    // Nếu đã cấu hình Firebase và người dùng nhập email
    if (isFirebaseConfigured() && rawId.includes('@')) {
      try {
        const fbRes = await firebaseIdentityRequest('accounts:signInWithPassword', {
          email: rawId.toLowerCase(),
          password,
          returnSecureToken: true,
        });
        clearFailedLoginAttempt(attemptKey);

        const users = readUsersRaw();
        const fbUid = String(fbRes.localId || '');
        let matched = users.find(
          (u) => u.user_id === fbUid || u.email.toLowerCase() === rawId.toLowerCase()
        );
        if (!matched) {
          const salt = generateSalt();
          const hash = await hashPassword(password, salt);
          matched = {
            user_id: fbUid || generateUserId(users),
            full_name: String(fbRes.displayName || rawId.split('@')[0]),
            phone: '',
            email: rawId.toLowerCase(),
            password_hash: hash,
            salt,
            role: 'customer',
            avatar: buildDefaultInitialsAvatar(String(fbRes.displayName || 'J')),
            birthday: '',
            addresses: [],
            points: 0,
            tier: 'Đồng',
            favorites: [],
            notify_order_status: true,
            point_history: [],
            created_at: new Date().toISOString(),
          };
          writeUsersRaw([matched, ...users]);
        }

        saveSession(
          {
            user_id: matched.user_id,
            expires_at: Date.now() + (rememberMe ? SESSION_DURATION_MS : TEMP_SESSION_DURATION_MS),
            firebase_id_token: typeof fbRes.idToken === 'string' ? fbRes.idToken : undefined,
          },
          rememberMe
        );
        syncCompletedOrdersToUserPoints();
        return this.getCurrentUser() || matched;
      } catch (err) {
        const msg = recordFailedLoginAttempt(attemptKey);
        throw new Error(err instanceof Error && err.message.includes('Firebase') ? err.message : msg);
      }
    }

    const users = readUsersRaw();
    const isPhone = isValidVNPhone(rawId);
    const cleanPhone = isPhone ? normalizeVNPhone(rawId) : '';
    const lowerEmail = rawId.toLowerCase();

    const matched = users.find((u) =>
      isPhone
        ? normalizeVNPhone(u.phone) === cleanPhone
        : u.email.toLowerCase() === lowerEmail || normalizeVNPhone(u.phone) === normalizeVNPhone(rawId)
    );

    if (!matched) {
      const msg = recordFailedLoginAttempt(attemptKey);
      throw new Error(msg);
    }

    const candidateHash = await hashPassword(password, matched.salt);
    if (candidateHash !== matched.password_hash) {
      const msg = recordFailedLoginAttempt(attemptKey);
      throw new Error(msg);
    }

    clearFailedLoginAttempt(attemptKey);

    saveSession(
      {
        user_id: matched.user_id,
        expires_at: Date.now() + (rememberMe ? SESSION_DURATION_MS : TEMP_SESSION_DURATION_MS),
      },
      rememberMe
    );

    syncCompletedOrdersToUserPoints();
    return this.getCurrentUser() || matched;
  },

  async loginWithGoogle(): Promise<User> {
    if (!isFirebaseConfigured()) {
      throw new Error('Đăng nhập Google chỉ hoạt động khi đã cấu hình Firebase Authentication.');
    }
    throw new Error(
      'Để bật Google Sign-In popup, hãy cài gói firebase và kết nối signInWithPopup trong src/services/auth.ts.'
    );
  },

  logout(): void {
    clearSession();
  },

  getCurrentUser(): User | null {
    const session = readSession();
    if (!session) return null;
    const users = readUsersRaw();
    const found = users.find((u) => u.user_id === session.user_id) || null;
    if (!found) {
      clearSession();
      return null;
    }
    return found;
  },

  async initialize(): Promise<User | null> {
    await ensureSeedUsers();
    syncCompletedOrdersToUserPoints();
    return this.getCurrentUser();
  },

  updateProfile(
    patch: Partial<Pick<User, 'full_name' | 'email' | 'birthday' | 'avatar' | 'notify_order_status' | 'favorites'>>
  ): User {
    const current = this.getCurrentUser();
    if (!current) throw new Error('Bạn chưa đăng nhập.');

    if (patch.email !== undefined) {
      const trimmedEmail = patch.email.trim().toLowerCase();
      if (trimmedEmail && !isValidEmail(trimmedEmail)) {
        throw new Error('Địa chỉ email chưa hợp lệ.');
      }
      const users = readUsersRaw();
      if (
        trimmedEmail &&
        users.some((u) => u.user_id !== current.user_id && u.email.toLowerCase() === trimmedEmail)
      ) {
        throw new Error('Email này đã được sử dụng cho tài khoản khác.');
      }
      patch.email = trimmedEmail;
    }

    if (patch.full_name !== undefined && !patch.full_name.trim()) {
      throw new Error('Họ tên không được để trống.');
    }

    const users = readUsersRaw();
    let updatedUser: User = current;
    const nextUsers = users.map((u) => {
      if (u.user_id !== current.user_id) return u;
      updatedUser = {
        ...u,
        ...patch,
        full_name: patch.full_name !== undefined ? patch.full_name.trim() : u.full_name,
      };
      return updatedUser;
    });

    writeUsersRaw(nextUsers);
    return updatedUser;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const current = this.getCurrentUser();
    if (!current) throw new Error('Bạn chưa đăng nhập.');

    const curHash = await hashPassword(currentPassword, current.salt);
    if (curHash !== current.password_hash) {
      throw new Error('Mật khẩu hiện tại chưa chính xác.');
    }
    if (!isValidPassword(newPassword)) {
      throw new Error('Mật khẩu mới phải từ 8 ký tự trở lên và gồm cả chữ lẫn số.');
    }
    if (currentPassword === newPassword) {
      throw new Error('Mật khẩu mới cần khác mật khẩu hiện tại.');
    }

    const newSalt = generateSalt();
    const newHash = await hashPassword(newPassword, newSalt);

    const session = readSession();
    if (isFirebaseConfigured() && session?.firebase_id_token) {
      await firebaseIdentityRequest('accounts:update', {
        idToken: session.firebase_id_token,
        password: newPassword,
        returnSecureToken: true,
      });
    }

    const users = readUsersRaw();
    const next = users.map((u) =>
      u.user_id === current.user_id ? { ...u, salt: newSalt, password_hash: newHash } : u
    );
    writeUsersRaw(next);
  },

  async resetPassword(phone: string, fullName: string, newPassword: string): Promise<void> {
    await ensureSeedUsers();

    if (!isValidVNPhone(phone)) {
      throw new Error('Số điện thoại chưa đúng định dạng Việt Nam.');
    }
    if (!fullName.trim()) {
      throw new Error('Vui lòng nhập họ tên đã đăng ký để xác minh.');
    }
    if (!isValidPassword(newPassword)) {
      throw new Error('Mật khẩu mới phải có ít nhất 8 ký tự, gồm cả chữ và số.');
    }

    const cleanPhone = normalizeVNPhone(phone);
    const cleanName = removeVietnameseTones(fullName);
    const users = readUsersRaw();

    const matched = users.find(
      (u) =>
        normalizeVNPhone(u.phone) === cleanPhone &&
        removeVietnameseTones(u.full_name) === cleanName
    );

    if (!matched) {
      throw new Error('Số điện thoại và họ tên chưa khớp với tài khoản nào đã đăng ký.');
    }

    const newSalt = generateSalt();
    const newHash = await hashPassword(newPassword, newSalt);
    const next = users.map((u) =>
      u.user_id === matched.user_id ? { ...u, salt: newSalt, password_hash: newHash } : u
    );
    writeUsersRaw(next);
    clearFailedLoginAttempt(cleanPhone);
  },

  // === ĐỊA CHỈ GIAO HÀNG ===
  addAddress(addr: Omit<UserAddress, 'address_id'>): User {
    const current = this.getCurrentUser();
    if (!current) throw new Error('Bạn chưa đăng nhập.');
    const newAddr: UserAddress = {
      ...addr,
      address_id: `ADDR-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      is_default: current.addresses.length === 0 ? true : addr.is_default,
    };

    const nextAddresses = newAddr.is_default
      ? [newAddr, ...current.addresses.map((a) => ({ ...a, is_default: false }))]
      : [...current.addresses, newAddr];

    return this._saveAddresses(current.user_id, nextAddresses);
  },

  updateAddress(addressId: string, patch: Partial<Omit<UserAddress, 'address_id'>>): User {
    const current = this.getCurrentUser();
    if (!current) throw new Error('Bạn chưa đăng nhập.');

    let nextAddresses = current.addresses.map((a) =>
      a.address_id === addressId ? { ...a, ...patch } : a
    );
    if (patch.is_default) {
      nextAddresses = nextAddresses.map((a) => ({
        ...a,
        is_default: a.address_id === addressId,
      }));
    }
    return this._saveAddresses(current.user_id, nextAddresses);
  },

  removeAddress(addressId: string): User {
    const current = this.getCurrentUser();
    if (!current) throw new Error('Bạn chưa đăng nhập.');
    let nextAddresses = current.addresses.filter((a) => a.address_id !== addressId);
    if (nextAddresses.length > 0 && !nextAddresses.some((a) => a.is_default)) {
      nextAddresses = nextAddresses.map((a, idx) => ({ ...a, is_default: idx === 0 }));
    }
    return this._saveAddresses(current.user_id, nextAddresses);
  },

  setDefaultAddress(addressId: string): User {
    return this.updateAddress(addressId, { is_default: true });
  },

  _saveAddresses(userId: string, addresses: UserAddress[]): User {
    const users = readUsersRaw();
    let updatedUser: User | null = null;
    const next = users.map((u) => {
      if (u.user_id !== userId) return u;
      updatedUser = { ...u, addresses };
      return updatedUser;
    });
    writeUsersRaw(next);
    if (!updatedUser) throw new Error('Không tìm thấy tài khoản.');
    return updatedUser;
  },

  // === ĐỔI ĐIỂM LẤY MÃ GIẢM GIÁ ===
  redeemPointsForVoucher(rewardId: string): { user: User; discount: Discount } {
    const current = this.getCurrentUser();
    if (!current) throw new Error('Vui lòng đăng nhập để đổi điểm.');

    const reward = REWARD_CATALOG.find((r) => r.id === rewardId);
    if (!reward) throw new Error('Gói quà đổi điểm không tồn tại.');

    if (current.points < reward.points_cost) {
      throw new Error(
        `Bạn cần thêm ${reward.points_cost - current.points} điểm nữa để đổi ưu đãi này.`
      );
    }

    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    const code = `JEJI${reward.points_cost}-${suffix}`;
    const today = new Date();
    const startStr = today.toISOString().slice(0, 10);
    const endDate = new Date(today.getTime() + 60 * 24 * 60 * 60 * 1000);
    const endStr = endDate.toISOString().slice(0, 10);

    const newDiscount: Discount = {
      code,
      description: `Đổi từ ${reward.points_cost} điểm JeJi — ${reward.title} (${reward.description})`,
      type: reward.discount_type,
      value: reward.value,
      min_order: reward.min_order,
      max_discount: reward.max_discount,
      usage_limit: 1,
      used_count: 0,
      start_date: startStr,
      end_date: endStr,
      is_active: true,
    };

    api.addDiscount(newDiscount);

    const remainingPoints = current.points - reward.points_cost;
    const tx: PointTransaction = {
      tx_id: `PT-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      created_at: new Date().toISOString(),
      type: 'redeem',
      points: -reward.points_cost,
      description: `Đổi ${reward.points_cost} điểm lấy mã ${code}`,
      voucher_code: code,
    };

    const users = readUsersRaw();
    let updatedUser = current;
    const next = users.map((u) => {
      if (u.user_id !== current.user_id) return u;
      updatedUser = {
        ...u,
        points: remainingPoints,
        tier: computeMemberTier(remainingPoints),
        point_history: [tx, ...(u.point_history || [])],
      };
      return updatedUser;
    });
    writeUsersRaw(next);
    return { user: updatedUser, discount: newDiscount };
  },

  // === XÓA TÀI KHOẢN ===
  async deleteAccount(password: string): Promise<void> {
    const current = this.getCurrentUser();
    if (!current) throw new Error('Bạn chưa đăng nhập.');

    const curHash = await hashPassword(password, current.salt);
    if (curHash !== current.password_hash) {
      throw new Error('Mật khẩu xác nhận chưa chính xác.');
    }

    const users = readUsersRaw();
    const next = users.filter((u) => u.user_id !== current.user_id);
    writeUsersRaw(next);
    clearSession();
  },

  // === QUẢN TRỊ (ADMIN) ===
  listAllUsers(): User[] {
    syncCompletedOrdersToUserPoints();
    return readUsersRaw();
  },
};
