// Luật cứng của dự án, kiểm bằng máy (harness). Lấy từ doi-agent/QUYET_DINH_DA_CHOT.md.
// Một luật bị vi phạm → npm test thất bại → GitHub Actions không đăng bản mới.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { docCheDo, laToi, tangLanMo, hienDongNhac, SO_LAN_NHAC } from '../src/lib/cai-dat.js';

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

test('luật 2b: có db.version(2) chứa abbrevs và DATA_TABLES có abbrevs', () => {
  // bác sĩ duyệt 28/10/2026 (v8 đợt 2 — viết tắt)
  const db = read('src/db.js');
  const v2 = /db\.version\(2\)\.stores\(\{([\s\S]*?)\}\);/.exec(db);
  assert.ok(v2, 'không tìm thấy khối db.version(2)');
  assert.match(v2[1], /abbrevs:\s*'id, key, updatedAt'/);
  assert.match(db, /DATA_TABLES = \[[^\]]*'abbrevs'[^\]]*\]/);
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
  // bác sĩ duyệt 28/10/2026: khu mới; 'BM' thành khu cũ, chỉ hiện khi còn việc cũ
  assert.match(read('src/db.js'), /ZONES = \['NICU', 'CT', 'KAN', 'PS-PM', 'Ngoại Trú', 'DV', 'HP', 'HS'\]/);
  assert.match(read('src/db.js'), /LEGACY_ZONES = \['BM'\]/);
  // bác sĩ duyệt 28/10/2026: 5 nhãn loại việc
  assert.match(read('src/lib/viec.js'), /TAGS = \['NV', 'BM', 'CK', 'HC', 'XN'\]/);
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

test('luật 10: bảng dưới (Sheet) vẽ thẳng vào body để luôn phủ trên cùng trên iPhone (bác sĩ báo lỗi 29/10/2026)', () => {
  const ui = read('src/components/ui.jsx');
  assert.match(ui, /import \{ createPortal \} from 'react-dom'/);
  assert.match(ui, /createPortal\([\s\S]*?document\.body\s*\)/);
});

// ===== v9 đợt 9.1: token, đầu trang 3 nút, cài đặt giao diện =====
test('v9.1: chế độ giao diện — giá trị cũ light/dark vẫn đọc đúng, chưa có hoặc lạ thì Theo máy', () => {
  assert.equal(docCheDo('light'), 'light');
  assert.equal(docCheDo('dark'), 'dark');
  assert.equal(docCheDo('auto'), 'auto');
  for (const x of [null, undefined, '', 'Dark', 'tối', 'true', 0, {}]) assert.equal(docCheDo(x), 'auto', String(x));
  // Sáng/Tối không phụ thuộc máy; Theo máy đi theo máy
  assert.equal(laToi('light', true), false);
  assert.equal(laToi('dark', false), true);
  assert.equal(laToi('auto', true), true);
  assert.equal(laToi('auto', false), false);
  assert.equal(laToi('auto', undefined), false);
});

test('v9.1: dòng nhắc cử chỉ — 3 lần mở đầu hoặc khi danh sách của ngày trống', () => {
  assert.equal(tangLanMo(null), 1);
  assert.equal(tangLanMo('abc'), 1);
  assert.equal(tangLanMo('-5'), 1);
  assert.equal(tangLanMo('1'), 2);
  assert.equal(tangLanMo('3'), 4);
  assert.equal(tangLanMo('99999'), 1000); // chặn số quá lớn
  for (const n of [1, 2, 3]) assert.equal(hienDongNhac(n, 5), true, `lần mở thứ ${n}`);
  assert.equal(hienDongNhac(4, 5), false, 'lần mở thứ 4, có việc: ẩn');
  assert.equal(hienDongNhac(40, 1), false);
  assert.equal(hienDongNhac(4, 0), true, 'danh sách trống: hiện');
  assert.equal(SO_LAN_NHAC, 3);
});

test('v9.1: src/lib/cai-dat.js là hàm thuần (không dùng window/document/localStorage)', () => {
  const s = read('src/lib/cai-dat.js').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(s, /\b(window|document|localStorage|sessionStorage|matchMedia|navigator)\b/);
});

