import React, { useEffect, useRef, useState } from 'react';
import { Camera, Link2, RotateCcw, Upload, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useCatalog } from '../hooks/useCatalog';
import { useToast } from '../hooks/useToast';
import { compressImageFileToDataUrl } from '../utils/image';
import { ProductImage } from './ProductImage';

export const ImageEditorModal: React.FC = () => {
  const { editTarget, closeImageEditor, saveTargetImage, resetTargetImage } = useCatalog();
  const { showToast } = useToast();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [urlInput, setUrlInput] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (editTarget) {
      const initial = editTarget.currentUrl || '';
      setPreviewUrl(initial);
      setUrlInput(initial.startsWith('data:') ? '' : initial.includes('example.com') ? '' : initial);
    }
  }, [editTarget]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && editTarget) closeImageEditor();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editTarget, closeImageEditor]);

  if (!editTarget) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsProcessing(true);
    try {
      const compressed = await compressImageFileToDataUrl(file, 720, 0.84);
      setPreviewUrl(compressed);
      setUrlInput('');
      showToast('Đã tải và tối ưu ảnh xem trước');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Không thể tải ảnh lên', 'error');
    } finally {
      setIsProcessing(false);
      e.target.value = '';
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const finalUrl = urlInput.trim() || previewUrl;
    if (!finalUrl) {
      showToast('Vui lòng chọn ảnh từ máy hoặc nhập link ảnh', 'error');
      return;
    }
    saveTargetImage(editTarget, finalUrl);
    showToast(`Đã cập nhật ảnh cho "${editTarget.title}"`);
    closeImageEditor();
  };

  const handleReset = () => {
    resetTargetImage(editTarget);
    showToast(`Đã khôi phục minh họa mặc định cho "${editTarget.title}"`);
    closeImageEditor();
  };

  const displayPreview = urlInput.trim() || previewUrl;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#8A5036]/50 backdrop-blur-xs"
        role="dialog"
        aria-modal="true"
        aria-labelledby="image-editor-title"
        onClick={closeImageEditor}
      >
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg rounded-3xl bg-[#FFF4EA] border border-[#8A5036]/25 shadow-2xl overflow-hidden"
        >
          <div className="px-6 py-4 bg-[#8A5036] text-[#FFF4EA] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Camera className="w-5 h-5 text-[#FBDB93]" />
              <div>
                <h2 id="image-editor-title" className="font-display text-lg font-bold text-[#FBDB93]">
                  Đổi ảnh hiển thị
                </h2>
                <p className="text-xs text-[#FFF4EA]/85">{editTarget.title}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={closeImageEditor}
              aria-label="Đóng hộp thoại đổi ảnh"
              className="p-2 rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSave} className="p-6 space-y-5">
            {/* Xem trước */}
            <div className="aspect-[16/10] w-full rounded-2xl overflow-hidden border border-[#8A5036]/15 bg-white">
              {editTarget.type === 'hero' ? (
                displayPreview && !displayPreview.includes('example.com') ? (
                  <img
                    src={displayPreview}
                    alt={editTarget.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#FCE8D5] text-[#5A2E1C] text-sm font-medium">
                    Đang dùng minh họa mặc định
                  </div>
                )
              ) : (
                <ProductImage
                  src={displayPreview}
                  alt={editTarget.title}
                  productId={editTarget.id}
                  category={editTarget.category}
                  size="lg"
                  className="w-full h-full"
                />
              )}
            </div>

            {/* Cách 1: Tải ảnh trực tiếp từ máy */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 px-4 rounded-xl bg-[#FBDB93] hover:bg-[#f5cc72] text-[#5A2E1C] font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>
                  {isProcessing ? 'Đang nén ảnh...' : 'Chọn ảnh từ máy tính / điện thoại'}
                </span>
              </button>
            </div>

            {/* Cách 2: Dán link ảnh (URL) */}
            <div>
              <label htmlFor="img-url-input" className="block text-xs font-semibold text-[#5A2E1C] mb-1.5">
                Hoặc dán đường dẫn ảnh (URL)
              </label>
              <div className="relative">
                <Link2 className="w-4 h-4 text-[#6F3F2A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="img-url-input"
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-white border border-[#8A5036]/20 text-sm text-[#5A2E1C] focus:outline-none focus:border-[#8A5036]"
                />
              </div>
            </div>

            {/* Nút hành động */}
            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-[#8A5036]/25 text-xs font-semibold text-[#6F3F2A] hover:text-[#5A2E1C] hover:bg-[#8A5036]/10 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Dùng ảnh mặc định</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={closeImageEditor}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#6F3F2A] hover:text-[#5A2E1C]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl btn-rose-gradient text-xs font-semibold transition-all"
                >
                  Lưu ảnh mới
                </button>
              </div>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
