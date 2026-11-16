import React from 'react';
import { Link } from 'react-router-dom';
import { Lock, LogIn, ShieldAlert, UserPlus } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';

interface RequireAuthProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export const RequireAuth: React.FC<RequireAuthProps> = ({ children, requiredRole }) => {
  const { user, isReady, openAuthModal, logout } = useAuth();

  if (!isReady) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="rounded-[20px] bg-[#FFFDF8] border border-[#8A5036]/15 p-8 animate-pulse space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-[#F9D5D3]" />
          <div className="h-5 w-48 mx-auto rounded bg-[#FCE8D5]" />
          <div className="h-4 w-64 mx-auto rounded bg-[#FFF4EA]" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div
          className="rounded-[20px] border border-[#EDB9B3] p-8 text-center shadow-sm space-y-5"
          style={{ background: 'linear-gradient(135deg, #F9D5D3 0%, #FCE8D5 100%)' }}
        >
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#8A5036] text-[#FBDB93] flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-[#5A2E1C]">
              Vui lòng đăng nhập để tiếp tục
            </h1>
            <p className="mt-2 text-sm text-[#6F3F2A] leading-relaxed">
              {requiredRole === 'admin'
                ? 'Trang quản trị cửa hàng chỉ dành cho tài khoản có quyền quản trị viên.'
                : 'Đăng nhập tài khoản JeJi Coffee để xem hồ sơ, lịch sử đơn hàng, địa chỉ giao hàng và tích điểm đổi quà.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => openAuthModal('login')}
              className="btn-rose-gradient inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold shadow-xs"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng nhập</span>
            </button>
            {requiredRole !== 'admin' && (
              <button
                type="button"
                onClick={() => openAuthModal('register')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/85 hover:bg-white border border-[#8A5036]/30 text-[#5A2E1C] text-sm font-semibold transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span>Tạo tài khoản</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (requiredRole && user.role !== requiredRole) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16">
        <div className="rounded-[20px] bg-[#FFFDF8] border border-[#EDB9B3] p-8 text-center shadow-sm space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FBE3E0] text-[#AA2B1D] flex items-center justify-center">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h1 className="font-display text-2xl font-bold text-[#5A2E1C]">
            Không có quyền truy cập
          </h1>
          <p className="text-sm text-[#6F3F2A] leading-relaxed">
            Tài khoản hiện tại (<strong>{user.full_name}</strong>) thuộc nhóm thành viên khách hàng.
            Chỉ tài khoản quản trị mới có thể mở trang này.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              to="/tai-khoan"
              className="btn-rose-gradient px-5 py-2.5 rounded-xl text-sm font-semibold"
            >
              Về trang tài khoản
            </Link>
            <button
              type="button"
              onClick={() => {
                logout();
                openAuthModal('login');
              }}
              className="px-5 py-2.5 rounded-xl border border-[#8A5036]/25 text-[#5A2E1C] hover:bg-[#FCE8D5] text-sm font-semibold transition-colors"
            >
              Đổi tài khoản khác
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
