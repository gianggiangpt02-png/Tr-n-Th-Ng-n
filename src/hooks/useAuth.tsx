import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  AUTH_STORAGE_KEYS,
  authService,
  RegisterInput,
  syncCompletedOrdersToUserPoints,
} from '../services/auth';
import { Discount, User, UserAddress } from '../types';
import { useToast } from './useToast';

export type AuthModalTab = 'login' | 'register';

interface AuthContextValue {
  user: User | null;
  isReady: boolean;
  isAuthModalOpen: boolean;
  authModalTab: AuthModalTab;
  openAuthModal: (tab?: AuthModalTab) => void;
  closeAuthModal: () => void;
  setAuthModalTab: (tab: AuthModalTab) => void;
  register: (input: RegisterInput) => Promise<{ user: User; welcomeCode: string }>;
  login: (identifier: string, password: string, rememberMe: boolean) => Promise<User>;
  loginWithGoogle: () => Promise<User>;
  logout: () => void;
  updateProfile: (
    patch: Partial<
      Pick<User, 'full_name' | 'email' | 'birthday' | 'avatar' | 'notify_order_status' | 'favorites'>
    >
  ) => User;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  resetPassword: (phone: string, fullName: string, newPassword: string) => Promise<void>;
  addAddress: (addr: Omit<UserAddress, 'address_id'>) => User;
  updateAddress: (addressId: string, patch: Partial<Omit<UserAddress, 'address_id'>>) => User;
  removeAddress: (addressId: string) => User;
  setDefaultAddress: (addressId: string) => User;
  redeemPoints: (rewardId: string) => { user: User; discount: Discount };
  deleteAccount: (password: string) => Promise<void>;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());
  const [isReady, setIsReady] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<AuthModalTab>('login');

  useEffect(() => {
    let active = true;
    authService.initialize().then((initializedUser) => {
      if (!active) return;
      setUser(initializedUser);
      setIsReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Đồng bộ trạng thái đăng nhập & điểm thưởng giữa các tab trình duyệt
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === AUTH_STORAGE_KEYS.USERS ||
        e.key === AUTH_STORAGE_KEYS.SESSION_LOCAL
      ) {
        setUser(authService.getCurrentUser());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const refreshUser = useCallback(() => {
    syncCompletedOrdersToUserPoints();
    setUser(authService.getCurrentUser());
  }, []);

  const openAuthModal = useCallback((tab: AuthModalTab = 'login') => {
    setAuthModalTab(tab);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const register = useCallback(
    async (input: RegisterInput) => {
      const result = await authService.register(input);
      setUser(result.user);
      setIsAuthModalOpen(false);
      if (result.welcomeCode) {
        showToast(
          `Chào mừng ${result.user.full_name}! Tặng bạn mã ${result.welcomeCode} giảm 10% đơn đầu tiên.`
        );
      } else {
        showToast(`Tạo tài khoản JeJi thành công! Chào ${result.user.full_name}.`);
      }
      return result;
    },
    [showToast]
  );

  const login = useCallback(
    async (identifier: string, password: string, rememberMe: boolean) => {
      const loggedIn = await authService.login(identifier, password, rememberMe);
      setUser(loggedIn);
      setIsAuthModalOpen(false);
      showToast(`Chào mừng trở lại, ${loggedIn.full_name}!`);
      return loggedIn;
    },
    [showToast]
  );

  const loginWithGoogle = useCallback(async () => {
    const loggedIn = await authService.loginWithGoogle();
    setUser(loggedIn);
    setIsAuthModalOpen(false);
    showToast(`Đăng nhập thành công, chào ${loggedIn.full_name}!`);
    return loggedIn;
  }, [showToast]);

  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    showToast('Đã đăng xuất khỏi tài khoản JeJi', 'info');
  }, [showToast]);

  const updateProfile = useCallback(
    (
      patch: Partial<
        Pick<
          User,
          'full_name' | 'email' | 'birthday' | 'avatar' | 'notify_order_status' | 'favorites'
        >
      >
    ) => {
      const updated = authService.updateProfile(patch);
      setUser(updated);
      return updated;
    },
    []
  );

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      await authService.changePassword(currentPassword, newPassword);
      setUser(authService.getCurrentUser());
      showToast('Đổi mật khẩu thành công!');
    },
    [showToast]
  );

  const resetPassword = useCallback(
    async (phone: string, fullName: string, newPassword: string) => {
      await authService.resetPassword(phone, fullName, newPassword);
      showToast('Đã đặt lại mật khẩu. Bạn có thể đăng nhập bằng mật khẩu mới.');
    },
    [showToast]
  );

  const addAddress = useCallback(
    (addr: Omit<UserAddress, 'address_id'>) => {
      const updated = authService.addAddress(addr);
      setUser(updated);
      showToast('Đã lưu địa chỉ giao hàng mới');
      return updated;
    },
    [showToast]
  );

  const updateAddress = useCallback(
    (addressId: string, patch: Partial<Omit<UserAddress, 'address_id'>>) => {
      const updated = authService.updateAddress(addressId, patch);
      setUser(updated);
      showToast('Đã cập nhật địa chỉ giao hàng');
      return updated;
    },
    [showToast]
  );

  const removeAddress = useCallback(
    (addressId: string) => {
      const updated = authService.removeAddress(addressId);
      setUser(updated);
      showToast('Đã xóa địa chỉ', 'info');
      return updated;
    },
    [showToast]
  );

  const setDefaultAddress = useCallback(
    (addressId: string) => {
      const updated = authService.setDefaultAddress(addressId);
      setUser(updated);
      showToast('Đã đặt làm địa chỉ mặc định');
      return updated;
    },
    [showToast]
  );

  const redeemPoints = useCallback(
    (rewardId: string) => {
      const res = authService.redeemPointsForVoucher(rewardId);
      setUser(res.user);
      showToast(`Đổi điểm thành công! Mã ưu đãi của bạn là ${res.discount.code}`);
      return res;
    },
    [showToast]
  );

  const deleteAccount = useCallback(
    async (password: string) => {
      await authService.deleteAccount(password);
      setUser(null);
      showToast('Tài khoản của bạn đã được xóa khỏi thiết bị.', 'info');
    },
    [showToast]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isReady,
        isAuthModalOpen,
        authModalTab,
        openAuthModal,
        closeAuthModal,
        setAuthModalTab,
        register,
        login,
        loginWithGoogle,
        logout,
        updateProfile,
        changePassword,
        resetPassword,
        addAddress,
        updateAddress,
        removeAddress,
        setDefaultAddress,
        redeemPoints,
        deleteAccount,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
