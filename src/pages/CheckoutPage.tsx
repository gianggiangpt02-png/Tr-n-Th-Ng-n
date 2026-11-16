import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  Crosshair,
  Gift,
  MapPin,
  QrCode,
  ShieldCheck,
  Smartphone,
  Store,
  Tag,
  Truck,
  Wallet,
} from 'lucide-react';
import { motion } from 'motion/react';
import { LeafletMapPicker } from '../components/LeafletMapPicker';
import { ProductImage } from '../components/ProductImage';
import { STORE_CONFIG, formatStoreField } from '../config/store';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { useToast } from '../hooks/useToast';
import { api } from '../services/api';
import {
  DeliveryType,
  Order,
  OrderItem,
  PaymentMethod,
  PaymentStatus,
} from '../types';
import { validateAndCalculateDiscount } from '../utils/discount';
import { formatETA, formatVND, isValidVNPhone } from '../utils/format';
import { calculateOrderTotals, generateOrderId } from '../utils/order';
import { calculateHaversineKm, calculateShippingFee } from '../utils/shipping';

const STEPS = [
  { id: 1, label: 'Nhận hàng' },
  { id: 2, label: 'Thông tin' },
  { id: 3, label: 'Vận chuyển' },
  { id: 4, label: 'Thanh toán' },
  { id: 5, label: 'Xác nhận' },
];

