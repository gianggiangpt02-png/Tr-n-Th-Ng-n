import React from 'react';
import { Camera, Plus } from 'lucide-react';
import { useCatalog } from '../hooks/useCatalog';
import { getProductTheme } from '../theme/productColors';
import { Product } from '../types';
import { formatVND } from '../utils/format';
import { FavoriteButton } from './FavoriteButton';
import { ProductImage } from './ProductImage';

interface ProductCardProps {
  product: Product;
  onSelect: (product: Product) => void;
  onQuickAdd?: (product: Product) => void;
  showQuickAddLabel?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onSelect,
  onQuickAdd,
  showQuickAddLabel = false,
}) => {
  const { isImageEditMode, openImageEditor } = useCatalog();
  const theme = getProductTheme(product.product_id, product.category);
  const unavailable = !product.is_available;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (unavailable) return;
    if (onQuickAdd) {
      onQuickAdd(product);
    } else {
      onSelect(product);
    }
  };

  const handleOpenImageEditor = (e: React.MouseEvent) => {
    e.stopPropagation();
    openImageEditor({
      type: 'product',
      id: product.product_id,
      title: product.name,
      currentUrl: product.image_url,
      category: product.category,
    });
  };

  return (
    <article
      onClick={() => onSelect(product)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(product);
        }
      }}
      tabIndex={0}
      role="button"
      aria-label={`Xem chi tiết ${product.name}, giá ${formatVND(product.price_m)}`}
      style={{ backgroundColor: theme.bg }}
      className={`group relative flex flex-col rounded-2xl border border-[#8A5036]/15 overflow-hidden transition-all duration-200 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#D4606A] ${
        unavailable
          ? 'opacity-65'
          : 'hover:-translate-y-0.5 hover:shadow-[0_12px_28px_-10px_rgba(138,80,54,0.22)]'
      }`}
    >
      {/* Khung ảnh bo tròn nhẹ bên trong card */}
      <div className="p-3 pb-0">
        <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden">
          <ProductImage
            src={product.image_url}
            alt={product.name}
            productId={product.product_id}
            category={product.category}
            className="w-full h-full transition-transform duration-300 group-hover:scale-[1.03]"
          />

          {/* Chỉ hiển thị 1 nhãn duy nhất ở góc trái trên nếu cần (Tạm hết hoặc Bán chạy) */}
          {unavailable ? (
            <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#8A5036] text-[#FFF4EA]">
              Tạm hết
            </span>
          ) : product.is_bestseller ? (
            <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#AA2B1D] text-white">
              Bán chạy
            </span>
          ) : null}

          {/* Nút trái tim ♡/♥ ở góc phải trên */}
          <div className="absolute top-2.5 right-2.5 z-10">
            <FavoriteButton
              productId={product.product_id}
              productName={product.name}
              size="sm"
            />
          </div>

          {/* Nút Đổi ảnh trực tiếp trên thẻ khi bật chế độ đổi ảnh */}
          {isImageEditMode && (
            <button
              type="button"
              onClick={handleOpenImageEditor}
              aria-label={`Đổi ảnh cho ${product.name}`}
              className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8A5036]/95 hover:bg-[#B8434A] text-[#FBDB93] hover:text-white text-xs font-semibold shadow-md transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Đổi ảnh</span>
            </button>
          )}
        </div>
      </div>

      {/* Nội dung card (WCAG AA nâu đậm #5A2E1C trên nền pastel) */}
      <div className="flex flex-col flex-1 p-4 pt-3.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-[#6F3F2A]">
          <span>{product.category}</span>
          {product.price_l !== null && (
            <>
              <span aria-hidden="true">·</span>
              <span>Size M / L</span>
            </>
          )}
        </div>

        <h3 className="mt-1 font-display text-lg font-semibold text-[#5A2E1C] leading-snug line-clamp-1 group-hover:text-[#914F1E] transition-colors">
          {product.name}
        </h3>

        <p className="mt-1 text-sm text-[#5A2E1C]/85 line-clamp-2 leading-relaxed flex-1">
          {product.description}
        </p>

        <div className="mt-4 pt-3 border-t border-[#8A5036]/15 flex items-center justify-between gap-2">
          <div className="flex items-baseline gap-1">
            {product.price_l !== null && (
              <span className="text-xs font-medium text-[#6F3F2A]">từ</span>
            )}
            <span
              className="text-base font-bold tabular-nums"
              style={{ color: theme.accent }}
            >
              {formatVND(product.price_m)}
            </span>
          </div>

          <button
            type="button"
            disabled={unavailable}
            onClick={handleQuickAdd}
            aria-label={
              unavailable
                ? `${product.name} tạm hết`
                : showQuickAddLabel
                ? `Thêm nhanh ${product.name} vào giỏ`
                : `Thêm ${product.name} vào giỏ`
            }
            className={`rounded-xl flex items-center justify-center gap-1.5 transition-all shrink-0 font-semibold ${
              showQuickAddLabel ? 'px-3 py-2 text-xs' : 'w-9 h-9'
            } ${
              unavailable
                ? 'bg-[#8A5036]/20 text-[#5A2E1C]/60 cursor-not-allowed'
                : 'text-white hover:brightness-110 active:scale-95 shadow-xs'
            }`}
            style={!unavailable ? { backgroundColor: theme.accent } : undefined}
          >
            <Plus className="w-4 h-4" />
            {showQuickAddLabel && <span>Thêm nhanh vào giỏ</span>}
          </button>
        </div>
      </div>
    </article>
  );
};
