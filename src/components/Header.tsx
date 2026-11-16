import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Award,
  ChevronDown,
  Heart,
  LogIn,
  LogOut,
  Menu,
  Package,
  Search,
  ShieldCheck,
  ShoppingBag,
  User as UserIcon,
  UserPlus,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { useFavorites } from '../hooks/useFavorites';
import { useToast } from '../hooks/useToast';
import { api } from '../services/api';
import { isDiscountCurrentlyValid } from '../utils/discount';
import { formatVND } from '../utils/format';
import { BrandLogo } from './BrandLogo';
import { UserAvatar } from './UserAvatar';

const NAV_ITEMS = [
  { to: '/', label: 'Trang chủ' },
  { to: '/thuc-don', label: 'Thực đơn' },
  { to: '/uu-dai', label: 'Combo & Ưu đãi' },
  { to: '/cua-hang', label: 'Cửa hàng' },
  { to: '/theo-doi', label: 'Theo dõi đơn' },
  { to: '/ve-jeji', label: 'Về JeJi' },
];

export const Header: React.FC = () => {
  const { totalQuantity, openDrawer, cartPulseKey } = useCart();
  const { count: favCount } = useFavorites();
  const { user, openAuthModal, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKey);
    };
  }, [userMenuOpen]);

  const shortName = useMemo(() => {
    if (!user?.full_name) return '';
    const parts = user.full_name.trim().split(/\s+/);
    return parts[parts.length - 1] || user.full_name;
  }, [user]);

  const activeDiscounts = useMemo(
    () => api.getDiscounts().filter((d) => isDiscountCurrentlyValid(d)),
    []
  );

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    showToast(`Đã sao chép mã ${code}`);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    setSearchOpen(false);
    setMobileMenuOpen(false);
    navigate(q ? `/thuc-don?q=${encodeURIComponent(q)}` : '/thuc-don');
  };

  return (
    <header className="sticky top-0 z-40 w-full shadow-md">
      {/* Thanh thông báo chạy chữ trên cùng */}
      {activeDiscounts.length > 0 && (
        <div className="bg-[#9B3922] text-[#FFF4EA] h-8 overflow-hidden flex items-center text-xs border-b border-[#FBDB93]/20">
          <div className="animate-jeji-marquee items-center">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex items-center gap-8 px-4 whitespace-nowrap">
                {activeDiscounts.map((d) => (
                  <button
                    key={`${dup}-${d.code}`}
                    type="button"
                    onClick={() => handleCopyCoupon(d.code)}
                    className="inline-flex items-center gap-2 hover:text-[#FBDB93] transition-colors cursor-pointer"
                    title="Bấm để sao chép mã"
                  >
                    <span className="font-mono font-semibold text-[#FBDB93]">{d.code}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {d.type === 'freeship'
                        ? `Miễn phí ship tối đa ${formatVND(d.max_discount)} cho đơn từ ${formatVND(d.min_order)}`
                        : d.description}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Thanh điều hướng chính nền nâu sữa #8A5036 */}
      <div className="bg-[#8A5036] text-[#FFF4EA]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4 lg:gap-8">
          {/* Khu 1: Logo hình ảnh + chữ JeJi Coffee (chữ "Ji" màu #FFC4BE) */}
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 font-display text-xl sm:text-2xl font-bold tracking-tight whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity"
          >
            <BrandLogo size="sm" cropped className="shadow-xs border-[#FBDB93]/40" />
            <span>
              <span className="text-[#FBDB93]">Je</span>
              <span className="text-[#FFC4BE]">Ji</span>
              <span className="text-[#FBDB93]"> Coffee</span>
            </span>
          </Link>

          {/* Khu 2: Điều hướng desktop */}
          <nav
            aria-label="Điều hướng chính"
            className="hidden lg:flex items-center gap-6 text-sm font-medium"
          >
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `relative py-1 whitespace-nowrap shrink-0 transition-colors ${
                    isActive
                      ? 'text-[#FBDB93]'
                      : 'text-[#FFF4EA]/90 hover:text-[#FBDB93]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span>{item.label}</span>
                    {isActive && (
                      <span className="absolute left-0 right-0 -bottom-0.5 h-0.5 bg-[#FBDB93] rounded-full" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          {/* Khu 3: Tìm kiếm nhanh + Yêu thích + Giỏ hàng + Mobile Hamburger */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Ô tìm kiếm nhanh desktop */}
            <div className="hidden md:flex items-center">
              {searchOpen ? (
                <form onSubmit={handleSearchSubmit} className="flex items-center gap-1.5">
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm cà phê muối, trà đào..."
                    autoFocus
                    aria-label="Tìm kiếm đồ uống"
                    className="w-44 lg:w-52 px-3 py-1.5 rounded-xl bg-[#6F3F2A] border border-[#FBDB93]/30 text-xs text-[#FFF4EA] placeholder:text-[#FFF4EA]/60 focus:outline-none focus:border-[#FBDB93]"
                  />
                  <button
                    type="button"
                    onClick={() => setSearchOpen(false)}
                    aria-label="Đóng tìm kiếm"
                    className="p-1.5 rounded-lg text-[#FFF4EA]/80 hover:text-[#FBDB93]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => setSearchOpen(true)}
                  aria-label="Mở tìm kiếm nhanh"
                  className="p-2 rounded-xl text-[#FFF4EA]/90 hover:text-[#FBDB93] hover:bg-white/10 transition-colors"
                >
                  <Search className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Nút Yêu thích ♥ kèm số lượng */}
            <Link
              to="/yeu-thich"
              aria-label={`Món yêu thích, hiện có ${favCount} món`}
              className="relative p-2 rounded-xl text-[#FFF4EA] hover:text-[#FFC4BE] hover:bg-white/10 transition-colors shrink-0"
            >
              <Heart
                className={`w-5 h-5 ${favCount > 0 ? 'fill-[#FFC4BE] text-[#FFC4BE]' : ''}`}
              />
              {favCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-4.5 h-4.5 px-1 rounded-full bg-[#D4606A] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {favCount}
                </span>
              )}
            </Link>

            {/* Nút giỏ hàng */}
            <motion.button
              key={cartPulseKey}
              initial={cartPulseKey > 0 ? { scale: 0.92 } : false}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 450, damping: 20 }}
              type="button"
              onClick={openDrawer}
              aria-label={`Mở giỏ hàng, hiện có ${totalQuantity} món`}
              className="relative flex items-center gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-[#FBDB93] text-[#5A2E1C] hover:bg-[#f6cf75] font-semibold text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">Giỏ hàng</span>
              {totalQuantity > 0 && (
                <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#B8434A] text-white text-xs font-bold flex items-center justify-center tabular-nums">
                  {totalQuantity}
                </span>
              )}
            </motion.button>

            {/* Khu vực Tài khoản desktop/tablet */}
            {!user ? (
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/15 hover:bg-white/25 border border-[#FBDB93]/35 text-[#FFF4EA] text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3.5 h-3.5 text-[#FBDB93]" />
                <span>Đăng nhập / Đăng ký</span>
              </button>
            ) : (
              <div ref={userMenuRef} className="relative hidden sm:block shrink-0">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-expanded={userMenuOpen}
                  aria-haspopup="menu"
                  className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1 rounded-xl bg-white/15 hover:bg-white/25 border border-[#FBDB93]/35 text-[#FFF4EA] text-xs font-semibold transition-colors whitespace-nowrap"
                >
                  <UserAvatar avatar={user.avatar} fullName={user.full_name} size="xs" />
                  <span className="max-w-[96px] truncate">Chào, {shortName}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-[#FBDB93]" />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      role="menu"
                      initial={{ opacity: 0, y: 6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.98 }}
                      transition={{ duration: 0.14 }}
                      className="absolute right-0 mt-2 w-60 rounded-2xl bg-[#FFFDF8] text-[#5A2E1C] border border-[#EDB9B3] shadow-xl overflow-hidden z-50"
                    >
                      <div className="p-3.5 bg-[#FCE8D5]/80 border-b border-[#EDB9B3]/70">
                        <p className="font-bold text-sm truncate">{user.full_name}</p>
                        <p className="text-xs text-[#6F3F2A] mt-0.5 tabular-nums">
                          Hạng {user.tier} · <strong className="text-[#C4535A]">{user.points.toLocaleString('vi-VN')} điểm</strong>
                        </p>
                      </div>

                      <div className="p-1.5 space-y-0.5 text-xs font-semibold">
                        <Link
                          role="menuitem"
                          to="/tai-khoan?tab=profile"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#FCE8D5] transition-colors"
                        >
                          <UserIcon className="w-4 h-4 text-[#914F1E]" />
                          <span>Hồ sơ thành viên</span>
                        </Link>
                        <Link
                          role="menuitem"
                          to="/tai-khoan?tab=orders"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#FCE8D5] transition-colors"
                        >
                          <Package className="w-4 h-4 text-[#914F1E]" />
                          <span>Đơn hàng của tôi</span>
                        </Link>
                        <Link
                          role="menuitem"
                          to="/yeu-thich"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#FCE8D5] transition-colors"
                        >
                          <Heart className="w-4 h-4 text-[#D4606A]" />
                          <span>Món yêu thích ({favCount})</span>
                        </Link>
                        <Link
                          role="menuitem"
                          to="/tai-khoan?tab=points"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#FCE8D5] transition-colors"
                        >
                          <Award className="w-4 h-4 text-[#C4535A]" />
                          <span>Điểm thưởng JeJi</span>
                        </Link>
                        {user.role === 'admin' && (
                          <Link
                            role="menuitem"
                            to="/admin"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#FBDB93]/45 hover:bg-[#FBDB93]/75 text-[#5A2E1C] transition-colors"
                          >
                            <ShieldCheck className="w-4 h-4 text-[#914F1E]" />
                            <span>Quản trị cửa hàng</span>
                          </Link>
                        )}
                      </div>

                      <div className="p-1.5 border-t border-[#8A5036]/12">
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() => {
                            setUserMenuOpen(false);
                            logout();
                            navigate('/');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-[#AA2B1D] hover:bg-[#FBE3E0] transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Đăng xuất</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {/* Nút menu mobile */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu điều hướng'}
              aria-expanded={mobileMenuOpen}
              className="lg:hidden p-2 rounded-xl text-[#FFF4EA] hover:bg-white/10 transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Menu xổ xuống trên mobile / tablet */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.18 }}
              className="lg:hidden overflow-hidden border-t border-[#FBDB93]/20 bg-[#8A5036]"
            >
              <div className="px-4 py-4 space-y-3">
                <form onSubmit={handleSearchSubmit} className="flex gap-2">
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm món tại JeJi..."
                    aria-label="Tìm kiếm món"
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#6F3F2A] border border-[#FBDB93]/25 text-sm text-[#FFF4EA] placeholder:text-[#FFF4EA]/60 focus:outline-none focus:border-[#FBDB93]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2.5 rounded-xl btn-rose-gradient text-sm font-medium whitespace-nowrap"
                  >
                    Tìm
                  </button>
                </form>

                <nav aria-label="Menu di động" className="grid grid-cols-2 gap-1.5 pt-1">
                  {NAV_ITEMS.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === '/'}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-[#FBDB93] text-[#5A2E1C]'
                            : 'text-[#FFF4EA]/95 hover:bg-white/10'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                  <NavLink
                    to="/yeu-thich"
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors col-span-2 flex items-center gap-2 ${
                        isActive
                          ? 'bg-[#FBDB93] text-[#5A2E1C]'
                          : 'text-[#FFF4EA]/95 hover:bg-white/10'
                      }`
                    }
                  >
                    <Heart className="w-4 h-4 fill-[#FFC4BE] text-[#FFC4BE]" />
                    <span>Món yêu thích ({favCount})</span>
                  </NavLink>
                </nav>

                {/* Tài khoản thành viên trên mobile */}
                <div className="pt-2 border-t border-[#FBDB93]/20">
                  {!user ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          openAuthModal('login');
                        }}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-white/15 text-[#FFF4EA] text-xs font-semibold"
                      >
                        <LogIn className="w-3.5 h-3.5 text-[#FBDB93]" />
                        <span>Đăng nhập</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          openAuthModal('register');
                        }}
                        className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-[#FBDB93] text-[#5A2E1C] text-xs font-semibold"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Tạo tài khoản</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 rounded-2xl bg-[#6F3F2A]/75 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <UserAvatar avatar={user.avatar} fullName={user.full_name} size="sm" />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-[#FBDB93] truncate">
                              Chào, {shortName}
                            </p>
                            <p className="text-[11px] text-[#FFF4EA]/85 tabular-nums">
                              Hạng {user.tier} · {user.points.toLocaleString('vi-VN')} điểm
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setMobileMenuOpen(false);
                            logout();
                            navigate('/');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-white/15 text-[11px] font-semibold text-[#FFC4BE]"
                        >
                          Đăng xuất
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 text-xs font-semibold">
                        <Link
                          to="/tai-khoan?tab=profile"
                          onClick={() => setMobileMenuOpen(false)}
                          className="px-3 py-2 rounded-xl bg-white/10 text-[#FFF4EA]"
                        >
                          Hồ sơ & Địa chỉ
                        </Link>
                        <Link
                          to="/tai-khoan?tab=points"
                          onClick={() => setMobileMenuOpen(false)}
                          className="px-3 py-2 rounded-xl bg-white/10 text-[#FBDB93]"
                        >
                          Đổi điểm thưởng
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};
