// BẢN DỰNG THỬ — chỉ dùng khi môi trường không tải được thư viện npm (như môi trường của Claude).
// Bản dựng thật luôn là `npm run build` trên GitHub Actions. Bản thử này:
//   - đóng gói bằng esbuild thay cho Vite, KHÔNG có service worker/PWA;
//   - dùng React/Dexie có sẵn trên máy (phiên bản có thể khác bản thật một chút).
// Đủ để chụp ảnh giao diện và bấm thử chức năng.
//
// Cách dùng: node scripts/dung-thu.mjs [thư-mục-ra]   (mặc định: dist-thu)
// Biến môi trường (nếu đường dẫn khác):
//   ESBUILD_PATH  thư mục gói esbuild         NODE_MODULES_EXTRA  thư mục chứa react, react-dom
//   DEXIE_MJS     file dexie.mjs               DEXIE_HOOKS_SRC     file index.ts của dexie-react-hooks
import { mkdirSync, readFileSync, writeFileSync, cpSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, process.argv[2] || 'dist-thu');
const env = (k, d) => process.env[k] || d;
const ESBUILD = env('ESBUILD_PATH', '/opt/npm-tools/node_modules/esbuild');
const EXTRA = env('NODE_MODULES_EXTRA', '/home/claude/.npm-global/lib/node_modules');
const DEXIE = env('DEXIE_MJS', '/home/claude/vendor/dexie-rel/dist/dexie.mjs');
const HOOKS = env('DEXIE_HOOKS_SRC', '/home/claude/vendor/dexie-src/libs/dexie-react-hooks/src/index.ts');

for (const [ten, p] of [['esbuild', ESBUILD], ['react', join(EXTRA, 'react')], ['dexie', DEXIE], ['dexie-react-hooks', HOOKS]]) {
  if (!existsSync(p)) { console.error(`Không thấy ${ten} tại ${p}. Đặt biến môi trường tương ứng.`); process.exit(2); }
}

const esbuild = await import(pathToFileURL(join(ESBUILD, 'lib/main.js')).href);
rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, 'assets'), { recursive: true });

await esbuild.build({
  entryPoints: [join(ROOT, 'src/main.jsx')],
  bundle: true,
  format: 'esm',
  jsx: 'automatic',
  loader: { '.js': 'jsx' },
  outfile: join(OUT, 'assets/app.js'),
  nodePaths: [EXTRA],
  alias: { dexie: DEXIE, 'dexie-react-hooks': HOOKS },
  define: { 'process.env.NODE_ENV': '"production"' },
  minify: true,
  logLevel: 'warning'
});

const html = readFileSync(join(ROOT, 'index.html'), 'utf8')
  .replace('<script type="module" src="/src/main.jsx"></script>',
    '<link rel="stylesheet" href="./assets/app.css" />\n    <script type="module" src="./assets/app.js"></script>');
writeFileSync(join(OUT, 'index.html'), html);
cpSync(join(ROOT, 'public'), OUT, { recursive: true });
console.log('Đã dựng thử vào ' + OUT);
