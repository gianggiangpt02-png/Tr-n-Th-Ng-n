import React, { useEffect, useMemo, useState } from 'react';
import { Check, Minus, Plus, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCart } from '../hooks/useCart';
import { useToast } from '../hooks/useToast';
import { CartItem, CartToppingItem, Product } from '../types';
import { formatVND } from '../utils/format';
import { FavoriteButton } from './FavoriteButton';
import { ProductImage } from './ProductImage';

interface ProductModalProps {
  product: Product | null;
  allProducts: Product[];
  editingCartItem?: CartItem | null;
  onClose: () => void;
}

const SUGAR_LEVELS = ['0%', '30%', '50%', '70%', '100%'];
const ICE_LEVELS = ['Không đá', 'Ít đá', 'Vừa', 'Nhiều đá'];

const DRINK_CATEGORIES = new Set(['Cà phê', 'Trà', 'Sinh tố', 'Nước ép']);

export const ProductModal: React.FC<ProductModalProps> = ({
  product,
  allProducts,
  editingCartItem,
  onClose,
}) => {
  const { addProductToCart, updateCartItem } = useCart();
  const { showToast } = useToast();

  const toppingsList = useMemo(
    () =>
      allProducts
        .filter((p) => p.category === 'Topping')
        .sort((a, b) => a.sort_order - b.sort_order),
    [allProducts]
  );

  const suggestedPairings = useMemo(
    () =>
      allProducts
        .filter(
          (p) =>
            p.category === 'Bánh' &&
            p.is_available &&
            p.product_id !== product?.product_id
        )
        .slice(0, 2),
    [allProducts, product]
  );

  const isDrink = product ? DRINK_CATEGORIES.has(product.category) : false;
  const hasSizeL = product ? product.price_l !== null : false;

  const [size, setSize] = useState<'M' | 'L' | 'Tiêu chuẩn'>('M');
  const [sugarLevel, setSugarLevel] = useState<string>('70%');
  const [iceLevel, setIceLevel] = useState<string>('Vừa');
  const [selectedToppings, setSelectedToppings] = useState<CartToppingItem[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [note, setNote] = useState<string>('');

  useEffect(() => {
    if (!product) return;
    if (editingCartItem) {
      setSize(editingCartItem.size);
      setSugarLevel(editingCartItem.sugar_level || '70%');
      setIceLevel(editingCartItem.ice_level || 'Vừa');
      setSelectedToppings(editingCartItem.toppings || []);
      setQuantity(editingCartItem.quantity);
      setNote(editingCartItem.note || '');
    } else {
      setSize(product.price_l !== null ? 'M' : 'Tiêu chuẩn');
      setSugarLevel('70%');
      setIceLevel(product.product_id === 'SP005' ? 'Ít đá' : 'Vừa');
      setSelectedToppings([]);
      setQuantity(1);
      setNote('');
    }
  }, [product, editingCartItem]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (product) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [product, onClose]);

  if (!product) return null;

  const unavailable = !product.is_available;
  const baseUnitPrice =
    size === 'L' && product.price_l !== null ? product.price_l : product.price_m;
  const toppingsSum = selectedToppings.reduce((s, t) => s + t.price, 0);
  const unitPrice = baseUnitPrice + toppingsSum;
  const totalPrice = unitPrice * quantity;

  const toggleTopping = (topping: Product) => {
    if (!topping.is_available) return;
    setSelectedToppings((prev) => {
      const exists = prev.some((t) => t.product_id === topping.product_id);
      if (exists) {
        return prev.filter((t) => t.product_id !== topping.product_id);
      }
      return [
        ...prev,
        { product_id: topping.product_id, name: topping.name, price: topping.price_m },
      ];
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (unavailable) return;

    if (editingCartItem) {
      updateCartItem(editingCartItem.cart_item_id, {
        size,
        sugar_level: isDrink ? sugarLevel : 'Tiêu chuẩn',
        ice_level: isDrink ? iceLevel : 'Không áp dụng',
        toppings: isDrink ? selectedToppings : [],
        quantity,
        unit_price: unitPrice,
        note: note.trim(),
      });
      showToast(`Đã cập nhật ${product.name} trong giỏ hàng`);
    } else {
      addProductToCart({
        product,
        size,
        sugar_level: isDrink ? sugarLevel : 'Tiêu chuẩn',
        ice_level: isDrink ? iceLevel : 'Không áp dụng',
        toppings: isDrink ? selectedToppings : [],
        quantity,
        note,
      });
      showToast(`Đã thêm ${quantity}× ${product.name} vào giỏ`);
    }
    onClose();
  };

  const handleQuickAddPairing = (cake: Product) => {
    addProductToCart({
      product: cake,
      size: cake.price_l !== null ? 'M' : 'Tiêu chuẩn',
      sugar_level: 'Tiêu chuẩn',
      ice_level: 'Không áp dụng',
      toppings: [],
      quantity: 1,
      note: '',
    });
    showToast(`Đã thêm ${cake.name} vào giỏ`);
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-[#8A5036]/55 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-2xl max-h-[92vh] bg-[#FFF4EA] rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-[#8A5036]/20"
        >
          {/* Header cố định */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#8A5036]/15 bg-[#FCE8D5]/60">
            <div>
              <span className="text-xs font-semibold text-[#9B3922]">{product.category}</span>
              <h2 id="product-modal-title" className="font-display text-xl font-bold text-[#914F1E]">
                {product.name}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <FavoriteButton productId={product.product_id} productName={product.name} />
              <button
                type="button"
                onClick={onClose}
                aria-label="Đóng cửa sổ chọn món"
                className="w-9 h-9 rounded-xl bg-[#8A5036]/12 text-[#5A2E1C] hover:bg-[#8A5036]/20 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Nội dung cuộn */}
          <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 p-6 space-y-6">
            {/* Ảnh + mô tả */}
            <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-5 items-center">
              <ProductImage
                src={product.image_url}
                alt={product.name}
                productId={product.product_id}
                category={product.category}
                size="lg"
                className="w-full aspect-[4/3] sm:aspect-square rounded-2xl"
              />
              <div>
                <p className="text-sm text-[#6F3F2A] leading-relaxed">{product.description}</p>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-[#C4535A] tabular-nums">
                    {formatVND(baseUnitPrice)}
                  </span>
                  {unavailable && (
                    <span className="text-xs font-semibold text-[#AA2B1D]">· Tạm hết hàng</span>
                  )}
                </div>
              </div>
            </div>

            {/* Chọn Size (chỉ hiện nếu có price_l) */}
            {hasSizeL && product.price_l !== null && (
              <div>
                <label className="block text-sm font-semibold text-[#5A2E1C] mb-2.5">
                  Chọn kích cỡ
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSize('M')}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                      size === 'M'
                        ? 'bg-[#8A5036] text-[#FBDB93] border-[#8A5036]'
                        : 'bg-[#FFF4EA] text-[#5A2E1C] border-[#8A5036]/20 hover:border-[#8A5036]'
                    }`}
                  >
                    <span>Size M (Tiêu chuẩn)</span>
                    <span className="tabular-nums font-semibold">{formatVND(product.price_m)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSize('L')}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                      size === 'L'
                        ? 'bg-[#8A5036] text-[#FBDB93] border-[#8A5036]'
                        : 'bg-[#FFF4EA] text-[#5A2E1C] border-[#8A5036]/20 hover:border-[#8A5036]'
                    }`}
                  >
                    <span>Size L (Lớn)</span>
                    <span className="tabular-nums font-semibold">
                      +{formatVND(product.price_l - product.price_m)}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Mức đường & mức đá cho đồ uống */}
            {isDrink && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-semibold text-[#5A2E1C] mb-2.5">
                    Mức đường
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SUGAR_LEVELS.map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setSugarLevel(lvl)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${
                          sugarLevel === lvl
                            ? 'bg-[#8A5036] text-[#FBDB93] border-[#8A5036]'
                            : 'bg-white text-[#5A2E1C] border-[#8A5036]/20 hover:border-[#8A5036]'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-[#5A2E1C] mb-2.5">
                    Mức đá
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {ICE_LEVELS.map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setIceLevel(lvl)}
                        className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors whitespace-nowrap ${
                          iceLevel === lvl
                            ? 'bg-[#8A5036] text-[#FBDB93] border-[#8A5036]'
                            : 'bg-white text-[#5A2E1C] border-[#8A5036]/20 hover:border-[#8A5036]'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Thêm topping (chỉ áp dụng cho Cà phê, Trà, Sinh tố, Nước ép) */}
            {isDrink && toppingsList.length > 0 && (
              <div>
                <label className="block text-sm font-semibold text-[#5A2E1C] mb-2.5">
                  Thêm topping
                </label>
                <div className="space-y-2">
                  {toppingsList.map((topping) => {
                    const checked = selectedToppings.some(
                      (t) => t.product_id === topping.product_id
                    );
                    const disabled = !topping.is_available;
                    return (
                      <button
                        key={topping.product_id}
                        type="button"
                        disabled={disabled}
                        onClick={() => toggleTopping(topping)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors ${
                          disabled
                            ? 'opacity-50 bg-white/70 border-[#8A5036]/10 cursor-not-allowed'
                            : checked
                            ? 'bg-[#F9D5D3]/55 border-[#D4606A]'
                            : 'bg-white border-[#8A5036]/15 hover:border-[#8A5036]/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                              checked
                                ? 'bg-[#D4606A] border-[#D4606A] text-white'
                                : 'border-[#8A5036]/40 bg-white'
                            }`}
                          >
                            {checked && <Check className="w-3.5 h-3.5" />}
                          </span>
                          <div>
                            <span className="text-sm font-medium text-[#5A2E1C]">
                              {topping.name}
                            </span>
                            {disabled && (
                              <span className="ml-2 text-xs font-medium text-[#AA2B1D]">
                                (Tạm hết)
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-[#5A2E1C] tabular-nums">
                          +{formatVND(topping.price_m)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Ghi chú */}
            <div>
              <label htmlFor="item-note" className="block text-sm font-semibold text-[#5A2E1C] mb-2">
                Ghi chú cho món này
              </label>
              <input
                id="item-note"
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: Ít ngọt, tách riêng đá, không ống hút nhựa..."
                className="w-full px-4 py-2.5 rounded-xl bg-white border border-[#8A5036]/20 text-sm text-[#5A2E1C] placeholder:text-[#6F3F2A]/60 focus:border-[#8A5036] focus:outline-none"
              />
            </div>

            {/* Gợi ý thường được mua cùng */}
            {!editingCartItem && suggestedPairings.length > 0 && (
              <div className="pt-2 border-t border-[#8A5036]/12">
                <p className="text-sm font-semibold text-[#5A2E1C] mb-3">
                  Thường được mua cùng
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {suggestedPairings.map((cake) => (
                    <div
                      key={cake.product_id}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-white border border-[#8A5036]/15"
                    >
                      <ProductImage
                        src={cake.image_url}
                        alt={cake.name}
                        productId={cake.product_id}
                        category={cake.category}
                        size="sm"
                        className="w-12 h-12 rounded-lg shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#5A2E1C] truncate">{cake.name}</p>
                        <p className="text-xs font-semibold text-[#9B3922] tabular-nums">
                          {formatVND(cake.price_m)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleQuickAddPairing(cake)}
                        aria-label={`Thêm ${cake.name}`}
                        className="px-2.5 py-1.5 rounded-lg bg-[#FCE8D5] hover:bg-[#8A5036] hover:text-[#FFF4EA] text-[#6F3F2A] text-xs font-semibold transition-colors whitespace-nowrap"
                      >
                        + Thêm
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Thanh chân modal chọn số lượng & CTA */}
            <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-4 bg-[#FCE8D5]/80 backdrop-blur-md border-t border-[#8A5036]/15 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 bg-[#FFF4EA] border border-[#8A5036]/20 rounded-xl p-1">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  aria-label="Giảm số lượng"
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[#5A2E1C] hover:bg-[#8A5036]/10 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-8 text-center font-semibold text-[#5A2E1C] tabular-nums">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => q + 1)}
                  aria-label="Tăng số lượng"
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[#5A2E1C] hover:bg-[#8A5036]/10 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              <button
                type="submit"
                disabled={unavailable}
                className={`flex-1 py-3 px-5 rounded-xl font-semibold text-sm flex items-center justify-between transition-all ${
                  unavailable
                    ? 'bg-[#8A5036]/20 text-[#5A2E1C]/60 cursor-not-allowed'
                    : 'btn-rose-gradient shadow-sm'
                }`}
              >
                <span>
                  {unavailable
                    ? 'Món đang tạm hết'
                    : editingCartItem
                    ? 'Cập nhật giỏ hàng'
                    : 'Thêm vào giỏ'}
                </span>
                <span className="tabular-nums font-bold">{formatVND(totalPrice)}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
