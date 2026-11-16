import { SEED_COMBOS } from '../data/combos';
import { SEED_DISCOUNTS } from '../data/discounts';
import { SEED_ORDER_ITEMS, SEED_ORDERS } from '../data/orders';
import { SEED_PRODUCTS } from '../data/products';
import { SEED_SHIPPING } from '../data/shipping';
import {
  CartItem,
  Combo,
  Discount,
  Order,
  OrderItem,
  OrderStatus,
  PaymentStatus,
  Product,
  ShippingProvider,
} from '../types';
import { normalizeVNPhone } from '../utils/format';

/**
 * TẦNG DỮ LIỆU TÁCH RIÊNG (Giai đoạn 1: localStorage)
 * Sau này khi kết nối Google Sheets/Apps Script hoặc Firebase,
 * chỉ cần thay phần cài đặt bên trong các hàm này mà không phải sửa giao diện.
 */

const STORAGE_KEYS = {
  PRODUCTS: 'jeji_products_v1',
  COMBOS: 'jeji_combos_v1',
  HERO_IMAGES: 'jeji_hero_images_v1',
  DISCOUNTS: 'jeji_discounts_v1',
  SHIPPING: 'jeji_shipping_v1',
  ORDERS: 'jeji_orders_v1',
  ORDER_ITEMS: 'jeji_order_items_v1',
  CART: 'jeji_cart_v1',
  RECENT_ORDER_IDS: 'jeji_recent_order_ids_v1',
} as const;

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Bỏ qua nếu bộ nhớ trình duyệt bị đầy
  }
}

