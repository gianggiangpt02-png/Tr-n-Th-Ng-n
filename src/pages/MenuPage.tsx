import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowUpDown, Camera, Check, Coffee, Heart, Search, X } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';
import { ProductModal } from '../components/ProductModal';
import { useCatalog } from '../hooks/useCatalog';
import { useFavorites } from '../hooks/useFavorites';
import { Product } from '../types';
import { removeVietnameseTones } from '../utils/format';

const MENU_CATEGORIES = ['Tất cả', 'Cà phê', 'Trà', 'Sinh tố', 'Nước ép', 'Bánh'] as const;
const FAVORITE_TAB = 'Yêu thích';
type SortOption = 'featured' | 'price_asc' | 'price_desc';

export const MenuPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCat = searchParams.get('category') || 'Tất cả';
  const initialQuery = searchParams.get('q') || '';

  const { products: allProducts, isImageEditMode, toggleImageEditMode } = useCatalog();
  const { isFav, count: favCount } = useFavorites();

  const [selectedCategory, setSelectedCategory] = useState<string>(
    MENU_CATEGORIES.includes(initialCat as (typeof MENU_CATEGORIES)[number]) || initialCat === FAVORITE_TAB
      ? initialCat
      : 'Tất cả'
  );
  const [onlyBestseller, setOnlyBestseller] = useState(false);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [searchText, setSearchText] = useState(initialQuery);
  const [sortBy, setSortBy] = useState<SortOption>('featured');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const catParam = searchParams.get('category');
    const qParam = searchParams.get('q');
    if (
      catParam &&
      (MENU_CATEGORIES.includes(catParam as (typeof MENU_CATEGORIES)[number]) ||
        catParam === FAVORITE_TAB)
    ) {
      setSelectedCategory(catParam);
    }
    if (qParam !== null) {
      setSearchText(qParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const t = setTimeout(() => setIsLoading(false), 180);
    return () => clearTimeout(t);
  }, []);

  const filteredProducts = useMemo(() => {
    const normalizedQuery = removeVietnameseTones(searchText);

    const base = allProducts.filter((p) => {
      if (p.category === 'Topping') return false;
      if (selectedCategory === FAVORITE_TAB) {
        if (!isFav(p.product_id)) return false;
      } else if (selectedCategory !== 'Tất cả' && p.category !== selectedCategory) {
        return false;
      }
      if (onlyBestseller && !p.is_bestseller) return false;
      if (onlyAvailable && !p.is_available) return false;
      if (normalizedQuery) {
        const hay = removeVietnameseTones(`${p.name} ${p.description} ${p.category}`);
        if (!hay.includes(normalizedQuery)) return false;
      }
      return true;
    });

    if (sortBy === 'price_asc') {
      return [...base].sort((a, b) => a.price_m - b.price_m);
    }
    if (sortBy === 'price_desc') {
      return [...base].sort((a, b) => b.price_m - a.price_m);
    }
    return [...base].sort((a, b) => a.sort_order - b.sort_order);
  }, [allProducts, selectedCategory, onlyBestseller, onlyAvailable, searchText, sortBy, isFav]);

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat);
    const nextParams = new URLSearchParams(searchParams);
    if (cat === 'Tất cả') {
      nextParams.delete('category');
    } else {
      nextParams.set('category', cat);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const clearAllFilters = () => {
    setSelectedCategory('Tất cả');
    setOnlyBestseller(false);
    setOnlyAvailable(false);
    setSearchText('');
    setSortBy('featured');
    setSearchParams({}, { replace: true });
  };

  return (
    <div className="pb-16">
      {/* Đầu trang thực đơn */}
      <section className="bg-[#8A5036] text-[#FFF4EA] py-10 px-4 sm:px-6 border-b border-[#FBDB93]/20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#FBDB93]">
              Pha chế thủ công mỗi ngày
            </p>
            <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold text-[#FFF4EA]">
              Thực đơn JeJi Coffee
            </h1>
          </div>
          <p className="text-sm text-[#FFF4EA]/85 max-w-md">
            Chọn món bạn thích để tùy chỉnh kích cỡ M/L, mức đường, mức đá và thêm topping trân
            châu tươi.
          </p>
        </div>
      </section>

      {/* Thanh danh mục dính + bộ lọc */}
      <div className="sticky top-16 md:top-24 z-30 bg-[#FFF4EA]/95 backdrop-blur-md border-b border-[#8A5036]/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 space-y-3">
          {/* Tabs danh mục + chip Yêu thích */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {MENU_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategoryChange(cat)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#8A5036] text-[#FBDB93]'
                      : 'bg-white/85 text-[#5A2E1C] border border-[#8A5036]/15 hover:border-[#8A5036]/40'
                  }`}
                >
                  {cat}
                </button>
              );
            })}

            {/* Chip lọc Yêu thích cạnh các danh mục */}
            <button
              type="button"
              onClick={() => handleCategoryChange(FAVORITE_TAB)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === FAVORITE_TAB
                  ? 'btn-rose-gradient shadow-xs'
                  : 'bg-[#FBE3E0] text-[#C4535A] border border-[#EDB9B3] hover:bg-[#F9D5D3]'
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 ${
                  selectedCategory === FAVORITE_TAB ? 'fill-white text-white' : 'fill-[#D4606A] text-[#D4606A]'
                }`}
              />
              <span>Yêu thích{favCount > 0 ? ` (${favCount})` : ''}</span>
            </button>
          </div>

          {/* Tìm kiếm, lọc nhanh & sắp xếp */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[220px]">
              <div className="relative flex-1 max-w-xs">
                <Search className="w-4 h-4 text-[#6F3F2A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Tìm món (không cần gõ dấu)..."
                  aria-label="Tìm kiếm món theo tên"
                  className="w-full pl-9 pr-8 py-2 rounded-xl bg-white border border-[#8A5036]/20 text-sm text-[#5A2E1C] placeholder:text-[#6F3F2A]/65 focus:outline-none focus:border-[#8A5036]"
                />
                {searchText && (
                  <button
                    type="button"
                    onClick={() => setSearchText('')}
                    aria-label="Xóa từ khóa"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6F3F2A] hover:text-[#5A2E1C]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setOnlyBestseller((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap ${
                  onlyBestseller
                    ? 'bg-[#AA2B1D] text-white border-[#AA2B1D]'
                    : 'bg-white/85 text-[#5A2E1C] border-[#8A5036]/20 hover:border-[#8A5036]'
                }`}
              >
                {onlyBestseller && <Check className="w-3.5 h-3.5" />}
                Bán chạy
              </button>

              <button
                type="button"
                onClick={() => setOnlyAvailable((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap ${
                  onlyAvailable
                    ? 'bg-[#8A5036] text-[#FBDB93] border-[#8A5036]'
                    : 'bg-white/85 text-[#5A2E1C] border-[#8A5036]/20 hover:border-[#8A5036]'
                }`}
              >
                {onlyAvailable && <Check className="w-3.5 h-3.5" />}
                Còn hàng
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={toggleImageEditMode}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-colors whitespace-nowrap ${
                  isImageEditMode
                    ? 'btn-rose-gradient border-transparent'
                    : 'bg-white/85 text-[#5A2E1C] border-[#8A5036]/20 hover:border-[#8A5036]'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>{isImageEditMode ? 'Xong đổi ảnh' : 'Đổi ảnh'}</span>
              </button>

              <ArrowUpDown className="w-4 h-4 text-[#6F3F2A]" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                aria-label="Sắp xếp thực đơn"
                className="px-3 py-2 rounded-xl bg-white border border-[#8A5036]/20 text-xs font-semibold text-[#5A2E1C] focus:outline-none focus:border-[#8A5036]"
              >
                <option value="featured">Nổi bật</option>
                <option value="price_asc">Giá tăng dần</option>
                <option value="price_desc">Giá giảm dần</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Lưới sản phẩm */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl bg-white/80 border border-[#8A5036]/10 p-3 space-y-3 animate-pulse"
              >
                <div className="aspect-[4/3] rounded-xl bg-[#FCE8D5]" />
                <div className="h-3 w-16 rounded bg-[#8A5036]/15" />
                <div className="h-5 w-3/4 rounded bg-[#8A5036]/20" />
                <div className="h-4 w-full rounded bg-[#8A5036]/10" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-16 text-center rounded-3xl bg-[#FCE8D5]/60 border border-[#EDB9B3] px-6">
            <div className="w-16 h-16 mx-auto rounded-full bg-[#F9D5D3] flex items-center justify-center mb-4">
              {selectedCategory === FAVORITE_TAB ? (
                <Heart className="w-8 h-8 text-[#D4606A]" />
              ) : (
                <Coffee className="w-8 h-8 text-[#8A5036]" />
              )}
            </div>
            <h2 className="font-display text-xl font-bold text-[#5A2E1C]">
              {selectedCategory === FAVORITE_TAB
                ? 'Bạn chưa lưu món yêu thích nào'
                : 'Không tìm thấy món phù hợp'}
            </h2>
            <p className="mt-1.5 text-sm text-[#6F3F2A]">
              {selectedCategory === FAVORITE_TAB
                ? 'Hãy bấm biểu tượng trái tim trên các món bạn thích để xem nhanh tại đây.'
                : 'Hãy thử xóa bộ lọc hoặc tìm bằng một từ khóa khác nhé.'}
            </p>
            <button
              type="button"
              onClick={clearAllFilters}
              className="mt-5 px-5 py-2.5 rounded-xl btn-rose-gradient text-sm font-semibold transition-all"
            >
              Xem tất cả thực đơn
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.product_id}
                product={product}
                onSelect={setSelectedProduct}
              />
            ))}
          </div>
        )}
      </div>

      {/* Popup chi tiết & tùy chỉnh món */}
      <ProductModal
        product={selectedProduct}
        allProducts={allProducts}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
};
