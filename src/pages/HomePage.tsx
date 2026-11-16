import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CakeSlice,
  Camera,
  ChevronLeft,
  ChevronRight,
  Citrus,
  Coffee,
  Copy,
  CupSoda,
  Flame,
  HeartHandshake,
  Leaf,
  Sparkles,
} from 'lucide-react';
import { motion } from 'motion/react';
import { BrandLogo } from '../components/BrandLogo';
import { FallingCoffeeVisual } from '../components/FallingCoffeeVisual';
import { FloatingBannerShowcase } from '../components/FloatingBannerShowcase';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import { ProductModal } from '../components/ProductModal';
import { useCart } from '../hooks/useCart';
import { useCatalog } from '../hooks/useCatalog';
import { useToast } from '../hooks/useToast';
import { api } from '../services/api';
import { Product, ProductCategory } from '../types';
import { getComboSavingsPercent, isComboActive, parseComboItems } from '../utils/combo';
import { isDiscountCurrentlyValid } from '../utils/discount';
import { formatDateShortVN, formatVND } from '../utils/format';

interface HeroSlide {
  id: string;
  eyebrow: string;
  titleLine1: string;
  titleLine2: string;
  subtitle: string;
  ctaLabel: string;
  ctaTo: string;
  visualType: 'coffee' | 'combo' | 'student';
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: 'slide-1',
    eyebrow: 'Dấu ấn thương hiệu JeJi',
    titleLine1: 'Cà phê muối JeJi —',
    titleLine2: 'Béo mặn dịu êm giữa lòng phố',
    subtitle:
      'Phin cà phê rang xay đậm vị hòa cùng lớp kem muối đánh tay mịn mượt. Thức uống làm nên khoảnh khắc quen thuộc mỗi sáng tại Vĩnh Yên.',
    ctaLabel: 'Đặt ngay',
    ctaTo: '/thuc-don?category=Cà%20phê',
    visualType: 'coffee',
  },
  {
    id: 'slide-2',
    eyebrow: 'Tiết kiệm đến 16% mỗi ngày',
    titleLine1: 'Combo Sáng Tỉnh Táo &',
    titleLine2: 'Trà Chiều Dịu Mát',
    subtitle:
      'Kết hợp ly đồ uống yêu thích cùng bánh tiramisu hoặc mousse chanh leo làm thủ công mỗi ngày — trọn vị hơn, nhẹ ví hơn.',
    ctaLabel: 'Xem Combo ngay',
    ctaTo: '/uu-dai',
    visualType: 'combo',
  },
  {
    id: 'slide-3',
    eyebrow: 'Đặc quyền Học sinh – Sinh viên',
    titleLine1: 'Nhập mã HSSV15 —',
    titleLine2: 'Giảm 15% cho những buổi học nhóm',
    subtitle:
      'Áp dụng cho hóa đơn từ 45.000đ, giảm tối đa 25.000đ. Mang theo laptop hoặc ghé JeJi đặt online giao tận cổng trường.',
    ctaLabel: 'Nhận ưu đãi',
    ctaTo: '/uu-dai',
    visualType: 'student',
  },
];

