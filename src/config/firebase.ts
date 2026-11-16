/**
 * CẤU HÌNH ADAPTER FIREBASE AUTHENTICATION (GIAI ĐOẠN 2)
 * Đọc cấu hình từ biến môi trường Vite. Khi chưa cấu hình các biến VITE_FIREBASE_*,
 * ứng dụng tự động sử dụng phương án dự phòng localStorage (Giai đoạn 1).
 */

export interface FirebaseEnvConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
}

export const FIREBASE_CONFIG: FirebaseEnvConfig = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || '').trim(),
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim(),
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim(),
  appId: (import.meta.env.VITE_FIREBASE_APP_ID || '').trim(),
};

/**
 * Kiểm tra xem ứng dụng đã được cấu hình Firebase Authentication hay chưa.
 */
export function isFirebaseConfigured(): boolean {
  return Boolean(
    FIREBASE_CONFIG.apiKey &&
      FIREBASE_CONFIG.authDomain &&
      FIREBASE_CONFIG.projectId &&
      FIREBASE_CONFIG.appId
  );
}
