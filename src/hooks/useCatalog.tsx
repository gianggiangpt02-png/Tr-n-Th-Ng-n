import React, { createContext, useCallback, useContext, useState } from 'react';
import { api } from '../services/api';
import { Combo, Product, ProductCategory } from '../types';

export interface ImageEditTarget {
  type: 'product' | 'combo' | 'hero';
  id: string;
  title: string;
  currentUrl: string;
  category?: ProductCategory | 'Combo';
}

interface CatalogContextValue {
  products: Product[];
  combos: Combo[];
  heroImages: Record<string, string>;
  isImageEditMode: boolean;
  setImageEditMode: (val: boolean) => void;
  toggleImageEditMode: () => void;
  editTarget: ImageEditTarget | null;
  openImageEditor: (target: ImageEditTarget) => void;
  closeImageEditor: () => void;
  saveTargetImage: (target: ImageEditTarget, newUrl: string) => void;
  resetTargetImage: (target: ImageEditTarget) => void;
  updateProductData: (productId: string, patch: Partial<Product>) => void;
  resetAllProducts: () => void;
}

const CatalogContext = createContext<CatalogContextValue | null>(null);

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>(() => api.getProducts());
  const [combos, setCombos] = useState<Combo[]>(() => api.getCombos());
  const [heroImages, setHeroImages] = useState<Record<string, string>>(() => api.getHeroImages());
  const [isImageEditMode, setIsImageEditMode] = useState(false);
  const [editTarget, setEditTarget] = useState<ImageEditTarget | null>(null);

  const setImageEditMode = useCallback((val: boolean) => {
    setIsImageEditMode(val);
  }, []);

  const toggleImageEditMode = useCallback(() => {
    setIsImageEditMode((v) => !v);
  }, []);

  const openImageEditor = useCallback((target: ImageEditTarget) => {
    setEditTarget(target);
  }, []);

  const closeImageEditor = useCallback(() => {
    setEditTarget(null);
  }, []);

  const saveTargetImage = useCallback((target: ImageEditTarget, newUrl: string) => {
    if (target.type === 'product') {
      setProducts(api.updateProduct(target.id, { image_url: newUrl }));
    } else if (target.type === 'combo') {
      setCombos(api.updateCombo(target.id, { image_url: newUrl }));
    } else if (target.type === 'hero') {
      setHeroImages(api.updateHeroImage(target.id, newUrl));
    }
  }, []);

  const resetTargetImage = useCallback((target: ImageEditTarget) => {
    if (target.type === 'product') {
      setProducts(api.updateProduct(target.id, { image_url: '' }));
    } else if (target.type === 'combo') {
      setCombos(api.updateCombo(target.id, { image_url: '' }));
    } else if (target.type === 'hero') {
      setHeroImages(api.updateHeroImage(target.id, ''));
    }
  }, []);

  const updateProductData = useCallback((productId: string, patch: Partial<Product>) => {
    setProducts(api.updateProduct(productId, patch));
  }, []);

  const resetAllProducts = useCallback(() => {
    setProducts(api.resetProductsToSeed());
  }, []);

  return (
    <CatalogContext.Provider
      value={{
        products,
        combos,
        heroImages,
        isImageEditMode,
        setImageEditMode,
        toggleImageEditMode,
        editTarget,
        openImageEditor,
        closeImageEditor,
        saveTargetImage,
        resetTargetImage,
        updateProductData,
        resetAllProducts,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
};

export function useCatalog(): CatalogContextValue {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error('useCatalog must be used within CatalogProvider');
  return ctx;
}
