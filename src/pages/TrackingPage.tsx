import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Award,
  CheckCircle2,
  Clock,
  ExternalLink,
  Package,
  RefreshCw,
  Search,
  Truck,
  XCircle,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { useToast } from '../hooks/useToast';
import { api } from '../services/api';
import { Order, OrderItem, OrderStatus } from '../types';
import { formatDateTimeVN, formatETA, formatVND, normalizeVNPhone } from '../utils/format';
import { buildTrackingUrl } from '../utils/order';

const TIMELINE_STEPS: OrderStatus[] = [
  'Mới',
  'Đã xác nhận',
  'Đang pha chế',
  'Đang giao',
  'Hoàn thành',
];

export const TrackingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addProductToCart, addComboToCart, openDrawer } = useCart();
  const { showToast } = useToast();

  const [orderIdInput, setOrderIdInput] = useState(searchParams.get('orderId') || '');
  const [phoneInput, setPhoneInput] = useState(searchParams.get('phone') || '');
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [searchedItems, setSearchedItems] = useState<OrderItem[]>([]);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const products = useMemo(() => api.getProducts(), []);
  const combos = useMemo(() => api.getCombos(), []);
  const shippingProviders = useMemo(() => api.getShippingProviders(), []);
  const recentOrders = useMemo(() => api.getRecentOrdersForDevice(), [searchedOrder]);

  const accountOrders = useMemo(() => {
    if (!user) return [];
    const cleanPhone = normalizeVNPhone(user.phone);
    return api
      .getOrders()
      .filter(
        (o) =>
          o.user_id === user.user_id ||
          (cleanPhone && normalizeVNPhone(o.customer_phone) === cleanPhone)
      );
  }, [user, searchedOrder]);

  const performLookup = (oid: string, phone: string) => {
    if (!oid.trim() || !phone.trim()) {
      setLookupError('Vui lòng nhập đầy đủ mã đơn hàng và số điện thoại.');
      setSearchedOrder(null);
      return;
    }
    const found = api.getOrderByIdAndPhone(oid, phone);
    if (!found) {
      setLookupError(
        `Không tìm thấy đơn hàng "${oid.trim().toUpperCase()}" khớp với số điện thoại này.`
      );
      setSearchedOrder(null);
      setSearchedItems([]);
      return;
    }
    setLookupError(null);
    setSearchedOrder(found);
    setSearchedItems(api.getOrderItemsByOrderId(found.order_id));
  };

  useEffect(() => {
    const qId = searchParams.get('orderId');
    const qPhone = searchParams.get('phone');
    if (qId && qPhone) {
      setOrderIdInput(qId);
      setPhoneInput(qPhone);
      performLookup(qId, qPhone);
    }
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performLookup(orderIdInput, phoneInput);
  };

  const handleReorder = (order: Order) => {
    const orderItems = api.getOrderItemsByOrderId(order.order_id);
    if (orderItems.length === 0) {
      showToast('Không tìm thấy chi tiết món để đặt lại', 'error');
      return;
    }

    let addedCount = 0;
    orderItems.forEach((oi) => {
      if (oi.item_type === 'combo') {
        const combo = combos.find((c) => c.combo_id === oi.product_id);
        if (combo) {
          addComboToCart(combo, products, oi.quantity);
          addedCount += oi.quantity;
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
          addedCount += oi.quantity;
        }
      }
    });

    if (addedCount > 0) {
      showToast(`Đã thêm lại ${addedCount} món vào giỏ hàng`);
      openDrawer();
      navigate('/thuc-don');
    } else {
      showToast('Các món trong đơn cũ hiện tạm hết hàng', 'error');
    }
  };

  const provider = searchedOrder
    ? shippingProviders.find((p) => p.provider_id === searchedOrder.shipping_provider_id)
    : undefined;
  const trackingUrl =
    searchedOrder && provider && searchedOrder.tracking_code
      ? buildTrackingUrl(provider.tracking_url_template, searchedOrder.tracking_code)
      : '';

  const activeStepIdx = searchedOrder ? TIMELINE_STEPS.indexOf(searchedOrder.status) : -1;

  return (
    <div className="pb-16">
      <section className="bg-[#8A5036] text-[#FFF4EA] py-10 px-4 sm:px-6 border-b border-[#FBDB93]/20">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#FBDB93]">
            Kiểm tra trạng thái pha chế & giao nhận
          </p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold text-[#FFF4EA]">
            Theo dõi đơn hàng
          </h1>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-10">
        {/* Form tra cứu */}
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl bg-[#FFFDF8] border border-[#8A5036]/15 p-6 sm:p-8 shadow-xs space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
            <div className="sm:col-span-5">
              <label htmlFor="track-id" className="block text-xs font-semibold text-[#5A2E1C] mb-1.5">
                Mã đơn hàng
              </label>
              <input
                id="track-id"
                type="text"
                value={orderIdInput}
                onChange={(e) => setOrderIdInput(e.target.value.toUpperCase())}
                placeholder="Ví dụ: JJ261116001"
                className="w-full px-4 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/20 text-sm text-[#5A2E1C] font-mono uppercase focus:outline-none focus:border-[#8A5036]"
              />
            </div>
            <div className="sm:col-span-4">
              <label htmlFor="track-phone" className="block text-xs font-semibold text-[#5A2E1C] mb-1.5">
                Số điện thoại đặt hàng
              </label>
              <input
                id="track-phone"
                type="tel"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="Ví dụ: 0912345678"
                className="w-full px-4 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/20 text-sm text-[#5A2E1C] tabular-nums focus:outline-none focus:border-[#8A5036]"
              />
            </div>
            <div className="sm:col-span-3">
              <button
                type="submit"
                className="btn-rose-gradient w-full py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-xs"
              >
                <Search className="w-4 h-4" />
                <span>Tra cứu</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-[#6F3F2A]">
            Thử nhanh với đơn mẫu:{' '}
            <button
              type="button"
              onClick={() => {
                setOrderIdInput('JJ261116001');
                setPhoneInput('0912345678');
                performLookup('JJ261116001', '0912345678');
              }}
              className="font-mono font-semibold text-[#C4535A] underline"
            >
              JJ261116001 · 0912345678
            </button>
          </p>

          {lookupError && (
            <div className="p-3.5 rounded-xl bg-[#AA2B1D]/10 text-sm text-[#AA2B1D] font-medium">
              {lookupError}
            </div>
          )}
        </form>

        {/* Kết quả theo dõi */}
        {searchedOrder && (
          <div className="rounded-3xl bg-[#FFFDF8] border border-[#8A5036]/18 p-6 sm:p-8 space-y-6 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-[#8A5036]/12">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="font-mono text-2xl font-bold text-[#5A2E1C]">
                    {searchedOrder.order_id}
                  </h2>
                  <span
                    className={`px-3 py-1 rounded-xl text-xs font-bold ${
                      searchedOrder.status === 'Hủy'
                        ? 'bg-[#AA2B1D] text-[#FFF4EA]'
                        : searchedOrder.status === 'Hoàn thành'
                        ? 'bg-[#5F8A56] text-[#FFF4EA]'
                        : 'bg-[#C4535A] text-white'
                    }`}
                  >
                    {searchedOrder.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#6F3F2A]">
                  Đặt lúc {formatDateTimeVN(searchedOrder.created_at)} ·{' '}
                  {searchedOrder.customer_name}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleReorder(searchedOrder)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#8A5036] hover:bg-[#6F3F2A] text-[#FBDB93] text-xs font-semibold transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Đặt lại đơn này</span>
              </button>
            </div>

            {/* Timeline trạng thái: bước xong nền #C4535A chữ trắng, bước chưa tới nền #F9E0DC */}
            {searchedOrder.status === 'Hủy' ? (
              <div className="p-4 rounded-2xl bg-[#AA2B1D]/10 border border-[#AA2B1D]/25 flex items-center gap-3 text-sm text-[#AA2B1D]">
                <XCircle className="w-5 h-5 shrink-0" />
                <span>Đơn hàng này đã bị hủy. Vui lòng liên hệ quán nếu bạn cần hỗ trợ thêm.</span>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {TIMELINE_STEPS.map((st, idx) => {
                  const reached = idx <= activeStepIdx;
                  return (
                    <div
                      key={st}
                      className={`p-3.5 rounded-2xl border text-center transition-colors ${
                        reached
                          ? 'bg-[#C4535A] border-[#C4535A] text-white shadow-xs'
                          : 'bg-[#F9E0DC] border-[#EDB9B3] text-[#5A2E1C]'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center mb-2 ${
                          reached
                            ? 'bg-white/20 text-white'
                            : 'bg-[#C4535A]/15 text-[#C4535A]'
                        }`}
                      >
                        {reached ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                      </div>
                      <p className="text-xs font-semibold">{st}</p>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Thông tin vận chuyển & mã vận đơn */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-[#FFF4EA] border border-[#8A5036]/12 space-y-1.5 text-sm">
                <div className="flex items-center gap-2 font-semibold text-[#5A2E1C]">
                  <Truck className="w-4 h-4 text-[#914F1E]" />
                  <span>Thông tin giao nhận</span>
                </div>
                <p className="text-xs text-[#6F3F2A]">
                  Đơn vị: <strong className="text-[#5A2E1C]">{searchedOrder.shipping_provider_name}</strong>
                </p>
                <p className="text-xs text-[#6F3F2A]">Địa chỉ: {searchedOrder.delivery_address}</p>
                {provider && (
                  <p className="text-xs text-[#6F3F2A]">
                    Dự kiến: <strong>{formatETA(provider.eta_minutes)}</strong>
                  </p>
                )}
                {searchedOrder.tracking_code && (
                  <div className="pt-1 flex items-center gap-2">
                    <span className="text-xs text-[#6F3F2A]">
                      Mã vận đơn:{' '}
                      <strong className="font-mono text-[#5A2E1C]">
                        {searchedOrder.tracking_code}
                      </strong>
                    </span>
                    {trackingUrl && (
                      <a
                        href={trackingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#C4535A] hover:underline"
                      >
                        <span>Xem hành trình</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-[#FFF4EA] border border-[#8A5036]/12 space-y-2 text-sm">
                <div className="flex items-center gap-2 font-semibold text-[#5A2E1C]">
                  <Package className="w-4 h-4 text-[#914F1E]" />
                  <span>Chi tiết món ({searchedItems.length})</span>
                </div>
                <ul className="space-y-1.5 text-xs">
                  {searchedItems.map((it) => (
                    <li key={it.order_item_id} className="flex justify-between gap-2">
                      <span className="text-[#5A2E1C]">
                        {it.quantity}× {it.product_name} ({it.size})
                        {it.toppings ? ` — ${it.toppings}` : ''}
                      </span>
                      <span className="font-semibold text-[#5A2E1C] tabular-nums shrink-0">
                        {formatVND(it.line_total)}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="pt-2 border-t border-[#8A5036]/12 flex justify-between font-bold text-sm">
                  <span className="text-[#5A2E1C]">Tổng cộng</span>
                  <span className="text-[#C4535A] tabular-nums">
                    {formatVND(searchedOrder.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Đơn hàng của tài khoản đang đăng nhập (không cần nhập mã) */}
        {user && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-xl font-bold text-[#914F1E]">
                  Đơn hàng của tài khoản {user.full_name} ({accountOrders.length})
                </h2>
                <p className="text-xs text-[#6F3F2A]">
                  Tự động hiển thị tất cả đơn hàng gắn với tài khoản và số điện thoại {user.phone}.
                </p>
              </div>
              <Link
                to="/tai-khoan?tab=orders"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C4535A] hover:underline"
              >
                <Award className="w-3.5 h-3.5" />
                <span>Xem trong trang Tài khoản</span>
              </Link>
            </div>

            {accountOrders.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[#FFFDF8] border border-[#8A5036]/15 text-sm text-[#6F3F2A]">
                Tài khoản của bạn chưa có đơn hàng nào. Đặt món ngay để bắt đầu tích điểm JeJi nhé!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {accountOrders.map((order) => (
                  <div
                    key={order.order_id}
                    className="p-5 rounded-2xl bg-[#FFFDF8] border border-[#EDB9B3] flex flex-col justify-between gap-4 shadow-xs"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-sm text-[#5A2E1C]">
                          {order.order_id}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                            order.status === 'Hủy'
                              ? 'bg-[#AA2B1D] text-white'
                              : order.status === 'Hoàn thành'
                              ? 'bg-[#5F8A56] text-white'
                              : 'bg-[#FBE3E0] text-[#C4535A]'
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-[#6F3F2A]">
                        {formatDateTimeVN(order.created_at)}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-[#914F1E] tabular-nums">
                          {formatVND(order.total_amount)}
                        </span>
                        {order.status !== 'Hủy' && (
                          <span className="text-[11px] font-semibold text-[#5F8A56] tabular-nums">
                            +{Math.floor(Math.max(0, order.total_amount) / 1000)} điểm
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setOrderIdInput(order.order_id);
                          setPhoneInput(order.customer_phone);
                          performLookup(order.order_id, order.customer_phone);
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-[#FCE8D5] hover:bg-[#F9D5D3] text-[#5A2E1C] text-xs font-semibold transition-colors"
                      >
                        Xem timeline
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReorder(order)}
                        className="py-2 px-3 rounded-xl border border-[#8A5036]/25 hover:bg-[#8A5036] hover:text-[#FFF4EA] text-[#5A2E1C] text-xs font-semibold transition-colors"
                      >
                        Đặt lại
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Đơn gần đây của thiết bị này */}
        {!user && recentOrders.length > 0 && (
          <section className="space-y-4">
            <h2 className="font-display text-xl font-bold text-[#914F1E]">
              Đơn hàng gần đây trên thiết bị này
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentOrders.map((order) => (
                <div
                  key={order.order_id}
                  className="p-5 rounded-2xl bg-[#FFFDF8] border border-[#8A5036]/15 flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-bold text-sm text-[#5A2E1C]">
                        {order.order_id}
                      </span>
                      <span className="text-xs font-semibold text-[#C4535A]">{order.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#6F3F2A]">
                      {formatDateTimeVN(order.created_at)}
                    </p>
                    <p className="mt-2 text-sm font-bold text-[#914F1E] tabular-nums">
                      {formatVND(order.total_amount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setOrderIdInput(order.order_id);
                        setPhoneInput(order.customer_phone);
                        performLookup(order.order_id, order.customer_phone);
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-[#FCE8D5] hover:bg-[#F9D5D3] text-[#5A2E1C] text-xs font-semibold transition-colors"
                    >
                      Xem chi tiết
                    </button>
                    <button
                      type="button"
                      onClick={() => handleReorder(order)}
                      className="py-2 px-3 rounded-xl border border-[#8A5036]/25 hover:bg-[#8A5036] hover:text-[#FFF4EA] text-[#5A2E1C] text-xs font-semibold transition-colors"
                    >
                      Đặt lại
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};
