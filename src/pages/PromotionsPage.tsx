import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Check, Copy, ShoppingBag, Tag } from 'lucide-react';
import { ProductImage } from '../components/ProductImage';
import { useCart } from '../hooks/useCart';
import { useCatalog } from '../hooks/useCatalog';
import { useToast } from '../hooks/useToast';
import { api } from '../services/api';
import { getComboSavingsPercent, isComboActive, parseComboItems } from '../utils/combo';
import { isDiscountCurrentlyValid } from '../utils/discount';
import { formatDateShortVN, formatVND } from '../utils/format';

export const PromotionsPage: React.FC = () => {
  const { addComboToCart, openDrawer, setAppliedCode } = useCart();
  const { products, combos, isImageEditMode, toggleImageEditMode, openImageEditor } = useCatalog();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const activeCombos = useMemo(
    () => combos.filter((c) => isComboActive(c)),
    [combos]
  );
  const discounts = useMemo(
    () => api.getDiscounts().filter((d) => isDiscountCurrentlyValid(d)),
    []
  );

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    showToast(`Đã sao chép mã ${code}`);
  };

  const handleApplyAndGo = (code: string) => {
    setAppliedCode(code);
    showToast(`Đã chọn mã ${code} cho giỏ hàng`);
    navigate('/thuc-don');
  };

  return (
    <div className="pb-16">
      <section className="bg-[#8A5036] text-[#FFF4EA] py-10 px-4 sm:px-6 border-b border-[#FBDB93]/20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#FBDB93]">
              Ưu đãi đặc biệt tại JeJi Coffee
            </p>
            <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold text-[#FFF4EA]">
              Combo & Mã giảm giá
            </h1>
            <p className="mt-2 text-sm text-[#FFF4EA]/85 max-w-2xl">
              Các combo đồ uống kèm bánh làm mới mỗi ngày và mã ưu đãi áp dụng trực tiếp khi đặt
              hàng trực tuyến.
            </p>
          </div>
          <button
            type="button"
            onClick={toggleImageEditMode}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors self-start sm:self-auto ${
              isImageEditMode
                ? 'btn-rose-gradient'
                : 'bg-white/15 hover:bg-white/25 text-[#FBDB93]'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{isImageEditMode ? 'Xong đổi ảnh' : 'Đổi ảnh combo'}</span>
          </button>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 space-y-14">
        {/* Danh sách Combo còn hạn */}
        <section>
          <h2 className="font-display text-2xl font-bold text-[#914F1E] mb-6">
            Combo đang áp dụng
          </h2>

          {activeCombos.length === 0 ? (
            <p className="text-sm text-[#6F3F2A]">Hiện chưa có combo nào trong ngày hôm nay.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {activeCombos.map((combo) => {
                const parsed = parseComboItems(combo.items, products);
                const savings = getComboSavingsPercent(combo);

                return (
                  <article
                    key={combo.combo_id}
                    className="combo-card-surface rounded-3xl border p-5 flex flex-col justify-between shadow-xs"
                  >
                    <div>
                      <div className="relative aspect-[16/10] rounded-2xl overflow-hidden mb-4">
                        <ProductImage
                          src={combo.image_url}
                          alt={combo.name}
                          productId={combo.combo_id}
                          category="Combo"
                          className="w-full h-full"
                        />
                        {savings > 0 && (
                          <span className="absolute top-3 right-3 px-3 py-1 rounded-xl bg-[#AA2B1D] text-white text-xs font-bold tabular-nums">
                            Giảm {savings}%
                          </span>
                        )}
                        {isImageEditMode && (
                          <button
                            type="button"
                            onClick={() =>
                              openImageEditor({
                                type: 'combo',
                                id: combo.combo_id,
                                title: combo.name,
                                currentUrl: combo.image_url,
                                category: 'Combo',
                              })
                            }
                            className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8A5036]/95 hover:bg-[#B8434A] text-[#FBDB93] hover:text-white text-xs font-semibold shadow-md transition-colors"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Đổi ảnh</span>
                          </button>
                        )}
                      </div>

                      <h3 className="font-display text-xl font-bold text-[#5A2E1C]">{combo.name}</h3>
                      <p className="mt-1.5 text-sm text-[#6F3F2A] leading-relaxed">
                        {combo.description}
                      </p>

                      <div className="mt-4 pt-3 border-t border-[#8A5036]/15 space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wider text-[#9B3922]">
                          Bao gồm trong combo:
                        </p>
                        {parsed.map((item) => (
                          <div
                            key={item.product_id}
                            className="flex items-center gap-2 text-sm text-[#5A2E1C]"
                          >
                            <Check className="w-3.5 h-3.5 text-[#914F1E] shrink-0" />
                            <span>
                              {item.name} <strong className="tabular-nums">×{item.quantity}</strong>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-[#8A5036]/15 flex items-center justify-between gap-3">
                      <div>
                        <span className="block text-xs text-[#6F3F2A] line-through tabular-nums">
                          Giá gốc: {formatVND(combo.original_price)}
                        </span>
                        <span className="text-xl font-bold text-[#AA2B1D] tabular-nums">
                          {formatVND(combo.combo_price)}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          addComboToCart(combo, products, 1);
                          showToast(`Đã thêm ${combo.name} vào giỏ hàng`);
                          openDrawer();
                        }}
                        className="inline-flex items-center gap-2 px-4 py-3 rounded-xl btn-rose-gradient text-xs font-semibold transition-all whitespace-nowrap"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Thêm vào giỏ</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* Danh sách Mã giảm giá (nền #FBE3E0 --pink-bg) */}
        <section className="rounded-3xl bg-[#FBE3E0] border border-[#EDB9B3] p-6 sm:p-8">
          <h2 className="font-display text-2xl font-bold text-[#914F1E] mb-6">
            Kho mã ưu đãi
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {discounts.map((d) => {
              const remaining = Math.max(0, d.usage_limit - d.used_count);
              return (
                <div
                  key={d.code}
                  className="rounded-2xl bg-[#FFF4EA] border border-[#EDB9B3] p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5"
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 font-mono text-lg font-bold text-[#AA2B1D]">
                        <Tag className="w-4 h-4" />
                        {d.code}
                      </span>
                      <span className="text-xs text-[#6F3F2A] tabular-nums">
                        Còn {remaining}/{d.usage_limit} lượt
                      </span>
                    </div>

                    <p className="text-sm font-medium text-[#5A2E1C]">{d.description}</p>

                    <div className="text-xs text-[#6F3F2A] flex flex-wrap gap-x-4 gap-y-1">
                      <span>Đơn tối thiểu: {formatVND(d.min_order)}</span>
                      <span>
                        Giảm tối đa: {formatVND(d.max_discount > 0 ? d.max_discount : d.value)}
                      </span>
                      <span>
                        Hiệu lực: {formatDateShortVN(d.start_date)} – {formatDateShortVN(d.end_date)}
                      </span>
                    </div>
                  </div>

                  <div className="flex sm:flex-col gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopy(d.code)}
                      className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FBDB93] hover:bg-[#f5cf75] text-[#5A2E1C] text-xs font-semibold transition-colors whitespace-nowrap"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      Sao chép mã
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyAndGo(d.code)}
                      className="px-4 py-2.5 rounded-xl btn-rose-gradient text-xs font-semibold transition-all whitespace-nowrap"
                    >
                      Đặt món ngay
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