export const CheckoutPage: React.FC = () => {
  const {
    items,
    subtotal,
    appliedCode,
    setAppliedCode,
    discounts,
    refreshDiscounts,
    clearCart,
  } = useCart();
  const { user, openAuthModal } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const shippingProviders = useMemo(() => api.getShippingProviders(), []);
  const existingOrders = useMemo(() => api.getOrders(), []);

  const [step, setStep] = useState<number>(1);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('delivery');
  const [pickupTime, setPickupTime] = useState<string>('Trong 20 phút tới');

  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [orderNote, setOrderNote] = useState<string>('');

  // Tọa độ mặc định cách quán ~1.1km tại Vĩnh Yên để người dùng dễ thử ngay hoặc kéo ghim
  const [customerLat, setCustomerLat] = useState<number>(21.3145);
  const [customerLng, setCustomerLng] = useState<number>(105.6112);
  const [locating, setLocating] = useState(false);

  const [selectedProviderId, setSelectedProviderId] = useState<string>('SHIP_JEJI');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cod');
  const [simulatedPaid, setSimulatedPaid] = useState<boolean>(false);

  const [couponInput, setCouponInput] = useState<string>(appliedCode);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // Tự động điền thông tin & địa chỉ mặc định khi người dùng đã đăng nhập
  const prefilledUserRef = useRef<string | null>(null);
  useEffect(() => {
    if (!user) {
      prefilledUserRef.current = null;
      return;
    }
    if (prefilledUserRef.current === user.user_id) return;
    prefilledUserRef.current = user.user_id;

    const defaultAddr =
      user.addresses.find((a) => a.is_default) || user.addresses[0] || null;
    if (!customerName.trim()) {
      setCustomerName(defaultAddr?.recipient_name || user.full_name || '');
    }
    if (!customerPhone.trim()) {
      setCustomerPhone(defaultAddr?.phone || user.phone || '');
    }
    if (defaultAddr && !deliveryAddress.trim()) {
      setDeliveryAddress(defaultAddr.full_address);
      if (defaultAddr.lat !== null && defaultAddr.lng !== null) {
        setCustomerLat(defaultAddr.lat);
        setCustomerLng(defaultAddr.lng);
      }
    }
  }, [user, customerName, customerPhone, deliveryAddress]);

  // Khoảng cách Haversine từ quán tới điểm ghim
  const distanceKm = useMemo(
    () =>
      deliveryType === 'pickup'
        ? 0
        : calculateHaversineKm(STORE_CONFIG.lat, STORE_CONFIG.lng, customerLat, customerLng),
    [deliveryType, customerLat, customerLng]
  );

  // Tính phí từng đơn vị vận chuyển
  const shippingOptions = useMemo(
    () =>
      shippingProviders
        .filter((p) => p.is_active)
        .map((provider) => calculateShippingFee(provider, distanceKm)),
    [shippingProviders, distanceKm]
  );

  const selectedShipping = useMemo(() => {
    if (deliveryType === 'pickup') return null;
    const exact = shippingOptions.find((o) => o.provider.provider_id === selectedProviderId && o.eligible);
    return exact || shippingOptions.find((o) => o.eligible) || null;
  }, [deliveryType, shippingOptions, selectedProviderId]);

  const rawShippingFee = deliveryType === 'pickup' ? 0 : selectedShipping?.fee || 0;

  // Áp mã giảm giá với phí ship thực tế
  const discountValidation = useMemo(() => {
    if (!appliedCode) {
      return {
        valid: false,
        orderDiscountAmount: 0,
        shippingDiscountAmount: 0,
        totalDiscountAmount: 0,
      };
    }
    return validateAndCalculateDiscount(appliedCode, discounts, subtotal, rawShippingFee);
  }, [appliedCode, discounts, subtotal, rawShippingFee]);

  const totals = useMemo(
    () =>
      calculateOrderTotals({
        subtotal,
        shippingFee: rawShippingFee,
        orderDiscountAmount: discountValidation.orderDiscountAmount,
        shippingDiscountAmount: discountValidation.shippingDiscountAmount,
      }),
    [subtotal, rawShippingFee, discountValidation]
  );

  // Mã đơn dự kiến để hiện trong QR chuyển khoản
  const previewOrderId = useMemo(() => generateOrderId(existingOrders), [existingOrders]);

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      showToast('Trình duyệt không hỗ trợ định vị GPS', 'error');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCustomerLat(Math.round(pos.coords.latitude * 100000) / 100000);
        setCustomerLng(Math.round(pos.coords.longitude * 100000) / 100000);
        setLocating(false);
        showToast('Đã cập nhật vị trí hiện tại của bạn');
      },
      () => {
        setLocating(false);
        showToast('Không lấy được vị trí GPS. Bạn hãy bấm trực tiếp lên bản đồ để ghim nhé.', 'info');
      },
      { enableHighAccuracy: true, timeout: 7000 }
    );
  };

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const res = validateAndCalculateDiscount(couponInput, discounts, subtotal, rawShippingFee);
    if (!res.valid) {
      setCouponError(res.error || 'Mã không hợp lệ');
      return;
    }
    setCouponError(null);
    setAppliedCode(couponInput.trim().toUpperCase());
    showToast(`Đã áp dụng mã ${couponInput.trim().toUpperCase()}`);
  };

  const validateStep = (targetStep: number): boolean => {
    setFormError(null);

    if (step === 2 || targetStep >= 3) {
      if (!customerName.trim()) {
        setFormError('Vui lòng nhập họ tên người nhận.');
        return false;
      }
      if (!isValidVNPhone(customerPhone)) {
        setFormError('Số điện thoại Việt Nam chưa hợp lệ (vd: 0912345678).');
        return false;
      }
      if (deliveryType === 'delivery' && !deliveryAddress.trim()) {
        setFormError('Vui lòng nhập địa chỉ giao hàng chi tiết.');
        return false;
      }
    }

    if ((step === 3 || targetStep >= 4) && deliveryType === 'delivery') {
      if (!selectedShipping || !selectedShipping.eligible) {
        setFormError('Hiện không có đơn vị vận chuyển phù hợp với khoảng cách của bạn.');
        return false;
      }
    }

    return true;
  };

  const handleNextStep = () => {
    if (!validateStep(step + 1)) return;
    if (step === 2 && deliveryType === 'pickup') {
      setStep(4); // Bỏ qua bước chọn đơn vị vận chuyển khi đến quán lấy
    } else {
      setStep((s) => Math.min(5, s + 1));
    }
  };

  const handlePrevStep = () => {
    setFormError(null);
    if (step === 4 && deliveryType === 'pickup') {
      setStep(2);
    } else {
      setStep((s) => Math.max(1, s - 1));
    }
  };

  const handlePlaceOrder = () => {
    if (!validateStep(5)) return;

    const orderId = generateOrderId(api.getOrders());
    const paymentStatus: PaymentStatus =
      paymentMethod === 'cod' ? 'unpaid' : simulatedPaid ? 'paid' : 'unpaid';

    const newOrder: Order = {
      order_id: orderId,
      created_at: new Date().toISOString(),
      user_id: user?.user_id,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      delivery_type: deliveryType,
      delivery_address:
        deliveryType === 'pickup'
          ? `Nhận tại quán (${formatStoreField(STORE_CONFIG.address)}, ${STORE_CONFIG.district_city})`
          : deliveryAddress.trim(),
      customer_lat: deliveryType === 'delivery' ? customerLat : null,
      customer_lng: deliveryType === 'delivery' ? customerLng : null,
      pickup_time: deliveryType === 'pickup' ? pickupTime : '',
      note: orderNote.trim(),
      subtotal: totals.subtotal,
      discount_code: discountValidation.valid ? appliedCode : '',
      discount_amount: totals.totalDiscount,
      shipping_provider_id: deliveryType === 'pickup' ? 'PICKUP' : selectedShipping!.provider.provider_id,
      shipping_provider_name:
        deliveryType === 'pickup' ? 'Đến quán lấy' : selectedShipping!.provider.name,
      shipping_fee: totals.shippingFee,
      total_amount: totals.totalAmount,
      payment_method: paymentMethod,
      payment_status: paymentStatus,
      status: 'Mới',
      tracking_code: '',
    };

    const orderItems: OrderItem[] = items.map((item, index) => ({
      order_item_id: `OI-${orderId}-${index + 1}`,
      order_id: orderId,
      product_id: item.product_id,
      product_name: item.name,
      item_type: item.item_type,
      size: item.size,
      sugar_level: item.sugar_level,
      ice_level: item.ice_level,
      toppings:
        item.item_type === 'combo'
          ? item.combo_items_summary || ''
          : item.toppings.map((t) => `${t.name} (+${formatVND(t.price)})`).join(', '),
      quantity: item.quantity,
      unit_price: item.unit_price,
      line_total: item.unit_price * item.quantity,
      note: item.note,
    }));

    api.createOrder(newOrder, orderItems);
    refreshDiscounts();
    clearCart();
    setCompletedOrder(newOrder);
    showToast(`Đặt hàng thành công! Mã đơn ${orderId}`);
  };

  // Màn hình xác nhận đặt hàng thành công
  if (completedOrder) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className="rounded-3xl bg-[#FFFDF8] border border-[#8A5036]/20 p-8 sm:p-10 text-center shadow-lg"
        >
          <div className="w-16 h-16 mx-auto rounded-full bg-[#FBDB93] text-[#5A2E1C] flex items-center justify-center mb-5">
            <CheckCircle2 className="w-9 h-9 text-[#914F1E]" />
          </div>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#C4535A]">
            Cảm ơn bạn đã chọn JeJi Coffee
          </p>
          <h1 className="mt-1 font-display text-3xl font-bold text-[#914F1E]">
            Đơn hàng đã được tiếp nhận
          </h1>
          <p className="mt-2 text-sm text-[#6F3F2A]">
            Quán sẽ xác nhận và bắt đầu pha chế ngay cho bạn.
          </p>

          <div className="mt-6 inline-flex items-center gap-3 px-5 py-3 rounded-2xl bg-[#8A5036] text-[#FBDB93]">
            <span className="text-xs uppercase tracking-wider opacity-85">Mã đơn hàng:</span>
            <span className="font-mono text-xl font-bold tracking-wider">
              {completedOrder.order_id}
            </span>
          </div>

          <div className="mt-8 text-left rounded-2xl bg-[#FFF4EA] border border-[#8A5036]/14 p-5 space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-[#6F3F2A]">Người nhận</span>
              <span className="font-semibold text-[#5A2E1C]">
                {completedOrder.customer_name} · {completedOrder.customer_phone}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[#6F3F2A] shrink-0">Hình thức</span>
              <span className="font-medium text-[#5A2E1C] text-right">
                {completedOrder.delivery_type === 'pickup'
                  ? `Đến quán lấy (${completedOrder.pickup_time})`
                  : `${completedOrder.shipping_provider_name} — ${completedOrder.delivery_address}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6F3F2A]">Thanh toán</span>
              <span className="font-medium text-[#5A2E1C]">
                {completedOrder.payment_method === 'cod'
                  ? 'Thanh toán khi nhận hàng (COD)'
                  : completedOrder.payment_method === 'bank_transfer'
                  ? 'Chuyển khoản ngân hàng'
                  : 'Ví điện tử'}{' '}
                ({completedOrder.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'})
              </span>
            </div>
            <div className="flex justify-between pt-2.5 border-t border-[#8A5036]/12 text-base font-bold">
              <span className="text-[#5A2E1C]">Tổng thanh toán</span>
              <span className="text-[#C4535A] tabular-nums">
                {formatVND(completedOrder.total_amount)}
              </span>
            </div>
            {user ? (
              <div className="pt-2 flex items-center justify-between text-xs text-[#5F8A56] font-semibold">
                <span>Điểm thưởng dự kiến khi đơn Hoàn thành</span>
                <span className="tabular-nums">
                  +{Math.floor(Math.max(0, completedOrder.total_amount) / 1000)} điểm JeJi
                </span>
              </div>
            ) : (
              <div className="pt-2.5 border-t border-[#8A5036]/12 flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[#6F3F2A]">
                  Bạn có thể nhận{' '}
                  <strong className="text-[#C4535A] tabular-nums">
                    +{Math.floor(Math.max(0, completedOrder.total_amount) / 1000)} điểm
                  </strong>{' '}
                  nếu đăng ký thành viên bằng SĐT {completedOrder.customer_phone}.
                </span>
                <button
                  type="button"
                  onClick={() => openAuthModal('register')}
                  className="font-bold text-[#C4535A] hover:underline"
                >
                  Đăng ký ngay
                </button>
              </div>
            )}
          </div>

          {completedOrder.payment_method === 'bank_transfer' &&
            completedOrder.payment_status === 'unpaid' &&
            STORE_CONFIG.bank_qr_image && (
              <div className="mt-6 rounded-2xl bg-[#FFF4EA] border border-[#EDB9B3] p-4 flex flex-col sm:flex-row items-center gap-4 text-left">
                <div className="w-32 aspect-[3/4] rounded-xl overflow-hidden border border-[#8A5036]/15 bg-white shrink-0">
                  <img
                    src={STORE_CONFIG.bank_qr_image}
                    alt="Mã QR chuyển khoản MB Bank JeJi Coffee"
                    className="w-full h-full object-cover scale-[1.15]"
                  />
                </div>
                <div className="text-xs text-[#5A2E1C] space-y-1 flex-1">
                  <p className="font-bold text-sm text-[#9B3922]">Quét mã QR để thanh toán đơn hàng</p>
                  <p>
                    Ngân hàng: <strong>{STORE_CONFIG.bank_name}</strong>
                  </p>
                  <p>
                    Số tài khoản: <strong className="font-mono">{STORE_CONFIG.bank_account_number}</strong> ·{' '}
                    <strong>{STORE_CONFIG.bank_account_name}</strong>
                  </p>
                  <p>
                    Số tiền:{' '}
                    <strong className="text-[#C4535A] tabular-nums">
                      {formatVND(completedOrder.total_amount)}
                    </strong>
                  </p>
                  <p>
                    Nội dung CK:{' '}
                    <strong className="font-mono bg-[#FBDB93] px-1.5 py-0.5 rounded">
                      {completedOrder.order_id}
                    </strong>
                  </p>
                </div>
              </div>
            )}

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(
                  `/theo-doi?orderId=${encodeURIComponent(completedOrder.order_id)}&phone=${encodeURIComponent(completedOrder.customer_phone)}`
                )
              }
              className="btn-rose-gradient px-6 py-3.5 rounded-xl font-semibold text-sm transition-all shadow-xs"
            >
              Theo dõi đơn hàng
            </button>
            <Link
              to="/thuc-don"
              className="px-6 py-3.5 rounded-xl border border-[#8A5036]/25 text-[#5A2E1C] hover:bg-[#FCE8D5] font-semibold text-sm transition-colors"
            >
              Tiếp tục xem thực đơn
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // Giỏ hàng trống
  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <h1 className="font-display text-3xl font-bold text-[#914F1E]">Giỏ hàng chưa có món</h1>
        <p className="mt-2 text-sm text-[#6F3F2A]">
          Hãy chọn đồ uống hoặc combo từ thực đơn trước khi tiến hành thanh toán nhé.
        </p>
        <Link
          to="/thuc-don"
          className="btn-rose-gradient mt-6 inline-block px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-xs"
        >
          Đi tới thực đơn
        </Link>
      </div>
    );
  }

  const hasBankConfig = !formatStoreField(STORE_CONFIG.bank_account_number).includes('Đang cập nhật');

  return (
    <div className="pb-16">
      <section className="bg-[#8A5036] text-[#FFF4EA] py-8 px-4 sm:px-6 border-b border-[#FBDB93]/20">
        <div className="max-w-7xl mx-auto">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#FBDB93]">
            Thanh toán đơn hàng
          </h1>

          {/* Thanh tiến trình 5 bước */}
          <div className="mt-5 flex items-center gap-2 overflow-x-auto pb-1">
            {STEPS.map((s, idx) => {
              const skipped = deliveryType === 'pickup' && s.id === 3;
              const active = step === s.id;
              const done = step > s.id;
              return (
                <React.Fragment key={s.id}>
                  <button
                    type="button"
                    disabled={skipped || s.id > step}
                    onClick={() => s.id < step && setStep(s.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                      skipped
                        ? 'opacity-35 cursor-not-allowed text-[#FFF4EA]/60'
                        : active
                        ? 'bg-[#FBDB93] text-[#5A2E1C]'
                        : done
                        ? 'bg-[#C4535A] text-white'
                        : 'bg-white/15 text-[#FFF4EA]/85'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center tabular-nums ${
                        active
                          ? 'bg-[#5A2E1C]/15 text-[#5A2E1C]'
                          : 'bg-white/20 text-current'
                      }`}
                    >
                      {done ? <Check className="w-3 h-3" /> : s.id}
                    </span>
                    <span>{s.label}</span>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <span className="w-4 h-px bg-[#FBDB93]/30 shrink-0" aria-hidden="true" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cột trái: Các bước nhập liệu */}
        <div className="lg:col-span-7 rounded-3xl bg-[#FFFDF8] border border-[#8A5036]/15 p-6 sm:p-8 space-y-6">
          {formError && (
            <div className="p-3.5 rounded-xl bg-[#AA2B1D]/10 border border-[#AA2B1D]/30 text-sm text-[#AA2B1D] font-medium">
              {formError}
            </div>
          )}

          {/* BƯỚC 1: HÌNH THỨC NHẬN HÀNG */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="font-display text-xl font-bold text-[#914F1E]">
                1. Chọn hình thức nhận hàng
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setDeliveryType('delivery')}
                  className={`p-5 rounded-2xl border text-left transition-all ${
                    deliveryType === 'delivery'
                      ? 'bg-[#FCE8D5] border-[#8A5036] shadow-xs'
                      : 'bg-[#FFF4EA] border-[#8A5036]/15 hover:border-[#8A5036]/40'
                  }`}
                >
                  <Truck className="w-6 h-6 text-[#914F1E] mb-3" />
                  <h3 className="font-bold text-base text-[#5A2E1C]">Giao tận nơi</h3>
                  <p className="mt-1 text-xs text-[#6F3F2A] leading-relaxed">
                    Ghim vị trí trên bản đồ, tự động tính cước phí chính xác theo khoảng cách từ quán.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryType('pickup')}
                  className={`p-5 rounded-2xl border text-left transition-all ${
                    deliveryType === 'pickup'
                      ? 'bg-[#FCE8D5] border-[#8A5036] shadow-xs'
                      : 'bg-[#FFF4EA] border-[#8A5036]/15 hover:border-[#8A5036]/40'
                  }`}
                >
                  <Store className="w-6 h-6 text-[#C4535A] mb-3" />
                  <h3 className="font-bold text-base text-[#5A2E1C]">Đến quán lấy</h3>
                  <p className="mt-1 text-xs text-[#6F3F2A] leading-relaxed">
                    Miễn phí vận chuyển 0đ. Đặt trước và ghé quầy nhận ngay không cần chờ đợi.
                  </p>
                </button>
              </div>

              {deliveryType === 'pickup' && (
                <div className="pt-2">
                  <label className="block text-sm font-semibold text-[#5A2E1C] mb-2">
                    Chọn khung giờ dự kiến ghé lấy
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {['Trong 15 phút tới', 'Trong 20 phút tới', 'Trong 30 phút tới', 'Sau 1 giờ'].map(
                      (slot) => (
                        <button
                          key={slot}
                          type="button"
                          onClick={() => setPickupTime(slot)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-colors ${
                            pickupTime === slot
                              ? 'bg-[#8A5036] text-[#FBDB93] border-[#8A5036]'
                              : 'bg-[#FFF4EA] text-[#5A2E1C] border-[#8A5036]/20'
                          }`}
                        >
                          <Clock className="w-3.5 h-3.5 inline mr-1.5" />
                          {slot}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* BƯỚC 2: THÔNG TIN NGƯỜI NHẬN & BẢN ĐỒ */}
          {step === 2 && (
            <div className="space-y-5">
              <h2 className="font-display text-xl font-bold text-[#914F1E]">
                2. Thông tin người nhận
              </h2>

              {/* Chọn nhanh từ sổ địa chỉ nếu đã đăng nhập */}
              {user && user.addresses.length > 0 && (
                <div className="p-4 rounded-2xl bg-[#FFF4EA] border border-[#EDB9B3] space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-[#5A2E1C]">
                      Chọn nhanh từ sổ địa chỉ đã lưu
                    </span>
                    <Link
                      to="/tai-khoan?tab=addresses"
                      className="text-[11px] font-semibold text-[#C4535A] hover:underline"
                    >
                      Quản lý địa chỉ
                    </Link>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {user.addresses.map((addr) => {
                      const isCurrent = deliveryAddress.trim() === addr.full_address.trim();
                      return (
                        <button
                          key={addr.address_id}
                          type="button"
                          onClick={() => {
                            setCustomerName(addr.recipient_name);
                            setCustomerPhone(addr.phone);
                            setDeliveryAddress(addr.full_address);
                            if (addr.lat !== null && addr.lng !== null) {
                              setCustomerLat(addr.lat);
                              setCustomerLng(addr.lng);
                            }
                            showToast(`Đã điền địa chỉ "${addr.label}"`);
                          }}
                          className={`px-3 py-2 rounded-xl text-xs font-semibold border text-left transition-colors ${
                            isCurrent
                              ? 'bg-[#8A5036] text-[#FBDB93] border-[#8A5036]'
                              : 'bg-white text-[#5A2E1C] border-[#8A5036]/20 hover:bg-[#FCE8D5]'
                          }`}
                        >
                          {addr.label}: {addr.full_address.slice(0, 32)}
                          {addr.full_address.length > 32 ? '...' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="chk-name" className="block text-xs font-semibold text-[#5A2E1C] mb-1.5">
                    Họ và tên *
                  </label>
                  <input
                    id="chk-name"
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/20 text-sm text-[#5A2E1C] focus:outline-none focus:border-[#8A5036]"
                  />
                </div>
                <div>
                  <label htmlFor="chk-phone" className="block text-xs font-semibold text-[#5A2E1C] mb-1.5">
                    Số điện thoại *
                  </label>
                  <input
                    id="chk-phone"
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="0912345678"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/20 text-sm text-[#5A2E1C] tabular-nums focus:outline-none focus:border-[#8A5036]"
                  />
                </div>
              </div>

              {deliveryType === 'delivery' && (
                <>
                  <div>
                    <label htmlFor="chk-address" className="block text-xs font-semibold text-[#5A2E1C] mb-1.5">
                      Địa chỉ giao hàng chi tiết *
                    </label>
                    <input
                      id="chk-address"
                      type="text"
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Số nhà, ngõ/đường, phường/xã tại Vĩnh Yên..."
                      className="w-full px-4 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/20 text-sm text-[#5A2E1C] focus:outline-none focus:border-[#8A5036]"
                    />
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-xs font-semibold text-[#5A2E1C]">
                          Ghim vị trí giao hàng trên bản đồ
                        </p>
                        <p className="text-xs text-[#6F3F2A]">
                          Khoảng cách ước tính từ quán:{' '}
                          <strong className="text-[#C4535A] tabular-nums">
                            {distanceKm.toFixed(2)} km
                          </strong>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleGeolocation}
                        disabled={locating}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#8A5036] text-[#FBDB93] text-xs font-semibold hover:bg-[#6F3F2A] transition-colors"
                      >
                        <Crosshair className="w-3.5 h-3.5" />
                        <span>{locating ? 'Đang định vị...' : 'Lấy vị trí hiện tại'}</span>
                      </button>
                    </div>

                    <LeafletMapPicker
                      centerLat={customerLat}
                      centerLng={customerLng}
                      markerLat={customerLat}
                      markerLng={customerLng}
                      storeLat={STORE_CONFIG.lat}
                      storeLng={STORE_CONFIG.lng}
                      interactive={true}
                      heightClass="h-60"
                      onLocationChange={(lat, lng) => {
                        setCustomerLat(lat);
                        setCustomerLng(lng);
                      }}
                    />
                    <p className="text-[11px] text-[#6F3F2A]">
                      Bấm lên bản đồ hoặc kéo biểu tượng đỏ để chọn đúng vị trí giao hàng (tọa độ:{' '}
                      <span className="font-mono">{customerLat}, {customerLng}</span>).
                    </p>
                  </div>
                </>
              )}

              <div>
                <label htmlFor="chk-note" className="block text-xs font-semibold text-[#5A2E1C] mb-1.5">
                  Ghi chú cho đơn hàng / shipper
                </label>
                <textarea
                  id="chk-note"
                  rows={2}
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Ví dụ: Gọi khi tới cổng, gửi bảo vệ..."
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/20 text-sm text-[#5A2E1C] focus:outline-none focus:border-[#8A5036]"
                />
              </div>
            </div>
          )}

          {/* BƯỚC 3: ĐƠN VỊ VẬN CHUYỂN */}
          {step === 3 && deliveryType === 'delivery' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-display text-xl font-bold text-[#914F1E]">
                  3. Chọn đơn vị vận chuyển
                </h2>
                <span className="text-xs font-semibold text-[#914F1E] tabular-nums">
                  Khoảng cách: {distanceKm.toFixed(2)} km
                </span>
              </div>

              <div className="space-y-3">
                {shippingOptions.map((opt) => {
                  const isSelected = selectedShipping?.provider.provider_id === opt.provider.provider_id;
                  return (
                    <button
                      key={opt.provider.provider_id}
                      type="button"
                      disabled={!opt.eligible}
                      onClick={() => setSelectedProviderId(opt.provider.provider_id)}
                      className={`w-full p-4 rounded-2xl border text-left transition-all flex items-start justify-between gap-4 ${
                        !opt.eligible
                          ? 'opacity-55 bg-[#FFF4EA] border-[#8A5036]/10 cursor-not-allowed'
                          : isSelected
                          ? 'bg-[#FCE8D5] border-[#8A5036] shadow-xs'
                          : 'bg-[#FFF4EA] border-[#8A5036]/15 hover:border-[#8A5036]/40'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-[#5A2E1C]">
                            {opt.provider.name}
                          </span>
                          <span className="text-xs text-[#6F3F2A]">
                            · {formatETA(opt.provider.eta_minutes)}
                          </span>
                        </div>
                        <p className="text-xs text-[#6F3F2A]">{opt.provider.description}</p>
                        {!opt.eligible && opt.reason && (
                          <p className="text-xs font-semibold text-[#AA2B1D]">{opt.reason}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-sm font-bold text-[#5A2E1C] tabular-nums">
                          {opt.eligible ? formatVND(opt.fee) : '—'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* BƯỚC 4: PHƯƠNG THỨC THANH TOÁN */}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="font-display text-xl font-bold text-[#914F1E]">
                4. Phương thức thanh toán
              </h2>

              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentMethod('cod');
                    setSimulatedPaid(false);
                  }}
                  className={`w-full p-4 rounded-2xl border text-left flex items-center gap-3.5 transition-colors ${
                    paymentMethod === 'cod'
                      ? 'bg-[#FCE8D5] border-[#8A5036]'
                      : 'bg-[#FFF4EA] border-[#8A5036]/15'
                  }`}
                >
                  <Wallet className="w-5 h-5 text-[#914F1E] shrink-0" />
                  <div>
                    <p className="font-bold text-sm text-[#5A2E1C]">
                      Thanh toán khi nhận hàng (COD)
                    </p>
                    <p className="text-xs text-[#6F3F2A]">
                      Trả tiền mặt trực tiếp cho nhân viên giao hàng hoặc tại quầy.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('bank_transfer')}
                  className={`w-full p-4 rounded-2xl border text-left flex items-center gap-3.5 transition-colors ${
                    paymentMethod === 'bank_transfer'
                      ? 'bg-[#FCE8D5] border-[#8A5036]'
                      : 'bg-[#FFF4EA] border-[#8A5036]/15'
                  }`}
                >
                  <QrCode className="w-5 h-5 text-[#914F1E] shrink-0" />
                  <div>
                    <p className="font-bold text-sm text-[#5A2E1C]">
                      Chuyển khoản ngân hàng (VietQR)
                    </p>
                    <p className="text-xs text-[#6F3F2A]">
                      Quét mã QR với nội dung chuyển khoản tự động bằng mã đơn hàng.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('ewallet')}
                  className={`w-full p-4 rounded-2xl border text-left flex items-center gap-3.5 transition-colors ${
                    paymentMethod === 'ewallet'
                      ? 'bg-[#FCE8D5] border-[#8A5036]'
                      : 'bg-[#FFF4EA] border-[#8A5036]/15'
                  }`}
                >
                  <Smartphone className="w-5 h-5 text-[#914F1E] shrink-0" />
                  <div>
                    <p className="font-bold text-sm text-[#5A2E1C]">Ví điện tử (MoMo / ZaloPay)</p>
                    <p className="text-xs text-[#6F3F2A]">
                      Giao diện xác nhận ví điện tử nhanh (mô phỏng giai đoạn 1).
                    </p>
                  </div>
                </button>
              </div>

              {/* Khối VietQR dùng ảnh QR chuyển khoản thật */}
              {paymentMethod === 'bank_transfer' && (
                <div className="p-5 rounded-2xl bg-[#FFF4EA] border border-[#8A5036]/20 flex flex-col sm:flex-row gap-5 items-center">
                  {/* Ảnh mã QR người dùng cung cấp */}
                  <div className="w-48 sm:w-52 rounded-2xl bg-white p-1.5 border border-[#8A5036]/15 shrink-0 overflow-hidden shadow-xs">
                    <img
                      src={STORE_CONFIG.bank_qr_image || '/assets/aistudio/qr_b54590da.jpg'}
                      alt="Mã QR chuyển khoản MB Bank - TRAN THI NGAN"
                      className="w-full h-auto rounded-xl object-contain"
                    />
                  </div>
                  <div className="space-y-2 text-xs text-[#5A2E1C] flex-1 w-full">
                    <p className="font-bold text-sm text-[#9B3922]">Thông tin chuyển khoản JeJi</p>
                    <p>
                      Ngân hàng: <strong>{formatStoreField(STORE_CONFIG.bank_name)}</strong>
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span>
                        Số tài khoản:{' '}
                        <strong className="font-mono">
                          {hasBankConfig ? STORE_CONFIG.bank_account_number : 'Đang cập nhật'}
                        </strong>
                      </span>
                      {hasBankConfig && (
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(STORE_CONFIG.bank_account_number).catch(() => {});
                            showToast(`Đã sao chép STK ${STORE_CONFIG.bank_account_number}`);
                          }}
                          className="px-2 py-0.5 rounded-lg bg-[#FCE8D5] hover:bg-[#F9D5D3] border border-[#EDB9B3] text-[11px] font-semibold text-[#7A3B26]"
                        >
                          Sao chép STK
                        </button>
                      )}
                    </div>
                    <p>
                      Chủ tài khoản: <strong>{formatStoreField(STORE_CONFIG.bank_account_name)}</strong>
                    </p>
                    <p>
                      Số tiền:{' '}
                      <strong className="text-[#C4535A] tabular-nums">
                        {formatVND(totals.totalAmount)}
                      </strong>
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <span>
                        Nội dung CK:{' '}
                        <strong className="font-mono bg-[#FBDB93] text-[#5A2E1C] px-1.5 py-0.5 rounded">
                          {previewOrderId}
                        </strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(previewOrderId).catch(() => {});
                          showToast(`Đã sao chép nội dung ${previewOrderId}`);
                        }}
                        className="px-2 py-0.5 rounded-lg bg-[#FCE8D5] hover:bg-[#F9D5D3] border border-[#EDB9B3] text-[11px] font-semibold text-[#7A3B26]"
                      >
                        Sao chép mã
                      </button>
                    </div>
                    <label className="pt-2 flex items-center gap-2 cursor-pointer font-medium">
                      <input
                        type="checkbox"
                        checked={simulatedPaid}
                        onChange={(e) => setSimulatedPaid(e.target.checked)}
                        className="accent-[#D4606A]"
                      />
                      <span>Tôi đã chuyển khoản xong (đánh dấu đã thanh toán)</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Khối Ví điện tử giả lập */}
              {paymentMethod === 'ewallet' && (
                <div className="p-5 rounded-2xl bg-[#FFF4EA] border border-[#8A5036]/20 space-y-3 text-sm">
                  <div className="flex items-center gap-2 font-semibold text-[#5A2E1C]">
                    <CreditCard className="w-4 h-4 text-[#914F1E]" />
                    <span>Cổng ví điện tử (Mô phỏng giai đoạn 1)</span>
                  </div>
                  <p className="text-xs text-[#6F3F2A]">
                    Số tiền cần thanh toán: <strong className="text-[#C4535A]">{formatVND(totals.totalAmount)}</strong>
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSimulatedPaid(true);
                      showToast('Đã xác nhận thanh toán qua ví điện tử (mô phỏng)');
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      simulatedPaid
                        ? 'bg-[#5F8A56] text-[#FFF4EA]'
                        : 'bg-[#8A5036] text-[#FBDB93] hover:bg-[#6F3F2A]'
                    }`}
                  >
                    {simulatedPaid ? 'Đã xác nhận thanh toán ví điện tử' : 'Xác nhận thanh toán ngay'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* BƯỚC 5: XEM LẠI & XÁC NHẬN */}
          {step === 5 && (
            <div className="space-y-5">
              <h2 className="font-display text-xl font-bold text-[#914F1E]">
                5. Kiểm tra lại thông tin đặt hàng
              </h2>

              <div className="rounded-2xl bg-[#FFF4EA] border border-[#8A5036]/15 p-5 space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-[#914F1E] mt-0.5 shrink-0" />
                  <div>
                    <p className="font-semibold text-[#5A2E1C]">
                      {customerName} · {customerPhone}
                    </p>
                    <p className="text-xs text-[#6F3F2A] mt-0.5">
                      {deliveryType === 'pickup'
                        ? `Đến quán lấy (${pickupTime})`
                        : deliveryAddress}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-[#8A5036]/10">
                  <Truck className="w-4 h-4 text-[#914F1E] shrink-0" />
                  <p className="text-xs text-[#5A2E1C]">
                    {deliveryType === 'pickup'
                      ? 'Nhận trực tiếp tại quầy JeJi Coffee (0đ)'
                      : `${selectedShipping?.provider.name} (${formatVND(totals.shippingFee)})`}
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-2 border-t border-[#8A5036]/10">
                  <ShieldCheck className="w-4 h-4 text-[#914F1E] shrink-0" />
                  <p className="text-xs text-[#5A2E1C]">
                    {paymentMethod === 'cod'
                      ? 'Thanh toán khi nhận hàng (COD)'
                      : paymentMethod === 'bank_transfer'
                      ? `Chuyển khoản VietQR (${simulatedPaid ? 'Đã thanh toán' : 'Chưa thanh toán'})`
                      : `Ví điện tử (${simulatedPaid ? 'Đã thanh toán' : 'Chưa thanh toán'})`}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Điều hướng bước */}
          <div className="pt-4 border-t border-[#8A5036]/12 flex items-center justify-between gap-3">
            {step > 1 ? (
              <button
                type="button"
                onClick={handlePrevStep}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[#8A5036]/25 text-[#5A2E1C] text-sm font-semibold hover:bg-[#FCE8D5] transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Quay lại
              </button>
            ) : (
              <Link
                to="/thuc-don"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#6F3F2A] hover:text-[#5A2E1C]"
              >
                <ArrowLeft className="w-4 h-4" />
                Thêm món khác
              </Link>
            )}

            {step < 5 ? (
              <button
                type="button"
                onClick={handleNextStep}
                className="btn-rose-gradient inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-xs"
              >
                <span>Tiếp tục</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePlaceOrder}
                className="btn-rose-gradient inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold transition-all shadow-sm"
              >
                <span>Đặt hàng · {formatVND(totals.totalAmount)}</span>
              </button>
            )}
          </div>
        </div>

        {/* Cột phải: Tóm tắt đơn hàng */}
        <aside className="lg:col-span-5 rounded-3xl bg-[#FFFDF8] border border-[#8A5036]/15 p-6 space-y-5 lg:sticky lg:top-28">
          <h2 className="font-display text-lg font-bold text-[#914F1E]">
            Tóm tắt đơn ({items.reduce((s, i) => s + i.quantity, 0)} món)
          </h2>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {items.map((item) => (
              <div key={item.cart_item_id} className="flex items-start gap-3 text-sm">
                <ProductImage
                  src={item.image_url}
                  alt={item.name}
                  productId={item.product_id}
                  category={item.category}
                  size="sm"
                  className="w-12 h-12 rounded-xl shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#5A2E1C] truncate">
                    {item.quantity}× {item.name}
                  </p>
                  <p className="text-xs text-[#6F3F2A]">
                    {item.item_type === 'combo'
                      ? item.combo_items_summary
                      : `${item.size !== 'Tiêu chuẩn' ? `Size ${item.size}` : 'Tiêu chuẩn'}${
                          item.toppings.length > 0
                            ? ` · +${item.toppings.map((t) => t.name).join(', ')}`
                            : ''
                        }`}
                  </p>
                </div>
                <span className="font-semibold text-[#5A2E1C] tabular-nums shrink-0">
                  {formatVND(item.unit_price * item.quantity)}
                </span>
              </div>
            ))}
          </div>

          {/* Mã giảm giá */}
          <form onSubmit={handleApplyCoupon} className="pt-3 border-t border-[#8A5036]/10 space-y-1.5">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Tag className="w-3.5 h-3.5 text-[#914F1E] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={couponInput}
                  onChange={(e) => {
                    setCouponInput(e.target.value.toUpperCase());
                    setCouponError(null);
                  }}
                  placeholder="Mã ưu đãi..."
                  className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/20 text-xs text-[#5A2E1C] font-mono uppercase focus:outline-none focus:border-[#8A5036]"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-2 rounded-xl bg-[#8A5036] hover:bg-[#6F3F2A] text-[#FBDB93] text-xs font-semibold transition-colors"
              >
                Áp dụng
              </button>
            </div>
            {couponError && <p className="text-xs text-[#AA2B1D]">{couponError}</p>}
            {user?.welcome_code && appliedCode !== user.welcome_code && (
              <button
                type="button"
                onClick={() => {
                  setCouponInput(user.welcome_code!);
                  const res = validateAndCalculateDiscount(
                    user.welcome_code!,
                    discounts,
                    subtotal,
                    rawShippingFee
                  );
                  if (!res.valid) {
                    setCouponError(res.error || 'Mã chưa đủ điều kiện');
                  } else {
                    setCouponError(null);
                    setAppliedCode(user.welcome_code!);
                    showToast(`Đã áp dụng mã chào mừng ${user.welcome_code}`);
                  }
                }}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#C4535A] hover:underline pt-1"
              >
                <Gift className="w-3.5 h-3.5" />
                <span>Dùng mã chào mừng {user.welcome_code} (-10%)</span>
              </button>
            )}
          </form>

          {/* Tổng tiền */}
          <div className="pt-3 border-t border-[#8A5036]/12 space-y-2 text-sm">
            <div className="flex justify-between text-[#6F3F2A]">
              <span>Tạm tính</span>
              <span className="tabular-nums font-medium text-[#5A2E1C]">{formatVND(totals.subtotal)}</span>
            </div>
            <div className="flex justify-between text-[#6F3F2A]">
              <span>Phí vận chuyển</span>
              <span className="tabular-nums font-medium text-[#5A2E1C]">
                {deliveryType === 'pickup' ? '0đ' : formatVND(totals.shippingFee)}
              </span>
            </div>
            {totals.totalDiscount > 0 && (
              <div className="flex justify-between text-[#C4535A]">
                <span>Giảm giá ({appliedCode})</span>
                <span className="tabular-nums font-semibold">-{formatVND(totals.totalDiscount)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold text-[#5A2E1C] pt-2 border-t border-[#8A5036]/12">
              <span>Tổng thanh toán</span>
              <span className="text-[#C4535A] tabular-nums">{formatVND(totals.totalAmount)}</span>
            </div>

            {user ? (
              <div className="mt-2 p-3 rounded-2xl bg-[#FCE8D5]/75 border border-[#EDB9B3] flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-[#5A2E1C]">
                  <Award className="w-4 h-4 text-[#C4535A]" />
                  Điểm tích lũy khi Hoàn thành
                </span>
                <span className="font-bold text-[#C4535A] tabular-nums">
                  +{Math.floor(Math.max(0, totals.totalAmount) / 1000)} điểm
                </span>
              </div>
            ) : (
              <div
                className="mt-2 p-3.5 rounded-2xl border border-[#EDB9B3] space-y-2"
                style={{ background: 'linear-gradient(135deg, #F9D5D3 0%, #FCE8D5 100%)' }}
              >
                <p className="text-xs font-semibold text-[#5A2E1C] leading-relaxed">
                  Đăng ký hoặc đăng nhập để tích{' '}
                  <strong className="text-[#C4535A] tabular-nums">
                    +{Math.floor(Math.max(0, totals.totalAmount) / 1000)} điểm
                  </strong>{' '}
                  từ đơn này (1 điểm / 1.000đ) và nhận mã giảm 10%.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openAuthModal('register')}
                    className="btn-rose-gradient px-3 py-1.5 rounded-xl text-[11px] font-semibold"
                  >
                    Đăng ký tích điểm
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthModal('login')}
                    className="px-3 py-1.5 rounded-xl bg-white/85 border border-[#8A5036]/20 text-[#5A2E1C] text-[11px] font-semibold"
                  >
                    Đã có tài khoản
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
