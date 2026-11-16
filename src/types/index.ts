export type ProductCategory = 'Cà phê' | 'Trà' | 'Sinh tố' | 'Nước ép' | 'Bánh' | 'Topping';

export interface Product {
  product_id: string;
  name: string;
  category: ProductCategory;
  description: string;
  price_m: number;
  price_l: number | null;
  image_url: string;
  is_bestseller: boolean;
  is_available: boolean;
  sort_order: number;
}

export interface Combo {
  combo_id: string;
  name: string;
  description: string;
  /** Định dạng "SP001:1|SP012:1" */
  items: string;
  combo_price: number;
  original_price: number;
  image_url: string;
  is_active: boolean;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
}

export type DiscountType = 'percent' | 'fixed' | 'freeship';

export interface Discount {
  code: string;
  description: string;
  type: DiscountType;
  value: number;
  min_order: number;
  max_discount: number;
  usage_limit: number;
  used_count: number;
  start_date: string; // YYYY-MM-DD
  end_date: string;   // YYYY-MM-DD
  is_active: boolean;
}

export interface ShippingProvider {
  provider_id: string;
  name: string;
  description: string;
  base_fee: number;
  fee_per_km: number;
  free_radius_km: number;
  max_distance_km: number;
  eta_minutes: number;
  tracking_url_template: string;
  is_active: boolean;
}

export type DeliveryType = 'delivery' | 'pickup';
export type PaymentMethod = 'cod' | 'bank_transfer' | 'ewallet';
export type PaymentStatus = 'unpaid' | 'paid';
export type OrderStatus =
  | 'Mới'
  | 'Đã xác nhận'
  | 'Đang pha chế'
  | 'Đang giao'
  | 'Hoàn thành'
  | 'Hủy';

export interface Order {
  order_id: string;
  user_id?: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  delivery_type: DeliveryType;
  delivery_address: string;
  customer_lat: number | null;
  customer_lng: number | null;
  pickup_time: string;
  note: string;
  subtotal: number;
  discount_code: string;
  discount_amount: number;
  shipping_provider_id: string;
  shipping_provider_name: string;
  shipping_fee: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  status: OrderStatus;
  tracking_code: string;
  points_awarded?: boolean;
}

export interface CartToppingItem {
  product_id: string;
  name: string;
  price: number;
}

export interface OrderItem {
  order_item_id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  item_type: 'product' | 'combo';
  size: 'M' | 'L' | 'Tiêu chuẩn';
  sugar_level: string;
  ice_level: string;
  toppings: string; // Chuỗi mô tả topping để khớp cột Excel, vd "Topping trân châu (+5.000đ)"
  quantity: number;
  unit_price: number;
  line_total: number;
  note: string;
}

export interface CartItem {
  cart_item_id: string;
  item_type: 'product' | 'combo';
  product_id: string;
  name: string;
  category: ProductCategory | 'Combo';
  image_url: string;
  size: 'M' | 'L' | 'Tiêu chuẩn';
  sugar_level: string;
  ice_level: string;
  toppings: CartToppingItem[];
  quantity: number;
  unit_price: number; // Giá 1 phần đã bao gồm size + toppings
  note: string;
  combo_items_summary?: string;
}

export type UserRole = 'customer' | 'admin';
export type MemberTier = 'Đồng' | 'Bạc' | 'Vàng';

export interface UserAddress {
  address_id: string;
  label: string;
  recipient_name: string;
  phone: string;
  full_address: string;
  lat: number | null;
  lng: number | null;
  is_default: boolean;
}

export interface PointTransaction {
  tx_id: string;
  created_at: string;
  type: 'earn' | 'redeem';
  points: number;
  description: string;
  order_id?: string;
  voucher_code?: string;
}

export interface User {
  user_id: string;
  full_name: string;
  phone: string;
  email: string;
  password_hash: string;
  salt: string;
  role: UserRole;
  avatar: string;
  birthday: string;
  addresses: UserAddress[];
  points: number;
  tier: MemberTier;
  favorites?: string[];
  notify_order_status?: boolean;
  welcome_code?: string;
  point_history?: PointTransaction[];
  created_at: string;
}

export interface StoreConfig {
  store_name: string;
  slogan: string;
  address: string;
  district_city: string;
  hotline: string;
  email: string;
  open_time: string;  // "07:00"
  close_time: string; // "22:30"
  lat: number;
  lng: number;
  facebook_url: string;
  zalo_url: string;
  google_maps_embed: string;
  bank_name: string;
  bank_id: string;
  bank_account_number: string;
  bank_account_name: string;
  bank_qr_image?: string;
  admin_pin: string;
}