export const api = {
  // === PRODUCTS ===
  getProducts(): Product[] {
    const list = readStorage<Product[]>(STORAGE_KEYS.PRODUCTS, SEED_PRODUCTS);
    return [...list].sort((a, b) => a.sort_order - b.sort_order);
  },

  updateProduct(productId: string, patch: Partial<Product>): Product[] {
    const list = this.getProducts();
    const updated = list.map((p) => (p.product_id === productId ? { ...p, ...patch } : p));
    writeStorage(STORAGE_KEYS.PRODUCTS, updated);
    return updated;
  },

  resetProductsToSeed(): Product[] {
    writeStorage(STORAGE_KEYS.PRODUCTS, SEED_PRODUCTS);
    return SEED_PRODUCTS;
  },

  // === COMBOS ===
  getCombos(): Combo[] {
    return readStorage<Combo[]>(STORAGE_KEYS.COMBOS, SEED_COMBOS);
  },

  updateCombo(comboId: string, patch: Partial<Combo>): Combo[] {
    const list = this.getCombos();
    const updated = list.map((c) => (c.combo_id === comboId ? { ...c, ...patch } : c));
    writeStorage(STORAGE_KEYS.COMBOS, updated);
    return updated;
  },

  resetCombosToSeed(): Combo[] {
    writeStorage(STORAGE_KEYS.COMBOS, SEED_COMBOS);
    return SEED_COMBOS;
  },

  // === HERO SLIDE IMAGES ===
  getHeroImages(): Record<string, string> {
    return readStorage<Record<string, string>>(STORAGE_KEYS.HERO_IMAGES, {});
  },

  updateHeroImage(slideId: string, imageUrl: string): Record<string, string> {
    const current = this.getHeroImages();
    const next = { ...current };
    if (!imageUrl) {
      delete next[slideId];
    } else {
      next[slideId] = imageUrl;
    }
    writeStorage(STORAGE_KEYS.HERO_IMAGES, next);
    return next;
  },

  // === DISCOUNTS ===
  getDiscounts(): Discount[] {
    return readStorage<Discount[]>(STORAGE_KEYS.DISCOUNTS, SEED_DISCOUNTS);
  },

  addDiscount(discount: Discount): Discount[] {
    const list = this.getDiscounts();
    const exists = list.some((d) => d.code.toUpperCase() === discount.code.toUpperCase());
    if (exists) return list;
    const updated = [discount, ...list];
    writeStorage(STORAGE_KEYS.DISCOUNTS, updated);
    return updated;
  },

  incrementDiscountUsage(code: string): void {
    if (!code) return;
    const upper = code.trim().toUpperCase();
    const list = this.getDiscounts();
    const updated = list.map((d) =>
      d.code.toUpperCase() === upper ? { ...d, used_count: d.used_count + 1 } : d
    );
    writeStorage(STORAGE_KEYS.DISCOUNTS, updated);
  },

  // === SHIPPING ===
  getShippingProviders(): ShippingProvider[] {
    return readStorage<ShippingProvider[]>(STORAGE_KEYS.SHIPPING, SEED_SHIPPING);
  },

  // === ORDERS & ORDER ITEMS ===
  getOrders(): Order[] {
    const orders = readStorage<Order[]>(STORAGE_KEYS.ORDERS, SEED_ORDERS);
    return [...orders].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  },

  getOrderItems(): OrderItem[] {
    return readStorage<OrderItem[]>(STORAGE_KEYS.ORDER_ITEMS, SEED_ORDER_ITEMS);
  },

  getOrderItemsByOrderId(orderId: string): OrderItem[] {
    return this.getOrderItems().filter((item) => item.order_id === orderId);
  },

  getOrderByIdAndPhone(orderId: string, phone: string): Order | null {
    const cleanId = orderId.trim().toUpperCase();
    const cleanPhone = normalizeVNPhone(phone);
    const orders = this.getOrders();
    return (
      orders.find(
        (o) => o.order_id.toUpperCase() === cleanId && normalizeVNPhone(o.customer_phone) === cleanPhone
      ) || null
    );
  },

  getOrderById(orderId: string): Order | null {
    const cleanId = orderId.trim().toUpperCase();
    return this.getOrders().find((o) => o.order_id.toUpperCase() === cleanId) || null;
  },

  createOrder(order: Order, items: OrderItem[]): Order {
    const orders = this.getOrders();
    const orderItems = this.getOrderItems();
    writeStorage(STORAGE_KEYS.ORDERS, [order, ...orders]);
    writeStorage(STORAGE_KEYS.ORDER_ITEMS, [...items, ...orderItems]);

    if (order.discount_code) {
      this.incrementDiscountUsage(order.discount_code);
    }

    // Lưu vào danh sách đơn gần đây của thiết bị này
    const recentIds = this.getRecentOrderIds();
    const nextRecent = [order.order_id, ...recentIds.filter((id) => id !== order.order_id)].slice(0, 8);
    writeStorage(STORAGE_KEYS.RECENT_ORDER_IDS, nextRecent);

    return order;
  },

  updateOrder(
    orderId: string,
    patch: Partial<
      Pick<
        Order,
        | 'status'
        | 'tracking_code'
        | 'shipping_provider_id'
        | 'shipping_provider_name'
        | 'payment_status'
        | 'points_awarded'
      >
    >
  ): Order[] {
    const orders = this.getOrders();
    const updated = orders.map((o) => (o.order_id === orderId ? { ...o, ...patch } : o));
    writeStorage(STORAGE_KEYS.ORDERS, updated);
    return updated;
  },

  updateOrderStatus(orderId: string, status: OrderStatus): Order[] {
    return this.updateOrder(orderId, { status });
  },

  updateOrderPaymentStatus(orderId: string, payment_status: PaymentStatus): Order[] {
    return this.updateOrder(orderId, { payment_status });
  },

  getRecentOrderIds(): string[] {
    return readStorage<string[]>(STORAGE_KEYS.RECENT_ORDER_IDS, ['JJ261116001']);
  },

  getRecentOrdersForDevice(): Order[] {
    const recentIds = this.getRecentOrderIds();
    const orders = this.getOrders();
    return recentIds
      .map((id) => orders.find((o) => o.order_id === id))
      .filter((o): o is Order => Boolean(o));
  },

  // === CART ===
  getCart(): CartItem[] {
    return readStorage<CartItem[]>(STORAGE_KEYS.CART, []);
  },

  saveCart(cart: CartItem[]): void {
    writeStorage(STORAGE_KEYS.CART, cart);
  },
};