// --- đọc biến màu trong App.css (cả bản sáng .th và tối .th.dark) ---
const bienMau = () => {
  const css = read('src/App.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const out = { sang: {}, toi: {} };
  for (const m of css.matchAll(/^\.th(\.dark)?\{([^}]*)\}/gm)) {
    for (const v of m[2].matchAll(/(--[\w]+):([^;}]+)/g)) out[m[1] ? 'toi' : 'sang'][v[1]] = v[2].trim();
  }
  return out;
};
const sang = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const tuongPhan = (a, b) => { const [x, y] = [sang(a), sang(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test('v9.1: màu nhãn mới có cả bản sáng và tối, đúng bảng 16a, chữ trên nền ≥ 4,5:1; --p1…--p5 không đổi', () => {
  const V = bienMau();
  const dung = {
    sang: { NV: ['#F8D7D3', '#8C2A20'], BM: ['#F7E6B8', '#6E4E00'], CK: ['#D3EAF0', '#1B5566'], HC: ['#DDE3F6', '#2C3F86'], XN: ['#E8DDF3', '#573884'] },
    toi: { NV: ['#4C2723', '#F5C4BD'], BM: ['#4A3B15', '#F0D88F'], CK: ['#173A44', '#A9D8E5'], HC: ['#232D52', '#BFCBF3'], XN: ['#34284A', '#D8C7EF'] }
  };
  for (const che of ['sang', 'toi']) {
    for (const [tag, [nen, chu]] of Object.entries(dung[che])) {
      assert.equal(V[che]['--t' + tag]?.toUpperCase(), nen, `${che} --t${tag}`);
      assert.equal(V[che]['--t' + tag + 'i']?.toUpperCase(), chu, `${che} --t${tag}i`);
      assert.ok(tuongPhan(nen, chu) >= 4.5, `${che} ${tag}: tương phản ${tuongPhan(nen, chu).toFixed(2)}`);
      // nút chọn nhãn khi tắt: chữ màu nhãn trên nền bề mặt (trắng / #17212B)
      const be = che === 'sang' ? V.sang['--surface'] : V.toi['--surface'];
      assert.ok(tuongPhan(be, chu) >= 4.5, `${che} ${tag}: nút tắt ${tuongPhan(be, chu).toFixed(2)}`);
    }
  }
  const p = { sang: ['#C62828', '#FFFFFF', '#C62828', '#F2B90F', '#12202B', '#A67800', '#2E7D32', '#FFFFFF', '#2E7D32', '#1A3FA6', '#FFFFFF', '#1A3FA6', '#7B3FA0', '#FFFFFF', '#7B3FA0'],
    toi: ['#EF5350', '#1A0A0A', '#EF5350', '#F2B90F', '#12202B', '#F2B90F', '#4CAF50', '#0B1F0C', '#4CAF50', '#7C93FF', '#0A1240', '#7C93FF', '#C9A0E8', '#22102F', '#C9A0E8'] };
  for (const che of ['sang', 'toi']) {
    let i = 0;
    for (let n = 1; n <= 5; n++) for (const s of ['', 'i', 'e']) assert.equal(V[che][`--p${n}${s}`]?.toUpperCase(), p[che][i++], `${che} --p${n}${s} bị đổi`);
  }
  assert.equal(read('src/lib/viec.js').includes("TAG_COLOR = { NV: 1, BM: 2, CK: 3, HC: 4, XN: 5 }"), true);
  assert.match(read('src/components/ui.jsx'), /--t\$\{k\}i/, 'TagDot phải dùng biến màu nhãn mới');
});

test('v9.1: màu trạng thái (mục 1.3) có đủ cả sáng và tối; bản tối đạt tương phản chữ ≥4,5:1, biểu tượng ≥3:1', () => {
  const V = bienMau();
  const ten = ['okBg', 'okInk', 'swR', 'swR2', 'swL', 'swL2', 'delInk', 'delBg', 'doneLine', 'doneInk', 'noteBg', 'noteInk', 'noteLine', 'rangeBg', 'rangeEnd', 'rangeLine', 'rangeInk', 'chipZero'];
  for (const k of ten) for (const che of ['sang', 'toi']) assert.match(V[che]['--' + k] || '', /^#[0-9A-Fa-f]{6}$/, `${che} --${k}`);
  for (const [k, v] of Object.entries({ okBg: '#C8E6C9', okInk: '#2E7D32', swR: '#C8E6C9', swR2: '#A5D6A7', swL: '#F6D5D2', swL2: '#EFB8B2', delInk: '#A8473D', delBg: '#FBEAE8', doneLine: '#2E7D32', doneInk: '#1B5E20', noteBg: '#FBF3DF', noteInk: '#6E4E00', noteLine: '#E4C98A', rangeBg: '#EEF6FC', rangeEnd: '#CFE6F7', rangeLine: '#5BA8DA', rangeInk: '#075985', chipZero: '#6B7F91' })) {
    assert.equal(V.sang['--' + k].toUpperCase(), v, 'sáng --' + k);
  }
  for (const [k, v] of Object.entries({ okBg: '#A5D6A7', okInk: '#0B2410', swR: '#2F5A34', swL: '#5A2C28', delInk: '#F5C4BD', delBg: '#4C2723', doneLine: '#A5D6A7', doneInk: '#A5D6A7', noteBg: '#3A2F14', noteInk: '#F0D88F' })) {
    assert.equal(V.toi['--' + k].toUpperCase(), v, 'tối --' + k);
  }
  const T = V.toi;
  const chu = [['okInk/okBg', 'okInk', 'okBg', 3], ['delInk/delBg', 'delInk', 'delBg', 4.5], ['delInk/surface', 'delInk', 'surface', 4.5],
    ['doneInk/surface', 'doneInk', 'surface', 4.5], ['doneLine/surface', 'doneLine', 'surface', 3], ['noteInk/noteBg', 'noteInk', 'noteBg', 4.5],
    ['rangeInk/rangeEnd', 'rangeInk', 'rangeEnd', 4.5], ['rangeInk/rangeBg', 'rangeInk', 'rangeBg', 4.5], ['rangeLine/rangeEnd', 'rangeLine', 'rangeEnd', 3], ['rangeLine/surface', 'rangeLine', 'surface', 3],
    ['chipZero/surface', 'chipZero', 'surface', 4.5], ['chipZero/bg', 'chipZero', 'bg', 4.5]];
  for (const [ten2, a, b, min] of chu) {
    const r = tuongPhan(T['--' + a], T['--' + b]);
    assert.ok(r >= min, `tối ${ten2}: ${r.toFixed(2)} < ${min}`);
  }
});

test('v9.1: đầu trang chỉ còn nút /a, đám mây, lịch — bỏ nút sáng/tối; tên bảng và nhãn nút đúng', () => {
  const app = read('src/App.jsx');
  assert.doesNotMatch(app, /Chuyển sang giao diện/);
  assert.doesNotMatch(app, /\b(Sun|Moon)\b/);
  assert.match(app, /aria-label=\{'Sao lưu và cài đặt'/);
  assert.match(app, /<Sheet label="Sao lưu và cài đặt"/);
  assert.match(app, /useGiaoDien\(\)/);
  assert.match(read('src/components/BackupPanel.jsx'), /title="Sao lưu và cài đặt"/);
  // chế độ giao diện chỉ ở localStorage, không vào CSDL
  assert.doesNotMatch(read('src/hooks.js'), /db\.meta\.(put|add)|updateRow\('meta'/);
  assert.match(read('src/hooks.js'), /localStorage\.setItem\(KHOA_CHE_DO/);
});

test('v9.1: iPhone không còn cỡ chữ 12,5 / 13,5 / 14 / 18 (thang 5 bậc); PC giữ cỡ cũ', () => {
  const css = read('src/App.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const loi = [];
  for (const m of css.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
    const sel = m[1].trim();
    if (!sel.includes(':is(.phone-app,.sheet-ph)')) continue;
    const fs = /font-size:\s*(\d+(?:\.\d+)?)px/.exec(m[2]);
    if (fs && [12.5, 13.5, 14, 18].includes(+fs[1])) loi.push(`${sel} = ${fs[1]}px`);
  }
  assert.deepEqual(loi, [], loi.join('; '));
  assert.match(css, /\.task-note\{font-size:12\.5px/, 'PC giữ cỡ chữ cũ của ghi chú');
});

// ===== v9 đợt 9.3: ô thêm việc 1 dòng, viết tắt, thư viện =====
test('v9.3: cách tính bàn phím (visualViewport) chỉ có một chỗ, dùng chung cho Sheet, thanh thêm việc và thanh Hoàn tác', () => {
  const hooks = read('src/hooks.js');
  assert.match(hooks, /export function khungBanPhim\(/);
  assert.match(hooks, /export function theoDoiBanPhim\(/);
  assert.match(hooks, /export function useBanPhim\(/);
  assert.match(read('src/components/ui.jsx'), /theoDoiBanPhim\(/);
  assert.match(read('src/components/Tasks.jsx'), /useBanPhim\(/);
  assert.match(read('src/components/HoanTac.jsx'), /useBanPhim\(/);
  // không ai khác tự nghe visualViewport
  for (const f of SRC.filter((x) => /\.jsx?$/.test(x) && x !== 'src/hooks.js')) {
    assert.doesNotMatch(read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, ''), /visualViewport/, f + ' tự tính bàn phím, phải dùng hooks.js');
  }
});

test('v9.3: viết tắt — thanh "Đã đổi … thành …" giữ 6 giây, bỏ chữ "Gợi ý (chạm để chèn):", nút không làm mất bàn phím', () => {
  const vt = read('src/components/VietTat.jsx');
  assert.match(vt, /THOI_GIAN_BAO = 6000/);
  assert.doesNotMatch(vt, /Gợi ý \(chạm để chèn\)/);
  assert.match(vt, /Đã đổi \/\{bao\.key\} thành \{bao\.ketQua\.noiDung\}/);
  // nút gợi ý và Hoàn tác đều có preventDefault ở pointerdown và mousedown
  assert.equal((vt.match(/onPointerDown=\{giuFocus\} onMouseDown=\{giuFocus\}/g) || []).length, 2);
  // thanh dùng màu --undo*, không còn hộp sáng chói của --badge / --vtAct
  const css = read('src/App.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const toast = /\.vt-toast\{([^}]*)\}/.exec(css)[1];
  assert.match(toast, /var\(--undoBg\)/);
  assert.match(toast, /var\(--undoInk\)/);
  assert.doesNotMatch(toast, /--badge/);
  assert.match(/\.vt-undo\{([^}]*)\}/.exec(css)[1], /var\(--undoAct\)/);
});

test('v9.3: ô thêm việc iPhone — nút "+" aria-label "Thêm việc", nhãn ô giữ nguyên, không còn nút chữ / chữ "Nhãn (chọn được nhiều)" / ô chọn khu ở thanh dưới', () => {
  const t = read('src/components/Tasks.jsx');
  assert.match(t, /aria-label="Thêm việc"/);
  assert.match(t, /Nội dung công việc/);
  assert.doesNotMatch(t, /Nhãn \(chọn được nhiều\)/);
  assert.match(t, /khiRoiOThemViec\(/); // luật thu lại là hàm thuần trong src/lib/viec.js
  assert.match(t, /chuanTenViec\(draftRef\.current\)/); // không tạo việc rỗng, không thêm trùng khi bấm liền
  assert.doesNotMatch(read('src/lib/viec.js'), /from ['"]react['"]|document\.|window\./);
});

test('v9.3: thư viện viết tắt — không còn bút chì; dòng mở sửa bằng chạm 2 lần / Enter; PencilIcon đã xoá', () => {
  const tv = read('src/components/ThuVien.jsx');
  assert.doesNotMatch(tv, /PencilIcon/);
  assert.match(tv, /boDemCham\(c\.mocs, 2\)/);
  assert.match(tv, /aria-label=\{'Sửa \/' \+ m\.key\}/);
  assert.match(tv, /aria-label="Thêm vào thư viện"/);
  assert.match(tv, /placeholder="Tìm theo chữ viết tắt hoặc nội dung"/);
  assert.match(tv, /Chạm 2 lần vào dòng để sửa\. Vuốt trái quá 1\/3 rồi thả để xoá, có hoàn tác\./);
  for (const f of SRC) assert.doesNotMatch(read(f), /PencilIcon/, f + ' còn PencilIcon');
});
