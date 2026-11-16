import React, { useState } from 'react';
import { ChevronDown, Coffee, Heart, Leaf, Send } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { useToast } from '../hooks/useToast';

const FAQS = [
  {
    q: 'JeJi Coffee có hỗ trợ tùy chỉnh lượng đường, đá và thêm topping khi đặt online không?',
    a: 'Có. Khi bấm vào từng đồ uống trong Thực đơn, bạn có thể chọn Size M/L, mức đường (0%–100%), mức đá, thêm topping trân châu và ghi chú riêng cho từng ly.',
  },
  {
    q: 'Phí giao hàng được tính như thế nào?',
    a: 'Phí giao hàng được tính tự động theo khoảng cách thực tế từ quán đến vị trí bạn ghim trên bản đồ OpenStreetMap. Bạn cũng có thể áp dụng mã FREESHIP cho đơn từ 60.000đ.',
  },
  {
    q: 'Tôi có thể đặt trước rồi ghé quán lấy không?',
    a: 'Hoàn toàn được. Tại bước Thanh toán, bạn chọn hình thức "Đến quán lấy" để được miễn phí vận chuyển 0đ và chọn khung giờ ghé nhận mong muốn.',
  },
  {
    q: 'Bánh ngọt của quán có làm mới hằng ngày không?',
    a: 'Bánh tiramisu và bánh mousse chanh leo tại JeJi được làm thủ công theo mẻ nhỏ mỗi sáng để giữ độ mềm mịn và vị thanh nhẹ tự nhiên.',
  },
];

export const AboutPage: React.FC = () => {
  const { showToast } = useToast();
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [message, setMessage] = useState('');

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      showToast('Vui lòng nhập tên và nội dung góp ý', 'error');
      return;
    }
    showToast('Cảm ơn bạn đã gửi góp ý cho JeJi Coffee!');
    setName('');
    setContact('');
    setMessage('');
  };

  return (
    <div className="pb-16">
      <section className="bg-[#8A5036] text-[#FFF4EA] py-12 px-4 sm:px-6 border-b border-[#FBDB93]/20">
        <div className="max-w-4xl mx-auto text-center space-y-3">
          <BrandLogo
            size="lg"
            cropped={false}
            className="mx-auto shadow-md border-2 border-[#FBDB93]/50"
          />
          <p className="text-xs font-semibold uppercase tracking-wider text-[#FBDB93]">
            Câu chuyện thương hiệu
          </p>
          <h1 className="font-display text-3xl sm:text-5xl font-bold text-[#FFF4EA]">
            Một ly cà phê — Một khoảnh khắc Jeji
          </h1>
          <p className="text-sm sm:text-base text-[#FFF4EA]/85 max-w-2xl mx-auto leading-relaxed">
            Tại Vĩnh Yên, Phú Thọ, JeJi Coffee được tạo nên từ mong muốn giữ lại những khoảng lặng
            ấm áp giữa nhịp sống bận rộn — nơi hương cà phê phin truyền thống hòa quyện cùng sự
            tinh tế hiện đại.
          </p>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-12 space-y-14">
        {/* Cam kết chất lượng */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-3xl bg-[#FFFDF8] border border-[#8A5036]/15 space-y-3">
            <Coffee className="w-7 h-7 text-[#914F1E]" />
            <h2 className="font-display text-xl font-bold text-[#914F1E]">Hạt rang mộc chuẩn vị</h2>
            <p className="text-sm text-[#5A2E1C] leading-relaxed">
              Tuyển chọn hạt Robusta & Arabica phối trộn cân bằng, giữ hậu vị ngọt dịu và hương
              thơm tự nhiên.
            </p>
          </div>
          <div className="p-6 rounded-3xl bg-[#FFFDF8] border border-[#8A5036]/15 space-y-3">
            <Leaf className="w-7 h-7 text-[#5F8A56]" />
            <h2 className="font-display text-xl font-bold text-[#914F1E]">Trái cây theo mùa</h2>
            <p className="text-sm text-[#5A2E1C] leading-relaxed">
              Cam tươi, bơ sáp, xoài chín và sả tươi được sơ chế sạch mỗi ngày, nói không với hương
              liệu gắt.
            </p>
          </div>
          <div className="p-6 rounded-3xl bg-[#FFFDF8] border border-[#8A5036]/15 space-y-3">
            <Heart className="w-7 h-7 text-[#D4606A]" />
            <h2 className="font-display text-xl font-bold text-[#914F1E]">Tận tâm từng ly</h2>
            <p className="text-sm text-[#5A2E1C] leading-relaxed">
              Dù bạn thưởng thức tại quán hay đặt giao về nhà, mỗi ly đồ uống đều được đóng gói
              cẩn thận giữ trọn nhiệt độ.
            </p>
          </div>
        </section>

        {/* FAQ Accordion - nền --peach-bg #FCEBD6 */}
        <section className="rounded-3xl bg-[#FCEBD6] border border-[#8A5036]/15 p-6 sm:p-8 space-y-4">
          <h2 className="font-display text-2xl font-bold text-[#914F1E]">Câu hỏi thường gặp</h2>
          <div className="space-y-3">
            {FAQS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={item.q}
                  className="rounded-2xl bg-[#FFFDF8] border border-[#8A5036]/14 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="w-full px-6 py-4 text-left flex items-center justify-between gap-4 font-semibold text-sm sm:text-base text-[#5A2E1C] hover:bg-[#FFF4EA] transition-colors"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`w-4 h-4 shrink-0 text-[#914F1E] transition-transform ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-sm text-[#6F3F2A] leading-relaxed border-t border-[#8A5036]/10 pt-3">
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Form góp ý / liên hệ */}
        <section className="rounded-3xl bg-[#FFFDF8] border border-[#8A5036]/15 p-6 sm:p-8">
          <h2 className="font-display text-2xl font-bold text-[#914F1E]">Gửi lời nhắn cho JeJi</h2>
          <p className="mt-1 text-sm text-[#6F3F2A]">
            Mọi góp ý về hương vị đồ uống hoặc trải nghiệm đặt hàng đều giúp JeJi phục vụ bạn tốt
            hơn mỗi ngày.
          </p>

          <form onSubmit={handleFeedbackSubmit} className="mt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="fb-name" className="block text-xs font-semibold text-[#5A2E1C] mb-1.5">
                  Tên của bạn *
                </label>
                <input
                  id="fb-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nhập họ tên"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/20 text-sm text-[#5A2E1C] focus:outline-none focus:border-[#8A5036]"
                />
              </div>
              <div>
                <label htmlFor="fb-contact" className="block text-xs font-semibold text-[#5A2E1C] mb-1.5">
                  Số điện thoại / Email (không bắt buộc)
                </label>
                <input
                  id="fb-contact"
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Để JeJi liên hệ phản hồi"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/20 text-sm text-[#5A2E1C] focus:outline-none focus:border-[#8A5036]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="fb-msg" className="block text-xs font-semibold text-[#5A2E1C] mb-1.5">
                Nội dung góp ý *
              </label>
              <textarea
                id="fb-msg"
                rows={3}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Chia sẻ cảm nhận của bạn..."
                className="w-full px-4 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/20 text-sm text-[#5A2E1C] focus:outline-none focus:border-[#8A5036]"
              />
            </div>

            <button
              type="submit"
              className="btn-rose-gradient inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span>Gửi góp ý</span>
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};
