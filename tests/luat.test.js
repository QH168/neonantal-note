// Luật cứng của dự án, kiểm bằng máy (harness). Lấy từ doi-agent/QUYET_DINH_DA_CHOT.md.
// Một luật bị vi phạm → npm test thất bại → GitHub Actions không đăng bản mới.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const list = (dir) => readdirSync(join(ROOT, dir), { recursive: true })
  .map((f) => join(dir, String(f)).replaceAll('\\', '/'))
  .filter((f) => /\.(js|jsx|css|html)$/.test(f));
const SRC = list('src');

// Những chỗ đã biết đang lệch luật, chờ bác sĩ duyệt sửa (xem doi-agent/NHAT_KY.md mục "Chờ duyệt").
// Không thêm vào danh sách này nếu bác sĩ chưa đồng ý.
const DA_BIET = {
  ghiThang: [],   // 28/10/2026: đã xoá TaskDemo.jsx
  oNhapNho: []    // 28/10/2026: khung Tổng hợp y lệnh (.mono) đã lên 16px
};

test('luật 1: không có ô họ tên bệnh nhân', () => {
  const cam = /(hoTen|ho_ten|fullName|patientName|họ\s*(và\s*)?tên|ho\s*ten)/i;
  for (const f of SRC) assert.doesNotMatch(read(f), cam, `${f} có dấu hiệu ô họ tên`);
});

test('luật 2: không đổi tên cơ sở dữ liệu và khối db.version(1)', () => {
  const db = read('src/db.js');
  assert.match(db, /new Dexie\('ghichu-sosinh'\)/, 'tên CSDL phải là ghichu-sosinh');
  const v1 = /db\.version\(1\)\.stores\(\{([\s\S]*?)\}\);/.exec(db);
  assert.ok(v1, 'không tìm thấy khối db.version(1)');
  const bang = v1[1].replace(/\/\/.*$/gm, '').replace(/\s+/g, '');
  assert.equal(bang,
    "tasks:'id,date,zone,updatedAt',rooms:'id,order,updatedAt',exam_patients:'id,examDate,roomId,[examDate+roomId],updatedAt',patient_todos:'id,patientId,updatedAt',meta:'key'",
    'khối db.version(1) đã bị sửa — hãy thêm db.version(2) thay vì sửa version(1)');
});

test('luật 3: ô nhập trên iPhone ≥16px (Safari không tự phóng to)', () => {
  const css = read('src/App.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const oNhap = /(^|[\s,>.])(input|select|textarea)\b|\.(input|select|bare-input|textarea|mono)\b/;
  const loi = [];
  for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const sel = m[1].trim();
    const fs = /font-size:\s*(\d+(?:\.\d+)?)px/.exec(m[2]);
    if (!fs || +fs[1] >= 16) continue;
    for (const s of sel.split(',')) {
      const last = s.trim().split(/\s+/).pop(); // phần tử cuối của bộ chọn là phần tử được tô
      if (!oNhap.test(' ' + last)) continue;
      if (DA_BIET.oNhapNho.some((k) => last.includes(k))) continue;
      loi.push(`${s.trim()} = ${fs[1]}px`);
    }
  }
  assert.deepEqual(loi, [], 'ô nhập nhỏ hơn 16px: ' + loi.join('; '));
});

test('luật 4: màn hình không ghi thẳng vào cơ sở dữ liệu (phải qua src/lib/actions.js)', () => {
  const loi = [];
  for (const f of SRC.filter((x) => x.startsWith('src/components/') || x === 'src/App.jsx')) {
    if (DA_BIET.ghiThang.includes(f)) continue;
    const s = read(f);
    if (/import\s*\{[^}]*\b(addRow|updateRow|softDelete)\b[^}]*\}\s*from\s*['"][^'"]*db\.js['"]/.test(s)) loi.push(f + ': import hàm ghi từ db.js');
    if (/\bdb\.\w+\.(add|put|update|delete|bulkPut|bulkAdd|bulkDelete|clear)\(/.test(s)) loi.push(f + ': gọi db.<bảng>.<ghi>()');
  }
  assert.deepEqual(loi, [], loi.join('\n'));
});

test('luật 5: không thêm thư viện mới khi chưa được duyệt', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.deepEqual(Object.keys(pkg.dependencies || {}).sort(), ['dexie', 'dexie-react-hooks', 'react', 'react-dom']);
  assert.deepEqual(Object.keys(pkg.devDependencies || {}).sort(), ['@vitejs/plugin-react', 'vite', 'vite-plugin-pwa']);
});

test('luật 6: không hiện "còn bao nhiêu ngày đến 40w"', () => {
  for (const f of SRC) assert.doesNotMatch(read(f), /đến\s*40\s*w|to40|den40/i, f);
});

test('luật 7: khu vực, mức ưu tiên, định dạng sao lưu giữ đúng như đã chốt', () => {
  assert.match(read('src/db.js'), /ZONES = \['NICU', 'CT', 'KAN', 'PS-PM', 'BM', 'DV'\]/);
  const ui = read('src/components/ui.jsx');
  assert.match(ui, /PRI_NAME = \{ 1: 'đỏ', 2: 'vàng', 3: 'xanh lá', 4: 'xanh dương', 5: 'NV' \}/);
  assert.match(read('src/lib/actions.js'), /urgency: \(t\.urgency % 5\) \+ 1/, 'vòng đổi mức 1→2→3→4→NV→1');
  assert.match(read('src/lib/merge.js'), /BACKUP_FORMAT = 'ghichu-sosinh-backup'/);
});

test('luật 8: app không gửi dữ liệu ra mạng', () => {
  const mang = /\bfetch\(|XMLHttpRequest|sendBeacon|new WebSocket/;
  for (const f of SRC) assert.doesNotMatch(read(f), mang, `${f} có lệnh gửi mạng`);
});

test('luật 9: đường dẫn app lấy từ BASE_PATH (giữ nguyên link GitHub Pages)', () => {
  const v = read('vite.config.js');
  assert.match(v, /process\.env\.BASE_PATH/);
  assert.match(v, /start_url: base/);
});
