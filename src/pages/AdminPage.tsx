import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertTriangle,
  BarChart3,
  Camera,
  Coffee,
  Download,
  LogOut,
  Package,
  Printer,
  RotateCcw,
  Users,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProductImage } from '../components/ProductImage';
import { UserAvatar } from '../components/UserAvatar';
import { useAuth } from '../hooks/useAuth';
import { useCatalog } from '../hooks/useCatalog';
import { useToast } from '../hooks/useToast';
import { api } from '../services/api';
import { authService, syncCompletedOrdersToUserPoints } from '../services/auth';
import {
  Order,
  OrderItem,
  OrderStatus,
  PaymentStatus,
  Product,
  User,
} from '../types';
import { exportTableToCSV } from '../utils/csv';
import { formatDateTimeVN, formatVND, getTodayVNDateStr, normalizeVNPhone } from '../utils/format';

type AdminTab = 'orders' | 'products' | 'customers' | 'analytics';

const ALL_STATUSES: OrderStatus[] = [
  'Mới',
  'Đã xác nhận',
  'Đang pha chế',
  'Đang giao',
  'Hoàn thành',
  'Hủy',
];

export const AdminPage: React.FC = () => {
  const { showToast } = useToast();
  const { user, logout, refreshUser } = useAuth();
  const navigate = useNavigate();
  const {
    products,
    updateProductData,
    resetAllProducts,
    openImageEditor,
    setImageEditMode,
  } = useCatalog();

  const [activeTab, setActiveTab] = useState<AdminTab>('orders');
  const [orders, setOrders] = useState<Order[]>(() => api.getOrders());
  const [orderItems] = useState<OrderItem[]>(() => api.getOrderItems());
  const [shippingProviders] = useState(() => api.getShippingProviders());
  const [usersList, setUsersList] = useState<User[]>(() => authService.listAllUsers());

  const [statusFilter, setStatusFilter] = useState<string>('Tất cả');
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const filteredOrders = useMemo(() => {
    if (statusFilter === 'Tất cả') return orders;
    return orders.filter((o) => o.status === statusFilter);
  }, [orders, statusFilter]);

  // Thống kê nhanh
  const analytics = useMemo(() => {
    const todayStr = getTodayVNDateStr();
    const todayOrders = orders.filter((o) => o.created_at.startsWith(todayStr) && o.status !== 'Hủy');
    const validOrders = orders.filter((o) => o.status !== 'Hủy');
    const todayRevenue = todayOrders.reduce((s, o) => s + o.total_amount, 0);
    const totalRevenue = validOrders.reduce((s, o) => s + o.total_amount, 0);

    // Đếm món bán chạy từ OrderItems
    const itemCountMap: Record<string, { name: string; qty: number; revenue: number }> = {};
    orderItems.forEach((oi) => {
      if (!itemCountMap[oi.product_name]) {
        itemCountMap[oi.product_name] = { name: oi.product_name, qty: 0, revenue: 0 };
      }
      itemCountMap[oi.product_name].qty += oi.quantity;
      itemCountMap[oi.product_name].revenue += oi.line_total;
    });

    const topProductsChart = Object.values(itemCountMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 6);

    return {
      todayOrdersCount: todayOrders.length,
      todayRevenue,
      totalOrdersCount: orders.length,
      totalRevenue,
      topProductsChart,
    };
  }, [orders, orderItems]);

  const handleOrderStatusChange = (orderId: string, status: OrderStatus) => {
    api.updateOrder(orderId, { status });
    if (status === 'Hoàn thành') {
      syncCompletedOrdersToUserPoints();
      refreshUser();
      setUsersList(authService.listAllUsers());
    }
    setOrders(api.getOrders());
    showToast(
      status === 'Hoàn thành'
        ? `Đơn ${orderId} đã Hoàn thành & tự động cộng điểm thành viên`
        : `Đã chuyển đơn ${orderId} sang "${status}"`
    );
  };

  const handlePaymentStatusChange = (orderId: string, payment_status: PaymentStatus) => {
    const updated = api.updateOrder(orderId, { payment_status });
    setOrders(updated);
    showToast(`Đã cập nhật thanh toán cho ${orderId}`);
  };

  const handleProviderChange = (orderId: string, providerId: string) => {
    const found = shippingProviders.find((p) => p.provider_id === providerId);
    const updated = api.updateOrder(orderId, {
      shipping_provider_id: providerId,
      shipping_provider_name: found ? found.name : providerId,
    });
    setOrders(updated);
    showToast(`Đã cập nhật đơn vị vận chuyển cho ${orderId}`);
  };

  const handleTrackingCodeBlur = (orderId: string, tracking_code: string) => {
    const updated = api.updateOrder(orderId, { tracking_code: tracking_code.trim() });
    setOrders(updated);
  };

  const handlePrintOrder = (order: Order) => {
    setPrintingOrder(order);
    setTimeout(() => {
      window.print();
    }, 120);
  };

  const handleProductUpdate = (productId: string, patch: Partial<Product>) => {
    updateProductData(productId, patch);
    showToast('Đã cập nhật thông tin món');
  };

  const handleExportOrders = () => {
    exportTableToCSV(
      orders,
      [
        'order_id',
        'created_at',
        'customer_name',
        'customer_phone',
        'delivery_type',
        'delivery_address',
        'customer_lat',
        'customer_lng',
        'pickup_time',
        'note',
        'subtotal',
        'discount_code',
        'discount_amount',
        'shipping_provider_id',
        'shipping_provider_name',
        'shipping_fee',
        'total_amount',
        'payment_method',
        'payment_status',
        'status',
        'tracking_code',
      ],
      `JeJi_Orders_${getTodayVNDateStr()}.csv`
    );
    showToast('Đã xuất file Orders CSV');
  };

  const handleExportOrderItems = () => {
    exportTableToCSV(
      orderItems,
      [
        'order_item_id',
        'order_id',
        'product_id',
        'product_name',
        'item_type',
        'size',
        'sugar_level',
        'ice_level',
        'toppings',
        'quantity',
        'unit_price',
        'line_total',
        'note',
      ],
      `JeJi_OrderItems_${getTodayVNDateStr()}.csv`
    );
    showToast('Đã xuất file OrderItems CSV');
  };

  const handleExportProducts = () => {
    exportTableToCSV(
      products,
      [
        'product_id',
        'name',
        'category',
        'description',
        'price_m',
        'price_l',
        'image_url',
        'is_bestseller',
        'is_available',
        'sort_order',
      ],
      `JeJi_Products_${getTodayVNDateStr()}.csv`
    );
    showToast('Đã xuất file Products CSV');
  };

  const handleExportUsers = () => {
    const latestUsers = authService.listAllUsers().map((u) => ({
      ...u,
      addresses: JSON.stringify(u.addresses || []),
    }));
    exportTableToCSV(
      latestUsers,
      [
        'user_id',
        'full_name',
        'phone',
        'email',
        'password_hash',
        'salt',
        'role',
        'avatar',
        'birthday',
        'addresses',
        'points',
        'tier',
        'created_at',
      ],
      `JeJi_Users_${getTodayVNDateStr()}.csv`
    );
    showToast('Đã xuất file Users CSV');
  };

  const customerSummaries = useMemo(() => {
    return usersList.map((u) => {
      const cleanPhone = normalizeVNPhone(u.phone);
      const userOrders = orders.filter(
        (o) =>
          o.user_id === u.user_id ||
          (cleanPhone && normalizeVNPhone(o.customer_phone) === cleanPhone)
      );
      const validSpent = userOrders
        .filter((o) => o.status !== 'Hủy')
        .reduce((sum, o) => sum + o.total_amount, 0);
      return {
        user: u,
        ordersCount: userOrders.length,
        totalSpent: validSpent,
      };
    });
  }, [usersList, orders]);

  return (
    <div className="pb-16">
      {/* Header quản trị */}
      <section className="bg-[#8A5036] text-[#FFF4EA] py-8 px-4 sm:px-6 border-b border-[#FBDB93]/20">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#FBDB93]">
              Bảng điều khiển cửa hàng · Quản trị viên: {user?.full_name || 'JeJi Admin'}
            </p>
            <h1 className="mt-1 font-display text-2xl sm:text-3xl font-bold text-[#FFF4EA]">
              Quản trị JeJi Coffee
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Đăng xuất</span>
            </button>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Cảnh báo rõ bản Demo Giai đoạn 1 */}
        <div className="rounded-2xl bg-[#FBE3E0] border border-[#D4606A]/40 px-4 py-3 flex items-start gap-3 text-xs sm:text-sm text-[#5A2E1C]">
          <AlertTriangle className="w-4 h-4 text-[#AA2B1D] shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Lưu ý bảo mật (Bản demo Giai đoạn 1):</strong> Hệ thống tài khoản và dữ liệu
            đơn hàng đang chạy cục bộ bằng <code className="font-mono">localStorage</code> (mật
            khẩu băm SHA-256 trên trình duyệt), không an toàn như hệ thống có máy chủ / Firebase
            Authentication thật. Không dùng mật khẩu cá nhân quan trọng ở môi trường demo này.
          </p>
        </div>

        {/* Tabs chuyển đổi */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === 'orders'
                  ? 'bg-[#8A5036] text-[#FBDB93]'
                  : 'bg-[#FFFDF8] text-[#5A2E1C] border border-[#8A5036]/20'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Đơn hàng ({orders.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('products')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === 'products'
                  ? 'bg-[#8A5036] text-[#FBDB93]'
                  : 'bg-[#FFFDF8] text-[#5A2E1C] border border-[#8A5036]/20'
              }`}
            >
              <Coffee className="w-4 h-4" />
              <span>Thực đơn ({products.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setUsersList(authService.listAllUsers());
                setActiveTab('customers');
              }}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === 'customers'
                  ? 'bg-[#8A5036] text-[#FBDB93]'
                  : 'bg-[#FFFDF8] text-[#5A2E1C] border border-[#8A5036]/20'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Khách hàng ({usersList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-[#8A5036] text-[#FBDB93]'
                  : 'bg-[#FFFDF8] text-[#5A2E1C] border border-[#8A5036]/20'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Thống kê</span>
            </button>
          </div>

          {/* Nút xuất CSV */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportOrders}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FFFDF8] border border-[#8A5036]/20 hover:bg-[#FCE8D5] text-xs font-semibold text-[#5A2E1C]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Orders.csv</span>
            </button>
            <button
              type="button"
              onClick={handleExportOrderItems}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FFFDF8] border border-[#8A5036]/20 hover:bg-[#FCE8D5] text-xs font-semibold text-[#5A2E1C]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất OrderItems.csv</span>
            </button>
            <button
              type="button"
              onClick={handleExportProducts}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FFFDF8] border border-[#8A5036]/20 hover:bg-[#FCE8D5] text-xs font-semibold text-[#5A2E1C]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Products.csv</span>
            </button>
            <button
              type="button"
              onClick={handleExportUsers}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#FCE8D5] border border-[#EDB9B3] hover:bg-[#F9D5D3] text-xs font-semibold text-[#5A2E1C]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Xuất Users.csv</span>
            </button>
          </div>
        </div>

        {/* TAB 1: QUẢN LÝ ĐƠN HÀNG */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {['Tất cả', ...ALL_STATUSES].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    statusFilter === st
                      ? 'bg-[#8A5036] text-[#FBDB93]'
                      : 'bg-[#FFFDF8] text-[#5A2E1C] border border-[#8A5036]/15'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <div className="rounded-3xl bg-[#FFFDF8] border border-[#8A5036]/15 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#FCE8D5] text-[#5A2E1C] border-b border-[#8A5036]/15">
                      <th className="py-3.5 px-4 font-bold">Mã đơn / Thời gian</th>
                      <th className="py-3.5 px-4 font-bold">Khách hàng</th>
                      <th className="py-3.5 px-4 font-bold">Tổng tiền</th>
                      <th className="py-3.5 px-4 font-bold">Thanh toán</th>
                      <th className="py-3.5 px-4 font-bold">Vận chuyển & Mã vận đơn</th>
                      <th className="py-3.5 px-4 font-bold">Trạng thái</th>
                      <th className="py-3.5 px-4 font-bold text-right">In phiếu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#8A5036]/10">
                    {filteredOrders.map((order) => (
                      <tr key={order.order_id} className="hover:bg-[#FFF4EA]/70">
                        <td className="py-3.5 px-4 align-top">
                          <p className="font-mono font-bold text-[#5A2E1C]">{order.order_id}</p>
                          <p className="text-[11px] text-[#6F3F2A]">
                            {formatDateTimeVN(order.created_at)}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 align-top max-w-[200px]">
                          <p className="font-semibold text-[#5A2E1C]">{order.customer_name}</p>
                          <p className="text-xs text-[#6F3F2A] tabular-nums">{order.customer_phone}</p>
                          <p className="text-[11px] text-[#6F3F2A] line-clamp-2 mt-0.5">
                            {order.delivery_address}
                          </p>
                        </td>
                        <td className="py-3.5 px-4 align-top font-bold text-[#C4535A] tabular-nums whitespace-nowrap">
                          {formatVND(order.total_amount)}
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <select
                            value={order.payment_status}
                            onChange={(e) =>
                              handlePaymentStatusChange(
                                order.order_id,
                                e.target.value as PaymentStatus
                              )
                            }
                            aria-label={`Trạng thái thanh toán ${order.order_id}`}
                            className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold ${
                              order.payment_status === 'paid'
                                ? 'bg-[#DCE9C9] border-[#5F8A56]/40 text-[#5A2E1C]'
                                : 'bg-[#FFF4EA] border-[#8A5036]/25 text-[#AA2B1D]'
                            }`}
                          >
                            <option value="unpaid">Chưa thanh toán</option>
                            <option value="paid">Đã thanh toán</option>
                          </select>
                        </td>
                        <td className="py-3.5 px-4 align-top space-y-1.5 min-w-[190px]">
                          <select
                            value={order.shipping_provider_id}
                            onChange={(e) => handleProviderChange(order.order_id, e.target.value)}
                            aria-label={`Đơn vị vận chuyển ${order.order_id}`}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-[#FFF4EA] border border-[#8A5036]/20 text-xs text-[#5A2E1C]"
                          >
                            <option value="PICKUP">Đến quán lấy</option>
                            {shippingProviders.map((sp) => (
                              <option key={sp.provider_id} value={sp.provider_id}>
                                {sp.name}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            defaultValue={order.tracking_code}
                            onBlur={(e) => handleTrackingCodeBlur(order.order_id, e.target.value)}
                            placeholder="Nhập mã vận đơn..."
                            aria-label={`Mã vận đơn ${order.order_id}`}
                            className="w-full px-2.5 py-1 rounded-lg bg-[#FFF4EA] border border-[#8A5036]/20 font-mono text-xs text-[#5A2E1C]"
                          />
                        </td>
                        <td className="py-3.5 px-4 align-top">
                          <select
                            value={order.status}
                            onChange={(e) =>
                              handleOrderStatusChange(order.order_id, e.target.value as OrderStatus)
                            }
                            aria-label={`Trạng thái đơn ${order.order_id}`}
                            className="px-2.5 py-1.5 rounded-lg bg-[#FCE8D5] border border-[#8A5036]/30 font-semibold text-xs text-[#5A2E1C]"
                          >
                            {ALL_STATUSES.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3.5 px-4 align-top text-right">
                          <button
                            type="button"
                            onClick={() => handlePrintOrder(order)}
                            aria-label={`In phiếu đơn ${order.order_id}`}
                            className="p-2 rounded-lg bg-[#8A5036]/10 hover:bg-[#8A5036] hover:text-[#FBDB93] text-[#5A2E1C] transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: QUẢN LÝ MÓN */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setImageEditMode(true);
                  navigate('/thuc-don');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#8A5036] hover:bg-[#6F3F2A] text-[#FBDB93] text-xs font-semibold transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Mở trang Thực đơn với nút Đổi ảnh</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  resetAllProducts();
                  showToast('Đã khôi phục danh sách món mặc định từ file dữ liệu');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#8A5036]/25 text-xs font-semibold text-[#5A2E1C] hover:bg-[#FCE8D5]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Khôi phục dữ liệu gốc</span>
              </button>
            </div>

            <div className="rounded-3xl bg-[#FFFDF8] border border-[#8A5036]/15 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#FCE8D5] text-[#5A2E1C] border-b border-[#8A5036]/15">
                      <th className="py-3.5 px-4 font-bold">Mã</th>
                      <th className="py-3.5 px-4 font-bold">Ảnh</th>
                      <th className="py-3.5 px-4 font-bold">Tên món</th>
                      <th className="py-3.5 px-4 font-bold">Danh mục</th>
                      <th className="py-3.5 px-4 font-bold">Giá M (VNĐ)</th>
                      <th className="py-3.5 px-4 font-bold">Giá L (VNĐ)</th>
                      <th className="py-3.5 px-4 font-bold text-center">Bán chạy</th>
                      <th className="py-3.5 px-4 font-bold text-center">Còn hàng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#8A5036]/10">
                    {products.map((p) => (
                      <tr key={p.product_id} className="hover:bg-[#FFF4EA]/70">
                        <td className="py-3 px-4 font-mono font-bold text-xs text-[#5A2E1C]">{p.product_id}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <ProductImage
                              src={p.image_url}
                              alt={p.name}
                              productId={p.product_id}
                              category={p.category}
                              size="sm"
                              className="w-11 h-11 rounded-lg shrink-0"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                openImageEditor({
                                  type: 'product',
                                  id: p.product_id,
                                  title: p.name,
                                  currentUrl: p.image_url,
                                  category: p.category,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#FCE8D5] hover:bg-[#F9D5D3] text-[#5A2E1C] text-xs font-semibold whitespace-nowrap transition-colors"
                            >
                              <Camera className="w-3 h-3" />
                              <span>Đổi ảnh</span>
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#5A2E1C]">{p.name}</td>
                        <td className="py-3 px-4 text-[#6F3F2A]">{p.category}</td>
                        <td className="py-3 px-4">
                          <input
                            type="number"
                            step={1000}
                            defaultValue={p.price_m}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!Number.isNaN(val) && val > 0 && val !== p.price_m) {
                                handleProductUpdate(p.product_id, { price_m: val });
                              }
                            }}
                            aria-label={`Giá size M của ${p.name}`}
                            className="w-24 px-2.5 py-1.5 rounded-lg bg-[#FFF4EA] border border-[#8A5036]/20 tabular-nums text-xs font-semibold text-[#5A2E1C]"
                          />
                        </td>
                        <td className="py-3 px-4">
                          {p.price_l !== null ? (
                            <input
                              type="number"
                              step={1000}
                              defaultValue={p.price_l}
                              onBlur={(e) => {
                                const val = parseInt(e.target.value, 10);
                                if (!Number.isNaN(val) && val > 0 && val !== p.price_l) {
                                  handleProductUpdate(p.product_id, { price_l: val });
                                }
                              }}
                              aria-label={`Giá size L của ${p.name}`}
                              className="w-24 px-2.5 py-1.5 rounded-lg bg-[#FFF4EA] border border-[#8A5036]/20 tabular-nums text-xs font-semibold text-[#5A2E1C]"
                            />
                          ) : (
                            <span className="text-xs text-[#6F3F2A]">1 size</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <input
                            type="checkbox"
                            checked={p.is_bestseller}
                            onChange={(e) =>
                              handleProductUpdate(p.product_id, { is_bestseller: e.target.checked })
                            }
                            aria-label={`Đánh dấu bán chạy cho ${p.name}`}
                            className="w-4 h-4 accent-[#D4606A] cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            type="button"
                            onClick={() =>
                              handleProductUpdate(p.product_id, { is_available: !p.is_available })
                            }
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                              p.is_available
                                ? 'bg-[#DCE9C9] text-[#5F8A56]'
                                : 'bg-[#AA2B1D]/15 text-[#AA2B1D]'
                            }`}
                          >
                            {p.is_available ? 'Đang bán' : 'Tạm hết'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: KHÁCH HÀNG & TÍCH ĐIỂM */}
        {activeTab === 'customers' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-[#FFFDF8] border border-[#8A5036]/15">
                <p className="text-xs text-[#6F3F2A]">Tổng tài khoản</p>
                <p className="mt-1 font-display text-2xl font-bold text-[#5A2E1C] tabular-nums">
                  {usersList.length}
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-[#FFFDF8] border border-[#8A5036]/15">
                <p className="text-xs text-[#6F3F2A]">Tổng điểm thành viên</p>
                <p className="mt-1 font-display text-2xl font-bold text-[#C4535A] tabular-nums">
                  {usersList.reduce((s, u) => s + u.points, 0).toLocaleString('vi-VN')} điểm
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-[#FFFDF8] border border-[#8A5036]/15">
                <p className="text-xs text-[#6F3F2A]">Thành viên Bạc & Vàng</p>
                <p className="mt-1 font-display text-2xl font-bold text-[#914F1E] tabular-nums">
                  {usersList.filter((u) => u.tier === 'Bạc' || u.tier === 'Vàng').length}
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-[#FFFDF8] border border-[#8A5036]/15">
                <p className="text-xs text-[#6F3F2A]">Tổng chi tiêu thành viên</p>
                <p className="mt-1 font-display text-2xl font-bold text-[#5A2E1C] tabular-nums">
                  {formatVND(customerSummaries.reduce((s, c) => s + c.totalSpent, 0))}
                </p>
              </div>
            </div>

            <div className="rounded-3xl bg-[#FFFDF8] border border-[#8A5036]/15 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-[#FCE8D5] text-[#5A2E1C] border-b border-[#8A5036]/15">
                      <th className="py-3.5 px-4 font-bold">Thành viên</th>
                      <th className="py-3.5 px-4 font-bold">Liên hệ</th>
                      <th className="py-3.5 px-4 font-bold">Vai trò / Hạng</th>
                      <th className="py-3.5 px-4 font-bold text-right">Điểm JeJi</th>
                      <th className="py-3.5 px-4 font-bold text-right">Đơn hàng</th>
                      <th className="py-3.5 px-4 font-bold text-right">Tổng chi tiêu</th>
                      <th className="py-3.5 px-4 font-bold">Ngày tham gia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#8A5036]/10">
                    {customerSummaries.map(({ user: member, ordersCount, totalSpent }) => (
                      <tr key={member.user_id} className="hover:bg-[#FFF4EA]/70">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <UserAvatar
                              avatar={member.avatar}
                              fullName={member.full_name}
                              size="sm"
                            />
                            <div>
                              <p className="font-semibold text-[#5A2E1C]">{member.full_name}</p>
                              <p className="font-mono text-[11px] text-[#6F3F2A]">
                                {member.user_id}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-medium text-[#5A2E1C] tabular-nums">{member.phone}</p>
                          {member.email && (
                            <p className="text-xs text-[#6F3F2A]">{member.email}</p>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${
                                member.role === 'admin'
                                  ? 'bg-[#8A5036] text-[#FBDB93]'
                                  : 'bg-[#F9D5D3] text-[#9B3922]'
                              }`}
                            >
                              {member.role === 'admin' ? 'Admin' : 'Khách hàng'}
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-[#FCE8D5] text-[#5A2E1C] text-[11px] font-semibold">
                              Hạng {member.tier}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-[#C4535A] tabular-nums">
                          {member.points.toLocaleString('vi-VN')}
                        </td>
                        <td className="py-3.5 px-4 text-right font-semibold text-[#5A2E1C] tabular-nums">
                          {ordersCount}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-[#914F1E] tabular-nums whitespace-nowrap">
                          {formatVND(totalSpent)}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-[#6F3F2A] whitespace-nowrap">
                          {formatDateTimeVN(member.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: THỐNG KÊ NHANH */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-[#FFFDF8] border border-[#8A5036]/15">
                <p className="text-xs text-[#6F3F2A]">Doanh thu hôm nay</p>
                <p className="mt-1 font-display text-2xl font-bold text-[#C4535A] tabular-nums">
                  {formatVND(analytics.todayRevenue)}
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-[#FFFDF8] border border-[#8A5036]/15">
                <p className="text-xs text-[#6F3F2A]">Số đơn hôm nay</p>
                <p className="mt-1 font-display text-2xl font-bold text-[#5A2E1C] tabular-nums">
                  {analytics.todayOrdersCount}
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-[#FFFDF8] border border-[#8A5036]/15">
                <p className="text-xs text-[#6F3F2A]">Tổng doanh thu lũy kế</p>
                <p className="mt-1 font-display text-2xl font-bold text-[#914F1E] tabular-nums">
                  {formatVND(analytics.totalRevenue)}
                </p>
              </div>
              <div className="p-5 rounded-2xl bg-[#FFFDF8] border border-[#8A5036]/15">
                <p className="text-xs text-[#6F3F2A]">Tổng số đơn</p>
                <p className="mt-1 font-display text-2xl font-bold text-[#5A2E1C] tabular-nums">
                  {analytics.totalOrdersCount}
                </p>
              </div>
            </div>

            <div className="p-6 rounded-3xl bg-[#FFFDF8] border border-[#8A5036]/15">
              <h2 className="font-display text-lg font-bold text-[#914F1E] mb-4">
                Biểu đồ món bán chạy (theo số lượng đặt)
              </h2>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.topProductsChart}
                    margin={{ top: 10, right: 16, left: 0, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(138, 80, 54, 0.14)" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#5A2E1C' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6F3F2A' }} />
                    <Tooltip
                      formatter={(value: unknown) => [`${value} phần`, 'Số lượng']}
                      contentStyle={{
                        borderRadius: '12px',
                        borderColor: 'rgba(138, 80, 54, 0.2)',
                        backgroundColor: '#FFFDF8',
                        color: '#5A2E1C',
                      }}
                    />
                    <Bar dataKey="qty" fill="#C4535A" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Khối phiếu in ẩn (chỉ hiện khi bấm In phiếu đơn) */}
      {printingOrder && (
        <div id="jeji-print-receipt" className="hidden print:block font-sans text-sm text-[#5A2E1C]">
          <div className="text-center border-b pb-4 mb-4">
            <h2 className="text-xl font-bold">JEJI COFFEE</h2>
            <p className="text-xs">Một ly cà phê - Một khoảnh khắc Jeji</p>
            <p className="mt-2 font-mono font-bold text-base">PHIẾU ĐƠN: {printingOrder.order_id}</p>
            <p className="text-xs">{formatDateTimeVN(printingOrder.created_at)}</p>
          </div>
          <div className="space-y-1 mb-4 text-xs">
            <p>
              <strong>Khách hàng:</strong> {printingOrder.customer_name} ({printingOrder.customer_phone})
            </p>
            <p>
              <strong>Địa chỉ / Hình thức:</strong> {printingOrder.delivery_address}
            </p>
            {printingOrder.note && (
              <p>
                <strong>Ghi chú:</strong> {printingOrder.note}
              </p>
            )}
          </div>
          <table className="w-full text-xs border-t border-b py-2 mb-4">
            <thead>
              <tr className="border-b">
                <th className="text-left py-1">Món</th>
                <th className="text-center py-1">SL</th>
                <th className="text-right py-1">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {api.getOrderItemsByOrderId(printingOrder.order_id).map((it) => (
                <tr key={it.order_item_id}>
                  <td className="py-1">
                    {it.product_name} ({it.size})
                    {it.toppings ? ` [${it.toppings}]` : ''}
                  </td>
                  <td className="text-center py-1">{it.quantity}</td>
                  <td className="text-right py-1">{formatVND(it.line_total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="space-y-1 text-xs text-right">
            <p>Tạm tính: {formatVND(printingOrder.subtotal)}</p>
            <p>Phí ship: {formatVND(printingOrder.shipping_fee)}</p>
            {printingOrder.discount_amount > 0 && (
              <p>Giảm giá ({printingOrder.discount_code}): -{formatVND(printingOrder.discount_amount)}</p>
            )}
            <p className="text-base font-bold pt-1">
              TỔNG CỘNG: {formatVND(printingOrder.total_amount)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
