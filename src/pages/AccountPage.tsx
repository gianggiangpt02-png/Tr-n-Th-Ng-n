import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  Bell,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Eye,
  EyeOff,
  Gift,
  Heart,
  KeyRound,
  LogOut,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  Settings,
  ShoppingBag,
  Sparkles,
  Star,
  Trash2,
  User as UserIcon,
  XCircle,
} from 'lucide-react';
import { LeafletMapPicker } from '../components/LeafletMapPicker';
import { ProductCard } from '../components/ProductCard';
import { ProductModal } from '../components/ProductModal';
import { UserAvatar } from '../components/UserAvatar';
import { STORE_CONFIG } from '../config/store';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { useCatalog } from '../hooks/useCatalog';
import { useFavorites } from '../hooks/useFavorites';
import { useToast } from '../hooks/useToast';
import { api } from '../services/api';
import {
  evaluatePasswordStrength,
  getTierProgressInfo,
  isValidPassword,
  REWARD_CATALOG,
} from '../services/auth';
import { Order, OrderStatus, Product, UserAddress } from '../types';
import { formatDateTimeVN, formatVND, isValidVNPhone, normalizeVNPhone } from '../utils/format';

type AccountTab = 'profile' | 'orders' | 'favorites' | 'addresses' | 'points' | 'settings';

const TAB_ITEMS: { id: AccountTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'profile', label: 'Hồ sơ', icon: UserIcon },
  { id: 'orders', label: 'Đơn hàng của tôi', icon: Package },
  { id: 'favorites', label: 'Món yêu thích', icon: Heart },
  { id: 'addresses', label: 'Địa chỉ', icon: MapPin },
  { id: 'points', label: 'Điểm thưởng JeJi', icon: Award },
  { id: 'settings', label: 'Cài đặt', icon: Settings },
];

const TIMELINE_STEPS: OrderStatus[] = [
  'Mới',
  'Đã xác nhận',
  'Đang pha chế',
  'Đang giao',
  'Hoàn thành',
];

const AVATAR_PRESETS = [
  { key: 'preset:rose', label: 'Hồng phấn' },
  { key: 'preset:peach', label: 'Kem đào' },
  { key: 'preset:butter', label: 'Bơ mật' },
  { key: 'preset:matcha', label: 'Matcha' },
  { key: 'initials:#D4606A', label: 'Chữ cái Hồng' },
  { key: 'initials:#8A5036', label: 'Chữ cái Nâu' },
  { key: 'initials:#BE5B50', label: 'Chữ cái Đất' },
  { key: 'initials:#5F8A56', label: 'Chữ cái Xanh' },
];

const TIER_STYLES = {
  Đồng: { bg: '#FCE8D5', text: '#6F3F2A', border: '#E3CDB8' },
  Bạc: { bg: '#F9D5D3', text: '#9B3922', border: '#EDB9B3' },
  Vàng: { bg: '#FBDB93', text: '#5A2E1C', border: '#E08A1E' },
};

function resizeAvatarToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không đọc được tệp ảnh.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Tệp không phải hình ảnh hợp lệ.'));
      img.onload = () => {
        const size = 200;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Trình duyệt không hỗ trợ xử lý ảnh.'));
          return;
        }
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export const AccountPage: React.FC = () => {
  const {
    user,
    logout,
    updateProfile,
    changePassword,
    addAddress,
    removeAddress,
    setDefaultAddress,
    redeemPoints,
    deleteAccount,
    refreshUser,
  } = useAuth();
  const { products } = useCatalog();
  const { list: favoriteIds } = useFavorites();
  const { addProductToCart, addComboToCart, setAppliedCode, openDrawer, refreshDiscounts } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialTab = (searchParams.get('tab') as AccountTab) || 'profile';
  const validTabIds = new Set<AccountTab>(['profile', 'orders', 'favorites', 'addresses', 'points', 'settings']);
  const [activeTab, setActiveTab] = useState<AccountTab>(
    validTabIds.has(initialTab) ? initialTab : 'profile'
  );

  useEffect(() => {
    const t = searchParams.get('tab') as AccountTab;
    if (t && validTabIds.has(t) && t !== activeTab) {
      setActiveTab(t);
    }
  }, [searchParams]);

  const handleSelectTab = (tab: AccountTab) => {
    setActiveTab(tab);
    setSearchParams({ tab }, { replace: true });
  };

  // === TAB 1: HỒ SƠ ===
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [birthday, setBirthday] = useState(user?.birthday || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [profileError, setProfileError] = useState<string | null>(null);
  const avatarFileRef = useRef<HTMLInputElement | null>(null);

  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwBusy, setPwBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name);
      setEmail(user.email || '');
      setBirthday(user.birthday || '');
      setAvatar(user.avatar || '');
    }
  }, [user]);

  // === TAB 2: ĐƠN HÀNG ===
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const combos = useMemo(() => api.getCombos(), []);

  const myOrders = useMemo(() => {
    if (!user) return [];
    const cleanPhone = normalizeVNPhone(user.phone);
    return api
      .getOrders()
      .filter(
        (o) =>
          o.user_id === user.user_id ||
          (cleanPhone && normalizeVNPhone(o.customer_phone) === cleanPhone)
      );
  }, [user]);

  // === TAB 3: YÊU THÍCH ===
  const [selectedFavProduct, setSelectedFavProduct] = useState<Product | null>(null);
  const favoriteProducts = useMemo(
    () =>
      favoriteIds
        .map((id) => products.find((p) => p.product_id === id))
        .filter((p): p is Product => Boolean(p)),
    [favoriteIds, products]
  );

  // === TAB 4: ĐỊA CHỈ ===
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addrLabel, setAddrLabel] = useState<'Nhà' | 'Công ty' | 'Khác'>('Nhà');
  const [addrRecipient, setAddrRecipient] = useState(user?.full_name || '');
  const [addrPhone, setAddrPhone] = useState(user?.phone || '');
  const [addrFull, setAddrFull] = useState('');
  const [addrLat, setAddrLat] = useState<number>(21.3145);
  const [addrLng, setAddrLng] = useState<number>(105.6112);
  const [addrDefault, setAddrDefault] = useState(false);
  const [addrError, setAddrError] = useState<string | null>(null);

  // === TAB 5: ĐIỂM THƯỞNG ===
  const [lastRedeemedCode, setLastRedeemedCode] = useState<string | null>(null);

  // === TAB 6: CÀI ĐẶT / XÓA TÀI KHOẢN ===
  const [deleteStep, setDeleteStep] = useState<0 | 1>(0);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  if (!user) return null;

  const tierInfo = getTierProgressInfo(user.points);
  const tierBadge = TIER_STYLES[user.tier];
  const pwStrength = evaluatePasswordStrength(newPw);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    try {
      updateProfile({
        full_name: fullName,
        email,
        birthday,
        avatar,
      });
      showToast('Đã cập nhật thông tin hồ sơ');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật hồ sơ.';
      setProfileError(msg);
      showToast(msg, 'error');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeAvatarToDataUrl(file);
      setAvatar(dataUrl);
      updateProfile({ avatar: dataUrl });
      showToast('Đã cập nhật ảnh đại diện mới');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Lỗi tải ảnh.', 'error');
    } finally {
      if (avatarFileRef.current) avatarFileRef.current.value = '';
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (!curPw) {
      setPwError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (!isValidPassword(newPw)) {
      setPwError('Mật khẩu mới cần tối thiểu 8 ký tự, gồm cả chữ và số.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError('Mật khẩu mới nhập lại chưa khớp.');
      return;
    }

    setPwBusy(true);
    try {
      await changePassword(curPw, newPw);
      setCurPw('');
      setNewPw('');
      setConfirmPw('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể đổi mật khẩu.';
      setPwError(msg);
      showToast(msg, 'error');
    } finally {
      setPwBusy(false);
    }
  };

  const handleReorder = (order: Order) => {
    const orderItems = api.getOrderItemsByOrderId(order.order_id);
    if (orderItems.length === 0) {
      showToast('Không tìm thấy chi tiết món để đặt lại', 'error');
      return;
    }

    let added = 0;
    orderItems.forEach((oi) => {
      if (oi.item_type === 'combo') {
        const combo = combos.find((c) => c.combo_id === oi.product_id);
        if (combo) {
          addComboToCart(combo, products, oi.quantity);
          added += oi.quantity;
        }
      } else {
        const product = products.find((p) => p.product_id === oi.product_id);
        if (product && product.is_available) {
          addProductToCart({
            product,
            size: oi.size,
            sugar_level: oi.sugar_level,
            ice_level: oi.ice_level,
            toppings: [],
            quantity: oi.quantity,
            note: oi.note,
          });
          added += oi.quantity;
        }
      }
    });

    if (added > 0) {
      showToast(`Đã thêm lại ${added} món từ đơn ${order.order_id} vào giỏ`);
      openDrawer();
    } else {
      showToast('Các món trong đơn này hiện đang tạm hết hàng', 'error');
    }
  };

  const handleQuickAddFav = (product: Product) => {
    addProductToCart({
      product,
      size: product.price_l !== null ? 'M' : 'Tiêu chuẩn',
      sugar_level: '70%',
      ice_level: 'Vừa',
      toppings: [],
      quantity: 1,
      note: '',
    });
    showToast(`Đã thêm ${product.name} vào giỏ hàng`);
  };

  const handleAddAllFavsToCart = () => {
    const available = favoriteProducts.filter((p) => p.is_available);
    if (available.length === 0) {
      showToast('Các món yêu thích hiện đang tạm hết hàng', 'error');
      return;
    }
    available.forEach((p) => handleQuickAddFav(p));
    openDrawer();
  };

  const handleSaveAddress = (e: React.FormEvent) => {
    e.preventDefault();
    setAddrError(null);
    if (!addrRecipient.trim()) {
      setAddrError('Vui lòng nhập tên người nhận.');
      return;
    }
    if (!isValidVNPhone(addrPhone)) {
      setAddrError('Số điện thoại người nhận chưa hợp lệ.');
      return;
    }
    if (!addrFull.trim()) {
      setAddrError('Vui lòng nhập địa chỉ giao hàng chi tiết.');
      return;
    }

    addAddress({
      label: addrLabel,
      recipient_name: addrRecipient.trim(),
      phone: normalizeVNPhone(addrPhone),
      full_address: addrFull.trim(),
      lat: addrLat,
      lng: addrLng,
      is_default: addrDefault,
    });
    setAddrFull('');
    setAddrDefault(false);
    setShowAddAddress(false);
  };

  const handleRedeem = (rewardId: string) => {
    try {
      const res = redeemPoints(rewardId);
      refreshDiscounts();
      setLastRedeemedCode(res.discount.code);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể đổi điểm.', 'error');
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    showToast(`Đã sao chép mã ${code}`);
  };

  const handleApplyCodeToCart = (code: string) => {
    refreshDiscounts();
    setAppliedCode(code);
    showToast(`Đã gắn mã ${code} vào giỏ hàng`);
    navigate('/thanh-toan');
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleteError(null);
    if (!deletePassword) {
      setDeleteError('Vui lòng nhập mật khẩu để xác nhận xóa tài khoản.');
      return;
    }
    setDeleteBusy(true);
    try {
      await deleteAccount(deletePassword);
      navigate('/');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Không thể xóa tài khoản.');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="pb-16">
      {/* Banner thông tin thành viên */}
      <section
        className="border-b border-[#EDB9B3] py-8 px-4 sm:px-6"
        style={{ background: 'linear-gradient(135deg, #F9D5D3 0%, #FCE8D5 65%, #F6DDB0 100%)' }}
      >
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <UserAvatar avatar={user.avatar} fullName={user.full_name} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#5A2E1C]">
                  {user.full_name}
                </h1>
                <span
                  style={{
                    backgroundColor: tierBadge.bg,
                    color: tierBadge.text,
                    borderColor: tierBadge.border,
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg border text-xs font-bold"
                >
                  <Star className="w-3.5 h-3.5 fill-current" />
                  Hạng {user.tier}
                </span>
                {user.role === 'admin' && (
                  <span className="px-2.5 py-0.5 rounded-lg bg-[#8A5036] text-[#FBDB93] text-xs font-bold">
                    Quản trị viên
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-[#6F3F2A] tabular-nums">
                {user.phone}
                {user.email ? ` · ${user.email}` : ''}
              </p>

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#8A5036] text-[#FBDB93] text-xs font-bold tabular-nums">
                  <Award className="w-3.5 h-3.5" />
                  {user.points.toLocaleString('vi-VN')} điểm JeJi
                </span>

                {user.welcome_code && (
                  <button
                    type="button"
                    onClick={() => handleCopyCode(user.welcome_code!)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FFF4EA] border border-[#EDB9B3] text-[#C4535A] text-xs font-semibold hover:bg-white transition-colors"
                    title="Bấm để sao chép mã chào mừng"
                  >
                    <Gift className="w-3.5 h-3.5" />
                    <span>Mã chào mừng: {user.welcome_code}</span>
                    <Copy className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {user.role === 'admin' && (
              <Link
                to="/admin"
                className="px-4 py-2.5 rounded-xl bg-[#8A5036] hover:bg-[#6F3F2A] text-[#FBDB93] text-xs sm:text-sm font-semibold transition-colors"
              >
                Trang quản trị
              </Link>
            )}
            <button
              type="button"
              onClick={() => {
                logout();
                navigate('/');
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/85 hover:bg-white border border-[#8A5036]/25 text-[#5A2E1C] text-xs sm:text-sm font-semibold transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Thanh chuyển 6 Tab */}
        <nav
          aria-label="Mục tài khoản"
          className="flex items-center gap-2 overflow-x-auto pb-1.5"
        >
          {TAB_ITEMS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap shrink-0 transition-all ${
                  isActive
                    ? 'bg-[#8A5036] text-[#FBDB93] shadow-xs'
                    : 'bg-[#FFFDF8] text-[#5A2E1C] border border-[#8A5036]/15 hover:bg-[#FCE8D5]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.id === 'orders' && myOrders.length > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] tabular-nums ${
                      isActive ? 'bg-[#FBDB93] text-[#5A2E1C]' : 'bg-[#F9D5D3] text-[#9B3922]'
                    }`}
                  >
                    {myOrders.length}
                  </span>
                )}
                {tab.id === 'favorites' && favoriteProducts.length > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] tabular-nums ${
                      isActive ? 'bg-[#FBDB93] text-[#5A2E1C]' : 'bg-[#F9D5D3] text-[#9B3922]'
                    }`}
                  >
                    {favoriteProducts.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* === TAB 1: HỒ SƠ === */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Thông tin cá nhân + Ảnh đại diện */}
            <form
              onSubmit={handleSaveProfile}
              className="lg:col-span-7 rounded-[20px] bg-[#FFFDF8] border border-[#8A5036]/15 p-6 sm:p-8 space-y-5 shadow-xs"
            >
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-xl font-bold text-[#914F1E]">
                  Thông tin cá nhân
                </h2>
                <span className="text-xs text-[#6F3F2A]">Mã TV: {user.user_id}</span>
              </div>

              {profileError && (
                <div className="p-3 rounded-xl bg-[#FBE3E0] border border-[#D4606A]/50 text-xs sm:text-sm text-[#AA2B1D] font-medium">
                  {profileError}
                </div>
              )}

              {/* Chọn ảnh đại diện */}
              <div className="p-4 rounded-2xl bg-[#FFF4EA] border border-[#8A5036]/12 space-y-3">
                <div className="flex flex-wrap items-center gap-4">
                  <UserAvatar avatar={avatar} fullName={fullName || user.full_name} size="md" />
                  <div className="flex-1 min-w-[200px]">
                    <p className="text-xs font-semibold text-[#5A2E1C]">Ảnh đại diện</p>
                    <p className="text-[11px] text-[#6F3F2A]">
                      Tải ảnh từ máy hoặc chọn biểu tượng pastel bên dưới.
                    </p>
                  </div>
                  <input
                    ref={avatarFileRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                    id="profile-avatar-upload"
                  />
                  <label
                    htmlFor="profile-avatar-upload"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8A5036] hover:bg-[#6F3F2A] text-[#FBDB93] text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Tải ảnh lên</span>
                  </label>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {AVATAR_PRESETS.map((preset) => (
                    <button
                      key={preset.key}
                      type="button"
                      onClick={() => setAvatar(preset.key)}
                      title={preset.label}
                      className={`p-1 rounded-full border-2 transition-all ${
                        avatar === preset.key
                          ? 'border-[#D4606A] scale-105'
                          : 'border-transparent hover:border-[#8A5036]/40'
                      }`}
                    >
                      <UserAvatar avatar={preset.key} fullName={fullName || user.full_name} size="xs" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="prof-name" className="block text-xs font-semibold text-[#5A2E1C] mb-1.5">
                    Họ và tên *
                  </label>
                  <input
                    id="prof-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/20 text-sm text-[#5A2E1C] focus:outline-none focus:border-[#8A5036]"
                  />
                </div>
                <div>
                  <label htmlFor="prof-phone" className="block text-xs font-semibold text-[#5A2E1C] mb-1.5">
                    Số điện thoại (định danh)
                  </label>
                  <input
                    id="prof-phone"
                    type="tel"
                    value={user.phone}
                    disabled
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FCE8D5]/60 border border-[#8A5036]/15 text-sm text-[#6F3F2A] tabular-nums cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="prof-email" className="block text-xs font-semibold text-[#5A2E1C] mb-1.5">
                    Email
                  </label>
                  <input
                    id="prof-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/20 text-sm text-[#5A2E1C] focus:outline-none focus:border-[#8A5036]"
                  />
                </div>
                <div>
                  <label htmlFor="prof-bday" className="block text-xs font-semibold text-[#5A2E1C] mb-1.5">
                    Ngày sinh
                  </label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-[#914F1E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="prof-bday"
                      type="date"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/20 text-sm text-[#5A2E1C] focus:outline-none focus:border-[#8A5036]"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="btn-rose-gradient px-6 py-3 rounded-xl text-sm font-semibold shadow-xs transition-all"
              >
                Lưu thay đổi hồ sơ
              </button>
            </form>

            {/* Đổi mật khẩu */}
            <form
              onSubmit={handleChangePassword}
              className="lg:col-span-5 rounded-[20px] bg-[#FFFDF8] border border-[#8A5036]/15 p-6 sm:p-8 space-y-4 shadow-xs"
            >
              <div className="flex items-center gap-2 text-[#914F1E]">
                <KeyRound className="w-5 h-5" />
                <h2 className="font-display text-xl font-bold">Đổi mật khẩu</h2>
              </div>

              {pwError && (
                <div className="p-3 rounded-xl bg-[#FBE3E0] border border-[#D4606A]/50 text-xs text-[#AA2B1D] font-medium">
                  {pwError}
                </div>
              )}

              <div>
                <label htmlFor="pw-cur" className="block text-xs font-semibold text-[#5A2E1C] mb-1.5">
                  Mật khẩu hiện tại *
                </label>
                <div className="relative">
                  <input
                    id="pw-cur"
                    type={showPw ? 'text' : 'password'}
                    value={curPw}
                    onChange={(e) => setCurPw(e.target.value)}
                    placeholder="Nhập mật khẩu hiện tại"
                    className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/20 text-sm text-[#5A2E1C] focus:outline-none focus:border-[#8A5036]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6F3F2A]"
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="pw-new" className="block text-xs font-semibold text-[#5A2E1C] mb-1.5">
                  Mật khẩu mới *
                </label>
                <input
                  id="pw-new"
                  type={showPw ? 'text' : 'password'}
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Tối thiểu 8 ký tự, chữ & số"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/20 text-sm text-[#5A2E1C] focus:outline-none focus:border-[#8A5036]"
                />
                {newPw.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-[#6F3F2A]">Độ mạnh:</span>
                      <span className="font-semibold" style={{ color: pwStrength.barColor }}>
                        {pwStrength.label}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-1 h-1.5">
                      {[1, 2, 3, 4].map((lvl) => (
                        <div
                          key={lvl}
                          className="rounded-full"
                          style={{
                            backgroundColor:
                              pwStrength.score >= lvl ? pwStrength.barColor : '#E3CDB8',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="pw-confirm" className="block text-xs font-semibold text-[#5A2E1C] mb-1.5">
                  Nhập lại mật khẩu mới *
                </label>
                <input
                  id="pw-confirm"
                  type={showPw ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/20 text-sm text-[#5A2E1C] focus:outline-none focus:border-[#8A5036]"
                />
              </div>

              <button
                type="submit"
                disabled={pwBusy}
                className="w-full py-2.5 rounded-xl bg-[#8A5036] hover:bg-[#6F3F2A] text-[#FBDB93] text-sm font-semibold transition-colors disabled:opacity-60"
              >
                {pwBusy ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
              </button>
            </form>
          </div>
        )}

        {/* === TAB 2: ĐƠN HÀNG CỦA TÔI === */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-xl font-bold text-[#914F1E]">
                Lịch sử đơn hàng của bạn ({myOrders.length})
              </h2>
              <button
                type="button"
                onClick={refreshUser}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFFDF8] border border-[#8A5036]/20 text-xs font-semibold text-[#5A2E1C] hover:bg-[#FCE8D5]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Làm mới trạng thái</span>
              </button>
            </div>

            {myOrders.length === 0 ? (
              <div className="rounded-[20px] bg-[#FFFDF8] border border-[#EDB9B3] p-10 text-center space-y-3">
                <Package className="w-10 h-10 mx-auto text-[#C4535A]" />
                <h3 className="font-display text-lg font-bold text-[#5A2E1C]">
                  Bạn chưa có đơn hàng nào
                </h3>
                <p className="text-sm text-[#6F3F2A] max-w-md mx-auto">
                  Đặt ly cà phê đầu tiên để tích 1 điểm cho mỗi 1.000đ khi đơn hoàn thành nhé.
                </p>
                <Link
                  to="/thuc-don"
                  className="btn-rose-gradient inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                >
                  Khám phá thực đơn
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {myOrders.map((order) => {
                  const items = api.getOrderItemsByOrderId(order.order_id);
                  const expanded = expandedOrderId === order.order_id;
                  const activeIdx = TIMELINE_STEPS.indexOf(order.status);
                  const pointsForOrder = Math.floor(Math.max(0, order.total_amount) / 1000);

                  return (
                    <div
                      key={order.order_id}
                      className="rounded-[20px] bg-[#FFFDF8] border border-[#8A5036]/15 p-5 sm:p-6 space-y-4 shadow-xs"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className="font-mono text-base sm:text-lg font-bold text-[#5A2E1C]">
                              {order.order_id}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                                order.status === 'Hủy'
                                  ? 'bg-[#AA2B1D] text-[#FFF4EA]'
                                  : order.status === 'Hoàn thành'
                                  ? 'bg-[#5F8A56] text-[#FFF4EA]'
                                  : 'bg-[#C4535A] text-white'
                              }`}
                            >
                              {order.status}
                            </span>
                            {order.status === 'Hoàn thành' ? (
                              <span className="px-2 py-0.5 rounded-lg bg-[#FBDB93] text-[#5A2E1C] text-xs font-bold tabular-nums">
                                +{pointsForOrder} điểm
                              </span>
                            ) : order.status !== 'Hủy' ? (
                              <span className="px-2 py-0.5 rounded-lg bg-[#FCE8D5] text-[#914F1E] text-xs font-medium tabular-nums">
                                Dự kiến +{pointsForOrder} điểm khi hoàn thành
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-[#6F3F2A]">
                            {formatDateTimeVN(order.created_at)} · {order.shipping_provider_name}
                          </p>
                          <p className="mt-1 text-xs text-[#5A2E1C]/85 line-clamp-1">
                            {items.map((it) => `${it.quantity}× ${it.product_name}`).join(', ')}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="font-display text-lg font-bold text-[#C4535A] tabular-nums mr-2">
                            {formatVND(order.total_amount)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedOrderId(expanded ? null : order.order_id)
                            }
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-[#FCE8D5] hover:bg-[#F9D5D3] text-[#5A2E1C] text-xs font-semibold transition-colors"
                          >
                            <span>{expanded ? 'Thu gọn' : 'Timeline & Chi tiết'}</span>
                            {expanded ? (
                              <ChevronUp className="w-3.5 h-3.5" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReorder(order)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8A5036] hover:bg-[#6F3F2A] text-[#FBDB93] text-xs font-semibold transition-colors"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Đặt lại</span>
                          </button>
                        </div>
                      </div>

                      {expanded && (
                        <div className="pt-4 border-t border-[#8A5036]/12 space-y-4">
                          {order.status === 'Hủy' ? (
                            <div className="p-3.5 rounded-2xl bg-[#FBE3E0] border border-[#D4606A]/40 flex items-center gap-2.5 text-xs sm:text-sm text-[#AA2B1D]">
                              <XCircle className="w-4 h-4 shrink-0" />
                              <span>Đơn hàng đã bị hủy và không được cộng điểm thưởng.</span>
                            </div>
                          ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                              {TIMELINE_STEPS.map((st, idx) => {
                                const reached = idx <= activeIdx;
                                return (
                                  <div
                                    key={st}
                                    className={`p-3 rounded-xl border text-center ${
                                      reached
                                        ? 'bg-[#C4535A] border-[#C4535A] text-white'
                                        : 'bg-[#F9E0DC] border-[#EDB9B3] text-[#5A2E1C]'
                                    }`}
                                  >
                                    <div className="flex justify-center mb-1">
                                      {reached ? (
                                        <CheckCircle2 className="w-4 h-4" />
                                      ) : (
                                        <Clock className="w-4 h-4 text-[#C4535A]" />
                                      )}
                                    </div>
                                    <p className="text-[11px] font-semibold">{st}</p>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <div className="rounded-2xl bg-[#FFF4EA] border border-[#8A5036]/12 p-4 space-y-2 text-xs">
                            <p className="font-semibold text-[#5A2E1C]">
                              Địa chỉ nhận: <span className="font-normal">{order.delivery_address}</span>
                            </p>
                            <div className="space-y-1 pt-1">
                              {items.map((it) => (
                                <div key={it.order_item_id} className="flex justify-between gap-2">
                                  <span className="text-[#5A2E1C]">
                                    {it.quantity}× {it.product_name} ({it.size})
                                    {it.toppings ? ` · ${it.toppings}` : ''}
                                  </span>
                                  <span className="font-semibold text-[#5A2E1C] tabular-nums">
                                    {formatVND(it.line_total)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* === TAB 3: MÓN YÊU THÍCH === */}
        {activeTab === 'favorites' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-[#914F1E]">
                  Món yêu thích của bạn ({favoriteProducts.length})
                </h2>
                <p className="text-xs text-[#6F3F2A]">
                  Danh sách được đồng bộ trực tiếp với tài khoản JeJi của bạn.
                </p>
              </div>
              {favoriteProducts.length > 0 && (
                <button
                  type="button"
                  onClick={handleAddAllFavsToCart}
                  className="btn-rose-gradient inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-xs"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Thêm tất cả vào giỏ</span>
                </button>
              )}
            </div>

            {favoriteProducts.length === 0 ? (
              <div className="rounded-[20px] bg-[#FFFDF8] border border-[#EDB9B3] p-10 text-center space-y-3">
                <Heart className="w-10 h-10 mx-auto text-[#D4606A]" />
                <h3 className="font-display text-lg font-bold text-[#5A2E1C]">
                  Chưa có món yêu thích nào
                </h3>
                <p className="text-sm text-[#6F3F2A]">
                  Bấm biểu tượng trái tim trên món bạn thích để lưu lại đặt nhanh lần sau.
                </p>
                <Link
                  to="/thuc-don"
                  className="btn-rose-gradient inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold"
                >
                  Khám phá thực đơn
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteProducts.map((product) => (
                  <ProductCard
                    key={product.product_id}
                    product={product}
                    onSelect={setSelectedFavProduct}
                    onQuickAdd={handleQuickAddFav}
                    showQuickAddLabel
                  />
                ))}
              </div>
            )}

            <ProductModal
              product={selectedFavProduct}
              allProducts={products}
              onClose={() => setSelectedFavProduct(null)}
            />
          </div>
        )}

        {/* === TAB 4: ĐỊA CHỈ GIAO HÀNG === */}
        {activeTab === 'addresses' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-bold text-[#914F1E]">
                  Sổ địa chỉ giao hàng ({user.addresses.length})
                </h2>
                <p className="text-xs text-[#6F3F2A]">
                  Địa chỉ mặc định sẽ được điền sẵn tự động khi bạn thanh toán.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAddrRecipient(user.full_name);
                  setAddrPhone(user.phone);
                  setShowAddAddress((v) => !v);
                }}
                className="btn-rose-gradient inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>{showAddAddress ? 'Đóng biểu mẫu' : 'Thêm địa chỉ mới'}</span>
              </button>
            </div>

            {showAddAddress && (
              <form
                onSubmit={handleSaveAddress}
                className="rounded-[20px] bg-[#FFFDF8] border border-[#EDB9B3] p-6 space-y-4 shadow-xs"
              >
                <h3 className="font-display text-lg font-bold text-[#914F1E]">
                  Thêm địa chỉ giao hàng
                </h3>
                {addrError && (
                  <p className="p-3 rounded-xl bg-[#FBE3E0] text-xs text-[#AA2B1D] font-medium">
                    {addrError}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {(['Nhà', 'Công ty', 'Khác'] as const).map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setAddrLabel(lbl)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                        addrLabel === lbl
                          ? 'bg-[#8A5036] text-[#FBDB93] border-[#8A5036]'
                          : 'bg-[#FFF4EA] text-[#5A2E1C] border-[#8A5036]/20'
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="addr-name" className="block text-xs font-semibold text-[#5A2E1C] mb-1">
                      Tên người nhận *
                    </label>
                    <input
                      id="addr-name"
                      type="text"
                      value={addrRecipient}
                      onChange={(e) => setAddrRecipient(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/20 text-sm text-[#5A2E1C] focus:outline-none focus:border-[#8A5036]"
                    />
                  </div>
                  <div>
                    <label htmlFor="addr-phone" className="block text-xs font-semibold text-[#5A2E1C] mb-1">
                      Số điện thoại *
                    </label>
                    <input
                      id="addr-phone"
                      type="tel"
                      value={addrPhone}
                      onChange={(e) => setAddrPhone(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/20 text-sm text-[#5A2E1C] tabular-nums focus:outline-none focus:border-[#8A5036]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="addr-full" className="block text-xs font-semibold text-[#5A2E1C] mb-1">
                    Địa chỉ chi tiết *
                  </label>
                  <input
                    id="addr-full"
                    type="text"
                    value={addrFull}
                    onChange={(e) => setAddrFull(e.target.value)}
                    placeholder="Số nhà, đường, phường/xã, Vĩnh Yên..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/20 text-sm text-[#5A2E1C] focus:outline-none focus:border-[#8A5036]"
                  />
                </div>

                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-[#5A2E1C]">
                    Ghim tọa độ trên bản đồ (tuỳ chọn, giúp tính phí giao nhanh)
                  </p>
                  <LeafletMapPicker
                    centerLat={addrLat}
                    centerLng={addrLng}
                    markerLat={addrLat}
                    markerLng={addrLng}
                    storeLat={STORE_CONFIG.lat}
                    storeLng={STORE_CONFIG.lng}
                    interactive
                    heightClass="h-48"
                    onLocationChange={(lat, lng) => {
                      setAddrLat(lat);
                      setAddrLng(lng);
                    }}
                  />
                </div>

                <label className="inline-flex items-center gap-2 text-xs text-[#5A2E1C] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={addrDefault}
                    onChange={(e) => setAddrDefault(e.target.checked)}
                    className="accent-[#D4606A]"
                  />
                  <span>Đặt làm địa chỉ giao hàng mặc định</span>
                </label>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="btn-rose-gradient px-5 py-2.5 rounded-xl text-sm font-semibold"
                  >
                    Lưu địa chỉ
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddAddress(false)}
                    className="px-4 py-2.5 rounded-xl border border-[#8A5036]/25 text-sm font-semibold text-[#5A2E1C]"
                  >
                    Hủy
                  </button>
                </div>
              </form>
            )}

            {user.addresses.length === 0 ? (
              <div className="rounded-[20px] bg-[#FFFDF8] border border-[#8A5036]/15 p-8 text-center text-sm text-[#6F3F2A]">
                Bạn chưa lưu địa chỉ nào. Hãy bấm &ldquo;Thêm địa chỉ mới&rdquo; để thanh toán nhanh hơn.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.addresses.map((addr: UserAddress) => (
                  <div
                    key={addr.address_id}
                    className={`rounded-[20px] p-5 border flex flex-col justify-between gap-4 ${
                      addr.is_default
                        ? 'bg-[#FCE8D5]/70 border-[#D4606A]'
                        : 'bg-[#FFFDF8] border-[#8A5036]/15'
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-[#8A5036] text-[#FBDB93] text-xs font-bold">
                          {addr.label}
                        </span>
                        {addr.is_default && (
                          <span className="inline-flex items-center gap-1 text-xs font-bold text-[#C4535A]">
                            <Check className="w-3.5 h-3.5" />
                            Mặc định
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-sm text-[#5A2E1C]">
                        {addr.recipient_name} ·{' '}
                        <span className="tabular-nums font-medium">{addr.phone}</span>
                      </p>
                      <p className="text-xs text-[#6F3F2A] leading-relaxed">{addr.full_address}</p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-[#8A5036]/10">
                      {!addr.is_default && (
                        <button
                          type="button"
                          onClick={() => setDefaultAddress(addr.address_id)}
                          className="px-3 py-1.5 rounded-lg bg-[#FFF4EA] hover:bg-[#F9D5D3] border border-[#8A5036]/20 text-xs font-semibold text-[#5A2E1C] transition-colors"
                        >
                          Đặt mặc định
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => removeAddress(addr.address_id)}
                        className="ml-auto inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#AA2B1D] hover:bg-[#FBE3E0] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* === TAB 5: ĐIỂM THƯỞNG JEJI === */}
        {activeTab === 'points' && (
          <div className="space-y-6">
            {/* Thẻ tiến trình hạng thành viên */}
            <div
              className="rounded-[20px] border border-[#EDB9B3] p-6 sm:p-8 space-y-5"
              style={{ background: 'linear-gradient(135deg, #F9D5D3 0%, #FCE8D5 100%)' }}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#9B3922]">
                    JeJi Rewards · Tích 1 điểm / 1.000đ đơn Hoàn thành
                  </p>
                  <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#5A2E1C] tabular-nums">
                    {user.points.toLocaleString('vi-VN')} điểm · Hạng {tierInfo.currentTier}
                  </h2>
                  <p className="mt-1 text-xs text-[#6F3F2A]">{tierInfo.rangeLabel}</p>
                </div>
                <div className="px-4 py-2.5 rounded-2xl bg-[#FFF4EA]/85 border border-[#EDB9B3] text-xs text-[#5A2E1C] space-y-0.5">
                  <p className="font-semibold">Các mốc hạng thành viên:</p>
                  <p>Đồng: 0–499 · Bạc: 500–1.499 · Vàng: ≥1.500 điểm</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="h-3 w-full rounded-full bg-[#FFF4EA] overflow-hidden border border-[#EDB9B3]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${tierInfo.progressPercent}%`,
                      background: 'linear-gradient(90deg, #F2A7A7 0%, #D4606A 100%)',
                    }}
                  />
                </div>
                <p className="text-xs font-semibold text-[#5A2E1C] tabular-nums">
                  {tierInfo.nextTier
                    ? `Cần thêm ${tierInfo.pointsToNext.toLocaleString('vi-VN')} điểm nữa để lên hạng ${tierInfo.nextTier}`
                    : 'Chúc mừng! Bạn đang ở hạng Vàng cao nhất tại JeJi Coffee.'}
                </p>
              </div>
            </div>

            {lastRedeemedCode && (
              <div className="rounded-2xl bg-[#DCE9C9] border border-[#5F8A56]/40 p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 text-sm text-[#5A2E1C]">
                  <Sparkles className="w-5 h-5 text-[#5F8A56] shrink-0" />
                  <span>
                    Mã ưu đãi mới của bạn:{' '}
                    <strong className="font-mono text-base">{lastRedeemedCode}</strong> (có hiệu lực 60 ngày)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyCode(lastRedeemedCode)}
                    className="px-3 py-1.5 rounded-lg bg-white text-[#5A2E1C] text-xs font-semibold"
                  >
                    Sao chép
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyCodeToCart(lastRedeemedCode)}
                    className="btn-rose-gradient px-3.5 py-1.5 rounded-lg text-xs font-semibold"
                  >
                    Dùng ngay cho đơn hàng
                  </button>
                </div>
              </div>
            )}

            {/* Danh sách quà đổi điểm */}
            <div className="space-y-3">
              <h3 className="font-display text-lg font-bold text-[#914F1E]">
                Đổi điểm lấy mã giảm giá
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {REWARD_CATALOG.map((rw) => {
                  const canRedeem = user.points >= rw.points_cost;
                  return (
                    <div
                      key={rw.id}
                      className="rounded-[20px] bg-[#FFFDF8] border border-[#8A5036]/15 p-5 flex flex-col justify-between gap-4 shadow-xs"
                    >
                      <div className="space-y-1.5">
                        <span className="inline-block px-2.5 py-0.5 rounded-lg bg-[#FBE3E0] text-[#C4535A] text-xs font-bold tabular-nums">
                          {rw.points_cost} điểm
                        </span>
                        <h4 className="font-display text-base font-bold text-[#5A2E1C]">
                          {rw.title}
                        </h4>
                        <p className="text-xs text-[#6F3F2A] leading-relaxed">{rw.description}</p>
                      </div>
                      <button
                        type="button"
                        disabled={!canRedeem}
                        onClick={() => handleRedeem(rw.id)}
                        className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-all ${
                          canRedeem
                            ? 'btn-rose-gradient shadow-xs'
                            : 'bg-[#FCE8D5] text-[#6F3F2A]/70 cursor-not-allowed'
                        }`}
                      >
                        {canRedeem
                          ? 'Đổi mã ngay'
                          : `Thiếu ${rw.points_cost - user.points} điểm`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Lịch sử giao dịch điểm */}
            <div className="rounded-[20px] bg-[#FFFDF8] border border-[#8A5036]/15 p-6 space-y-4">
              <h3 className="font-display text-lg font-bold text-[#914F1E]">
                Lịch sử tích & đổi điểm ({(user.point_history || []).length})
              </h3>
              {(user.point_history || []).length === 0 ? (
                <p className="text-sm text-[#6F3F2A]">
                  Chưa có giao dịch điểm nào. Hoàn thành đơn hàng để nhận 1 điểm cho mỗi 1.000đ.
                </p>
              ) : (
                <ul className="divide-y divide-[#8A5036]/10">
                  {(user.point_history || []).map((tx) => (
                    <li
                      key={tx.tx_id}
                      className="py-3 flex flex-wrap items-center justify-between gap-2 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-[#5A2E1C]">{tx.description}</p>
                        <p className="text-xs text-[#6F3F2A]">{formatDateTimeVN(tx.created_at)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {tx.voucher_code && (
                          <button
                            type="button"
                            onClick={() => handleApplyCodeToCart(tx.voucher_code!)}
                            className="px-2.5 py-1 rounded-lg bg-[#FCE8D5] hover:bg-[#F9D5D3] font-mono text-xs font-bold text-[#914F1E]"
                          >
                            Dùng {tx.voucher_code}
                          </button>
                        )}
                        <span
                          className={`font-bold tabular-nums ${
                            tx.points >= 0 ? 'text-[#5F8A56]' : 'text-[#C4535A]'
                          }`}
                        >
                          {tx.points >= 0 ? `+${tx.points}` : tx.points} điểm
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* === TAB 6: CÀI ĐẶT === */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="rounded-[20px] bg-[#FFFDF8] border border-[#8A5036]/15 p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 text-[#914F1E]">
                <Bell className="w-5 h-5" />
                <h2 className="font-display text-lg font-bold">Thông báo trạng thái đơn</h2>
              </div>
              <label className="flex items-start justify-between gap-4 p-4 rounded-2xl bg-[#FFF4EA] border border-[#8A5036]/12 cursor-pointer">
                <div>
                  <p className="text-sm font-semibold text-[#5A2E1C]">
                    Nhận thông báo cập nhật đơn hàng
                  </p>
                  <p className="text-xs text-[#6F3F2A] mt-0.5">
                    Thông báo khi quán xác nhận, đang pha chế, giao hàng hoặc cộng điểm hoàn thành.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={user.notify_order_status}
                  onChange={(e) => {
                    updateProfile({ notify_order_status: e.target.checked });
                    showToast(
                      e.target.checked
                        ? 'Đã bật thông báo trạng thái đơn'
                        : 'Đã tắt thông báo trạng thái đơn',
                      'info'
                    );
                  }}
                  className="w-5 h-5 accent-[#D4606A] mt-0.5"
                />
              </label>
            </div>

            <div className="rounded-[20px] bg-[#FFFDF8] border border-[#D4606A]/35 p-6 space-y-4 shadow-xs">
              <div className="flex items-center gap-2 text-[#AA2B1D]">
                <AlertTriangle className="w-5 h-5" />
                <h2 className="font-display text-lg font-bold">Xóa tài khoản (2 bước xác nhận)</h2>
              </div>
              <p className="text-xs text-[#6F3F2A] leading-relaxed">
                Hành động này sẽ xóa hồ sơ, sổ địa chỉ và điểm thưởng thành viên khỏi trình duyệt
                hiện tại và không thể khôi phục.
              </p>

              {deleteStep === 0 ? (
                <button
                  type="button"
                  onClick={() => setDeleteStep(1)}
                  className="px-4 py-2.5 rounded-xl bg-[#FBE3E0] hover:bg-[#F9D5D3] border border-[#D4606A]/40 text-xs font-bold text-[#AA2B1D] transition-colors"
                >
                  Tôi muốn xóa tài khoản này
                </button>
              ) : (
                <form onSubmit={handleDeleteAccount} className="space-y-3 p-4 rounded-2xl bg-[#FBE3E0]/60 border border-[#D4606A]/35">
                  <p className="text-xs font-bold text-[#AA2B1D]">
                    Bước 2/2: Nhập mật khẩu hiện tại để xác nhận xóa vĩnh viễn
                  </p>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    placeholder="Nhập mật khẩu để xác nhận"
                    className="w-full px-3.5 py-2 rounded-xl bg-white border border-[#D4606A]/40 text-sm text-[#5A2E1C] focus:outline-none"
                  />
                  {deleteError && (
                    <p className="text-xs font-medium text-[#AA2B1D]">{deleteError}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      disabled={deleteBusy}
                      className="px-4 py-2 rounded-xl bg-[#AA2B1D] text-white text-xs font-bold hover:opacity-90 disabled:opacity-60"
                    >
                      {deleteBusy ? 'Đang xóa...' : 'Xác nhận xóa vĩnh viễn'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDeleteStep(0);
                        setDeletePassword('');
                        setDeleteError(null);
                      }}
                      className="px-4 py-2 rounded-xl bg-white text-[#5A2E1C] border border-[#8A5036]/20 text-xs font-semibold"
                    >
                      Hủy bỏ
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
