import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Camera, X } from 'lucide-react';
import { MotionConfig } from 'motion/react';
import { AuthModal } from './components/AuthModal';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { ImageEditorModal } from './components/ImageEditorModal';
import { JejiChatbot } from './components/JejiChatbot';
import { MobileCartBar } from './components/MobileCartBar';
import { RequireAuth } from './components/RequireAuth';
import { AuthProvider } from './hooks/useAuth';
import { CartProvider } from './hooks/useCart';
import { CatalogProvider, useCatalog } from './hooks/useCatalog';
import { FavoritesProvider } from './hooks/useFavorites';
import { ToastProvider } from './hooks/useToast';
import { AboutPage } from './pages/AboutPage';
import { AccountPage } from './pages/AccountPage';
import { AdminPage } from './pages/AdminPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { HomePage } from './pages/HomePage';
import { MenuPage } from './pages/MenuPage';
import { PromotionsPage } from './pages/PromotionsPage';
import { StorePage } from './pages/StorePage';
import { TrackingPage } from './pages/TrackingPage';

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const ImageEditBanner: React.FC = () => {
  const { isImageEditMode, setImageEditMode } = useCatalog();
  if (!isImageEditMode) return null;

  return (
    <div className="bg-[#FBDB93] text-[#5A2E1C] border-b border-[#8A5036]/25 px-4 py-2 text-xs font-medium">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-[#AA2B1D] shrink-0" />
          <span>
            Đang bật chế độ đổi ảnh trực tiếp: bấm nút <strong>&ldquo;Đổi ảnh&rdquo;</strong> trên
            bất kỳ món, combo hoặc banner nào để tải ảnh lên.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setImageEditMode(false)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#8A5036] text-[#FBDB93] font-semibold shrink-0 hover:bg-[#6F3F2A]"
        >
          <X className="w-3.5 h-3.5" />
          <span>Hoàn tất</span>
        </button>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <FavoritesProvider>
              <CatalogProvider>
                <CartProvider>
                  <ScrollToTop />
                  <div className="min-h-screen flex flex-col bg-[#FFF4EA] text-[#5A2E1C]">
                    <Header />
                    <ImageEditBanner />
                    <main className="flex-1">
                      <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/thuc-don" element={<MenuPage />} />
                        <Route path="/yeu-thich" element={<FavoritesPage />} />
                        <Route path="/uu-dai" element={<PromotionsPage />} />
                        <Route path="/cua-hang" element={<StorePage />} />
                        <Route path="/theo-doi" element={<TrackingPage />} />
                        <Route path="/ve-jeji" element={<AboutPage />} />
                        <Route path="/thanh-toan" element={<CheckoutPage />} />
                        <Route
                          path="/tai-khoan"
                          element={
                            <RequireAuth>
                              <AccountPage />
                            </RequireAuth>
                          }
                        />
                        <Route
                          path="/admin"
                          element={
                            <RequireAuth requiredRole="admin">
                              <AdminPage />
                            </RequireAuth>
                          }
                        />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </main>
                    <Footer />
                    <CartDrawer />
                    <MobileCartBar />
                    <JejiChatbot />
                    <ImageEditorModal />
                    <AuthModal />
                  </div>
                </CartProvider>
              </CatalogProvider>
            </FavoritesProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </MotionConfig>
  );
}
