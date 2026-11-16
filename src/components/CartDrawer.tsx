import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Edit3, Minus, Plus, ShoppingBag, Tag, Trash2, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCart } from '../hooks/useCart';
import { useToast } from '../hooks/useToast';
import { api } from '../services/api';
import { CartItem, Product } from '../types';
import { isDiscountCurrentlyValid, validateAndCalculateDiscount } from '../utils/discount';
import { formatVND } from '../utils/format';
import { ProductImage } from './ProductImage';
import { ProductModal } from './ProductModal';

export const CartDrawer: React.FC = () => {
  const {
    items,
    isDrawerOpen,
    closeDrawer,
    appliedCode,
    setAppliedCode,
    discounts,
    updateQuantity,
    removeItem,
    subtotal,
    discountResult,
  } = useCart();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [couponInput, setCouponInput] = useState(appliedCode);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<CartItem | null>(null);

  const products = useMemo(() => api.getProducts(), []);

  useEffect(() => {
    setCouponInput(appliedCode);
  }, [appliedCode]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen && !editingItem) {
        closeDrawer();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isDrawerOpen, editingItem, closeDrawer]);

  const validDiscounts = useMemo(
    () =>
      discounts
        .filter((d) => isDiscountCurrentlyValid(d))
        .sort((a, b) => a.min_order - b.min_order),
    [discounts]
  );

  const nextMilestone = useMemo(() => {
    const target = validDiscounts.find((d) => subtotal < d.min_order);
    if (target) {
      return {
        code: target.code,
        minOrder: target.min_order,
        remaining: target.min_order - subtotal,
        progress: Math.min(100, Math.round((subtotal / target.min_order) * 100)),
        label:
          target.type === 'freeship'
            ? `hỗ trợ phí giao hàng (${target.code})`
            : `áp dụng mã giảm ${target.code}`,
      };
    }
    return null;
  }, [validDiscounts, subtotal]);

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    const res = validateAndCalculateDiscount(couponInput, discounts, subtotal, 15000);
    if (!res.valid) {
      setCouponError(res.error || 'Mã giảm giá không hợp lệ.');
      return;
    }
    setCouponError(null);
    setAppliedCode(couponInput.trim().toUpperCase());
    showToast(`Đã áp dụng mã ${couponInput.trim().toUpperCase()}`);
  };

  const handleRemoveCoupon = () => {
    setAppliedCode('');
    setCouponInput('');
    setCouponError(null);
  };

  const handleGoToCheckout = () => {
    closeDrawer();
    navigate('/thanh-toan');
  };

  const editingProduct: Product | null = editingItem
    ? products.find((p) => p.product_id === editingItem.product_id) || null
    : null;

  const estimatedTotal = Math.max(0, subtotal - discountResult.orderDiscountAmount);

  return (
    <>
      <AnimatePresence>
        {isDrawerOpen && (
          <div
            className="fixed inset-0 z-50 flex justify-end"
            role="dialog"
            aria-modal="true"
            aria-label="Giỏ hàng của bạn"
          >
            {/* Nền phủ nâu sữa dịu */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDrawer}
              className="fixed inset-0 bg-[#8A5036]/45 backdrop-blur-xs"
            />

            {/* Khung drawer bên phải */}
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              className="relative z-10 w-full max-w-md bg-[#FFF4EA] h-full flex flex-col shadow-2xl border-l border-[#8A5036]/15"
            >
              {/* Header drawer */}
              <div className="px-6 py-4 bg-[#8A5036] text-[#FFF4EA] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className="w-5 h-5 text-[#FBDB93]" />
                  <h2 className="font-display text-lg font-bold text-[#FBDB93]">Giỏ hàng JeJi</h2>
                </div>
                <button
                  type="button"
                  onClick={closeDrawer}
                  aria-label="Đóng giỏ hàng"
                  className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Thanh tiến trình FREESHIP gradient #F2A7A7 → #D4606A */}
              {items.length > 0 && (
                <div className="px-6 py-3 bg-[#FBE3E0] border-b border-[#8A5036]/12">
                  {nextMilestone ? (
                    <div className="space-y-1.5">
                      <p className="text-xs text-[#5A2E1C] font-medium">
                        Mua thêm{' '}
                        <span className="font-bold text-[#C4535A] tabular-nums">
                          {formatVND(nextMilestone.remaining)}
                        </span>{' '}
                        để đủ điều kiện {nextMilestone.label}
                      </p>
                      <div className="h-2 w-full rounded-full bg-white/80 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${nextMilestone.progress}%`,
                            background: 'linear-gradient(90deg, #F2A7A7, #D4606A)',
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-[#5A2E1C]">
                        Đơn hàng của bạn đã đủ điều kiện dùng mã ưu đãi tốt nhất tại JeJi.
                      </p>
                      <div className="h-2 w-full rounded-full bg-white/80 overflow-hidden">
                        <div
                          className="h-full w-full rounded-full"
                          style={{
                            background: 'linear-gradient(90deg, #F2A7A7, #D4606A)',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Danh sách món */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3.5">
                {items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-12">
                    <div className="w-20 h-20 rounded-full bg-[#F9D5D3]/60 flex items-center justify-center mb-4">
                      <ShoppingBag className="w-9 h-9 text-[#C4535A]" />
                    </div>
                    <h3 className="font-display text-lg font-bold text-[#5A2E1C]">
                      Giỏ hàng đang trống
                    </h3>
                    <p className="mt-1.5 text-sm text-[#6F3F2A] max-w-xs">
                      Hãy chọn một ly Cà phê muối Jeji hoặc Trà đào cam sả để bắt đầu khoảnh khắc
                      của bạn.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        closeDrawer();
                        navigate('/thuc-don');
                      }}
                      className="mt-5 px-5 py-2.5 rounded-xl btn-rose-gradient text-sm font-semibold transition-all"
                    >
                      Khám phá thực đơn
                    </button>
                  </div>
                ) : (
                  items.map((item) => (
                    <div
                      key={item.cart_item_id}
                      className="p-3.5 rounded-2xl bg-white/85 border border-[#8A5036]/15 flex gap-3.5"
                    >
                      <ProductImage
                        src={item.image_url}
                        alt={item.name}
                        productId={item.product_id}
                        category={item.category}
                        size="sm"
                        className="w-16 h-16 rounded-xl shrink-0"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-sm text-[#5A2E1C] leading-snug">
                            {item.name}
                          </h4>
                          <button
                            type="button"
                            onClick={() => removeItem(item.cart_item_id)}
                            aria-label={`Xóa ${item.name}`}
                            className="p-1 text-[#6F3F2A] hover:text-[#B8434A] transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Tùy chọn của món */}
                        <div className="mt-1 text-xs text-[#6F3F2A] space-y-0.5">
                          {item.item_type === 'combo' ? (
                            <p>{item.combo_items_summary}</p>
                          ) : (
                            <p>
                              {item.size !== 'Tiêu chuẩn' ? `Size ${item.size}` : 'Tiêu chuẩn'}
                              {item.category !== 'Bánh' &&
                                ` · Đường ${item.sugar_level} · Đá: ${item.ice_level}`}
                            </p>
                          )}
                          {item.toppings.length > 0 && (
                            <p className="text-[#914F1E] font-medium">
                              + {item.toppings.map((t) => t.name).join(', ')}
                            </p>
                          )}
                          {item.note && (
                            <p className="italic text-[#6F3F2A]/90">Ghi chú: {item.note}</p>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center bg-[#FFF4EA] border border-[#8A5036]/20 rounded-lg">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.cart_item_id, -1)}
                                aria-label="Giảm số lượng"
                                className="w-7 h-7 flex items-center justify-center text-[#5A2E1C] hover:bg-[#8A5036]/10 rounded-l-lg"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="w-7 text-center text-xs font-bold text-[#5A2E1C] tabular-nums">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.cart_item_id, 1)}
                                aria-label="Tăng số lượng"
                                className="w-7 h-7 flex items-center justify-center text-[#5A2E1C] hover:bg-[#8A5036]/10 rounded-r-lg"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {item.item_type === 'product' && (
                              <button
                                type="button"
                                onClick={() => setEditingItem(item)}
                                className="inline-flex items-center gap-1 text-xs text-[#914F1E] hover:underline font-medium"
                              >
                                <Edit3 className="w-3 h-3" />
                                Sửa
                              </button>
                            )}
                          </div>

                          <span className="text-sm font-bold text-[#5A2E1C] tabular-nums">
                            {formatVND(item.unit_price * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Chân drawer: Mã giảm giá + Tổng + Thanh toán */}
              {items.length > 0 && (
                <div className="p-6 bg-[#FCE8D5]/65 border-t border-[#8A5036]/15 space-y-4">
                  {/* Ô nhập mã giảm giá */}
                  <form onSubmit={handleApplyCoupon} className="space-y-1.5">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Tag className="w-4 h-4 text-[#914F1E] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => {
                            setCouponInput(e.target.value.toUpperCase());
                            setCouponError(null);
                          }}
                          placeholder="Nhập mã (vd: JEJI10, FREESHIP)"
                          aria-label="Mã giảm giá"
                          className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[#8A5036]/20 text-xs font-mono uppercase text-[#5A2E1C] placeholder:normal-case placeholder:font-sans focus:outline-none focus:border-[#8A5036]"
                        />
                      </div>
                      {appliedCode ? (
                        <button
                          type="button"
                          onClick={handleRemoveCoupon}
                          className="px-3.5 py-2 rounded-xl border border-[#B8434A]/35 text-[#B8434A] text-xs font-semibold hover:bg-[#D4606A]/10 whitespace-nowrap"
                        >
                          Bỏ mã
                        </button>
                      ) : (
                        <button
                          type="submit"
                          className="px-4 py-2 rounded-xl bg-[#8A5036] text-[#FBDB93] text-xs font-semibold hover:bg-[#6F3F2A] whitespace-nowrap"
                        >
                          Áp dụng
                        </button>
                      )}
                    </div>
                    {couponError && (
                      <p className="text-xs text-[#AA2B1D] font-medium">{couponError}</p>
                    )}
                    {appliedCode && discountResult.valid && (
                      <p className="text-xs text-[#5F8A56] font-semibold">
                        Đang áp dụng mã <span className="font-mono font-bold">{appliedCode}</span>:{' '}
                        {discountResult.discount?.type === 'freeship'
                          ? `Hỗ trợ ship tối đa ${formatVND(discountResult.discount.max_discount)} khi chọn đơn vị vận chuyển`
                          : `Giảm ${formatVND(discountResult.orderDiscountAmount)}`}
                      </p>
                    )}
                  </form>

                  {/* Bảng tính tiền */}
                  <div className="space-y-1.5 text-sm border-t border-[#8A5036]/12 pt-3">
                    <div className="flex justify-between text-[#6F3F2A]">
                      <span>Tạm tính</span>
                      <span className="tabular-nums font-medium text-[#5A2E1C]">
                        {formatVND(subtotal)}
                      </span>
                    </div>
                    {discountResult.valid && discountResult.orderDiscountAmount > 0 && (
                      <div className="flex justify-between text-[#C4535A]">
                        <span>Giảm giá ({appliedCode})</span>
                        <span className="tabular-nums font-medium">
                          -{formatVND(discountResult.orderDiscountAmount)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs text-[#6F3F2A]">
                      <span>Phí vận chuyển</span>
                      <span>Tính ở bước thanh toán</span>
                    </div>
                    <div className="flex justify-between text-base font-bold text-[#5A2E1C] pt-1.5 border-t border-[#8A5036]/12">
                      <span>Tổng tạm tính</span>
                      <span className="text-[#C4535A] tabular-nums">
                        {formatVND(estimatedTotal)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleGoToCheckout}
                    className="w-full py-3.5 px-5 rounded-xl btn-rose-gradient font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <span>Tiến hành đặt hàng</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Modal sửa tùy chọn món trong giỏ */}
      <ProductModal
        product={editingProduct}
        allProducts={products}
        editingCartItem={editingItem}
        onClose={() => setEditingItem(null)}
      />
    </>
  );
};
