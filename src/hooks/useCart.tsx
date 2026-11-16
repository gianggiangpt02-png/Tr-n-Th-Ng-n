import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/api';
import { CartItem, CartToppingItem, Combo, Discount, Product } from '../types';
import { parseComboItems } from '../utils/combo';
import { validateAndCalculateDiscount } from '../utils/discount';

interface AddProductParams {
  product: Product;
  size: 'M' | 'L' | 'Tiêu chuẩn';
  sugar_level: string;
  ice_level: string;
  toppings: CartToppingItem[];
  quantity: number;
  note: string;
}

interface CartContextValue {
  items: CartItem[];
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  cartPulseKey: number;
  appliedCode: string;
  setAppliedCode: (code: string) => void;
  discounts: Discount[];
  refreshDiscounts: () => void;
  addProductToCart: (params: AddProductParams) => void;
  addComboToCart: (combo: Combo, products: Product[], quantity?: number) => void;
  updateCartItem: (cartItemId: string, updated: Partial<CartItem>) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
  totalQuantity: number;
  subtotal: number;
  discountResult: ReturnType<typeof validateAndCalculateDiscount>;
}

const CartContext = createContext<CartContextValue | null>(null);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => api.getCart());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [cartPulseKey, setCartPulseKey] = useState(0);
  const [appliedCode, setAppliedCode] = useState<string>('');
  const [discounts, setDiscounts] = useState<Discount[]>(() => api.getDiscounts());

  useEffect(() => {
    api.saveCart(items);
  }, [items]);

  const refreshDiscounts = useCallback(() => {
    setDiscounts(api.getDiscounts());
  }, []);

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const addProductToCart = useCallback((params: AddProductParams) => {
    const { product, size, sugar_level, ice_level, toppings, quantity, note } = params;
    const basePrice = size === 'L' && product.price_l !== null ? product.price_l : product.price_m;
    const toppingsTotal = toppings.reduce((sum, t) => sum + t.price, 0);
    const unit_price = basePrice + toppingsTotal;

    const toppingSignature = toppings
      .map((t) => t.product_id)
      .sort()
      .join(',');

    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.item_type === 'product' &&
          item.product_id === product.product_id &&
          item.size === size &&
          item.sugar_level === sugar_level &&
          item.ice_level === ice_level &&
          item.note.trim() === note.trim() &&
          item.toppings
            .map((t) => t.product_id)
            .sort()
            .join(',') === toppingSignature
      );

      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + quantity,
        };
        return next;
      }

      const newItem: CartItem = {
        cart_item_id: `ci-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        item_type: 'product',
        product_id: product.product_id,
        name: product.name,
        category: product.category,
        image_url: product.image_url,
        size,
        sugar_level,
        ice_level,
        toppings,
        quantity,
        unit_price,
        note: note.trim(),
      };
      return [...prev, newItem];
    });

    setCartPulseKey((k) => k + 1);
  }, []);

  const addComboToCart = useCallback((combo: Combo, products: Product[], quantity = 1) => {
    const parsed = parseComboItems(combo.items, products);
    const summary = parsed.map((p) => `${p.name} x${p.quantity}`).join(', ');

    setItems((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.item_type === 'combo' && item.product_id === combo.combo_id
      );

      if (existingIndex >= 0) {
        const next = [...prev];
        next[existingIndex] = {
          ...next[existingIndex],
          quantity: next[existingIndex].quantity + quantity,
        };
        return next;
      }

      const newItem: CartItem = {
        cart_item_id: `ci-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        item_type: 'combo',
        product_id: combo.combo_id,
        name: combo.name,
        category: 'Combo',
        image_url: combo.image_url,
        size: 'Tiêu chuẩn',
        sugar_level: '100%',
        ice_level: 'Vừa',
        toppings: [],
        quantity,
        unit_price: combo.combo_price,
        note: '',
        combo_items_summary: summary,
      };
      return [...prev, newItem];
    });

    setCartPulseKey((k) => k + 1);
  }, []);

  const updateCartItem = useCallback((cartItemId: string, updated: Partial<CartItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.cart_item_id === cartItemId ? { ...item, ...updated } : item))
    );
  }, []);

  const updateQuantity = useCallback((cartItemId: string, delta: number) => {
    setItems((prev) =>
      prev
        .map((item) =>
          item.cart_item_id === cartItemId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const removeItem = useCallback((cartItemId: string) => {
    setItems((prev) => prev.filter((item) => item.cart_item_id !== cartItemId));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setAppliedCode('');
  }, []);

  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0),
    [items]
  );

  const discountResult = useMemo(() => {
    if (!appliedCode) {
      return {
        valid: false,
        orderDiscountAmount: 0,
        shippingDiscountAmount: 0,
        totalDiscountAmount: 0,
      };
    }
    return validateAndCalculateDiscount(appliedCode, discounts, subtotal, 15000);
  }, [appliedCode, discounts, subtotal]);

  return (
    <CartContext.Provider
      value={{
        items,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
        cartPulseKey,
        appliedCode,
        setAppliedCode,
        discounts,
        refreshDiscounts,
        addProductToCart,
        addComboToCart,
        updateCartItem,
        updateQuantity,
        removeItem,
        clearCart,
        totalQuantity,
        subtotal,
        discountResult,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
