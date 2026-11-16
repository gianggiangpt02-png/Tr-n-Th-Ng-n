import React from 'react';
import { useLocation } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { formatVND } from '../utils/format';

/**
 * Thanh "Xem giỏ hàng" cố định dưới màn hình điện thoại (chiều cao gọn gàng <= 56px).
 */
export const MobileCartBar: React.FC = () => {
  const { totalQuantity, subtotal, openDrawer } = useCart();
  const location = useLocation();

  if (totalQuantity === 0 || location.pathname === '/thanh-toan' || location.pathname === '/admin') {
    return null;
  }

  return (
    <div className="md:hidden fixed bottom-3 inset-x-3 z-30">
      <button
        type="button"
        onClick={openDrawer}
        className="w-full h-13 px-4 rounded-2xl bg-[#8A5036] text-[#FFF4EA] shadow-xl border border-[#FBDB93]/35 flex items-center justify-between"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-[#FBDB93] text-[#5A2E1C] flex items-center justify-center">
            <ShoppingBag className="w-4 h-4" />
          </span>
          <div className="text-left">
            <p className="text-xs font-semibold text-[#FBDB93]">
              Xem giỏ hàng ({totalQuantity} món)
            </p>
          </div>
        </div>
        <span className="text-sm font-bold text-[#FFF4EA] tabular-nums">
          {formatVND(subtotal)}
        </span>
      </button>
    </div>
  );
};
