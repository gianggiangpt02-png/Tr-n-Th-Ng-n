import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag, Trash2 } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { ProductModal } from '../components/ProductModal';
import { useCart } from '../hooks/useCart';
import { useCatalog } from '../hooks/useCatalog';
import { useFavorites } from '../hooks/useFavorites';
import { useToast } from '../hooks/useToast';
import { Product } from '../types';

export const FavoritesPage: React.FC = () => {
  const { products } = useCatalog();
  const { list, count, clear } = useFavorites();
  const { addProductToCart, openDrawer } = useCart();
  const { showToast } = useToast();

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const favoriteProducts = useMemo(() => {
    return list
      .map((id) => products.find((p) => p.product_id === id))
      .filter((p): p is Product => Boolean(p));
  }, [list, products]);

  const availableFavorites = useMemo(
    () => favoriteProducts.filter((p) => p.is_available),
    [favoriteProducts]
  );

  const handleQuickAddSingle = (product: Product) => {
    if (!product.is_available) return;
    addProductToCart({
      product,
      size: product.price_l !== null ? 'M' : 'Tiêu chuẩn',
      sugar_level: product.category === 'Bánh' ? 'Tiêu chuẩn' : '70%',
      ice_level: product.category === 'Bánh' ? 'Không áp dụng' : 'Vừa',
      toppings: [],
      quantity: 1,
      note: '',
    });
    showToast(`Đã thêm ${product.name} vào giỏ hàng`);
  };

  const handleAddAllToCart = () => {
    if (availableFavorites.length === 0) {
      showToast('Hiện chưa có món còn hàng trong danh sách yêu thích', 'error');
      return;
    }
    availableFavorites.forEach((product) => {
      addProductToCart({
        product,
        size: product.price_l !== null ? 'M' : 'Tiêu chuẩn',
        sugar_level: product.category === 'Bánh' ? 'Tiêu chuẩn' : '70%',
        ice_level: product.category === 'Bánh' ? 'Không áp dụng' : 'Vừa',
        toppings: [],
        quantity: 1,
        note: '',
      });
    });
    showToast(`Đã thêm ${availableFavorites.length} món yêu thích vào giỏ hàng`);
    openDrawer();
  };

  return (
    <div className="pb-16">
      {/* Đầu trang */}
      <section className="bg-[#8A5036] text-[#FFF4EA] py-10 px-4 sm:px-6 border-b border-[#FBDB93]/20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#FFC4BE]">
              Bộ sưu tập hương vị riêng của bạn
            </p>
            <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold text-[#FFF4EA]">
              Món yêu thích ({count})
            </h1>
          </div>

          {favoriteProducts.length > 0 && (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleAddAllToCart}
                disabled={availableFavorites.length === 0}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  availableFavorites.length === 0
                    ? 'bg-white/20 text-[#FFF4EA]/60 cursor-not-allowed'
                    : 'btn-rose-gradient shadow-sm'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                <span>Thêm tất cả vào giỏ ({availableFavorites.length})</span>
              </button>

              <button
                type="button"
                onClick={clear}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-[#FFF4EA] text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa hết</span>
              </button>
            </div>
          )}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        {favoriteProducts.length === 0 ? (
          <div className="py-16 px-6 rounded-3xl bg-[#FBE3E0]/70 border border-[#EDB9B3] text-center max-w-2xl mx-auto">
            <div className="w-20 h-20 mx-auto rounded-full bg-[#F9D5D3] flex items-center justify-center mb-5">
              <Heart className="w-9 h-9 text-[#D4606A]" />
            </div>
            <h2 className="font-display text-2xl font-bold text-[#5A2E1C]">
              Chưa có món yêu thích nào
            </h2>
            <p className="mt-2 text-sm text-[#6F3F2A] max-w-md mx-auto leading-relaxed">
              Hãy bấm biểu tượng trái tim trên các món đồ uống hoặc bánh bạn thích để lưu lại và
              đặt nhanh hơn cho những lần sau nhé.
            </p>
            <Link
              to="/thuc-don"
              className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl btn-rose-gradient text-sm font-semibold shadow-sm transition-all"
            >
              Khám phá thực đơn
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {favoriteProducts.map((product) => (
              <ProductCard
                key={product.product_id}
                product={product}
                onSelect={setSelectedProduct}
                onQuickAdd={handleQuickAddSingle}
                showQuickAddLabel={true}
              />
            ))}
          </div>
        )}
      </div>

      {/* Popup tùy chỉnh khi bấm vào thẻ món */}
      <ProductModal
        product={selectedProduct}
        allProducts={products}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
};
