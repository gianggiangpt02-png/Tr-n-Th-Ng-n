/**
 * Nén và thu nhỏ ảnh tải lên từ thiết bị về kích thước phù hợp (mặc định tối đa 720px)
 * dạng JPEG/WebP Data URL để lưu trữ bền vững trong localStorage mà không đầy bộ nhớ.
 */
export function compressImageFileToDataUrl(
  file: File,
  maxDimension = 720,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WebP).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không thể đọc tệp ảnh này.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Không thể xử lý định dạng ảnh này.'));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDimension || height > maxDimension) {
          if (width >= height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Trình duyệt không hỗ trợ xử lý ảnh.'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Ưu tiên WebP nếu trình duyệt hỗ trợ, fallback về JPEG
        const webp = canvas.toDataURL('image/webp', quality);
        if (webp.startsWith('data:image/webp')) {
          resolve(webp);
        } else {
          resolve(canvas.toDataURL('image/jpeg', quality));
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