const CATEGORY_STRIP: { label: ProductCategory; icon: React.ReactNode; bg: string; color: string }[] = [
  {
    label: 'Cà phê',
    icon: <Coffee className="w-6 h-6" />,
    bg: '#F9DCC4',
    color: '#914F1E',
  },
  {
    label: 'Trà',
    icon: <Leaf className="w-6 h-6" />,
    bg: '#FFD6CC',
    color: '#D4573F',
  },
  {
    label: 'Sinh tố',
    icon: <CupSoda className="w-6 h-6" />,
    bg: '#DCE9C9',
    color: '#5F8A56',
  },
  {
    label: 'Nước ép',
    icon: <Citrus className="w-6 h-6" />,
    bg: '#FFDDB0',
    color: '#D4701E',
  },
  {
    label: 'Bánh',
    icon: <CakeSlice className="w-6 h-6" />,
    bg: '#F6D9D4',
    color: '#9B3922',
  },
];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { addComboToCart, openDrawer } = useCart();
  const {
    products,
    combos,
    heroImages,
    isImageEditMode,
    toggleImageEditMode,
    openImageEditor,
  } = useCatalog();
  const { showToast } = useToast();

  const [slideIdx, setSlideIdx] = useState(0);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const bestsellerTrackRef = useRef<HTMLDivElement | null>(null);

  const bestsellers = useMemo(
    () => products.filter((p) => p.is_bestseller && p.category !== 'Topping'),
    [products]
  );
  const activeCombos = useMemo(
    () => combos.filter((c) => isComboActive(c)),
    [combos]
  );
  const validDiscounts = useMemo(
    () => api.getDiscounts().filter((d) => isDiscountCurrentlyValid(d)),
    []
  );

  useEffect(() => {
    if (isImageEditMode) return;
    const timer = setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [isImageEditMode]);

  const currentSlide = HERO_SLIDES[slideIdx];
  const currentHeroCustomUrl = heroImages[currentSlide.id] || '';

  const scrollBestsellers = (dir: 'left' | 'right') => {
    if (!bestsellerTrackRef.current) return;
    bestsellerTrackRef.current.scrollBy({
      left: dir === 'left' ? -320 : 320,
      behavior: 'smooth',
    });
  };

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    showToast(`Đã sao chép mã ${code}`);
  };

  return (
    <div className="space-y-16 pb-16">
      {/* 1. HERO BANNER CAROUSEL (Gradient blush -> peach -> butter + radial glows) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div
          className="relative rounded-3xl overflow-hidden text-[#7A3B26] shadow-lg border border-[#EDB9B3]/70"
          style={{
            background:
              'radial-gradient(circle at 88% 14%, #FBDB9399, transparent 48%), radial-gradient(circle at 12% 88%, #F2A7A755, transparent 46%), linear-gradient(135deg, #F9D5D3 0%, #FCE8D5 60%, #F6DDB0 100%)',
          }}
        >
          {/* Nút bật chế độ đổi ảnh trực tiếp trên trang */}
          <button
            type="button"
            onClick={toggleImageEditMode}
            className={`absolute top-4 right-4 z-20 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              isImageEditMode
                ? 'btn-rose-gradient'
                : 'bg-white/75 hover:bg-white text-[#5A2E1C] border border-[#8A5036]/25'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>{isImageEditMode ? 'Xong đổi ảnh' : 'Đổi ảnh'}</span>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[420px] lg:min-h-[470px]">
            {/* Nội dung bên trái + ảnh hạt cà phê rơi ở góc bên phải */}
            <div className="lg:col-span-6 relative p-8 sm:p-12 lg:p-14 pb-12 sm:pb-14 lg:pb-16 flex flex-col justify-center overflow-hidden">
              <motion.div
                key={currentSlide.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="relative z-10 sm:pr-36 md:pr-44 lg:pr-36 xl:pr-44"
              >
                <p className="text-xs sm:text-sm font-semibold tracking-wider uppercase text-[#914F1E]">
                  {currentSlide.eyebrow}
                </p>
                <h1 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-[1.15]">
                  <span className="block text-[#7A3B26]">{currentSlide.titleLine1}</span>
                  <span className="block text-[#C4535A]">{currentSlide.titleLine2}</span>
                </h1>
                <p className="mt-4 text-sm sm:text-base text-[#5A2E1C] max-w-xl leading-relaxed">
                  {currentSlide.subtitle}
                </p>

                <div className="mt-7 flex flex-wrap items-center gap-3">
                  <Link
                    to={currentSlide.ctaTo}
                    className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl btn-hero-primary font-semibold text-sm transition-all shadow-sm"
                  >
                    <span>{currentSlide.ctaLabel}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    to="/thuc-don"
                    className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl border border-[#8A5036] bg-white/60 hover:bg-white/90 text-[#5A2E1C] font-semibold text-sm transition-colors"
                  >
                    Xem toàn bộ thực đơn
                  </Link>
                </div>
              </motion.div>

              {/* Ảnh vidu5 nền trong suốt đổ nghiêng 30 độ về bên trái ở góc phải */}
              <div className="mt-4 self-end sm:mt-0 sm:absolute sm:right-3 sm:bottom-3 lg:right-2 lg:bottom-4 z-0 w-[314px] h-[339px] pl-[63px] pr-[20px] pt-[6px] ml-0">
                <FallingCoffeeVisual className="w-full h-full" />
              </div>
            </div>

            {/* Sản phẩm treo dây bay lơ lửng chuyển động bên phải */}
            <div className="lg:col-span-6 relative flex items-center justify-center pb-10 lg:pb-4">
              <FloatingBannerShowcase
                visualType={currentSlide.visualType}
                products={products}
                combos={combos}
                customBgUrl={currentHeroCustomUrl}
                onSelectProduct={setSelectedProduct}
                onCopyCoupon={handleCopyCoupon}
              />

              {isImageEditMode && (
                <button
                  type="button"
                  onClick={() =>
                    openImageEditor({
                      type: 'hero',
                      id: currentSlide.id,
                      title: `Banner: ${currentSlide.titleLine1} ${currentSlide.titleLine2}`,
                      currentUrl: currentHeroCustomUrl,
                    })
                  }
                  className="absolute bottom-5 right-5 z-30 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8A5036]/95 hover:bg-[#B8434A] text-[#FBDB93] hover:text-white text-xs font-semibold shadow-lg transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Đổi ảnh banner</span>
                </button>
              )}
            </div>
          </div>

          {/* Điều hướng slide */}
          <div className="absolute bottom-5 left-8 sm:left-12 lg:left-14 flex items-center gap-4">
            <div className="flex items-center gap-2">
              {HERO_SLIDES.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSlideIdx(idx)}
                  aria-label={`Chuyển đến slide ${idx + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    idx === slideIdx
                      ? 'w-7 bg-[#8A5036]'
                      : 'w-2 bg-[#8A5036]/30 hover:bg-[#8A5036]/60'
                  }`}
                />
              ))}
            </div>
            <div className="hidden sm:flex items-center gap-1.5 ml-2">
              <button
                type="button"
                onClick={() =>
                  setSlideIdx((p) => (p - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)
                }
                aria-label="Slide trước"
                className="w-8 h-8 rounded-full bg-white/60 hover:bg-white text-[#5A2E1C] flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setSlideIdx((p) => (p + 1) % HERO_SLIDES.length)}
                aria-label="Slide tiếp theo"
                className="w-8 h-8 rounded-full bg-white/60 hover:bg-white text-[#5A2E1C] flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 2. DẢI DANH MỤC TRÒN */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-10">
          {CATEGORY_STRIP.map((cat) => (
            <button
              key={cat.label}
              type="button"
              onClick={() => navigate(`/thuc-don?category=${encodeURIComponent(cat.label)}`)}
              className="group flex flex-col items-center gap-2.5 focus-visible:outline-none"
            >
              <div
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center border border-[#8A5036]/15 shadow-xs transition-transform duration-200 group-hover:-translate-y-1 group-hover:shadow-md"
                style={{ backgroundColor: cat.bg, color: cat.color }}
              >
                {cat.icon}
              </div>
              <span className="text-sm font-semibold text-[#5A2E1C] group-hover:text-[#C4535A] transition-colors">
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* 3. MÓN BÁN CHẠY (CAROUSEL NGANG) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#C4535A]">
              Được yêu thích nhất
            </p>
            <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#914F1E]">
              Món bán chạy tại JeJi
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => scrollBestsellers('left')}
              aria-label="Cuộn sang trái"
              className="w-9 h-9 rounded-xl border border-[#8A5036]/20 bg-white/80 hover:bg-[#FCE8D5] flex items-center justify-center text-[#5A2E1C] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => scrollBestsellers('right')}
              aria-label="Cuộn sang phải"
              className="w-9 h-9 rounded-xl border border-[#8A5036]/20 bg-white/80 hover:bg-[#FCE8D5] flex items-center justify-center text-[#5A2E1C] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          ref={bestsellerTrackRef}
          className="flex gap-5 overflow-x-auto pb-3 snap-x snap-mandatory scroll-smooth"
        >
          {bestsellers.map((product) => (
            <div key={product.product_id} className="w-[270px] sm:w-[290px] shrink-0 snap-start">
              <ProductCard product={product} onSelect={setSelectedProduct} />
            </div>
          ))}
        </div>
      </section>

      {/* 4. COMBO HÔM NAY (Gradient #F9D5D3 -> #FCE8D5, viền #EDB9B3) */}
      {activeCombos.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#C4535A]">
                Gợi ý tiết kiệm
              </p>
              <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#914F1E]">
                Combo hôm nay
              </h2>
            </div>
            <Link
              to="/uu-dai"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#9B3922] hover:text-[#C4535A] whitespace-nowrap"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activeCombos.map((combo) => {
              const parsed = parseComboItems(combo.items, products);
              const savings = getComboSavingsPercent(combo);
              return (
                <div
                  key={combo.combo_id}
                  className="combo-card-surface rounded-2xl border p-5 flex flex-col justify-between hover:shadow-[0_12px_28px_-10px_rgba(138,80,54,0.2)] transition-shadow"
                >
                  <div>
                    <div className="relative aspect-[16/10] rounded-xl overflow-hidden mb-4">
                      <ProductImage
                        src={combo.image_url}
                        alt={combo.name}
                        productId={combo.combo_id}
                        category="Combo"
                        className="w-full h-full"
                      />
                      {savings > 0 && (
                        <span className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded-lg bg-[#AA2B1D] text-white text-xs font-bold tabular-nums">
                          Tiết kiệm {savings}%
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
                          className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#8A5036]/95 hover:bg-[#B8434A] text-[#FBDB93] hover:text-white text-xs font-semibold shadow-md transition-colors"
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

                    <ul className="mt-3 space-y-1 text-xs text-[#5A2E1C] font-medium">
                      {parsed.map((item) => (
                        <li key={item.product_id}>
                          • {item.name} ×{item.quantity}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[#8A5036]/15 flex items-center justify-between gap-3">
                    <div>
                      <span className="block text-xs text-[#6F3F2A] line-through tabular-nums">
                        {formatVND(combo.original_price)}
                      </span>
                      <span className="text-lg font-bold text-[#AA2B1D] tabular-nums">
                        {formatVND(combo.combo_price)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        addComboToCart(combo, products, 1);
                        showToast(`Đã thêm ${combo.name} vào giỏ`);
                        openDrawer();
                      }}
                      className="px-4 py-2.5 rounded-xl btn-rose-gradient text-xs font-semibold transition-all whitespace-nowrap"
                    >
                      Thêm combo
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 5. CÂU CHUYỆN THƯƠNG HIỆU & 3 GIÁ TRỊ CỐT LÕI (Nền nâu sữa #8A5036) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="rounded-3xl bg-[#8A5036] text-[#FFF4EA] p-8 sm:p-12 lg:p-14 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center shadow-md">
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center gap-3.5">
              <BrandLogo
                size="lg"
                cropped={false}
                className="shadow-md border-2 border-[#FBDB93]/45"
              />
              <p className="text-xs font-semibold uppercase tracking-wider text-[#FFC4BE]">
                Khoảnh khắc JeJi · Vĩnh Yên, Phú Thọ
              </p>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl font-bold leading-snug text-[#FBDB93]">
              Một ly cà phê — Một khoảnh khắc Jeji
            </h2>
            <p className="text-sm sm:text-base text-[#FFF4EA]/90 leading-relaxed">
              Sinh ra từ nhịp sống bình yên của Vĩnh Yên, JeJi Coffee mong muốn trở thành góc dừng
              chân ấm áp để bạn thưởng thức một ly cà phê muối đậm vị, trò chuyện cùng bạn bè hay
              tập trung cho một ngày làm việc nhiều cảm hứng.
            </p>
            <div className="pt-2">
              <Link
                to="/ve-jeji"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#FBDB93] hover:underline"
              >
                <span>Đọc câu chuyện của JeJi</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-white/10 border border-[#FBDB93]/25 space-y-2.5">
              <Flame className="w-6 h-6 text-[#FBDB93]" />
              <h3 className="font-display text-lg font-semibold text-[#FBDB93]">
                Pha chế mỗi ngày
              </h3>
              <p className="text-xs sm:text-sm text-[#FFF4EA]/85 leading-relaxed">
                Cốt phin ủ mới hằng sáng, lớp kem muối và trân châu nấu theo mẻ nhỏ để luôn giữ trọn
                độ thơm ngon.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/10 border border-[#FBDB93]/25 space-y-2.5">
              <Sparkles className="w-6 h-6 text-[#FBDB93]" />
              <h3 className="font-display text-lg font-semibold text-[#FBDB93]">
                Nguyên liệu tươi
              </h3>
              <p className="text-xs sm:text-sm text-[#FFF4EA]/85 leading-relaxed">
                Cam tươi vắt nguyên chất, bơ sáp chín tự nhiên, đào giòn và bánh thủ công không chất
                bảo quản.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white/10 border border-[#FBDB93]/25 space-y-2.5">
              <HeartHandshake className="w-6 h-6 text-[#FBDB93]" />
              <h3 className="font-display text-lg font-semibold text-[#FBDB93]">
                Không gian ấm cúng
              </h3>
              <p className="text-xs sm:text-sm text-[#FFF4EA]/85 leading-relaxed">
                Ánh đèn vàng trầm dịu, bàn gỗ mộc mạc và âm nhạc vừa đủ để bạn thoải mái làm việc hay
                hẹn hò.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. MÃ ƯU ĐÃI DẠNG THẺ COUPON (Nền #FBE3E0 --pink-bg) */}
      {validDiscounts.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="rounded-3xl bg-[#FBE3E0] border border-[#EDB9B3] p-6 sm:p-8 lg:p-10">
            <div className="flex items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#C4535A]">
                  Dành riêng cho đơn đặt online
                </p>
                <h2 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#914F1E]">
                  Mã ưu đãi đang mở
                </h2>
              </div>
              <Link
                to="/uu-dai"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#9B3922] hover:text-[#C4535A] whitespace-nowrap"
              >
                <span>Điều kiện chi tiết</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {validDiscounts.map((discount) => (
                <div
                  key={discount.code}
                  className="rounded-2xl bg-[#FFF4EA] border border-[#EDB9B3] p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-base font-bold text-[#AA2B1D] tracking-wide">
                        {discount.code}
                      </span>
                      <span className="text-xs text-[#6F3F2A] tabular-nums">
                        Còn {Math.max(0, discount.usage_limit - discount.used_count)} lượt
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-[#5A2E1C] leading-relaxed">
                      {discount.description}
                    </p>
                    <p className="mt-2 text-xs text-[#6F3F2A]">
                      HSD: {formatDateShortVN(discount.end_date)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopyCoupon(discount.code)}
                    className="mt-4 w-full py-2.5 px-3 rounded-xl btn-rose-gradient text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Sao chép mã
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Modal chọn món */}
      <ProductModal
        product={selectedProduct}
        allProducts={products}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
};
