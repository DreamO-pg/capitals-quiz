/**
 * Рисует картинки для BotFather и favicon. Запускать вручную:
 *
 *   node scripts/build-icons.mjs
 *
 * Конвертеров SVG в системе нет, а тянуть в проект нативный модуль ради трёх
 * картинок незачем — растеризуем сами и кодируем PNG через встроенный zlib.
 * Сглаживание получаем сверхдискретизацией: рисуем вчетверо крупнее и усредняем.
 */

import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'brand');

const PAPER = [0xfa, 0xf9, 0xf5];
const ACCENT = [0x00, 0x7c, 0x99];
const ACCENT_BG = [0xd8, 0xf0, 0xf8];
const LINE = [0xda, 0xd6, 0xcc];

const SS = 4; // кратность сверхдискретизации

/* ─────────────────────────── PNG ─────────────────────────── */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

/** RGB без альфы: картинки непрозрачные, лишний канал только раздувает файл. */
function encodePng(width, height, rgb) {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // тип фильтра строки: без фильтрации
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // бит на канал
  ihdr[9] = 2; // truecolor
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/* ─────────────────────────── Рисование ─────────────────────────── */

/** Холст в сверхдискретизации: пишем цвета, в конце усредняем блоками SS×SS. */
function canvas(width, height, background) {
  const w = width * SS;
  const h = height * SS;
  const buf = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    buf[i * 3] = background[0];
    buf[i * 3 + 1] = background[1];
    buf[i * 3 + 2] = background[2];
  }
  return {
    w,
    h,
    put(x, y, color) {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      const i = (y * w + x) * 3;
      buf[i] = color[0];
      buf[i + 1] = color[1];
      buf[i + 2] = color[2];
    },
    /** Заливка по предикату: медленно, но читаемо и для трёх картинок хватает. */
    fill(color, inside) {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          if (inside(x + 0.5, y + 0.5)) this.put(x, y, color);
        }
      }
    },
    downsample() {
      const out = Buffer.alloc(width * height * 3);
      const area = SS * SS;
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let r = 0;
          let g = 0;
          let b = 0;
          for (let dy = 0; dy < SS; dy++) {
            for (let dx = 0; dx < SS; dx++) {
              const i = ((y * SS + dy) * w + (x * SS + dx)) * 3;
              r += buf[i];
              g += buf[i + 1];
              b += buf[i + 2];
            }
          }
          const o = (y * width + x) * 3;
          out[o] = Math.round(r / area);
          out[o + 1] = Math.round(g / area);
          out[o + 2] = Math.round(b / area);
        }
      }
      return out;
    },
  };
}

/**
 * Знак игры — тот же глобус, что стоит врезкой на экране ответа:
 * шар, меридиан, экватор и точка столицы. Ничего сверх этого,
 * буквы не рисуем — шрифт растеризовать нечем, да и незачем.
 */
function drawGlobe(c, cx, cy, radius) {
  const ring = Math.max(2, radius * 0.085);
  const meridian = radius * 0.42;

  c.fill(ACCENT_BG, (x, y) => Math.hypot(x - cx, y - cy) <= radius);
  c.fill(ACCENT, (x, y) => Math.abs(Math.hypot(x - cx, y - cy) - radius) <= ring / 2);

  // Экватор: горизонтальная хорда внутри шара.
  c.fill(
    ACCENT,
    (x, y) =>
      Math.abs(y - cy) <= ring * 0.42 && Math.hypot(x - cx, y - cy) <= radius - ring * 0.4,
  );

  // Меридиан: эллипс той же высоты, что шар.
  c.fill(ACCENT, (x, y) => {
    const f = Math.hypot((x - cx) / meridian, (y - cy) / radius);
    return Math.abs(f - 1) * meridian <= ring * 0.42 && Math.hypot(x - cx, y - cy) <= radius;
  });

  // Точка столицы — смещена вверх и вправо, как на врезке в игре.
  const dot = radius * 0.17;
  const dx = cx + radius * 0.34;
  const dy = cy - radius * 0.3;
  c.fill(PAPER, (x, y) => Math.hypot(x - dx, y - dy) <= dot * 1.5);
  c.fill(ACCENT, (x, y) => Math.hypot(x - dx, y - dy) <= dot);
}

async function render(name, width, height, radiusShare) {
  const c = canvas(width, height, PAPER);
  const cx = c.w / 2;
  const cy = c.h / 2;
  drawGlobe(c, cx, cy, Math.min(c.w, c.h) * radiusShare);
  // Тонкая рамка по краю: на белом фоне телеграма квадрат иначе растворяется.
  const edge = Math.max(1, SS);
  c.fill(
    LINE,
    (x, y) => x < edge || y < edge || x > c.w - edge - 1 || y > c.h - edge - 1,
  );
  await writeFile(join(OUT, name), encodePng(width, height, c.downsample()));
  return name;
}

await mkdir(OUT, { recursive: true });
const files = [
  await render('bot-icon-512.png', 512, 512, 0.34),
  await render('app-card-640x360.png', 640, 360, 0.3),
  await render('favicon-64.png', 64, 64, 0.34),
];
process.stderr.write(`готово: ${files.join(', ')}\n`);
