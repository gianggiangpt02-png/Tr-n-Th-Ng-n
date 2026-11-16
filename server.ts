import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT || 3000);
const isProduction = process.env.NODE_ENV === 'production';

interface ChatMessageInput {
  role: 'user' | 'assistant';
  content: string;
}

interface CatalogProductContext {
  product_id: string;
  name: string;
  category: string;
  description: string;
  price_m: number;
  price_l: number | null;
  is_bestseller: boolean;
  is_available: boolean;
}

interface CatalogComboContext {
  combo_id: string;
  name: string;
  description: string;
  combo_price: number;
  original_price: number;
  items_summary: string;
}

interface CatalogDiscountContext {
  code: string;
  description: string;
  type: string;
  min_order: number;
  max_discount: number;
}

interface CatalogContextPayload {
  products?: CatalogProductContext[];
  combos?: CatalogComboContext[];
  discounts?: CatalogDiscountContext[];
  store?: {
    name?: string;
    slogan?: string;
    address?: string;
    hours?: string;
  };
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function buildSystemInstruction(ctx?: CatalogContextPayload): string {
  const productsText = (ctx?.products || [])
    .map((p) => {
      const priceText =
        p.price_l !== null
          ? `Size M ${p.price_m.toLocaleString('vi-VN')}đ / Size L ${p.price_l.toLocaleString('vi-VN')}đ`
          : `${p.price_m.toLocaleString('vi-VN')}đ`;
      const statusText = p.is_available ? 'Đang bán' : 'TẠM HẾT';
      const bestText = p.is_bestseller ? ' [Bán chạy]' : '';
      return `- ${p.product_id} | ${p.name} (${p.category})${bestText}: ${priceText} | ${statusText} | ${p.description}`;
    })
    .join('\n');

  const combosText = (ctx?.combos || [])
    .map(
      (c) =>
        `- ${c.combo_id} | ${c.name}: ${c.combo_price.toLocaleString('vi-VN')}đ (giá gốc ${c.original_price.toLocaleString('vi-VN')}đ) | Gồm: ${c.items_summary} | ${c.description}`
    )
    .join('\n');

  const discountsText = (ctx?.discounts || [])
    .map(
      (d) =>
        `- Mã ${d.code}: ${d.description} (đơn tối thiểu ${d.min_order.toLocaleString('vi-VN')}đ, giảm tối đa ${d.max_discount.toLocaleString('vi-VN')}đ)`
    )
    .join('\n');

  const storeName = ctx?.store?.name || 'JeJi Coffee';
  const slogan = ctx?.store?.slogan || 'Một ly cà phê - Một khoảnh khắc Jeji';
  const address = ctx?.store?.address || 'TP. Vĩnh Yên, Phú Thọ';
  const hours = ctx?.store?.hours || '07:00 – 22:30 hằng ngày';

  return `Bạn là "Bé Ly JeJi" — trợ lý AI thân thiện lấy cảm hứng từ nhân vật ly cà phê mang đi đang mỉm cười trong logo chính thức của ${storeName}.
Phong cách trò chuyện:
- Ấm áp, lễ phép, gần gũi, vui tươi vừa phải (xưng "mình" hoặc "Bé Ly JeJi", gọi khách là "bạn"), trả lời 100% tiếng Việt tự nhiên, ngắn gọn, dễ đọc (tối đa khoảng 3–6 câu hoặc gạch đầu dòng gọn gàng).
- Dựa TUYỆT ĐỐI vào dữ liệu cửa hàng thực tế bên dưới, KHÔNG bịa món, KHÔNG bịa giá hay mã giảm giá không tồn tại. Nếu món có trạng thái "TẠM HẾT", hãy báo rõ cho khách biết và gợi ý món khác đang bán.
- Có thể tư vấn tùy chỉnh mức đường (0%, 30%, 50%, 70%, 100%), mức đá (Không đá, Ít đá, Vừa, Nhiều đá) và topping (nếu đang bán) cho các món đồ uống.
- Thông tin quán: ${storeName} — "${slogan}". Địa chỉ: ${address}. Giờ mở cửa: ${hours}.
- Tích điểm thành viên: khách có tài khoản được tích 1 điểm / 1.000đ cho mỗi đơn Hoàn thành (hạng Đồng / Bạc / Vàng) và có thể đổi điểm lấy voucher.

THỰC ĐƠN HIỆN TẠI:
${productsText || 'Chưa có danh sách món.'}

COMBO ĐANG MỞ:
${combosText || 'Chưa có combo.'}

MÃ ƯU ĐÃI ĐANG ÁP DỤNG:
${discountsText || 'Chưa có mã ưu đãi.'}

YÊU CẦU ĐẦU RA JSON:
- reply: câu trả lời tiếng Việt tự nhiên, thân thiện cho khách hàng.
- productIds: mảng mã product_id (ví dụ ["SP001", "SP006"]) các món phù hợp nhất bạn vừa gợi ý (chỉ chọn món đang bán, tối đa 3 mã; nếu không gợi ý món cụ thể thì để []).
- comboIds: mảng mã combo_id (ví dụ ["CB001"]) các combo bạn vừa gợi ý (tối đa 2 mã; nếu không có để []).
- couponCode: 1 mã giảm giá phù hợp nhất bạn nhắc tới (ví dụ "HSSV15" hoặc "FREESHIP"), nếu không nhắc mã nào thì để chuỗi rỗng "".`;
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/chat', async (req: Request, res: Response) => {
    try {
      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error:
            'Trợ lý AI JeJi hiện chưa được kết nối khóa dịch vụ. Vui lòng kiểm tra cấu hình môi trường.',
        });
        return;
      }

      const body = (req.body || {}) as {
        messages?: ChatMessageInput[];
        catalogContext?: CatalogContextPayload;
      };

      const messages = Array.isArray(body.messages) ? body.messages : [];
      if (messages.length === 0) {
        res.status(400).json({ error: 'Vui lòng nhập câu hỏi để Bé Ly JeJi hỗ trợ bạn nhé.' });
        return;
      }

      const trimmedHistory = messages.slice(-10).map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: String(m.content || '').slice(0, 1500) }],
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: trimmedHistory,
        config: {
          systemInstruction: buildSystemInstruction(body.catalogContext),
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reply: {
                type: Type.STRING,
                description: 'Câu trả lời tiếng Việt thân thiện cho khách hàng.',
              },
              productIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Danh sách product_id được gợi ý (tối đa 3).',
              },
              comboIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Danh sách combo_id được gợi ý (tối đa 2).',
              },
              couponCode: {
                type: Type.STRING,
                description: 'Mã giảm giá gợi ý nếu có, hoặc chuỗi rỗng.',
              },
            },
            required: ['reply', 'productIds', 'comboIds', 'couponCode'],
          },
        },
      });

      const rawText = (response.text || '').trim();
      let parsed: {
        reply: string;
        productIds: string[];
        comboIds: string[];
        couponCode: string;
      } = {
        reply: 'Mình chưa nghe rõ ý bạn lắm, bạn nhắn lại giúp Bé Ly JeJi nha!',
        productIds: [],
        comboIds: [],
        couponCode: '',
      };

      if (rawText) {
        try {
          const json = JSON.parse(rawText) as Partial<typeof parsed>;
          parsed = {
            reply: typeof json.reply === 'string' && json.reply.trim() ? json.reply : parsed.reply,
            productIds: Array.isArray(json.productIds)
              ? json.productIds.filter((x): x is string => typeof x === 'string').slice(0, 3)
              : [],
            comboIds: Array.isArray(json.comboIds)
              ? json.comboIds.filter((x): x is string => typeof x === 'string').slice(0, 2)
              : [],
            couponCode: typeof json.couponCode === 'string' ? json.couponCode.trim() : '',
          };
        } catch {
          parsed.reply = rawText;
        }
      }

      res.json(parsed);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('PERMISSION_DENIED') || errMsg.includes('API_KEY_INVALID')) {
        res.status(401).json({
          error: 'Không xác thực được dịch vụ AI. Vui lòng kiểm tra cấu hình GEMINI_API_KEY.',
        });
        return;
      }
      if (errMsg.includes('RESOURCE_EXHAUSTED')) {
        res.status(429).json({
          error: 'Bé Ly JeJi đang tiếp nhiều khách cùng lúc, bạn thử gửi lại sau vài giây nhé!',
        });
        return;
      }
      res.status(500).json({
        error: 'Trợ lý JeJi đang bận pha chế một chút, bạn vui lòng thử lại sau nhé.',
      });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('/{*splat}', (_req: Request, res: Response) => {
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Not found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    // Server listening on port 3000
  });
}

createServer();
