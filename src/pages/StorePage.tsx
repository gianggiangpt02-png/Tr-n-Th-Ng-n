import React, { useState } from 'react';
import {
  Clock,
  ExternalLink,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Share2,
} from 'lucide-react';
import { LeafletMapPicker } from '../components/LeafletMapPicker';
import {
  STORE_CONFIG,
  formatStoreField,
  getStoreFullAddress,
  isPlaceholderValue,
} from '../config/store';
import { isStoreOpenNow } from '../utils/format';

export const StorePage: React.FC = () => {
  const { isOpen, currentTimeLabel } = isStoreOpenNow(
    STORE_CONFIG.open_time,
    STORE_CONFIG.close_time
  );

  const fullAddress = getStoreFullAddress();
  const hotline = formatStoreField(STORE_CONFIG.hotline);
  const hasHotline = !isPlaceholderValue(STORE_CONFIG.hotline);
  const hasFacebook = !isPlaceholderValue(STORE_CONFIG.facebook_url);
  const hasZalo = !isPlaceholderValue(STORE_CONFIG.zalo_url);
  const hasGoogleEmbed = !isPlaceholderValue(STORE_CONFIG.google_maps_embed);

  const [mapView, setMapView] = useState<'google' | 'osm'>(
    hasGoogleEmbed ? 'google' : 'osm'
  );

  const googleDirectionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${STORE_CONFIG.store_name} ${fullAddress}`
  )}`;

  return (
    <div className="pb-16">
      <section className="bg-[#8A5036] text-[#FFF4EA] py-10 px-4 sm:px-6 border-b border-[#FBDB93]/20">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-wider text-[#FBDB93]">
            Điểm hẹn cà phê tại {fullAddress}
          </p>
          <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold text-[#FFF4EA]">
            Cửa hàng JeJi Coffee
          </h1>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Thông tin quán */}
        <div className="lg:col-span-5 rounded-3xl bg-[#FFFDF8] border border-[#8A5036]/15 p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-[#8A5036]/12">
            <div>
              <h2 className="font-display text-2xl font-bold text-[#914F1E]">
                {STORE_CONFIG.store_name}
              </h2>
              <p className="text-xs text-[#6F3F2A] mt-0.5">{fullAddress}</p>
            </div>
            <span
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap ${
                isOpen ? 'bg-[#5F8A56] text-[#FFF4EA]' : 'bg-[#AA2B1D] text-[#FFF4EA]'
              }`}
            >
              {isOpen ? 'Đang mở cửa' : 'Đã đóng cửa'} · {currentTimeLabel}
            </span>
          </div>

          <div className="space-y-4 text-sm text-[#5A2E1C]">
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-[#914F1E] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Địa chỉ</p>
                <p className="text-[#6F3F2A] mt-0.5">{fullAddress}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-[#914F1E] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Giờ mở cửa</p>
                <p className="text-[#6F3F2A] mt-0.5 tabular-nums">
                  {STORE_CONFIG.open_time} – {STORE_CONFIG.close_time} (Thứ 2 – Chủ nhật)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-[#914F1E] shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Hotline đặt bàn &amp; hỗ trợ</p>
                {hasHotline ? (
                  <a
                    href={`tel:${hotline}`}
                    className="text-[#C4535A] font-semibold hover:underline mt-0.5 inline-block tabular-nums"
                  >
                    {hotline}
                  </a>
                ) : (
                  <p className="text-[#6F3F2A] mt-0.5 tabular-nums">{hotline}</p>
                )}
              </div>
            </div>

            {hasZalo && (
              <div className="flex items-start gap-3">
                <MessageCircle className="w-5 h-5 text-[#914F1E] shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Zalo cửa hàng</p>
                  <a
                    href={STORE_CONFIG.zalo_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#C4535A] font-semibold hover:underline mt-0.5 inline-block tabular-nums"
                  >
                    {hotline}
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Nút hành động */}
          <div className="pt-4 border-t border-[#8A5036]/12 flex flex-wrap gap-3">
            <a
              href={googleDirectionsUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-rose-gradient inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-xs"
            >
              <Navigation className="w-4 h-4" />
              <span>Chỉ đường Google Maps</span>
            </a>

            {hasHotline && (
              <a
                href={`tel:${hotline}`}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#8A5036] hover:bg-[#6F3F2A] text-[#FBDB93] text-xs font-semibold transition-colors tabular-nums"
              >
                <Phone className="w-4 h-4" />
                <span>Gọi {hotline}</span>
              </a>
            )}

            {hasZalo && (
              <a
                href={STORE_CONFIG.zalo_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#8A5036]/25 text-[#5A2E1C] text-xs font-semibold hover:bg-[#FCE8D5] tabular-nums"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Zalo {hotline}</span>
              </a>
            )}

            {hasFacebook && (
              <a
                href={STORE_CONFIG.facebook_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#8A5036]/25 text-[#5A2E1C] text-xs font-semibold hover:bg-[#FCE8D5]"
              >
                <Share2 className="w-4 h-4" />
                <span>Facebook</span>
              </a>
            )}
          </div>
        </div>

        {/* Bản đồ quán */}
        <div className="lg:col-span-7 rounded-3xl bg-[#FFFDF8] border border-[#8A5036]/15 p-4 sm:p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div>
              <h2 className="font-display text-lg font-bold text-[#914F1E]">
                Bản đồ vị trí quán JeJi Coffee
              </h2>
              <p className="text-xs text-[#6F3F2A]">{fullAddress}</p>
            </div>

            <div className="flex items-center gap-2">
              {hasGoogleEmbed && (
                <div className="inline-flex p-1 rounded-xl bg-[#FCE8D5] border border-[#EDB9B3]">
                  <button
                    type="button"
                    onClick={() => setMapView('google')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      mapView === 'google'
                        ? 'bg-[#8A5036] text-[#FBDB93]'
                        : 'text-[#5A2E1C] hover:bg-white/60'
                    }`}
                  >
                    Google Maps
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapView('osm')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                      mapView === 'osm'
                        ? 'bg-[#8A5036] text-[#FBDB93]'
                        : 'text-[#5A2E1C] hover:bg-white/60'
                    }`}
                  >
                    OpenStreetMap
                  </button>
                </div>
              )}

              <a
                href={googleDirectionsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#8A5036]/20 bg-[#FFF4EA] hover:bg-[#FCE8D5] text-xs font-semibold text-[#5A2E1C]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Mở Maps</span>
              </a>
            </div>
          </div>

          {hasGoogleEmbed && mapView === 'google' ? (
            <iframe
              title="Bản đồ Google Maps JeJi Coffee — Liên Bảo, Phường Vĩnh Yên, Phú Thọ"
              src={STORE_CONFIG.google_maps_embed}
              className="w-full h-[420px] rounded-2xl border border-[#8A5036]/15 bg-[#FCE8D5]/40"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          ) : (
            <LeafletMapPicker
              centerLat={STORE_CONFIG.lat}
              centerLng={STORE_CONFIG.lng}
              markerLat={STORE_CONFIG.lat}
              markerLng={STORE_CONFIG.lng}
              interactive={false}
              heightClass="h-[420px]"
            />
          )}

          <p className="text-xs text-[#6F3F2A] px-1">
            Vị trí: <strong>{fullAddress}</strong> · Tọa độ:{' '}
            <span className="font-mono">
              {STORE_CONFIG.lat}, {STORE_CONFIG.lng}
            </span>{' '}
            · Có chỗ để xe máy rộng rãi trước cửa.
          </p>
        </div>
      </div>
    </div>
  );
};
