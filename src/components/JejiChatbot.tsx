import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { STORE_CONFIG, formatStoreField } from '../config/store';
import { useCart } from '../hooks/useCart';
import { useCatalog } from '../hooks/useCatalog';
import { useToast } from '../hooks/useToast';
import { Product } from '../types';
import { getComboSavingsPercent, isComboActive, parseComboItems } from '../utils/combo';
import { isDiscountCurrentlyValid } from '../utils/discount';
import { formatVND } from '../utils/format';
import { BrandLogo } from './BrandLogo';
import { ProductImage } from './ProductImage';
import { ProductModal } from './ProductModal';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  productIds?: string[];
  comboIds?: string[];
  couponCode?: string;
  isError?: boolean;
}

const STARTER_PROMPTS = [
  'Món bán chạy ít ngọt?',
  'Combo tiết kiệm hôm nay?',
  'Mã giảm giá & freeship?',
  'Giờ mở cửa & địa chỉ quán?',
];

const INITIAL_WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Chào bạn! Mình là **Bé Ly JeJi** — linh vật ly cà phê nhỏ của JeJi Coffee. Bạn muốn tìm món **ít ngọt**, **không caffeine**, **combo tiết kiệm** hay **mã giảm giá** hôm nay nhỉ?',
  productIds: ['SP001', 'SP006'],
};

function renderInlineBold(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-[#5A2E1C]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function FormattedReply({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5 text-[13px] leading-relaxed text-[#5A2E1C]">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
          return (
            <div key={i} className="flex items-start gap-1.5">
              <span className="text-[#C4535A] font-bold mt-[1px]">•</span>
              <span>{renderInlineBold(trimmed.slice(2))}</span>
            </div>
          );
        }
        return <p key={i}>{renderInlineBold(trimmed)}</p>;
      })}
    </div>
  );
}

