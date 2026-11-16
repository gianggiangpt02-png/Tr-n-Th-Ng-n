import { Combo } from '../types';

/**
 * Dữ liệu seed Combos (giữ nguyên tên cột như sheet Combos).
 * Định dạng items: "mã_sp:số_lượng|mã_sp:số_lượng"
 */
export const SEED_COMBOS: Combo[] = [
  {
    combo_id: 'CB001',
    name: 'Combo Sáng Tỉnh Táo',
    description: 'Cà phê muối Jeji đậm đà kết hợp cùng bánh tiramisu thủ công mềm mịn cho buổi sáng trọn vẹn.',
    items: 'SP001:1|SP012:1',
    combo_price: 52000,
    original_price: 61000,
    image_url: 'https://example.com/img/combo-sang.jpg',
    is_active: true,
    start_date: '2026-01-01',
    end_date: '2026-12-31',
  },
  {
    combo_id: 'CB002',
    name: 'Combo Đôi Bạn Trà Chiều',
    description: 'Hai ly trà trái cây thanh mát cho buổi trò chuyện rôm rả chiều muộn.',
    items: 'SP006:1|SP007:1',
    combo_price: 59000,
    original_price: 70000,
    image_url: 'https://example.com/img/combo-tra.jpg',
    is_active: true,
    start_date: '2026-01-01',
    end_date: '2026-12-31',
  },
  {
    combo_id: 'CB003',
    name: 'Combo Ngọt Ngào Cuối Tuần',
    description: 'Bạc xỉu béo thơm, Trà sữa trân châu và Bánh mousse chanh leo chua dịu cân bằng vị giác.',
    items: 'SP002:1|SP008:1|SP013:1',
    combo_price: 74000,
    original_price: 87000,
    image_url: 'https://example.com/img/combo-nhom.jpg',
    is_active: true,
    start_date: '2026-01-01',
    end_date: '2026-12-31',
  },
  {
    combo_id: 'CB004',
    name: 'Combo Mùa Hè (Đã kết thúc)',
    description: 'Combo thử nghiệm để kiểm tra bộ lọc ngày hết hạn.',
    items: 'SP010:1|SP011:1',
    combo_price: 58000,
    original_price: 70000,
    image_url: 'https://example.com/img/combo-he.jpg',
    is_active: true,
    start_date: '2026-05-01',
    end_date: '2026-08-31',
  },
];
