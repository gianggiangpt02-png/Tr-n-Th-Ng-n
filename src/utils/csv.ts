/**
 * Xuất mảng dữ liệu thành file CSV chuẩn UTF-8 BOM (mở trực tiếp bằng Excel không lỗi font tiếng Việt)
 * và giữ nguyên tên cột như cấu trúc sheet.
 */
export function exportTableToCSV<T extends object>(
  rows: T[],
  columns: (keyof T)[],
  filename: string
): void {
  const escapeCell = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
    const str = String(val);
    if (/[",\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = columns.map((col) => escapeCell(col)).join(',');
  const dataLines = rows.map((row) =>
    columns.map((col) => escapeCell(row[col])).join(',')
  );

  // UTF-8 BOM để Excel nhận diện tiếng Việt chuẩn xác
  const csvContent = '\uFEFF' + [headerLine, ...dataLines].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
