import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Coffee,
  Eye,
  EyeOff,
  Gift,
  KeyRound,
  Loader2,
  X,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { isFirebaseConfigured } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import {
  evaluatePasswordStrength,
  isValidEmail,
  isValidPassword,
} from '../services/auth';
import { isValidVNPhone } from '../utils/format';
import { BrandLogo } from './BrandLogo';

type ModalViewMode = 'login' | 'register' | 'forgot';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    authModalTab,
    setAuthModalTab,
    closeAuthModal,
    login,
    register,
    loginWithGoogle,
    resetPassword,
  } = useAuth();
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<ModalViewMode>('login');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showLoginPw, setShowLoginPw] = useState(false);

  // Register fields
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regTerms, setRegTerms] = useState(true);
  const [showRegPw, setShowRegPw] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});

  // Forgot password fields (demo)
  const [fpPhone, setFpPhone] = useState('');
  const [fpName, setFpName] = useState('');
  const [fpNewPw, setFpNewPw] = useState('');
  const [fpConfirmPw, setFpConfirmPw] = useState('');
  const [showFpPw, setShowFpPw] = useState(false);

  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const firebaseReady = isFirebaseConfigured();

  useEffect(() => {
    if (isAuthModalOpen) {
      setViewMode(authModalTab);
      setFormError(null);
      setRegErrors({});
    }
  }, [isAuthModalOpen, authModalTab]);

  // Tự động focus vào ô nhập liệu đầu tiên khi mở hoặc chuyển tab
  useEffect(() => {
    if (!isAuthModalOpen) return;
    const t = setTimeout(() => {
      firstInputRef.current?.focus();
    }, 60);
    return () => clearTimeout(t);
  }, [isAuthModalOpen, viewMode]);

  // Đóng bằng phím Escape
  useEffect(() => {
    if (!isAuthModalOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeAuthModal();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isAuthModalOpen, closeAuthModal]);

  const strength = evaluatePasswordStrength(regPassword);

  const switchMode = (next: ModalViewMode) => {
    setViewMode(next);
    setFormError(null);
    setRegErrors({});
    if (next === 'login' || next === 'register') {
      setAuthModalTab(next);
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!loginIdentifier.trim()) {
      setFormError('Vui lòng nhập số điện thoại hoặc email.');
      return;
    }
    if (!loginPassword) {
      setFormError('Vui lòng nhập mật khẩu.');
      return;
    }

    setSubmitting(true);
    try {
      await login(loginIdentifier, loginPassword, rememberMe);
      setLoginPassword('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Đăng nhập không thành công.';
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const validateRegisterFields = (): boolean => {
    const errors: Record<string, string> = {};
    if (!regName.trim() || regName.trim().length < 2) {
      errors.full_name = 'Vui lòng nhập họ và tên (tối thiểu 2 ký tự).';
    }
    if (!isValidVNPhone(regPhone)) {
      errors.phone = 'Số điện thoại Việt Nam chưa hợp lệ (bắt đầu 0 hoặc +84, đủ 10 số).';
    }
    if (regEmail.trim() && !isValidEmail(regEmail)) {
      errors.email = 'Địa chỉ email chưa đúng định dạng.';
    }
    if (!isValidPassword(regPassword)) {
      errors.password = 'Mật khẩu cần tối thiểu 8 ký tự, gồm cả chữ và số.';
    }
    if (regConfirm !== regPassword || !regConfirm) {
      errors.confirm = 'Mật khẩu nhập lại chưa trùng khớp.';
    }
    if (!regTerms) {
      errors.terms = 'Bạn cần đồng ý điều khoản để tạo tài khoản.';
    }
    setRegErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!validateRegisterFields()) return;

    setSubmitting(true);
    try {
      await register({
        full_name: regName,
        phone: regPhone,
        email: regEmail,
        password: regPassword,
        confirm_password: regConfirm,
        accepted_terms: regTerms,
      });
      setRegPassword('');
      setRegConfirm('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo tài khoản.';
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!isValidVNPhone(fpPhone)) {
      setFormError('Số điện thoại chưa đúng định dạng Việt Nam.');
      return;
    }
    if (!fpName.trim()) {
      setFormError('Vui lòng nhập họ tên đã đăng ký để xác minh.');
      return;
    }
    if (!isValidPassword(fpNewPw)) {
      setFormError('Mật khẩu mới cần ít nhất 8 ký tự, gồm cả chữ và số.');
      return;
    }
    if (fpNewPw !== fpConfirmPw) {
      setFormError('Mật khẩu mới nhập lại chưa khớp.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(fpPhone, fpName, fpNewPw);
      setLoginIdentifier(fpPhone.trim());
      setFpNewPw('');
      setFpConfirmPw('');
      switchMode('login');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể đặt lại mật khẩu.';
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setFormError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Đăng nhập Google chưa khả dụng.';
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isAuthModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#5A2E1C]/45 backdrop-blur-xs overflow-y-auto"
          onClick={closeAuthModal}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.18 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-4xl rounded-[20px] border border-[#EDB9B3] shadow-2xl overflow-hidden my-auto"
            style={{ background: 'linear-gradient(135deg, #F9D5D3 0%, #FCE8D5 100%)' }}
          >
            {/* Nút đóng */}
            <button
              type="button"
              onClick={closeAuthModal}
              aria-label="Đóng cửa sổ tài khoản"
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-[#5A2E1C] flex items-center justify-center shadow-xs transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12">
              {/* Cột trái trên màn hình lớn: Minh họa ly cà phê dễ thương */}
              <div className="hidden lg:flex lg:col-span-5 flex-col justify-between p-8 bg-[#FFF4EA]/55 border-r border-[#EDB9B3]/70">
                <div>
                  <div className="font-display text-2xl font-bold tracking-tight">
                    <span className="text-[#8A5036]">Je</span>
                    <span className="text-[#C4535A]">Ji</span>
                    <span className="text-[#8A5036]"> Coffee</span>
                  </div>
                  <p className="mt-2 text-sm text-[#6F3F2A] leading-relaxed">
                    Thành viên JeJi được tích <strong>1 điểm / 1.000đ</strong> cho mỗi đơn hoàn thành,
                    lưu địa chỉ giao nhanh và đổi ưu đãi mỗi ngày.
                  </p>
                </div>

                {/* Hình ảnh logo linh vật JeJi Coffee */}
                <div className="my-6 flex items-center justify-center">
                  <BrandLogo
                    size="xl"
                    cropped={false}
                    className="w-48 h-48 rounded-3xl shadow-md border-[#EDB9B3]"
                  />
                </div>

                <div className="rounded-2xl bg-[#FFF4EA] border border-[#EDB9B3] p-4 flex items-start gap-3">
                  <Gift className="w-5 h-5 text-[#C4535A] shrink-0 mt-0.5" />
                  <p className="text-xs text-[#5A2E1C] leading-relaxed">
                    <strong>Quà thành viên mới:</strong> Nhận ngay mã ưu đãi giảm{' '}
                    <strong>10%</strong> cho đơn đầu tiên ngay sau khi tạo tài khoản!
                  </p>
                </div>
              </div>

              {/* Cột phải: Form Đăng nhập / Đăng ký */}
              <div className="lg:col-span-7 p-6 sm:p-8 bg-[#FFFDF8]/85">
                {/* 2 Tab chuyển nhanh */}
                {viewMode !== 'forgot' ? (
                  <div
                    role="tablist"
                    aria-label="Chọn chế độ tài khoản"
                    className="grid grid-cols-2 gap-2 p-1.5 rounded-2xl bg-[#FCE8D5] border border-[#EDB9B3] mb-6 mr-8 sm:mr-10"
                  >
                    <button
                      type="button"
                      role="tab"
                      aria-selected={viewMode === 'login'}
                      onClick={() => switchMode('login')}
                      className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                        viewMode === 'login'
                          ? 'bg-[#8A5036] text-[#FBDB93] shadow-xs'
                          : 'text-[#5A2E1C] hover:bg-white/50'
                      }`}
                    >
                      Đăng nhập
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={viewMode === 'register'}
                      onClick={() => switchMode('register')}
                      className={`py-2.5 px-3 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                        viewMode === 'register'
                          ? 'bg-[#8A5036] text-[#FBDB93] shadow-xs'
                          : 'text-[#5A2E1C] hover:bg-white/50'
                      }`}
                    >
                      Tạo tài khoản JeJi
                    </button>
                  </div>
                ) : (
                  <div className="mb-5 flex items-center justify-between pr-10">
                    <div className="flex items-center gap-2 text-[#914F1E]">
                      <KeyRound className="w-5 h-5" />
                      <h2 className="font-display text-xl font-bold">Đặt lại mật khẩu</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => switchMode('login')}
                      className="text-xs font-semibold text-[#C4535A] hover:underline"
                    >
                      Quay lại đăng nhập
                    </button>
                  </div>
                )}

                <h2 id="auth-modal-title" className="sr-only">
                  {viewMode === 'login'
                    ? 'Đăng nhập tài khoản JeJi Coffee'
                    : viewMode === 'register'
                    ? 'Tạo tài khoản JeJi Coffee'
                    : 'Quên mật khẩu tài khoản JeJi'}
                </h2>

                {/* Thông báo lỗi chung aria-live */}
                <div aria-live="polite">
                  {formError && (
                    <div className="mb-4 p-3 rounded-xl bg-[#FBE3E0] border border-[#D4606A]/50 text-xs sm:text-sm text-[#AA2B1D] font-medium flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{formError}</span>
                    </div>
                  )}
                </div>

                {/* === FORM ĐĂNG NHẬP === */}
                {viewMode === 'login' && (
                  <form onSubmit={handleLoginSubmit} className="space-y-4">
                    <div>
                      <label
                        htmlFor="auth-login-id"
                        className="block text-xs font-semibold text-[#5A2E1C] mb-1.5"
                      >
                        Số điện thoại hoặc Email *
                      </label>
                      <input
                        ref={firstInputRef}
                        id="auth-login-id"
                        type="text"
                        autoComplete="username"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        placeholder="Ví dụ: 0912345678 hoặc email@domain.com"
                        className="w-full px-4 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/25 text-sm text-[#5A2E1C] focus:outline-none focus:border-[#8A5036]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="auth-login-pw"
                        className="block text-xs font-semibold text-[#5A2E1C] mb-1.5"
                      >
                        Mật khẩu *
                      </label>
                      <div className="relative">
                        <input
                          id="auth-login-pw"
                          type={showLoginPw ? 'text' : 'password'}
                          autoComplete="current-password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Nhập mật khẩu"
                          className="w-full pl-4 pr-11 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/25 text-sm text-[#5A2E1C] focus:outline-none focus:border-[#8A5036]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowLoginPw((v) => !v)}
                          aria-label={showLoginPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#6F3F2A] hover:text-[#5A2E1C]"
                        >
                          {showLoginPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs">
                      <label className="inline-flex items-center gap-2 cursor-pointer text-[#5A2E1C]">
                        <input
                          type="checkbox"
                          checked={rememberMe}
                          onChange={(e) => setRememberMe(e.target.checked)}
                          className="accent-[#D4606A] rounded"
                        />
                        <span>Ghi nhớ đăng nhập (7 ngày)</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => switchMode('forgot')}
                        className="font-semibold text-[#C4535A] hover:underline"
                      >
                        Quên mật khẩu?
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-rose-gradient w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-65"
                    >
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>{submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}</span>
                    </button>

                    {firebaseReady && (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={handleGoogleLogin}
                        className="w-full py-2.5 rounded-xl bg-white border border-[#8A5036]/25 hover:bg-[#FFF4EA] text-sm font-semibold text-[#5A2E1C] transition-colors"
                      >
                        Tiếp tục với Google
                      </button>
                    )}
                  </form>
                )}

                {/* === FORM ĐĂNG KÝ === */}
                {viewMode === 'register' && (
                  <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label
                          htmlFor="auth-reg-name"
                          className="block text-xs font-semibold text-[#5A2E1C] mb-1"
                        >
                          Họ và tên *
                        </label>
                        <input
                          ref={firstInputRef}
                          id="auth-reg-name"
                          type="text"
                          autoComplete="name"
                          value={regName}
                          onChange={(e) => {
                            setRegName(e.target.value);
                            setRegErrors((prev) => ({ ...prev, full_name: '' }));
                          }}
                          placeholder="Nguyễn Minh Anh"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/25 text-sm text-[#5A2E1C] focus:outline-none focus:border-[#8A5036]"
                        />
                        {regErrors.full_name && (
                          <p className="mt-1 text-[11px] text-[#AA2B1D] font-medium" role="alert">
                            {regErrors.full_name}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="auth-reg-phone"
                          className="block text-xs font-semibold text-[#5A2E1C] mb-1"
                        >
                          Số điện thoại *
                        </label>
                        <input
                          id="auth-reg-phone"
                          type="tel"
                          autoComplete="tel"
                          value={regPhone}
                          onChange={(e) => {
                            setRegPhone(e.target.value);
                            setRegErrors((prev) => ({ ...prev, phone: '' }));
                          }}
                          placeholder="0912345678 hoặc +84..."
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/25 text-sm text-[#5A2E1C] tabular-nums focus:outline-none focus:border-[#8A5036]"
                        />
                        {regErrors.phone && (
                          <p className="mt-1 text-[11px] text-[#AA2B1D] font-medium" role="alert">
                            {regErrors.phone}
                          </p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="auth-reg-email"
                        className="block text-xs font-semibold text-[#5A2E1C] mb-1"
                      >
                        Email (không bắt buộc)
                      </label>
                      <input
                        id="auth-reg-email"
                        type="email"
                        autoComplete="email"
                        value={regEmail}
                        onChange={(e) => {
                          setRegEmail(e.target.value);
                          setRegErrors((prev) => ({ ...prev, email: '' }));
                        }}
                        placeholder="email@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/25 text-sm text-[#5A2E1C] focus:outline-none focus:border-[#8A5036]"
                      />
                      {regErrors.email && (
                        <p className="mt-1 text-[11px] text-[#AA2B1D] font-medium" role="alert">
                          {regErrors.email}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div>
                        <label
                          htmlFor="auth-reg-pw"
                          className="block text-xs font-semibold text-[#5A2E1C] mb-1"
                        >
                          Mật khẩu *
                        </label>
                        <div className="relative">
                          <input
                            id="auth-reg-pw"
                            type={showRegPw ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={regPassword}
                            onChange={(e) => {
                              setRegPassword(e.target.value);
                              setRegErrors((prev) => ({ ...prev, password: '' }));
                            }}
                            placeholder="Ít nhất 8 ký tự, chữ & số"
                            className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/25 text-sm text-[#5A2E1C] focus:outline-none focus:border-[#8A5036]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegPw((v) => !v)}
                            aria-label={showRegPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#6F3F2A]"
                          >
                            {showRegPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {regErrors.password && (
                          <p className="mt-1 text-[11px] text-[#AA2B1D] font-medium" role="alert">
                            {regErrors.password}
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor="auth-reg-confirm"
                          className="block text-xs font-semibold text-[#5A2E1C] mb-1"
                        >
                          Nhập lại mật khẩu *
                        </label>
                        <div className="relative">
                          <input
                            id="auth-reg-confirm"
                            type={showRegConfirm ? 'text' : 'password'}
                            autoComplete="new-password"
                            value={regConfirm}
                            onChange={(e) => {
                              setRegConfirm(e.target.value);
                              setRegErrors((prev) => ({ ...prev, confirm: '' }));
                            }}
                            placeholder="Nhập lại mật khẩu"
                            className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/25 text-sm text-[#5A2E1C] focus:outline-none focus:border-[#8A5036]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegConfirm((v) => !v)}
                            aria-label={showRegConfirm ? 'Ẩn mật khẩu nhập lại' : 'Hiện mật khẩu nhập lại'}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#6F3F2A]"
                          >
                            {showRegConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {regErrors.confirm && (
                          <p className="mt-1 text-[11px] text-[#AA2B1D] font-medium" role="alert">
                            {regErrors.confirm}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Thanh đo độ mạnh mật khẩu */}
                    {regPassword.length > 0 && (
                      <div className="space-y-1.5 bg-[#FFF4EA]/80 p-2.5 rounded-xl border border-[#8A5036]/12">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#6F3F2A]">Độ mạnh mật khẩu:</span>
                          <span className="font-semibold" style={{ color: strength.barColor }}>
                            {strength.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1 h-1.5">
                          {[1, 2, 3, 4].map((lvl) => (
                            <div
                              key={lvl}
                              className="rounded-full transition-colors"
                              style={{
                                backgroundColor:
                                  strength.score >= lvl ? strength.barColor : '#E3CDB8',
                              }}
                            />
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-[#6F3F2A]">
                          <span className={strength.hasMinLength ? 'text-[#5F8A56] font-medium' : ''}>
                            <Check className="w-3 h-3 inline mr-0.5" />
                            Tối thiểu 8 ký tự
                          </span>
                          <span className={strength.hasLetter ? 'text-[#5F8A56] font-medium' : ''}>
                            <Check className="w-3 h-3 inline mr-0.5" />
                            Có chữ cái
                          </span>
                          <span className={strength.hasNumber ? 'text-[#5F8A56] font-medium' : ''}>
                            <Check className="w-3 h-3 inline mr-0.5" />
                            Có chữ số
                          </span>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="inline-flex items-start gap-2 text-xs text-[#5A2E1C] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={regTerms}
                          onChange={(e) => {
                            setRegTerms(e.target.checked);
                            setRegErrors((prev) => ({ ...prev, terms: '' }));
                          }}
                          className="accent-[#D4606A] mt-0.5"
                        />
                        <span>
                          Tôi đồng ý với điều khoản thành viên và chính sách tích điểm của JeJi Coffee.
                        </span>
                      </label>
                      {regErrors.terms && (
                        <p className="mt-1 text-[11px] text-[#AA2B1D] font-medium" role="alert">
                          {regErrors.terms}
                        </p>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-rose-gradient w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-65"
                    >
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>{submitting ? 'Đang tạo tài khoản...' : 'Tạo tài khoản & nhận ưu đãi'}</span>
                    </button>

                    {firebaseReady && (
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={handleGoogleLogin}
                        className="w-full py-2.5 rounded-xl bg-white border border-[#8A5036]/25 hover:bg-[#FFF4EA] text-sm font-semibold text-[#5A2E1C] transition-colors"
                      >
                        Tiếp tục với Google
                      </button>
                    )}
                  </form>
                )}

                {/* === FORM QUÊN MẬT KHẨU (BẢN DEMO) === */}
                {viewMode === 'forgot' && (
                  <form onSubmit={handleForgotSubmit} className="space-y-4">
                    <p className="text-xs text-[#6F3F2A] leading-relaxed bg-[#FFF4EA] p-3 rounded-xl border border-[#8A5036]/15">
                      Phiên bản demo Giai đoạn 1: nhập đúng <strong>Số điện thoại</strong> và{' '}
                      <strong>Họ tên</strong> đã đăng ký để xác minh và đặt lại mật khẩu mới.
                    </p>

                    <div>
                      <label
                        htmlFor="auth-fp-phone"
                        className="block text-xs font-semibold text-[#5A2E1C] mb-1"
                      >
                        Số điện thoại đã đăng ký *
                      </label>
                      <input
                        ref={firstInputRef}
                        id="auth-fp-phone"
                        type="tel"
                        value={fpPhone}
                        onChange={(e) => setFpPhone(e.target.value)}
                        placeholder="0912345678"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/25 text-sm text-[#5A2E1C] tabular-nums focus:outline-none focus:border-[#8A5036]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="auth-fp-name"
                        className="block text-xs font-semibold text-[#5A2E1C] mb-1"
                      >
                        Họ và tên đã đăng ký *
                      </label>
                      <input
                        id="auth-fp-name"
                        type="text"
                        value={fpName}
                        onChange={(e) => setFpName(e.target.value)}
                        placeholder="Nguyễn Minh Anh"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/25 text-sm text-[#5A2E1C] focus:outline-none focus:border-[#8A5036]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label
                          htmlFor="auth-fp-pw"
                          className="block text-xs font-semibold text-[#5A2E1C] mb-1"
                        >
                          Mật khẩu mới *
                        </label>
                        <div className="relative">
                          <input
                            id="auth-fp-pw"
                            type={showFpPw ? 'text' : 'password'}
                            value={fpNewPw}
                            onChange={(e) => setFpNewPw(e.target.value)}
                            placeholder="Tối thiểu 8 ký tự, chữ & số"
                            className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/25 text-sm text-[#5A2E1C] focus:outline-none focus:border-[#8A5036]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowFpPw((v) => !v)}
                            aria-label={showFpPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#6F3F2A]"
                          >
                            {showFpPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label
                          htmlFor="auth-fp-confirm"
                          className="block text-xs font-semibold text-[#5A2E1C] mb-1"
                        >
                          Nhập lại mật khẩu mới *
                        </label>
                        <input
                          id="auth-fp-confirm"
                          type={showFpPw ? 'text' : 'password'}
                          value={fpConfirmPw}
                          onChange={(e) => setFpConfirmPw(e.target.value)}
                          placeholder="Nhập lại mật khẩu mới"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-[#FFF4EA] border border-[#8A5036]/25 text-sm text-[#5A2E1C] focus:outline-none focus:border-[#8A5036]"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="btn-rose-gradient w-full py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-65"
                    >
                      {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>{submitting ? 'Đang cập nhật...' : 'Xác minh & đặt lại mật khẩu'}</span>
                    </button>
                  </form>
                )}

                <p className="mt-4 text-[11px] text-[#6F3F2A]/85 text-center leading-relaxed">
                  Phiên bản demo Giai đoạn 1 lưu cục bộ bằng localStorage và băm SHA-256 trên trình duyệt.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