export const JejiChatbot: React.FC = () => {
  const { pathname } = useLocation();
  const { products, combos } = useCatalog();
  const { discounts, addComboToCart, setAppliedCode, openDrawer } = useCart();
  const { showToast } = useToast();

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastFailedText, setLastFailedText] = useState<string | null>(null);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);

  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const activeCombos = useMemo(() => combos.filter((c) => isComboActive(c)), [combos]);
  const validDiscounts = useMemo(
    () => discounts.filter((d) => isDiscountCurrentlyValid(d)),
    [discounts]
  );

  const catalogContext = useMemo(
    () => ({
      products: products.map((p) => ({
        product_id: p.product_id,
        name: p.name,
        category: p.category,
        description: p.description,
        price_m: p.price_m,
        price_l: p.price_l,
        is_bestseller: p.is_bestseller,
        is_available: p.is_available,
      })),
      combos: activeCombos.map((c) => ({
        combo_id: c.combo_id,
        name: c.name,
        description: c.description,
        combo_price: c.combo_price,
        original_price: c.original_price,
        items_summary: parseComboItems(c.items, products)
          .map((i) => `${i.name} x${i.quantity}`)
          .join(', '),
      })),
      discounts: validDiscounts.map((d) => ({
        code: d.code,
        description: d.description,
        type: d.type,
        min_order: d.min_order,
        max_discount: d.max_discount,
      })),
      store: {
        name: STORE_CONFIG.store_name,
        slogan: STORE_CONFIG.slogan,
        address: `${formatStoreField(STORE_CONFIG.address)}, ${STORE_CONFIG.district_city}`,
        hours: `${STORE_CONFIG.open_time} – ${STORE_CONFIG.close_time} hằng ngày`,
      },
    }),
    [products, activeCombos, validDiscounts]
  );

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 60);
    return () => clearTimeout(timer);
  }, [messages, loading, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => inputRef.current?.focus(), 140);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !modalProduct) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen, modalProduct]);

  if (pathname.startsWith('/admin')) {
    return null;
  }

  const sendMessage = async (textToSend: string, isRetry = false) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    setLastFailedText(null);
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: trimmed,
    };

    const baseHistory = isRetry
      ? messages.filter((m) => !m.isError)
      : [...messages.filter((m) => !m.isError), userMsg];

    if (!isRetry) {
      setMessages((prev) => [...prev.filter((m) => !m.isError), userMsg]);
      setInput('');
    } else {
      setMessages((prev) => prev.filter((m) => !m.isError));
    }

    setLoading(true);
    try {
      const apiMessages = baseHistory
        .filter((m) => m.id !== 'welcome')
        .map((m) => ({
          role: m.role,
          content: m.content,
        }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          catalogContext,
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        reply?: string;
        productIds?: string[];
        comboIds?: string[];
        couponCode?: string;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(
          data.error || 'Bé Ly JeJi đang bận một chút, bạn vui lòng thử lại sau nhé.'
        );
      }

      const botMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content:
          data.reply || 'Mình đã ghi nhận câu hỏi của bạn, bạn nhắn thêm chi tiết giúp JeJi nha!',
        productIds: Array.isArray(data.productIds) ? data.productIds : [],
        comboIds: Array.isArray(data.comboIds) ? data.comboIds : [],
        couponCode: typeof data.couponCode === 'string' ? data.couponCode : '',
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Không thể kết nối tới trợ lý JeJi lúc này. Bạn thử lại nhé!';
      setLastFailedText(trimmed);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: msg,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleResetChat = () => {
    setMessages([INITIAL_WELCOME]);
    setLastFailedText(null);
    setInput('');
  };

  const handleApplyCoupon = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setAppliedCode(code);
    showToast(`Đã sao chép & áp dụng mã ${code}`);
    openDrawer();
  };

  const showStarterChips = messages.length <= 2 && !loading;

  return (
    <>
      <div className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-40 flex flex-col items-end gap-3">
        <AnimatePresence>
          {isOpen && (
            <motion.section
              role="dialog"
              aria-label="Trò chuyện cùng Bé Ly JeJi"
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="w-[calc(100vw-2rem)] sm:w-[400px] h-[min(560px,74vh)] rounded-[24px] bg-[#FFFDF8] border border-[#EDB9B3] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header mang bản sắc logo JeJi */}
              <div
                className="px-4 py-3.5 border-b border-[#EDB9B3]/80 flex items-center justify-between gap-3 shrink-0"
                style={{
                  background: 'linear-gradient(135deg, #F9D5D3 0%, #FCE8D5 100%)',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <BrandLogo
                    size="sm"
                    cropped={false}
                    className="shadow-xs border-[#D4606A]/40"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-display text-base font-bold text-[#7A3B26] truncate">
                        Bé Ly JeJi
                      </h2>
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[#8A5036] text-[#FBDB93] text-[10px] font-bold">
                        <Sparkles className="w-2.5 h-2.5" />
                        AI
                      </span>
                    </div>
                    <p className="text-[11px] text-[#6F3F2A] truncate">
                      Tư vấn thực đơn, combo &amp; ưu đãi JeJi
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleResetChat}
                    title="Làm mới cuộc trò chuyện"
                    aria-label="Làm mới cuộc trò chuyện"
                    className="w-8 h-8 rounded-xl bg-white/70 hover:bg-white text-[#5A2E1C] flex items-center justify-center transition-colors"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    title="Đóng trợ lý"
                    aria-label="Đóng Bé Ly JeJi"
                    className="w-8 h-8 rounded-xl bg-white/70 hover:bg-white text-[#5A2E1C] flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Nội dung tin nhắn */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[#FFF4EA]/55">
                {messages.map((msg) => {
                  const isUser = msg.role === 'user';
                  const recommendedProducts = !isUser && msg.productIds?.length
                    ? msg.productIds
                        .map((id) => products.find((p) => p.product_id === id && p.category !== 'Topping'))
                        .filter((p): p is Product => Boolean(p))
                    : [];
                  const recommendedCombos = !isUser && msg.comboIds?.length
                    ? msg.comboIds
                        .map((id) => activeCombos.find((c) => c.combo_id === id))
                        .filter((c): c is NonNullable<typeof c> => Boolean(c))
                    : [];
                  const validCoupon =
                    !isUser && msg.couponCode
                      ? validDiscounts.find(
                          (d) => d.code.toUpperCase() === msg.couponCode?.toUpperCase()
                        )
                      : undefined;

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isUser && (
                        <BrandLogo
                          size="xs"
                          cropped={false}
                          className="rounded-xl border-[#EDB9B3] mb-0.5"
                        />
                      )}

                      <div
                        className={`max-w-[82%] space-y-2.5 ${
                          isUser ? 'items-end flex flex-col' : ''
                        }`}
                      >
                        <div
                          className={
                            isUser
                              ? 'px-3.5 py-2.5 rounded-2xl rounded-br-sm bg-[#8A5036] text-[#FFF4EA] text-[13px] leading-relaxed shadow-xs'
                              : msg.isError
                              ? 'px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-[#FBE3E0] border border-[#D4606A]/45 text-[#AA2B1D] text-[13px] leading-relaxed'
                              : 'px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-[#FFFDF8] border border-[#EDB9B3]/80 shadow-xs'
                          }
                        >
                          {isUser ? (
                            <p>{msg.content}</p>
                          ) : msg.isError ? (
                            <div className="space-y-2">
                              <p>{msg.content}</p>
                              {lastFailedText && (
                                <button
                                  type="button"
                                  onClick={() => sendMessage(lastFailedText, true)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#AA2B1D] text-white text-xs font-semibold hover:brightness-110"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>Thử lại</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <FormattedReply text={msg.content} />
                          )}
                        </div>

                        {/* Thẻ gợi ý món bấm chọn nhanh */}
                        {recommendedProducts.length > 0 && (
                          <div className="space-y-1.5 w-full">
                            {recommendedProducts.map((p) => (
                              <div
                                key={p.product_id}
                                className="flex items-center gap-2.5 p-2 rounded-2xl bg-[#FFFDF8] border border-[#EDB9B3]/80 shadow-xs"
                              >
                                <ProductImage
                                  src={p.image_url}
                                  alt={p.name}
                                  productId={p.product_id}
                                  category={p.category}
                                  size="sm"
                                  className="w-11 h-11 rounded-xl shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-[#5A2E1C] truncate">
                                    {p.name}
                                  </p>
                                  <p className="text-[11px] font-semibold text-[#C4535A] tabular-nums">
                                    {formatVND(p.price_m)}
                                    {p.price_l !== null && ` – ${formatVND(p.price_l)}`}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  disabled={!p.is_available}
                                  onClick={() => setModalProduct(p)}
                                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-semibold whitespace-nowrap transition-all ${
                                    p.is_available
                                      ? 'btn-rose-gradient'
                                      : 'bg-[#8A5036]/15 text-[#6F3F2A]/60 cursor-not-allowed'
                                  }`}
                                >
                                  {p.is_available ? 'Chọn món' : 'Tạm hết'}
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Thẻ gợi ý combo */}
                        {recommendedCombos.length > 0 && (
                          <div className="space-y-1.5 w-full">
                            {recommendedCombos.map((c) => {
                              const savings = getComboSavingsPercent(c);
                              return (
                                <div
                                  key={c.combo_id}
                                  className="p-2.5 rounded-2xl combo-card-surface border flex items-center justify-between gap-2.5"
                                >
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <p className="text-xs font-bold text-[#5A2E1C] truncate">
                                        {c.name}
                                      </p>
                                      {savings > 0 && (
                                        <span className="px-1.5 py-0.5 rounded bg-[#AA2B1D] text-white text-[10px] font-bold shrink-0">
                                          -{savings}%
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] font-bold text-[#AA2B1D] tabular-nums mt-0.5">
                                      {formatVND(c.combo_price)}{' '}
                                      <span className="line-through font-normal text-[#6F3F2A]">
                                        {formatVND(c.original_price)}
                                      </span>
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      addComboToCart(c, products, 1);
                                      showToast(`Đã thêm ${c.name} vào giỏ`);
                                      openDrawer();
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl btn-rose-gradient text-[11px] font-semibold shrink-0"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Thêm combo</span>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Chip mã giảm giá */}
                        {validCoupon && (
                          <button
                            type="button"
                            onClick={() => handleApplyCoupon(validCoupon.code)}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#FBE3E0] hover:bg-[#F9D5D3] border border-[#D4606A]/50 text-xs font-semibold text-[#AA2B1D] transition-colors"
                          >
                            <Tag className="w-3.5 h-3.5" />
                            <span>Áp mã {validCoupon.code}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Gợi ý nhanh khi mới mở chat */}
                {showStarterChips && (
                  <div className="pt-1 flex flex-wrap gap-1.5">
                    {STARTER_PROMPTS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => sendMessage(q)}
                        className="px-3 py-1.5 rounded-xl bg-[#FCE8D5] hover:bg-[#F9D5D3] border border-[#EDB9B3] text-xs font-medium text-[#5A2E1C] transition-colors text-left"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                {/* Trạng thái đang trả lời */}
                {loading && (
                  <div className="flex items-end gap-2">
                    <BrandLogo
                      size="xs"
                      cropped={false}
                      className="rounded-xl border-[#EDB9B3]"
                    />
                    <div className="px-3.5 py-2.5 rounded-2xl rounded-bl-sm bg-[#FFFDF8] border border-[#EDB9B3]/80 text-xs text-[#6F3F2A] flex items-center gap-2">
                      <span className="inline-flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#C4535A] animate-bounce" />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[#C4535A] animate-bounce"
                          style={{ animationDelay: '120ms' }}
                        />
                        <span
                          className="w-1.5 h-1.5 rounded-full bg-[#C4535A] animate-bounce"
                          style={{ animationDelay: '240ms' }}
                        />
                      </span>
                      <span>Bé Ly JeJi đang pha câu trả lời...</span>
                    </div>
                  </div>
                )}

                <div ref={scrollEndRef} />
              </div>

              {/* Thanh nhập tin nhắn */}
              <form
                onSubmit={handleSubmit}
                className="p-3 bg-[#FFFDF8] border-t border-[#EDB9B3]/70 flex items-center gap-2 shrink-0"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Hỏi Bé Ly JeJi về đồ uống, ưu đãi..."
                  aria-label="Nhập câu hỏi cho Bé Ly JeJi"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/20 text-xs sm:text-sm text-[#5A2E1C] placeholder:text-[#6F3F2A]/60 focus:outline-none focus:border-[#8A5036]"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  aria-label="Gửi tin nhắn"
                  className="w-10 h-10 rounded-xl btn-rose-gradient flex items-center justify-center shrink-0 disabled:opacity-50 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Nút mở chatbot hình linh vật logo JeJi */}
        <motion.button
          type="button"
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setIsOpen((v) => !v)}
          aria-label={isOpen ? 'Thu gọn trợ lý Bé Ly JeJi' : 'Mở trợ lý AI Bé Ly JeJi'}
          aria-expanded={isOpen}
          className="group relative flex items-center gap-2.5 p-1.5 sm:pr-4 rounded-2xl bg-[#FCE8D5] hover:bg-[#F9D5D3] border-2 border-[#D4606A]/70 shadow-[0_12px_28px_-8px_rgba(138,80,54,0.4)] transition-colors"
        >
          <div className="relative">
            <BrandLogo size="sm" cropped={false} className="w-11 h-11 rounded-xl border-[#D4606A]/40" />
            <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-md bg-[#B8434A] text-white text-[9px] font-bold tracking-wider shadow-xs">
              AI
            </span>
          </div>
          <div className="hidden sm:block text-left">
            <p className="font-display text-xs font-bold text-[#7A3B26] leading-tight">
              Hỏi Bé Ly JeJi
            </p>
            <p className="text-[10px] font-medium text-[#C4535A]">Gợi ý món &amp; ưu đãi</p>
          </div>
        </motion.button>
      </div>

      {/* Modal chọn món trực tiếp từ thẻ gợi ý của chatbot */}
      <ProductModal
        product={modalProduct}
        allProducts={products}
        onClose={() => setModalProduct(null)}
      />
    </>
  );
};
