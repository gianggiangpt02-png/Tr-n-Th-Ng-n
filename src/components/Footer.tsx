import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, ExternalLink, MapPin, MessageCircle, Phone, Share2 } from 'lucide-react';
import {
  STORE_CONFIG,
  formatStoreField,
  getStoreFullAddress,
  isPlaceholderValue,
} from '../config/store';
import { BrandLogo } from './BrandLogo';
import { LeafletMapPicker } from './LeafletMapPicker';

export const Footer: React.FC = () => {
  const fullAddress = getStoreFullAddress();
  const hotlineText = formatStoreField(STORE_CONFIG.hotline);
  const hasHotline = !isPlaceholderValue(STORE_CONFIG.hotline);
  const hasFacebook = !isPlaceholderValue(STORE_CONFIG.facebook_url);
  const hasZalo = !isPlaceholderValue(STORE_CONFIG.zalo_url);
  const hasGoogleEmbed = !isPlaceholderValue(STORE_CONFIG.google_maps_embed);

  const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${STORE_CONFIG.store_name} ${fullAddress}`
  )}`;

  return (
    <footer className="bg-[#8A5036] text-[#FFF4EA] border-t border-[#FBDB93]/20 pb-20 md:pb-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Cột 1: Thương hiệu */}
          <div className="space-y-4">
            <Link
              to="/"
              className="inline-flex items-center gap-3 font-display text-2xl font-bold hover:opacity-90 transition-opacity"
            >
              <BrandLogo size="lg" cropped={false} className="shadow-sm border-[#FBDB93]/40" />
              <span>
                <span className="text-[#FBDB93]">Je</span>
                <span className="text-[#FFC4BE]">Ji</span>
                <span className="text-[#FBDB93]"> Coffee</span>
              </span>
            </Link>
            <p className="text-sm text-[#FFF4EA]/85 leading-relaxed">
              {STORE_CONFIG.slogan}. Không gian cà phê ấm cúng tại {fullAddress} — nơi mỗi tách cà
              phê được ủ tỉ mỉ mỗi sáng.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              {hasZalo && (
                <a
                  href={STORE_CONFIG.zalo_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-[#FBDB93] hover:text-[#5A2E1C] text-xs font-medium transition-colors tabular-nums"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Zalo: {hotlineText}
                </a>
              )}

              {hasFacebook && (
                <a
                  href={STORE_CONFIG.facebook_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-[#FBDB93] hover:text-[#5A2E1C] text-xs font-medium transition-colors"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  Facebook
                </a>
              )}
            </div>
          </div>

          {/* Cột 2: Liên hệ & Giờ mở cửa */}
          <div className="space-y-3.5">
            <h3 className="font-display text-base font-semibold text-[#FBDB93]">
              Thông tin cửa hàng
            </h3>
            <ul className="space-y-3 text-sm text-[#FFF4EA]/90">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-[#FBDB93] shrink-0 mt-0.5" />
                <span>{fullAddress}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-[#FBDB93] shrink-0" />
                <span className="tabular-nums">
                  {STORE_CONFIG.open_time} – {STORE_CONFIG.close_time} (Hằng ngày)
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-[#FBDB93] shrink-0" />
                {hasHotline ? (
                  <a href={`tel:${hotlineText}`} className="hover:text-[#FBDB93] tabular-nums">
                    Hotline: {hotlineText}
                  </a>
                ) : (
                  <span className="text-[#FFF4EA]/75">Hotline: Đang cập nhật</span>
                )}
              </li>
              {hasZalo && (
                <li className="flex items-center gap-2.5">
                  <MessageCircle className="w-4 h-4 text-[#FBDB93] shrink-0" />
                  <a
                    href={STORE_CONFIG.zalo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-[#FBDB93] tabular-nums"
                  >
                    Zalo: {hotlineText}
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Cột 3: Liên kết nhanh */}
          <div className="space-y-3.5">
            <h3 className="font-display text-base font-semibold text-[#FBDB93]">Khám phá</h3>
            <ul className="space-y-2.5 text-sm text-[#FFF4EA]/85">
              <li>
                <Link to="/thuc-don" className="hover:text-[#FBDB93] transition-colors">
                  Thực đơn đồ uống &amp; bánh
                </Link>
              </li>
              <li>
                <Link to="/yeu-thich" className="hover:text-[#FBDB93] transition-colors">
                  Món yêu thích của bạn
                </Link>
              </li>
              <li>
                <Link to="/uu-dai" className="hover:text-[#FBDB93] transition-colors">
                  Combo tiết kiệm &amp; Mã giảm giá
                </Link>
              </li>
              <li>
                <Link to="/theo-doi" className="hover:text-[#FBDB93] transition-colors">
                  Tra cứu &amp; theo dõi đơn hàng
                </Link>
              </li>
              <li>
                <Link to="/tai-khoan" className="hover:text-[#FBDB93] transition-colors">
                  Tài khoản &amp; Điểm thưởng
                </Link>
              </li>
              <li>
                <Link to="/ve-jeji" className="hover:text-[#FBDB93] transition-colors">
                  Câu chuyện JeJi &amp; Hỏi đáp
                </Link>
              </li>
              <li>
                <Link to="/admin" className="text-[#FBDB93]/80 hover:text-[#FBDB93] transition-colors">
                  Quản trị cửa hàng (Demo)
                </Link>
              </li>
            </ul>
          </div>

          {/* Cột 4: Bản đồ vị trí quán */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-base font-semibold text-[#FBDB93]">Vị trí quán</h3>
              <Link to="/cua-hang" className="text-xs text-[#FBDB93] hover:underline">
                Xem chi tiết
              </Link>
            </div>
            {hasGoogleEmbed ? (
              <div className="rounded-2xl overflow-hidden border border-[#FBDB93]/30 bg-[#FCE8D5] shadow-sm">
                <iframe
                  title="Bản đồ vị trí JeJi Coffee"
                  src={STORE_CONFIG.google_maps_embed}
                  className="w-full h-40 border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ) : (
              <LeafletMapPicker
                centerLat={STORE_CONFIG.lat}
                centerLng={STORE_CONFIG.lng}
                markerLat={STORE_CONFIG.lat}
                markerLng={STORE_CONFIG.lng}
                interactive={false}
                heightClass="h-40"
              />
            )}
            <div className="flex items-center justify-between gap-2 text-xs text-[#FFF4EA]/85">
              <span className="truncate">{fullAddress}</span>
              <a
                href={googleMapsLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[#FBDB93] hover:underline shrink-0 font-medium"
              >
                <span>Mở Maps</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[#FBDB93]/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#FFF4EA]/75">
          <p>© {new Date().getFullYear()} JeJi Coffee. Một ly cà phê — Một khoảnh khắc Jeji.</p>
          <p>{fullAddress}</p>
        </div>
      </div>
    </footer>
  );
};
