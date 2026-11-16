import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  FAVORITES_STORAGE_KEY,
  getFavoriteIds,
  saveFavoriteIds,
} from '../services/favoritesStorage';
import { useAuth } from './useAuth';
import { useToast } from './useToast';

interface FavoritesContextValue {
  list: string[];
  count: number;
  isFav: (productId: string) => boolean;
  toggle: (productId: string) => void;
  clear: () => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();
  const [list, setList] = useState<string[]>(() => getFavoriteIds());
  const lastMergedUserIdRef = useRef<string | null>(null);

  // Khi đăng nhập: gộp danh sách yêu thích hiện tại trên thiết bị vào tài khoản
  useEffect(() => {
    if (!user) {
      lastMergedUserIdRef.current = null;
      return;
    }

    if (lastMergedUserIdRef.current !== user.user_id) {
      lastMergedUserIdRef.current = user.user_id;
      const deviceFavs = getFavoriteIds();
      const accountFavs = user.favorites || [];
      const merged = Array.from(new Set([...deviceFavs, ...accountFavs]));

      setList(merged);
      saveFavoriteIds(merged);

      const needsAccountUpdate =
        merged.length !== accountFavs.length ||
        merged.some((id, idx) => accountFavs[idx] !== id);

      if (needsAccountUpdate) {
        updateProfile({ favorites: merged });
      }
    }
  }, [user, updateProfile]);

  // Đồng bộ danh sách yêu thích giữa các tab trình duyệt qua sự kiện storage
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === FAVORITES_STORAGE_KEY) {
        setList(getFavoriteIds());
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const isFav = useCallback((productId: string) => list.includes(productId), [list]);

  const toggle = useCallback(
    (productId: string) => {
      setList((prev) => {
        const exists = prev.includes(productId);
        const next = exists ? prev.filter((id) => id !== productId) : [productId, ...prev];
        saveFavoriteIds(next);
        if (user) {
          updateProfile({ favorites: next });
        }
        showToast(
          exists ? 'Đã bỏ khỏi yêu thích' : 'Đã thêm vào yêu thích',
          exists ? 'info' : 'success'
        );
        return next;
      });
    },
    [showToast, user, updateProfile]
  );

  const clear = useCallback(() => {
    setList([]);
    saveFavoriteIds([]);
    if (user) {
      updateProfile({ favorites: [] });
    }
    showToast('Đã xóa toàn bộ danh sách yêu thích', 'info');
  }, [showToast, user, updateProfile]);

  return (
    <FavoritesContext.Provider
      value={{
        list,
        count: list.length,
        isFav,
        toggle,
        clear,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
