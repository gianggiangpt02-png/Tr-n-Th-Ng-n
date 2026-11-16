import React, { useEffect, useRef } from 'react';
import L from 'leaflet';

interface LeafletMapPickerProps {
  centerLat: number;
  centerLng: number;
  markerLat: number;
  markerLng: number;
  storeLat?: number;
  storeLng?: number;
  interactive?: boolean;
  heightClass?: string;
  onLocationChange?: (lat: number, lng: number) => void;
}

function createPinIcon(color: string, label: string): L.DivIcon {
  return L.divIcon({
    className: 'jeji-custom-pin',
    html: `<div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);">
      <div style="background:${color};color:#FFF8EA;padding:3px 8px;border-radius:8px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:0 4px 10px rgba(90,46,28,0.28);font-family:sans-serif;">${label}</div>
      <div style="width:14px;height:14px;background:${color};border:2.5px solid #FFF8EA;border-radius:9999px;margin-top:2px;box-shadow:0 2px 6px rgba(90,46,28,0.32);"></div>
    </div>`,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

/**
 * Bản đồ OpenStreetMap dùng Leaflet (KHÔNG cần API key).
 * Hỗ trợ ghim vị trí giao hàng hoặc hiển thị vị trí cửa hàng JeJi Coffee.
 */
export const LeafletMapPicker: React.FC<LeafletMapPickerProps> = ({
  centerLat,
  centerLng,
  markerLat,
  markerLng,
  storeLat,
  storeLng,
  interactive = true,
  heightClass = 'h-64',
  onLocationChange,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [centerLat, centerLng],
      zoom: 15,
      scrollWheelZoom: false,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);

    if (storeLat !== undefined && storeLng !== undefined) {
      L.marker([storeLat, storeLng], {
        icon: createPinIcon('#8A5036', 'JeJi Coffee'),
        interactive: false,
      }).addTo(map);
    }

    const customerMarker = L.marker([markerLat, markerLng], {
      draggable: interactive,
      icon: createPinIcon('#D4606A', interactive ? 'Vị trí nhận hàng' : 'JeJi Coffee'),
    }).addTo(map);

    if (interactive && onLocationChange) {
      customerMarker.on('dragend', () => {
        const pos = customerMarker.getLatLng();
        onLocationChange(
          Math.round(pos.lat * 100000) / 100000,
          Math.round(pos.lng * 100000) / 100000
        );
      });

      map.on('click', (e: L.LeafletMouseEvent) => {
        customerMarker.setLatLng(e.latlng);
        onLocationChange(
          Math.round(e.latlng.lat * 100000) / 100000,
          Math.round(e.latlng.lng * 100000) / 100000
        );
      });
    }

    mapRef.current = map;
    markerRef.current = customerMarker;
    const resizeTimer = window.setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      window.clearTimeout(resizeTimer);
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      markerRef.current.setLatLng([markerLat, markerLng]);
      mapRef.current.panTo([markerLat, markerLng], { animate: true });
    }
  }, [markerLat, markerLng]);

  return (
    <div
      ref={containerRef}
      className={`w-full rounded-2xl overflow-hidden border border-[#914F1E]/20 z-0 ${heightClass}`}
      aria-label="Bản đồ OpenStreetMap"
    />
  );
};
