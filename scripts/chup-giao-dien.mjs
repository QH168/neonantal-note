// Chụp và đo giao diện tự động (harness: vòng phản hồi cho agent "nhìn thấy" app).
// Chạy trong môi trường có Playwright (như môi trường của Claude). KHÔNG chạy trên GitHub Actions.
//
// Cách dùng:
//   node scripts/chup-giao-dien.mjs [thư-mục-bản-dựng] [--luu-chuan]
//   - thư-mục-bản-dựng: kết quả `npm run build` (dist) hoặc `node scripts/dung-thu.mjs` (dist-thu). Mặc định dist-thu.
//   - --luu-chuan: lưu bộ ảnh lần này làm ảnh chuẩn trong doi-agent/anh-chuan/ (chỉ làm khi bác sĩ đã duyệt giao diện).
// Kết quả: thư mục anh-chup/ (ảnh + ket-qua.json). Thoát mã 1 nếu có lỗi cứng.
//
// Ngày giả định: 21/10/2026 8:00. Dữ liệu mẫu chỉ dùng mã giường giả, không có thông tin bệnh nhân thật.
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, rmSync, copyFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
let sharp = null;
try { sharp = require('sharp'); } catch { /* không có thì bỏ qua bước so ảnh */ }

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const BUILD = join(ROOT, args.find((a) => !a.startsWith('--')) || 'dist-thu');
const LUU_CHUAN = args.includes('--luu-chuan');
const OUT = join(ROOT, 'anh-chup');
const CHUAN = join(ROOT, 'doi-agent/anh-chuan');
const NOW = new Date(2026, 9, 21, 8, 0, 0);

if (!existsSync(join(BUILD, 'index.html'))) {
  console.error('Không thấy bản dựng tại ' + BUILD + '. Chạy `npm run build` hoặc `node scripts/dung-thu.mjs` trước.');
  process.exit(2);
}
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

// ---------- máy chủ tĩnh tạm ----------
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.json': 'application/json', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  p = normalize(p).replace(/^(\.\.[/\\])+/, '');
  let f = join(BUILD, p);
  if (!existsSync(f) || statSync(f).isDirectory()) f = join(BUILD, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] || 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const URL = `http://127.0.0.1:${server.address().port}/`;

// ---------- dữ liệu mẫu ----------
const seed = async (page) => page.evaluate(async () => {
  const open = () => new Promise((res, rej) => { const r = indexedDB.open('ghichu-sosinh'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const db = await open();
  const all = (store) => new Promise((res) => { const r = db.transaction(store).objectStore(store).getAll(); r.onsuccess = () => res(r.result); });
  const rooms = (await all('rooms')).sort((a, b) => a.order - b.order);
  const t0 = Date.now();
  let n = 0;
  const row = (x) => ({ deleted: false, createdAt: t0 + n, updatedAt: t0 + (n++), deviceId: 'mau', ...x, id: 'mau-' + n });
  const tasks = [
    ['NICU', 1, 'Xem lại khí máu giường 3', false], ['NICU', 5, 'Hội chẩn ngoại', false], ['NICU', 2, 'Ký y lệnh truyền máu', true],
    ['NICU', 3, 'Cập nhật cân nặng', false], ['CT', 4, 'Gọi người nhà giường 12', false], ['KAN', 2, 'Siêu âm tim', false]
  ].map(([zone, urgency, text, done]) => row({ date: '2026-10-21', zone, urgency, text, done }));
  // Việc kiểu mới (v8): có `tags`, không có `urgency`; một việc có ghi chú; một việc không nhãn; một việc cũ ở khu 'BM'
  tasks.push(
    row({ date: '2026-10-21', zone: 'NICU', tags: ['NV', 'XN'], text: 'Báo kết quả CRP cho bác sĩ trực', note: 'CRP 48, tăng so với hôm qua. Báo bác sĩ trực nếu bé sốt hoặc bú kém.', done: false }),
    row({ date: '2026-10-21', zone: 'NICU', tags: ['BM'], text: 'Hội chẩn dinh dưỡng giường 7', done: false }),
    row({ date: '2026-10-21', zone: 'NICU', tags: [], text: 'Gọi đăng ký giường mới', done: false }),
    row({ date: '2026-10-21', zone: 'HP', tags: ['CK', 'HC', 'XN'], text: 'Nhận bé chuyển tuyến', done: false }),
    row({ date: '2026-10-21', zone: 'BM', urgency: 2, text: 'Việc cũ ở khu BM (kiểu mức cũ)', done: false })
  );
  const pats = [
    { roomId: rooms[0].id, code: 'G01', dob: '0508', ga: '25', wt: '1850', note: 'Theo dõi vàng da' },
    { roomId: rooms[0].id, code: 'G03', dob: '2009', ga: '320', wt: '2100', note: '' },
    { roomId: rooms[1].id, code: 'G12', dob: '0410', ga: '390', wt: '3200', note: '' }
  ].map((p, i) => row({ examDate: '2026-10-20', done: true, ...p, createdAt: new Date(2026, 9, 20, 12, 0, 0).getTime() + i })) // v9.6: giờ tạo cùng ngày với examDate như dữ liệu thật (tuổi dòng đã qua tính theo ngayTinhTuoi)
    // mã id ngẫu nhiên như uuid thật: thứ tự chữ cái của id KHÁC thứ tự nhập (G01 nhập trước nhưng id đứng sau)
    .map((p, i) => ({ ...p, id: ['mau-z-g01', 'mau-a-g03', 'mau-m-g12'][i] }));
  const todos = [
    row({ patientId: pats[0].id, text: 'Đo bilirubin', done: false, order: 1 }),
    row({ patientId: pats[0].id, text: 'Cân bé', done: true, order: 2 }),
    row({ patientId: pats[1].id, text: 'Tăng sữa 5 ml/cữ', done: false, order: 1 })
  ];
  const tx = db.transaction(['tasks', 'exam_patients', 'patient_todos'], 'readwrite');
  tasks.forEach((r) => tx.objectStore('tasks').put(r));
  pats.forEach((r) => tx.objectStore('exam_patients').put(r));
  todos.forEach((r) => tx.objectStore('patient_todos').put(r));
  await new Promise((res) => { tx.oncomplete = res; });
  db.close();
});

// ---------- đo ----------
const VUNG_CHAM = ['.room-add', '.icon-btn', '.pri-btn', '.swipe-del', '.round-btn', '.seg button', '.pill-btn', '.chip', '.vt-chip', '.vt-undo'];
const measure = (page) => page.evaluate((sels) => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden'; };
  const name = (e) => (e.getAttribute('aria-label') || e.textContent || e.className).trim().slice(0, 40);
  const nho = [];
  for (const s of sels) for (const e of document.querySelectorAll(s)) {
    if (!vis(e)) continue;
    const r = e.getBoundingClientRect();
    if (r.width < 43.5 || r.height < 43.5) nho.push(`${s} "${name(e)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  const khac = [];
  for (const e of document.querySelectorAll('button, label.btn')) {
    if (!vis(e) || sels.some((s) => e.matches(s))) continue;
    const r = e.getBoundingClientRect();
    if (r.height < 43.5 || r.width < 43.5) khac.push(`${e.className || e.tagName} "${name(e)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  const oNhap = [];
  for (const e of document.querySelectorAll('input:not([type=file]):not([hidden]), select, textarea')) {
    if (!vis(e)) continue;
    const fs = parseFloat(getComputedStyle(e).fontSize);
    if (fs < 16) oNhap.push(`${e.tagName.toLowerCase()}.${e.className} ${fs}px`);
  }
  // nút chỉ có biểu tượng (không chữ) phải có aria-label
  const khongTen = [];
  for (const e of document.querySelectorAll('button')) {
    if (!vis(e)) continue;
    if (!((e.textContent || '').trim() || e.getAttribute('aria-label') || e.getAttribute('aria-labelledby'))) khongTen.push(e.className || e.tagName);
  }
  return { vungChamNho: nho, nutKhacNho: [...new Set(khac)], oNhapNho: [...new Set(oNhap)], nutKhongTen: [...new Set(khongTen)] };
}, VUNG_CHAM);

// ---------- chạy ----------
const ketQua = { ngayGiaDinh: NOW.toString(), anh: [], loi: [], luuY: [], doDac: {}, thuChucNang: {} };
// Nếu script dừng giữa chừng (hết thời gian chờ một phần tử…), vẫn in ra các lỗi đã gom được để biết chỗ hỏng
let trangCuoi = null; // trang đang chạy gần nhất, để chụp lại hiện trường khi script dừng giữa chừng
process.on('uncaughtException', async (e) => {
  console.error('SCRIPT DỪNG GIỮA CHỪNG: ' + String(e?.message || e).split('\n')[0]);
  try { await trangCuoi?.screenshot({ path: join(OUT, 'loi-dung-giua-chung.png') }); console.error('Chữ trong bảng đang mở: ' + (await trangCuoi.evaluate(() => (document.querySelector('.sheet')?.innerText || '(không có bảng)').slice(0, 600).replace(/\n/g, ' | ')))); } catch { /* bỏ qua */ }
  console.error('Lỗi đã gom được:\n  ' + (ketQua.loi.join('\n  ') || '(chưa có)'));
  console.error('Thử chức năng đã chạy:', JSON.stringify(ketQua.thuChucNang));
  process.exit(1);
});
const browser = await chromium.launch();

async function moApp(opts, { lanMo = true, init = null, gio = NOW } = {}) {
  const ctx = await browser.newContext(opts);
  if (init) await ctx.addInitScript(init); // vd. visualViewport giả để thử thanh theo bàn phím (KHÔNG phải bàn phím thật)
  // Dòng nhắc cử chỉ chỉ hiện 3 lần mở đầu (v9.1): mặc định coi như đã mở nhiều lần để ảnh không có dòng nhắc;
  // truyền { lanMo: false } khi cần thử đúng 3 lần mở đầu.
  if (lanMo) await ctx.addInitScript(() => { try { localStorage.setItem('soLanMo', '9'); } catch { /* bỏ qua */ } });
  // đếm số lần máy "rung" (navigator.vibrate) để kiểm rung đúng một lần khi vừa qua mốc 1/3
  await ctx.addInitScript(() => { window.__rung = 0; try { Object.defineProperty(navigator, 'vibrate', { value: () => { window.__rung++; return true; }, configurable: true }); } catch { /* bỏ qua */ } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  trangCuoi = page;
  await page.clock.setFixedTime(gio); // mặc định NOW (21/10/2026 08:00); v9.6 thử giờ khác: 06:59, 07:00, 02:30…
  page.on('pageerror', (e) => ketQua.loi.push('Lỗi chạy trang: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) ketQua.loi.push('Lỗi trong trang (console): ' + m.text().slice(0, 300)); });
  await page.goto(URL);
  await page.waitForSelector('.phone-app, .pc');
  await page.waitForTimeout(400); // chờ tạo Phòng 1–3
  await seed(page);
  await page.reload();
  await page.waitForSelector('.phone-app, .pc');
  await page.waitForTimeout(300);
  return { ctx, page };
}
const chup = async (page, ten, ghi) => {
  await page.waitForTimeout(650); // chờ chuyển động (bảng trượt lên ~480ms, nút xoá 220ms) xong rồi mới chụp/đo
  const f = join(OUT, ten + '.png');
  await page.screenshot({ path: f });
  ketQua.anh.push(ten + '.png');
  if (ghi) ketQua.doDac[ten] = await measure(page);
};
// vuốt bằng ngón tay thật (CDP) vì Playwright chỉ có sẵn thao tác chạm
const vuotNgang = async (cdp, x1, x2, y) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x1, y }] });
  for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x1 + ((x2 - x1) * i) / 8, y }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
};
// kéo dở: đưa ngón tay tới dx rồi GIỮ NGUYÊN (chưa nhấc) để đo; thả bằng vuotTha
const keoDo = async (cdp, x1, dx, y) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x1, y }] });
  for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x1 + (dx * i) / 8, y }] });
};
const thaTay = (cdp) => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
const tamDiem = async (loc) => { const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, b }; };
// ---------- Cử chỉ v9.2 (thay các phép kiểm kiểu C: thẻ đứng yên, nút Xoá đỏ trong dòng, viền đỏ, nút mở/thả nửa) ----------
// màu của một biến CSS (trả "rgb(r, g, b)") — để so màu nền vuốt, nền nút xoá… với biến đã khai báo ở 9.1
const mauBien = (page, bien) => page.evaluate((v) => {
  const d = document.createElement('i');
  d.style.color = `var(${v})`;
  document.body.appendChild(d);
  const c = getComputedStyle(d).color;
  d.remove();
  return c;
}, bien);
// trạng thái một dòng vuốt (.swipe): nền sau dòng, độ dịch, đang kéo / qua mốc
const doDong = (loc) => loc.evaluate((e) => {
  const bg = e.querySelector('.swipe-bg');
  const than = e.querySelector('.swipe-body');
  const cs = getComputedStyle(bg);
  return {
    nen: e.dataset.nen || null, qua: e.dataset.qua || null, hien: e.dataset.hien || null, keo: e.dataset.keo || null,
    mau: cs.backgroundColor, opNen: +cs.opacity,
    dich: new DOMMatrix(getComputedStyle(than).transform).m41,
    rong: e.getBoundingClientRect().width, chuTrongNen: (bg.textContent || '').trim(), svgTrongNen: bg.querySelectorAll('svg').length
  };
});
// đặt ngón tay vào dòng rồi kéo tới dx (chưa nhấc): huong 'phai' bắt đầu gần lề trái, 'trai' gần lề phải của phần chữ
async function keoDong(cdp, dong, dx) {
  await dong.scrollIntoViewIfNeeded();
  const b = await dong.boundingBox();
  const y = b.y + b.height / 2;
  const x0 = dx > 0 ? b.x + 30 : b.x + b.width - 60;
  await keoDo(cdp, x0, dx, y);
  return { x0, y, b };
}
// vuốt hẳn (kéo tới dx rồi nhấc), chờ chuyển động xong
async function vuotDong(page, cdp, dong, dx) {
  await keoDong(cdp, dong, dx);
  await thaTay(cdp);
  await page.waitForTimeout(450);
}
// chạm 2 lần vào điểm c (Chromium headless hay nuốt cú chạm đầu: chạm vùng trống trước). KHÔNG dùng khi đang mở bảng (vùng trống là nền bảng).
const chamDoi = async (page, c) => { await page.touchscreen.tap(60, 45); await page.waitForTimeout(250); await page.touchscreen.tap(c.x, c.y); await page.touchscreen.tap(c.x, c.y); };
const dongDaCoThanhHoanTac = (page) => page.locator('.hoantac').count();
// chờ thanh Hoàn tác biến mất (hẹn giờ 6 giây) để nó không che các nút dưới đáy ở bước sau
const choHoanTacTat = async (page) => { try { await page.locator('.hoantac').waitFor({ state: 'detached', timeout: 8000 }); } catch { /* không có thanh thì thôi */ } };
// v9.4: chạm thật bằng màn hình cảm ứng, đúng MỘT lần (không .click() chuột). Dùng cho nút quan trọng trên iPhone.
const chamMot = async (page, loc) => { await loc.scrollIntoViewIfNeeded(); const c = await tamDiem(loc); await page.touchscreen.tap(c.x, c.y); };
// đệm chạm: chỉ dùng NGAY SAU một lần vuốt CDP (Chromium headless nuốt cú chạm đầu sau lần vuốt bằng ngón tay giả); chạm chỗ không có gì (đầu trang)
const demChamSauVuot = async (page, trongBang = false) => { // trongBang: đang mở bảng, chạm dòng tiêu đề "Việc cần làm" (chạm nền ngoài sẽ đóng bảng)
  const c = trongBang ? await tamDiem(page.locator('.sheet-be .be-viec-h').first()) : { x: 60, y: 45 };
  await page.touchscreen.tap(c.x, c.y);
  await page.waitForTimeout(250);
};
// vuốt dọc bằng ngón tay giả (cuộn danh sách): dx nhỏ, dy lớn
const vuotDoc = async (cdp, x, y1, y2) => {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y1 }] });
  for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + i, y: y1 + ((y2 - y1) * i) / 10 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
};
// độ tương phản (WCAG) thấp nhất giữa chữ mã/số đo/việc của một dòng bé và nền dòng — dùng cho bé đã khám (chữ nhạt) ở sáng và tối
const doTuongPhanBe = (loc) => loc.evaluate((e) => {
  const luong = (c) => { const [r, g, b] = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const nen = getComputedStyle(e.querySelector('.swipe-body')).backgroundColor;
  let min = 99;
  for (const x of e.querySelectorAll('.pat-code, .pat-main .small, .pat-todo')) {
    const [hi, lo] = [luong(getComputedStyle(x).color), luong(nen)].sort((p, q) => q - p);
    min = Math.min(min, (hi + 0.05) / (lo + 0.05));
  }
  return min;
});// dòng bé theo mã (tab Khám) và đọc hàng bé trong IndexedDB
const dongBe = (page, ma) => page.locator('.swipe', { has: page.locator('.pat-code', { hasText: new RegExp('^' + ma + '$') }) });
const docBe = async (page, ma) => (await docBang(page, 'exam_patients')).filter((p) => p.code === ma && p.examDate === '2026-10-21');

// đọc thẳng dòng trong IndexedDB (để kiểm dữ liệu thật đã lưu)
const docViec = (page, text) => page.evaluate(async (tx) => {
  const db = await new Promise((res) => { const r = indexedDB.open('ghichu-sosinh'); r.onsuccess = () => res(r.result); });
  const all = await new Promise((res) => { const r = db.transaction('tasks').objectStore('tasks').getAll(); r.onsuccess = () => res(r.result); });
  db.close();
  return all.filter((t) => t.text === tx).map((t) => ({ id: t.id, zone: t.zone, tags: t.tags, urgency: t.urgency, note: t.note, deleted: t.deleted, done: t.done, doneAt: t.doneAt ?? null }));
}, text);
// đọc cả bảng (dữ liệu thật đã lưu): tasks | patient_todos | exam_patients | abbrevs
const docBang = (page, bang) => page.evaluate(async (b) => {
  const db = await new Promise((res) => { const r = indexedDB.open('ghichu-sosinh'); r.onsuccess = () => res(r.result); });
  const all = await new Promise((res) => { const r = db.transaction(b).objectStore(b).getAll(); r.onsuccess = () => res(r.result); });
  db.close();
  return all;
}, bang);
// v9.1: nút sáng/tối trên đầu đã bỏ; đổi giao diện qua bảng "Sao lưu và cài đặt" (Sáng / Tối / Theo máy)
// Mức 2 (phiếu 2026-11-09): trên iPhone "/a", đám mây, "Lấy danh sách hôm qua" và "Quản lý phòng" nằm trong bảng "…" (role="menu");
// PC giữ nút riêng. `chonBangThem` mở bảng "…" rồi chọn dòng có tên bắt đầu bằng `ten` (chuỗi hoặc RegExp); trên PC bấm nút cùng tên.
const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const moBangThem = async (page, tay = false) => {
  const n = page.locator('button[aria-haspopup="menu"]');
  if (tay) await n.tap(); else await n.click();
  await page.locator('[role="menu"]').waitFor();
};
const chonBangThem = async (page, ten, tay = false) => {
  if (await page.locator('.phone-app').count()) {
    await moBangThem(page, tay);
    const m = page.getByRole('menuitem', { name: typeof ten === 'string' ? new RegExp('^' + escRe(ten)) : ten });
    if (tay) await m.tap(); else await m.click();
    await page.waitForTimeout(200);
  } else {
    await page.getByRole('button', { name: typeof ten === 'string' ? new RegExp('^' + escRe(ten)) : ten }).click();
  }
};
const moCaiDat = async (page) => {
  await chonBangThem(page, 'Sao lưu và cài đặt');
  const hop = page.getByRole('dialog', { name: 'Sao lưu và cài đặt' });
  await hop.waitFor();
  return hop;
};
const dongCaiDat = async (page, hop) => {
  await hop.getByRole('button', { name: 'Đóng sao lưu và cài đặt', exact: true }).click();
  await page.waitForTimeout(600); // chờ bảng trượt xuống xong
};
const datCheDo = async (page, ten) => {
  const hop = await moCaiDat(page);
  await hop.getByRole('button', { name: ten, exact: true }).click();
  await dongCaiDat(page, hop);
};
const laToiLuc = (page) => page.evaluate(() => document.documentElement.classList.contains('dark'));
// Thang chữ iPhone 5 bậc (v9.1): mọi chữ đang hiện phải thuộc các cỡ này (ô nhập 16). 10px chỉ cho chữ "NV" trong chấm mức việc cũ.
const CO_CHU_CHO_PHEP = [11, 12, 13, 15, 16, 17, 20];
const doCoChu = (page) => page.evaluate((cho) => {
  const loi = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    if (!n.textContent.trim()) continue;
    const e = n.parentElement;
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height || getComputedStyle(e).visibility === 'hidden') continue;
    const fs = parseFloat(getComputedStyle(e).fontSize);
    if (cho.includes(fs) || (fs === 10 && e.closest('.pri.nv'))) continue;
    loi.add(`${fs}px "${n.textContent.trim().slice(0, 24)}" trong ${e.tagName.toLowerCase()}.${String(e.className).slice(0, 30)}`);
  }
  return [...loi];
}, CO_CHU_CHO_PHEP);


// ---------- thử viết tắt (v8 đợt 2) ----------
const TIEU_DE_MOT_DONG = async (page, T, ten) => {
  const r = await page.evaluate(() => { const h = document.querySelector('h1'); return { sw: h.scrollWidth, cw: h.clientWidth, t: h.textContent }; });
  T['tieuDe_' + ten] = r.t + ' (' + r.sw + '/' + r.cw + ')';
  if (r.sw > r.cw) ketQua.loi.push(`Tiêu đề "${r.t}" bị cắt (${r.sw} > ${r.cw}) ở ${ten}`);
};
// gõ thật từng phím vào ô thêm việc (ph hoặc pc); không bấm "Thêm việc"
async function thuGoNhanh(page, T, tien, chamBangTay) {
  const o = page.getByLabel('Nội dung công việc');
  const xoa = async () => { await o.fill(''); await page.waitForTimeout(100); };
  await o.click();
  await xoa();
  await page.keyboard.type('Xem lại /kmdm ');
  T.thayKmdm = await o.inputValue();
  if (T.thayKmdm !== 'Xem lại Khí máu động mạch ') ketQua.loi.push('Viết tắt: "Xem lại /kmdm " thành "' + T.thayKmdm + '"');
  await page.keyboard.type('xong');
  T.conTroDung = await o.inputValue();
  if (T.conTroDung !== 'Xem lại Khí máu động mạch xong') ketQua.loi.push('Viết tắt: con trỏ sai chỗ sau khi thay — "' + T.conTroDung + '"');
  await xoa();
  await page.keyboard.type('Xem lại /kmdm ');
  T.thongBaoThay = (await page.locator('.vt-toast').first().textContent()) || '';
  // v9.3: thanh tối nói "Đã đổi /kmdm thành Khí máu động mạch" (thay phép kiểm cũ "Đã thay /kmdm")
  if (!/^Đã đổi \/kmdm thành Khí máu động mạch\s*Hoàn tác$/.test(T.thongBaoThay.trim())) ketQua.loi.push('Viết tắt: thanh tối ghi "' + T.thongBaoThay + '"');
  await chup(page, tien + '-da-doi-hoan-tac', true);
  await page.getByRole('button', { name: 'Hoàn tác', exact: true }).click();
  T.sauHoanTac = await o.inputValue();
  if (T.sauHoanTac !== 'Xem lại /kmdm ') ketQua.loi.push('Viết tắt: Hoàn tác ra "' + T.sauHoanTac + '"');
  // con trỏ về đúng chỗ sau Hoàn tác: gõ tiếp thì chữ nối đúng sau "/kmdm "
  await page.keyboard.type('Z');
  T.conTroSauHoanTac = await o.inputValue();
  if (T.conTroSauHoanTac !== 'Xem lại /kmdm Z') ketQua.loi.push('Viết tắt: con trỏ sai chỗ sau Hoàn tác — "' + T.conTroSauHoanTac + '"');
  await page.keyboard.press('Backspace');
  T.toastSauHoanTac = await page.locator('.vt-toast').count();
  if (T.toastSauHoanTac) ketQua.loi.push('Viết tắt: thông báo vẫn còn sau Hoàn tác');
  await xoa();
  await page.keyboard.type('Xem lại 8/10 ');
  T.tamPhan = await o.inputValue();
  if (T.tamPhan !== 'Xem lại 8/10 ') ketQua.loi.push('Viết tắt: "8/10 " bị đổi thành "' + T.tamPhan + '"');
  await xoa();
  await page.keyboard.type('Xem /kmxx ');
  T.khongCo = await o.inputValue();
  if (T.khongCo !== 'Xem /kmxx ') ketQua.loi.push('Viết tắt: key không có trong thư viện bị đổi: ' + T.khongCo);
  // gợi ý
  await xoa();
  await page.keyboard.type('Xem lại /km');
  T.soGoiY = await page.locator('.vt-chip').count();
  if (T.soGoiY < 2) ketQua.loi.push('Viết tắt: gõ "/km" mà thấy ' + T.soGoiY + ' gợi ý (mong đợi >= 2)');
  await chup(page, tien + '-goi-y', true);
  {
    // v9.3 (bảng 5): hàng chip 44px, chip đầu viền xanh nền nhạt, không còn chữ "Gợi ý (chạm để chèn):", chữ dài cắt bằng dấu ba chấm
    const g = await page.locator('.vt-sug').evaluate((e) => {
      const cs = [...e.querySelectorAll('.vt-chip')];
      const nen = (x) => getComputedStyle(x);
      return {
        cao: cs.map((c) => Math.round(c.getBoundingClientRect().height)),
        vien: cs.map((c) => nen(c).borderTopWidth + ' ' + nen(c).borderTopColor),
        nenDau: nen(cs[0]).backgroundColor,
        chu: e.textContent, sw: e.scrollWidth, cw: e.clientWidth, duoiOGo: e.getBoundingClientRect().bottom, cuon: nen(e).overflowX,
        nhanChuGoiY: !!e.parentElement.textContent.match(/Gợi ý \(chạm để chèn\)/),
        viTriSoVoiO: (document.activeElement ? document.activeElement.getBoundingClientRect().top : 0) - e.getBoundingClientRect().bottom
      };
    });
    T.hangGoiY = g;
    if (g.cao.some((h) => h !== 44)) ketQua.loi.push('Gợi ý viết tắt: chip không cao 44px: ' + g.cao.join(','));
    if (g.nhanChuGoiY) ketQua.loi.push('Gợi ý viết tắt: còn chữ "Gợi ý (chạm để chèn):"');
    if (!/^2px/.test(g.vien[0]) || !/^1px/.test(g.vien[1])) ketQua.loi.push('Gợi ý viết tắt: chip đầu phải viền xanh 2px, chip sau viền 1px: ' + g.vien.join(' | '));
    if (g.cuon !== 'auto') ketQua.loi.push('Gợi ý viết tắt: hàng chip không cuộn ngang được (overflow-x ' + g.cuon + ')');
    if (g.viTriSoVoiO < -1 || g.viTriSoVoiO > 24) ketQua.loi.push('Gợi ý viết tắt: hàng chip không nằm ngay trên ô gõ (cách ' + Math.round(g.viTriSoVoiO) + 'px)');
  }
  const chip = page.locator('.vt-chip', { hasText: '/kmtm' });
  if (chamBangTay) await chip.tap(); else await chip.click();
  await page.waitForTimeout(150);
  T.sauChamGoiY = await o.inputValue();
  if (T.sauChamGoiY !== 'Xem lại Khí máu tĩnh mạch ') ketQua.loi.push('Viết tắt: chạm gợi ý /kmtm ra "' + T.sauChamGoiY + '"');
  T.giuFocus = await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
  if (!/draft/.test(T.giuFocus)) ketQua.loi.push('Viết tắt: chạm gợi ý làm mất focus của ô (' + T.giuFocus + ')');
  await page.getByRole('button', { name: 'Hoàn tác', exact: true }).click();
  T.hoanTacGoiY = await o.inputValue();
  if (T.hoanTacGoiY !== 'Xem lại /km ') ketQua.loi.push('Viết tắt: Hoàn tác gợi ý ra "' + T.hoanTacGoiY + '"');
  if (chamBangTay) {
    // vuốt ngang bằng ngón tay thật (CDP) đặt trên chip: hàng phải cuộn được dù chip dùng preventDefault; chip không bị bấm nhầm; ô giữ con trỏ.
    // Đặt cuối cùng vì Chromium headless nuốt cú chạm đầu sau mỗi lần vuốt bằng CDP (đã kiểm: chip lọc khu không dùng preventDefault cũng bị y hệt).
    await xoa();
    await page.keyboard.type('Xem lại /km');
    await page.waitForTimeout(200);
    const g2 = await page.locator('.vt-sug').evaluate((e) => ({ sw: e.scrollWidth, cw: e.clientWidth }));
    if (g2.sw <= g2.cw) ketQua.luuY.push('Gợi ý viết tắt: hai chip vừa khít một màn hình, không đo được vuốt ngang (' + g2.sw + '/' + g2.cw + ')');
    else {
      const cdp2 = await page.context().newCDPSession(page);
      const hb = await page.locator('.vt-sug').boundingBox();
      const truocChu = await o.inputValue();
      await vuotNgang(cdp2, hb.x + hb.width - 40, hb.x + 30, hb.y + hb.height / 2);
      await page.waitForTimeout(1000);
      T.vuotHangGoiY = { cuonSau: await page.locator('.vt-sug').evaluate((e) => Math.round(e.scrollLeft)), chu: await o.inputValue(), focus: await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName), conChip: await page.locator('.vt-chip').count() };
      if (T.vuotHangGoiY.cuonSau <= 0) ketQua.loi.push('Gợi ý viết tắt: vuốt ngang hàng chip không cuộn được (preventDefault chặn?) ' + JSON.stringify(T.vuotHangGoiY));
      if (T.vuotHangGoiY.chu !== truocChu || T.vuotHangGoiY.conChip !== 2) ketQua.loi.push('Gợi ý viết tắt: vuốt ngang bấm nhầm chip: "' + T.vuotHangGoiY.chu + '"');
      if (!/draft/.test(T.vuotHangGoiY.focus)) ketQua.loi.push('Gợi ý viết tắt: vuốt ngang làm ô mất con trỏ (' + T.vuotHangGoiY.focus + ')');
      await cdp2.detach();
    }
  }
  await xoa();
  await o.blur();
}
// mở thư viện bằng nút "/a", thử thêm / trùng / tìm / sửa / xoá
async function thuThuVien(page, T, tien, cdp) {
  const datGio = (ms) => page.clock.setFixedTime(new Date(NOW.getTime() + ms)); // dời giờ giả (đồng hồ trang đang đóng băng)
  await chonBangThem(page, 'Thư viện viết tắt');
  const hop = page.getByRole('dialog', { name: 'Thư viện viết tắt' });
  await hop.waitFor();
  await hop.locator('.vt-item-wrap').first().waitFor();
  const dem = () => hop.locator('.vt-item-wrap').count();
  T.thuVienMau = await dem();
  if (T.thuVienMau !== 13) ketQua.loi.push('Thư viện: có ' + T.thuVienMau + ' mục mẫu (mong đợi 13)');
  await chup(page, tien + '-thu-vien', true);
  // thiếu chữ
  await hop.getByRole('button', { name: 'Thêm vào thư viện' }).click();
  T.baoLoiThieu = (await hop.getByRole('alert').first().textContent()) || '';
  if (!/Chưa gõ/.test(T.baoLoiThieu)) ketQua.loi.push('Thư viện: bỏ trống mà không báo lỗi');
  await hop.getByLabel('Viết tắt', { exact: true }).fill('/hcn');
  await hop.getByRole('button', { name: 'Thêm vào thư viện' }).click();
  if (!/Chưa gõ chữ cần đổi/.test((await hop.getByRole('alert').first().textContent()) || '')) ketQua.loi.push('Thư viện: thiếu "Đổi thành" mà không báo lỗi');
  await hop.getByLabel('Đổi thành').fill('Hội chẩn ngoại khoa');
  await hop.getByRole('button', { name: 'Thêm vào thư viện' }).click();
  await page.waitForTimeout(300);
  T.sauKhiThem = await dem();
  if (T.sauKhiThem !== 14) ketQua.loi.push('Thư viện: thêm /hcn mà danh sách có ' + T.sauKhiThem + ' mục');
  if (!(await hop.locator('.vt-k', { hasText: '/hcn' }).count())) ketQua.loi.push('Thư viện: không thấy /hcn trong danh sách');
  // trùng key → hỏi ghi đè
  await hop.getByLabel('Viết tắt', { exact: true }).fill('HCN');
  await hop.getByLabel('Đổi thành').fill('Hội chẩn ngoại');
  await hop.getByRole('button', { name: 'Thêm vào thư viện' }).click();
  await page.waitForTimeout(200);
  T.hoiGhiDe = (await hop.locator('.vt-ask').textContent()) || '';
  if (!/Ghi đè/.test(T.hoiGhiDe)) ketQua.loi.push('Thư viện: key trùng mà không hỏi ghi đè');
  await chup(page, tien + '-thu-vien-ghi-de', true);
  await hop.getByRole('button', { name: 'Ghi đè', exact: true }).click();
  await page.waitForTimeout(300);
  T.sauGhiDe = (await hop.locator('.vt-item-wrap', { hasText: '/hcn' }).textContent()) || '';
  if (!/Hội chẩn ngoại(?! khoa)/.test(T.sauGhiDe) || (await dem()) !== 14) ketQua.loi.push('Thư viện: ghi đè không đúng — ' + T.sauGhiDe);
  // tìm
  await hop.getByRole('searchbox').fill('hoi chan');
  T.timKhongDau = await dem();
  if (T.timKhongDau !== 1) ketQua.loi.push('Thư viện: tìm "hoi chan" ra ' + T.timKhongDau + ' mục (mong đợi 1)');
  await hop.getByRole('searchbox').fill('');
  // v9.3: không còn nút bút chì; sửa bằng chạm 2 lần vào dòng (iPhone) / nhấp đúp hoặc Tab rồi Enter (PC)
  // (thay phép kiểm cũ: bấm nút bút chì "Sửa /hcn")
  {
    const dongH = () => hop.locator('.vt-item-wrap', { hasText: '/hcn' });
    const tamH = async () => { const b = await dongH().locator('.vt-hang').boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
    T.butChi = await hop.locator('.icon-btn', { has: page.locator('svg') }).evaluateAll((es) => es.filter((e) => /^Sửa /.test(e.getAttribute('aria-label') || '')).length);
    if (T.butChi) ketQua.loi.push('Thư viện: còn ' + T.butChi + ' nút bút chì "Sửa …"');
    const dangSua = () => hop.getByText('Đang sửa /hcn', { exact: true }).count();
    if (cdp) await hop.getByRole('heading', { name: 'Thư viện viết tắt', exact: true }).tap(); // nuốt cú chạm đầu sau lần vuốt CDP trước đó
    const cham1 = async () => { const c = await tamH(); if (cdp) await page.touchscreen.tap(c.x, c.y); else await page.mouse.click(c.x, c.y); };
    await cham1();
    await page.waitForTimeout(250);
    T.cham1Lan = await dangSua();
    if (T.cham1Lan) ketQua.loi.push('Thư viện: chạm 1 lần đã mở sửa');
    // Đồng hồ trang bị đóng băng (setFixedTime) nên 'quá 1 giây' phải dời giờ giả: hai lần chạm cách nhau 2 giây vẫn chỉ là lần đầu
    await datGio(2000);
    await cham1();
    await page.waitForTimeout(250);
    T.chamCham1s = await dangSua();
    if (T.chamCham1s) ketQua.loi.push('Thư viện: hai lần chạm cách nhau hơn 1 giây lại mở sửa');
    // chạm lần lượt hai dòng khác nhau (trong 1 giây) không tính là chạm 2 lần
    const dongKhac = hop.locator('.vt-item-wrap', { hasText: '/ctm' }).locator('.vt-hang');
    const bk = await dongKhac.boundingBox();
    await datGio(4000);
    if (cdp) { await page.touchscreen.tap(bk.x + bk.width / 2, bk.y + bk.height / 2); } else { await page.mouse.click(bk.x + bk.width / 2, bk.y + bk.height / 2); }
    await cham1();
    await page.waitForTimeout(250);
    T.haiDongKhac = (await dangSua()) + (await hop.getByText('Đang sửa /ctm', { exact: true }).count());
    if (T.haiDongKhac) ketQua.loi.push('Thư viện: chạm hai dòng khác nhau lại mở sửa');
    await datGio(6000);
    // chạm 2 lần liền → sửa; dòng đổ lên hàng trên; có "Đang sửa /hcn", "Lưu thay đổi", "Huỷ sửa"
    const c = await tamH();
    if (cdp) { await page.touchscreen.tap(c.x, c.y); await page.touchscreen.tap(c.x, c.y); } else { await page.mouse.dblclick(c.x, c.y); }
    await page.waitForTimeout(350);
    T.cham2Lan = { dangSua: await dangSua(), key: await hop.getByLabel('Viết tắt', { exact: true }).inputValue(), noiDung: await hop.getByLabel('Đổi thành').inputValue(), luu: await hop.getByRole('button', { name: 'Lưu thay đổi', exact: true }).count(), huy: await hop.getByRole('button', { name: 'Huỷ sửa', exact: true }).count(), nutThem: await hop.getByRole('button', { name: 'Thêm vào thư viện', exact: true }).count() };
    if (T.cham2Lan.dangSua !== 1 || T.cham2Lan.key !== '/hcn' || T.cham2Lan.noiDung !== 'Hội chẩn ngoại' || T.cham2Lan.luu !== 1 || T.cham2Lan.huy !== 1) ketQua.loi.push('Thư viện: chạm 2 lần chưa đổ dòng lên hàng trên đúng ' + JSON.stringify(T.cham2Lan));
    await chup(page, tien + '-thu-vien-dang-sua', true);
    // Huỷ sửa: về trạng thái thêm, không đổi gì
    await hop.getByRole('button', { name: 'Huỷ sửa', exact: true }).click();
    T.sauHuySua = { dangSua: await dangSua(), key: await hop.getByLabel('Viết tắt', { exact: true }).inputValue(), them: await hop.getByRole('button', { name: 'Thêm vào thư viện', exact: true }).count() };
    if (T.sauHuySua.dangSua || T.sauHuySua.key !== '' || T.sauHuySua.them !== 1) ketQua.loi.push('Thư viện: Huỷ sửa chưa về trạng thái thêm ' + JSON.stringify(T.sauHuySua));
    // bàn phím: Tab tới dòng, Enter mở sửa (aria-label "Sửa /hcn")
    await dongH().locator('.vt-hang').focus();
    T.nhanDong = await dongH().locator('.vt-hang').getAttribute('aria-label');
    if (T.nhanDong !== 'Sửa /hcn') ketQua.loi.push('Thư viện: dòng thiếu aria-label "Sửa /hcn": ' + T.nhanDong);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(250);
    if (!(await dangSua())) ketQua.loi.push('Thư viện: Enter trên dòng không mở sửa');
    await hop.getByLabel('Đổi thành').fill('Hội chẩn ngoại khoa nhi');
    await hop.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await page.waitForTimeout(300);
    T.sauSua = (await hop.locator('.vt-item-wrap', { hasText: '/hcn' }).textContent()) || '';
    if (!/ngoại khoa nhi/.test(T.sauSua)) ketQua.loi.push('Thư viện: sửa không lưu — ' + T.sauSua);
    if (await dangSua()) ketQua.loi.push('Thư viện: lưu xong mà form vẫn ở trạng thái sửa');
  }
  // xoá (v9.2): iPhone vuốt trái qua 1/3 (vuốt phải không làm gì); PC rê chuột rồi bấm thùng rác; có Hoàn tác 6 giây
  const dong = hop.locator('.vt-item-wrap', { hasText: '/hcn' });
  {
    // đang sửa đúng dòng /hcn mà xoá chính dòng đó (xoá ở bước dưới) thì form phải về trạng thái thêm
    const b0 = await dong.locator('.vt-hang').boundingBox();
    const cx = b0.x + b0.width / 2, cy = b0.y + b0.height / 2;
    if (cdp) { await page.touchscreen.tap(cx, cy); await page.touchscreen.tap(cx, cy); } else await page.mouse.dblclick(cx, cy);
    await page.waitForTimeout(300);
    T.moSuaTruocKhiXoa = await hop.getByText('Đang sửa /hcn', { exact: true }).count();
    if (T.moSuaTruocKhiXoa !== 1) ketQua.loi.push('Thư viện: chưa mở sửa /hcn trước khi thử xoá dòng đang sửa');
    await dong.scrollIntoViewIfNeeded(); // form sửa cao hơn nên dòng có thể trôi khỏi phần thấy
  }
  const xoaMuc = async () => {
    const d = hop.locator('.vt-item-wrap', { hasText: '/hcn' });
    if (cdp) {
      const b = await d.boundingBox();
      await keoDo(cdp, b.x + b.width - 40, -Math.round(b.width / 3 + 30), b.y + b.height / 2);
      await thaTay(cdp);
    } else {
      await d.hover();
      await d.getByRole('button', { name: 'Xoá viết tắt: /hcn' }).click();
    }
    await page.waitForTimeout(700);
  };
  if (cdp) {
    const b = await dong.boundingBox();
    const y = b.y + b.height / 2;
    const sw = dong.locator('.swipe');
    // thư viện KHÔNG có vuốt phải: kéo phải qua mốc, dòng đứng yên, không nền
    await keoDo(cdp, b.x + 30, Math.round(b.width / 3 + 40), y);
    const gp = await doDong(sw);
    T.vuotPhaiThuVien = { hien: gp.hien, dich: +gp.dich.toFixed(2) };
    if (gp.hien === '1' || Math.abs(gp.dich) > 0.5) ketQua.loi.push('Thư viện: vuốt phải lại có tác dụng ' + JSON.stringify(T.vuotPhaiThuVien));
    await thaTay(cdp);
    await page.waitForTimeout(300);
    // vuốt trái trước mốc → trượt về, chưa xoá
    await keoDo(cdp, b.x + b.width - 40, -Math.round(b.width / 3 - 25), y);
    await thaTay(cdp);
    await page.waitForTimeout(500);
    T.thuVienThaTruocMoc = await dem();
    if (T.thuVienThaTruocMoc !== 14) ketQua.loi.push('Thư viện: thả trước mốc 1/3 mà mục bị xoá (còn ' + T.thuVienThaTruocMoc + ')');
    // kéo qua mốc rồi chụp (đang kéo)
    await keoDo(cdp, b.x + b.width - 40, -Math.round(b.width / 3 + 30), y);
    await page.waitForTimeout(100);
    const gt = await doDong(sw);
    if (gt.nen !== 'xoa' || gt.qua !== '1') ketQua.loi.push('Thư viện: kéo trái qua mốc mà nền chưa đậm một nấc ' + JSON.stringify(gt));
    await chup(page, tien + '-thu-vien-xoa', true);
    await thaTay(cdp);
    await page.waitForTimeout(700);
  } else {
    await dong.hover();
    await page.waitForTimeout(250);
    await chup(page, tien + '-thu-vien-re-chuot', true);
    await dong.getByRole('button', { name: 'Xoá viết tắt: /hcn' }).click();
    await page.waitForTimeout(700);
  }
  T.sauXoa = await dem();
  if (T.sauXoa !== 13) ketQua.loi.push('Thư viện: xoá /hcn mà còn ' + T.sauXoa + ' mục');
  T.xoaDongDangSua = { dangSua: await hop.getByText(/^Đang sửa /).count(), key: await hop.getByLabel('Viết tắt', { exact: true }).inputValue(), them: await hop.getByRole('button', { name: 'Thêm vào thư viện', exact: true }).count() };
  if (T.xoaDongDangSua.dangSua || T.xoaDongDangSua.key !== '' || T.xoaDongDangSua.them !== 1) ketQua.loi.push('Thư viện: xoá chính dòng đang sửa mà form không về trạng thái thêm ' + JSON.stringify(T.xoaDongDangSua));
  T.thanhXoaThuVien = ((await page.locator('.hoantac').textContent()) || '').trim();
  if (!/^Đã xoá: \/hcn.*Hoàn tác$/.test(T.thanhXoaThuVien)) ketQua.loi.push('Thư viện: thanh Hoàn tác ghi "' + T.thanhXoaThuVien + '"');
  if (!(await page.evaluate(() => { const r = document.querySelector('.hoantac').getBoundingClientRect(); return !!document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('.hoantac'); }))) ketQua.loi.push('Thư viện: thanh Hoàn tác bị bảng che');
  await page.locator('.hoantac').getByRole('button', { name: 'Hoàn tác', exact: true }).click();
  await page.waitForTimeout(500);
  T.hoanTacThuVien = (await hop.locator('.vt-item-wrap', { hasText: '/hcn' }).textContent().catch(() => '')) || '';
  if ((await dem()) !== 14 || !/ngoại khoa nhi/.test(T.hoanTacThuVien)) ketQua.loi.push('Thư viện: Hoàn tác không trả lại /hcn đúng nội dung — ' + T.hoanTacThuVien);
  // trong lúc chờ đã có mục sống cùng chữ tắt → Hoàn tác không khôi phục, báo bằng chữ
  await xoaMuc();
  await hop.getByLabel('Viết tắt', { exact: true }).fill('/hcn');
  await hop.getByLabel('Đổi thành').fill('Hội chẩn khác');
  await hop.getByRole('button', { name: 'Thêm vào thư viện' }).click();
  await page.waitForTimeout(400);
  await page.locator('.hoantac').getByRole('button', { name: 'Hoàn tác', exact: true }).click();
  await page.waitForTimeout(500);
  T.hoanTacTrung = { soMuc: await dem(), soHcn: await hop.locator('.vt-item-wrap', { hasText: '/hcn' }).count(), tin: ((await page.locator('.hoantac').textContent().catch(() => '')) || '').trim() };
  if (T.hoanTacTrung.soHcn !== 1 || T.hoanTacTrung.soMuc !== 14) ketQua.loi.push('Thư viện: Hoàn tác khi đã có mục trùng làm ra hai mục /hcn ' + JSON.stringify(T.hoanTacTrung));
  if (!/Đã có chữ tắt này, không khôi phục/.test(T.hoanTacTrung.tin)) ketQua.loi.push('Thư viện: Hoàn tác trùng không báo "Đã có chữ tắt này, không khôi phục": "' + T.hoanTacTrung.tin + '"');
  await xoaMuc(); // dọn: về đúng 13 mục mẫu
  T.sauDon = await dem();
  if (T.sauDon !== 13) ketQua.loi.push('Thư viện: dọn xong còn ' + T.sauDon + ' mục (cần 13)');
  await datGio(0); // trả đồng hồ về giờ giả ban đầu để các phép kiểm sau (doneAt…) không lệch
  await choHoanTacTat(page);
  await hop.getByRole('button', { name: 'Đóng thư viện', exact: true }).click(); await page.waitForTimeout(600); // chờ bảng trượt xuống xong
  await page.waitForTimeout(250);
}

// iPhone 15
{
  const { ctx, page } = await moApp({
    viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
  });
  await chup(page, 'iphone-viec-sang', true);
  {
    // v9.1: đầu trang đúng 3 nút theo thứ tự /a, đám mây, lịch; chữ tiến độ; chip khu; thang chữ 5 bậc
    const T = ketQua.thuChucNang.dauTrang = {};
    // Mức 2 (phiếu 2026-11-09): đầu trang iPhone = Lịch + "…"; "/a" và đám mây vào bảng "…"; không còn thanh tiến độ, hàng gạt riêng
    T.nut = await page.locator('.ph-head .round-btn').evaluateAll((es) => es.map((e) => e.getAttribute('aria-label')));
    if (T.nut.length !== 2 || T.nut[0] !== 'Mở lịch' || !/^Thêm: thư viện viết tắt, sao lưu và cài đặt/.test(T.nut[1])) ketQua.loi.push('Đầu trang không đúng 2 nút Lịch và "…": ' + T.nut.join(' | '));
    T.conSot = await page.evaluate(() => ({ bar: document.querySelectorAll('.phone-app .bar').length, gat: document.querySelectorAll('.phone-app .gat-hn, .phone-app .ph-gat, .phone-app .ph-tabs').length, vt: document.querySelectorAll('.phone-app .vt-btn').length, tienDoCu: document.querySelectorAll('.phone-app .prog-text').length }));
    if (T.conSot.bar || T.conSot.gat || T.conSot.vt || T.conSot.tienDoCu) ketQua.loi.push('iPhone còn thanh tiến độ / hàng gạt riêng / nút /a ở đầu trang: ' + JSON.stringify(T.conSot));
    T.tienDo = ((await page.locator('.ph-tiendo').textContent()) || '').trim();
    if (!/^Đã xong \d+\/\d+$/.test(T.tienDo)) ketQua.loi.push('Chữ tiến độ tab Việc: "' + T.tienDo + '"');
    T.dongNgay = ((await page.locator('.ph-ngay').innerText()) || '').replace(/\s+/g, ' ').trim();
    if (!/^[^,]+, \d{2}\/\d{2} · Đã xong \d+\/\d+$/.test(T.dongNgay)) ketQua.loi.push('Dòng ngày tab Việc không có dạng "Thứ …, dd/mm · Đã xong x/y": "' + T.dongNgay + '"');
    T.hinhDau = await page.evaluate(() => {
      const R = (e) => { const r = e.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top * 10) / 10, w: Math.round(r.width), h: Math.round(r.height) }; };
      const hai = document.querySelector('.ph-2ngay');
      return { lich: R(document.querySelector('.ph-head .round-btn[aria-label="Mở lịch"]')), ba: R(document.querySelector('.mt-btn')), seg: R(document.querySelector('.ph-seg .seg')), hai: R(hai), haiPressed: hai.getAttribute('aria-pressed'), h1: getComputedStyle(document.querySelector('h1')).fontSize, hangDau: R(document.querySelector('.ph-r1')) };
    });
    const H = T.hinhDau;
    if (H.lich.w !== 44 || H.lich.h !== 44 || H.ba.w !== 44 || H.ba.h !== 44) ketQua.loi.push('Nút Lịch và "…" phải tròn 44px: ' + JSON.stringify([H.lich, H.ba]));
    if (H.ba.x + H.ba.w !== 393 - 16 || H.lich.x + H.lich.w + 8 !== H.ba.x) ketQua.loi.push('Hàng đầu: "…" sát lề phải 16px, Lịch bên trái cách 8px: ' + JSON.stringify([H.lich, H.ba]));
    if (H.seg.w !== 168 || H.hai.h !== 52 || H.hai.x + H.hai.w !== 393 - 16 || H.haiPressed !== 'false') ketQua.loi.push('Hàng hai: nút gạt Việc/Khám rộng 168px, nút "2 ngày" cao 52px sát lề phải, mặc định tắt: ' + JSON.stringify([H.seg, H.hai, H.haiPressed]));
    if (H.h1 !== '20px') ketQua.loi.push('Tiêu đề iPhone phải 20px: ' + H.h1);
    T.dinhDanhSach = await page.locator('.chips .chip').first().evaluate((e) => Math.round(e.getBoundingClientRect().top * 10) / 10);
    if (Math.abs(T.dinhDanhSach - 132) > 2) ketQua.loi.push('Đỉnh hàng chip khu tab Việc ' + T.dinhDanhSach + 'px (mục tiêu 132px)');
    T.chip = await page.locator('.chips .chip').evaluateAll((es) => es.map((e) => ({ chu: e.textContent.trim(), cao: Math.round(e.getBoundingClientRect().height), nhat: e.classList.contains('zero'), chon: e.classList.contains('on') })));
    for (const c of T.chip) {
      if (c.cao !== 44) ketQua.loi.push(`Chip "${c.chu}" cao ${c.cao}px (cần 44)`);
      if (/\b0$/.test(c.chu)) ketQua.loi.push(`Chip "${c.chu}" ghi số 0`);
    }
    if (!T.chip.some((c) => c.nhat)) ketQua.loi.push('Không thấy chip khu trống (nhạt) trong dữ liệu mẫu');
    if (T.chip.filter((c) => c.chon).length !== 1 || !T.chip[0].chon) ketQua.loi.push('Chỉ chip "Tất cả" được chọn lúc đầu');
    T.tab = await page.locator('.seg button').evaluateAll((es) => es.map((e) => Math.round(e.getBoundingClientRect().height)));
    if (T.tab.some((h) => h !== 44)) ketQua.loi.push('Tab Việc/Khám không cao 44px: ' + T.tab.join(','));
    T.nhan = await page.locator('.tag-dot').first().evaluate((e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return { rong: Math.round(r.width), cao: Math.round(r.height), chu: s.fontSize, dam: s.fontWeight }; });
    if (T.nhan.rong !== 26 || T.nhan.cao !== 26 || T.nhan.chu !== '11px' || +T.nhan.dam < 700) ketQua.loi.push('Huy hiệu nhãn không phải 26px/11px đậm: ' + JSON.stringify(T.nhan));
    T.coChu = await doCoChu(page);
    for (const x of T.coChu) ketQua.loi.push('iPhone Việc: cỡ chữ ngoài thang 5 bậc — ' + x);
    T.tinNhac = await page.getByText('Chạm 2 lần: chi tiết').count();
    if (T.tinNhac) ketQua.loi.push('Dòng nhắc cử chỉ hiện khi đã mở app nhiều lần và danh sách có việc');
  }

  // --- thử: nút xoá kiểu C, chi tiết việc (chạm 2 lần), việc cũ gắn nhãn, thêm việc có nhãn ---
  {
    const cdp = await ctx.newCDPSession(page);
    const T = ketQua.thuChucNang.viecV82 = {};
    const dong = (ten) => page.locator('.swipe', { hasText: ten });
    // ===== v9.2: cử chỉ mới (vuốt phải xong, vuốt trái xoá + Hoàn tác, mốc 1/3) — thay các phép kiểm kiểu C cũ =====
    const X = dong('Gọi người nhà giường 12');            // vuốt phải trước mốc
    const Y = dong('Gọi đăng ký giường mới');             // vuốt phải qua mốc → xong
    const Z = dong('Ký y lệnh truyền máu');               // đã xong: vuốt phải chỉ nhúc nhích
    const P = dong('Cập nhật cân nặng');                  // vuốt trái trước mốc (việc kiểu cũ)
    const Q = dong('Báo kết quả CRP cho bác sĩ trực');    // vuốt trái qua mốc → xoá → Hoàn tác (có nhãn và ghi chú)
    const R = dong('Hội chẩn dinh dưỡng giường 7');       // xoá rồi để hết 6 giây
    let c;
    const [nenXanh, nenXanh2, nenDo, nenDo2] = [await mauBien(page, '--swR'), await mauBien(page, '--swR2'), await mauBien(page, '--swL'), await mauBien(page, '--swL2')];
    const rongDong = (await X.boundingBox()).width;
    const moc = rongDong / 3;
    T.mocVuot = `${Math.round(rongDong)}px rộng, mốc ${moc.toFixed(1)}px`;
    const rung = () => page.evaluate(() => window.__rung);
    const datRung = () => page.evaluate(() => { window.__rung = 0; });
    const dl = async (ten) => (await docViec(page, ten))[0];
    const kiemNen = (ten, g, nen, qua, mau) => {
      if (g.nen !== nen || g.hien !== '1' || g.qua !== (qua ? '1' : '0')) ketQua.loi.push(`${ten}: nền sau dòng sai (nen=${g.nen}, hien=${g.hien}, qua=${g.qua}; cần ${nen}, qua=${qua ? 1 : 0})`);
      if (g.mau !== mau) ketQua.loi.push(`${ten}: màu nền ${g.mau}, cần ${mau}`);
      if (g.chuTrongNen || g.svgTrongNen) ketQua.loi.push(`${ten}: nền sau dòng có chữ/biểu tượng (phải trống)`);
    };
    // 1) vuốt phải, thả TRƯỚC mốc: nền xanh nhạt không chữ, dòng trượt theo ngón tay; thả → trượt về, không đổi dữ liệu
    {
      const d0 = await dl('Gọi người nhà giường 12');
      await datRung();
      const dx = Math.round(moc - 25);
      await keoDong(cdp, X, dx);
      await page.waitForTimeout(100);
      const g = await doDong(X);
      T.vuotPhaiTruocMoc = { ...g, rung: await rung() };
      kiemNen('Vuốt phải trước mốc', g, 'xong', false, nenXanh);
      if (Math.abs(g.dich - dx) > 2) ketQua.loi.push(`Vuốt phải trước mốc: dòng trượt ${g.dich.toFixed(1)}px, ngón tay đi ${dx}px`);
      if (T.vuotPhaiTruocMoc.rung !== 0) ketQua.loi.push('Vuốt phải trước mốc mà máy đã rung');
      await thaTay(cdp);
      await page.waitForTimeout(500);
      const sau = await doDong(X);
      const d1 = await dl('Gọi người nhà giường 12');
      T.thaPhaiTruocMoc = { dich: +sau.dich.toFixed(2), done: d1.done, doneAt: d1.doneAt };
      if (Math.abs(sau.dich) > 0.5) ketQua.loi.push('Thả trước mốc 1/3 (vuốt phải): dòng không trượt về (còn ' + sau.dich.toFixed(1) + 'px)');
      if (d1.done !== d0.done || d1.doneAt !== d0.doneAt) ketQua.loi.push('Thả trước mốc 1/3 (vuốt phải) mà việc bị đánh dấu xong');
    }
    // 2) vuốt phải, thả SAU mốc: nền đậm một nấc, rung đúng một lần; thả → xong, ghi doneAt, tích xanh, không gạch ngang, xuống cuối nhóm
    {
      await datRung();
      await keoDong(cdp, Y, Math.round(moc + 30));
      await page.waitForTimeout(100);
      const g = await doDong(Y);
      T.vuotPhaiQuaMoc = { ...g, rung: await rung() };
      kiemNen('Vuốt phải qua mốc', g, 'xong', true, nenXanh2);
      if (T.vuotPhaiQuaMoc.rung !== 1) ketQua.loi.push('Vuốt phải qua mốc: máy rung ' + T.vuotPhaiQuaMoc.rung + ' lần (cần đúng 1)');
      await chup(page, 'iphone-vuot-phai', false); // đang kéo: không đo vùng chạm
      await thaTay(cdp);
      await page.waitForTimeout(600);
      const d1 = await dl('Gọi đăng ký giường mới');
      T.thaPhaiQuaMoc = { done: d1.done, doneAt: d1.doneAt };
      if (!d1.done || d1.doneAt !== NOW.getTime()) ketQua.loi.push('Thả sau mốc (vuốt phải): dữ liệu done=' + d1.done + ', doneAt=' + d1.doneAt + ' (cần true và ' + NOW.getTime() + ')');
      T.tichXanh = await Y.locator('.tick-ok').count();
      if (T.tichXanh !== 1) ketQua.loi.push('Việc đã xong không có tích xanh cuối dòng');
      const kieu = await Y.locator('.task-text').evaluate((e) => ({ gach: getComputedStyle(e).textDecorationLine, mau: getComputedStyle(e).color }));
      T.chuViecXong = kieu;
      if (kieu.gach !== 'none') ketQua.loi.push('Việc đã xong còn gạch ngang');
      if (kieu.mau !== (await mauBien(page, '--muted'))) ketQua.loi.push('Chữ việc đã xong không phải màu --muted (' + kieu.mau + ')');
      const tich = await Y.locator('.tick-ok').boundingBox();
      if (Math.round(tich.width) !== 26 || Math.round(tich.height) !== 26) ketQua.loi.push('Tích xanh không tròn 26px: ' + Math.round(tich.width) + '×' + Math.round(tich.height));
      const thuTuNhom = await Y.locator('xpath=ancestor::section').locator('.swipe').evaluateAll((es) => es.map((e) => !!e.querySelector('.tick-ok')));
      T.thuTuNhomSauKhiXong = thuTuNhom.join(',');
      if (thuTuNhom.some((v, i) => i > 0 && thuTuNhom[i - 1] && !v)) ketQua.loi.push('Việc xong không nằm cuối nhóm: ' + thuTuNhom.join(','));
      const chuaChu = await Y.locator('.swipe-body').evaluate((e) => e.querySelectorAll('.chk, input[type=checkbox]').length);
      if (chuaChu) ketQua.loi.push('Dòng việc còn ô vuông đánh dấu');
      const le = (await Y.locator('.task-text').boundingBox()).x - (await Y.boundingBox()).x;
      T.leTrai = Math.round(le);
      if (Math.abs(le - 15) > 1.5) ketQua.loi.push('Chữ việc không sát lề trái 14px (đo ' + le.toFixed(1) + 'px kể cả viền 1px)');
    }
    // 3) vuốt phải trên việc ĐÃ XONG: chỉ nhúc nhích (lực cản), không nền, không đổi
    {
      await datRung();
      await keoDong(cdp, Z, Math.round(moc + 60));
      await page.waitForTimeout(100);
      const g = await doDong(Z);
      T.vuotPhaiViecXong = { dich: +g.dich.toFixed(1), hien: g.hien, rung: await rung() };
      if (!(g.dich > 0 && g.dich <= 16.5)) ketQua.loi.push('Vuốt phải trên việc đã xong: dòng trượt ' + g.dich.toFixed(1) + 'px (chỉ được nhúc nhích tối đa 16px)');
      if (g.hien === '1') ketQua.loi.push('Vuốt phải trên việc đã xong lại lộ nền xanh');
      if (T.vuotPhaiViecXong.rung !== 0) ketQua.loi.push('Vuốt phải trên việc đã xong mà máy rung');
      await thaTay(cdp);
      await page.waitForTimeout(500);
      const d1 = await dl('Ký y lệnh truyền máu');
      const sau = await doDong(Z);
      if (!d1.done || d1.deleted || Math.abs(sau.dich) > 0.5) ketQua.loi.push('Vuốt phải trên việc đã xong: dữ liệu/vị trí đổi (' + JSON.stringify({ done: d1.done, dich: sau.dich }) + ')');
    }
    await page.evaluate(() => document.querySelectorAll('*').forEach((e) => { if (e.scrollTop) e.scrollTop = 0; }));
    await chup(page, 'iphone-viec-xong', true);
    // 4) vuốt trái, thả TRƯỚC mốc (việc kiểu cũ, có nút số ưu tiên): nền đỏ phấn, thả → về, không xoá
    {
      await datRung();
      const dx = -Math.round(moc - 25);
      await keoDong(cdp, P, dx);
      await page.waitForTimeout(100);
      const g = await doDong(P);
      T.vuotTraiTruocMoc = { ...g, rung: await rung() };
      kiemNen('Vuốt trái trước mốc', g, 'xoa', false, nenDo);
      if (Math.abs(g.dich - dx) > 2) ketQua.loi.push(`Vuốt trái trước mốc: dòng trượt ${g.dich.toFixed(1)}px, ngón tay đi ${dx}px`);
      if (T.vuotTraiTruocMoc.rung !== 0) ketQua.loi.push('Vuốt trái trước mốc mà máy đã rung');
      await thaTay(cdp);
      await page.waitForTimeout(500);
      const d1 = await dl('Cập nhật cân nặng');
      const sau = await doDong(P);
      T.thaTraiTruocMoc = { deleted: d1.deleted, dich: +sau.dich.toFixed(2), thanh: await dongDaCoThanhHoanTac(page) };
      if (d1.deleted || Math.abs(sau.dich) > 0.5) ketQua.loi.push('Thả trước mốc 1/3 (vuốt trái): dòng bị xoá hoặc không trượt về ' + JSON.stringify(T.thaTraiTruocMoc));
      if (T.thaTraiTruocMoc.thanh) ketQua.loi.push('Thả trước mốc (vuốt trái) mà thanh Hoàn tác hiện');
    }
    // 5) vuốt trái, thả SAU mốc: xoá mềm đúng, dòng thu lại, thanh Hoàn tác; Hoàn tác trong 6 giây trả lại đủ nhãn và ghi chú
    {
      const q0 = await dl('Báo kết quả CRP cho bác sĩ trực');
      const nhanDom0 = (await Q.locator('.tag-dot').allTextContents()).join();
      const ghiChuDom0 = ((await Q.locator('.task-note').textContent()) || '').trim();
      await datRung();
      await keoDong(cdp, Q, -Math.round(moc + 30));
      await page.waitForTimeout(100);
      const g = await doDong(Q);
      T.vuotTraiQuaMoc = { ...g, rung: await rung() };
      kiemNen('Vuốt trái qua mốc', g, 'xoa', true, nenDo2);
      if (T.vuotTraiQuaMoc.rung !== 1) ketQua.loi.push('Vuốt trái qua mốc: máy rung ' + T.vuotTraiQuaMoc.rung + ' lần (cần đúng 1)');
      await chup(page, 'iphone-vuot-trai', false);
      await thaTay(cdp);
      await page.waitForTimeout(700);
      const d1 = await dl('Báo kết quả CRP cho bác sĩ trực');
      T.thaTraiQuaMoc = { deleted: d1.deleted, conDong: await Q.count(), thanh: await dongDaCoThanhHoanTac(page) };
      if (d1.deleted !== true || T.thaTraiQuaMoc.conDong !== 0) ketQua.loi.push('Thả sau mốc (vuốt trái): chưa xoá mềm / dòng chưa biến mất ' + JSON.stringify(T.thaTraiQuaMoc));
      if (T.thaTraiQuaMoc.thanh !== 1) ketQua.loi.push('Xoá bằng vuốt trái mà không có đúng một thanh Hoàn tác');
      const thanh = page.locator('.hoantac');
      T.thanhHoanTac = ((await thanh.textContent()) || '').trim();
      if (!/^Đã xoá: Báo kết quả CRP.*Hoàn tác$/.test(T.thanhHoanTac)) ketQua.loi.push('Thanh Hoàn tác ghi "' + T.thanhHoanTac + '"');
      const hb = await thanh.boundingBox();
      const nut = await thanh.getByRole('button', { name: 'Hoàn tác', exact: true }).boundingBox();
      if (!hb || hb.y + hb.height > 852 || hb.y < 600) ketQua.loi.push('Thanh Hoàn tác không nằm ở đáy màn hình: ' + JSON.stringify(hb));
      if (nut.height < 44 || nut.width < 44) ketQua.loi.push(`Nút Hoàn tác ${Math.round(nut.width)}×${Math.round(nut.height)} (< 44px)`);
      if (!(await page.locator('.hoantac-wrap[role="status"]').count())) ketQua.loi.push('Thanh Hoàn tác không có role="status"');
      T.thanhNoiTrenThanhThemViec = await page.evaluate(() => { const r = document.querySelector('.hoantac').getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!e?.closest('.hoantac'); });
      if (!T.thanhNoiTrenThanhThemViec) ketQua.loi.push('Thanh Hoàn tác bị thanh thêm việc/phần khác che');
      await chup(page, 'iphone-hoan-tac', true);
      await thanh.getByRole('button', { name: 'Hoàn tác', exact: true }).click();
      await page.waitForTimeout(500);
      const d2 = await dl('Báo kết quả CRP cho bác sĩ trực');
      const nhanDom1 = (await Q.locator('.tag-dot').allTextContents()).join();
      const ghiChuDom1 = ((await Q.locator('.task-note').textContent().catch(() => '')) || '').trim();
      T.hoanTac = { deleted: d2.deleted, tags: d2.tags, nhanDom: nhanDom1, ghiChuDom: ghiChuDom1, thanhCon: await dongDaCoThanhHoanTac(page) };
      if (d2.deleted !== false || d2.zone !== q0.zone || d2.tags.join() !== q0.tags.join() || d2.note !== q0.note || d2.done !== q0.done) ketQua.loi.push('Hoàn tác không trả đúng dòng cũ: ' + JSON.stringify({ truoc: q0, sau: d2 }));
      if (nhanDom1 !== nhanDom0 || !nhanDom0 || ghiChuDom1 !== ghiChuDom0 || !ghiChuDom0) ketQua.loi.push(`Hoàn tác: nhãn/ghi chú hiện trên dòng không như cũ (${nhanDom0}|${ghiChuDom0} → ${nhanDom1}|${ghiChuDom1})`);
      if (T.hoanTac.thanhCon) ketQua.loi.push('Bấm Hoàn tác xong mà thanh vẫn còn');
    }
    // 6) hết 6 giây thì thanh biến mất (và dòng vẫn bị xoá)
    {
      await vuotDong(page, cdp, R, -Math.round(moc + 30));
      await page.locator('.hoantac').waitFor({ timeout: 3000 });
      const t0 = Date.now();
      await page.waitForTimeout(5000);
      T.thanhSau5Giay = await dongDaCoThanhHoanTac(page);
      if (T.thanhSau5Giay !== 1) ketQua.loi.push('Thanh Hoàn tác biến mất trước 6 giây (sau 5 giây còn ' + T.thanhSau5Giay + ')');
      await page.locator('.hoantac').waitFor({ state: 'detached', timeout: 4000 });
      T.thanhMatSau = Date.now() - t0 + ' ms (tính từ lúc thanh hiện)';
      const ms = Date.now() - t0;
      if (ms < 5500 || ms > 7200) ketQua.loi.push('Thanh Hoàn tác biến mất sau ' + ms + ' ms (mong đợi ~6000)');
      const d1 = await dl('Hội chẩn dinh dưỡng giường 7');
      if (d1.deleted !== true) ketQua.loi.push('Hết 6 giây mà việc không còn bị xoá');
    }
    // 7) xoá tiếp việc khác: thanh đổi sang việc mới nhất; Hoàn tác chỉ trả việc mới nhất
    {
      for (const ten of ['Việc thử xoá nhanh 1', 'Việc thử xoá nhanh 2']) {
        await page.getByLabel('Nội dung công việc').fill(ten);
        await page.getByRole('button', { name: 'Thêm việc', exact: true }).click();
        await page.waitForTimeout(350);
      }
      const v1 = dong('Việc thử xoá nhanh 1'), v2 = dong('Việc thử xoá nhanh 2');
      await vuotDong(page, cdp, v1, -Math.round(moc + 30));
      await vuotDong(page, cdp, v2, -Math.round(moc + 30));
      T.thanhMoiNhat = ((await page.locator('.hoantac').first().textContent()) || '').trim();
      T.soThanh = await dongDaCoThanhHoanTac(page);
      if (T.soThanh !== 1 || !/Việc thử xoá nhanh 2/.test(T.thanhMoiNhat)) ketQua.loi.push('Xoá tiếp việc khác: thanh không đổi sang việc mới nhất (' + T.soThanh + ' thanh, "' + T.thanhMoiNhat + '")');
      await page.locator('.hoantac').getByRole('button', { name: 'Hoàn tác', exact: true }).click();
      await page.waitForTimeout(400);
      const a = (await docViec(page, 'Việc thử xoá nhanh 1'))[0], b = (await docViec(page, 'Việc thử xoá nhanh 2'))[0];
      if (!a.deleted || b.deleted) ketQua.loi.push('Hoàn tác khi đã xoá hai việc: phải chỉ trả việc mới nhất (1: ' + a.deleted + ', 2: ' + b.deleted + ')');
      await vuotDong(page, cdp, v2, -Math.round(moc + 30)); // dọn việc thử
      await choHoanTacTat(page);
    }
    // 8) cuộn dọc không đánh dấu nhầm xong / xoá
    {
      const nhanh = async () => (await docBang(page, 'tasks')).map((t) => `${t.id}:${t.done}:${t.deleted}`).sort().join('|');
      const truoc = await nhanh();
      await datRung();
      const b = await X.boundingBox();
      const y = b.y + b.height / 2;
      const cuon = async (x, dxx, dyy) => {
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (dxx * i) / 8, y: y + (dyy * i) / 8 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForTimeout(300);
      };
      await cuon(b.x + 150, 4, -160);   // gần thẳng đứng
      await cuon(b.x + 80, 40, 120);    // chéo, dọc nhiều hơn ngang
      await cuon(b.x + 200, -45, -130); // chéo ngược
      T.cuonDoc = { khongDoiDuLieu: (await nhanh()) === truoc, dongDangKeo: await page.locator('.swipe[data-hien="1"]').count(), rung: await rung() };
      if (!T.cuonDoc.khongDoiDuLieu) ketQua.loi.push('Cuộn dọc danh sách làm đổi dữ liệu (đánh dấu xong hoặc xoá nhầm)');
      if (T.cuonDoc.dongDangKeo || T.cuonDoc.rung) ketQua.loi.push('Cuộn dọc mà có dòng lộ nền vuốt / máy rung');
      await page.evaluate(() => document.querySelectorAll('*').forEach((e) => { if (e.scrollTop) e.scrollTop = 0; })); // trả vùng cuộn về đầu cho các bước sau
    }
    T.thanhConLai = await dongDaCoThanhHoanTac(page);
    await choHoanTacTat(page);

    // chạm 1 lần vào thân dòng: chưa mở; chạm lần 2: mở bảng chi tiết (không có chữ "Sửa việc", "Tự lưu")
    const D = dong('Báo kết quả CRP');
    // Chromium headless nuốt cú chạm đầu sau chuỗi cử chỉ CDP: chạm vùng trống trước (như các chỗ khác trong script)
    await page.touchscreen.tap(60, 45);
    await page.waitForTimeout(250);
    c = await tamDiem(D.locator('.task-main'));
    await page.touchscreen.tap(c.x, c.y);
    await page.waitForTimeout(150);
    T.chiTietSau1Lan = await page.getByRole('dialog', { name: 'Chi tiết việc' }).count();
    await page.touchscreen.tap(c.x, c.y);
    await page.waitForTimeout(300);
    const bang = page.getByRole('dialog', { name: 'Chi tiết việc' });
    T.chiTietSau2Lan = await bang.count();
    if (T.chiTietSau1Lan !== 0) ketQua.loi.push('Chạm 1 lần đã mở chi tiết việc');
    if (T.chiTietSau2Lan !== 1) ketQua.loi.push('Chạm 2 lần không mở chi tiết việc');
    const hb = await bang.boundingBox();
    T.chiTietCao = `${Math.round(hb.height)}px = ${Math.round((100 * hb.height) / 852)}% màn hình`;
    // v9.2: bảng 15c cao 640/844 ≈ 76% (có thêm chip khu vực và dòng trạng thái) — thay phép kiểm cũ 45–60%
    if (hb.height < 0.70 * 852 || hb.height > 0.82 * 852) ketQua.loi.push('Bảng chi tiết việc cao ' + T.chiTietCao + ' (mong đợi 70–82%, bảng 15c ≈ 76%)');
    const chuBang = (await bang.textContent()) || '';
    if (/Sửa việc/.test(chuBang)) ketQua.loi.push('Bảng chi tiết còn chữ "Sửa việc"');
    if (/Tự lưu/.test(chuBang)) ketQua.loi.push('Bảng chi tiết còn chữ "Tự lưu"');
    const nhanTrongBang = await bang.getByRole('button', { name: /^Nhãn / }).count();
    if (nhanTrongBang !== 5) ketQua.loi.push('Bảng chi tiết có ' + nhanTrongBang + ' nút nhãn (mong đợi 5)');
    // ghi chú là khung lớn nhất
    const ghiChuCao = (await bang.getByRole('textbox', { name: 'Ghi chú' }).boundingBox()).height;
    T.ghiChuCao = Math.round(ghiChuCao);
    // v9.2: bảng cao hơn nhưng có thêm chip khu vực và dòng trạng thái; "ghi chú là khung lớn nhất" = cao hơn mọi ô/nút khác trong bảng (thay ngưỡng cũ 35% chiều cao bảng)
    const caoKhac = await bang.locator('textarea:not(#ghichu-viec), button, .trang-thai, .chips-sheet').evaluateAll((es) => es.map((e) => Math.round(e.getBoundingClientRect().height)));
    T.ghiChuTiLe = Math.round((100 * ghiChuCao) / hb.height) + '% chiều cao bảng';
    if (ghiChuCao <= Math.max(...caoKhac) * 2 || ghiChuCao < 0.30 * hb.height) ketQua.loi.push('Khung ghi chú không phải khung lớn nhất (' + T.ghiChuCao + 'px, ' + T.ghiChuTiLe + ')');
    const ta = bang.getByRole('textbox', { name: 'Ghi chú' });
    T.ghiChuCoSan = await ta.inputValue();
    {
      // v9.2: khu vực là chip (thay ô chọn): role group + aria-label "Khu vực", aria-pressed, chip chọn nền xanh, vuốt ngang được
      const nhom = bang.getByRole('group', { name: 'Khu vực', exact: true });
      const chips = await nhom.getByRole('button').evaluateAll((es) => es.map((e) => ({ chu: e.textContent.trim(), bat: e.getAttribute('aria-pressed'), nen: getComputedStyle(e).backgroundColor, cao: Math.round(e.getBoundingClientRect().height) })));
      const accent = await mauBien(page, '--accent');
      T.chipKhu = chips.map((x) => x.chu + (x.bat === 'true' ? '*' : '')).join(' ');
      if (chips.map((x) => x.chu).join() !== 'NICU,CT,KAN,PS-PM,Ngoại Trú,DV,HP,HS') ketQua.loi.push('Chip khu trong chi tiết việc: ' + T.chipKhu);
      if (chips.filter((x) => x.bat === 'true').map((x) => x.chu).join() !== 'NICU') ketQua.loi.push('Chip khu: aria-pressed không đúng (việc đang ở NICU): ' + T.chipKhu);
      if (chips.some((x) => (x.bat === 'true') !== (x.nen === accent))) ketQua.loi.push('Chip khu: chỉ chip đang chọn được nền xanh (--accent)');
      if (chips.some((x) => x.cao !== 44)) ketQua.loi.push('Chip khu không cao 44px: ' + chips.map((x) => x.cao).join(','));
      const cuon = await nhom.evaluate((e) => ({ sw: e.scrollWidth, cw: e.clientWidth, ox: getComputedStyle(e).overflowX }));
      T.chipKhuCuonNgang = cuon;
      if (!(cuon.sw > cuon.cw && /auto|scroll/.test(cuon.ox))) ketQua.loi.push('Chip khu không vuốt ngang được trong bảng: ' + JSON.stringify(cuon));
      T.trangThaiChuaXong = ((await bang.locator('.trang-thai').textContent()) || '').trim();
      if (T.trangThaiChuaXong !== 'Chưa xongHoàn thành') ketQua.loi.push('Dòng trạng thái việc chưa xong: "' + T.trangThaiChuaXong + '"');
      const mauXoa = await bang.getByRole('button', { name: 'Xoá việc', exact: true }).evaluate((e) => getComputedStyle(e).color);
      if (mauXoa !== (await mauBien(page, '--delInk'))) ketQua.loi.push('Chữ "Xoá việc" không phải màu đỏ dịu --delInk (' + mauXoa + ')');
    }
    await chup(page, 'iphone-chi-tiet-viec', true);
    // sửa ghi chú, tên, khu, nhãn — tất cả tự lưu
    await ta.fill(T.ghiChuCoSan + ' Cập nhật 9 giờ.');
    const oTen = bang.getByRole('textbox', { name: 'Nội dung việc' });
    T.tenCu = await oTen.inputValue();
    await oTen.fill('Báo CRP mới cho bác sĩ trực');
    await bang.getByRole('group', { name: 'Khu vực', exact: true }).getByRole('button', { name: 'HP', exact: true }).click();
    await page.waitForTimeout(150);
    await bang.getByRole('button', { name: 'Nhãn BM', exact: true }).click();
    await page.waitForTimeout(700); // tự lưu 0,4 giây
    T.bangConMoSauDoiKhu = await page.getByRole('dialog', { name: 'Chi tiết việc' }).count();
    if (T.bangConMoSauDoiKhu !== 1) ketQua.loi.push('Đổi khu làm đóng bảng chi tiết');
    const luu = (await docViec(page, 'Báo CRP mới cho bác sĩ trực'))[0];
    T.daLuuViecSua = JSON.stringify(luu);
    if (!luu || luu.zone !== 'HP' || luu.tags.join() !== 'NV,BM,XN' || !/Cập nhật 9 giờ/.test(luu.note || '')) ketQua.loi.push('Chi tiết việc: dữ liệu lưu chưa đúng — ' + T.daLuuViecSua);
    // tên rỗng → không lưu, rời ô thì trả lại chữ cũ
    await oTen.fill('');
    await page.waitForTimeout(700);
    await ta.click();
    T.tenSauKhiXoaHet = await oTen.inputValue();
    if (T.tenSauKhiXoaHet !== 'Báo CRP mới cho bác sĩ trực') ketQua.loi.push('Tên rỗng: ô tên hiện "' + T.tenSauKhiXoaHet + '" thay vì chữ cũ');
    await chup(page, 'iphone-chi-tiet-viec-2', false);
    await bang.getByRole('button', { name: 'Xong', exact: true }).click(); await page.waitForTimeout(600); // chờ bảng trượt xuống xong
    await page.waitForTimeout(300);
    const D2 = dong('Báo CRP mới cho bác sĩ trực');
    T.dongDoiTen = await D2.count();
    if (T.dongDoiTen !== 1) ketQua.loi.push('Sửa tên xong mà dòng không đổi tên');
    T.ghiChuHienDuoiTen = (await D2.locator('.task-note').textContent()) || '';
    if (!/Cập nhật 9 giờ/.test(T.ghiChuHienDuoiTen)) ketQua.loi.push('Ghi chú vừa gõ không hiện dưới tên việc');
    T.nhomMoi = await page.locator('.group', { has: page.locator('.group-title', { hasText: /^HP$/ }) }).locator('.swipe', { hasText: 'Báo CRP mới' }).count();
    if (T.nhomMoi !== 1) ketQua.loi.push('Đổi khu sang HP mà việc không nằm trong nhóm HP');
    T.nhanSauKhiBat = await D2.locator('.tag-dot').allTextContents();
    if (T.nhanSauKhiBat.join() !== 'NV,BM,XN') ketQua.loi.push('Nhãn trên dòng sau khi bật BM: ' + T.nhanSauKhiBat.join());
    T.khongConVongNetDut = await page.locator('.tag-empty').count();
    if (T.khongConVongNetDut) ketQua.loi.push('Còn vòng tròn nét đứt (việc không nhãn)');

    // việc cũ: mở chi tiết, chưa bật nhãn nào → vẫn kiểu cũ; bật một nhãn → thành kiểu mới, urgency giữ trong dữ liệu
    const cu = dong('Siêu âm tim');
    await cu.scrollIntoViewIfNeeded();
    c = await tamDiem(cu.locator('.task-main'));
    await chamDoi(page, c);
    const bang2 = page.getByRole('dialog', { name: 'Chi tiết việc' });
    await bang2.waitFor();
    T.nhanBatKhiViecCu = await bang2.getByRole('group', { name: 'Nhãn của việc', exact: true }).locator('[aria-pressed="true"]').count(); // chỉ nút nhãn (chip khu vực luôn có một chip được chọn)
    if (T.nhanBatKhiViecCu !== 0) ketQua.loi.push('Việc cũ mở chi tiết mà đã có nhãn bật');
    await bang2.getByRole('button', { name: 'Xong', exact: true }).click(); await page.waitForTimeout(600); // chờ bảng trượt xuống xong
    await page.waitForTimeout(300);
    await cu.scrollIntoViewIfNeeded();
    T.viecCuKhongBatGi = await cu.locator('.icon-btn .pri').count();
    if (T.viecCuKhongBatGi !== 1) ketQua.loi.push('Việc cũ không bật nhãn mà mất chấm số');
    c = await tamDiem(cu.locator('.task-main'));
    await chamDoi(page, c);
    await bang2.waitFor();
    await bang2.getByRole('button', { name: 'Nhãn HC', exact: true }).click();
    await page.waitForTimeout(300);
    await bang2.getByRole('button', { name: 'Xong', exact: true }).click(); await page.waitForTimeout(600); // chờ bảng trượt xuống xong
    await page.waitForTimeout(300);
    T.viecCuSauKhiGanNhan = { chamSo: await cu.locator('.icon-btn .pri').count(), nhan: await cu.locator('.tag-dot').allTextContents(), duLieu: await docViec(page, 'Siêu âm tim') };
    if (T.viecCuSauKhiGanNhan.chamSo !== 0 || T.viecCuSauKhiGanNhan.nhan.join() !== 'HC') ketQua.loi.push('Việc cũ gắn nhãn HC mà dòng hiện: ' + JSON.stringify(T.viecCuSauKhiGanNhan));
    if (T.viecCuSauKhiGanNhan.duLieu[0]?.urgency !== 2) ketQua.loi.push('Việc cũ gắn nhãn: urgency không còn giữ trong dữ liệu');

    // thêm việc mới với 2 nhãn; giữ lựa chọn sau khi thêm
    const truoc = await page.locator('.swipe').count();
    // v9.3: 5 nút nhãn chỉ hiện khi chạm vào ô gõ (bảng 15b) — phải bung ô trước rồi mới chọn nhãn (thay phép kiểm cũ: nút nhãn luôn hiện)
    await page.getByLabel('Nội dung công việc').click();
    await page.getByRole('button', { name: 'Nhãn NV', exact: true }).click();
    await page.getByRole('button', { name: 'Nhãn XN', exact: true }).click();
    await page.getByLabel('Nội dung công việc').fill('Việc thử có hai nhãn');
    await page.getByRole('button', { name: 'Thêm việc', exact: true }).click();
    await page.waitForTimeout(400);
    T.themViecTang = (await page.locator('.swipe').count()) - truoc;
    T.nhanViecMoi = await dong('Việc thử có hai nhãn').locator('.tag-dot').allTextContents();
    T.giuNhanSauKhiThem = await page.getByRole('button', { name: 'Nhãn NV', exact: true }).getAttribute('aria-pressed');
    if (T.themViecTang !== 1 || T.nhanViecMoi.join() !== 'NV,XN') ketQua.loi.push('Thêm việc có nhãn NV, XN không đúng: ' + T.nhanViecMoi.join());
    if (T.giuNhanSauKhiThem !== 'true') ketQua.loi.push('Sau khi thêm việc, lựa chọn nhãn không được giữ');
    // việc cũ vẫn có chấm mức, chạm đổi vòng
    const cu2 = dong('Cập nhật cân nặng').locator('.icon-btn');
    const truocChu = await cu2.textContent();
    await cu2.click();
    await page.waitForTimeout(250);
    T.vongMucCu = truocChu + ' -> ' + (await cu2.textContent());
    if (truocChu === (await cu2.textContent())) ketQua.loi.push('Chạm chấm mức của việc cũ không đổi vòng');
    // xoá: vuốt trái qua mốc 1/3 → dòng thu lại và mất (thay phép kiểm cũ "vuốt rồi chạm nút Xoá")
    const V = dong('Việc thử có hai nhãn');
    await V.scrollIntoViewIfNeeded();
    const dem0 = await page.locator('.swipe').count();
    await vuotDong(page, cdp, V, -Math.round(moc + 30));
    await page.waitForTimeout(300);
    T.xoaBangVuot = { truoc: dem0, sau: await page.locator('.swipe').count(), conDong: await dong('Việc thử có hai nhãn').count(), deleted: (await docViec(page, 'Việc thử có hai nhãn'))[0]?.deleted };
    if (T.xoaBangVuot.conDong !== 0 || T.xoaBangVuot.sau !== dem0 - 1 || T.xoaBangVuot.deleted !== true) ketQua.loi.push('Vuốt trái qua mốc mà dòng không mất / chưa xoá mềm: ' + JSON.stringify(T.xoaBangVuot));
    await choHoanTacTat(page);
    // xoá từ bảng chi tiết: "Xoá việc" xoá rồi đóng bảng
    await page.getByLabel('Nội dung công việc').fill('Việc thử xoá trong bảng');
    await page.getByRole('button', { name: 'Thêm việc', exact: true }).click();
    await page.waitForTimeout(400);
    const W = dong('Việc thử xoá trong bảng');
    await W.scrollIntoViewIfNeeded();
    c = await tamDiem(W.locator('.task-main'));
    await chamDoi(page, c);
    await page.getByRole('dialog', { name: 'Chi tiết việc' }).waitFor();
    await page.getByRole('button', { name: 'Xoá việc', exact: true }).click();
    await page.waitForTimeout(700);
    T.xoaTuBang = { bangDong: (await page.getByRole('dialog', { name: 'Chi tiết việc' }).count()) === 0, conDong: await dong('Việc thử xoá trong bảng').count(), duLieu: (await docViec(page, 'Việc thử xoá trong bảng'))[0]?.deleted };
    if (!T.xoaTuBang.bangDong || T.xoaTuBang.conDong !== 0 || T.xoaTuBang.duLieu !== true) ketQua.loi.push('Nút "Xoá việc" trong bảng chi tiết chưa đúng: ' + JSON.stringify(T.xoaTuBang));
    // v9.2: "Xoá việc" trong chi tiết có Hoàn tác (thanh còn hiện sau khi bảng đã đóng)
    T.thanhXoaTuBang = ((await page.locator('.hoantac').textContent().catch(() => '')) || '').trim();
    if (!/^Đã xoá: Việc thử xoá trong bảng.*Hoàn tác$/.test(T.thanhXoaTuBang)) ketQua.loi.push('"Xoá việc" trong chi tiết: thanh Hoàn tác ghi "' + T.thanhXoaTuBang + '"');
    await page.locator('.hoantac').getByRole('button', { name: 'Hoàn tác', exact: true }).click();
    await page.waitForTimeout(500);
    T.hoanTacXoaTuBang = { conDong: await dong('Việc thử xoá trong bảng').count(), deleted: (await docViec(page, 'Việc thử xoá trong bảng'))[0]?.deleted };
    if (T.hoanTacXoaTuBang.conDong !== 1 || T.hoanTacXoaTuBang.deleted !== false) ketQua.loi.push('Hoàn tác "Xoá việc" không trả lại dòng: ' + JSON.stringify(T.hoanTacXoaTuBang));
    await vuotDong(page, cdp, W, -Math.round(moc + 30)); // dọn việc thử
    await choHoanTacTat(page);
    {
      // "Xoá việc đã xong" có Hoàn tác 6 giây: một lần Hoàn tác trả lại TẤT CẢ việc vừa xoá
      const hom = '2026-10-21';
      const xong0 = (await docBang(page, 'tasks')).filter((t) => t.date === hom && t.done && !t.deleted);
      const chup0 = JSON.stringify(xong0.map((t) => ({ id: t.id, text: t.text, zone: t.zone, tags: t.tags ?? null, note: t.note ?? null, done: t.done, doneAt: t.doneAt ?? null })).sort((a, b) => a.id.localeCompare(b.id)));
      T.xoaDaXong = { truoc: xong0.length };
      if (xong0.length < 2) ketQua.loi.push('Chưa đủ việc đã xong để thử "Xoá việc đã xong" (' + xong0.length + ')');
      await page.locator('.ph-main').evaluate((e) => { e.scrollTop = e.scrollHeight; });
      await page.getByRole('button', { name: 'Xoá việc đã xong', exact: true }).click();
      await page.waitForTimeout(500);
      const sau = (await docBang(page, 'tasks')).filter((t) => t.date === hom && xong0.some((x) => x.id === t.id));
      T.xoaDaXong.daXoa = sau.filter((t) => t.deleted).length;
      T.xoaDaXong.thanh = ((await page.locator('.hoantac').textContent().catch(() => '')) || '').trim();
      if (T.xoaDaXong.daXoa !== xong0.length) ketQua.loi.push('"Xoá việc đã xong": chỉ xoá ' + T.xoaDaXong.daXoa + '/' + xong0.length);
      if (T.xoaDaXong.thanh !== 'Đã xoá ' + xong0.length + ' việc đã xongHoàn tác') ketQua.loi.push('"Xoá việc đã xong": thanh ghi "' + T.xoaDaXong.thanh + '" (cần "Đã xoá ' + xong0.length + ' việc đã xong — Hoàn tác")');
      await page.locator('.hoantac').getByRole('button', { name: 'Hoàn tác', exact: true }).click();
      await page.waitForTimeout(500);
      const lai = (await docBang(page, 'tasks')).filter((t) => t.date === hom && t.done && !t.deleted);
      const chup1 = JSON.stringify(lai.filter((t) => xong0.some((x) => x.id === t.id)).map((t) => ({ id: t.id, text: t.text, zone: t.zone, tags: t.tags ?? null, note: t.note ?? null, done: t.done, doneAt: t.doneAt ?? null })).sort((a, b) => a.id.localeCompare(b.id)));
      T.xoaDaXong.saukhiHoanTac = lai.length;
      if (chup1 !== chup0) ketQua.loi.push('Hoàn tác "Xoá việc đã xong" không trả đủ/đúng các việc: trước ' + chup0 + ' sau ' + chup1);
    }
    {
      // trạng thái trong chi tiết + doneAt ghi và bỏ (việc vừa vuốt phải xong có doneAt; việc cũ chưa có giờ chỉ ghi "Đã xong")
      const Y2 = dong('Gọi đăng ký giường mới');
      await Y2.scrollIntoViewIfNeeded();
      c = await tamDiem(Y2.locator('.task-main'));
      await chamDoi(page, c);
      const bg = page.getByRole('dialog', { name: 'Chi tiết việc', exact: true });
      await bg.waitFor();
      const tt = bg.locator('.trang-thai');
      T.trangThaiXongCoGio = ((await tt.textContent()) || '').trim();
      if (T.trangThaiXongCoGio !== 'Đã xong lúc 08:00Bỏ đánh dấu xong') ketQua.loi.push('Chi tiết việc đã xong: dòng trạng thái "' + T.trangThaiXongCoGio + '"');
      await chup(page, 'iphone-chi-tiet-viec-xong', true);
      await bg.getByRole('button', { name: 'Bỏ đánh dấu xong', exact: true }).click();
      await page.waitForTimeout(400);
      let d = (await docViec(page, 'Gọi đăng ký giường mới'))[0];
      T.boDanhDau = { done: d.done, doneAt: d.doneAt, chu: ((await tt.textContent()) || '').trim() };
      if (d.done !== false || d.doneAt !== null || T.boDanhDau.chu !== 'Chưa xongHoàn thành') ketQua.loi.push('"Bỏ đánh dấu xong": done/doneAt/dòng trạng thái chưa đúng ' + JSON.stringify(T.boDanhDau));
      await bg.getByRole('button', { name: 'Hoàn thành', exact: true }).click();
      await page.waitForTimeout(400);
      d = (await docViec(page, 'Gọi đăng ký giường mới'))[0];
      T.hoanThanh = { done: d.done, doneAt: d.doneAt, chu: ((await tt.textContent()) || '').trim() };
      if (d.done !== true || d.doneAt !== NOW.getTime() || T.hoanThanh.chu !== 'Đã xong lúc 08:00Bỏ đánh dấu xong') ketQua.loi.push('"Hoàn thành": done/doneAt/dòng trạng thái chưa đúng ' + JSON.stringify(T.hoanThanh));
      await bg.getByRole('button', { name: 'Bỏ đánh dấu xong', exact: true }).click();
      await page.waitForTimeout(300);
      await bg.getByRole('button', { name: 'Xong', exact: true }).click(); await page.waitForTimeout(600);
      // việc cũ đã xong từ trước (chưa có doneAt): chỉ ghi "Đã xong"
      const Z2 = dong('Ký y lệnh truyền máu');
      await Z2.scrollIntoViewIfNeeded();
      c = await tamDiem(Z2.locator('.task-main'));
      await chamDoi(page, c);
      await bg.waitFor();
      T.trangThaiViecCu = ((await bg.locator('.trang-thai').textContent()) || '').trim();
      if (T.trangThaiViecCu !== 'Đã xongBỏ đánh dấu xong') ketQua.loi.push('Việc cũ chưa có giờ: dòng trạng thái "' + T.trangThaiViecCu + '" (cần chỉ "Đã xong")');
      await bg.getByRole('button', { name: 'Xong', exact: true }).click(); await page.waitForTimeout(600);
      await page.evaluate(() => document.querySelector('.ph-main').scrollTo(0, 0));
    }
    // khu BM cũ vẫn có chip và nhóm
    T.chipBM = await page.locator('.chip', { hasText: /^BM/ }).count();
    if (!T.chipBM) ketQua.loi.push("Việc cũ ở khu 'BM' mà không thấy chip BM");
    // việc ở khu cũ BM: ô chọn khu vẫn có BM
    const bm = dong('Việc cũ ở khu BM');
    await bm.scrollIntoViewIfNeeded();
    c = await tamDiem(bm.locator('.task-main'));
    await chamDoi(page, c);
    const bang3 = page.getByRole('dialog', { name: 'Chi tiết việc' });
    await bang3.waitFor();
    // v9.2: khuDeChon giữ khu cũ BM trong dãy chip khi việc đang ở khu đó
    const chipsBM = await bang3.getByRole('group', { name: 'Khu vực', exact: true }).getByRole('button').evaluateAll((es) => es.map((e) => e.textContent.trim() + (e.getAttribute('aria-pressed') === 'true' ? '*' : '')));
    T.khuTrongBangViecBM = chipsBM.join(' ');
    if (!chipsBM.includes('BM*') || chipsBM.filter((x) => x.endsWith('*')).length !== 1) ketQua.loi.push('Việc ở khu BM mở chi tiết mà dãy chip khu là "' + T.khuTrongBangViecBM + '" (cần có BM được chọn)');
    if (!(await page.getByRole('dialog', { name: 'Chi tiết việc', exact: true }).getByRole('group', { name: 'Khu vực', exact: true }).count())) ketQua.loi.push('Chi tiết việc thiếu nhóm "Khu vực"');
    await bang3.getByRole('button', { name: 'Xong', exact: true }).click(); await page.waitForTimeout(600); // chờ bảng trượt xuống xong
    await page.waitForTimeout(250);
    await page.evaluate(() => document.querySelector('.ph-main').scrollTo(0, 0));
    await cdp.detach();
  }

  {
    const T = ketQua.thuChucNang.vietTatIphone = {};
    await TIEU_DE_MOT_DONG(page, T, 'viec');
    await thuGoNhanh(page, T, 'iphone', true);
    const cdp = await ctx.newCDPSession(page);
    await thuThuVien(page, T, 'iphone', cdp);
    await cdp.detach();
    // khung ghi chú của việc
    const dg = page.locator('.swipe', { hasText: 'Gọi người nhà giường 12' }).locator('.task-main');
    await dg.scrollIntoViewIfNeeded();
    // Chromium headless nuốt cú chạm đầu sau khi đóng Thư viện: chạm vùng trống trước, như chỗ kiểm bản tối
    await page.touchscreen.tap(60, 45);
    await page.waitForTimeout(250);
    const cg = await tamDiem(dg);
    await chamDoi(page, cg);
    const ta = page.locator('#ghichu-viec');
    await ta.waitFor();
    await ta.click();
    await page.keyboard.type('Gửi /cay ');
    T.ghiChuViec = await ta.inputValue();
    if (T.ghiChuViec !== 'Gửi Cấy máu ') ketQua.loi.push('Viết tắt: khung ghi chú việc ra "' + T.ghiChuViec + '"');
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: 'Xong', exact: true }).click(); await page.waitForTimeout(600); // chờ bảng trượt xuống xong
    await page.waitForTimeout(250);
  }

  await page.getByRole('button', { name: 'Khám', exact: true }).click();
  await TIEU_DE_MOT_DONG(page, ketQua.thuChucNang.vietTatIphone, 'kham');
  await chup(page, 'iphone-kham-truoc-khi-lay', true);

  // Mức 2: "Lấy danh sách hôm qua" nằm trong bảng "…"; bấm 2 lần không được trùng bé; câu báo hiện ngay dưới hàng nút (role="status")
  await chonBangThem(page, 'Lấy danh sách');
  await page.waitForTimeout(400);
  const lan1 = await page.locator('.pat-row').count();
  const bao1 = ((await page.locator('.ph-chep').textContent().catch(() => '')) || '').trim();
  await chonBangThem(page, 'Lấy danh sách');
  await page.waitForTimeout(400);
  const lan2 = await page.locator('.pat-row').count();
  const thongBao = (await page.locator('.ph-chep').textContent().catch(() => '')) || '';
  ketQua.thuChucNang.layDanhSachBaoTin = { lan1: bao1, lan2: thongBao.trim(), vaiTro: await page.locator('.ph-chep').getAttribute('role').catch(() => null) };
  if (!/^Đã chép 3 bệnh nhân\.$/.test(bao1)) ketQua.loi.push('Câu báo sau khi chép lần 1: "' + bao1 + '" (cần "Đã chép 3 bệnh nhân.")');
  if (thongBao.trim() !== 'Không có bệnh nhân mới để chép.') ketQua.loi.push('Câu báo sau khi chép lần 2: "' + thongBao.trim() + '"');
  if ((await page.locator('.ph-chep').getAttribute('role').catch(() => null)) !== 'status') ketQua.loi.push('Câu báo "Đã chép…" thiếu role="status"');
  ketQua.thuChucNang.layDanhSachHomQua = { lan1, lan2, thongBao };
  if (lan1 !== 3) ketQua.loi.push(`"Lấy danh sách hôm qua" lần 1 chép ${lan1} bé (mong đợi 3)`);
  if (lan2 !== lan1) ketQua.loi.push(`"Lấy danh sách hôm qua" lần 2 bị chép trùng (${lan1} → ${lan2})`);
  const thuTu = await page.locator('.pat-code').allTextContents();
  ketQua.thuChucNang.thuTuSauKhiChep = thuTu.join(', ');
  if (thuTu.slice(0, 2).join() !== 'G01,G03') {
    ketQua.luuY.push(`Thứ tự bé sau khi chép (ĐÃ BIẾT, chờ duyệt): ${thuTu.join(', ')} — hôm qua là G01, G03`);
  }
  await chup(page, 'iphone-kham-sang', true);

  // ===================== v9.4: Khám — nút "+", dòng bé vuốt phải, chi tiết bé mới (bảng 13, 15d, 16b) =====================
  const bangBeMo = page.getByRole('dialog', { name: 'Chi tiết bệnh nhân' });
  const T94 = ketQua.thuChucNang.khamV94 = {};
  const loi94 = (m) => ketQua.loi.push('Khám 9.4: ' + m);
  const dung94 = (c, m) => { if (!c) loi94(m); };
  const hoiXoaBe = async (ma, huyTruoc) => { // mở bé bằng một lần chạm, bấm "Xoá khỏi hôm nay" (hỏi xác nhận); huyTruoc: bấm Huỷ trước rồi mới đồng ý
    await chamMot(page, dongBe(page, ma).locator('.pat-open'));
    await bangBeMo.waitFor();
    await page.waitForTimeout(600);
    const nutXoa = bangBeMo.getByRole('button', { name: 'Xoá khỏi hôm nay', exact: true });
    if (huyTruoc) {
      page.once('dialog', async (d) => { T94['hoiHuy_' + ma] = d.message(); await d.dismiss(); });
      await chamMot(page, nutXoa);
      await page.waitForTimeout(500);
      const con = (await docBe(page, ma))[0];
      dung94(con && !con.deleted && (await bangBeMo.count()) === 1, 'bấm Huỷ ở câu hỏi xoá mà bé vẫn bị xoá hoặc bảng đóng');
    }
    page.once('dialog', async (d) => { T94['hoiXoa_' + ma] = d.message(); await d.accept(); });
    await chamMot(page, nutXoa);
    await page.waitForTimeout(800);
    const x = (await docBe(page, ma))[0];
    dung94(x && x.deleted && (await bangBeMo.count()) === 0, 'đồng ý xoá bé ' + ma + ' mà chưa xoá hoặc bảng chưa đóng');
    dung94(T94['hoiXoa_' + ma] === `Xoá ${ma} khỏi danh sách hôm nay?`, 'câu hỏi xoá sai: "' + T94['hoiXoa_' + ma] + '"');
  };
  {
    // --- dòng phòng: nút "+" tròn 32px viền xanh, vùng chạm 44px, căn phải, nằm NGOÀI nút thu gọn ---
    T94.nutCong = await page.locator('.room-add').evaluateAll((es) => es.map((e) => {
      const r = e.getBoundingClientRect(), o = e.querySelector('.room-add-o'), ob = o.getBoundingClientRect();
      const g = e.closest('.group'), gb = e.closest('.room-h').querySelector('.group-btn').getBoundingClientRect();
      return { ten: e.getAttribute('aria-label'), w: Math.round(r.width), h: Math.round(r.height), ow: Math.round(ob.width), oh: Math.round(ob.height), vien: getComputedStyle(o).borderTopWidth,
        trongNutGon: !!e.closest('.group-btn'), canPhai: Math.round(g.getBoundingClientRect().right - r.right), lechDoc: Math.round(Math.abs(r.top + r.height / 2 - (gb.top + gb.height / 2))) };
    }));
    dung94(T94.nutCong.map((x) => x.ten).join('|') === 'Thêm bé vào Phòng 1|Thêm bé vào Phòng 2|Thêm bé vào Phòng 3', 'nút "+" thiếu hoặc sai aria-label: ' + JSON.stringify(T94.nutCong.map((x) => x.ten)));
    for (const x of T94.nutCong) {
      dung94(x.w === 44 && x.h === 44, `nút "${x.ten}" là ${x.w}×${x.h} (cần vùng chạm 44×44)`);
      dung94(x.ow === 32 && x.oh === 32 && ['1px', '1.5px'].includes(x.vien), `nút "${x.ten}": vòng tròn ${x.ow}×${x.oh}, viền ${x.vien} (cần 32×32, viền 1,5px; Chrome có thể làm tròn xuống 1px)`);
      dung94(!x.trongNutGon, `nút "${x.ten}" nằm trong nút thu gọn phòng (nút lồng nút)`);
      dung94(x.canPhai <= 2, `nút "${x.ten}" không căn phải (cách lề ${x.canPhai}px)`);
      dung94(x.lechDoc <= 2, `nút "${x.ten}" lệch ${x.lechDoc}px so với dòng tên phòng`);
    }
    T94.cuNutThem = await page.evaluate(() => ({ gachDut: document.querySelectorAll('.add-dashed').length, chuCu: /\+ Thêm bệnh nhân/.test(document.body.innerText), nutLong: document.querySelectorAll('button button').length, chk: document.querySelectorAll('.chk, .mini-box').length }));
    dung94(!T94.cuNutThem.gachDut && !T94.cuNutThem.chuCu, 'còn ô gạch đứt "+ Thêm bệnh nhân"');
    dung94(!T94.cuNutThem.nutLong, 'có nút lồng trong nút (' + T94.cuNutThem.nutLong + ')');
    dung94(!T94.cuNutThem.chk, 'còn ô vuông / ô nhỏ cũ');
    // --- dòng bé: không ô vuông, không mũi tên, không nút xoá, chữ sát lề 14px, số đo "25w0d, 1850 g", việc hiện chữ ---
    T94.dongG03 = await dongBe(page, 'G03').evaluate((e) => {
      const code = e.querySelector('.pat-code'), body = e.querySelector('.swipe-body');
      return { chk: e.querySelectorAll('.chk, input[type=checkbox], .mini-box').length, nutXoa: e.querySelectorAll('.swipe-del').length, nutLong: e.querySelectorAll('button button').length, nutMo: e.querySelectorAll('button.pat-open').length,
        bieuTuong: e.querySelectorAll('.pat-open svg').length, gach: getComputedStyle(code).textDecorationLine, mo: getComputedStyle(body).opacity, leTrai: Math.round(code.getBoundingClientRect().left - e.getBoundingClientRect().left),
        badge: e.querySelector('.left-badge')?.textContent.trim() || '', viec: [...e.querySelectorAll('.pat-todo')].map((x) => x.textContent) };
    });
    const d3 = T94.dongG03;
    dung94(d3.chk === 0 && d3.nutXoa === 0 && d3.nutLong === 0 && d3.nutMo === 1 && d3.bieuTuong === 0, 'dòng bé sai cấu trúc ' + JSON.stringify(d3));
    dung94(d3.gach === 'none' && d3.mo === '1', 'dòng bé chưa khám bị gạch ngang hoặc mờ ' + JSON.stringify(d3));
    dung94(d3.leTrai >= 14 && d3.leTrai <= 16, 'chữ dòng bé không sát lề trái 14px (cách ' + d3.leTrai + 'px)');
    dung94(d3.badge === 'Còn 1 việc' && d3.viec.join('|') === 'Tăng sữa 5 ml/cữ', 'dòng bé thiếu "Còn 1 việc" hoặc chữ việc: ' + JSON.stringify(d3));
    T94.soDo = (await dongBe(page, 'G01').locator('.pat-main .small').first().textContent()).trim();
    dung94(T94.soDo === '25w0d, 1850 g', 'số đo dòng bé "' + T94.soDo + '" (cần "25w0d, 1850 g")');
    T94.coChuDanhSach = await doCoChu(page);
    for (const x of T94.coChuDanhSach) loi94('cỡ chữ ngoài thang ở danh sách — ' + x);
  }
  {
    // --- bé cũ: đã khám nhưng chưa có doneAt (dữ liệu trước v9.2) hiện đúng, mở rồi đóng không ghi gì ---
    await page.evaluate(async () => {
      const db = await new Promise((res) => { const r = indexedDB.open('ghichu-sosinh'); r.onsuccess = () => res(r.result); });
      const all = await new Promise((res) => { const r = db.transaction('exam_patients').objectStore('exam_patients').getAll(); r.onsuccess = () => res(r.result); });
      const p = all.find((x) => x.code === 'G12' && x.examDate === '2026-10-21');
      const moi = { ...p, done: true }; delete moi.doneAt;
      await new Promise((res) => { const tx = db.transaction('exam_patients', 'readwrite'); tx.objectStore('exam_patients').put(moi); tx.oncomplete = res; });
      db.close();
    });
    await page.reload();
    await page.waitForSelector('.phone-app');
    await page.waitForTimeout(500);
    await page.getByRole('button', { name: 'Khám', exact: true }).click();
    await page.waitForTimeout(400);
    const truoc = JSON.stringify((await docBe(page, 'G12'))[0]);
    T94.tichBeCu = await dongBe(page, 'G12').locator('.tick-ok').getAttribute('aria-label');
    dung94(T94.tichBeCu === 'Đã khám', 'bé cũ đã khám không hiện tích "Đã khám"');
    await chamMot(page, dongBe(page, 'G12').locator('.pat-open'));
    await bangBeMo.waitFor();
    await page.waitForTimeout(600);
    T94.beCu = { trangThai: ((await bangBeMo.locator('.trang-thai').textContent()) || '').trim(), conTroOMa: await page.evaluate(() => document.activeElement?.id === 'be-ma') };
    dung94(T94.beCu.trangThai === 'Đã khámBỏ đánh dấu đã khám', 'bé cũ đã khám chưa có giờ phải ghi chỉ "Đã khám": "' + T94.beCu.trangThai + '"');
    dung94(!T94.beCu.conTroOMa, 'bé đã có mã mà tự đặt con trỏ vào ô mã (bật bàn phím)');
    await chamMot(page, bangBeMo.getByRole('button', { name: 'Đóng chi tiết', exact: true }));
    await page.waitForTimeout(700);
    T94.moKhongDoiDuLieu = JSON.stringify((await docBe(page, 'G12'))[0]) === truoc;
    dung94(T94.moKhongDoiDuLieu, 'mở rồi đóng chi tiết bé cũ làm đổi dữ liệu');
    // mở lại: "Bỏ đánh dấu đã khám" (doneAt về null), rồi đóng bằng "Xong"
    await chamMot(page, dongBe(page, 'G12').locator('.pat-open'));
    await bangBeMo.waitFor();
    await page.waitForTimeout(600);
    await chamMot(page, bangBeMo.getByRole('button', { name: 'Bỏ đánh dấu đã khám', exact: true }));
    await page.waitForTimeout(400);
    const g = (await docBe(page, 'G12'))[0];
    T94.boDanhDauBeCu = { done: g.done, doneAt: g.doneAt ?? null, trangThai: ((await bangBeMo.locator('.trang-thai').textContent()) || '').trim() };
    dung94(!g.done && (g.doneAt ?? null) === null && T94.boDanhDauBeCu.trangThai === 'Chưa khámHoàn tất khám', 'bỏ đánh dấu đã khám của bé cũ sai ' + JSON.stringify(T94.boDanhDauBeCu));
    await chamMot(page, bangBeMo.getByRole('button', { name: 'Xong', exact: true }));
    await page.waitForTimeout(700);
    dung94((await bangBeMo.count()) === 0, '"Xong" không đóng chi tiết bé');
  }
  {
    // --- "+" ở phòng đang thu gọn: phòng tự mở, thêm bé, mở chi tiết, con trỏ nằm ở ô mã, bé nằm cuối phòng ---
    const phong = (n) => page.locator('.group', { has: page.getByRole('heading', { name: new RegExp('^Phòng ' + n) }) });
    await chamMot(page, phong(2).locator('.group-btn'));
    await page.waitForTimeout(250);
    T94.phong2SauGon = await phong(2).locator('.group-btn').getAttribute('aria-expanded');
    dung94(T94.phong2SauGon === 'false', 'chạm tên phòng không thu gọn được');
    await chamMot(page, phong(2).locator('.room-add'));
    await bangBeMo.waitFor();
    await page.waitForTimeout(600);
    T94.phong2SauCong = await phong(2).locator('.group-btn').getAttribute('aria-expanded');
    dung94(T94.phong2SauCong === 'true', 'bấm "+" ở phòng đang thu gọn mà phòng không tự mở');
    T94.beMoi = await page.evaluate(() => {
      const ma = document.getElementById('be-ma'), s = document.querySelector('.sheet');
      const o3 = [...document.querySelectorAll('.be-3 input')], rects = o3.map((e) => e.getBoundingClientRect());
      return { conTro: document.activeElement === ma, ma: ma.value, maPh: ma.placeholder, nhanMa: document.querySelector('label[for=be-ma]')?.textContent, chip: document.querySelector('.be-phong')?.textContent,
        o3: o3.map((e) => ({ ph: e.placeholder, ten: e.getAttribute('aria-label') || e.closest('label')?.querySelector('span')?.textContent || '', fs: parseFloat(getComputedStyle(e).fontSize) })),
        cungHang: new Set(rects.map((r) => Math.round(r.top))).size === 1, vuaKhung: rects.every((r) => r.left >= 0 && r.right <= innerWidth), cuonNgang: s.scrollWidth > s.clientWidth,
        oHoTen: !!document.querySelector('.sheet input[name], .sheet input[placeholder*="Họ"]') };
    });
    const bm = T94.beMoi;
    dung94(bm.conTro && bm.ma === '' && bm.maPh === 'Mã / giường' && bm.nhanMa === 'Mã / giường', 'bé mới: con trỏ chưa ở ô mã / ô mã sai ' + JSON.stringify(bm));
    dung94(bm.chip === 'Phòng 2', 'chip tên phòng "' + bm.chip + '"');
    dung94(bm.o3.map((x) => x.ph).join('|') === '0810|346|1850' && bm.o3.map((x) => x.ten).join('|') === 'Ngày sinh|Tuổi thai lúc sinh|Cân nặng, g', 'ba ô sai gợi ý hoặc tên: ' + JSON.stringify(bm.o3));
    dung94(bm.o3.every((x) => x.fs === 16), 'ô nhập nhỏ hơn 16px: ' + JSON.stringify(bm.o3));
    dung94(bm.cungHang && bm.vuaKhung && !bm.cuonNgang && !bm.oHoTen, 'ba ô không cùng hàng / tràn khung / có ô họ tên: ' + JSON.stringify(bm));
    await chup(page, 'iphone-chi-tiet-be-moi', true);
    await page.keyboard.type('TMP2');
    await page.waitForTimeout(700);
    const t2 = (await docBe(page, 'TMP2'))[0];
    dung94(t2 && !t2.deleted && t2.roomId === (await docBang(page, 'rooms')).find((r) => r.name === 'Phòng 2').id && t2.done === false, 'bé mới TMP2 chưa lưu đúng phòng: ' + JSON.stringify(t2));
    await chamMot(page, bangBeMo.getByRole('button', { name: 'Đóng chi tiết', exact: true }));
    await page.waitForTimeout(700);
    T94.thuTuPhong2 = (await phong(2).locator('.pat-code').allTextContents()).join(',');
    dung94(T94.thuTuPhong2 === 'G12,TMP2', 'bé mới không nằm cuối phòng: ' + T94.thuTuPhong2);
    // "+" ở phòng đang mở: không thu gọn phòng
    await chamMot(page, phong(1).locator('.room-add'));
    await bangBeMo.waitFor();
    await page.waitForTimeout(600);
    T94.phong1SauCong = await phong(1).locator('.group-btn').getAttribute('aria-expanded');
    dung94(T94.phong1SauCong === 'true', 'bấm "+" làm thu gọn phòng đang mở');
    await page.keyboard.type('TMP1');
    await page.waitForTimeout(700);
    await chamMot(page, bangBeMo.getByRole('button', { name: 'Xong', exact: true }));
    await page.waitForTimeout(700);
    const t1 = (await docBe(page, 'TMP1'))[0];
    dung94(t1 && t1.code === 'TMP1' && (await bangBeMo.count()) === 0, '"Xong" chưa lưu nốt mã vừa gõ hoặc chưa đóng bảng');
    T94.thuTuPhong1 = (await phong(1).locator('.pat-code').allTextContents()).join(',');
    dung94(T94.thuTuPhong1 === 'G01,G03,TMP1', 'bé mới không nằm cuối phòng 1: ' + T94.thuTuPhong1);
    // xoá bé thử: hỏi xác nhận (Huỷ giữ lại, đồng ý mới xoá), câu hỏi đúng tên mã; bé chưa có mã thì hỏi "bệnh nhân này"
    await hoiXoaBe('TMP1', true);
    await hoiXoaBe('TMP2', false);
    await chamMot(page, phong(3).locator('.room-add'));
    await bangBeMo.waitFor();
    await page.waitForTimeout(600);
    page.once('dialog', async (d) => { T94.hoiXoaBeChuaMa = d.message(); await d.accept(); });
    await chamMot(page, bangBeMo.getByRole('button', { name: 'Xoá khỏi hôm nay', exact: true }));
    await page.waitForTimeout(800);
    dung94(T94.hoiXoaBeChuaMa === 'Xoá bệnh nhân này khỏi danh sách hôm nay?', 'câu hỏi xoá bé chưa có mã: "' + T94.hoiXoaBeChuaMa + '"');
    dung94((await bangBeMo.count()) === 0, 'xoá bé chưa có mã mà bảng chưa đóng');
    T94.conLai = (await page.locator('.pat-code').allTextContents()).join(',');
    dung94(T94.conLai === 'G01,G03,G12', 'sau khi xoá bé thử còn: ' + T94.conLai);
  }
  {
    // --- cử chỉ dòng bé (bảng 12, 13): chỉ vuốt phải; vuốt trái không có tác dụng; cuộn dọc không đánh dấu nhầm ---
    const cdp = await ctx.newCDPSession(page);
    const g12 = dongBe(page, 'G12');
    const rongB = (await g12.boundingBox()).width, mocB = rongB / 3;
    const nenXanh2 = await mauBien(page, '--swR2');
    const trangThai = async (ma) => { const r = (await docBe(page, ma))[0]; return { done: r.done, doneAt: r.doneAt ?? null, deleted: !!r.deleted }; };
    // vuốt trái qua mốc: không dịch, không nền, không xoá, không thanh Hoàn tác
    await keoDong(cdp, g12, -Math.round(mocB + 30));
    await page.waitForTimeout(100);
    const gt = await doDong(g12);
    T94.vuotTrai = { dich: gt.dich, nen: gt.nen, hien: gt.hien, opNen: gt.opNen, mau: gt.mau };
    dung94(gt.dich === 0 && gt.hien !== '1' && gt.opNen === 0, 'vuốt trái dòng bé vẫn dịch hoặc hiện nền ' + JSON.stringify(T94.vuotTrai));
    await thaTay(cdp);
    await page.waitForTimeout(450);
    T94.sauVuotTrai = { ...(await trangThai('G12')), thanh: await page.locator('.hoantac').count() };
    dung94(!T94.sauVuotTrai.done && !T94.sauVuotTrai.deleted && !T94.sauVuotTrai.thanh, 'vuốt trái dòng bé làm đổi dữ liệu ' + JSON.stringify(T94.sauVuotTrai));
    // vuốt phải trước mốc: trượt về, chưa khám
    await vuotDong(page, cdp, g12, Math.round(mocB - 25));
    dung94(!(await trangThai('G12')).done, 'thả vuốt phải trước mốc mà bé đã bị đánh dấu khám');
    // cuộn dọc trên dòng bé: không đánh dấu nhầm
    {
      const b = await g12.boundingBox();
      await vuotDoc(cdp, b.x + 60, b.y + b.height / 2, b.y + b.height / 2 - 140);
      await page.waitForTimeout(400);
      T94.cuonDoc = await trangThai('G12');
      dung94(!T94.cuonDoc.done, 'cuộn dọc danh sách làm bé bị đánh dấu khám nhầm');
    }
    // vuốt phải qua mốc: nền xanh đậm một nấc + rung đúng một lần; thả → đã khám (doneAt = giờ máy)
    const rung0 = await page.evaluate(() => window.__rung);
    await keoDong(cdp, g12, Math.round(mocB + 30));
    await page.waitForTimeout(100);
    const gp = await doDong(g12);
    T94.vuotPhai = { nen: gp.nen, qua: gp.qua, mau: gp.mau, dich: Math.round(gp.dich), rung: (await page.evaluate(() => window.__rung)) - rung0 };
    dung94(gp.nen === 'xong' && gp.qua === '1' && gp.mau === nenXanh2 && gp.dich > 0 && T94.vuotPhai.rung === 1, 'vuốt phải dòng bé qua mốc sai ' + JSON.stringify(T94.vuotPhai) + ' (cần nền ' + nenXanh2 + ')');
    dung94(gp.chuTrongNen === '' && gp.svgTrongNen === 0, 'nền vuốt phải của dòng bé có chữ hoặc biểu tượng');
    await chup(page, 'iphone-kham-vuot-phai', false);
    await thaTay(cdp);
    // ngay sau khi thả: một cú click (như thả ngón làm sinh click) phải bị chặn, không mở chi tiết
    await page.evaluate(() => { const nut = [...document.querySelectorAll('.swipe')].find((e) => e.querySelector('.pat-code')?.textContent === 'G12')?.querySelector('.pat-open'); nut?.click(); });
    await page.waitForTimeout(450);
    T94.moNhamSauVuot = await bangBeMo.count();
    dung94(T94.moNhamSauVuot === 0, 'ngay sau khi vuốt, cú click vẫn mở chi tiết bé');
    T94.sauVuotPhai = await trangThai('G12');
    dung94(T94.sauVuotPhai.done && T94.sauVuotPhai.doneAt === NOW.getTime(), 'vuốt phải qua mốc chưa đánh dấu đã khám đúng (doneAt) ' + JSON.stringify(T94.sauVuotPhai));
    // đã khám: tích xanh có nhãn "Đã khám", chữ nhạt (--muted), không gạch ngang, không mờ; mã và tuổi vẫn đọc rõ
    const muted = await mauBien(page, '--muted'), ink = await mauBien(page, '--ink');
    T94.daKham = await g12.evaluate((e) => {
      const code = e.querySelector('.pat-code'), sub = e.querySelector('.pat-main .small'), body = e.querySelector('.swipe-body');
      return { tich: e.querySelectorAll('.tick-ok').length, nhan: e.querySelector('.tick-ok')?.getAttribute('aria-label'), maMau: getComputedStyle(code).color, tuoiMau: getComputedStyle(sub).color, gach: getComputedStyle(code).textDecorationLine, mo: getComputedStyle(body).opacity };
    });
    T94.chuaKham = await dongBe(page, 'G03').locator('.pat-code').evaluate((e) => getComputedStyle(e).color);
    dung94(T94.daKham.tich === 1 && T94.daKham.nhan === 'Đã khám' && T94.daKham.maMau === muted && T94.daKham.gach === 'none' && T94.daKham.mo === '1', 'bé đã khám hiển thị sai ' + JSON.stringify(T94.daKham) + ' (cần chữ ' + muted + ')');
    dung94(T94.chuaKham === ink, 'bé chưa khám không dùng chữ đậm: ' + T94.chuaKham);
    T94.tuongPhanSang = await doTuongPhanBe(g12);
    dung94(T94.tuongPhanSang >= 4.5, 'chữ bé đã khám (sáng) tương phản ' + T94.tuongPhanSang.toFixed(2) + ' < 4,5');
    // đã khám: vuốt phải chỉ nhúc nhích rồi về, không đổi
    await keoDong(cdp, g12, Math.round(mocB + 60));
    const gn = await doDong(g12);
    await thaTay(cdp);
    await page.waitForTimeout(500);
    T94.nhucNhich = { dich: gn.dich, hien: gn.hien, sau: await trangThai('G12') };
    dung94(gn.dich > 0 && gn.dich <= 16.5 && gn.hien !== '1' && T94.nhucNhich.sau.done && T94.nhucNhich.sau.doneAt === NOW.getTime(), 'bé đã khám vuốt phải phải chỉ nhúc nhích ' + JSON.stringify(T94.nhucNhich));
    // G01 (còn việc): đã khám nhưng vẫn "Còn 1 việc"; tích đứng sau
    await vuotDong(page, cdp, dongBe(page, 'G01'), Math.round(mocB + 30));
    T94.g01 = { ...(await trangThai('G01')), badge: ((await dongBe(page, 'G01').locator('.left-badge').textContent().catch(() => '')) || '').trim(), tich: await dongBe(page, 'G01').locator('.tick-ok').count(),
      tichSauBadge: await dongBe(page, 'G01').evaluate((e) => { const b = e.querySelector('.left-badge')?.getBoundingClientRect(), t = e.querySelector('.tick-ok')?.getBoundingClientRect(); return !!b && !!t && t.left >= b.right - 0.5; }) };
    dung94(T94.g01.done && T94.g01.badge === 'Còn 1 việc' && T94.g01.tich === 1 && T94.g01.tichSauBadge, 'bé đã khám còn việc phải giữ "Còn 1 việc" và tích đứng sau ' + JSON.stringify(T94.g01));
    T94.tienDo = ((await page.locator('.ph-tiendo').textContent()) || '').trim();
    dung94(T94.tienDo === 'Đã khám 2/3', 'chữ tiến độ "' + T94.tienDo + '" (cần "Đã khám 2/3")');
    T94.dauPhong = await page.locator('.group-btn .small').allTextContents();
    dung94(T94.dauPhong.join('|') === 'Đã khám 1/2|Đã khám 1/1|Chưa có bệnh nhân', 'đếm đã khám theo phòng: ' + T94.dauPhong.join('|'));
    await chup(page, 'iphone-kham-da-kham', true);
    await cdp.detach();
  }
  {
    // --- chạm 1 lần mở chi tiết bé (đã khám); bảng 16b: ba ô cùng hàng, "Tính tuần tuổi" bên trái, kết quả bên phải ---
    await demChamSauVuot(page); // đệm cú chạm bị nuốt NGAY sau lần vuốt CDP (cho phép duy nhất)
    await chamMot(page, dongBe(page, 'G01').locator('.pat-open'));
    await bangBeMo.waitFor();
    await page.waitForTimeout(600);
    T94.g01Moi = await page.evaluate(() => ({ conTro: document.activeElement?.id === 'be-ma', ma: document.getElementById('be-ma').value, chip: document.querySelector('.be-phong')?.textContent, nutDong: document.querySelector('.be-head .icon-btn')?.getAttribute('aria-label') }));
    dung94(!T94.g01Moi.conTro && T94.g01Moi.ma === 'G01' && T94.g01Moi.chip === 'Phòng 1' && T94.g01Moi.nutDong === 'Đóng chi tiết', 'chi tiết bé G01 sai tiêu đề/con trỏ ' + JSON.stringify(T94.g01Moi));
    T94.trangThaiG01 = ((await bangBeMo.locator('.trang-thai').textContent()) || '').trim();
    dung94(T94.trangThaiG01 === 'Đã khám lúc 08:00Bỏ đánh dấu đã khám', 'dòng trạng thái bé đã khám: "' + T94.trangThaiG01 + '"');
    await chup(page, 'iphone-chi-tiet-be-da-kham', true);
    const nutTrangThai = (ten) => bangBeMo.getByRole('button', { name: ten, exact: true });
    await chamMot(page, nutTrangThai('Bỏ đánh dấu đã khám'));
    await page.waitForTimeout(400);
    let gg = (await docBe(page, 'G01'))[0];
    T94.boDaKham = { done: gg.done, doneAt: gg.doneAt ?? null, chu: ((await bangBeMo.locator('.trang-thai').textContent()) || '').trim() };
    dung94(!gg.done && T94.boDaKham.doneAt === null && T94.boDaKham.chu === 'Chưa khámHoàn tất khám', '"Bỏ đánh dấu đã khám" sai ' + JSON.stringify(T94.boDaKham));
    await chamMot(page, nutTrangThai('Hoàn tất khám'));
    await page.waitForTimeout(400);
    gg = (await docBe(page, 'G01'))[0];
    dung94(gg.done && gg.doneAt === NOW.getTime(), '"Hoàn tất khám" chưa ghi đã khám + doneAt ' + JSON.stringify({ done: gg.done, doneAt: gg.doneAt }));
    await chamMot(page, nutTrangThai('Bỏ đánh dấu đã khám'));
    await page.waitForTimeout(400);
    dung94(!(await docBe(page, 'G01'))[0].done, 'bỏ đánh dấu lần 2 chưa về chưa khám');
    // tính tuổi: chỉ tính khi bấm; kết quả bên phải nút; sửa ngày sinh / tuổi thai thì xoá kết quả cũ
    const ketQuaTuoi = () => bangBeMo.locator('.be-kq');
    const oNgaySinh = bangBeMo.getByLabel('Ngày sinh', { exact: true }), oTuoiThai = bangBeMo.getByLabel('Tuổi thai lúc sinh', { exact: true });
    T94.truocKhiTinh = { trong: await bangBeMo.locator('.be-kq-trong').count(), so: await bangBeMo.locator('.be-kq b').count() };
    dung94(T94.truocKhiTinh.trong === 1 && T94.truocKhiTinh.so === 0, 'chưa bấm mà đã có kết quả tuổi (chỉ tính khi bấm) ' + JSON.stringify(T94.truocKhiTinh));
    await chamMot(page, bangBeMo.getByRole('button', { name: 'Tính tuần tuổi', exact: true }));
    await page.waitForTimeout(300);
    const calc = ((await ketQuaTuoi().textContent()) || '').trim();
    ketQua.thuChucNang.tinhTuanTuoi = calc;
    if (!/Ngày tuổi\s*77 ngày/.test(calc) || !/Hiệu chỉnh\s*36w0d/.test(calc)) ketQua.loi.push('Tính tuần tuổi G01 (05/08, 25 tuần) không ra 77 ngày, 36w0d: ' + calc);
    if (/40\s*w/.test(calc)) ketQua.loi.push('Màn hình tính tuổi có hiện "đến 40w"');
    const hinhTuoi = () => page.evaluate(() => {
      const nut = [...document.querySelectorAll('.be-tuoi .btn')][0].getBoundingClientRect(), kq = document.querySelector('.be-kq').getBoundingClientRect(), s = document.querySelector('.sheet');
      const cat = [...document.querySelectorAll('.be-kq b')].filter((b) => b.scrollWidth > b.clientWidth + 0.5 || b.getBoundingClientRect().right > kq.right + 0.5 || b.getBoundingClientRect().left < kq.left - 0.5).map((b) => b.textContent);
      return { nutTrai: nut.right <= kq.left + 0.5, cungHang: nut.top < kq.bottom && kq.top < nut.bottom, cat, tran: s.scrollWidth > s.clientWidth, kqRong: Math.round(kq.width) };
    });
    T94.hinhTuoi = await hinhTuoi();
    dung94(T94.hinhTuoi.nutTrai && T94.hinhTuoi.cungHang && !T94.hinhTuoi.cat.length && !T94.hinhTuoi.tran, 'ô tuổi: nút phải bên trái ô kết quả, không bị cắt/tràn ' + JSON.stringify(T94.hinhTuoi));
    await oTuoiThai.fill('27');
    T94.xoaKhiDoiTuoiThai = await bangBeMo.locator('.be-kq b').count();
    dung94(T94.xoaKhiDoiTuoiThai === 0, 'sửa tuổi thai mà kết quả tuổi cũ chưa bị xoá');
    await oTuoiThai.fill('25');
    await oNgaySinh.fill('2006'); // 20/06 → đúng 123 ngày so với 21/10/2026
    await chamMot(page, bangBeMo.getByRole('button', { name: 'Tính tuần tuổi', exact: true }));
    await page.waitForTimeout(300);
    T94.tuoi123 = ((await ketQuaTuoi().textContent()) || '').trim();
    dung94(/123 ngày/.test(T94.tuoi123) && /42w4d/.test(T94.tuoi123), 'ca tuổi 123 ngày sai: ' + T94.tuoi123);
    T94.hinh123 = await hinhTuoi();
    dung94(!T94.hinh123.cat.length && !T94.hinh123.tran, '"123 ngày" bị cắt hoặc tràn ' + JSON.stringify(T94.hinh123));
    // lỗi vẫn hiện đủ chữ (ô kết quả nhường chỗ cho hộp lỗi)
    const hopLoi = () => bangBeMo.locator('.err-box');
    const doLoi = async () => hopLoi().evaluate((e) => ({ chu: e.textContent.trim(), cat: e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1, vuaKhung: e.getBoundingClientRect().right <= innerWidth, kq: document.querySelectorAll('.be-kq b').length }));
    await oTuoiThai.fill('19');
    await chamMot(page, bangBeMo.getByRole('button', { name: 'Tính tuần tuổi', exact: true }));
    await page.waitForTimeout(300);
    T94.loiTuoiThai = await doLoi();
    dung94(T94.loiTuoiThai.chu === 'Chưa đọc được tuổi thai "19". Nhập ví dụ 346, 34w6d hoặc 34+6 (từ 20 đến 45 tuần).' && !T94.loiTuoiThai.cat && T94.loiTuoiThai.vuaKhung && T94.loiTuoiThai.kq === 0, 'lỗi tuổi thai ngoài 20–45 tuần hiện sai/cắt ' + JSON.stringify(T94.loiTuoiThai));
    await oTuoiThai.fill('25');
    await oNgaySinh.fill('abc');
    await chamMot(page, bangBeMo.getByRole('button', { name: 'Tính tuần tuổi', exact: true }));
    await page.waitForTimeout(300);
    T94.loiNgaySinh = await doLoi();
    dung94(T94.loiNgaySinh.chu === 'Ngày sinh nhập dạng ngày + tháng, ví dụ 0810 hoặc 08/10.' && !T94.loiNgaySinh.cat && T94.loiNgaySinh.vuaKhung, 'lỗi ngày sinh hiện sai/cắt ' + JSON.stringify(T94.loiNgaySinh));
    await chup(page, 'iphone-chi-tiet-be-loi', true);
    await oNgaySinh.fill('0508');
    await page.waitForTimeout(700);
    const sauSua = (await docBe(page, 'G01'))[0];
    T94.duLieuG01 = { dob: sauSua.dob, ga: sauSua.ga, wt: sauSua.wt };
    dung94(sauSua.dob === '0508' && sauSua.ga === '25' && sauSua.wt === '1850', 'khôi phục ngày sinh/tuổi thai G01 không về như cũ ' + JSON.stringify(T94.duLieuG01));
    await chamMot(page, bangBeMo.getByRole('button', { name: 'Tính tuần tuổi', exact: true }));
    await page.waitForTimeout(300);
    T94.coChuChiTiet = await doCoChu(page);
    for (const x of T94.coChuChiTiet) loi94('cỡ chữ ngoài thang ở chi tiết bé — ' + x);
    await chup(page, 'iphone-chi-tiet-be', true);
  }
  {
    // --- Việc cần làm của bé (16b): tiêu đề + "Còn x/y"; ô thêm tròn + "+" 44px; thay chữ tắt khi bấm + hoặc Enter; con trỏ ở lại ---
    const cdp = await ctx.newCDPSession(page);
    T94.tieuDeViec = ((await bangBeMo.locator('.be-viec-h').textContent()) || '').trim();
    dung94(/^Việc cần làm\s*Còn 1\/1$/.test(T94.tieuDeViec), 'tiêu đề việc cần làm "' + T94.tieuDeViec + '"');
    T94.nutThemViec = await bangBeMo.getByRole('button', { name: 'Thêm việc của bé', exact: true }).evaluate((e) => { const r = e.getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height), tron: getComputedStyle(e).borderTopLeftRadius }; });
    dung94(T94.nutThemViec.w === 44 && T94.nutThemViec.h === 44 && T94.nutThemViec.tron === '22px', 'nút "+" thêm việc của bé sai ' + JSON.stringify(T94.nutThemViec));
    const oViec = bangBeMo.getByPlaceholder('Thêm việc cần làm…');
    const todoDb = async (ten) => (await docBang(page, 'patient_todos')).filter((t) => t.text === ten && !t.deleted);
    await chamMot(page, oViec);
    await page.keyboard.type('/km');
    T94.gioiYBe = { chip: await bangBeMo.locator('.vt-sug .vt-chip').count(), ngoaiLabel: await bangBeMo.locator('.vt-strip').first().evaluate((e) => !e.closest('label')) };
    dung94(T94.gioiYBe.chip >= 2 && T94.gioiYBe.ngoaiLabel, 'gợi ý viết tắt ở ô thêm việc của bé sai ' + JSON.stringify(T94.gioiYBe));
    await oViec.fill('');
    await page.keyboard.type('Làm /ctm');
    await chamMot(page, bangBeMo.getByRole('button', { name: 'Thêm việc của bé', exact: true }));
    await page.waitForTimeout(400);
    T94.themBangCong = { co: (await todoDb('Làm Công thức máu')).length, o: await oViec.inputValue(), conTro: await page.evaluate(() => document.activeElement?.placeholder), thanh: await bangBeMo.locator('.vt-toast').count() };
    dung94(T94.themBangCong.co === 1 && T94.themBangCong.o === '' && T94.themBangCong.conTro === 'Thêm việc cần làm…' && !T94.themBangCong.thanh, 'bấm "+" ở ô việc của bé: chữ tắt/con trỏ sai ' + JSON.stringify(T94.themBangCong));
    await page.keyboard.type('/kmdm');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    dung94((await todoDb('Khí máu động mạch')).length === 1, 'Enter ở ô việc của bé chưa thay /kmdm thành "Khí máu động mạch"');
    await page.keyboard.type('Chia 8/10');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    dung94((await todoDb('Chia 8/10')).length === 1, '"Chia 8/10" bị đổi khi lưu');
    T94.tieuDeViec2 = ((await bangBeMo.locator('.be-viec-h').textContent()) || '').trim();
    dung94(/Còn 4\/4$/.test(T94.tieuDeViec2), 'đếm "Còn x/y" không cập nhật: ' + T94.tieuDeViec2);
    const moc = (await bangBeMo.locator('.swipe', { hasText: 'Chia 8/10' }).boundingBox()).width / 3;
    for (const ten of ['Làm Công thức máu', 'Khí máu động mạch', 'Chia 8/10']) await vuotDong(page, cdp, bangBeMo.locator('.swipe', { hasText: ten }), -Math.round(moc + 30));
    await choHoanTacTat(page);
    dung94(!(await todoDb('Làm Công thức máu')).length && !(await todoDb('Chia 8/10')).length, 'dọn việc thử của bé không xong');
    await demChamSauVuot(page, true); // đệm cú chạm bị nuốt NGAY sau lần vuốt CDP (cho phép duy nhất)
    await cdp.detach();
  }
  {
    // v9.2: việc cần làm của bé — vuốt phải xong, vuốt trái xoá + Hoàn tác, chạm 2 lần mở bảng nhỏ chồng lên chi tiết bé
    // (thay phép kiểm kiểu C cũ: "vuốt trái → thẻ đứng yên, nút Xoá ở cuối dòng, không còn dấu ×")
    const cdp = await ctx.newCDPSession(page);
    const T = ketQua.thuChucNang.viecCuaBe = {};
    const them = async (ten) => { await page.getByPlaceholder('Thêm việc cần làm…').fill(ten); await chamMot(page, page.getByRole('button', { name: 'Thêm việc của bé', exact: true })); await page.waitForTimeout(350); };
    await them('Việc thử của bé 1');
    await them('Việc thử của bé 2');
    const hang = (ten) => page.locator('.sheet .swipe', { hasText: ten });
    const todoDb = async (ten) => (await docBang(page, 'patient_todos')).filter((t) => t.text === ten);
    const rongB = (await hang('Việc thử của bé 1').boundingBox()).width;
    const mocB = rongB / 3;
    const nenXanhB = await mauBien(page, '--swR2'), nenDoB = await mauBien(page, '--swL2');
    T.chuNoDau = await page.locator('.sheet .todo-row .icon-btn, .sheet .todo-row .chk').count();
    if (T.chuNoDau) ketQua.loi.push('Việc của bé còn nút × hoặc ô vuông đầu dòng');
    // vuốt phải qua mốc → xong
    await vuotDong(page, cdp, hang('Việc thử của bé 1'), Math.round(mocB + 30));
    let d = (await todoDb('Việc thử của bé 1'))[0];
    T.bePhaiXong = { done: d.done, doneAt: d.doneAt, tich: await hang('Việc thử của bé 1').locator('.tick-ok').count() };
    if (!d.done || d.doneAt !== NOW.getTime() || T.bePhaiXong.tich !== 1) ketQua.loi.push('Việc của bé: vuốt phải qua mốc chưa đánh dấu xong đúng ' + JSON.stringify(T.bePhaiXong));
    // vuốt phải trên việc đã xong: chỉ nhúc nhích
    await keoDong(cdp, hang('Việc thử của bé 1'), Math.round(mocB + 60));
    const gB = await doDong(hang('Việc thử của bé 1'));
    await thaTay(cdp);
    await page.waitForTimeout(500);
    d = (await todoDb('Việc thử của bé 1'))[0];
    if (!(gB.dich > 0 && gB.dich <= 16.5) || gB.hien === '1' || !d.done) ketQua.loi.push('Việc của bé đã xong: vuốt phải phải chỉ nhúc nhích ' + JSON.stringify({ dich: gB.dich, hien: gB.hien, done: d.done }));
    // vuốt trái trước mốc → về; qua mốc → xoá + Hoàn tác
    await vuotDong(page, cdp, hang('Việc thử của bé 2'), -Math.round(mocB - 25));
    d = (await todoDb('Việc thử của bé 2'))[0];
    if (d.deleted) ketQua.loi.push('Việc của bé: thả vuốt trái trước mốc mà bị xoá');
    await keoDong(cdp, hang('Việc thử của bé 2'), -Math.round(mocB + 30));
    await page.waitForTimeout(100);
    const gx = await doDong(hang('Việc thử của bé 2'));
    if (gx.nen !== 'xoa' || gx.qua !== '1' || gx.mau !== nenDoB) ketQua.loi.push('Việc của bé: kéo trái qua mốc, nền sai ' + JSON.stringify(gx));
    await chup(page, 'iphone-chi-tiet-be-xoa', false); // ảnh đang kéo
    await thaTay(cdp);
    await page.waitForTimeout(700);
    d = (await todoDb('Việc thử của bé 2'))[0];
    T.beTraiXoa = { deleted: d.deleted, thanh: ((await page.locator('.hoantac').textContent().catch(() => '')) || '').trim() };
    if (!d.deleted || !/^Đã xoá: Việc thử của bé 2.*Hoàn tác$/.test(T.beTraiXoa.thanh)) ketQua.loi.push('Việc của bé: vuốt trái qua mốc chưa xoá/hiện Hoàn tác ' + JSON.stringify(T.beTraiXoa));
    await page.locator('.hoantac').getByRole('button', { name: 'Hoàn tác', exact: true }).click();
    await page.waitForTimeout(500);
    d = (await todoDb('Việc thử của bé 2'))[0];
    if (d.deleted || (await hang('Việc thử của bé 2').count()) !== 1) ketQua.loi.push('Việc của bé: Hoàn tác không trả lại việc');
    // chạm 2 lần → bảng nhỏ chồng lên chi tiết bé (bảng chi tiết bé phải còn mở)
    const hangXong = hang('Việc thử của bé 1');
    await hangXong.scrollIntoViewIfNeeded();
    let cc = await tamDiem(hangXong.locator('.todo-main'));
    await page.touchscreen.tap(cc.x, cc.y);
    await page.waitForTimeout(150);
    T.bang1Lan = await page.getByRole('dialog', { name: 'Chi tiết việc của bé' }).count();
    await page.touchscreen.tap(cc.x, cc.y);
    const bangBe = page.getByRole('dialog', { name: 'Chi tiết việc của bé' });
    await bangBe.waitFor();
    await page.waitForTimeout(500);
    if (T.bang1Lan !== 0) ketQua.loi.push('Việc của bé: chạm 1 lần đã mở bảng chi tiết');
    T.bangChong = { cha: await page.getByRole('dialog', { name: 'Chi tiết bệnh nhân' }).count(), con: await bangBe.count() };
    if (T.bangChong.cha !== 1 || T.bangChong.con !== 1) ketQua.loi.push('Bảng chồng bảng: cha=' + T.bangChong.cha + ' con=' + T.bangChong.con);
    T.bangConTrenCung = await page.evaluate(() => {
      const con = document.querySelector('[role=dialog][aria-label="Chi tiết việc của bé"]');
      const r = con.getBoundingClientRect();
      const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return !!e?.closest('[aria-label="Chi tiết việc của bé"]');
    });
    if (!T.bangConTrenCung) ketQua.loi.push('Bảng chi tiết việc của bé bị bảng chi tiết bé che (không nằm trên cùng)');
    T.trangThaiBe = ((await bangBe.locator('.trang-thai').textContent()) || '').trim();
    if (T.trangThaiBe !== 'Đã xong lúc 08:00Bỏ đánh dấu xong') ketQua.loi.push('Chi tiết việc của bé đã xong: dòng trạng thái "' + T.trangThaiBe + '"');
    await chup(page, 'iphone-chi-tiet-viec-be', true);
    // sửa tên (có viết tắt) và lưu
    const oTenBe = bangBe.getByRole('textbox', { name: 'Nội dung việc của bé' });
    await oTenBe.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' /kmdm ');
    T.tenBeVietTat = await oTenBe.inputValue();
    if (T.tenBeVietTat !== 'Việc thử của bé 1 Khí máu động mạch ') ketQua.loi.push('Chi tiết việc của bé: ô tên không có viết tắt ("' + T.tenBeVietTat + '")');
    await page.waitForTimeout(700);
    if (!(await todoDb('Việc thử của bé 1 Khí máu động mạch')).length) ketQua.loi.push('Chi tiết việc của bé: đổi tên chưa lưu');
    await oTenBe.fill('Việc thử của bé 1');
    await page.waitForTimeout(700);
    // bỏ đánh dấu xong rồi hoàn thành lại (doneAt về null rồi ghi giờ)
    await bangBe.getByRole('button', { name: 'Bỏ đánh dấu xong', exact: true }).click();
    await page.waitForTimeout(300);
    d = (await todoDb('Việc thử của bé 1'))[0];
    if (d.done || d.doneAt !== null) ketQua.loi.push('Việc của bé: "Bỏ đánh dấu xong" chưa về doneAt null ' + JSON.stringify({ done: d.done, doneAt: d.doneAt }));
    await bangBe.getByRole('button', { name: 'Hoàn thành', exact: true }).click();
    await page.waitForTimeout(300);
    d = (await todoDb('Việc thử của bé 1'))[0];
    if (!d.done || d.doneAt !== NOW.getTime()) ketQua.loi.push('Việc của bé: "Hoàn thành" chưa ghi doneAt ' + JSON.stringify({ done: d.done, doneAt: d.doneAt }));
    // Esc chỉ đóng bảng trên cùng (bảng nhỏ), bảng chi tiết bé còn
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
    T.sauEsc = { con: await bangBe.count(), cha: await page.getByRole('dialog', { name: 'Chi tiết bệnh nhân' }).count() };
    if (T.sauEsc.con !== 0 || T.sauEsc.cha !== 1) ketQua.loi.push('Esc khi hai bảng chồng nhau phải chỉ đóng bảng trên cùng ' + JSON.stringify(T.sauEsc));
    // "Xoá việc" trong bảng nhỏ: trượt xuống rồi xoá, thanh Hoàn tác nổi trên bảng chi tiết bé
    cc = await tamDiem(hang('Việc thử của bé 2').locator('.todo-main'));
    await page.touchscreen.tap(cc.x, cc.y);
    await page.touchscreen.tap(cc.x, cc.y);
    await bangBe.waitFor();
    await page.waitForTimeout(500);
    await bangBe.getByRole('button', { name: 'Xoá việc', exact: true }).click();
    await page.waitForTimeout(800);
    d = (await todoDb('Việc thử của bé 2'))[0];
    T.xoaTuBangBe = { deleted: d.deleted, bangCon: await bangBe.count(), cha: await page.getByRole('dialog', { name: 'Chi tiết bệnh nhân' }).count(), thanh: ((await page.locator('.hoantac').textContent().catch(() => '')) || '').trim() };
    if (!d.deleted || T.xoaTuBangBe.bangCon !== 0 || T.xoaTuBangBe.cha !== 1 || !/^Đã xoá: Việc thử của bé 2.*Hoàn tác$/.test(T.xoaTuBangBe.thanh)) ketQua.loi.push('"Xoá việc" của bé trong bảng nhỏ chưa đúng ' + JSON.stringify(T.xoaTuBangBe));
    T.thanhNoiTrenBangBe = await page.evaluate(() => { const r = document.querySelector('.hoantac').getBoundingClientRect(); return !!document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.closest('.hoantac'); });
    if (!T.thanhNoiTrenBangBe) ketQua.loi.push('Thanh Hoàn tác bị bảng chi tiết bé che');
    await page.locator('.hoantac').getByRole('button', { name: 'Hoàn tác', exact: true }).click();
    await page.waitForTimeout(500);
    if ((await todoDb('Việc thử của bé 2'))[0].deleted) ketQua.loi.push('Hoàn tác "Xoá việc" của bé không trả lại việc');
    // dọn hai việc thử (vuốt trái) để các bước sau như cũ
    await vuotDong(page, cdp, hang('Việc thử của bé 1'), -Math.round(mocB + 30));
    await vuotDong(page, cdp, hang('Việc thử của bé 2'), -Math.round(mocB + 30));
    await choHoanTacTat(page);
    {
      // v9.4: thanh Hoàn tác trong chi tiết bé — ghi rõ nó còn che những nút nào; không che ô đang gõ thêm việc của bé
      await demChamSauVuot(page, true); // đệm cú chạm bị nuốt NGAY sau lần vuốt CDP (cho phép duy nhất)
      await them('Việc thử của bé 3');
      const oViecBe = page.getByPlaceholder('Thêm việc cần làm…');
      await chamMot(page, oViecBe);
      await vuotDong(page, cdp, hang('Việc thử của bé 3'), -Math.round(mocB + 30));
      T.thanhVaOGo = await page.evaluate(() => {
        const h = document.querySelector('.hoantac');
        if (!h) return null;
        const a = h.getBoundingClientRect(), o = document.activeElement, ob = o && o.matches?.('input,textarea') ? o.getBoundingClientRect() : null;
        const che = [...document.querySelectorAll('.sheet-be button, .sheet-be input, .sheet-be textarea')].filter((e) => {
          const r = e.getBoundingClientRect();
          return r.width > 0 && r.bottom > a.top && r.top < a.bottom && r.right > a.left && r.left < a.right;
        }).map((e) => (e.getAttribute('aria-label') || e.textContent || e.placeholder || e.id).trim().slice(0, 30));
        return { thanh: [Math.round(a.top), Math.round(a.bottom)], oDangGo: ob ? [Math.round(ob.top), Math.round(ob.bottom)] : null, oDangGoTen: o?.placeholder || o?.id || o?.tagName, cheOGo: !!ob && ob.bottom > a.top && ob.top < a.bottom, cheNhung: che };
      });
      if (!T.thanhVaOGo) ketQua.loi.push('Chi tiết bé: không thấy thanh Hoàn tác sau khi vuốt xoá việc thử 3');
      else if (T.thanhVaOGo.cheOGo) ketQua.loi.push('Chi tiết bé: thanh Hoàn tác che ô đang gõ thêm việc của bé ' + JSON.stringify(T.thanhVaOGo));
      if (T.thanhVaOGo && !T.thanhVaOGo.oDangGo) ketQua.luuY.push('Chi tiết bé: ô thêm việc mất con trỏ sau khi vuốt (chạm thật có thể khác); chưa kiểm được "không che ô đang gõ" với bàn phím thật');
      await choHoanTacTat(page);
    }
    await cdp.detach();
  }
  {
    const T = ketQua.thuChucNang.vietTatKham = {};
    const gc = page.locator('#ghichu-be');
    await gc.click();
    await page.keyboard.press('End');
    await page.keyboard.type(' Làm /ctm ');
    T.ghiChuBe = await gc.inputValue();
    if (!/Làm Công thức máu $/.test(T.ghiChuBe)) ketQua.loi.push('Viết tắt: ô Ghi chú của bé ra "' + T.ghiChuBe + '"');
    {
      // v9.3: trong bảng chi tiết bé, thanh tối `Đã đổi …` nằm trong dòng chảy ngay trên ô, không che ô đang gõ và không làm vỡ bảng
      const r = await page.evaluate(() => {
        const t = document.querySelector('.sheet .vt-toast'), ta = document.getElementById('ghichu-be'), sh = document.querySelector('.sheet');
        if (!t) return null;
        const a = t.getBoundingClientRect(), b = ta.getBoundingClientRect(), s = sh.getBoundingClientRect();
        return { toast: [Math.round(a.top), Math.round(a.bottom)], o: [Math.round(b.top), Math.round(b.bottom)], bang: [Math.round(s.top), Math.round(s.bottom)], cuonNgang: sh.scrollWidth > sh.clientWidth, chu: t.textContent.trim() };
      });
      T.thanhTrongChiTietBe = r;
      if (!r) ketQua.loi.push('Chi tiết bé: không thấy thanh "Đã đổi" sau khi gõ /ctm');
      else {
        if (r.toast[1] > r.o[0] + 1) ketQua.loi.push('Chi tiết bé: thanh "Đã đổi" đè lên ô Ghi chú ' + JSON.stringify(r));
        if (r.cuonNgang) ketQua.loi.push('Chi tiết bé: thanh gợi ý làm bảng cuộn ngang');
        await chup(page, 'iphone-chi-tiet-be-da-doi', true);
      }
    }
    await page.waitForTimeout(700); // tự lưu 0,4 giây
    const luu = await page.evaluate(async () => {
      const db = await new Promise((res) => { const r = indexedDB.open('ghichu-sosinh'); r.onsuccess = () => res(r.result); });
      const all = await new Promise((res) => { const r = db.transaction('exam_patients').objectStore('exam_patients').getAll(); r.onsuccess = () => res(r.result); });
      db.close();
      return all.filter((p) => p.code === 'G01' && p.examDate === '2026-10-21').map((p) => p.note);
    });
    T.daLuuGhiChuBe = luu.join(' | ');
    if (!luu.some((n) => /Công thức máu/.test(n))) ketQua.loi.push('Viết tắt: ghi chú của bé đã thay chữ nhưng chưa tự lưu');
    const td = page.getByPlaceholder('Thêm việc cần làm…');
    await td.click();
    await page.keyboard.type('Đo /bil ');
    T.viecCuaBe = await td.inputValue();
    if (T.viecCuaBe !== 'Đo Bilirubin toàn phần, trực tiếp ') ketQua.loi.push('Viết tắt: ô thêm việc của bé ra "' + T.viecCuaBe + '"');
    await td.fill('');
  }
  await page.getByRole('button', { name: 'Đóng chi tiết', exact: true }).click(); await page.waitForTimeout(600); // chờ bảng trượt xuống xong

  await page.getByRole('button', { name: 'Tổng hợp y lệnh', exact: true }).click(); // v9.4: nút đổi tên từ "Tổng hợp"
  const tongHop = await page.locator('textarea.mono').inputValue();
  ketQua.thuChucNang.tongHop = tongHop.split('\n').slice(0, 6).join(' | ');
  if (!/Tiếp tục y lệnh cũ/.test(tongHop)) ketQua.loi.push('Tổng hợp y lệnh thiếu "Tiếp tục y lệnh cũ" cho bé không có việc mới');
  await chup(page, 'iphone-tong-hop', true);
  {
    const ta = page.locator('textarea.mono');
    await ta.click();
    await page.keyboard.press('Control+End');
    await page.keyboard.type('\nThêm /dgd ');
    const t2 = await ta.inputValue();
    ketQua.thuChucNang.vietTatTongHop = t2.split('\n').slice(-1)[0];
    if (!/Thêm Điện giải đồ $/.test(t2)) ketQua.loi.push('Viết tắt: khung Tổng hợp ra "' + ketQua.thuChucNang.vietTatTongHop + '"');
    // v9.4: nút "Soạn lại" (đổi tên từ "Soạn lại từ danh sách") dựng lại văn bản từ danh sách, không đổi nội dung tổng hợp
    const nutSoan = page.getByRole('dialog', { name: 'Tổng hợp y lệnh' }).getByRole('button', { name: 'Soạn lại', exact: true });
    ketQua.thuChucNang.soanLai = { cu: await page.getByRole('button', { name: 'Soạn lại từ danh sách' }).count(), moi: await nutSoan.count() };
    if (ketQua.thuChucNang.soanLai.cu || ketQua.thuChucNang.soanLai.moi !== 1) ketQua.loi.push('Tổng hợp y lệnh: nút phải tên "Soạn lại" ' + JSON.stringify(ketQua.thuChucNang.soanLai));
    await chamMot(page, nutSoan);
    await page.waitForTimeout(200);
    if ((await ta.inputValue()) !== tongHop) ketQua.loi.push('Tổng hợp y lệnh: "Soạn lại" không dựng lại đúng văn bản từ danh sách');
  }
  await page.getByRole('button', { name: 'Đóng tổng hợp', exact: true }).click(); await page.waitForTimeout(600); // chờ bảng trượt xuống xong

  // --- v9.1: bảng "Sao lưu và cài đặt" sáng và tối; chế độ Sáng / Tối / Theo máy ---
  {
    const T = ketQua.thuChucNang.caiDat = {};
    const hop = await moCaiDat(page);
    T.nhanBang = await hop.getByRole('heading', { level: 2 }).textContent();
    if (T.nhanBang !== 'Sao lưu và cài đặt') ketQua.loi.push('Bảng cài đặt: tiêu đề "' + T.nhanBang + '"');
    T.nutGiaoDien = await hop.locator('.seg button').allTextContents();
    if (T.nutGiaoDien.join('|') !== 'Sáng|Tối|Theo máy') ketQua.loi.push('Bảng cài đặt: nút giao diện ' + T.nutGiaoDien.join('|'));
    // v9.2: mục Cử chỉ 4 dòng đúng chữ bảng 15f (ApCaiDat.dc.html dòng 49–56); KHÔNG có mục Ngày làm việc (thuộc 9.6)
    T.cuChi = await hop.locator('.cu-chi').evaluate((e) => [...e.children].map((x) => x.textContent.trim()));
    const cuChiCan = ['Vuốt phải', 'Đánh dấu xong', 'Vuốt trái', 'Xoá, có hoàn tác', 'Chạm 2 lần', 'Chi tiết việc: sửa, nhãn, ghi chú, bỏ đánh dấu', 'Gõ /', 'Viết tắt, ví dụ /kmdm rồi dấu cách'];
    if (T.cuChi.join('|') !== cuChiCan.join('|')) ketQua.loi.push('Bảng cài đặt: mục Cử chỉ không đúng bảng 15f: ' + T.cuChi.join('|'));
    if ((await hop.getByRole('heading', { name: 'Cử chỉ', exact: true }).count()) !== 1) ketQua.loi.push('Bảng cài đặt thiếu tiêu đề "Cử chỉ"');
    if (!(await hop.getByText('Dòng nhắc cử chỉ chỉ hiện 3 lần mở đầu và khi danh sách trống.', { exact: true }).count())) ketQua.loi.push('Bảng cài đặt thiếu dòng chú thích dưới mục Cử chỉ');
    // v9.6: mục "Ngày làm việc" (bảng 15f) nằm giữa Giao diện và Cử chỉ; chi tiết được thử riêng ở phần v9.6 phía dưới
    if ((await hop.getByRole('heading', { name: 'Ngày làm việc', exact: true }).count()) !== 1) ketQua.loi.push('Bảng cài đặt thiếu mục "Ngày làm việc" (v9.6)');
    T.thanhKeo = await hop.locator('.sheet-grip').count();
    if (T.thanhKeo !== 1) ketQua.loi.push('Bảng dưới thiếu thanh kéo ở đỉnh');
    T.macDinhTheoMay = await hop.getByRole('button', { name: 'Theo máy', exact: true }).getAttribute('aria-pressed');
    if (T.macDinhTheoMay !== 'true') ketQua.loi.push('Chưa chọn gì mà Theo máy không được bật');
    await hop.getByRole('button', { name: 'Sáng', exact: true }).click();
    await chup(page, 'iphone-cai-dat-sang', true);
    await hop.evaluate((e) => { e.scrollTop = e.scrollHeight; });
    await chup(page, 'iphone-cai-dat-cu-chi-sang', true);
    await hop.evaluate((e) => { e.scrollTop = 0; });
    T.coChuCaiDat = await doCoChu(page);
    for (const x of T.coChuCaiDat) ketQua.loi.push('Bảng cài đặt: cỡ chữ ngoài thang — ' + x);
    await hop.getByRole('button', { name: 'Tối', exact: true }).click();
    T.toiSauChon = await laToiLuc(page);
    if (!T.toiSauChon) ketQua.loi.push('Chọn Tối mà giao diện không tối');
    T.luuTheme = await page.evaluate(() => localStorage.getItem('theme'));
    if (T.luuTheme !== 'dark') ketQua.loi.push('Chọn Tối mà localStorage theme = ' + T.luuTheme);
    await chup(page, 'iphone-cai-dat-toi', true);
    await hop.evaluate((e) => { e.scrollTop = e.scrollHeight; });
    await chup(page, 'iphone-cai-dat-cu-chi-toi', true);
    await hop.evaluate((e) => { e.scrollTop = 0; });
    await dongCaiDat(page, hop);
    // nút sáng/tối cũ đã bỏ
    T.nutCu = await page.getByRole('button', { name: /Chuyển sang giao diện/ }).count();
    if (T.nutCu) ketQua.loi.push('Nút sáng/tối trên đầu trang vẫn còn');

    // Theo máy: đi theo máy, đổi theo máy tức thì
    await datCheDo(page, 'Theo máy');
    T.luuAuto = await page.evaluate(() => localStorage.getItem('theme'));
    if (T.luuAuto !== 'auto') ketQua.loi.push('Chọn Theo máy mà localStorage theme = ' + T.luuAuto);
    await page.emulateMedia({ colorScheme: 'dark' }); await page.waitForTimeout(150);
    T.theoMayToi = await laToiLuc(page);
    await page.emulateMedia({ colorScheme: 'light' }); await page.waitForTimeout(150);
    T.theoMaySang = !(await laToiLuc(page));
    await page.emulateMedia({ colorScheme: 'dark' }); await page.waitForTimeout(150);
    T.theoMayToiLan2 = await laToiLuc(page);
    if (!T.theoMayToi || !T.theoMaySang || !T.theoMayToiLan2) ketQua.loi.push('Theo máy không đổi theo prefers-color-scheme: ' + JSON.stringify([T.theoMayToi, T.theoMaySang, T.theoMayToiLan2]));
    await datCheDo(page, 'Sáng');
    T.sangKhiMayToi = !(await laToiLuc(page));
    if (!T.sangKhiMayToi) ketQua.loi.push('Chọn Sáng nhưng máy tối thì giao diện vẫn tối');
    await page.emulateMedia({ colorScheme: 'light' }); await page.waitForTimeout(100);
    await datCheDo(page, 'Tối');
    T.toiKhiMaySang = await laToiLuc(page);
    if (!T.toiKhiMaySang) ketQua.loi.push('Chọn Tối nhưng máy sáng thì giao diện không tối');
    // CSDL không chứa cài đặt giao diện (chỉ localStorage)
    T.theoMayKhongVaoCsdl = await page.evaluate(async () => {
      const db = await new Promise((res) => { const r = indexedDB.open('ghichu-sosinh'); r.onsuccess = () => res(r.result); });
      const meta = await new Promise((res) => { const r = db.transaction('meta').objectStore('meta').getAll(); r.onsuccess = () => res(r.result); });
      db.close();
      return !meta.some((m) => /theme|giao.?dien/i.test(m.key));
    });
    if (!T.theoMayKhongVaoCsdl) ketQua.loi.push('Cài đặt giao diện bị ghi vào CSDL');
    await page.emulateMedia({ colorScheme: 'light' });
  }
  await chup(page, 'iphone-kham-toi', false);
  {
    // v9.4, tối: kéo phải dòng bé (nền xanh rêu), bé đã khám đọc được (chữ nhạt + tích), chi tiết bé chưa khám và đã khám
    const cdp = await ctx.newCDPSession(page);
    const T = ketQua.thuChucNang.khamToi = {};
    const g03 = dongBe(page, 'G03');
    const rongD = (await g03.boundingBox()).width;
    const nenToi = await mauBien(page, '--swR2');
    await keoDong(cdp, g03, Math.round(rongD / 3 + 30));
    await page.waitForTimeout(100);
    const gd = await doDong(g03);
    T.keoPhai = { nen: gd.nen, qua: gd.qua, mau: gd.mau };
    if (gd.nen !== 'xong' || gd.qua !== '1' || gd.mau !== nenToi) ketQua.loi.push('Khám 9.4 (tối): kéo phải dòng bé qua mốc sai nền ' + JSON.stringify(T.keoPhai) + ' (cần ' + nenToi + ')');
    await chup(page, 'iphone-kham-vuot-phai-toi', false);
    await thaTay(cdp);
    await page.waitForTimeout(450);
    await vuotDong(page, cdp, dongBe(page, 'G01'), Math.round(rongD / 3 + 30));
    T.tuongPhan = { g01: await doTuongPhanBe(dongBe(page, 'G01')), g03: await doTuongPhanBe(g03), g12: await doTuongPhanBe(dongBe(page, 'G12')) };
    for (const [ma, v] of Object.entries(T.tuongPhan)) if (v < 4.5) ketQua.loi.push(`Khám 9.4 (tối): chữ bé đã khám ${ma} tương phản ${v.toFixed(2)} < 4,5`);
    T.daKhamToi = await page.locator('.pat-row.xong').count();
    if (T.daKhamToi !== 3) ketQua.loi.push('Khám 9.4 (tối): mong đợi 3 bé đã khám, thấy ' + T.daKhamToi);
    await chup(page, 'iphone-kham-da-kham-toi', true);
    await demChamSauVuot(page); // đệm cú chạm bị nuốt NGAY sau lần vuốt CDP
    await chamMot(page, g03.locator('.pat-open'));
    await bangBeMo.waitFor();
    await page.waitForTimeout(600);
    await chup(page, 'iphone-chi-tiet-be-da-kham-toi', true);
    await chamMot(page, bangBeMo.getByRole('button', { name: 'Bỏ đánh dấu đã khám', exact: true }));
    await page.waitForTimeout(400);
    await chamMot(page, bangBeMo.getByRole('button', { name: 'Tính tuần tuổi', exact: true }));
    await page.waitForTimeout(300);
    T.tuoiG03 = ((await bangBeMo.locator('.be-kq').textContent()) || '').trim();
    if (!/Ngày tuổi\s*31 ngày/.test(T.tuoiG03) || !/Hiệu chỉnh\s*36w3d/.test(T.tuoiG03)) ketQua.loi.push('Khám 9.4 (tối): tuổi G03 (20/09, 32w0d) không ra 31 ngày, 36w3d: ' + T.tuoiG03);
    await chup(page, 'iphone-chi-tiet-be-toi', true);
    await chamMot(page, bangBeMo.getByRole('button', { name: 'Xong', exact: true }));
    await page.waitForTimeout(700);
    // tối: chi tiết việc của bé (bảng nhỏ chồng lên chi tiết bé); việc vừa vuốt phải thành xong
    await chamMot(page, dongBe(page, 'G01').locator('.pat-open'));
    await bangBeMo.waitFor();
    await page.waitForTimeout(500);
    const hang = page.locator('.sheet .swipe', { hasText: 'Đo bilirubin' });
    const rong = (await hang.boundingBox()).width;
    await vuotDong(page, cdp, hang, Math.round(rong / 3 + 30));
    // đang mở bảng: "chạm vùng trống" là chạm dòng tiêu đề "Việc cần làm" (chạm nền ngoài sẽ đóng bảng)
    const tieuDe = await tamDiem(page.locator('.sheet .be-viec-h').first());
    await page.touchscreen.tap(tieuDe.x, tieuDe.y);
    await page.waitForTimeout(250);
    const cc = await tamDiem(hang.locator('.todo-main'));
    await page.touchscreen.tap(cc.x, cc.y);
    await page.touchscreen.tap(cc.x, cc.y);
    await page.getByRole('dialog', { name: 'Chi tiết việc của bé' }).waitFor();
    await chup(page, 'iphone-chi-tiet-viec-be-toi', true);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(700);
    await page.getByRole('button', { name: 'Đóng chi tiết', exact: true }).click(); await page.waitForTimeout(600);
    await cdp.detach();
  }
  await page.getByRole('button', { name: 'Việc', exact: true }).click();
  await chup(page, 'iphone-viec-toi', true);
  {
    // tối: cử chỉ mới (kéo phải/trái qua mốc, Hoàn tác, việc đã xong) và bảng chi tiết việc
    const cdp = await ctx.newCDPSession(page);
    const T = ketQua.thuChucNang.viecToi = {};
    const dongT = (ten) => page.locator('.swipe', { hasText: ten });
    const rongT = (await dongT('Gọi người nhà giường 12').boundingBox()).width;
    const mocT = rongT / 3;
    const [xanh2, do2] = [await mauBien(page, '--swR2'), await mauBien(page, '--swL2')];
    T.mauNenToi = { swR2: xanh2, swL2: do2 };
    // vuốt phải qua mốc (đang kéo)
    await keoDong(cdp, dongT('Gọi người nhà giường 12'), Math.round(mocT + 30));
    await page.waitForTimeout(100);
    let g = await doDong(dongT('Gọi người nhà giường 12'));
    if (g.nen !== 'xong' || g.qua !== '1' || g.mau !== xanh2) ketQua.loi.push('Tối: vuốt phải qua mốc, nền sai ' + JSON.stringify(g));
    await chup(page, 'iphone-vuot-phai-toi', false);
    await thaTay(cdp);
    await page.waitForTimeout(600); // việc này thành xong (cho ảnh việc đã xong ở dưới)
    await page.evaluate(() => document.querySelectorAll('*').forEach((e) => { if (e.scrollTop) e.scrollTop = 0; }));
    await chup(page, 'iphone-viec-xong-toi', true);
    // vuốt trái qua mốc (đang kéo) → xoá → thanh Hoàn tác → Hoàn tác
    const tuyen = dongT('Nhận bé chuyển tuyến');
    await keoDong(cdp, tuyen, -Math.round(mocT + 30));
    await page.waitForTimeout(100);
    g = await doDong(tuyen);
    if (g.nen !== 'xoa' || g.qua !== '1' || g.mau !== do2) ketQua.loi.push('Tối: vuốt trái qua mốc, nền sai ' + JSON.stringify(g));
    await chup(page, 'iphone-vuot-trai-toi', false);
    await thaTay(cdp);
    await page.waitForTimeout(700);
    await chup(page, 'iphone-hoan-tac-toi', true);
    T.thanhToi = await page.locator('.hoantac').evaluate((e) => { const cs = getComputedStyle(e); const b = e.querySelector('.hoantac-nut'); return { nen: cs.backgroundColor, chu: cs.color, nut: getComputedStyle(b).color }; });
    await page.locator('.hoantac').getByRole('button', { name: 'Hoàn tác', exact: true }).click();
    await page.waitForTimeout(500);
    if (!(await tuyen.count())) ketQua.loi.push('Tối: Hoàn tác không trả lại dòng');
    await page.touchscreen.tap(60, 45);
    await page.waitForTimeout(250);
    await tuyen.scrollIntoViewIfNeeded();
    const c = await tamDiem(tuyen.locator('.task-main'));
    await chamDoi(page, c);
    await page.getByRole('dialog', { name: 'Chi tiết việc' }).waitFor();
    await chup(page, 'iphone-chi-tiet-viec-toi', true);
    await page.getByRole('button', { name: 'Xong', exact: true }).click(); await page.waitForTimeout(600); // chờ bảng trượt xuống xong
    await page.waitForTimeout(250);
    await cdp.detach();
  }
  {
    const o = page.getByLabel('Nội dung công việc');
    await o.click();
    await page.keyboard.type('Xem lại /km');
    await chup(page, 'iphone-goi-y-toi', true);
    await page.keyboard.type('dm ');
    await chup(page, 'iphone-da-doi-hoan-tac-toi', true);
    {
      // bản tối: thanh `Đã đổi …` dùng --undoBg / --undoInk / --undoAct, không còn hộp sáng chói (NHAT_KY Chờ duyệt #4)
      const u = await page.locator('.vt-toast').evaluate((e) => { const cs = getComputedStyle(e); const b = getComputedStyle(e.querySelector('.vt-undo')); return { nen: cs.backgroundColor, chu: cs.color, nut: b.color, cao: Math.round(e.querySelector('.vt-undo').getBoundingClientRect().height) }; });
      const [bg, ink, act] = [await mauBien(page, '--undoBg'), await mauBien(page, '--undoInk'), await mauBien(page, '--undoAct')];
      ketQua.thuChucNang.viecToi.thanhDaDoiToi = { ...u, bg, ink, act };
      if (u.nen !== bg || u.chu !== ink || u.nut !== act) ketQua.loi.push('Tối: thanh "Đã đổi" không dùng --undoBg/--undoInk/--undoAct ' + JSON.stringify(ketQua.thuChucNang.viecToi.thanhDaDoiToi));
      if (u.cao < 44) ketQua.loi.push('Tối: nút Hoàn tác của thanh "Đã đổi" cao ' + u.cao + 'px (cần >= 44)');
    }
    await o.fill('');
    await o.blur();
    await chonBangThem(page, 'Thư viện viết tắt');
    await page.getByRole('dialog', { name: 'Thư viện viết tắt' }).waitFor();
    await chup(page, 'iphone-thu-vien-toi', true);
    await page.getByRole('button', { name: 'Đóng thư viện', exact: true }).click(); await page.waitForTimeout(600); // chờ bảng trượt xuống xong
  }
  await ctx.close();
}

// iPhone: dòng nhắc cử chỉ chỉ hiện trong 3 lần mở app đầu tiên hoặc khi danh sách của ngày trống (v9.1)
{
  const { ctx, page } = await moApp({
    viewport: { width: 393, height: 852 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mobile/15E148 Safari/604.1)'
  }, { lanMo: false });
  const T = ketQua.thuChucNang.dongNhac = {};
  const CHU_NHAC = 'Vuốt phải: xong · Vuốt trái: xoá · Chạm 2 lần: chi tiết';
  const nhac = () => page.getByText(CHU_NHAC, { exact: true }).count();
  const taiLai = async () => { await page.reload(); await page.waitForSelector('.phone-app'); await page.waitForTimeout(500); };
  T.lanMo = await page.evaluate(() => localStorage.getItem('soLanMo'));
  T.lan2 = await nhac();
  // v9.2: dòng nhắc nói đúng cử chỉ mới và gọn một dòng ở 393px (không bị cắt bằng "…")
  T.dongNhacDo = await page.locator('.dong-nhac').evaluate((e) => ({ sw: e.scrollWidth, cw: e.clientWidth, cao: Math.round(e.getBoundingClientRect().height), co: getComputedStyle(e).fontSize }));
  if (T.dongNhacDo.sw > T.dongNhacDo.cw || T.dongNhacDo.cao > 20) ketQua.loi.push('Dòng nhắc cử chỉ không gọn một dòng ở 393px ' + JSON.stringify(T.dongNhacDo));
  await taiLai(); T.lan3 = await nhac();
  await taiLai(); T.lan4 = await nhac();
  T.demLan4 = await page.evaluate(() => localStorage.getItem('soLanMo'));
  if (T.lanMo !== '2' || T.demLan4 !== '4') ketQua.loi.push(`Đếm số lần mở app sai: ${T.lanMo} rồi ${T.demLan4} (mong đợi 2 rồi 4)`);
  if (T.lan2 !== 1 || T.lan3 !== 1) ketQua.loi.push(`Dòng nhắc phải hiện ở lần mở thứ 2 và 3 (thấy ${T.lan2}, ${T.lan3})`);
  if (T.lan4 !== 0) ketQua.loi.push('Dòng nhắc vẫn hiện ở lần mở thứ 4 khi danh sách có việc');
  await page.getByRole('button', { name: 'Mở lịch', exact: true }).click();
  await page.getByRole('button', { name: /^Ngày 25 tháng 10,/ }).click();
  await page.waitForTimeout(700);
  T.ngayTrong = await nhac();
  if (T.ngayTrong !== 1) ketQua.loi.push('Dòng nhắc không hiện khi danh sách của ngày trống (lần mở thứ 4)');
  await ctx.close();
}

// Phép kiểm THẬT khi thanh Hoàn tác đang hiện: ô gõ, "+", chip khu, nút nhãn của thanh thêm việc phải không bị che (elementFromPoint ra đúng nó)
// và thanh Hoàn tác phải nằm trên thanh thêm việc. Trả { loi: [...], thanh, form }.
// Chạm ô gõ tới khi nhận con trỏ (Chromium headless nuốt một số cú chạm đầu sau lần vuốt bằng CDP); tối đa 4 lần
const chamO = async (page, o) => { for (let i = 0; i < 4; i++) { await o.tap(); await page.waitForTimeout(250); if ((await page.evaluate(() => document.activeElement?.id)) === 'ph-draft') return; } ketQua.loi.push('Chạm ô gõ 4 lần vẫn không nhận con trỏ (chỉ được đệm cú chạm bị nuốt NGAY sau lần vuốt CDP)'); };
// Chạm thật bằng ngón tay (CDP) với thời gian giữ ms giữa pointerdown và pointerup
const chamGiu = async (cdp, x, y, ms = 100) => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] }); await new Promise((r) => setTimeout(r, ms)); await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); };
const tamNut = async (loc) => { const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
const kiemChe = (page) => page.evaluate(() => {
  const h = document.querySelector('.hoantac'), f = document.querySelector('.task-form-ph');
  if (!h || !f) return { loi: ['không thấy thanh Hoàn tác hoặc thanh thêm việc'] };
  const a = h.getBoundingClientRect(), r = f.getBoundingClientRect(), loi = [];
  for (const e of f.querySelectorAll('input, .tf-plus, .chip, .tag-btn')) {
    const b = e.getBoundingClientRect();
    const x = b.x + b.width / 2, y = b.y + b.height / 2;
    if (x < 0 || x > innerWidth || y < 0 || y > innerHeight) continue; // chip nằm ngoài khung nhìn (hàng vuốt ngang)
    const t = document.elementFromPoint(x, y);
    if (!t || !e.contains(t)) loi.push((e.getAttribute('aria-label') || e.textContent || e.tagName).trim().slice(0, 14) + ' bị ' + (t?.closest('.hoantac') ? 'thanh Hoàn tác' : (t?.className || t?.tagName)) + ' che');
  }
  if (a.bottom > r.top + 0.5) loi.push('thanh Hoàn tác (đáy ' + Math.round(a.bottom) + ') chưa nằm trên thanh thêm việc (đỉnh ' + Math.round(r.top) + ')');
  return { loi, thanh: [Math.round(a.top), Math.round(a.bottom)], form: [Math.round(r.top), Math.round(r.bottom)], khe: Math.round(r.top - a.bottom) };
});
// ---------- iPhone: ô thêm việc 1 dòng (v9.3, bảng 15a và 15b) ----------
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPHONE_OPTS = { viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: IPHONE_UA };
{
  const { ctx, page } = await moApp(IPHONE_OPTS);
  const cdp = await ctx.newCDPSession(page);
  const T = ketQua.thuChucNang.oThemViec = {};
  const form = page.locator('.task-form-ph');
  const o = page.getByLabel('Nội dung công việc');
  const cong = page.getByRole('button', { name: 'Thêm việc', exact: true });
  const nhomKhu = form.getByRole('group', { name: 'Khu vực', exact: true });
  const nhomNhan = form.getByRole('group', { name: 'Nhãn của việc mới', exact: true });
  const focusId = () => page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName);
  const dangBung = () => form.evaluate((f) => f.classList.contains('mo'));
  const khuChon = () => nhomKhu.locator('[aria-pressed="true"]').allTextContents();
  const nhanChon = () => nhomNhan.locator('[aria-pressed="true"]').evaluateAll((es) => es.map((e) => e.textContent.trim()));
  const viec = async (ten) => (await docBang(page, 'tasks')).filter((t) => t.text === ten && !t.deleted);
  const tongViec = async () => (await docBang(page, 'tasks')).filter((t) => !t.deleted).length;
  const veoRoi = () => page.touchscreen.tap(60, 45); // chạm vùng trống ngoài form

  // --- A. Thu gọn (bảng 15a): một dòng gồm ô tròn + nút tròn "+" 44px ---
  T.thuGon = await form.evaluate((f) => {
    const r = (e) => e.getBoundingClientRect();
    const inp = f.querySelector('input'), plus = f.querySelector('.tf-plus');
    const cs = getComputedStyle(inp);
    return {
      soHang: f.querySelectorAll('.tf-row').length, select: f.querySelectorAll('select').length,
      chuNhan: /Nhãn \(chọn được nhiều\)/.test(f.textContent),
      nutCoChu: [...f.querySelectorAll('button')].filter((b) => (b.textContent || '').trim()).map((b) => b.textContent.trim()),
      nutNhan: f.querySelectorAll('[aria-label^="Nhãn "]').length, chip: f.querySelectorAll('.chip').length,
      plus: [Math.round(r(plus).width), Math.round(r(plus).height)], tenPlus: plus.getAttribute('aria-label'),
      oCao: Math.round(r(inp).height), oBoGoc: cs.borderTopLeftRadius, oCoChu: cs.fontSize, goiYO: inp.placeholder,
      cungHang: Math.abs((r(inp).top + r(inp).height / 2) - (r(plus).top + r(plus).height / 2)) < 2,
      caoForm: Math.round(r(f).height)
    };
  });
  const tg = T.thuGon;
  if (tg.soHang !== 1 || tg.select || tg.chuNhan || tg.nutCoChu.length || tg.nutNhan || tg.chip) ketQua.loi.push('Ô thêm việc thu gọn không phải một dòng gọn: ' + JSON.stringify(tg));
  if (tg.plus.join('x') !== '44x44' || tg.tenPlus !== 'Thêm việc') ketQua.loi.push('Nút "+" phải 44x44 và aria-label "Thêm việc": ' + JSON.stringify(tg.plus) + ' ' + tg.tenPlus);
  if (tg.oCao !== 44 || parseFloat(tg.oBoGoc) < 22 || parseFloat(tg.oCoChu) < 16 || !tg.cungHang || tg.goiYO !== 'Ghi việc cần làm…') ketQua.loi.push('Ô gõ thu gọn không đúng bảng 15a (cao 44, tròn, chữ >= 16, cùng hàng với "+"): ' + JSON.stringify(tg));
  if ((await page.getByLabel('Nội dung công việc').count()) !== 1) ketQua.loi.push('Thiếu nhãn "Nội dung công việc" của ô thêm việc');
  await chup(page, 'iphone-o-them-thu-gon', true);

  // --- B. Chạm vào ô gõ: bung hàng chip khu vực + hàng 5 nút nhãn ngay dưới ô (bảng 15b) ---
  await o.tap();
  await page.waitForTimeout(250);
  T.bung = await form.evaluate((f) => {
    const r = (e) => e.getBoundingClientRect();
    const hang = f.querySelector('.tf-row'), khu = f.querySelector('[aria-label="Khu vực"]'), nhan = f.querySelector('[aria-label="Nhãn của việc mới"]');
    return {
      khu: [...khu.querySelectorAll('button')].map((b) => b.textContent.trim() + (b.getAttribute('aria-pressed') === 'true' ? '*' : '')),
      caoChip: [...khu.querySelectorAll('button')].map((b) => Math.round(r(b).height)),
      nhan: [...nhan.querySelectorAll('button')].map((b) => b.getAttribute('aria-label') + ':' + b.getAttribute('aria-pressed') + ':' + Math.round(r(b).width) + 'x' + Math.round(r(b).height)),
      khuDuoiO: r(khu).top >= r(hang).bottom - 1, nhanDuoiKhu: r(nhan).top >= r(khu).bottom - 1,
      khuCuon: getComputedStyle(khu).overflowX, khuRong: khu.scrollWidth + '/' + khu.clientWidth,
      chuGhiChu: /Khu vực lấy theo chip|Nhãn chọn được nhiều/.test(f.textContent), caoForm: Math.round(r(f).height)
    };
  });
  const b = T.bung;
  T.bung.focus = await focusId();
  if (T.bung.focus !== 'ph-draft' || !(await dangBung())) ketQua.loi.push('Chạm vào ô gõ không bung / mất con trỏ: ' + T.bung.focus);
  if (b.khu.join(',') !== 'NICU*,CT,KAN,PS-PM,Ngoại Trú,DV,HP,HS') ketQua.loi.push('Chip khu vực của ô thêm việc: ' + b.khu.join(',') + ' (cần NICU*,CT,KAN,PS-PM,Ngoại Trú,DV,HP,HS; không có BM)');
  if (b.nhan.join('|') !== ['NV', 'BM', 'CK', 'HC', 'XN'].map((x) => `Nhãn ${x}:false:44x44`).join('|')) ketQua.loi.push('5 nút nhãn chưa đúng (44x44, chưa chọn): ' + b.nhan.join('|'));
  if (b.caoChip.some((h) => h !== 44) || !b.khuDuoiO || !b.nhanDuoiKhu) ketQua.loi.push('Hàng chip khu / nhãn không nằm đúng chỗ hoặc chip không cao 44px ' + JSON.stringify(b));
  if (b.khuCuon !== 'auto' || +b.khuRong.split('/')[0] <= +b.khuRong.split('/')[1]) ketQua.loi.push('Hàng chip khu vực không vuốt ngang được: ' + b.khuRong + ' ' + b.khuCuon);
  if (b.chuGhiChu) ketQua.loi.push('Có dòng chú thích nhỏ trong thanh thêm việc (phiếu 9.3 bảo KHÔNG hiện)');
  await chup(page, 'iphone-o-them-bung', true);
  for (const x of await doCoChu(page)) ketQua.loi.push('iPhone ô thêm việc bung: cỡ chữ ngoài thang 5 bậc — ' + x);
  // --- C. Chạm chip và nút nhãn: không mất con trỏ (bàn phím), không thu lại ---
  await nhomKhu.getByRole('button', { name: 'KAN', exact: true }).tap();
  await form.getByRole('button', { name: 'Nhãn NV', exact: true }).tap();
  await form.getByRole('button', { name: 'Nhãn XN', exact: true }).tap();
  await page.waitForTimeout(200);
  T.chamChipNhan = { khu: await khuChon(), nhan: await nhanChon(), focus: await focusId(), bung: await dangBung() };
  if (T.chamChipNhan.khu.join() !== 'KAN' || T.chamChipNhan.nhan.join() !== 'NV,XN') ketQua.loi.push('Chạm chip KAN và nhãn NV, XN chưa chọn đúng: ' + JSON.stringify(T.chamChipNhan));
  if (T.chamChipNhan.focus !== 'ph-draft' || !T.chamChipNhan.bung) ketQua.loi.push('Chạm chip / nhãn làm mất con trỏ hoặc thu lại ô: ' + JSON.stringify(T.chamChipNhan));
  for (const t of ['KAN', 'NV', 'XN']) { // aria-pressed phản ánh đúng
    const p = await form.getByRole('button', { name: t === 'KAN' ? 'KAN' : 'Nhãn ' + t, exact: true }).getAttribute('aria-pressed');
    if (p !== 'true') ketQua.loi.push('Nút ' + t + ' thiếu aria-pressed="true"');
  }

  {
    // vuốt ngang hàng chip bằng ngón tay thật: cuộn được, ô giữ con trỏ, chip không bị bấm nhầm
    const hb = await nhomKhu.boundingBox();
    await vuotNgang(cdp, hb.x + hb.width - 30, hb.x + 40, hb.y + hb.height / 2);
    await page.waitForTimeout(400);
    T.vuotChipKhu = { cuon: await nhomKhu.evaluate((e) => Math.round(e.scrollLeft)), focus: await focusId(), khu: await khuChon(), bung: await dangBung(), nhan: await nhanChon() };
    if (T.vuotChipKhu.cuon <= 0) ketQua.loi.push('Vuốt ngang hàng chip khu vực không cuộn (preventDefault chặn?) ' + JSON.stringify(T.vuotChipKhu));
    if (T.vuotChipKhu.focus !== 'ph-draft' || !T.vuotChipKhu.bung || T.vuotChipKhu.khu.join() !== 'KAN' || T.vuotChipKhu.nhan.join() !== 'NV,XN') ketQua.loi.push('Vuốt hàng chip làm mất con trỏ / thu lại / đổi khu: ' + JSON.stringify(T.vuotChipKhu));
    await page.waitForTimeout(900); // chờ đà trượt tắt hẳn
    await nhomKhu.evaluate((e) => { e.scrollLeft = 0; });
    await page.waitForTimeout(300);
    await o.tap(); // Chromium headless nuốt cú chạm đầu sau khi vuốt bằng CDP; chạm vào ô gõ (trống) là vô hại
    await page.waitForTimeout(200);
  }


  // --- D. "+" khi ô trống: không tạo việc rỗng ---
  const n0 = await tongViec();
  await cong.tap();
  await page.waitForTimeout(300);
  T.plusKhiTrong = { them: (await tongViec()) - n0, focus: await focusId() };
  if (T.plusKhiTrong.them !== 0) ketQua.loi.push('Nút "+" khi ô trống vẫn tạo việc');
  if (T.plusKhiTrong.focus !== 'ph-draft') ketQua.loi.push('Nút "+" khi ô trống làm mất con trỏ');

  // --- E. Thêm việc: đúng khu và nhãn đang thấy; ô về trống, con trỏ còn; giữ lựa chọn để thêm tiếp ---
  await page.keyboard.type('Việc thử ô một dòng');
  await cong.tap();
  await page.waitForTimeout(450);
  const v1 = await viec('Việc thử ô một dòng');
  T.themMotViec = { soViec: v1.length, khu: v1[0]?.zone, nhan: v1[0]?.tags, o: await o.inputValue(), focus: await focusId(), bung: await dangBung(), khuThay: await khuChon(), nhanThay: await nhanChon() };
  if (v1.length !== 1 || v1[0].zone !== 'KAN' || v1[0].tags.join() !== 'NV,XN') ketQua.loi.push('Việc mới không có đúng khu / nhãn đã chọn: ' + JSON.stringify(T.themMotViec));
  if (T.themMotViec.o !== '' || T.themMotViec.focus !== 'ph-draft' || !T.themMotViec.bung) ketQua.loi.push('Sau khi thêm: ô phải trống, giữ con trỏ và còn bung: ' + JSON.stringify(T.themMotViec));
  if (T.themMotViec.khuThay.join() !== 'KAN' || T.themMotViec.nhanThay.join() !== 'NV,XN') ketQua.loi.push('Sau khi thêm, lựa chọn đang thấy bị mất: ' + JSON.stringify(T.themMotViec));
  // thêm liên tiếp nhanh: bấm "+" ba lần liền, Enter, rồi gõ-và-bấm ngay: mỗi việc đúng một bản
  await page.keyboard.type('Nhanh 1');
  await cong.tap(); await cong.tap(); await cong.tap();
  await page.keyboard.type('Nhanh 2');
  await page.keyboard.press('Enter');
  await page.keyboard.press('Enter');
  await page.keyboard.type('Nhanh 3');
  await cong.dblclick().catch(() => {});
  await page.waitForTimeout(600);
  T.nhanh = {};
  for (const ten of ['Nhanh 1', 'Nhanh 2', 'Nhanh 3']) T.nhanh[ten] = (await viec(ten)).length;
  if (Object.values(T.nhanh).some((n) => n !== 1)) ketQua.loi.push('Thêm liên tiếp nhanh tạo trùng hoặc thiếu việc: ' + JSON.stringify(T.nhanh));

  // --- F. Chạm chỗ khác: còn chữ thì vẫn bung (giữ khu, nhãn); ô trống thì thu lại, nhãn về trống, khu về theo chip lọc ---
  await page.keyboard.type('Dở dang');
  await veoRoi();
  await page.waitForTimeout(300);
  T.roiKhiConChu = { bung: await dangBung(), khu: await khuChon(), nhan: await nhanChon(), o: await o.inputValue() };
  if (!T.roiKhiConChu.bung || T.roiKhiConChu.khu.join() !== 'KAN' || T.roiKhiConChu.nhan.join() !== 'NV,XN' || T.roiKhiConChu.o !== 'Dở dang') ketQua.loi.push('Rời ô khi còn chữ phải vẫn bung và giữ khu, nhãn: ' + JSON.stringify(T.roiKhiConChu));
  await o.fill('');
  await veoRoi();
  await page.waitForTimeout(300);
  T.roiKhiTrong = { bung: await dangBung(), chipCon: await form.locator('.chip, .tag-btn').count() };
  if (T.roiKhiTrong.bung || T.roiKhiTrong.chipCon) ketQua.loi.push('Rời ô khi trống mà không thu lại: ' + JSON.stringify(T.roiKhiTrong));
  await o.tap();
  await page.waitForTimeout(250);
  T.moLaiSauThuLai = { khu: await khuChon(), nhan: await nhanChon() };
  if (T.moLaiSauThuLai.khu.join() !== 'NICU' || T.moLaiSauThuLai.nhan.length) ketQua.loi.push('Sau khi thu lại: khu phải về NICU (chip Tất cả) và nhãn về trống: ' + JSON.stringify(T.moLaiSauThuLai));
  // việc kế tiếp không mang nhãn / khu bị ẩn
  await page.keyboard.type('Việc sau khi thu lại');
  await cong.tap();
  await page.waitForTimeout(400);
  const v2 = await viec('Việc sau khi thu lại');
  T.viecSauThuLai = { khu: v2[0]?.zone, nhan: v2[0]?.tags };
  if (v2.length !== 1 || v2[0].zone !== 'NICU' || v2[0].tags.length) ketQua.loi.push('Việc sau khi thu lại mang khu / nhãn cũ: ' + JSON.stringify(T.viecSauThuLai));
  await o.fill(''); await veoRoi(); await page.waitForTimeout(250);

  // --- G. Chip đang lọc đổi thì khu mới đổi theo; thu lại thì về khu của chip lọc; khu BM cũ không có ở chip thêm mới ---
  const locKhu = (ten) => page.locator('nav[aria-label="Khu vực làm việc"]').getByRole('button', { name: new RegExp('^' + ten + '( \\d+)?$') });
  await locKhu('CT').tap();
  await page.waitForTimeout(250);
  await o.tap(); await page.waitForTimeout(250);
  T.theoChipLoc = { khuSauLoc: await khuChon() };
  if (T.theoChipLoc.khuSauLoc.join() !== 'CT') ketQua.loi.push('Lọc chip CT mà khu mới không theo: ' + T.theoChipLoc.khuSauLoc.join());
  await nhomKhu.getByRole('button', { name: 'HP', exact: true }).tap();
  await form.getByRole('button', { name: 'Nhãn HC', exact: true }).tap();
  await o.fill(''); await veoRoi(); await page.waitForTimeout(250);
  await o.tap(); await page.waitForTimeout(250);
  T.thuLaiTheoLoc = { khu: await khuChon(), nhan: await nhanChon() };
  if (T.thuLaiTheoLoc.khu.join() !== 'CT' || T.thuLaiTheoLoc.nhan.length) ketQua.loi.push('Thu lại khi đang lọc CT: khu phải về CT, nhãn trống: ' + JSON.stringify(T.thuLaiTheoLoc));
  await page.keyboard.type('Việc thử khu CT');
  await cong.tap();
  await page.waitForTimeout(400);
  const v3 = await viec('Việc thử khu CT');
  if (v3.length !== 1 || v3[0].zone !== 'CT' || v3[0].tags.length) ketQua.loi.push('Việc thử khu CT có khu / nhãn ẩn: ' + JSON.stringify(v3.map((t) => [t.zone, t.tags])));
  await o.fill(''); await veoRoi(); await page.waitForTimeout(250);
  if (await locKhu('BM').count()) {
    await locKhu('BM').tap();
    await page.waitForTimeout(250);
    await o.tap(); await page.waitForTimeout(250);
    T.locBM = { chip: await nhomKhu.locator('button').allTextContents(), khu: await khuChon() };
    if (T.locBM.chip.includes('BM') || T.locBM.khu.includes('BM')) ketQua.loi.push('Khu BM cũ xuất hiện ở chip thêm mới: ' + JSON.stringify(T.locBM));
    await o.fill(''); await veoRoi(); await page.waitForTimeout(250);
    T.locBM.sauThuLai = await (async () => { await o.tap(); await page.waitForTimeout(200); const k = await khuChon(); await o.fill(''); await veoRoi(); await page.waitForTimeout(200); return k; })();
    if (T.locBM.sauThuLai.join() !== 'NICU') ketQua.loi.push('Lọc khu cũ BM rồi thu lại: khu phải về NICU (khu đầu), thấy ' + T.locBM.sauThuLai.join());
  }
  await locKhu('Tất cả').tap();
  await page.waitForTimeout(250);

  // --- H. Blur do chạm trong form khác blur do chạm chỗ khác: giả lập trình duyệt KHÔNG giữ con trỏ khi chạm nút ---
  // (chạm chip -> ô mất con trỏ trước khi nhận click). Form không được thu lại trước khi click tới nơi.
  await o.tap(); await page.waitForTimeout(250);
  T.blurTrongForm = await page.evaluate(async () => {
    const f = document.querySelector('.task-form-ph');
    const chip = [...f.querySelectorAll('.chip')].find((b) => b.textContent.trim() === 'HP');
    chip.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', isPrimary: true }));
    document.getElementById('ph-draft').blur(); // blur đến TRƯỚC click, relatedTarget = null
    await new Promise((r) => setTimeout(r, 60));
    const conChip = !!f.contains(chip) && f.classList.contains('mo');
    chip.click();
    await new Promise((r) => setTimeout(r, 60));
    window.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }));
    return { conChipTruocClick: conChip, khuSauClick: [...f.querySelectorAll('.chip[aria-pressed="true"]')].map((b) => b.textContent.trim()) };
  });
  if (!T.blurTrongForm.conChipTruocClick || T.blurTrongForm.khuSauClick.join() !== 'HP') ketQua.loi.push('Blur do chạm trong form làm thu lại / mất cú chạm vào chip: ' + JSON.stringify(T.blurTrongForm));
  await page.waitForTimeout(600); // hết thời gian "đang chạm trong form"
  await veoRoi(); await page.waitForTimeout(250);
  T.blurNgoaiForm = { bung: await dangBung() };
  if (T.blurNgoaiForm.bung) ketQua.loi.push('Sau khi chạm chỗ khác (ô trống) ô vẫn bung');

  // --- I. Thanh `Đã đổi … thành …`: giữ 6 giây; strip nằm NGOÀI thẻ label; Hoàn tác trả đúng chữ ---
  await o.tap(); await page.waitForTimeout(200);
  await page.keyboard.type('Xem /kmdm ');
  const t0 = Date.now();
  T.stripNgoaiLabel = await page.evaluate(() => [...document.querySelectorAll('.vt-strip')].map((s) => !s.closest('label')));
  if (T.stripNgoaiLabel.some((x) => !x)) ketQua.loi.push('Có thanh gợi ý viết tắt nằm trong thẻ label');
  await page.waitForTimeout(5000 - (Date.now() - t0));
  T.thanhSau5s = await page.locator('.vt-toast').count();
  if (T.thanhSau5s !== 1) ketQua.loi.push('Thanh "Đã đổi" biến mất trước 6 giây (sau 5 giây còn ' + T.thanhSau5s + ')');
  await page.locator('.vt-toast').waitFor({ state: 'detached', timeout: 3000 });
  const ms = Date.now() - t0;
  T.thanhDaDoiMat = ms + ' ms';
  if (ms < 5600 || ms > 7000) ketQua.loi.push('Thanh "Đã đổi" biến mất sau ' + ms + ' ms (mong đợi ~6000)');
  await o.fill(''); await veoRoi(); await page.waitForTimeout(250);

  // --- J. Thanh Hoàn tác khi xoá nằm NGAY TRÊN thanh thêm việc (thu gọn và bung), không che ô gõ, "+", chip, nhãn ---
  {
    const dong = page.locator('.swipe', { hasText: 'Nhanh 1' });
    await dong.scrollIntoViewIfNeeded();
    const b2 = await dong.boundingBox();
    await keoDo(cdp, b2.x + b2.width - 60, -Math.round(b2.width / 3 + 30), b2.y + b2.height / 2);
    await thaTay(cdp);
    await page.waitForTimeout(700);
    T.hoanTacTrenThuGon = await kiemChe(page);
    for (const l of T.hoanTacTrenThuGon.loi) ketQua.loi.push('Hoàn tác (thu gọn): ' + l);
    // xoá một việc rồi thêm ngay việc mới trong lúc thanh còn hiện: ô gõ chạm được, việc tạo đúng, thanh vẫn Hoàn tác đúng việc vừa xoá
    await chamO(page, o);
    T.hoanTacTrenBung = await kiemChe(page);
    for (const l of T.hoanTacTrenBung.loi) ketQua.loi.push('Hoàn tác (bung): ' + l);
    T.chamODuoiThanh = await focusId();
    if (T.chamODuoiThanh !== 'ph-draft') ketQua.loi.push('Chạm ô gõ khi thanh Hoàn tác đang hiện không có tác dụng (' + T.chamODuoiThanh + ')');
    await page.keyboard.type('Thêm lúc có thanh');
    await cong.tap();
    await page.waitForTimeout(450);
    const moi = await viec('Thêm lúc có thanh');
    T.themLucCoThanh = { soViec: moi.length, thanhCon: await page.locator('.hoantac').count() };
    if (moi.length !== 1 || !T.themLucCoThanh.thanhCon) ketQua.loi.push('Thêm việc khi thanh Hoàn tác còn hiện: ' + JSON.stringify(T.themLucCoThanh));
    await chup(page, 'iphone-hoan-tac-tren-o-them', false);
    // chạm THẬT (touchscreen, đúng một lần) vào Hoàn tác khi ô đang bung và trống (lỗi vòng 2: ô thu lại dưới ngón tay làm cú chạm trượt)
    const cb = await tamNut(page.locator('.hoantac').getByRole('button', { name: 'Hoàn tác', exact: true }));
    await page.touchscreen.tap(cb.x, cb.y);
    await page.waitForTimeout(500);
    T.sauChamHoanTac = { bung: await dangBung(), focus: await focusId() };
    if (!T.sauChamHoanTac.bung) ketQua.loi.push('Chạm Hoàn tác làm ô thêm việc thu lại: ' + JSON.stringify(T.sauChamHoanTac));
    const [n1, n2] = [(await viec('Nhanh 1')).length, (await viec('Thêm lúc có thanh')).length];
    T.hoanTacDungViec = { nhanh1: n1, viecMoi: n2 };
    if (n1 !== 1 || n2 !== 1) ketQua.loi.push('Hoàn tác không trả đúng việc vừa xoá / làm mất việc mới thêm: ' + JSON.stringify(T.hoanTacDungViec));
    await choHoanTacTat(page);
  }
  // --- K. Ô bung và trống, giữ ngón ~100ms: mỗi cú chạm phải trúng đúng phần tử đã chạm (không trượt vì ô thu lại) ---
  {
    const bungTrong = async () => { await o.tap(); await page.waitForTimeout(250); if ((await focusId()) !== 'ph-draft' || !(await dangBung())) ketQua.loi.push('Không bung được ô thêm việc để thử chạm giữ ngón'); };
    const xoaMot = async (ten) => { const d = page.locator('.swipe', { hasText: ten }); await d.scrollIntoViewIfNeeded(); const bx = await d.boundingBox(); await keoDo(cdp, bx.x + bx.width - 60, -Math.round(bx.width / 3 + 30), bx.y + bx.height / 2); await thaTay(cdp); await page.waitForTimeout(700); await chamO(page, o); };
    T.chamGiu = {};
    // K1: Hoàn tác, giữ ngón 100ms
    await xoaMot('Nhanh 2');
    {
      const cb = await tamNut(page.locator('.hoantac').getByRole('button', { name: 'Hoàn tác', exact: true }));
      await chamGiu(cdp, cb.x, cb.y, 100);
      await page.waitForTimeout(500);
      T.chamGiu.hoanTac = { khoiPhuc: (await viec('Nhanh 2')).length, bung: await dangBung() };
      if (T.chamGiu.hoanTac.khoiPhuc !== 1 || !T.chamGiu.hoanTac.bung) ketQua.loi.push('Chạm giữ 100ms vào Hoàn tác (ô bung, trống) không khôi phục / làm ô thu lại: ' + JSON.stringify(T.chamGiu.hoanTac));
      await choHoanTacTat(page);
    }
    // K2: chip lọc khu, nút đám mây trên đầu, chạm 2 lần mở chi tiết việc
    await bungTrong();
    {
      const chipCT = page.locator('nav[aria-label="Khu vực làm việc"]').getByRole('button', { name: /^CT( \d+)?$/ });
      const c1 = await tamNut(chipCT);
      await chamGiu(cdp, c1.x, c1.y, 100);
      await page.waitForTimeout(400);
      T.chamGiu.chipLoc = await chipCT.getAttribute('aria-pressed');
      if (T.chamGiu.chipLoc !== 'true') ketQua.loi.push('Chạm giữ 100ms vào chip lọc CT khi ô bung, trống: không trúng chip');
    }
    await bungTrong();
    {
      const dam = await tamNut(page.locator('button[aria-haspopup="menu"]'));
      await chamGiu(cdp, dam.x, dam.y, 100);
      await page.waitForTimeout(700);
      T.chamGiu.nutDau = await page.locator('[role="menu"]').count();
      if (T.chamGiu.nutDau !== 1) ketQua.loi.push('Chạm giữ 100ms vào nút "…" khi ô bung, trống: không mở bảng');
      else { await page.keyboard.press('Escape'); await page.waitForTimeout(700); }
    }
    await page.locator('nav[aria-label="Khu vực làm việc"]').getByRole('button', { name: /^Tất cả( \d+)?$/ }).tap(); // bỏ lọc CT để thấy dòng NICU
    await page.waitForTimeout(300);
    await bungTrong();
    {
      const dongV = page.locator('.swipe', { hasText: 'Hội chẩn ngoại' }).first().locator('.task-main');
      await dongV.scrollIntoViewIfNeeded();
      const c2 = await tamNut(dongV);
      await chamGiu(cdp, c2.x, c2.y, 100);
      await page.waitForTimeout(120);
      const c3 = await tamNut(page.locator('.swipe', { hasText: 'Hội chẩn ngoại' }).first().locator('.task-main'));
      await chamGiu(cdp, c3.x, c3.y, 100);
      await page.waitForTimeout(600);
      T.chamGiu.chiTiet = await page.getByRole('dialog', { name: 'Chi tiết việc' }).count();
      if (T.chamGiu.chiTiet !== 1) ketQua.loi.push('Chạm 2 lần (giữ ngón 100ms) vào dòng việc khi ô bung, trống: không mở chi tiết');
      else { await page.keyboard.press('Escape'); await page.waitForTimeout(700); }
    }
    await page.locator('nav[aria-label="Khu vực làm việc"]').getByRole('button', { name: /^Tất cả( \d+)?$/ }).tap();
  }
  await cdp.detach();
  await ctx.close();
}

// iPhone, bản tối: ảnh ô thêm việc thu gọn / bung (chuẩn bị: Theo máy + prefers-color-scheme tối)
{
  const { ctx, page } = await moApp({ ...IPHONE_OPTS, colorScheme: 'dark' });
  const o = page.getByLabel('Nội dung công việc');
  const dark = await laToiLuc(page);
  if (!dark) ketQua.loi.push('Ảnh ô thêm việc bản tối: app không ở chế độ tối');
  await chup(page, 'iphone-o-them-thu-gon-toi', true);
  await o.tap();
  await page.getByRole('button', { name: 'Nhãn HC', exact: true }).tap();
  await chup(page, 'iphone-o-them-bung-toi', true);
  {
    // bản tối: xoá một việc (vuốt trái) khi ô đang bung; thanh Hoàn tác nằm ngay trên thanh thêm việc
    const cdpT = await ctx.newCDPSession(page);
    const dong = page.locator('.swipe', { hasText: 'Hội chẩn dinh dưỡng giường 7' });
    await dong.scrollIntoViewIfNeeded();
    const bb = await dong.boundingBox();
    await keoDo(cdpT, bb.x + bb.width - 60, -Math.round(bb.width / 3 + 30), bb.y + bb.height / 2);
    await thaTay(cdpT);
    await page.waitForTimeout(700);
    await chamO(page, o);
    await page.waitForTimeout(300);
    const kc = await kiemChe(page);
    ketQua.thuChucNang.hoanTacTrenToi = kc;
    for (const l of kc.loi) ketQua.loi.push('Tối, Hoàn tác trên ô thêm việc: ' + l);
    await chup(page, 'iphone-hoan-tac-tren-o-them-toi', false);
    await page.locator('.hoantac').getByRole('button', { name: 'Hoàn tác', exact: true }).click();
    await cdpT.detach();
    await chamO(page, o);
    await page.getByRole('button', { name: 'Nhãn HC', exact: true }).tap(); // trả lại trạng thái cho phép đo bên dưới
    await page.waitForTimeout(250);
  }
  {
    // bản tối: nút nhãn đã chọn nền nhạt của nhãn; chip khu đang chọn nền xanh; ô gõ có viền xanh
    const k = await page.evaluate(() => { const cs = (e) => getComputedStyle(e); const f = document.querySelector('.task-form-ph'); return { nenForm: cs(f).backgroundColor, o: cs(f.querySelector('input')).borderTopColor, hc: cs(f.querySelector('[aria-label="Nhãn HC"]')).backgroundColor, chip: cs(f.querySelector('.chip.on')).backgroundColor }; });
    ketQua.thuChucNang.oThemViecToi = k;
    if (k.hc === 'rgba(0, 0, 0, 0)' || k.chip === 'rgba(0, 0, 0, 0)') ketQua.loi.push('Tối: nút nhãn / chip khu đã chọn không có nền ' + JSON.stringify(k));
  }
  await ctx.close();
}

// iPhone: thanh thêm việc và thanh Hoàn tác theo bàn phím — dùng visualViewport GIẢ (KHÔNG phải bàn phím iPhone thật)
{
  const { ctx, page } = await moApp(IPHONE_OPTS, {
    init: () => {
      const vv = new EventTarget();
      Object.assign(vv, { width: 393, height: 852, offsetTop: 0, offsetLeft: 0, scale: 1 });
      Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true });
      window.__vv = vv;
    }
  });
  const T = ketQua.thuChucNang.banPhimGia = { luuY: 'visualViewport giả (cao 561 = 852 - 291), không phải bàn phím iPhone thật' };
  const BAN_PHIM = 291;
  const datBanPhim = (cao) => page.evaluate((c) => { window.__vv.height = c; window.__vv.dispatchEvent(new Event('resize')); }, cao);
  const form = page.locator('.task-form-ph');
  const o = page.getByLabel('Nội dung công việc');
  const duoiForm = async () => { const b = await form.boundingBox(); return Math.round(b.y + b.height); };
  T.duoiTruoc = await duoiForm();
  await o.tap();
  await page.waitForTimeout(200);
  await datBanPhim(852 - BAN_PHIM);
  await page.waitForTimeout(300);
  T.duoiKhiMo = await duoiForm();
  T.lopKb = await form.evaluate((f) => f.classList.contains('kb'));
  if (!T.lopKb || Math.abs(T.duoiKhiMo - (852 - BAN_PHIM)) > 1) ketQua.loi.push('Thanh thêm việc không nằm sát trên bàn phím giả: đáy ' + T.duoiKhiMo + ' (cần ' + (852 - BAN_PHIM) + ')');
  {
    // minh hoạ: vẽ hộp "bàn phím" giả ở đáy chỉ cho ảnh chụp rồi gỡ
    await page.evaluate((c) => { const d = document.createElement('div'); d.id = 'ban-phim-gia'; d.textContent = 'Bàn phím mô phỏng (không phải bàn phím thật)'; d.style.cssText = `position:fixed;left:0;right:0;bottom:0;height:${c}px;background:#CBD3DA;color:#2C3E4E;font:13px sans-serif;display:flex;align-items:center;justify-content:center;z-index:200`; document.body.appendChild(d); }, BAN_PHIM);
    await chup(page, 'iphone-o-them-ban-phim-gia', true);
  }
  // dòng ô gõ + "+" vẫn thấy và chạm được trên bàn phím
  T.thayDuocNut = await page.evaluate(() => { const r = document.querySelector('.tf-plus').getBoundingClientRect(); const e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!e?.closest('.tf-plus'); });
  if (!T.thayDuocNut) ketQua.loi.push('Bàn phím giả: nút "+" bị che / không chạm được');
  // thanh Hoàn tác xoá cũng nằm sát trên bàn phím giả
  {
    const cdp = await ctx.newCDPSession(page);
    const dong = page.locator('.swipe').first();
    const tenXoa = ((await dong.locator('.task-text').textContent()) || '').trim();
    await dong.scrollIntoViewIfNeeded();
    const b2 = await dong.boundingBox();
    if (b2 && b2.y + b2.height < 852 - BAN_PHIM - 20) {
      await keoDo(cdp, b2.x + b2.width - 60, -Math.round(b2.width / 3 + 30), b2.y + b2.height / 2);
      await thaTay(cdp);
      await page.waitForTimeout(700);
    }
    if (!(await page.locator('.hoantac').count())) ketQua.loi.push('Bàn phím giả: không xoá được dòng thử nên không đo được thanh Hoàn tác');
    else {
      // thu gọn (sau khi vuốt, ô tự thu lại) rồi bung lại: thanh Hoàn tác luôn trên thanh thêm việc, ô gõ và "+" không bị che
      T.hoanTacBanPhimThuGon = await kiemChe(page);
      for (const l of T.hoanTacBanPhimThuGon.loi) ketQua.loi.push('Bàn phím giả, thu gọn: ' + l);
      await chamO(page, o);
      T.hoanTacBanPhimBung = await kiemChe(page);
      for (const l of T.hoanTacBanPhimBung.loi) ketQua.loi.push('Bàn phím giả, bung: ' + l);
      const hb = await page.locator('.hoantac').boundingBox();
      if (hb.y + hb.height > 852 - BAN_PHIM + 1) ketQua.loi.push('Bàn phím giả: thanh Hoàn tác nằm dưới mép bàn phím');
      await page.evaluate((c) => { const d = document.createElement('div'); d.id = 'ban-phim-gia'; d.textContent = 'Bàn phím mô phỏng (không phải bàn phím thật)'; d.style.cssText = `position:fixed;left:0;right:0;bottom:0;height:${c}px;background:#CBD3DA;color:#2C3E4E;font:13px sans-serif;display:flex;align-items:center;justify-content:center;z-index:200`; document.body.appendChild(d); }, BAN_PHIM);
      await chup(page, 'iphone-hoan-tac-ban-phim-gia', false);
      await page.evaluate(() => document.getElementById('ban-phim-gia')?.remove());
      // chạm THẬT một lần vào Hoàn tác khi ô bung và trống, bàn phím giả: phải khôi phục đúng, ô vẫn bung
      const cbk = await tamNut(page.locator('.hoantac').getByRole('button', { name: 'Hoàn tác', exact: true }));
      await page.touchscreen.tap(cbk.x, cbk.y);
      await page.waitForTimeout(500);
      T.chamHoanTacBanPhimGia = { khoiPhuc: (await docViec(page, tenXoa))[0]?.deleted === false, bung: await form.evaluate((f) => f.classList.contains('mo')) };
      if (!T.chamHoanTacBanPhimGia.khoiPhuc || !T.chamHoanTacBanPhimGia.bung) ketQua.loi.push('Bàn phím giả: chạm Hoàn tác (ô bung, trống) không khôi phục hoặc làm ô thu lại: ' + JSON.stringify(T.chamHoanTacBanPhimGia));
    }    await cdp.detach();
  }
  await page.evaluate(() => document.getElementById('ban-phim-gia')?.remove());
  // bảng dưới (Sheet) vẫn co theo khung giả sau khi gộp cách tính
  await o.fill(''); await page.touchscreen.tap(60, 45); await page.waitForTimeout(250);
  await chonBangThem(page, 'Thư viện viết tắt', true);
  await page.getByRole('dialog', { name: 'Thư viện viết tắt' }).waitFor();
  await page.waitForTimeout(600);
  T.sheetCoTheoBanPhim = await page.evaluate(() => { const w = document.querySelector('.sheet-wrap'); const r = w.getBoundingClientRect(); return { kb: w.classList.contains('kb'), cao: Math.round(r.height) }; });
  if (!T.sheetCoTheoBanPhim.kb || T.sheetCoTheoBanPhim.cao !== 852 - BAN_PHIM) ketQua.loi.push('Sheet không co theo visualViewport giả: ' + JSON.stringify(T.sheetCoTheoBanPhim));
  await datBanPhim(852);
  await page.waitForTimeout(200);
  T.sheetSauKhiDong = await page.evaluate(() => document.querySelector('.sheet-wrap').classList.contains('kb'));
  if (T.sheetSauKhiDong) ketQua.loi.push('Bàn phím giả đóng mà Sheet vẫn ở chế độ kb');
  await ctx.close();
}

// PC
{
  const { ctx, page } = await moApp({ viewport: { width: 1440, height: 900 } });
  {
    // v9.3: máy tính giữ nguyên form thêm việc cũ (ô chọn khu, 5 nhãn, nút chữ "Thêm việc")
    const f = await page.locator('.task-form-pc').evaluate((e) => ({ select: !!e.querySelector('select'), nut: [...e.querySelectorAll('button[type=submit]')].map((b) => b.textContent.trim()), nhan: e.querySelectorAll('.tag-btn').length, chuNhan: /Nhãn/.test(e.textContent), tf: !!e.querySelector('.tf-row') }));
    ketQua.thuChucNang.pcFormThemViec = f;
    if (!f.select || f.nut.join() !== 'Thêm việc' || f.nhan !== 5 || !f.chuNhan || f.tf) ketQua.loi.push('PC: form thêm việc đã đổi bố cục ' + JSON.stringify(f));
  }
  await chup(page, 'pc-viec-sang', false);
  {
    const hang = page.locator('.swipe', { hasText: 'Báo kết quả CRP' });
    await hang.hover();
    await page.waitForTimeout(300);
    const nut = hang.locator('.swipe-del');
    const hn = await nut.boundingBox();
    const vungNhan = await hang.locator('.tag-zone').boundingBox();
    // v9.2: nút thùng rác nền #FBEAE8, biểu tượng #A8473D, 44×44, nằm cạnh nhãn (thay phép kiểm cũ: viền đỏ, không nền)
    const kieuNut = await nut.evaluate((e) => ({ nen: getComputedStyle(e).backgroundColor, chu: getComputedStyle(e).color, svg: e.querySelectorAll('svg').length, nhan: e.getAttribute('aria-label') }));
    const T = ketQua.thuChucNang.pcReChuot = {
      nutRong: Math.round(hn?.width || 0), nutCao: Math.round(hn?.height || 0),
      nhanVanHien: await hang.locator('.tag-dot').first().isVisible(),
      nutNamCanhNhan: !!hn && !!vungNhan && hn.x >= vungNhan.x + vungNhan.width - 1 && Math.abs((hn.y + hn.height / 2) - (vungNhan.y + vungNhan.height / 2)) < 10,
      nen: kieuNut.nen, bieuTuong: kieuNut.chu,
      nenDung: kieuNut.nen === 'rgb(251, 234, 232)' && kieuNut.nen === (await mauBien(page, '--delBg')),
      bieuTuongDung: kieuNut.chu === 'rgb(168, 71, 61)' && kieuNut.chu === (await mauBien(page, '--delInk')),
      chiBieuTuong: ((await nut.textContent()) || '').trim() === '' && kieuNut.svg === 1 && /^Xoá việc: /.test(kieuNut.nhan || '')
    };
    if (!hn || Math.round(hn.width) !== 44) ketQua.loi.push('PC: rê chuột vào dòng không hiện nút xoá 44px (rộng ' + T.nutRong + ')');
    if (hn && Math.round(hn.height) !== 44) ketQua.loi.push('PC: nút xoá cao ' + T.nutCao + 'px (cần 44)');
    if (!T.nhanVanHien) ketQua.loi.push('PC: rê chuột làm ẩn cụm nhãn');
    if (!T.nutNamCanhNhan) ketQua.loi.push('PC: nút xoá không nằm cạnh cụm nhãn');
    if (!T.nenDung) ketQua.loi.push('PC: nền nút xoá ' + kieuNut.nen + ' (cần #FBEAE8 = --delBg)');
    if (!T.bieuTuongDung) ketQua.loi.push('PC: biểu tượng nút xoá ' + kieuNut.chu + ' (cần #A8473D = --delInk)');
    if (!T.chiBieuTuong) ketQua.loi.push('PC: nút xoá còn chữ / thiếu biểu tượng / thiếu aria-label');
    await chup(page, 'pc-viec-re-chuot', false);
    await hang.locator('.task-main').dblclick();
    await page.waitForTimeout(300);
    const mo = await page.getByRole('dialog', { name: 'Chi tiết việc' }).count();
    ketQua.thuChucNang.pcNhapDupChiTiet = mo;
    if (mo !== 1) ketQua.loi.push('PC: nhấp đúp vào dòng không mở chi tiết việc');
    await chup(page, 'pc-chi-tiet-viec', false);
    await page.keyboard.press('Escape'); await page.waitForTimeout(600); // chờ bảng trượt xuống xong
    await page.waitForTimeout(200);
    // Tab: nút Xoá vẫn nằm trong thứ tự Tab (hiện ra khi được focus)
    await page.mouse.move(5, 5);
    const nut2 = page.locator('.swipe', { hasText: 'Hội chẩn dinh dưỡng giường 7' }).locator('.swipe-del');
    await page.locator('.swipe', { hasText: 'Hội chẩn dinh dưỡng giường 7' }).locator('.task-main').focus();
    await page.keyboard.press('Tab');
    const tab = await page.evaluate(() => document.activeElement?.getAttribute('aria-label') || '');
    ketQua.thuChucNang.pcTab = tab;
    if (!/^Xoá việc: Hội chẩn dinh/.test(tab)) ketQua.loi.push('PC: Tab không tới được nút Xoá (đang ở: ' + tab + ')');
    else if ((await nut2.boundingBox())?.width < 44) ketQua.loi.push('PC: nút Xoá được focus bằng Tab nhưng không hiện');
    await page.locator('body').click({ position: { x: 5, y: 5 } });
    {
      // v9.2: PC bấm thùng rác → xoá mềm + thanh Hoàn tác; Hoàn tác trả lại dòng; PC không rê-kéo (chuột kéo ngang không làm gì)
      const T2 = ketQua.thuChucNang.pcXoaHoanTac = {};
      const h = page.locator('.swipe', { hasText: 'Gọi người nhà giường 12' });
      const b0 = await h.boundingBox();
      await page.mouse.move(b0.x + 40, b0.y + b0.height / 2);
      await page.mouse.down();
      await page.mouse.move(b0.x + 260, b0.y + b0.height / 2, { steps: 8 });
      await page.mouse.up();
      T2.keoBangChuot = { dich: (await doDong(h)).dich, done: (await docViec(page, 'Gọi người nhà giường 12'))[0].done };
      if (T2.keoBangChuot.dich !== 0 || T2.keoBangChuot.done) ketQua.loi.push('PC: kéo bằng chuột lại vuốt được dòng ' + JSON.stringify(T2.keoBangChuot));
      await h.hover();
      await page.waitForTimeout(250);
      await h.getByRole('button', { name: /^Xoá việc: Gọi người nhà/ }).click();
      await page.waitForTimeout(700);
      T2.sauXoa = { conDong: await h.count(), deleted: (await docViec(page, 'Gọi người nhà giường 12'))[0].deleted, thanh: ((await page.locator('.hoantac').textContent().catch(() => '')) || '').trim() };
      if (T2.sauXoa.conDong !== 0 || !T2.sauXoa.deleted || !/^Đã xoá: Gọi người nhà giường 12.*Hoàn tác$/.test(T2.sauXoa.thanh)) ketQua.loi.push('PC: bấm thùng rác chưa xoá/hiện Hoàn tác ' + JSON.stringify(T2.sauXoa));
      await chup(page, 'pc-hoan-tac', false);
      await page.locator('.hoantac').getByRole('button', { name: 'Hoàn tác', exact: true }).click();
      await page.waitForTimeout(500);
      if ((await h.count()) !== 1 || (await docViec(page, 'Gọi người nhà giường 12'))[0].deleted) ketQua.loi.push('PC: Hoàn tác không trả lại dòng');
    }
  }
  {
    const T = ketQua.thuChucNang.vietTatPc = {};
    await thuGoNhanh(page, T, 'pc', false);
    await thuThuVien(page, T, 'pc', null);
  }
  await page.getByRole('button', { name: 'Khám', exact: true }).click();
  await page.getByRole('button', { name: /Lấy danh sách/ }).click();
  await page.waitForTimeout(400);
  {
    // v9.4, PC: dòng bé không có nút xoá / ô vuông, không rê-kéo bằng chuột; Tab + Enter mở chi tiết ở cột phải;
    // "Xong" và nút X đều đóng cột phải; "+" thêm bé (con trỏ vào ô mã); xoá bé vẫn hỏi xác nhận đúng tên mã
    const T = ketQua.thuChucNang.khamPc = {};
    const loi = (m) => ketQua.loi.push('PC Khám 9.4: ' + m);
    const aside = page.locator('aside[aria-label="Chi tiết bệnh nhân"]');
    const g03 = dongBe(page, 'G03');
    await g03.hover();
    await page.waitForTimeout(250);
    T.nutXoaDongBe = await page.locator('.pat-row .swipe-del').count() + await page.locator('.swipe:has(.pat-row) .swipe-del').count();
    if (T.nutXoaDongBe) loi('dòng bé có nút xoá khi rê chuột');
    T.cuNutCu = await page.evaluate(() => ({ chk: document.querySelectorAll('.chk, .mini-box, .add-dashed').length, nutLong: document.querySelectorAll('button button').length }));
    if (T.cuNutCu.chk || T.cuNutCu.nutLong) loi('còn ô vuông / ô gạch đứt / nút lồng nút ' + JSON.stringify(T.cuNutCu));
    const b0 = await g03.boundingBox();
    await page.mouse.move(b0.x + 40, b0.y + b0.height / 2);
    await page.mouse.down();
    await page.mouse.move(b0.x + 300, b0.y + b0.height / 2, { steps: 8 });
    await page.mouse.up();
    T.keoBangChuot = { dich: (await doDong(g03)).dich, daKham: (await docBe(page, 'G03'))[0].done };
    if (T.keoBangChuot.dich !== 0 || T.keoBangChuot.daKham) loi('kéo bằng chuột làm dòng bé dịch hoặc đã khám ' + JSON.stringify(T.keoBangChuot));
    if (await aside.count()) { await aside.getByRole('button', { name: 'Đóng chi tiết', exact: true }).click(); await page.waitForTimeout(200); } // thả chuột trên nút có thể mở chi tiết: đóng lại cho phép kiểm sau
    // Tab + Enter mở chi tiết (dòng bé là nút thật, không lồng nút)
    await dongBe(page, 'G12').locator('.pat-open').focus();
    await page.keyboard.press('Enter');
    await aside.waitFor();
    T.tabEnter = await page.evaluate(() => ({ ma: document.getElementById('be-ma')?.value, conTro: document.activeElement?.id === 'be-ma', chip: document.querySelector('.be-phong')?.textContent }));
    if (T.tabEnter.ma !== 'G12' || T.tabEnter.conTro || T.tabEnter.chip !== 'Phòng 2') loi('Tab + Enter không mở đúng chi tiết G12 ' + JSON.stringify(T.tabEnter));
    T.cotPhai = await aside.evaluate((e) => ({ cuonNgang: e.scrollWidth > e.clientWidth, o3: [...e.querySelectorAll('.be-3 input')].map((i) => Math.round(i.getBoundingClientRect().top)), nutDong: e.querySelector('.be-head .icon-btn')?.getAttribute('aria-label') }));
    if (T.cotPhai.cuonNgang || new Set(T.cotPhai.o3).size !== 1) loi('cột phải: ba ô không cùng hàng / cuộn ngang ' + JSON.stringify(T.cotPhai));
    await aside.getByRole('button', { name: 'Xong', exact: true }).click();
    await page.waitForTimeout(300);
    T.xongDongCotPhai = await aside.count();
    if (T.xongDongCotPhai) loi('"Xong" không đóng chi tiết ở cột phải');
    await page.locator('.pat-open', { hasText: 'G01' }).click();
    await aside.waitFor();
    await chup(page, 'pc-kham-sang', false);
    await aside.getByRole('button', { name: 'Đóng chi tiết', exact: true }).click();
    await page.waitForTimeout(300);
    if (await aside.count()) loi('nút X không đóng chi tiết ở cột phải');
    // "+" ở Phòng 3 (đang trống): thêm bé, con trỏ vào ô mã, gõ mã, lưu nốt, xoá có hỏi xác nhận
    await page.getByRole('button', { name: 'Thêm bé vào Phòng 3', exact: true }).click();
    await aside.waitFor();
    await page.waitForTimeout(300);
    T.congPc = await page.evaluate(() => ({ conTro: document.activeElement?.id === 'be-ma', ma: document.getElementById('be-ma').value, chip: document.querySelector('.be-phong')?.textContent }));
    if (!T.congPc.conTro || T.congPc.ma !== '' || T.congPc.chip !== 'Phòng 3') loi('"+" ở PC: con trỏ chưa vào ô mã ' + JSON.stringify(T.congPc));
    await page.keyboard.type('TMPC');
    await page.waitForTimeout(700);
    if (!(await docBe(page, 'TMPC')).length) loi('bé mới trên PC chưa lưu mã');
    page.once('dialog', async (d) => { T.hoiXoaPc = d.message(); await d.accept(); });
    await aside.getByRole('button', { name: 'Xoá khỏi hôm nay', exact: true }).click();
    await page.waitForTimeout(700);
    if (T.hoiXoaPc !== 'Xoá TMPC khỏi danh sách hôm nay?') loi('câu hỏi xoá trên PC: "' + T.hoiXoaPc + '"');
    if ((await aside.count()) || !(await docBe(page, 'TMPC'))[0]?.deleted) loi('xoá bé thử trên PC chưa xong');
    // tổng hợp y lệnh: nút và nút "Soạn lại" đổi tên
    await page.getByRole('button', { name: 'Tổng hợp y lệnh', exact: true }).click();
    T.soanLaiPc = await page.getByRole('region', { name: 'Tổng hợp y lệnh' }).getByRole('button', { name: 'Soạn lại', exact: true }).count();
    if (T.soanLaiPc !== 1) loi('thiếu nút "Soạn lại" ở Tổng hợp y lệnh trên PC');
  }
  {
    // v9.1: PC cũng bỏ nút sáng/tối; bảng "Sao lưu và cài đặt" vẫn có chức năng cũ (xuất, nhập, thư mục)
    const T = ketQua.thuChucNang.pcCaiDat = {};
    T.nutCu = await page.getByRole('button', { name: /Chuyển sang giao diện/ }).count();
    if (T.nutCu) ketQua.loi.push('PC: nút sáng/tối trên đầu vẫn còn');
    T.nutDauTrang = await page.locator('.pc-top .round-btn').evaluateAll((es) => es.map((e) => e.getAttribute('aria-label')));
    if (T.nutDauTrang.length !== 2 || T.nutDauTrang[0] !== 'Thư viện viết tắt' || !/^Sao lưu và cài đặt/.test(T.nutDauTrang[1])) ketQua.loi.push('PC: đầu trang không đúng /a và đám mây: ' + T.nutDauTrang.join(' | '));
    const hop = await moCaiDat(page);
    T.nutTrongBang = (await hop.locator('button, label.btn').allTextContents()).map((s) => s.trim()).filter(Boolean);
    for (const can of ['Xuất sao lưu', 'Nhập từ file…']) if (!T.nutTrongBang.some((s) => s === can)) ketQua.loi.push('PC: bảng cài đặt thiếu nút "' + can + '"');
    if (!T.nutTrongBang.some((s) => /Thư mục|Chọn thư mục OneDrive/.test(s))) ketQua.luuY.push('PC: không thấy nút chọn thư mục OneDrive (Chromium headless có thể không có showDirectoryPicker)');
    await chup(page, 'pc-cai-dat-sang', false);
    await dongCaiDat(page, hop);
  }
  {
    // v9.4 (bác sĩ đồng ý 06/11/2026): PC, ô thêm việc thay chữ tắt ở cuối khi bấm "Thêm việc" hoặc Enter
    const T = ketQua.thuChucNang.luuVietTatPc = {};
    await page.getByRole('button', { name: 'Việc', exact: true }).click();
    const o = page.getByLabel('Nội dung công việc');
    const ghi = async (ten) => (await docViec(page, ten)).filter((t) => !t.deleted).length;
    await o.click();
    await page.keyboard.type('Làm /ctm');
    await page.getByRole('button', { name: 'Thêm việc', exact: true }).click();
    await page.waitForTimeout(400);
    T.bamThem = { co: await ghi('Làm Công thức máu'), o: await o.inputValue() };
    if (T.bamThem.co !== 1 || T.bamThem.o !== '') ketQua.loi.push('PC: bấm "Thêm việc" khi ô có "Làm /ctm" chưa thành "Làm Công thức máu" ' + JSON.stringify(T.bamThem));
    await page.keyboard.type('Xem /kmdm');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(400);
    T.enter = await ghi('Xem Khí máu động mạch');
    if (T.enter !== 1) ketQua.loi.push('PC: Enter khi ô có "Xem /kmdm" chưa thành "Xem Khí máu động mạch"');
    for (const [go, can] of [['Ăn 8/10', 'Ăn 8/10'], ['Ghi /khongco', 'Ghi /khongco'], ['Đo x/kmdm', 'Đo x/kmdm'], ['/ctm', 'Công thức máu'], ['Làm /ctm  ', 'Làm Công thức máu']]) {
      await page.keyboard.type(go);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(350);
      const n = await ghi(can);
      if (n < 1) ketQua.loi.push(`PC: lưu "${go}" phải ra "${can}" (không thấy)`);
    }
    if ((await page.locator('.hoantac').count()) || (await page.locator('.vt-toast').count())) ketQua.loi.push('PC: lưu có thay chữ tắt mà còn hiện thanh Hoàn tác / thanh "Đã đổi"');
  }
  await ctx.close();
}
// v9.4, iPhone: ô thêm việc thay chữ tắt ở cuối khi bấm "+" (chạm thật, một lần) hoặc Enter; không cần thanh Hoàn tác
{
  const { ctx, page } = await moApp(IPHONE_OPTS);
  const T = ketQua.thuChucNang.luuVietTatIphone = {};
  const o = page.getByLabel('Nội dung công việc');
  const ghi = async (ten) => (await docViec(page, ten)).filter((t) => !t.deleted).length;
  const cong = page.getByRole('button', { name: 'Thêm việc', exact: true });
  await chamO(page, o); // ô gõ tới khi nhận con trỏ (bộ đệm sẵn có của bước kiểm ô thêm việc)
  await page.keyboard.type('Làm /ctm');
  await chamMot(page, cong);
  await page.waitForTimeout(450);
  T.bamCong = { co: await ghi('Làm Công thức máu'), o: await o.inputValue(), conTro: await page.evaluate(() => document.activeElement?.id), thanhDaDoi: await page.locator('.vt-toast').count(), hoanTac: await page.locator('.hoantac').count() };
  if (T.bamCong.co !== 1 || T.bamCong.o !== '' || T.bamCong.conTro !== 'ph-draft' || T.bamCong.thanhDaDoi || T.bamCong.hoanTac) ketQua.loi.push('iPhone: bấm "+" khi ô có "Làm /ctm" sai ' + JSON.stringify(T.bamCong));
  await page.keyboard.type('Xem /kmdm');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(450);
  T.enter = await ghi('Xem Khí máu động mạch');
  if (T.enter !== 1) ketQua.loi.push('iPhone: Enter khi ô có "Xem /kmdm" chưa thành "Xem Khí máu động mạch"');
  for (const [go, can] of [['Chia 8/10', 'Chia 8/10'], ['Ghi /khongco', 'Ghi /khongco'], ['/ctm', 'Công thức máu']]) {
    await page.keyboard.type(go);
    await chamMot(page, cong);
    await page.waitForTimeout(350);
    if ((await ghi(can)) < 1) ketQua.loi.push(`iPhone: lưu "${go}" phải ra "${can}" (không thấy)`);
  }
  await ctx.close();
}
// v9.4, iPhone màn hẹp 320px: danh sách và chi tiết bé không tràn ngang; kết quả tuổi "123 ngày", "42w4d" không bị cắt; chữ ô nhập 16px
{
  const { ctx, page } = await moApp({ viewport: { width: 320, height: 700 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IPHONE_UA });
  const T = ketQua.thuChucNang.man320 = {};
  await page.getByRole('button', { name: 'Khám', exact: true }).click();
  await chonBangThem(page, /^Lấy danh sách/);
  await page.waitForTimeout(500);
  T.danhSach = await page.evaluate(() => ({ trang: document.documentElement.scrollWidth - innerWidth, main: (() => { const m = document.querySelector('.ph-main'); return m.scrollWidth - m.clientWidth; })(), nutCongNgoai: [...document.querySelectorAll('.room-add')].some((e) => e.getBoundingClientRect().right > innerWidth) }));
  if (T.danhSach.trang > 0 || T.danhSach.main > 0 || T.danhSach.nutCongNgoai) ketQua.loi.push('Màn 320: danh sách Khám bị tràn ngang ' + JSON.stringify(T.danhSach));
  await chup(page, 'iphone-kham-320', true);
  await chamMot(page, dongBe(page, 'G01').locator('.pat-open'));
  const bang = page.getByRole('dialog', { name: 'Chi tiết bệnh nhân' });
  await bang.waitFor();
  await page.waitForTimeout(600);
  await bang.getByLabel('Ngày sinh', { exact: true }).fill('2006');
  await chamMot(page, bang.getByRole('button', { name: 'Tính tuần tuổi', exact: true }));
  await page.waitForTimeout(300);
  T.chiTiet = await page.evaluate(() => {
    const s = document.querySelector('.sheet'), kq = document.querySelector('.be-kq').getBoundingClientRect();
    const o = [...document.querySelectorAll('.be-3 input, #be-ma')];
    return { tranSheet: s.scrollWidth - s.clientWidth, trang: document.documentElement.scrollWidth - innerWidth, chu: document.querySelector('.be-kq').textContent.trim(),
      cat: [...document.querySelectorAll('.be-kq b')].filter((b) => b.scrollWidth > b.clientWidth + 0.5 || b.getBoundingClientRect().right > kq.right + 0.5).map((b) => b.textContent),
      o3: [...document.querySelectorAll('.be-3 input')].map((e) => { const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right) }; }),
      coO: o.map((e) => parseFloat(getComputedStyle(e).fontSize)), duoi: [...document.querySelectorAll('.sheet-r4 button')].map((e) => { const r = e.getBoundingClientRect(); return { chu: e.textContent.trim(), cao: Math.round(r.height), r: Math.round(r.right) }; }) };
  });
  const c320 = T.chiTiet;
  if (c320.tranSheet > 0 || c320.trang > 0) ketQua.loi.push('Màn 320: chi tiết bé tràn ngang ' + JSON.stringify({ sheet: c320.tranSheet, trang: c320.trang }));
  if (!/123 ngày/.test(c320.chu) || !/42w4d/.test(c320.chu) || c320.cat.length) ketQua.loi.push('Màn 320: kết quả tuổi bị cắt hoặc sai ' + JSON.stringify({ chu: c320.chu, cat: c320.cat }));
  if (c320.o3.some((x) => x.l < 0 || x.r > 320) || c320.coO.some((f) => f < 16)) ketQua.loi.push('Màn 320: ba ô tràn khung hoặc chữ < 16px ' + JSON.stringify({ o3: c320.o3, coO: c320.coO }));
  if (c320.duoi.some((x) => x.r > 320)) ketQua.loi.push('Màn 320: hàng nút cuối tràn ' + JSON.stringify(c320.duoi));
  await chup(page, 'iphone-chi-tiet-be-320', true);
  await ctx.close();
}// PC: người đã có 'dark' hoặc 'light' lưu từ bản cũ giữ nguyên giao diện sau khi cập nhật, kể cả khi máy báo ngược lại
for (const [cu, maySang, kyVong] of [['dark', 'light', true], ['light', 'dark', false]]) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: maySang });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await ctx.addInitScript((v) => { try { if (!sessionStorage.getItem('__da')) { localStorage.setItem('theme', v); sessionStorage.setItem('__da', '1'); } } catch { /* bỏ qua */ } }, cu);
  const page = await ctx.newPage();
  page.on('pageerror', (e) => ketQua.loi.push('Lỗi chạy trang: ' + e.message));
  await page.goto(URL);
  await page.waitForSelector('.pc');
  await page.waitForTimeout(300);
  const toi = await laToiLuc(page);
  const giu = await page.evaluate(() => localStorage.getItem('theme'));
  ketQua.thuChucNang['giaTriCu_' + cu] = { maySang, toi, giu };
  if (toi !== kyVong || giu !== cu) ketQua.loi.push(`Giá trị theme cũ "${cu}" (máy ${maySang}): giao diện tối=${toi}, đã lưu "${giu}" — phải giữ nguyên`);
  await ctx.close();
}
// Chưa có giá trị theme: Theo máy, và không tự ghi gì vào localStorage
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'dark' });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  await page.goto(URL);
  await page.waitForSelector('.pc');
  await page.waitForTimeout(300);
  const toi = await laToiLuc(page);
  const giu = await page.evaluate(() => localStorage.getItem('theme'));
  ketQua.thuChucNang.chuaCoTheme = { maySang: 'dark', toi, giu };
  if (!toi || giu !== null) ketQua.loi.push(`Chưa có theme, máy tối: giao diện tối=${toi}, đã lưu "${giu}" (mong đợi tối, chưa lưu gì)`);
  await ctx.close();
}
// ---------- v9.5: lịch mới (Việc, Khám), xem lại ngày trước (chỉ xem), Chép sang hôm nay, tổng hợp nhiều ngày ----------
// Dữ liệu mẫu thêm CHỈ cho các phép kiểm này (đặt trên dữ liệu mẫu chung): việc sót ở nhiều ngày; bé ngày 18 và 19/10, trong đó có
// bé ở PHÒNG ĐÃ XOÁ, bé KHÔNG MÃ, hai bé TRÙNG MÃ cùng phòng cùng ngày, và một dòng ĐÃ XOÁ (không được tính, không được hiện).
const seedLich = async (page) => page.evaluate(async () => {
  const open = () => new Promise((res, rej) => { const r = indexedDB.open('ghichu-sosinh'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const db = await open();
  const all = (store) => new Promise((res) => { const r = db.transaction(store).objectStore(store).getAll(); r.onsuccess = () => res(r.result); });
  const rooms = (await all('rooms')).sort((a, b) => a.order - b.order);
  const t0 = Date.now() + 5000; let n = 0;
  const row = (x) => ({ deleted: false, createdAt: t0 + n, updatedAt: t0 + (n++), deviceId: 'mau', ...x });
  const tasks = [
    ['2026-10-14', 'NICU', 'Việc sót ngày 14', false], ['2026-10-19', 'NICU', 'Việc sót 19 a', false], ['2026-10-19', 'CT', 'Việc sót 19 b', false], ['2026-10-19', 'KAN', 'Việc xong 19', true],
    ['2026-10-20', 'NICU', 'Việc sót ngày 20', false], ['2026-10-23', 'NICU', 'Việc ngày 23', false], ['2026-10-28', 'CT', 'Việc 28 a', false], ['2026-10-28', 'KAN', 'Việc 28 b', false]
  ].map(([date, zone, text, done], i) => row({ id: 'lich-t' + i, date, zone, tags: [], text, done }));
  const phongXoa = row({ id: 'phong-xoa', name: 'Phòng cũ', order: 9, deleted: true });
  const pats = [];
  // v9.6: giờ tạo cùng ngày với examDate (trưa) như dữ liệu thật — nếu để giờ máy giả (21/10) thì tuổi dòng đã qua bị tính tới 21/10
  const be = (id, examDate, room, code, dob, ga, wt, done, extra = {}) => pats.push(row({ id, examDate, roomId: room, code, dob, ga, wt, note: '', done, order: pats.length + 1, createdAt: new Date(+examDate.slice(0, 4), +examDate.slice(5, 7) - 1, +examDate.slice(8, 10), 12, 0, 0).getTime() + pats.length, ...extra }));
  be('l18-g01', '2026-10-18', rooms[0].id, 'G01', '0508', '25', '1800', true);
  be('l18-g03', '2026-10-18', rooms[0].id, 'G03', '2009', '320', '2050', true);
  be('l19-g01', '2026-10-19', rooms[0].id, 'G01', '0508', '25', '1820', true);
  be('l19-g03', '2026-10-19', rooms[0].id, 'G03', '2009', '320', '2070', false);
  be('l19-g12', '2026-10-19', rooms[1].id, 'G12', '0410', '390', '3180', true, { note: 'Theo dõi vàng da' });
  be('l19-g07a', '2026-10-19', rooms[1].id, 'G07', '1509', '300', '1500', true);
  be('l19-g07b', '2026-10-19', rooms[1].id, 'G07', '1509', '300', '1510', false);
  be('l19-khongma', '2026-10-19', rooms[2].id, '', '', '', '', false);
  be('l19-phongxoa', '2026-10-19', 'phong-xoa', 'G99', '0110', '340', '2500', true);
  be('l19-daxoa', '2026-10-19', rooms[0].id, 'GXOA', '0508', '25', '1800', true, { deleted: true });
  const todos = [
    row({ id: 'lt1', patientId: 'l19-g01', text: 'Đo bilirubin', done: false, order: 1 }),
    row({ id: 'lt2', patientId: 'l19-g01', text: 'Cân bé', done: true, order: 2 }),
    row({ id: 'lt3', patientId: 'l19-g03', text: 'Tăng sữa 5 ml/cữ', done: false, order: 1 }),
    row({ id: 'lt4', patientId: 'l19-phongxoa', text: 'Siêu âm não', done: false, order: 1 })
  ];
  const tx = db.transaction(['tasks', 'exam_patients', 'patient_todos', 'rooms'], 'readwrite');
  tasks.forEach((r) => tx.objectStore('tasks').put(r));
  tx.objectStore('rooms').put(phongXoa);
  pats.forEach((r) => tx.objectStore('exam_patients').put(r));
  todos.forEach((r) => tx.objectStore('patient_todos').put(r));
  await new Promise((res) => { tx.oncomplete = res; });
  db.close();
});
async function moAppLich(opts) {
  const r = await moApp(opts);
  await seedLich(r.page);
  await r.page.reload();
  await r.page.waitForSelector('.phone-app, .pc');
  await r.page.waitForTimeout(500);
  try { await r.ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: URL.replace(/\/$/, '') }); } catch { /* không cấp được thì thôi */ }
  return r;
}
// ảnh chụp toàn bộ CSDL (từng dòng, kể cả updatedAt) để chứng minh trang xem ngày trước không ghi gì
const chupDb = async (page) => {
  const o = {};
  for (const b of ['tasks', 'rooms', 'exam_patients', 'patient_todos', 'abbrevs', 'meta']) {
    o[b] = Object.fromEntries((await docBang(page, b)).map((r) => [String(r.id ?? r.key), JSON.stringify(r)]));
  }
  return o;
};
// dòng cũ bị đổi hoặc mất (dòng mới thêm không tính)
const dbDoi = (a, b) => { const x = []; for (const t of Object.keys(a)) for (const k of Object.keys(a[t])) if (b[t][k] !== a[t][k]) x.push(t + ':' + k); return x; };
const dbMoi = (a, b) => Object.keys(b).reduce((n, t) => n + Object.keys(b[t]).filter((k) => !(k in a[t])).length, 0);
// mọi nút đang thấy phải ≥ 44×44 (trừ nền mờ của bảng)
const nutNhoTrang = (page) => page.evaluate(() => {
  const nho = [];
  for (const e of document.querySelectorAll('button')) {
    if (e.classList.contains('sheet-backdrop')) continue;
    const r = e.getBoundingClientRect(), s = getComputedStyle(e);
    if (!r.width || !r.height || s.visibility === 'hidden') continue;
    if (r.width < 43.5 || r.height < 43.5) nho.push(`${(e.getAttribute('aria-label') || e.textContent || e.className).trim().slice(0, 30)} ${Math.round(r.width)}×${Math.round(r.height)}`);
  }
  return nho;
});
// độ tương phản THẬT (WCAG) của mọi chữ đang thấy trong `sel`: chữ trên nền gần nhất có màu đặc; ngày tương lai (đã tắt) tính riêng
const doTuongPhanChu = (page, sel) => page.evaluate((sc) => {
  const root = document.querySelector(sc);
  if (!root) return { loi: 'không thấy ' + sc };
  const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
  const lum = (c) => 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  const tp = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const doc = (s) => { const m = s.match(/[\d.]+/g).map(Number); return { c: m.slice(0, 3), a: m.length > 3 ? m[3] : 1 }; };
  const nen = (e) => {
    for (let x = e; x; x = x.parentElement) {
      if (x.matches?.('.lich-cell.co-dai') && e.closest('.lich-o')) { const p = doc(getComputedStyle(x.querySelector('.lich-dai')).backgroundColor); if (p.a > 0.99) return p.c; }
      const p = doc(getComputedStyle(x).backgroundColor);
      if (p.a > 0.99) return p.c;
    }
    return [255, 255, 255];
  };
  let min = 99, worst = '', xa = 99, n = 0;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let t = w.nextNode(); t; t = w.nextNode()) {
    if (!t.textContent.trim()) continue;
    const e = t.parentElement, r = e.getBoundingClientRect();
    if (!r.width || !r.height || getComputedStyle(e).visibility === 'hidden') continue;
    const r1 = tp(doc(getComputedStyle(e).color).c, nen(e));
    n++;
    if (e.closest('.lich-cell.xa')) { xa = Math.min(xa, r1); continue; }
    if (r1 < min) { min = r1; worst = t.textContent.trim().slice(0, 24); }
  }
  return { min: +min.toFixed(2), worst, soChu: n, ngayTuongLai: xa === 99 ? null : +xa.toFixed(2) };
}, sel);
const kiemTuongPhan = async (page, sel, ten, T, dark) => {
  const r = await doTuongPhanChu(page, sel);
  (T.tuongPhan ||= {})[ten] = r;
  if (r.loi || r.min < 4.5) ketQua.loi.push(`v9.5${dark ? ' tối' : ''}: tương phản chữ ${ten} ${r.loi || r.min + ' (' + r.worst + ')'} < 4,5`);
};
const nutNhoV95 = async (page, ten, dark) => {
  const nho = await nutNhoTrang(page);
  if (nho.length) ketQua.loi.push(`v9.5${dark ? ' tối' : ''}: ${ten} có nút < 44px — ${nho.join('; ')}`);
};
const coChuV95 = async (page, ten, dark) => {
  for (const x of await doCoChu(page)) ketQua.loi.push(`v9.5${dark ? ' tối' : ''}: ${ten}: cỡ chữ ngoài thang 5 bậc — ${x}`);
};
const doiMau = (s) => String(s).replace(/\s+/g, ' ').trim();

// ----- iPhone: toàn bộ luồng, bản sáng và bản tối -----
async function luongIphoneV95(dark) {
  const sfx = dark ? '-toi' : '-sang';
  const E = (s) => ketQua.loi.push(`v9.5${dark ? ' tối' : ''}: ${s}`);
  const { ctx, page } = await moAppLich({ ...IPHONE_OPTS, colorScheme: dark ? 'dark' : 'light' });
  const T = dark ? (ketQua.thuChucNang.lichV95Toi = {}) : (ketQua.thuChucNang.lichV95 = {});
  if ((await laToiLuc(page)) !== dark) E('app không ở đúng chế độ sáng/tối');
  const h1 = async () => doiMau(await page.locator('h1').first().textContent());
  const S0 = await chupDb(page);
  const nut = (hop, ten, exact = true) => hop.getByRole('button', { name: ten, exact });
  const ngay = (hop, d, thang = 10) => hop.getByRole('button', { name: new RegExp(`^Ngày ${d} tháng ${thang}\\b`) });

  // === A. Lịch tab Việc (bảng 16c) ===
  T.badgeLich = doiMau(await page.getByRole('button', { name: 'Mở lịch', exact: true }).locator('.badge').textContent());
  if (T.badgeLich !== '4') E('chấm số trên nút lịch (việc sót) là "' + T.badgeLich + '", cần 4');
  await page.getByRole('button', { name: 'Mở lịch', exact: true }).tap();
  const hopV = page.getByRole('dialog', { name: 'Lịch công việc' });
  await hopV.waitFor();
  await page.waitForTimeout(600);
  T.lichViec = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.lich-cell')];
    const kt = (e) => { const r = e.querySelector('.lich-o').getBoundingClientRect(); return Math.round(r.width) + 'x' + Math.round(r.height); };
    const dem = {};
    for (const e of cells) { const d = e.querySelector('.lich-dem'); if (d.textContent) dem[e.querySelector('.lich-o').textContent] = d.textContent + ':' + d.className.replace('lich-dem ', ''); }
    const rgb = (e) => getComputedStyle(e).backgroundColor;
    return {
      tieuDe: document.querySelector('.lich-tieu-de').textContent, soO: cells.length, caoMin: Math.min(...cells.map((e) => Math.round(e.getBoundingClientRect().height))),
      rongMin: Math.min(...cells.map((e) => Math.round(e.getBoundingClientRect().width))), vong: [...new Set(cells.map(kt))], dem,
      nay: cells.filter((e) => e.classList.contains('nay')).map((e) => e.querySelector('.lich-o').textContent),
      chon: cells.filter((e) => e.classList.contains('chon')).map((e) => e.querySelector('.lich-o').textContent),
      vienNay: getComputedStyle(cells.find((e) => e.classList.contains('nay')).querySelector('.lich-o')).borderTopWidth,
      nenChon: rgb(cells.find((e) => e.classList.contains('chon')).querySelector('.lich-o')),
      nenSot: rgb(document.querySelector('.lich-dem.sot')), nenXanh: rgb(document.querySelector('.lich-dem.xanh')),
      chuGiai: [...document.querySelectorAll('.lich-chu-giai span')].map((e) => e.textContent.trim()),
      sot: (document.querySelector('.lich-sot')?.textContent || '').trim(), veNay: (document.querySelector('.lich-nay-nut')?.textContent || '').trim(),
      chuNhat: getComputedStyle(document.querySelector('.lich-thu .cn')).color, cnSo: getComputedStyle(cells.find((e) => e.classList.contains('cn')).querySelector('.lich-o')).color,
      nut: [...document.querySelectorAll('.lich-nut')].map((e) => [e.getAttribute('aria-label'), Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)])
    };
  });
  const lv = T.lichViec;
  if (lv.tieuDe !== 'Tháng 10, 2026') E('tiêu đề lịch Việc "' + lv.tieuDe + '"');
  if (lv.soO !== 31 || lv.caoMin !== 58 || lv.rongMin < 44) E('ô ngày lịch Việc: ' + JSON.stringify({ soO: lv.soO, caoMin: lv.caoMin, rongMin: lv.rongMin }));
  if (lv.vong.join() !== '40x40') E('vòng tròn ngày không phải 40×40: ' + lv.vong.join());
  if (JSON.stringify(lv.dem) !== JSON.stringify({ 14: '1:sot', 19: '2:sot', 20: '1:sot', 21: '10:xanh', 23: '1:xanh', 28: '2:xanh' })) E('số việc chưa xong dưới ngày sai: ' + JSON.stringify(lv.dem));
  if (lv.nay.join() !== '21' || lv.chon.join() !== '21') E('hôm nay / ngày chọn sai: ' + JSON.stringify({ nay: lv.nay, chon: lv.chon }));
  if (lv.vienNay !== '2px') E('hôm nay không viền 2px: ' + lv.vienNay);
  if (lv.nenSot === lv.nenXanh) E('nền số việc sót trùng nền ngày tới');
  if (lv.chuGiai.join('|') !== 'Việc chưa xong|Ngày đã qua, còn sót') E('chú giải: ' + lv.chuGiai.join('|'));
  if (lv.sot !== 'Còn sót 4 việc ở các ngày trước' || lv.veNay !== 'Về hôm nay') E('nút trong lịch Việc: ' + JSON.stringify({ sot: lv.sot, veNay: lv.veNay }));
  if (lv.chuNhat !== lv.cnSo) E('cột CN: chữ tiêu đề và số ngày khác màu');
  if (lv.nut.length !== 3 || lv.nut.some((x) => x[1] < 44 || x[2] < 44)) E('nút tháng trước/sau/đóng < 44px: ' + JSON.stringify(lv.nut));
  T.coChuLichViec = await doCoChu(page);
  await coChuV95(page, 'lịch Việc', dark);
  await nutNhoV95(page, 'lịch Việc', dark);
  await kiemTuongPhan(page, '.sheet', 'lịchViệc', T, dark);
  await chup(page, 'iphone-lich-viec' + sfx, true);
  // chạm "Còn sót…" → ngày gần nhất còn sót (20/10); mở lại thì ngày 20 được chọn; "Về hôm nay"
  await nut(hopV, /^Còn sót 4 việc/, false).tap();
  await page.waitForTimeout(800);
  T.saukhiSot = await h1();
  if (T.saukhiSot !== 'Việc ngày 20/10') E('chạm "Còn sót" không tới 20/10: "' + T.saukhiSot + '"');
  await page.getByRole('button', { name: 'Mở lịch', exact: true }).tap();
  await hopV.waitFor();
  await page.waitForTimeout(600);
  T.chonSauSot = await page.evaluate(() => [...document.querySelectorAll('.lich-cell.chon .lich-o')].map((e) => e.textContent).join());
  if (T.chonSauSot !== '20') E('mở lại lịch, ngày chọn là ' + T.chonSauSot + ' (cần 20)');
  await nut(hopV, 'Về hôm nay').tap();
  await page.waitForTimeout(800);
  if ((await h1()) !== 'Việc hôm nay') E('"Về hôm nay" trong lịch không về hôm nay');
  if (!dark) {
    // tháng 6 hàng (11/2026): mọi nút vẫn thấy và chạm được (bảng cuộn được)
    await page.getByRole('button', { name: 'Mở lịch', exact: true }).tap();
    await hopV.waitFor();
    await page.waitForTimeout(600);
    await nut(hopV, 'Tháng sau').tap();
    await page.waitForTimeout(250);
    T.thang6Hang = await page.evaluate(() => {
      const l = document.querySelector('.lich-luoi');
      const sheet = document.querySelector('.sheet');
      const nut = [...document.querySelectorAll('.sheet button')].filter((e) => /Về hôm nay|Còn sót|Tháng trước|Tháng sau|Đóng lịch/.test(e.getAttribute('aria-label') || e.textContent));
      const tren = (e) => { e.scrollIntoView({ block: 'nearest' }); const r = e.getBoundingClientRect(); const t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !!t && e.contains(t); };
      return { hang: l.children.length / 7, tieuDe: document.querySelector('.lich-tieu-de').textContent, cuon: sheet.scrollHeight > sheet.clientHeight, chamDuoc: nut.map((e) => [(e.getAttribute('aria-label') || e.textContent).trim().slice(0, 18), tren(e)]) };
    });
    const t6 = T.thang6Hang;
    if (t6.hang !== 6 || t6.tieuDe !== 'Tháng 11, 2026') E('tháng 11/2026 không phải 6 hàng: ' + JSON.stringify(t6));
    if (t6.chamDuoc.length < 5 || t6.chamDuoc.some((x) => !x[1])) E('tháng 6 hàng: có nút không chạm được ' + JSON.stringify(t6.chamDuoc));
    await page.evaluate(() => document.querySelector('.sheet').scrollTo(0, 0));
    await chup(page, 'iphone-lich-viec-6-hang-sang', true);
    await nut(hopV, 'Đóng lịch').tap();
    await page.waitForTimeout(600);
  }

  // === B. Lịch tab Khám, xem một ngày (bảng 16e) ===
  await page.getByRole('button', { name: 'Khám', exact: true }).tap();
  await page.getByRole('button', { name: 'Lịch khám', exact: true }).tap();
  const hopK = page.getByRole('dialog', { name: 'Lịch khám' });
  await hopK.waitFor();
  await page.waitForTimeout(600);
  T.lichKham = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.lich-cell')];
    const dem = {};
    for (const e of cells) { const d = e.querySelector('.lich-dem'); if (d.textContent) dem[e.querySelector('.lich-o').textContent] = d.textContent; }
    return {
      gat: [...document.querySelectorAll('.lich-gat button')].map((e) => [e.textContent.trim(), e.getAttribute('aria-pressed'), Math.round(e.getBoundingClientRect().height)]), dem,
      xa: cells.filter((e) => e.disabled).map((e) => e.querySelector('.lich-o').textContent).join(), nay: cells.filter((e) => e.classList.contains('nay')).map((e) => e.querySelector('.lich-o').textContent).join(),
      khoaDuoc: cells.filter((e) => e.disabled).every((e) => getComputedStyle(e.querySelector('.lich-o')).color !== getComputedStyle(cells[0].querySelector('.lich-o')).color),
      cheDoAn: !document.querySelector('.lich-khoang')
    };
  });
  const lk = T.lichKham;
  if (JSON.stringify(lk.gat) !== JSON.stringify([['Xem một ngày', 'true', 44], ['Tổng hợp nhiều ngày', 'false', 44]])) E('nút gạt lịch Khám: ' + JSON.stringify(lk.gat));
  if (JSON.stringify(lk.dem) !== JSON.stringify({ 18: '2 bé', 19: '4 bé', 20: '3 bé' })) E('số bé đã khám dưới ngày sai (dòng đã xoá không được tính): ' + JSON.stringify(lk.dem));
  if (lk.xa !== '22,23,24,25,26,27,28,29,30,31') E('ngày tương lai phải bị khoá: ' + lk.xa);
  if (lk.nay !== '21') E('hôm nay trên lịch Khám: ' + lk.nay);
  // bấm vào ngày tương lai (ép) không làm gì
  await page.evaluate(() => [...document.querySelectorAll('.lich-cell')].find((e) => e.querySelector('.lich-o').textContent === '25').click());
  await page.waitForTimeout(300);
  if (!(await hopK.count()) || (await h1()) !== 'Khám bệnh hôm nay') E('chạm ngày tương lai làm đổi trang');
  await coChuV95(page, 'lịch Khám', dark);
  await nutNhoV95(page, 'lịch Khám', dark);
  await kiemTuongPhan(page, '.sheet', 'lịchKhám', T, dark);
  await chup(page, 'iphone-lich-kham' + sfx, true);
  // chạm HÔM NAY ở "Xem một ngày" → về chế độ thường (không dải vàng)
  await ngay(hopK, 21).tap();
  await page.waitForTimeout(800);
  T.chamHomNay = { h1: await h1(), dai: await page.locator('.dai-ngay-truoc').count() };
  if (T.chamHomNay.h1 !== 'Khám bệnh hôm nay' || T.chamHomNay.dai) E('chạm hôm nay ở "Xem một ngày" không về chế độ thường: ' + JSON.stringify(T.chamHomNay));

  // === C. Chọn khoảng nhiều ngày (16e) và tổng hợp nhiều ngày (16f) — CHỈ ĐỌC ===
  await page.getByRole('button', { name: 'Lịch khám', exact: true }).tap();
  await hopK.waitFor();
  await page.waitForTimeout(600);
  await nut(hopK, 'Tổng hợp nhiều ngày').tap();
  const nutXem = (ten) => hopK.getByRole('button', { name: ten, exact: false });
  T.chuaDuHaiDau = { truoc: await page.locator('.lich-khoang').count(), nutXem: await hopK.locator('button.btn.primary').isDisabled() };
  if (T.chuaDuHaiDau.truoc || !T.chuaDuHaiDau.nutXem) E('chưa chọn gì: không được có hộp khoảng, nút "Xem tổng hợp" phải mờ ' + JSON.stringify(T.chuaDuHaiDau));
  await ngay(hopK, 20).tap(); // chạm ngày CUỐI trước → rồi chạm ngày sớm hơn: tự đảo
  T.mocDau = { chu: doiMau(await page.locator('.lich-khoang-chu').textContent()), nutXem: await hopK.locator('button.btn.primary').isDisabled() };
  if (!/Đã chọn 20\/10/.test(T.mocDau.chu) || !T.mocDau.nutXem) E('mới chọn ngày đầu: hộp khoảng / nút xem sai ' + JSON.stringify(T.mocDau));
  await ngay(hopK, 18).tap();
  await page.waitForTimeout(500);
  T.khoang = await page.evaluate(() => ({
    chu: document.querySelector('.lich-khoang-chu')?.textContent || '', nut: document.querySelector('.sheet button.btn.primary')?.textContent || '', nutMo: !document.querySelector('.sheet button.btn.primary')?.disabled,
    dau: [...document.querySelectorAll('.lich-cell.dau .lich-o')].map((e) => e.textContent).join(), cuoi: [...document.querySelectorAll('.lich-cell.cuoi .lich-o')].map((e) => e.textContent).join(),
    giua: [...document.querySelectorAll('.lich-cell.giua .lich-o')].map((e) => e.textContent).join(),
    nenDai: getComputedStyle(document.querySelector('.lich-cell.giua .lich-dai')).backgroundColor, nenDau: getComputedStyle(document.querySelector('.lich-cell.dau .lich-o')).backgroundColor,
    vienDau: getComputedStyle(document.querySelector('.lich-cell.dau .lich-o')).borderTopWidth
  }));
  T.khoang.mauDai = await mauBien(page, '--rangeBg');
  T.khoang.mauDau = await mauBien(page, '--rangeEnd');
  if (!/18\/10 đến 20\/10/.test(doiMau(T.khoang.chu)) || !/3 ngày, 12 lượt khám/.test(doiMau(T.khoang.chu))) E('hộp khoảng: ' + doiMau(T.khoang.chu));
  if (T.khoang.nut !== 'Xem tổng hợp 3 ngày' || !T.khoang.nutMo) E('nút xem tổng hợp: ' + JSON.stringify([T.khoang.nut, T.khoang.nutMo]));
  if (T.khoang.dau !== '18' || T.khoang.cuoi !== '20' || T.khoang.giua !== '19') E('đầu/cuối/giữa khoảng: ' + JSON.stringify(T.khoang));
  if (T.khoang.nenDai !== T.khoang.mauDai || T.khoang.nenDau !== T.khoang.mauDau) E('màu/viền dải và hai đầu khoảng: ' + JSON.stringify(T.khoang));
  await coChuV95(page, 'lịch chọn khoảng', dark);
  await nutNhoV95(page, 'lịch chọn khoảng', dark);
  await kiemTuongPhan(page, '.sheet', 'lịchChọnKhoảng', T, dark);
  await chup(page, 'iphone-lich-nhieu-ngay' + sfx, true);
  // "Chọn lại" xoá khoảng; chọn lại hai đầu
  await nut(hopK, 'Chọn lại').tap();
  if ((await page.locator('.lich-khoang').count()) || !(await hopK.locator('button.btn.primary').isDisabled())) E('"Chọn lại" không xoá khoảng / nút xem vẫn bấm được');
  await ngay(hopK, 18).tap(); await ngay(hopK, 20).tap();
  await page.waitForTimeout(400);
  // bảng tổng hợp nhiều ngày
  await nutXem(/^Xem tổng hợp 3 ngày/).tap();
  const hopN = page.getByRole('dialog', { name: 'Tổng hợp nhiều ngày' });
  await hopN.waitFor();
  await page.waitForTimeout(650);
  const ta = page.locator('#thn-text');
  const tieuDeN = doiMau(await hopN.locator('h2').textContent());
  const phuN = doiMau(await hopN.locator('.muted.small').first().textContent());
  const vanMa = await ta.inputValue();
  T.tongHopNhieu = { tieuDe: tieuDeN, phu: phuN, coChu: await ta.evaluate((e) => getComputedStyle(e).fontSize), canhBao: doiMau(await hopN.getByRole('note').textContent()), cach: await hopN.locator('.nhieu-gat button').evaluateAll((es) => es.map((e) => [e.textContent, e.getAttribute('aria-pressed')])) };
  if (tieuDeN !== 'Tổng hợp 18/10 đến 20/10' || !/^3 ngày, 12 lượt khám, 6 mã giường$/.test(phuN)) E('tiêu đề/dòng phụ bảng tổng hợp nhiều ngày: ' + tieuDeN + ' | ' + phuN);
  if (JSON.stringify(T.tongHopNhieu.cach) !== JSON.stringify([['Theo ngày', 'false'], ['Theo mã giường', 'true']])) E('nút gạt cách xếp: ' + JSON.stringify(T.tongHopNhieu.cach));
  if (T.tongHopNhieu.coChu !== '16px') E('ô sửa tổng hợp không 16px: ' + T.tongHopNhieu.coChu);
  if (T.tongHopNhieu.canhBao !== 'Cùng mã giường ở các ngày khác nhau có thể là bé khác. App ghép theo phòng và mã, hãy kiểm tra trước khi gửi.') E('dải cảnh báo sai chữ: ' + T.tongHopNhieu.canhBao);
  for (const can of ['TỔNG HỢP 18/10 - 20/10/2026', 'Tuổi thai ghi là tuổi thai hiệu chỉnh của từng ngày.', 'PHÒNG 1 - G01', '18/10: 35w4d - 1800 g - Tiếp tục y lệnh cũ',
    '19/10: 35w5d - 1820 g - Đo bilirubin (chưa xong); Cân bé', '20/10: 35w6d - 1850 g', 'Ghi chú: Theo dõi vàng da', 'PHÒNG 2 - G07', '19/10: 34w6d - 1500 g', '19/10: 34w6d - 1510 g',
    'PHÒNG 3 - Chưa có mã', 'PHÒNG CŨ - G99', '19/10: 36w4d - 2500 g - Siêu âm não (chưa xong)']) {
    if (!vanMa.includes(can)) E('tổng hợp theo mã giường thiếu dòng: ' + can);
  }
  if (vanMa.includes('GXOA')) E('tổng hợp có dòng đã xoá');
  if ((vanMa.match(/^19\/10: 34w6d/gm) || []).length !== 2) E('hai bé trùng mã G07 cùng ngày phải giữ đủ hai dòng');
  await coChuV95(page, 'tổng hợp nhiều ngày', dark);
  await nutNhoV95(page, 'tổng hợp nhiều ngày', dark);
  await kiemTuongPhan(page, '.sheet.sheet-nhieu', 'tổngHợpNhiềuNgày', T, dark);
  await chup(page, 'iphone-tong-hop-nhieu-ngay' + sfx, true);
  if (!dark) {
    // giữ bản sửa riêng từng cách xếp
    await ta.fill(vanMa + '\nSỬA-MA');
    await nut(hopN, 'Theo ngày').tap();
    const vNgay = await ta.inputValue();
    if (vNgay.includes('SỬA-MA') || !/NGÀY 18\/10/.test(vNgay) || !/^TỔNG HỢP 18\/10 - 20\/10\/2026/.test(vNgay)) E('đổi sang "Theo ngày" phải ra bản xếp theo ngày, không mang chữ sửa của cách kia');
    if (!/NGÀY 18\/10\nPHÒNG 1\nG01: 35w4d - 1800 g - Tiếp tục y lệnh cũ/.test(vNgay)) E('mẫu theo ngày sai: ' + vNgay.slice(0, 200));
    await ta.fill(vNgay + '\nSỬA-NGAY');
    await nut(hopN, 'Theo mã giường').tap();
    const v2 = await ta.inputValue();
    if (!v2.includes('SỬA-MA') || v2.includes('SỬA-NGAY')) E('quay lại "Theo mã giường": mất chữ đã sửa hoặc lẫn chữ của cách kia');
    await nut(hopN, 'Theo ngày').tap();
    if (!(await ta.inputValue()).includes('SỬA-NGAY')) E('quay lại "Theo ngày": mất chữ đã sửa');
    await nut(hopN, 'Soạn lại').tap();
    const v3 = await ta.inputValue();
    if (v3.includes('SỬA-NGAY') || !/NGÀY 18\/10/.test(v3)) E('"Soạn lại" ở "Theo ngày" không làm lại bản theo ngày');
    await nut(hopN, 'Theo mã giường').tap();
    if (!(await ta.inputValue()).includes('SỬA-MA')) E('"Soạn lại" ở cách này làm mất bản sửa của cách kia');
    await nut(hopN, 'Sao chép').tap();
    await page.waitForTimeout(400);
    T.saoChep = doiMau(await hopN.locator('.status').textContent().catch(() => ''));
    if (!T.saoChep) E('"Sao chép" không báo kết quả');
  }
  await nut(hopN, 'Đóng tổng hợp').tap();
  await page.waitForTimeout(700);
  if (!(await page.locator('.lich-khoang').count())) E('đóng bảng tổng hợp thì khoảng đã chọn phải còn trên lịch');
  if (!dark) {
    // khoảng không có bé nào + tháng 6 hàng (8/2026): bảng cuộn được, nút "Xem tổng hợp" vẫn chạm được
    await nut(hopK, 'Chọn lại').tap();
    await nut(hopK, 'Tháng trước').tap(); await nut(hopK, 'Tháng trước').tap();
    await page.waitForTimeout(300);
    await ngay(hopK, 3, 8).tap(); await ngay(hopK, 6, 8).tap();
    await page.waitForTimeout(500);
    T.thang8 = await page.evaluate(() => {
      const sheet = document.querySelector('.sheet'), b = document.querySelector('.sheet button.btn.primary');
      b.scrollIntoView({ block: 'nearest' });
      const r = b.getBoundingClientRect(), t = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return { hang: document.querySelector('.lich-luoi').children.length / 7, cuon: sheet.scrollHeight > sheet.clientHeight, chamDuoc: !!t && b.contains(t), nut: b.textContent, chu: document.querySelector('.lich-khoang-chu').textContent };
    });
    if (T.thang8.hang !== 6 || !T.thang8.chamDuoc || T.thang8.nut !== 'Xem tổng hợp 4 ngày' || !/4 ngày, 0 lượt khám/.test(doiMau(T.thang8.chu))) E('tháng 8/2026 (6 hàng), khoảng không có bé: ' + JSON.stringify(T.thang8));
    await page.evaluate(() => document.querySelector('.sheet').scrollTo(0, 0));
    await chup(page, 'iphone-lich-nhieu-ngay-6-hang-sang', true);
    await nutXem(/^Xem tổng hợp 4 ngày/).tap();
    await hopN.waitFor();
    await page.waitForTimeout(650);
    if ((await ta.inputValue()) !== 'Chưa có bệnh nhân trong khoảng này.') E('khoảng không có bé: văn bản sai "' + (await ta.inputValue()) + '"');
    await nut(hopN, 'Đóng tổng hợp').tap();
    await page.waitForTimeout(700);
  }
  await nut(hopK, 'Đóng lịch').tap();
  await page.waitForTimeout(700);
  const S1 = await chupDb(page);
  T.docChiDocLich = { doi: dbDoi(S0, S1), moi: dbMoi(S0, S1) };
  if (T.docChiDocLich.doi.length || T.docChiDocLich.moi) E('xem lịch / chọn khoảng / soạn tổng hợp nhiều ngày làm đổi CSDL: ' + JSON.stringify(T.docChiDocLich));

  // === D. Xem lại ngày trước (16d): CHỈ XEM ===
  await page.getByRole('button', { name: 'Lịch khám', exact: true }).tap();
  await hopK.waitFor();
  await page.waitForTimeout(600);
  await ngay(hopK, 19).tap();
  await page.waitForTimeout(900);
  T.ngayTruoc = await page.evaluate(() => {
    const phong = [...document.querySelectorAll('.nt-phong-h')].map((h) => [...h.children].map((c) => c.textContent).join(' '));
    const hang = [...document.querySelectorAll('.nt-be')];
    return {
      tieuDe: document.querySelector('h1').textContent, ngayDayDu: document.querySelector('.ph-head .ph-ngay-chu').textContent, dai: (document.querySelector('.dai-ngay-truoc')?.textContent || '').trim(), phong,
      ma: hang.map((e) => e.querySelector('.pat-code').textContent), tick: hang.filter((e) => e.querySelector('.tick-ok')).length,
      g01: (hang[0]?.innerText || '').replace(/\n/g, ' | '), g03: (hang[1]?.innerText || '').replace(/\n/g, ' | '),
      cam: { nutCong: document.querySelectorAll('.room-add').length, swipe: document.querySelectorAll('.swipe').length, thungRac: document.querySelectorAll('.swipe-del').length, oNhap: document.querySelectorAll('.phone-app input, .phone-app textarea, .phone-app select').length, laySach: /Lấy danh sách|Quản lý phòng/.test(document.querySelector('.phone-app').textContent), thanhThem: document.querySelectorAll('.task-form-ph').length },
      nutDay: [...document.querySelectorAll('.nt-nut button')].map((e) => [e.textContent, e.disabled]), lichSang: document.querySelector('.ph-head .round-btn.on')?.getAttribute('aria-label') || null,
      vienLich: getComputedStyle(document.querySelector('.ph-head .round-btn.on')).borderTopWidth, tienDo: !!document.querySelector('.ph-head .ph-tiendo')
    };
  });
  const nt = T.ngayTruoc;
  if (nt.tieuDe !== 'Khám ngày 19/10' || nt.ngayDayDu !== 'Thứ Hai, 19/10') E('đầu trang ngày trước: ' + nt.tieuDe + ' | ' + nt.ngayDayDu);
  if (nt.dai !== 'Đang xem ngày trước. Chỉ xem, không sửa.Về hôm nay') E('dải vàng: ' + nt.dai);
  if (JSON.stringify(nt.phong) !== JSON.stringify(['Phòng 1 Đã khám 1/2', 'Phòng 2 Đã khám 2/3', 'Phòng 3 Đã khám 0/1', 'Phòng cũ (đã xoá) Đã khám 1/1'])) E('các phòng ở ngày trước (phải có phòng đã xoá có bé, không có phòng trống): ' + JSON.stringify(nt.phong));
  if (nt.ma.join() !== 'G01,G03,G12,G07,G07,Chưa có mã,G99') E('danh sách bé ngày trước (đủ bé, không mất bé trùng mã / không mã / phòng xoá): ' + nt.ma.join());
  if (nt.tick !== 4) E('tích xanh bé đã khám: ' + nt.tick + ' (cần 4)');
  if (!/35w5d hôm đó, 1820 g/.test(nt.g01) || !/Đo bilirubin, chưa xong/.test(nt.g01) || /Cân bé, chưa xong/.test(nt.g01) || !/Cân bé/.test(nt.g01)) E('dòng G01 ngày trước (tuổi theo ngày đó, việc chưa xong): ' + nt.g01);
  if (!/36w1d hôm đó, 2070 g/.test(nt.g03) || !/Tăng sữa 5 ml\/cữ, chưa xong/.test(nt.g03)) E('dòng G03 ngày trước: ' + nt.g03);
  if (nt.cam.nutCong || nt.cam.swipe || nt.cam.thungRac || nt.cam.oNhap || nt.cam.laySach || nt.cam.thanhThem) E('ngày trước không được có nút "+", vuốt, thùng rác, ô nhập, "Lấy danh sách", "Quản lý phòng", thanh thêm việc: ' + JSON.stringify(nt.cam));
  if (JSON.stringify(nt.nutDay) !== JSON.stringify([['Chép sang hôm nay', false], ['Tổng hợp ngày này', false]])) E('hai nút đáy: ' + JSON.stringify(nt.nutDay));
  if (nt.lichSang !== 'Lịch khám' || nt.vienLich !== '2px') E('nút lịch phải viền đậm khi đang xem ngày trước: ' + JSON.stringify([nt.lichSang, nt.vienLich]));
  await coChuV95(page, 'ngày trước', dark);
  await nutNhoV95(page, 'ngày trước', dark);
  await kiemTuongPhan(page, '.phone-app', 'ngàyTrước', T, dark);
  await chup(page, 'iphone-kham-ngay-truoc' + sfx, true);
  // chi tiết bé CHỈ XEM
  await page.locator('.nt-be', { hasText: 'G01' }).tap();
  const hopB = page.getByRole('dialog', { name: 'Chi tiết bé ngày trước' });
  await hopB.waitFor();
  await page.waitForTimeout(650);
  T.beNgayTruoc = await hopB.evaluate((e) => ({
    chu: e.innerText.replace(/\n+/g, ' | '), oNhap: e.querySelectorAll('input, textarea, select').length, thanTuLuu: !!e.querySelector('.sheet-note, .be-note, #ghichu-be'),
    kq: [...e.querySelectorAll('.be-kq span')].map((s) => s.textContent)
  }));
  const bx = T.beNgayTruoc;
  if (bx.oNhap || bx.thanTuLuu) E('chi tiết bé ngày trước có ô nhập: ' + JSON.stringify(bx));
  if (bx.kq.join('|') !== 'Ngày tuổi (ngày 19/10)75 ngày|Hiệu chỉnh (ngày 19/10)35w5d') E('ngày tuổi / hiệu chỉnh phải tính theo ngày 19/10: ' + bx.kq.join('|'));
  for (const can of ['G01', 'Phòng 1', 'Chỉ xem, ngày 19/10', '0508', '25w0d', '1820', 'Đo bilirubin', 'Chưa xong', 'Cân bé', 'Không có ghi chú.', 'Đã khám']) if (!bx.chu.includes(can)) E('chi tiết bé ngày trước thiếu "' + can + '": ' + bx.chu);
  await coChuV95(page, 'chi tiết bé ngày trước', dark);
  await nutNhoV95(page, 'chi tiết bé ngày trước', dark);
  await kiemTuongPhan(page, '.sheet', 'chiTiếtBéNgàyTrước', T, dark);
  await chup(page, 'iphone-be-ngay-truoc' + sfx, true);
  await nut(hopB, 'Đóng chi tiết').tap();
  await page.waitForTimeout(700);
  // "Tổng hợp ngày này": buildSummary với now = ngày đó
  await page.getByRole('button', { name: 'Tổng hợp ngày này', exact: true }).tap();
  const hopS = page.getByRole('dialog', { name: 'Tổng hợp ngày này' });
  await hopS.waitFor();
  await page.waitForTimeout(650);
  const vanNgay = await page.locator('#tonghop-noidung').inputValue();
  T.tongHopNgay = vanNgay.split('\n').slice(0, 3);
  for (const can of ['KHÁM SÁNG 19/10/2026 - Y LỆNH', 'Tuổi thai ghi là tuổi thai hiệu chỉnh ngày 19/10.', 'G01 - 35w5d - 1820 g', '- Đo bilirubin', 'PHÒNG CŨ', 'G99 - 36w4d - 2500 g', 'Chưa có mã - Tiếp tục y lệnh cũ']) {
    if (!vanNgay.includes(can)) E('"Tổng hợp ngày này" thiếu: ' + can);
  }
  if (vanNgay.includes('GXOA')) E('"Tổng hợp ngày này" có dòng đã xoá');
  if ((vanNgay.match(/^G07 - 34w6d/gm) || []).length !== 2) E('"Tổng hợp ngày này": hai bé trùng mã G07 phải giữ đủ hai dòng');
  await coChuV95(page, 'tổng hợp ngày này', dark);
  await nutNhoV95(page, 'tổng hợp ngày này', dark);
  await chup(page, 'iphone-tong-hop-ngay-nay' + sfx, true);
  await hopS.getByRole('button', { name: 'Soạn lại', exact: true }).tap();
  await hopS.getByRole('button', { name: 'Đóng tổng hợp', exact: true }).tap();
  await page.waitForTimeout(700);
  // ngày xem rồi mà chưa hề ghi: mọi dòng (kể cả updatedAt) giữ nguyên
  const S2 = await chupDb(page);
  T.docChiDocNgayTruoc = { doi: dbDoi(S0, S2), moi: dbMoi(S0, S2) };
  if (T.docChiDocNgayTruoc.doi.length || T.docChiDocNgayTruoc.moi) E('xem ngày trước / mở chi tiết / soạn tổng hợp làm đổi CSDL: ' + JSON.stringify(T.docChiDocNgayTruoc));
  // đổi qua tab Việc rồi về Khám: vẫn đang xem ngày trước
  await page.getByRole('button', { name: 'Việc', exact: true }).tap();
  await page.waitForTimeout(300);
  const hVi = await h1();
  await page.getByRole('button', { name: 'Khám', exact: true }).tap();
  await page.waitForTimeout(300);
  T.giuTrangThai = { viec: hVi, kham: await h1() };
  if (T.giuTrangThai.viec !== 'Việc hôm nay' || T.giuTrangThai.kham !== 'Khám ngày 19/10') E('đổi tab Việc/Khám làm mất trạng thái xem ngày trước: ' + JSON.stringify(T.giuTrangThai));
  // ngày không có bé
  await page.getByRole('button', { name: 'Lịch khám', exact: true }).tap();
  await hopK.waitFor();
  await page.waitForTimeout(600);
  await ngay(hopK, 17).tap();
  await page.waitForTimeout(900);
  T.ngayTrong = await page.evaluate(() => ({ tieuDe: document.querySelector('h1').textContent, bao: (document.querySelector('.phone-app .empty')?.textContent || '').trim(), nut: [...document.querySelectorAll('.nt-nut button')].map((e) => e.disabled), phong: document.querySelectorAll('.nt-phong-h').length }));
  if (T.ngayTrong.tieuDe !== 'Khám ngày 17/10' || !/Ngày 17\/10 không có bé nào/.test(T.ngayTrong.bao) || T.ngayTrong.nut.join() !== 'true,true' || T.ngayTrong.phong) E('ngày không có bé: ' + JSON.stringify(T.ngayTrong));

  // === E. "Chép sang hôm nay": không trùng phòng + mã, giữ thứ tự, bấm 2 lần không nhân đôi ===
  await page.getByRole('button', { name: 'Lịch khám', exact: true }).tap();
  await hopK.waitFor();
  await page.waitForTimeout(600);
  await ngay(hopK, 19).tap();
  await page.waitForTimeout(900);
  const homNay = async () => (await docBang(page, 'exam_patients')).filter((p) => p.examDate === '2026-10-21' && !p.deleted).sort((a, b) => (a.order || 0) - (b.order || 0));
  T.truocChep = (await homNay()).length;
  await chamMot(page, page.getByRole('button', { name: 'Chép sang hôm nay', exact: true }));
  await page.waitForTimeout(700);
  const hang1 = await homNay();
  T.chep1 = { msg: doiMau(await page.locator('.nt-msg').textContent()), h1: await h1(), ma: hang1.map((p) => p.code).join(), thuTu: hang1.every((p, i) => i === 0 || (p.order || 0) > (hang1[i - 1].order || 0)) };
  await chamMot(page, page.getByRole('button', { name: 'Chép sang hôm nay', exact: true }));
  await page.waitForTimeout(700);
  const hang2 = await homNay();
  T.chep2 = { msg: doiMau(await page.locator('.nt-msg').textContent()), n: hang2.length };
  const viecChep = (await docBang(page, 'patient_todos')).filter((t) => hang2.some((p) => p.id === t.patientId) && !t.deleted).map((t) => t.text).sort();
  T.viecChep = viecChep;
  if (T.truocChep !== 0) E('trước khi chép, hôm nay đã có ' + T.truocChep + ' bé (mẫu sai)');
  if (T.chep1.msg !== 'Đã chép 6 bé sang hôm nay' || T.chep1.h1 !== 'Khám ngày 19/10') E('chép lần 1: ' + JSON.stringify(T.chep1));
  if (T.chep1.ma !== 'G01,G03,G12,G07,G07,' || !T.chep1.thuTu) E('chép: thứ tự / mã bé: ' + JSON.stringify(T.chep1));
  if (T.chep2.msg !== 'Không có bé nào cần chép' || T.chep2.n !== 6) E('chép lần 2 phải không nhân đôi: ' + JSON.stringify(T.chep2));
  if (viecChep.join('|') !== 'Tăng sữa 5 ml/cữ|Đo bilirubin'.split('|').sort().join('|')) E('việc chưa xong phải được chép kèm (và việc đã xong thì không): ' + viecChep.join('|'));
  const S3 = await chupDb(page);
  T.chepKhongSuaCu = dbDoi(S2, S3);
  if (T.chepKhongSuaCu.length) E('"Chép sang hôm nay" làm đổi dòng cũ: ' + T.chepKhongSuaCu.join(', '));
  await chup(page, 'iphone-kham-ngay-truoc-da-chep' + sfx, true);
  await page.getByRole('button', { name: 'Về hôm nay', exact: true }).tap();
  await page.waitForTimeout(700);
  T.veHomNay = { h1: await h1(), ma: await page.locator('.pat-code').allTextContents(), dai: await page.locator('.dai-ngay-truoc').count() };
  if (T.veHomNay.h1 !== 'Khám bệnh hôm nay' || T.veHomNay.dai || !T.veHomNay.ma.includes('G01')) E('"Về hôm nay": ' + JSON.stringify(T.veHomNay));

  if (!dark) {
    // qua ngày mới (22/10 08:00) thì đang xem ngày trước cũng về hôm nay
    await page.getByRole('button', { name: 'Lịch khám', exact: true }).tap();
    await hopK.waitFor();
    await page.waitForTimeout(600);
    await ngay(hopK, 19).tap();
    await page.waitForTimeout(800);
    await page.clock.setFixedTime(new Date(2026, 9, 22, 8, 0, 0));
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await page.waitForTimeout(600);
    T.quaNgayMoi = { h1: await h1(), dai: await page.locator('.dai-ngay-truoc').count(), ngay: doiMau(await page.locator('.ph-head .ph-ngay-chu').first().textContent()) };
    if (T.quaNgayMoi.h1 !== 'Khám bệnh hôm nay' || T.quaNgayMoi.dai || T.quaNgayMoi.ngay !== 'Thứ Năm, 22/10') E('qua ngày mới phải về hôm nay: ' + JSON.stringify(T.quaNgayMoi));
  }
  await ctx.close();
}
for (const toi of [false, true]) { try { await luongIphoneV95(toi); } catch (e) { console.error('V95 ' + (toi ? 'tối' : 'sáng') + ' dừng: ' + String(e.stack).split('\n').slice(0, 5).join(' | ')); throw e; } }

// ----- iPhone: lịch Việc khi KHÔNG còn việc sót — dòng "Còn sót" phải ẩn -----
{
  const { ctx, page } = await moApp(IPHONE_OPTS);
  await page.getByRole('button', { name: 'Mở lịch', exact: true }).tap();
  await page.getByRole('dialog', { name: 'Lịch công việc' }).waitFor();
  await page.waitForTimeout(600);
  const T = ketQua.thuChucNang.lichKhongSot = { sot: await page.locator('.lich-sot').count(), veNay: await page.locator('.lich-nay-nut').count(), badge: await page.getByRole('button', { name: 'Mở lịch', exact: true }).locator('.badge').count() };
  if (T.sot || !T.veNay) ketQua.loi.push('v9.5: không còn việc sót mà dòng "Còn sót" vẫn hiện (hoặc mất nút "Về hôm nay"): ' + JSON.stringify(T));
  await ctx.close();
}

// ----- PC: lịch Việc trong cột trái, lịch Khám, ngày trước ở cột giữa + chi tiết chỉ xem ở cột phải, bảng tổng hợp nhiều ngày rộng -----
{
  const { ctx, page } = await moAppLich({ viewport: { width: 1440, height: 900 } });
  const T = ketQua.thuChucNang.lichV95Pc = {};
  const E = (s) => ketQua.loi.push('v9.5 PC: ' + s);
  const h1 = async () => doiMau(await page.locator('h1').first().textContent());
  const S0 = await chupDb(page);
  T.lichViec = await page.evaluate(() => {
    const cells = [...document.querySelectorAll('.lich-pc .lich-cell')];
    return { soO: cells.length, rongMin: Math.min(...cells.map((e) => Math.round(e.getBoundingClientRect().width))), caoMin: Math.min(...cells.map((e) => Math.round(e.getBoundingClientRect().height))), sot: (document.querySelector('.lich-sot')?.textContent || '').trim(), veNay: !!document.querySelector('.lich-nay-nut'), chuGiai: document.querySelectorAll('.lich-chu-giai span').length };
  });
  if (T.lichViec.soO !== 31 || T.lichViec.rongMin < 44 || T.lichViec.caoMin < 44) E('ô lịch Việc PC phải ≥44px: ' + JSON.stringify(T.lichViec));
  if (T.lichViec.sot !== 'Còn sót 4 việc ở các ngày trước' || !T.lichViec.veNay || T.lichViec.chuGiai !== 2) E('lịch Việc PC thiếu dòng "Còn sót"/"Về hôm nay"/chú giải: ' + JSON.stringify(T.lichViec));
  await chup(page, 'pc-lich-viec-sang', true);
  await page.locator('.lich-sot').click();
  await page.waitForTimeout(400);
  if ((await h1()) !== 'Việc ngày 20/10') E('chạm "Còn sót" trên PC không tới 20/10: ' + (await h1()));
  await page.locator('.lich-nay-nut').click();
  await page.waitForTimeout(300);
  if ((await h1()) !== 'Việc hôm nay') E('"Về hôm nay" trên PC');
  // Khám: mở bé HÔM NAY trước (selPid của hôm nay), rồi xem ngày trước: hai bên không lẫn
  await page.getByRole('button', { name: 'Khám', exact: true }).click();
  await page.getByRole('button', { name: /^Lấy danh sách/ }).click();
  await page.waitForTimeout(500);
  await page.locator('.pat-open', { hasText: 'G01' }).first().click();
  await page.locator('.pc-detail').waitFor();
  const homNayBe = doiMau(await page.locator('.pc-detail #be-ma').inputValue());
  await page.getByRole('button', { name: 'Lịch khám', exact: true }).click();
  const hopK = page.getByRole('dialog', { name: 'Lịch khám' });
  await hopK.waitFor();
  await page.waitForTimeout(500);
  const rongSheet = await page.evaluate(() => Math.round(document.querySelector('.sheet-wrap.center .sheet')?.getBoundingClientRect().width || 0));
  if (!rongSheet) E('lịch Khám trên PC phải là hộp giữa màn hình');
  await hopK.getByRole('button', { name: /^Ngày 19 tháng 10/ }).click();
  await page.waitForTimeout(800);
  T.ngayTruoc = await page.evaluate(() => ({
    tieuDe: document.querySelector('h1').textContent, dai: (document.querySelector('.dai-ngay-truoc')?.textContent || '').trim(), cot: [...document.querySelectorAll('.pc > *')].map((e) => e.tagName.toLowerCase() + '.' + e.className.split(' ')[0]),
    cam: { nutCong: document.querySelectorAll('.room-add').length, swipe: document.querySelectorAll('.swipe').length, thungRac: document.querySelectorAll('.swipe-del').length, oNhap: document.querySelectorAll('.pc input, .pc textarea, .pc select').length, laySach: /Lấy danh sách|Quản lý phòng/.test(document.querySelector('.pc').textContent) },
    chiTietHomNay: document.querySelectorAll('[aria-label="Chi tiết bệnh nhân"]').length, nutLich: document.querySelector('.pc-side .cal-toggle')?.className || '', vienLich: getComputedStyle(document.querySelector('.pc-side .cal-toggle')).borderTopWidth, ma: [...document.querySelectorAll('.nt-be .pat-code')].map((e) => e.textContent)
  }));
  const pn = T.ngayTruoc;
  if (pn.tieuDe !== 'Khám ngày 19/10' || pn.dai !== 'Đang xem ngày trước. Chỉ xem, không sửa.Về hôm nay') E('đầu trang / dải vàng ngày trước: ' + JSON.stringify([pn.tieuDe, pn.dai]));
  if (pn.cam.nutCong || pn.cam.swipe || pn.cam.thungRac || pn.cam.oNhap || pn.cam.laySach) E('ngày trước trên PC có thao tác sửa: ' + JSON.stringify(pn.cam));
  if (pn.chiTietHomNay) E('bé đang mở của HÔM NAY vẫn hiện khi xem ngày trước (selPid lẫn nhau)');
  if (!/\bon\b/.test(pn.nutLich) || pn.vienLich !== '2px') E('nút lịch Khám PC phải viền đậm khi xem ngày trước: ' + JSON.stringify([pn.nutLich, pn.vienLich]));
  if (pn.ma.join() !== 'G01,G03,G12,G07,G07,Chưa có mã,G99') E('PC: danh sách bé ngày trước: ' + pn.ma.join());
  await page.locator('.nt-be', { hasText: 'G12' }).click();
  await page.locator('aside.pc-detail').waitFor();
  T.chiTiet = await page.evaluate(() => { const a = document.querySelector('aside.pc-detail'); return { aria: a.getAttribute('aria-label'), oNhap: a.querySelectorAll('input, textarea, select').length, chu: a.innerText.replace(/\n+/g, ' | '), cotPhai: a.getBoundingClientRect().left > document.querySelector('main.pc-main').getBoundingClientRect().right - 2 }; });
  if (T.chiTiet.aria !== 'Chi tiết bé ngày trước' || T.chiTiet.oNhap || !T.chiTiet.cotPhai) E('chi tiết chỉ xem ở cột phải: ' + JSON.stringify(T.chiTiet));
  if (!/Ngày tuổi \(ngày 19\/10\)/.test(T.chiTiet.chu) || !/41w1d/.test(T.chiTiet.chu) || !/Theo dõi vàng da/.test(T.chiTiet.chu)) E('chi tiết bé G12 ngày trước thiếu ngày tuổi / hiệu chỉnh theo ngày đó / ghi chú: ' + T.chiTiet.chu);
  await chup(page, 'pc-kham-ngay-truoc-sang', true);
  await page.getByRole('button', { name: 'Tổng hợp ngày này', exact: true }).click();
  await page.waitForTimeout(400);
  const vanPc = await page.locator('#tonghop-noidung').inputValue();
  if (!/^KHÁM SÁNG 19\/10\/2026 - Y LỆNH\nTuổi thai ghi là tuổi thai hiệu chỉnh ngày 19\/10\./.test(vanPc)) E('PC tổng hợp ngày này: ' + vanPc.slice(0, 120));
  // tổng hợp nhiều ngày: bảng rộng giữa màn hình
  await page.getByRole('button', { name: 'Lịch khám', exact: true }).click();
  await hopK.waitFor();
  await page.waitForTimeout(500);
  await hopK.getByRole('button', { name: 'Tổng hợp nhiều ngày', exact: true }).click();
  await hopK.getByRole('button', { name: /^Ngày 18 tháng 10/ }).click();
  await hopK.getByRole('button', { name: /^Ngày 20 tháng 10/ }).click();
  await hopK.getByRole('button', { name: /^Xem tổng hợp 3 ngày/ }).click();
  const hopN = page.getByRole('dialog', { name: 'Tổng hợp nhiều ngày' });
  await hopN.waitFor();
  await page.waitForTimeout(600);
  T.nhieu = await page.evaluate(() => ({ giua: !!document.querySelector('.sheet-wrap.center .sheet-nhieu'), rong: Math.round(document.querySelector('.sheet-nhieu').getBoundingClientRect().width), coChu: getComputedStyle(document.querySelector('#thn-text')).fontSize }));
  if (!T.nhieu.giua || T.nhieu.coChu !== '16px') E('bảng tổng hợp nhiều ngày PC: ' + JSON.stringify(T.nhieu));
  await chup(page, 'pc-tong-hop-nhieu-ngay-sang', true);
  await hopN.getByRole('button', { name: 'Đóng tổng hợp', exact: true }).click();
  await page.waitForTimeout(600);
  await hopK.getByRole('button', { name: 'Đóng lịch', exact: true }).click();
  await page.waitForTimeout(600);
  // về hôm nay: bé hôm nay không tự mở lại, danh sách hôm nay hiện lại đủ
  await page.getByRole('button', { name: 'Về hôm nay', exact: true }).click();
  await page.waitForTimeout(500);
  T.veHomNay = { h1: await h1(), chiTiet: await page.locator('[aria-label="Chi tiết bệnh nhân"]').count(), homNayBe };
  if (T.veHomNay.h1 !== 'Khám bệnh hôm nay' || T.veHomNay.chiTiet) E('PC "Về hôm nay": ' + JSON.stringify(T.veHomNay));
  const S1 = await chupDb(page);
  T.chiDoc = { doi: dbDoi(S0, S1), moi: dbMoi(S0, S1) };
  // ("Lấy danh sách hôm qua" ở đầu bước Khám chỉ THÊM dòng mới cho hôm nay, không sửa dòng cũ nào)
  if (T.chiDoc.doi.length) E('xem ngày trước trên PC làm đổi dòng cũ: ' + JSON.stringify(T.chiDoc));
  await ctx.close();
}

// ---------- v9.6: ngày làm việc (mốc 07:00), chế độ 2 ngày (Việc, Khám), Dời + Hoàn tác, Chép sang, chi tiết "Đêm qua", giao tour ----------
// Dữ liệu mẫu 2 ngày làm việc: hôm qua 04/11, hôm nay 05/11 (giờ giả 08:00 05/11; mốc 07:00). Có: bé không mã, hai bé trùng mã cùng phòng,
// phòng đã xoá, hai bên khác ngày sinh, bé vào lúc 02:30 (ghi ngày làm việc trước), một dòng đã xoá. Chỉ mã giường giả.
const Q96 = '2026-11-04', H96 = '2026-11-05';
const gio96 = (d, h, m, s = 0, thang = 10, nam = 2026) => new Date(nam, thang, d, h, m, s);
const NOW96 = gio96(5, 8, 0);
const seedHaiNgay = async (page) => page.evaluate(async () => {
  const open = () => new Promise((res, rej) => { const r = indexedDB.open('ghichu-sosinh'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const db = await open();
  const all = (store) => new Promise((res) => { const r = db.transaction(store).objectStore(store).getAll(); r.onsuccess = () => res(r.result); });
  const rooms = (await all('rooms')).sort((a, b) => a.order - b.order);
  const ms = (d, h, m) => new Date(2026, 10, d, h, m).getTime();
  let n = 0;
  const row = (x) => ({ deleted: false, updatedAt: ms(5, 7, 30) + (n++), deviceId: 'mau', ...x });
  const phongXoa = row({ id: 'phong-xoa', name: 'Phòng cũ', order: 9, deleted: true, createdAt: ms(1, 9, 0) });
  const dem = { 4: 0, 5: 0 };
  const be = (id, d, room, code, dob, ga, wt, done, tao, extra = {}) => row({ id, examDate: '2026-11-0' + d, roomId: room, code, dob, ga, wt, note: '', done, order: ++dem[d], createdAt: tao, ...extra });
  const pats = [
    be('q-g01', 4, rooms[0].id, 'G01', '2910', '300', '1850', true, ms(4, 9, 0)),
    be('q-g05', 4, rooms[0].id, 'G05', '0511', '342', '1950', false, ms(5, 2, 30), { note: 'Sinh mổ 34w2d, thở nhanh sau sinh, đặt CPAP 6 cmH2O.' }),
    be('q-g03', 4, rooms[0].id, 'G03', '1509', '320', '2080', true, ms(4, 9, 0)),
    be('q-g12', 4, rooms[1].id, 'G12', '2910', '390', '3200', true, ms(4, 9, 0)),
    be('q-g07a', 4, rooms[1].id, 'G07', '1509', '300', '1500', true, ms(4, 9, 0)),
    be('q-g07b', 4, rooms[1].id, 'G07', '1509', '300', '1510', false, ms(4, 9, 0)),
    be('q-nocode', 4, rooms[2].id, '', '', '', '', false, ms(4, 9, 0)),
    be('q-g20', 4, rooms[2].id, 'G20', '1010', '300', '1600', true, ms(4, 9, 0)),
    be('q-g99', 4, 'phong-xoa', 'G99', '0110', '340', '2500', true, ms(4, 9, 0)),
    be('q-gxoa', 4, rooms[0].id, 'GXOA', '2910', '300', '1800', true, ms(4, 9, 0), { deleted: true }),
    be('h-g01', 5, rooms[0].id, 'G01', '2910', '300', '1830', false, ms(5, 7, 30)),
    be('h-g05', 5, rooms[0].id, 'G05', '0511', '342', '1980', false, ms(5, 7, 30), { copiedFrom: 'q-g05' }),
    be('h-g03', 5, rooms[0].id, 'G03', '1509', '320', '2100', true, ms(5, 7, 30)),
    be('h-g07', 5, rooms[1].id, 'G07', '1509', '300', '1520', false, ms(5, 7, 30)),
    be('h-nocode', 5, rooms[2].id, '', '', '', '', false, ms(5, 7, 30)),
    be('h-g20', 5, rooms[2].id, 'G20', '1110', '300', '1600', false, ms(5, 7, 30)),
    be('h-g30', 5, rooms[0].id, 'G30', '0211', '330', '1700', false, ms(5, 7, 30))
  ];
  const td = (id, pid, text, done, order) => row({ id, patientId: pid, text, done, order, createdAt: ms(4, 10, order) });
  const todos = [
    td('qt1', 'q-g01', 'Đo bilirubin', false, 1), td('qt2', 'q-g05', 'Kháng sinh lần đầu 03:00', true, 1), td('qt3', 'q-g05', 'Chụp X-quang ngực', false, 2),
    td('qt4', 'q-g12', 'Theo dõi vàng da', false, 1), td('ht1', 'h-g05', 'Chụp X-quang ngực', false, 1), td('ht2', 'h-g05', 'Khí máu sau 6 giờ CPAP', false, 2)
  ];
  const tk = (id, date, zone, text, done, tao, tags, extra = {}) => row({ id, date, zone, tags, text, done, createdAt: tao, ...extra });
  const tasks = [
    tk('tq1', '2026-11-04', 'HP', 'Gọi người nhà giường 12', false, ms(4, 14, 0), ['HC']),
    tk('tq2', '2026-11-04', 'NICU', 'Theo dõi đường huyết G05', false, ms(4, 23, 40), ['XN']),
    tk('tq3', '2026-11-04', 'NICU', 'Kháng sinh lần 2 cho G05', false, ms(5, 3, 10), ['NV']),
    tk('tq4', '2026-11-04', 'NICU', 'Việc đã xong hôm qua', true, ms(4, 9, 0), []),
    tk('tq5', '2026-11-04', 'NICU', 'Việc đã xoá hôm qua', false, ms(4, 9, 5), [], { deleted: true }),
    tk('tq6', '2026-11-03', 'NICU', 'Việc sót ngày 03', false, ms(3, 9, 0), []),
    tk('th1', '2026-11-05', 'NICU', 'Xem lại khí máu giường 3', false, ms(5, 7, 40), ['XN']),
    tk('th2', '2026-11-05', 'NICU', 'Ký y lệnh truyền máu', true, ms(5, 7, 41), ['NV'])
  ];
  const tx = db.transaction(['tasks', 'exam_patients', 'patient_todos', 'rooms'], 'readwrite');
  tx.objectStore('rooms').put(phongXoa);
  pats.forEach((r) => tx.objectStore('exam_patients').put(r));
  todos.forEach((r) => tx.objectStore('patient_todos').put(r));
  tasks.forEach((r) => tx.objectStore('tasks').put(r));
  await new Promise((res) => { tx.oncomplete = res; });
  db.close();
});
async function moAppHaiNgay(opts, gio = NOW96) {
  const r = await moApp(opts, { gio });
  await seedHaiNgay(r.page);
  await r.page.reload();
  await r.page.waitForSelector('.phone-app, .pc');
  await r.page.waitForTimeout(500);
  try { await r.ctx.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: URL.replace(/\/$/, '') }); } catch { /* không cấp được thì thôi */ }
  return r;
}
const IPHONE_UA96 = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPHONE96 = { viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: IPHONE_UA96 };
// bảng mẫu: bé đã khám/chưa, tuổi tính tay (ngày lịch 05/11/2026): G01 sinh 29/10, 30w0d → 7 ngày → 31w0d; G05 sinh 05/11, 34w2d → 0 ngày → 34w2d;
// G03 sinh 15/09, 32w0d → 51 ngày → 39w2d; G12 sinh 29/10, 39w0d → 7 ngày → 40w0d.
const hhmm = (d) => String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
// chạm đặt giờ máy giả mới trong lúc app đang mở (giả lập "thời gian trôi qua"): app kiểm lại khi tab hiện lại
const datGio = async (page, d) => { await page.clock.setFixedTime(d); await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange'))); await page.waitForTimeout(500); };
const daiMocText = async (page) => { const e = page.locator('.dai-moc'); return (await e.count()) ? doiMau(await e.first().innerText()) : ''; };
const dateTextV96 = async (page) => doiMau(await page.locator('.ph-head .ph-ngay-chu, .pc-side .muted.small').first().innerText());
const hangDb = async (page, bang, loc) => (await docBang(page, bang)).filter(loc);

// độ tương phản + vùng chạm + cỡ chữ cho một màn hình v9.6
async function kiemManV96(page, ten, sel, T, dark, E) {
  const nho = await nutNhoTrang(page);
  if (nho.length) E(`${ten} có nút < 44px — ${nho.join('; ')}`);
  for (const x of await doCoChu(page)) E(`${ten}: cỡ chữ ngoài thang 5 bậc — ${x}`);
  for (const s of [].concat(sel)) {
    const r = await doTuongPhanChu(page, s);
    (T.tuongPhan ||= {})[ten + ' ' + s] = r;
    if (r.loi || r.min < 4.5) E(`tương phản chữ ${ten} (${s}) ${r.loi || r.min + ' (' + r.worst + ')'} < 4,5`);
  }
}

async function luongIphoneV96(dark) {
  const sfx = dark ? '-toi' : '-sang';
  const E = (s) => ketQua.loi.push(`v9.6${dark ? ' tối' : ''}: ${s}`);
  const { ctx, page } = await moAppHaiNgay({ ...IPHONE96, colorScheme: dark ? 'dark' : 'light' });
  const cdp = await ctx.newCDPSession(page);
  const T = (ketQua.thuChucNang['haiNgay' + (dark ? 'Toi' : 'Sang')] = {});
  if ((await laToiLuc(page)) !== dark) E('app không ở đúng chế độ sáng/tối');
  const h1 = async () => doiMau(await page.locator('h1').first().textContent());
  const S0 = await chupDb(page);
  const gatNut = () => page.locator('.ph-2ngay'); // mức 2: iPhone chỉ còn nút '2 ngày' bật/tắt
  const tab = (ten) => page.getByRole('button', { name: ten, exact: true });
  const the = (ma) => page.locator('.hn-the', { has: page.locator('.pat-code', { hasText: new RegExp('^' + ma + '$') }) });

  // === A. Việc: nút gạt, mặc định "Hôm nay", dòng ngày; đang SAU mốc nên không có dải "Ngày làm việc" ===
  T.macDinh = await page.evaluate(() => [...document.querySelectorAll('.ph-2ngay')].map((e) => [e.textContent, e.getAttribute('aria-pressed'), Math.round(e.getBoundingClientRect().width), Math.round(e.getBoundingClientRect().height)]));
  if (T.macDinh.map((x) => x[0] + ':' + x[1]).join() !== '2 ngày:false') E('mặc định phải là "Hôm nay" (mỗi lần mở app): ' + JSON.stringify(T.macDinh));
  if (T.macDinh.some((x) => x[2] < 44 || x[3] !== 52)) E('nút "2 ngày" không cao 52px: ' + JSON.stringify(T.macDinh));
  if (await daiMocText(page)) E('đang sau mốc (08:00) mà vẫn có dải "Ngày làm việc": ' + (await daiMocText(page)));
  if (!/05\/11/.test(await dateTextV96(page)) || (await h1()) !== 'Việc hôm nay') E('đầu trang Việc 1 ngày: ' + (await dateTextV96(page)) + ' / ' + (await h1()));
  if (await page.locator('.hq-khung').count()) E('chế độ Hôm nay mà vẫn có khung "Còn từ hôm qua"');

  // === B. Việc 2 ngày (bảng 17c) ===
  await gatNut('2 ngày').tap();
  await page.waitForTimeout(500);
  T.viec = await page.evaluate(() => {
    const k = document.querySelector('.hq-khung');
    if (!k) return null;
    return {
      tieuDe: k.querySelector('.hq-tieu-de').textContent.trim(), nut: k.querySelector('.hq-doi').textContent.trim(), nutCao: Math.round(k.querySelector('.hq-doi').getBoundingClientRect().height),
      hang: [...k.querySelectorAll('.hq-hang')].map((e) => [e.querySelector('.task-text').textContent.trim(), e.querySelector('.hq-sub').textContent.trim()]),
      ghi: k.querySelector('.hq-ghi').textContent.trim(), nen: getComputedStyle(k).backgroundColor,
      denNhomDau: k.getBoundingClientRect().bottom <= document.querySelector('.ph-main .group').getBoundingClientRect().top + 1,
      homNay: [...document.querySelectorAll('.ph-main .group .task-text')].map((e) => e.textContent.trim()),
      ngay: document.querySelector('.ph-head .ph-ngay-chu').textContent.trim()
    };
  });
  const v = T.viec;
  if (!v) E('chế độ 2 ngày không có khung "Còn từ hôm qua"');
  else {
    if (v.tieuDe !== 'Còn từ hôm qua, 3 việc') E('tiêu đề khung: "' + v.tieuDe + '"');
    if (v.nut !== 'Dời hết sang hôm nay' || v.nutCao < 44) E('nút Dời hết: ' + v.nut + ' cao ' + v.nutCao);
    const can = [['Gọi người nhà giường 12', '04/11, HP'], ['Theo dõi đường huyết G05', 'Ghi lúc 23:40 đêm qua, NICU'], ['Kháng sinh lần 2 cho G05', 'Ghi lúc 03:10 đêm qua, NICU']];
    if (JSON.stringify(v.hang) !== JSON.stringify(can)) E('các việc còn từ hôm qua (chỉ việc chưa xong, chưa xoá, của đúng ngày làm việc trước): ' + JSON.stringify(v.hang));
    if (!v.denNhomDau) E('khung "Còn từ hôm qua" phải đứng đầu, trên các nhóm');
    if (v.homNay.join('|') !== 'Xem lại khí máu giường 3|Ký y lệnh truyền máu') E('việc của hôm nay trong chế độ 2 ngày: ' + v.homNay.join('|'));
    if (v.ngay !== 'Hôm qua 04/11 và hôm nay 05/11') E('dòng ngày ở đầu trang: ' + v.ngay);
    if (v.ghi !== 'Vuốt phải là xong luôn. Chạm 2 lần để dời riêng một việc.') E('chú thích khung: ' + v.ghi);
  }
  await kiemManV96(page, 'Việc 2 ngày', ['.hq-khung', '.ph-main'], T, dark, E);
  await chup(page, 'iphone-viec-hai-ngay' + sfx, true);
  // chỉ xem, không ghi gì
  const S1 = await chupDb(page);
  T.xemViecKhongGhi = { doi: dbDoi(S0, S1), moi: dbMoi(S0, S1) };
  if (T.xemViecKhongGhi.doi.length || T.xemViecKhongGhi.moi) E('mở Việc 2 ngày làm đổi dữ liệu cũ: ' + JSON.stringify(T.xemViecKhongGhi));

  // === C. Khám 2 ngày (bảng 17a): giữ chế độ khi đổi tab ===
  await tab('Khám').tap();
  await page.waitForTimeout(700);
  T.giuCheDo = await gatNut('2 ngày').getAttribute('aria-pressed');
  if (T.giuCheDo !== 'true') E('đổi sang tab Khám mà chế độ 2 ngày không được giữ');
  T.kham = await page.evaluate(() => ({
    chip: [...document.querySelectorAll('nav[aria-label="Lọc"] .chip')].map((e) => e.innerText.replace(/\s+/g, ' ').trim() + (e.getAttribute('aria-pressed') === 'true' ? '*' : '')),
    phong: [...document.querySelectorAll('.nt-phong-h')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()),
    soThe: document.querySelectorAll('.hn-the').length, soChep: document.querySelectorAll('.hn-chep').length,
    ngay: document.querySelector('.ph-head .ph-ngay-chu').textContent.trim(), h1: document.querySelector('h1').textContent.trim(),
    chepCao: [...document.querySelectorAll('.hn-chep')].map((e) => Math.round(e.getBoundingClientRect().height))
  }));
  const k = T.kham;
  if (k.chip.join('|') !== 'Tất cả 13*|Mới đêm qua 1|Còn việc 3|Chưa chép 6') E('chip lọc (13 bé, 1 mới đêm qua, 3 còn việc, 6 chưa chép): ' + k.chip.join('|'));
  if (k.phong.join('|') !== 'Phòng 1 4 bé|Phòng 2 4 bé|Phòng 3 4 bé|Phòng cũ (đã xoá) 1 bé') E('các phòng và số bé (phòng đã xoá vẫn hiện): ' + k.phong.join('|'));
  if (k.soThe !== 13 || k.soChep !== 6) E('13 thẻ, 6 nút Chép sang — thực tế ' + k.soThe + ' thẻ, ' + k.soChep + ' nút');
  if (k.chepCao.some((c) => c < 44)) E('nút Chép sang < 44px: ' + k.chepCao.join());
  if (k.ngay !== 'Hôm qua 04/11 và hôm nay 05/11' || k.h1 !== 'Khám bệnh hôm nay') E('đầu trang Khám 2 ngày: ' + k.ngay + ' / ' + k.h1);
  T.theG05 = await page.evaluate(() => {
    const e = [...document.querySelectorAll('.hn-the')].find((x) => x.querySelector('.pat-code')?.textContent === 'G05');
    const cs = getComputedStyle(e);
    return { chu: e.innerText.replace(/\n+/g, ' | '), vien: cs.borderTopWidth, kieu: cs.borderTopStyle, mau: cs.borderTopColor, lop: e.className };
  });
  const noteLine = await mauBien(page, '--noteLine');
  if (!/Vào 02:30 đêm qua/.test(T.theG05.chu) || !['1px', '1.5px'].includes(T.theG05.vien) || T.theG05.mau !== noteLine) E('thẻ bé vào đêm: viền vàng 1,5px + "Vào 02:30 đêm qua": ' + JSON.stringify(T.theG05));
  if (!/Đêm qua \| Sinh mổ 34w2d/.test(T.theG05.chu) || !/Hôm nay \| Chưa khám\. Còn 2 việc, tăng 30 g/.test(T.theG05.chu) || !/34w2d, 1980 g/.test(T.theG05.chu)) E('thẻ G05 thiếu dòng Đêm qua / Hôm nay / số đo: ' + T.theG05.chu);
  T.theG12 = await page.evaluate(() => { const e = [...document.querySelectorAll('.hn-the')].find((x) => x.querySelector('.pat-code')?.textContent === 'G12'); return { kieu: getComputedStyle(e).borderTopStyle, chu: e.innerText.replace(/\n+/g, ' | ') }; });
  if (T.theG12.kieu !== 'dashed' || !/Chỉ có hôm qua\. Chưa có trong danh sách hôm nay/.test(T.theG12.chu) || !/Chép sang/.test(T.theG12.chu)) E('thẻ bé chỉ có hôm qua: viền gạch đứt + Chép sang: ' + JSON.stringify(T.theG12));
  const chuThe = async (ma) => doiMau(await the(ma).first().innerText());
  T.theG03 = await chuThe('G03'); T.theG01 = await chuThe('G01');
  if (!/Hôm nay Đã khám, tăng 20 g/.test(T.theG03)) E('thẻ G03 thiếu "Đã khám, tăng 20 g": ' + T.theG03);
  if (!/31w0d, 1830 g/.test(T.theG01) || !/giảm 20 g/.test(T.theG01) || !/Còn: Đo bilirubin/.test(T.theG01)) E('thẻ G01 (31w0d, 1830 g, giảm 20 g, còn Đo bilirubin): ' + T.theG01);
  T.trungMa = await page.evaluate(() => [...document.querySelectorAll('.hn-the .pat-code')].filter((e) => e.textContent === 'G07').length);
  T.khongMa = await page.evaluate(() => [...document.querySelectorAll('.hn-the .pat-code')].filter((e) => e.textContent === 'Chưa có mã').length);
  T.khacNgaySinh = await page.evaluate(() => [...document.querySelectorAll('.hn-the .pat-code')].filter((e) => e.textContent === 'G20').length);
  if (T.trungMa !== 3) E('trùng mã G07 (2 hôm qua + 1 hôm nay) phải hiện đủ 3 thẻ, không ghép: ' + T.trungMa);
  if (T.khongMa !== 2) E('bé không mã (1 hôm qua + 1 hôm nay) phải là 2 thẻ riêng: ' + T.khongMa);
  if (T.khacNgaySinh !== 2) E('G20 khác ngày sinh hai bên phải là 2 thẻ riêng: ' + T.khacNgaySinh);
  await kiemManV96(page, 'Khám 2 ngày', ['.ph-main', '.chips', '.ph-r2'], T, dark, E);
  await chup(page, 'iphone-kham-hai-ngay' + sfx, true);
  // chip lọc
  for (const [nhan, can] of [['Mới đêm qua', 1], ['Còn việc', 3], ['Chưa chép', 6], ['Tất cả', 13]]) {
    await page.locator('nav[aria-label="Lọc"] .chip', { hasText: nhan }).tap();
    await page.waitForTimeout(250);
    const n = await page.locator('.hn-the').count();
    if (n !== can) E(`chip "${nhan}" phải còn ${can} thẻ, đang ${n}`);
  }
  const S2 = await chupDb(page);
  T.xemKhamKhongGhi = { doi: dbDoi(S0, S2), moi: dbMoi(S0, S2) };
  if (T.xemKhamKhongGhi.doi.length || T.xemKhamKhongGhi.moi) E('mở Khám 2 ngày + lọc làm đổi dữ liệu cũ: ' + JSON.stringify(T.xemKhamKhongGhi));

  // === D. Tổng hợp giao tour (bảng 17d) ===
  await page.getByRole('button', { name: 'Tổng hợp giao tour', exact: true }).tap();
  const hopT = page.getByRole('dialog', { name: 'Tổng hợp giao tour' });
  await hopT.waitFor();
  await page.waitForTimeout(700);
  const vanT = () => hopT.locator('#gt-text').inputValue();
  T.tour = await page.evaluate(() => ({
    tieuDe: document.querySelector('.sheet-tour .h2').textContent.trim(), phu: document.querySelector('.sheet-tour .nhieu-dau .muted').textContent.trim(),
    chip: [...document.querySelectorAll('.tour-chip')].map((e) => e.textContent.trim() + ':' + e.getAttribute('aria-pressed') + ':' + Math.round(e.getBoundingClientRect().height)),
    coChu: getComputedStyle(document.querySelector('#gt-text')).fontSize
  }));
  if (T.tour.tieuDe !== 'Giao tour 04/11 sang 05/11' || T.tour.phu !== '13 bé, 1 mới đêm qua, 4 việc còn lại') E('đầu bảng giao tour: ' + JSON.stringify([T.tour.tieuDe, T.tour.phu]));
  if (T.tour.chip.join('|') !== 'Bé mới:true:44|Việc còn lại:true:44|Bé ổn định:true:44|Ghi chú:false:44') E('bốn chip giao tour (Ghi chú mặc định tắt, cao 44px): ' + T.tour.chip.join('|'));
  if (T.tour.coChu !== '16px') E('ô văn bản giao tour phải 16px: ' + T.tour.coChu);
  const van0 = await vanT();
  T.van0 = van0;
  const khoi = (van, dau) => (van.split('\n\n').find((b) => b.startsWith(dau)) || '');
  const dongBe = (b) => b.split('\n').filter((l) => /^(P\d|Phòng cũ) - /.test(l));
  if (!van0.startsWith('GIAO TOUR 04/11 - 05/11/2026\n13 bé. 1 mới đêm qua. 4 việc còn lại.')) E('đầu văn bản giao tour: ' + van0.slice(0, 120));
  const bMoi = khoi(van0, 'BÉ MỚI ĐÊM QUA'), bViec = khoi(van0, 'VIỆC CÒN TỪ HÔM QUA'), bOn = khoi(van0, 'BÉ ỔN ĐỊNH');
  if (dongBe(bMoi).join('|') !== 'P1 - G05 - vào 02:30 - 34w2d - 1980 g, tăng 30 g' || !/- Chụp X-quang ngực/.test(bMoi) || !/- Khí máu sau 6 giờ CPAP/.test(bMoi)) E('nhóm BÉ MỚI ĐÊM QUA: ' + bMoi);
  if (dongBe(bViec).join('|') !== 'P1 - G01 - 31w0d - 1830 g, giảm 20 g|P2 - G12 - 40w0d - 3200 g - chưa có trong danh sách hôm nay' || !/- Đo bilirubin/.test(bViec) || !/- Theo dõi vàng da/.test(bViec)) E('nhóm VIỆC CÒN TỪ HÔM QUA: ' + bViec);
  if (dongBe(bOn).length !== 10 || !dongBe(bOn).includes('P1 - G03 - 39w2d - 2100 g, tăng 20 g')) E('nhóm BÉ ỔN ĐỊNH phải có 10 bé gồm "P1 - G03 - 39w2d - 2100 g, tăng 20 g": ' + dongBe(bOn).length + ' / ' + bOn);
  if (dongBe(van0).length !== 13) E('mỗi bé đúng một nhóm: tổng dòng bé ' + dongBe(van0).length + ' ≠ 13');
  if (!dongBe(bOn).some((l) => /^Phòng cũ - G99 /.test(l)) || !dongBe(bOn).some((l) => /^P3 - Chưa có mã/.test(l))) E('bé phòng đã xoá / bé không mã thiếu trong văn bản giao tour');
  await kiemManV96(page, 'Giao tour', ['.sheet'], T, dark, E);
  await chup(page, 'iphone-giao-tour' + sfx, true);
  // bật/tắt chip khi CHƯA sửa: văn bản đi theo ngay; dòng đầu vẫn đếm đủ
  await hopT.getByRole('button', { name: 'Việc còn lại', exact: true }).tap();
  await page.waitForTimeout(250);
  const van1 = await vanT();
  if (/VIỆC CÒN TỪ HÔM QUA/.test(van1) || !van1.includes('13 bé. 1 mới đêm qua. 4 việc còn lại.')) E('tắt chip Việc còn lại (chưa sửa): nhóm phải biến mất, dòng đầu vẫn đếm đủ: ' + van1.slice(0, 160));
  if (await hopT.getByRole('alert').count()) E('chưa sửa mà đã hiện báo "chưa soạn lại"');
  await hopT.getByRole('button', { name: 'Việc còn lại', exact: true }).tap();
  await page.waitForTimeout(250);
  if ((await vanT()) !== van0) E('bật lại chip phải ra đúng văn bản ban đầu');
  // ĐÃ SỬA: đổi chip không đụng vào chữ; báo rõ; "Soạn lại" mới soạn theo chip mới
  await hopT.locator('#gt-text').fill(van0 + '\nGHI THÊM CỦA TÔI');
  await hopT.getByRole('button', { name: 'Ghi chú', exact: true }).tap();
  await page.waitForTimeout(300);
  const van2 = await vanT();
  T.baoChuaSoanLai = (await hopT.getByRole('alert').count()) ? doiMau(await hopT.getByRole('alert').innerText()) : '';
  if (!van2.includes('GHI THÊM CỦA TÔI') || /Ghi chú:|Ghi chú hôm qua:/.test(van2)) E('đã sửa rồi đổi chip: chữ đã sửa phải còn nguyên và chưa soạn theo chip mới');
  if (!/chưa được áp dụng.*Soạn lại/.test(T.baoChuaSoanLai)) E('đã sửa rồi đổi chip: phải báo rõ chip đã đổi mà văn bản chưa soạn lại: "' + T.baoChuaSoanLai + '"');
  if (!/can-soan/.test(await hopT.getByRole('button', { name: 'Soạn lại', exact: true }).getAttribute('class'))) E('nút Soạn lại phải nổi bật khi chip đã đổi');
  await kiemManV96(page, 'Giao tour có báo', ['.sheet'], T, dark, E);
  await hopT.getByRole('button', { name: 'Soạn lại', exact: true }).tap();
  await page.waitForTimeout(300);
  const van3 = await vanT();
  if (van3.includes('GHI THÊM CỦA TÔI') || !/Ghi chú hôm qua: Sinh mổ 34w2d/.test(van3) || (await hopT.getByRole('alert').count())) E('bấm Soạn lại: phải soạn theo chip mới (có ghi chú), bỏ bản sửa, hết báo');
  await hopT.getByRole('button', { name: 'Sao chép', exact: true }).tap();
  await page.waitForTimeout(500);
  T.saoChep = doiMau(await hopT.locator('[role=status].status').innerText().catch(() => ''));
  if (!/^(Đã sao chép|Chưa sao chép được)/.test(T.saoChep)) E('bấm Sao chép không có thông báo: "' + T.saoChep + '"');
  try { const cb = await page.evaluate(() => navigator.clipboard.readText()); if (T.saoChep.startsWith('Đã') && cb.replace(/\r\n/g, '\n').trim() !== van3.replace(/\r\n/g, '\n').trim()) ketQua.luuY.push('v9.6: clipboard khác văn bản giao tour (có thể do môi trường thử)'); } catch { ketQua.luuY.push('v9.6: không đọc được clipboard để so với văn bản giao tour'); }
  await hopT.getByRole('button', { name: 'Đóng tổng hợp giao tour', exact: true }).tap();
  await page.waitForTimeout(700);

  // === E. Chi tiết bé ở chế độ 2 ngày (bảng 17b) ===
  await the('G05').locator('.hn-mo').tap();
  const hopB = page.getByRole('dialog', { name: 'Chi tiết bệnh nhân' });
  await hopB.waitFor();
  await page.waitForTimeout(700);
  T.be = await page.evaluate(() => {
    const s = document.querySelector('.sheet-be');
    const d = s.querySelector('.be-dem');
    return {
      ma: s.querySelector('#be-ma').value, vao: s.querySelector('.be-vao')?.textContent.trim(), dem: d ? d.querySelector('summary').innerText.replace(/\s+/g, ' ').trim() : null, demMo: d?.open,
      demCoONhap: d ? d.querySelectorAll('input,textarea,select').length : -1, demChu: d ? d.querySelector('.be-dem-nd').innerText.replace(/\n+/g, ' | ') : '',
      can: s.querySelector('.be-dcan')?.textContent.trim(), viec: [...s.querySelectorAll('.todo-row')].map((e) => e.innerText.replace(/\n+/g, ' ').trim()),
      nhanGhiChu: s.querySelector('label[for=ghichu-be]').textContent.trim(), tieuDeViec: s.querySelector('.be-viec-h').innerText.replace(/\s+/g, ' ').trim(),
      ds: [...s.querySelectorAll('.be-3 input')].map((e) => e.value)
    };
  });
  const b = T.be;
  if (b.ma !== 'G05' || b.vao !== 'Vào 02:30') E('chi tiết G05: mã / chip "Vào 02:30": ' + JSON.stringify([b.ma, b.vao]));
  if (b.dem !== 'Đêm qua, ghi lúc 02:30 chỉ xem' || !b.demMo || b.demCoONhap !== 0) E('khung "Đêm qua, ghi lúc 02:30" chỉ xem, không ô nhập, đang mở: ' + JSON.stringify([b.dem, b.demMo, b.demCoONhap]));
  if (!/Ghi chú: Sinh mổ 34w2d/.test(b.demChu) || !/Kháng sinh lần đầu 03:00/.test(b.demChu) || !/Chụp X-quang ngực, đã chép sang hôm nay/.test(b.demChu)) E('khung Đêm qua thiếu ghi chú / việc đã xong / việc đã chép: ' + b.demChu);
  if (b.can !== 'Cân nặng so với hôm qua: tăng 30 g') E('mức cân so với hôm qua (1980 − 1950): ' + b.can);
  if (!b.viec[0].includes('Chụp X-quang ngực') || !b.viec[0].includes('từ đêm qua') || b.viec[1].includes('từ đêm qua')) E('thẻ "từ đêm qua" chỉ cho việc cùng chữ: ' + JSON.stringify(b.viec));
  if (b.nhanGhiChu !== 'Ghi chú hôm nay' || b.tieuDeViec !== 'Việc hôm nay Còn 2/2') E('nhãn Ghi chú hôm nay / Việc hôm nay: ' + JSON.stringify([b.nhanGhiChu, b.tieuDeViec]));
  if (b.ds.join() !== '0511,342,1980') E('ba ô Ngày sinh/Tuổi thai/Cân nặng phải là của dòng HÔM NAY: ' + b.ds.join());
  await kiemManV96(page, 'Chi tiết bé 2 ngày', ['.sheet-be'], T, dark, E);
  await chup(page, 'iphone-be-hai-ngay' + sfx, true);
  // sửa: ghi vào dòng HÔM NAY, không đụng dòng hôm qua
  const dQ0 = (await docBang(page, 'exam_patients')).find((p) => p.id === 'q-g05');
  await hopB.locator('#ghichu-be').fill('Ghi chú thử hôm nay');
  await hopB.getByLabel('Cân nặng, g').fill('1900');
  await page.waitForTimeout(900);
  const dQ1 = (await docBang(page, 'exam_patients')).find((p) => p.id === 'q-g05');
  const dH1 = (await docBang(page, 'exam_patients')).find((p) => p.id === 'h-g05');
  T.suaDung = { homNay: [dH1.note, dH1.wt], homQuaGiu: JSON.stringify(dQ0) === JSON.stringify(dQ1) };
  if (dH1.note !== 'Ghi chú thử hôm nay' || dH1.wt !== '1900') E('sửa ghi chú / cân nặng không vào dòng hôm nay: ' + JSON.stringify(T.suaDung));
  if (!T.suaDung.homQuaGiu) E('sửa trong chi tiết bé làm đổi dòng HÔM QUA (nguy hiểm): ' + JSON.stringify([dQ0, dQ1]));
  const canMoi = doiMau(await hopB.locator('.be-dcan').innerText());
  if (canMoi !== 'Cân nặng so với hôm qua: giảm 50 g') E('mức cân phải đổi theo ô đang gõ (1900 − 1950): ' + canMoi);
  await hopB.getByRole('button', { name: 'Tính tuần tuổi', exact: true }).tap();
  await page.waitForTimeout(300);
  T.tuoiBe = doiMau(await hopB.locator('.be-kq').innerText());
  if (!/0 ngày/.test(T.tuoiBe) || !/34w2d/.test(T.tuoiBe)) E('G05 sinh 05/11 (ngày lịch 05/11) phải 0 ngày, 34w2d: ' + T.tuoiBe);
  await hopB.getByRole('button', { name: 'Đóng chi tiết', exact: true }).tap();
  await page.waitForTimeout(700);
  // bé có từ hôm qua nhưng không ở đêm: khung "Hôm qua", không chip "Vào"
  await the('G03').locator('.hn-mo').tap();
  await hopB.waitFor();
  await page.waitForTimeout(600);
  T.beG03 = await page.evaluate(() => { const s = document.querySelector('.sheet-be'); return { dem: s.querySelector('.be-dem summary')?.innerText.replace(/\s+/g, ' ').trim(), vao: !!s.querySelector('.be-vao'), can: s.querySelector('.be-dcan')?.textContent.trim() }; });
  if (T.beG03.dem !== 'Hôm qua chỉ xem' || T.beG03.vao || T.beG03.can !== 'Cân nặng so với hôm qua: tăng 20 g') E('chi tiết G03: ' + JSON.stringify(T.beG03));
  await hopB.getByRole('button', { name: 'Đóng chi tiết', exact: true }).tap();
  await page.waitForTimeout(700);
  // bé chỉ có hôm qua: chi tiết CHỈ XEM, không ô nhập
  await the('G12').locator('.hn-mo').tap();
  const hopX = page.getByRole('dialog', { name: 'Chi tiết bé hôm qua, chỉ xem' });
  await hopX.waitFor();
  await page.waitForTimeout(600);
  T.beChiXem = await page.evaluate(() => { const s = document.querySelector('.sheet-be'); return { oNhap: s.querySelectorAll('input,textarea,select').length, chu: s.innerText.replace(/\n+/g, ' | ') }; });
  if (T.beChiXem.oNhap || !/Chỉ xem, ngày 04\/11/.test(T.beChiXem.chu) || !/Theo dõi vàng da/.test(T.beChiXem.chu)) E('chi tiết bé chỉ có hôm qua phải chỉ xem (không ô nhập): ' + JSON.stringify(T.beChiXem));
  await hopX.getByRole('button', { name: 'Đóng chi tiết', exact: true }).tap();
  await page.waitForTimeout(700);

  // === F. Chép sang (chepMotBe): không trùng ===
  const hangH = async () => (await docBang(page, 'exam_patients')).filter((p) => p.examDate === H96 && !p.deleted);
  const nH0 = (await hangH()).length;
  const chepNut = (ten) => page.getByRole('button', { name: ten, exact: true });
  const thongBao = async () => { await page.waitForTimeout(500); return doiMau(await page.locator('.nt-msg').innerText().catch(() => '')); };
  await chepNut('Chép G12 sang hôm nay').tap();
  T.chepG12 = await thongBao();
  const sauG12 = await hangH();
  const g12 = sauG12.find((p) => p.code === 'G12');
  const todoG12 = g12 ? (await docBang(page, 'patient_todos')).filter((t) => t.patientId === g12.id && !t.deleted).map((t) => t.text) : [];
  if (sauG12.length !== nH0 + 1 || !g12 || g12.copiedFrom !== 'q-g12' || g12.roomId !== (await docBang(page, 'exam_patients')).find((p) => p.id === 'q-g12').roomId || g12.done !== false) E('Chép sang G12: phải thêm đúng 1 bé hôm nay, cùng phòng, copiedFrom, chưa khám: ' + JSON.stringify(g12));
  if (todoG12.join() !== 'Theo dõi vàng da') E('Chép sang phải kèm việc chưa xong: ' + todoG12.join());
  if (T.chepG12 !== 'Đã chép G12 sang hôm nay.') E('thông báo chép G12: "' + T.chepG12 + '"');
  if (await chepNut('Chép G12 sang hôm nay').count()) E('G12 đã có hôm nay mà thẻ vẫn còn nút Chép sang (thẻ phải ghép)');
  // bé không mã: chép được 1 lần, lần hai bị chặn (copiedFrom), không nhân đôi
  await chepNut('Chép bé sang hôm nay').tap();
  T.chepKhongMa1 = await thongBao();
  const sauKM1 = (await hangH()).length;
  await chepNut('Chép bé sang hôm nay').tap();
  T.chepKhongMa2 = await thongBao();
  const sauKM2 = (await hangH()).length;
  if (sauKM1 !== nH0 + 2 || sauKM2 !== sauKM1 || T.chepKhongMa2 !== 'Bé này đã có trong danh sách hôm nay.') E('bé không mã: lần 1 thêm 1, lần 2 phải bị chặn: ' + JSON.stringify([nH0, sauKM1, sauKM2, T.chepKhongMa2]));
  // trùng phòng + mã (G07 hai bé hôm qua, hôm nay đã có G07; G20 hôm nay đã có): không thêm
  await chepNut('Chép G07 sang hôm nay').first().tap();
  T.chepG07 = await thongBao();
  await chepNut('Chép G20 sang hôm nay').tap();
  T.chepG20 = await thongBao();
  if ((await hangH()).length !== sauKM2 || T.chepG07 !== 'Bé này đã có trong danh sách hôm nay.' || T.chepG20 !== 'Bé này đã có trong danh sách hôm nay.') E('trùng phòng + mã phải bị chặn: ' + JSON.stringify([T.chepG07, T.chepG20, (await hangH()).length, sauKM2]));
  // phòng đã xoá
  await chepNut('Chép G99 sang hôm nay').tap();
  T.chepG99 = await thongBao();
  if ((await hangH()).length !== sauKM2 || T.chepG99 !== 'Phòng của bé đã bị xoá, không chép được.') E('bé ở phòng đã xoá không được chép: ' + JSON.stringify([T.chepG99, (await hangH()).length]));
  // dòng hôm qua không bị đổi vì chép
  const qSau = await docBang(page, 'exam_patients');
  const qDoi = qSau.filter((p) => p.examDate === Q96).filter((p) => JSON.stringify(p) !== JSON.stringify((S0.exam_patients[p.id] ? JSON.parse(S0.exam_patients[p.id]) : null)));
  if (qDoi.length) E('Chép sang làm đổi dòng hôm qua: ' + qDoi.map((p) => p.id).join());
  await kiemManV96(page, 'Khám 2 ngày sau Chép sang', ['.ph-main', '.nt-chan'], T, dark, E);
  await choHoanTacTat(page);

  // === G. Việc 2 ngày: Dời hết + Hoàn tác trả đúng ngày cũ; dời riêng một việc; không đụng việc đã xong/đã xoá ===
  await tab('Việc').tap();
  await page.waitForTimeout(600);
  if ((await gatNut('2 ngày').getAttribute('aria-pressed')) !== 'true') E('về tab Việc mà chế độ 2 ngày không được giữ');
  const viecDb = async () => Object.fromEntries((await docBang(page, 'tasks')).map((t) => [t.id, t]));
  const tD0 = await viecDb();
  await page.getByRole('button', { name: 'Dời hết sang hôm nay', exact: true }).tap();
  await page.waitForTimeout(700);
  const tD1 = await viecDb();
  T.doiHet = ['tq1', 'tq2', 'tq3'].map((id) => tD1[id].date);
  if (T.doiHet.join() !== [H96, H96, H96].join()) E('Dời hết: 3 việc phải sang 05/11: ' + T.doiHet.join());
  if (['tq4', 'tq5', 'tq6', 'th1', 'th2'].some((id) => tD1[id].date !== tD0[id].date || tD1[id].updatedAt !== tD0[id].updatedAt || tD1[id].deleted !== tD0[id].deleted || tD1[id].done !== tD0[id].done)) E('Dời hết đụng vào việc đã xong / đã xoá / ngày xa hơn / việc hôm nay');
  if (['tq1', 'tq2', 'tq3'].some((id) => !(tD1[id].updatedAt > tD0[id].updatedAt))) E('Dời việc phải có updatedAt mới (để gộp sao lưu)');
  if (await page.locator('.hq-khung').count()) E('dời hết xong thì khung "Còn từ hôm qua" phải ẩn');
  T.thanhHoanTac = doiMau(await page.locator('.hoantac-chu').innerText().catch(() => ''));
  if (T.thanhHoanTac !== 'Đã dời 3 việc sang hôm nay') E('thanh Hoàn tác sau Dời hết: "' + T.thanhHoanTac + '"');
  await page.locator('.hoantac-nut').tap();
  await page.waitForTimeout(700);
  const tD2 = await viecDb();
  T.hoanTacDoi = ['tq1', 'tq2', 'tq3'].map((id) => tD2[id].date);
  if (T.hoanTacDoi.join() !== [Q96, Q96, Q96].join()) E('Hoàn tác phải trả đúng ngày cũ 04/11: ' + T.hoanTacDoi.join());
  if (!(await page.locator('.hq-khung').count())) E('Hoàn tác xong khung "Còn từ hôm qua" phải hiện lại');
  await choHoanTacTat(page);
  // dời riêng một việc: chạm 2 lần mở chi tiết, có nút "Dời sang hôm nay"
  const dong = page.locator('.hq-hang', { hasText: 'Theo dõi đường huyết G05' });
  await chamDoi(page, await tamDiem(dong.locator('.task-text')));
  const hopV = page.getByRole('dialog', { name: 'Chi tiết việc' });
  await hopV.waitFor();
  await page.waitForTimeout(700);
  await kiemManV96(page, 'Chi tiết việc còn từ hôm qua', ['.sheet'], T, dark, E);
  await hopV.getByRole('button', { name: 'Dời sang hôm nay', exact: true }).tap();
  await page.waitForTimeout(900);
  const tD3 = await viecDb();
  if (tD3.tq2.date !== H96 || tD3.tq1.date !== Q96 || tD3.tq3.date !== Q96) E('Dời riêng một việc: chỉ tq2 sang 05/11: ' + [tD3.tq1.date, tD3.tq2.date, tD3.tq3.date].join());
  if (!(await page.locator('.hq-khung .hq-tieu-de').innerText()).includes('2 việc')) E('sau khi dời riêng 1 việc khung phải còn 2 việc');
  await page.locator('.hoantac-nut').tap();
  await page.waitForTimeout(700);
  if ((await viecDb()).tq2.date !== Q96) E('Hoàn tác dời riêng phải trả về 04/11');
  await choHoanTacTat(page);
  // vuốt phải = xong luôn
  const dongXong = page.locator('.swipe', { has: page.locator('.hq-hang .task-text', { hasText: 'Gọi người nhà giường 12' }) });
  await vuotDong(page, cdp, dongXong.first(), 150);
  await page.waitForTimeout(400);
  const tD4 = await viecDb();
  T.vuotXong = { done: tD4.tq1.done, date: tD4.tq1.date, soHang: await page.locator('.hq-hang').count() };
  if (tD4.tq1.done !== true || tD4.tq1.date !== Q96 || T.vuotXong.soHang !== 2) E('vuốt phải việc còn từ hôm qua = xong luôn (giữ ngày, hết khỏi khung): ' + JSON.stringify(T.vuotXong));
  await demChamSauVuot(page);
  // ẩn nút gạt khi đang xem một ngày khác (lịch 9.5)
  await page.getByRole('button', { name: 'Mở lịch', exact: true }).tap();
  const hopL = page.getByRole('dialog', { name: 'Lịch công việc' });
  await hopL.waitFor();
  await page.waitForTimeout(500);
  await hopL.getByRole('button', { name: /^Ngày 3 tháng 11\b/ }).tap();
  await page.waitForTimeout(900);
  T.gatKhiXemNgayKhac = await page.locator('.ph-2ngay').count();
  if (T.gatKhiXemNgayKhac !== 0 || (await h1()) !== 'Việc ngày 03/11' || (await page.locator('.hq-khung').count())) E('xem ngày khác (lịch) thì phải ẩn nút gạt và khung 2 ngày: ' + JSON.stringify([T.gatKhiXemNgayKhac, await h1()]));
  await page.getByRole('button', { name: 'Về hôm nay', exact: true }).first().tap();
  await page.waitForTimeout(500);
  if (!(await page.locator('.ph-2ngay').count())) E('Về hôm nay xong phải hiện lại nút gạt');
  await ctx.close();
}
for (const toi of [false, true]) { try { await luongIphoneV96(toi); } catch (e) { console.error('V96 ' + (toi ? 'tối' : 'sáng') + ' dừng: ' + String(e.stack).split('\n').slice(0, 6).join(' | ')); throw e; } }

// ----- iPhone: trước mốc (02:30), đổi mốc có tác dụng ngay, bé "0511" ghi 02:30 phải ra 0 ngày 34w2d cả khi xem lại ngày 04/11 -----
async function luongTruocMoc(dark) {
  const sfx = dark ? '-toi' : '-sang';
  const E = (s) => ketQua.loi.push(`v9.6 trước mốc${dark ? ' tối' : ''}: ${s}`);
  const { ctx, page } = await moAppHaiNgay({ ...IPHONE96, colorScheme: dark ? 'dark' : 'light' }, gio96(5, 2, 30));
  const T = (ketQua.thuChucNang['truocMoc' + (dark ? 'Toi' : 'Sang')] = {});
  const h1 = async () => doiMau(await page.locator('h1').first().textContent());
  const tab = (ten) => page.getByRole('button', { name: ten, exact: true });
  // dải ghi rõ ngày làm việc
  T.dai = await daiMocText(page);
  T.ngay = await dateTextV96(page);
  if (T.dai !== 'Ngày làm việc 04/11 (đang là 02:30, 05/11)') E('dải ngày làm việc: "' + T.dai + '"');
  if (!/04\/11/.test(T.ngay)) E('dòng ngày ở đầu trang phải là ngày làm việc 04/11: ' + T.ngay);
  T.viecHomNay = await page.evaluate(() => [...document.querySelectorAll('.ph-main .group .task-text')].map((e) => e.textContent.trim()));
  if (!T.viecHomNay.includes('Gọi người nhà giường 12') || T.viecHomNay.includes('Xem lại khí máu giường 3')) E('02:30 thuộc ngày làm việc 04/11, việc hôm nay phải là việc của 04/11: ' + T.viecHomNay.join('|'));
  await kiemManV96(page, 'Trước mốc', ['.ph-head', '.ph-main'], T, dark, E);
  await chup(page, 'iphone-truoc-moc' + sfx, true);
  // ghi việc lúc 02:30 → date = ngày làm việc 04/11, KHÔNG phải 05/11
  await page.locator('#ph-draft').tap();
  await page.locator('#ph-draft').fill('Việc thử lúc 02:30');
  await page.getByRole('button', { name: 'Thêm việc', exact: true }).tap();
  await page.waitForTimeout(700);
  const vNew = (await docBang(page, 'tasks')).find((t) => t.text === 'Việc thử lúc 02:30');
  T.viecMoi = vNew && vNew.date;
  if (T.viecMoi !== Q96) E('việc ghi lúc 02:30 phải mang ngày làm việc 04/11: ' + T.viecMoi);
  // ghi bé "0511" lúc 02:30: examDate 04/11, tuổi theo ngày lịch 05/11 = 0 ngày, 34w2d
  await tab('Khám').tap();
  await page.waitForTimeout(600);
  if ((await daiMocText(page)) !== T.dai) E('tab Khám cũng phải có dải ngày làm việc: ' + (await daiMocText(page)));
  await page.getByRole('button', { name: 'Thêm bé vào Phòng 1', exact: true }).tap();
  const hopB = page.getByRole('dialog', { name: 'Chi tiết bệnh nhân' });
  await hopB.waitFor();
  await page.waitForTimeout(600);
  await hopB.locator('#be-ma').fill('B0511');
  await hopB.getByLabel('Ngày sinh').fill('0511');
  await hopB.getByLabel('Tuổi thai lúc sinh').fill('342');
  await page.waitForTimeout(900);
  const be = (await docBang(page, 'exam_patients')).find((p) => p.code === 'B0511');
  T.beMoi = be && { examDate: be.examDate, createdAt: new Date(be.createdAt).toString().slice(4, 21) };
  if (!be || be.examDate !== Q96 || hhmm(new Date(be.createdAt)) !== '02:30' || new Date(be.createdAt).getDate() !== 5) E('bé ghi lúc 02:30 ngày 05/11 phải mang examDate 04/11, createdAt 05/11 02:30: ' + JSON.stringify(T.beMoi));
  await hopB.getByRole('button', { name: 'Tính tuần tuổi', exact: true }).tap();
  await page.waitForTimeout(300);
  T.tuoiHomNay = doiMau(await hopB.locator('.be-kq').innerText());
  if (!/0 ngày/.test(T.tuoiHomNay) || !/34w2d/.test(T.tuoiHomNay)) E('bé "0511" lúc 02:30 phải ra 0 ngày 34w2d (tuổi theo ngày lịch): ' + T.tuoiHomNay);
  await hopB.getByRole('button', { name: 'Đóng chi tiết', exact: true }).tap();
  await page.waitForTimeout(700);
  // tổng hợp y lệnh hôm nay: tiêu đề "KHÁM SÁNG" theo ngày LỊCH 05/11, tuổi 34w2d
  await page.getByRole('button', { name: 'Tổng hợp y lệnh', exact: true }).tap();
  await page.locator('#tonghop-noidung').waitFor();
  const vanY = await page.locator('#tonghop-noidung').inputValue();
  T.tongHopHomNay = vanY.split('\n')[0];
  if (!/^KHÁM SÁNG 05\/11\/2026 - Y LỆNH/.test(vanY) || !/B0511 - 34w2d/.test(vanY)) E('tổng hợp y lệnh lúc 02:30 phải theo ngày lịch 05/11 và bé B0511 34w2d: ' + vanY.slice(0, 160));
  await page.getByRole('button', { name: 'Đóng tổng hợp', exact: true }).tap();
  await page.waitForTimeout(700);

  // đổi mốc trong cài đặt: có tác dụng ngay, ghi vào meta
  const hop = await moCaiDat(page);
  T.moc = await hop.evaluate((e) => {
    const s = e.querySelector('#cd-moc');
    const r = s.getBoundingClientRect();
    return { opts: [...s.options].map((o) => o.textContent), val: s.value, cao: Math.round(r.height), co: getComputedStyle(s).fontSize, nhan: e.querySelector('label[for=cd-moc]').textContent.trim(), giaiThich: e.querySelector('#cd-moc-giai-thich').textContent.trim(), tieuDe: e.querySelector('h3:not(#gd-tieu-de)') ? [...e.querySelectorAll('h3')].map((h) => h.textContent.trim()) : [] };
  });
  if (T.moc.opts.join() !== '00:00,06:00,07:00,08:00' || T.moc.val !== '420' || T.moc.nhan !== 'Ngày làm việc bắt đầu lúc') E('ô chọn mốc: ' + JSON.stringify(T.moc));
  if (T.moc.cao < 44 || T.moc.co !== '16px') E('ô chọn mốc phải cao ≥44px, chữ 16px: ' + T.moc.cao + ' / ' + T.moc.co);
  if (T.moc.tieuDe.join('|') !== 'Sao lưu lên OneDrive|Giao diện|Ngày làm việc|Cử chỉ') E('thứ tự các mục trong bảng cài đặt (15f): ' + T.moc.tieuDe.join('|'));
  if (!/Từ 00:00 đến 07:00 app vẫn tính là ngày làm việc hôm trước/.test(T.moc.giaiThich)) E('câu giải thích theo mốc 07:00: ' + T.moc.giaiThich);
  await kiemManV96(page, 'Cài đặt mốc', ['.sheet'], T, dark, E);
  await chup(page, 'iphone-cai-dat-moc' + sfx, true);
  const mocDb = async () => (await docBang(page, 'meta')).find((r) => r.key === 'mocNgayLamViec')?.value;
  await hop.locator('#cd-moc').selectOption('0');
  await page.waitForTimeout(700);
  T.moc00 = { dai: await daiMocText(page), giaiThich: doiMau(await hop.locator('#cd-moc-giai-thich').innerText()), db: await mocDb() };
  if (T.moc00.db !== 0 || !/trùng ngày lịch/.test(T.moc00.giaiThich)) E('mốc 00:00: meta = 0 và giải thích "trùng ngày lịch": ' + JSON.stringify(T.moc00));
  if (T.moc00.dai !== '') E('mốc 00:00 = ngày lịch: không còn dải ngày làm việc: "' + T.moc00.dai + '"');
  await hop.locator('#cd-moc').selectOption('420');
  await page.waitForTimeout(700);
  if ((await daiMocText(page)) !== T.dai || (await mocDb()) !== 420) E('đổi lại 07:00: dải ngày làm việc quay lại và meta = 420');
  await hop.locator('#cd-moc').selectOption('360');
  await page.waitForTimeout(500);
  if (!/Từ 00:00 đến 06:00 /.test(doiMau(await hop.locator('#cd-moc-giai-thich').innerText()))) E('giải thích phải đổi theo mốc 06:00');
  await hop.locator('#cd-moc').selectOption('420');
  await page.waitForTimeout(400);
  await dongCaiDat(page, hop);

  // thời gian trôi qua: tới 08:00 thì ngày làm việc sang 05/11 ngay, không cần mở lại app
  await datGio(page, gio96(5, 8, 0));
  T.sau0800 = { dai: await daiMocText(page), h1: await h1(), ngay: await dateTextV96(page) };
  if (T.sau0800.dai !== '' || !/05\/11/.test(T.sau0800.ngay)) E('qua mốc 07:00 (giờ máy đổi 08:00): phải sang ngày làm việc 05/11 và hết dải: ' + JSON.stringify(T.sau0800));
  // xem lại ngày 04/11: bé B0511 vẫn 0 ngày, 34w2d (KHÔNG ra 364 ngày)
  await page.getByRole('button', { name: 'Lịch khám', exact: true }).tap();
  const hopK = page.getByRole('dialog', { name: 'Lịch khám' });
  await hopK.waitFor();
  await page.waitForTimeout(500);
  await hopK.getByRole('button', { name: /^Ngày 4 tháng 11/ }).tap();
  await page.waitForTimeout(900);
  T.xemLai = await page.evaluate(() => ({ h1: document.querySelector('h1').textContent.trim(), dong: [...document.querySelectorAll('.nt-be')].map((e) => e.innerText.replace(/\n+/g, ' | ')) }));
  const dongB = T.xemLai.dong.find((d) => d.startsWith('B0511'));
  if (T.xemLai.h1 !== 'Khám ngày 04/11' || !dongB || !/34w2d hôm đó/.test(dongB) || /364|44w|86w|87w/.test(dongB)) E('xem lại 04/11: dòng B0511 phải "34w2d hôm đó": ' + JSON.stringify(T.xemLai));
  await page.locator('.nt-be', { hasText: 'B0511' }).tap();
  await page.getByRole('dialog', { name: 'Chi tiết bé ngày trước' }).waitFor();
  await page.waitForTimeout(600);
  T.xemLaiChiTiet = doiMau(await page.locator('.sheet-be .be-kq').innerText());
  if (!/0 ngày/.test(T.xemLaiChiTiet) || !/34w2d/.test(T.xemLaiChiTiet) || /364/.test(T.xemLaiChiTiet)) E('chi tiết xem lại 04/11 của B0511 phải 0 ngày, 34w2d (không 364 ngày): ' + T.xemLaiChiTiet);
  await page.getByRole('button', { name: 'Đóng chi tiết', exact: true }).tap();
  await page.waitForTimeout(700);
  await page.getByRole('button', { name: 'Tổng hợp ngày này', exact: true }).tap();
  await page.locator('#tonghop-noidung').waitFor();
  T.tongHopNgayTruoc = (await page.locator('#tonghop-noidung').inputValue()).split('\n').filter((l) => /B0511/.test(l)).join('|');
  if (!/B0511 - 34w2d/.test(T.tongHopNgayTruoc)) E('"Tổng hợp ngày này" 04/11 phải ghi B0511 - 34w2d: ' + T.tongHopNgayTruoc);
  await ctx.close();
}
for (const toi of [false, true]) { try { await luongTruocMoc(toi); } catch (e) { console.error('V96 trước mốc ' + (toi ? 'tối' : 'sáng') + ' dừng: ' + String(e.stack).split('\n').slice(0, 6).join(' | ')); throw e; } }

// ----- đồng hồ giả: 06:59 / 07:00, qua nửa đêm, qua tháng, qua năm, 29/02, và đúng lúc đang mở app thì qua mốc -----
{
  const { ctx, page } = await moAppHaiNgay(IPHONE96, gio96(5, 6, 59, 30));
  const T = ketQua.thuChucNang.dongHoGia = {};
  const E = (s) => ketQua.loi.push('v9.6 đồng hồ giả: ' + s);
  const ca = [
    [gio96(5, 6, 59, 30), 'Ngày làm việc 04/11 (đang là 06:59, 05/11)', '04/11/2026'],
    [gio96(5, 7, 0, 0), '', '05/11/2026'],
    [gio96(5, 23, 59, 50), '', '05/11/2026'],
    [gio96(6, 0, 0, 10), 'Ngày làm việc 05/11 (đang là 00:00, 06/11)', '05/11/2026'],
    [gio96(1, 3, 0, 0, 11), 'Ngày làm việc 30/11 (đang là 03:00, 01/12)', '30/11/2026'],
    [gio96(1, 3, 0, 0, 0, 2027), 'Ngày làm việc 31/12 (đang là 03:00, 01/01)', '31/12/2026'],
    [gio96(29, 3, 0, 0, 1, 2028), 'Ngày làm việc 28/02 (đang là 03:00, 29/02)', '28/02/2028'],
    [gio96(1, 3, 0, 0, 2, 2028), 'Ngày làm việc 29/02 (đang là 03:00, 01/03)', '29/02/2028']
  ];
  T.ket = [];
  for (const [g, dai, ngay] of ca) {
    await page.clock.setFixedTime(g);
    await page.reload();
    await page.waitForSelector('.phone-app');
    await page.waitForTimeout(400);
    const got = { dai: await daiMocText(page), ngay: await dateTextV96(page) };
    T.ket.push(hhmm(g) + ' ' + g.getDate() + '/' + (g.getMonth() + 1) + '/' + g.getFullYear() + ' → ' + (got.dai || '(không dải)') + ' | ' + got.ngay);
    if (got.dai !== dai || !got.ngay.includes(ngay.replace(/\/\d{4}$/, ''))) E(`${g.toString().slice(0, 21)}: cần dải "${dai}" và ngày ${ngay}, thực tế "${got.dai}" / "${got.ngay}"`);
  }
  // đang mở app lúc 06:59:55 rồi qua 07:00:05: tự đổi sang ngày làm việc mới
  await page.clock.setFixedTime(gio96(5, 6, 59, 55));
  await page.reload();
  await page.waitForSelector('.phone-app');
  await page.waitForTimeout(400);
  const truoc = await daiMocText(page);
  await datGio(page, gio96(5, 7, 0, 5));
  const sau = { dai: await daiMocText(page), ngay: await dateTextV96(page) };
  T.quaMocKhiMo = { truoc, sau };
  if (!truoc || sau.dai !== '' || !/05\/11/.test(sau.ngay)) E('đang mở app, qua 07:00 phải tự sang ngày làm việc mới: ' + JSON.stringify(T.quaMocKhiMo));
  await ctx.close();
}

// ----- PC: Việc và Khám 2 ngày, chi tiết bé ở cột phải, giao tour hộp giữa -----
{
  const { ctx, page } = await moAppHaiNgay({ viewport: { width: 1440, height: 900 } });
  const T = ketQua.thuChucNang.haiNgayPc = {};
  const E = (s) => ketQua.loi.push('v9.6 PC: ' + s);
  const gatNut = (ten) => page.getByRole('group', { name: 'Phạm vi xem' }).getByRole('button', { name: ten, exact: true });
  await gatNut('2 ngày').click();
  await page.waitForTimeout(500);
  T.viec = await page.evaluate(() => ({ tieuDe: document.querySelector('.hq-tieu-de')?.textContent.trim(), trongMain: !!document.querySelector('.pc-main .hq-khung'), nut: document.querySelector('.hq-doi')?.textContent.trim() }));
  if (T.viec.tieuDe !== 'Còn từ hôm qua, 3 việc' || !T.viec.trongMain || T.viec.nut !== 'Dời hết sang hôm nay') E('Việc 2 ngày trên PC: ' + JSON.stringify(T.viec));
  await chup(page, 'pc-viec-hai-ngay-sang', true);
  await page.getByRole('button', { name: 'Khám', exact: true }).click();
  await page.waitForTimeout(600);
  if ((await gatNut('2 ngày').getAttribute('aria-pressed')) !== 'true') E('PC: đổi tab mà chế độ 2 ngày không được giữ');
  T.kham = await page.evaluate(() => ({ the: document.querySelectorAll('.hn-the').length, chuaCoLay: !/Lấy danh sách|Quản lý phòng/.test(document.querySelector('.pc-side').textContent), ghep: document.querySelector('.gat-hn-ghi')?.textContent.trim() }));
  if (T.kham.the !== 13 || !T.kham.chuaCoLay || T.kham.ghep !== 'Ghép theo phòng và mã') E('Khám 2 ngày trên PC: ' + JSON.stringify(T.kham));
  await page.locator('.hn-the', { has: page.locator('.pat-code', { hasText: /^G05$/ }) }).locator('.hn-mo').click();
  await page.locator('aside.pc-detail').waitFor();
  await page.waitForTimeout(500);
  T.chiTiet = await page.evaluate(() => { const a = document.querySelector('aside.pc-detail'); return { dem: a.querySelector('.be-dem summary')?.innerText.replace(/\s+/g, ' ').trim(), can: a.querySelector('.be-dcan')?.textContent.trim(), cotPhai: a.getBoundingClientRect().left > document.querySelector('main.pc-main').getBoundingClientRect().right - 2 }; });
  if (T.chiTiet.dem !== 'Đêm qua, ghi lúc 02:30 chỉ xem' || T.chiTiet.can !== 'Cân nặng so với hôm qua: tăng 30 g' || !T.chiTiet.cotPhai) E('chi tiết bé 2 ngày trên PC: ' + JSON.stringify(T.chiTiet));
  await chup(page, 'pc-kham-hai-ngay-sang', true);
  await page.locator('aside.pc-detail').getByRole('button', { name: 'Đóng chi tiết', exact: true }).click();
  await page.getByRole('button', { name: 'Tổng hợp giao tour', exact: true }).click();
  await page.getByRole('dialog', { name: 'Tổng hợp giao tour' }).waitFor();
  await page.waitForTimeout(500);
  T.tour = await page.evaluate(() => ({ giua: !!document.querySelector('.sheet-wrap.center .sheet-tour'), coChu: getComputedStyle(document.querySelector('#gt-text')).fontSize }));
  if (!T.tour.giua || T.tour.coChu !== '16px') E('giao tour trên PC phải là hộp giữa, chữ 16px: ' + JSON.stringify(T.tour));
  await ctx.close();
}

// ---------- Phiếu 2026-11-09: xoá phòng khi HÔM NAY không còn bé (bé ngày trước giữ nguyên, vẫn xem được) ----------
// Thay luật cũ "Chỉ xoá được phòng chưa có bệnh nhân nào" (phòng từng có bé ở bất kỳ ngày nào thì khoá). Mẫu: bộ mẫu chung (21/10/2026 08:00):
// Phòng 1 (G01, G03) và Phòng 2 (G12) chỉ có bé ngày 20/10; Phòng 3 trống. Thêm bé hôm nay (21/10) vào Phòng 2 → Phòng 2 bị khoá.
// Sau lần kiểm đầu sẽ tắt dần: kiểm cũ không còn chỗ nào đòi chữ "chưa có bệnh nhân nào" nên không có phép kiểm cũ cần sửa.
const chenDb = (page, bang, rows) => page.evaluate(async ({ b, rs }) => {
  const db = await new Promise((res) => { const r = indexedDB.open('ghichu-sosinh'); r.onsuccess = () => res(r.result); });
  const tx = db.transaction(b, 'readwrite');
  rs.forEach((r) => tx.objectStore(b).put(r));
  await new Promise((res) => { tx.oncomplete = res; });
  db.close();
}, { b: bang, rs: rows });
const hangBeMoi = (id, roomId, code, examDate, extra = {}) => {
  const t = Date.now();
  return { id, roomId, code, examDate, dob: '0508', ga: '300', wt: '1900', note: '', done: false, order: 99, deleted: false, createdAt: t, updatedAt: t, deviceId: 'mau', ...extra };
};
async function luongXoaPhong(dark) {
  const sfx = dark ? '-toi' : '-sang';
  const E = (s) => ketQua.loi.push(`xoá phòng${dark ? ' tối' : ''}: ${s}`);
  const { ctx, page } = await moApp({ ...IPHONE_OPTS, colorScheme: dark ? 'dark' : 'light' });
  const cdp = await ctx.newCDPSession(page);
  const T = (ketQua.thuChucNang['xoaPhong' + (dark ? 'Toi' : 'Sang')] = {});
  if ((await laToiLuc(page)) !== dark) E('app không ở đúng chế độ sáng/tối');
  const phong = (await docBang(page, 'rooms')).sort((a, b) => a.order - b.order);
  const [p1, p2, p3] = phong;
  if (phong.length !== 3 || p1.name !== 'Phòng 1') { E('bộ mẫu phải có Phòng 1–3: ' + phong.map((r) => r.name)); await ctx.close(); return; }
  await chenDb(page, 'exam_patients', [hangBeMoi('xp-g40', p2.id, 'G40', '2026-10-21')]);
  await page.reload();
  await page.waitForSelector('.phone-app');
  await page.waitForTimeout(400);
  const hop = []; let cach = 'accept';
  page.on('dialog', async (d) => { hop.push(d.message()); await (cach === 'accept' ? d.accept() : d.dismiss()); });
  const nutXoa = (ten, khoa = false) => page.getByRole('button', { name: khoa ? ten : 'Xoá ' + ten, exact: true });
  const nutHoanTac = page.getByRole('button', { name: 'Hoàn tác', exact: true });
  const thanhHT = async () => doiMau(await page.locator('.hoantac').first().innerText().catch(() => ''));
  const docPhongDb = async (ten) => (await docBang(page, 'rooms')).find((r) => r.name === ten);
  const tenTrongKhung = () => page.evaluate(() => [...document.querySelectorAll('section[aria-label="Quản lý phòng"] .row4 input')].map((i) => i.value));
  const S0 = await chupDb(page);
  await page.getByRole('button', { name: 'Khám', exact: true }).tap();
  await page.waitForTimeout(500);
  await chonBangThem(page, 'Quản lý phòng', true);
  await page.locator('section[aria-label="Quản lý phòng"]').waitFor();
  await page.waitForTimeout(400);

  // === Trạng thái nút: Phòng 1 (chỉ bé ngày trước) mở, Phòng 2 (có bé hôm nay) khoá, Phòng 3 (trống) mở ===
  T.nut = await page.evaluate(() => [...document.querySelectorAll('section[aria-label="Quản lý phòng"] .icon-btn')].map((b) => [b.getAttribute('aria-label'), b.disabled]));
  const canNut = [['Xoá Phòng 1', false], ['Không xoá được Phòng 2 vì hôm nay còn 1 bé', true], ['Xoá Phòng 3', false]];
  if (JSON.stringify(T.nut) !== JSON.stringify(canNut)) E('nút xoá phòng (Phòng 1 chỉ có bé ngày trước phải mở; Phòng 2 có bé hôm nay phải khoá): ' + JSON.stringify(T.nut));
  T.chuDuoi = doiMau(await page.locator('section[aria-label="Quản lý phòng"] .muted.xsmall').last().innerText());
  if (T.chuDuoi !== 'Chỉ xoá được phòng hôm nay không còn bé.') E('chữ dưới khung: "' + T.chuDuoi + '"');
  if (/chưa có bệnh nhân nào/.test(await page.locator('.phone-app').innerText())) E('còn chữ cũ "chưa có bệnh nhân nào"');
  await nutNhoV95(page, 'quản lý phòng', dark);
  await chup(page, 'iphone-quan-ly-phong' + sfx, true);

  // === (b) phòng có bé hôm nay: khoá, bấm ép cũng không xoá ===
  await nutXoa('Không xoá được Phòng 2 vì hôm nay còn 1 bé', true).click({ force: true, timeout: 3000 }).catch(() => {});
  await page.evaluate(() => document.querySelector('section[aria-label="Quản lý phòng"] .icon-btn:disabled')?.click());
  await page.waitForTimeout(300);
  if ((await docPhongDb('Phòng 2')).deleted) E('(b) Phòng 2 còn bé hôm nay mà bấm ép vẫn bị xoá');
  if (hop.length || (await page.locator('.hoantac').count())) E('(b) bấm nút khoá mà hiện hỏi/Hoàn tác: ' + JSON.stringify(hop));

  // === (c) phòng trống mọi ngày: xoá ngay (không hỏi), có Hoàn tác 6 giây, Hoàn tác trả về ===
  await nutXoa('Phòng 3').tap();
  await page.waitForTimeout(500);
  T.xoaTrong = { hoi: hop.length, thanh: await thanhHT(), db: (await docPhongDb('Phòng 3')).deleted, ten: await tenTrongKhung() };
  if (T.xoaTrong.hoi || !T.xoaTrong.db || T.xoaTrong.thanh !== 'Đã xoá Phòng 3 Hoàn tác' || T.xoaTrong.ten.join() !== 'Phòng 1,Phòng 2') E('(c) xoá phòng trống: ' + JSON.stringify(T.xoaTrong));
  await nutHoanTac.tap();
  await page.waitForTimeout(500);
  T.hoanTacTrong = { db: (await docPhongDb('Phòng 3')).deleted, ten: await tenTrongKhung(), thanh: await thanhHT() };
  if (T.hoanTacTrong.db || T.hoanTacTrong.ten.join() !== 'Phòng 1,Phòng 2,Phòng 3' || T.hoanTacTrong.thanh) E('(c) Hoàn tác phòng trống: ' + JSON.stringify(T.hoanTacTrong));

  // === (a) phòng chỉ có bé ngày trước: hỏi đúng số bé; Không đồng ý thì giữ; đồng ý thì xoá; Hoàn tác về đúng vị trí ===
  const cauHoi = 'Xoá Phòng 1? 2 bé ở các ngày trước vẫn xem được trong Lịch Khám, nhưng không chép sang hôm nay được nữa.';
  cach = 'dismiss';
  await nutXoa('Phòng 1').tap();
  await page.waitForTimeout(400);
  T.khongDongY = { hoi: [...hop], db: (await docPhongDb('Phòng 1')).deleted };
  if (hop.length !== 1 || hop[0] !== cauHoi || T.khongDongY.db) E('(a) câu hỏi xác nhận / bấm Không đồng ý phải giữ phòng: ' + JSON.stringify(T.khongDongY));
  cach = 'accept';
  await nutXoa('Phòng 1').tap();
  await page.waitForTimeout(500);
  T.xoaCoBeCu = { hoi: hop.length, thanh: await thanhHT(), db: (await docPhongDb('Phòng 1')).deleted, ten: await tenTrongKhung() };
  if (hop.length !== 2 || hop[1] !== cauHoi || !T.xoaCoBeCu.db || T.xoaCoBeCu.thanh !== 'Đã xoá Phòng 1 Hoàn tác' || T.xoaCoBeCu.ten.join() !== 'Phòng 2,Phòng 3') E('(a) xoá phòng chỉ có bé ngày trước: ' + JSON.stringify(T.xoaCoBeCu));
  await chup(page, 'iphone-quan-ly-phong-hoan-tac' + sfx, true);
  const thuTuTruoc = p1.order;
  await nutHoanTac.tap();
  await page.waitForTimeout(500);
  const p1Sau = await docPhongDb('Phòng 1');
  T.hoanTacCoBeCu = { deleted: p1Sau.deleted, order: p1Sau.order, ten: await tenTrongKhung() };
  if (p1Sau.deleted || p1Sau.order !== thuTuTruoc || T.hoanTacCoBeCu.ten.join() !== 'Phòng 1,Phòng 2,Phòng 3') E('(a) Hoàn tác phải trả Phòng 1 về đúng vị trí đầu: ' + JSON.stringify(T.hoanTacCoBeCu));
  // xoá lại, lần này giữ nguyên: bé ngày trước phải còn trong dữ liệu và hiện ở xem ngày trước dưới tên phòng cũ
  await nutXoa('Phòng 1').tap();
  await page.waitForTimeout(500);
  const beTruoc = (await docBang(page, 'exam_patients')).filter((p) => p.roomId === p1.id);
  if (beTruoc.length !== 2 || beTruoc.some((p) => p.deleted)) E('(a) xoá phòng không được đụng bé ngày trước: ' + JSON.stringify(beTruoc.map((p) => [p.code, p.deleted])));
  await choHoanTacTat(page);
  await page.reload();
  await page.waitForSelector('.phone-app');
  await page.getByRole('button', { name: 'Khám', exact: true }).tap();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Lịch khám', exact: true }).tap();
  const hopK = page.getByRole('dialog', { name: 'Lịch khám' });
  await hopK.waitFor();
  await page.waitForTimeout(600);
  await hopK.getByRole('button', { name: /^Ngày 20 tháng 10\b/ }).tap();
  await page.waitForTimeout(900);
  T.ngayTruoc = await page.evaluate(() => ({ phong: [...document.querySelectorAll('.nt-phong-h')].map((h) => [...h.children].map((c) => c.textContent).join(' ')), ma: [...document.querySelectorAll('.nt-be .pat-code')].map((e) => e.textContent) }));
  if (!T.ngayTruoc.phong.some((s) => /^Phòng 1\b/.test(s)) || !['G01', 'G03', 'G12'].every((m) => T.ngayTruoc.ma.includes(m))) E('(a) sau khi xoá Phòng 1, xem ngày 20/10 phải còn Phòng 1 với G01, G03: ' + JSON.stringify(T.ngayTruoc));
  await chup(page, 'iphone-quan-ly-phong-ngay-truoc' + sfx);

  // === (d) bé hôm nay nằm trong phòng đã xoá (vd. máy khác thêm rồi gộp sao lưu): vẫn hiện, ghi "(đã xoá)", không có "+" ===
  await chenDb(page, 'exam_patients', [hangBeMoi('xp-g77', p1.id, 'G77', '2026-10-21')]);
  await page.reload();
  await page.waitForSelector('.phone-app');
  await page.getByRole('button', { name: 'Khám', exact: true }).tap();
  await page.waitForTimeout(600);
  T.phongDaXoa = await page.evaluate(() => {
    const nhom = [...document.querySelectorAll('section.group')];
    const g = nhom.find((s) => /Phòng 1/.test(s.querySelector('.group-title')?.textContent || ''));
    return { tieuDe: g?.querySelector('.group-title')?.textContent || null, ma: g ? [...g.querySelectorAll('.pat-code')].map((e) => e.textContent) : [], nutCong: g ? g.querySelectorAll('.room-add').length : -1, tatCaCong: [...document.querySelectorAll('.room-add')].map((e) => e.getAttribute('aria-label')) };
  });
  const d = T.phongDaXoa;
  if (d.tieuDe !== 'Phòng 1 (đã xoá)' || d.ma.join() !== 'G77' || d.nutCong !== 0 || d.tatCaCong.join() !== 'Thêm bé vào Phòng 2,Thêm bé vào Phòng 3') E('(d) bé hôm nay trong phòng đã xoá: ' + JSON.stringify(d));
  await kiemTuongPhan(page, '.phone-app', 'phòngĐãXoá', T, dark);
  await chup(page, 'iphone-kham-phong-da-xoa' + sfx, true);
  // bé trong phòng đã xoá vẫn vuốt đã khám, mở, sửa như bé khác
  const dong = dongBe(page, 'G77');
  await vuotDong(page, cdp, dong, 200);
  await demChamSauVuot(page);
  const g77 = (await docBang(page, 'exam_patients')).find((p) => p.id === 'xp-g77');
  if (!g77.done) E('(d) vuốt đã khám bé trong phòng đã xoá không lưu');
  await chamMot(page, dong.locator('.pat-open'));
  await page.locator('#ghichu-be').waitFor({ timeout: 4000 });
  await page.locator('#ghichu-be').fill('ghi chú thử phòng đã xoá');
  await page.getByRole('button', { name: 'Xong', exact: true }).tap();
  await page.waitForTimeout(700);
  const g77b = (await docBang(page, 'exam_patients')).find((p) => p.id === 'xp-g77');
  if (g77b.note !== 'ghi chú thử phòng đã xoá') E('(d) sửa ghi chú bé trong phòng đã xoá không lưu: "' + g77b.note + '"');
  // tổng hợp y lệnh hôm nay có bé đó
  await page.getByRole('button', { name: 'Tổng hợp y lệnh', exact: true }).tap();
  await page.waitForTimeout(700);
  const tongHop = await page.evaluate(() => [...document.querySelectorAll('textarea')].map((t) => t.value).join('\n'));
  if (!/PHÒNG 1/.test(tongHop) || !/G77/.test(tongHop)) E('(d) tổng hợp y lệnh hôm nay thiếu bé trong phòng đã xoá: ' + tongHop.slice(0, 120));
  // trạng thái cuối: hai phòng sống còn lại không bị đụng
  const phongCuoi = await docBang(page, 'rooms');
  if (phongCuoi.filter((r) => !r.deleted).map((r) => r.name).sort().join() !== 'Phòng 2,Phòng 3') E('phòng sống cuối bài: ' + phongCuoi.map((r) => r.name + (r.deleted ? '(xoá)' : '')));
  void S0;
  await ctx.close();
}
for (const toi of [false, true]) { try { await luongXoaPhong(toi); } catch (e) { console.error('XOÁ PHÒNG ' + (toi ? 'tối' : 'sáng') + ' dừng: ' + String(e.stack).split('\n').slice(0, 6).join(' | ')); throw e; } }

// (e) lúc 02:30 (sau nửa đêm, trước mốc 07:00): ngày làm việc vẫn là hôm qua theo lịch. Bé có examDate = ngày làm việc phải KHOÁ phòng,
// dù ngày lịch đã sang ngày sau (nếu dùng nhầm ngày lịch thì bé này bị tính là "ngày trước" và phòng xoá được).
{
  const { ctx, page } = await moApp({ ...IPHONE_OPTS }, { gio: new Date(2026, 9, 22, 2, 30, 0) });
  const T = (ketQua.thuChucNang.xoaPhong0230 = {});
  const E = (s) => ketQua.loi.push('xoá phòng lúc 02:30: ' + s);
  const [q1, q2, q3] = (await docBang(page, 'rooms')).sort((a, b) => a.order - b.order);
  await chenDb(page, 'exam_patients', [hangBeMoi('xp-dem', q1.id, 'G55', '2026-10-21', { createdAt: new Date(2026, 9, 22, 2, 10).getTime() })]);
  await page.reload();
  await page.waitForSelector('.phone-app');
  await page.waitForTimeout(500);
  const hop = []; page.on('dialog', async (d) => { hop.push(d.message()); await d.accept(); });
  await page.getByRole('button', { name: 'Khám', exact: true }).tap();
  await page.waitForTimeout(500);
  await chonBangThem(page, 'Quản lý phòng', true);
  await page.locator('section[aria-label="Quản lý phòng"]').waitFor();
  await page.waitForTimeout(400);
  T.dai = await daiMocText(page);
  T.nut = await page.evaluate(() => [...document.querySelectorAll('section[aria-label="Quản lý phòng"] .icon-btn')].map((b) => [b.getAttribute('aria-label'), b.disabled]));
  const can = [['Không xoá được Phòng 1 vì hôm nay còn 1 bé', true], ['Xoá Phòng 2', false], ['Xoá Phòng 3', false]];
  if (JSON.stringify(T.nut) !== JSON.stringify(can)) E('bé ngày làm việc 21/10 (đang 02:30 ngày 22/10) phải khoá Phòng 1: ' + JSON.stringify(T.nut));
  await page.locator('section[aria-label="Quản lý phòng"] .icon-btn:disabled').first().click({ force: true, timeout: 3000 }).catch(() => {});
  await page.evaluate(() => document.querySelector('section[aria-label="Quản lý phòng"] .icon-btn:disabled')?.click());
  await page.waitForTimeout(300);
  T.sau = (await docBang(page, 'rooms')).find((r) => r.id === q1.id).deleted;
  if (T.sau || hop.length) E('bấm ép Phòng 1 lúc 02:30 mà phòng bị xoá / hiện hỏi');
  void q2; void q3;
  await ctx.close();
}

// PC: cùng luật (khoá phòng có bé hôm nay; phòng đã xoá còn bé hôm nay hiện "(đã xoá)", không "+")
{
  const { ctx, page } = await moApp({ viewport: { width: 1440, height: 900 } });
  const T = (ketQua.thuChucNang.xoaPhongPc = {});
  const E = (s) => ketQua.loi.push('xoá phòng PC: ' + s);
  const [r1, r2] = (await docBang(page, 'rooms')).sort((a, b) => a.order - b.order);
  await chenDb(page, 'rooms', [{ ...r1, deleted: true, updatedAt: Date.now() }]);
  await chenDb(page, 'exam_patients', [hangBeMoi('xp-pc1', r1.id, 'G61', '2026-10-21'), hangBeMoi('xp-pc2', r2.id, 'G62', '2026-10-21')]);
  await page.reload();
  await page.waitForSelector('.pc');
  await page.getByRole('button', { name: 'Khám', exact: true }).click();
  await page.getByRole('button', { name: 'Quản lý phòng', exact: true }).click();
  await page.locator('section[aria-label="Quản lý phòng"]').waitFor();
  await page.waitForTimeout(500);
  T.nut = await page.evaluate(() => [...document.querySelectorAll('section[aria-label="Quản lý phòng"] .icon-btn')].map((b) => [b.getAttribute('aria-label'), b.disabled]));
  T.tieuDe = await page.evaluate(() => [...document.querySelectorAll('section.group .group-title')].map((e) => e.textContent));
  T.nutCong = await page.evaluate(() => [...document.querySelectorAll('.room-add')].map((e) => e.getAttribute('aria-label')));
  if (T.nut[0]?.join() !== 'Không xoá được Phòng 2 vì hôm nay còn 1 bé,true') E('nút xoá Phòng 2 trên PC: ' + JSON.stringify(T.nut));
  if (T.tieuDe.join('|') !== 'Phòng 2|Phòng 3|Phòng 1 (đã xoá)') E('thứ tự phòng PC (phòng sống trước, phòng đã xoá sau): ' + JSON.stringify(T.tieuDe));
  if (!T.tieuDe.includes('Phòng 1 (đã xoá)') || T.nutCong.some((s) => /Phòng 1$/.test(s))) E('phòng đã xoá còn bé hôm nay trên PC phải ghi "(đã xoá)" và không có "+": ' + JSON.stringify([T.tieuDe, T.nutCong]));
  await ctx.close();
}

// ===================== Mức 2 (phiếu 2026-11-09): nút "…", "2 ngày" cùng hàng với tab, đầu trang gọn — sáng và tối =====================
for (const dark of [false, true]) {
  const sfx = dark ? '-toi' : '-sang';
  const { ctx, page } = await moApp({ ...IPHONE_OPTS, colorScheme: dark ? 'dark' : 'light' });
  const T = (ketQua.thuChucNang['muc2' + (dark ? 'Toi' : 'Sang')] = {});
  const E = (s) => ketQua.loi.push('Mức 2' + (dark ? ' (tối)' : '') + ': ' + s);
  if ((await laToiLuc(page)) !== dark) E('app không ở đúng chế độ sáng/tối');
  const menuMo = () => page.locator('[role="menu"]').count();
  const nutBa = page.locator('button[aria-haspopup="menu"]');
  const focusODauNut = () => page.evaluate(() => document.activeElement?.classList.contains('mt-btn'));
  const dinh = (sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? Math.round(e.getBoundingClientRect().top * 10) / 10 : null; }, sel);
  const cuonNgang = () => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);

  // ----- Việc -----
  T.viecChip = await dinh('.chips .chip');
  if (Math.abs(T.viecChip - 132) > 2) E('đỉnh hàng chip khu tab Việc ' + T.viecChip + 'px (mục tiêu 132px)');
  await chup(page, 'iphone-muc2-viec-dong' + sfx, true);
  T.viecNut = { moRong: await nutBa.getAttribute('aria-expanded'), haspopup: await nutBa.getAttribute('aria-haspopup'), nhan: await nutBa.getAttribute('aria-label') };
  if (T.viecNut.moRong !== 'false' || T.viecNut.haspopup !== 'menu' || !/\(nên sao lưu hôm nay\)$/.test(T.viecNut.nhan)) E('nút "…" tab Việc: ' + JSON.stringify(T.viecNut));
  // mở / đóng: bấm lại "…", Esc, chạm ngoài (focus trả về nút), chọn một dòng
  await nutBa.click(); await page.locator('[role="menu"]').waitFor();
  T.viecMenu = await page.evaluate(() => {
    const b = document.querySelector('[role="menu"]'), r = b.getBoundingClientRect(), n = document.querySelector('.mt-btn');
    return { rong: Math.round(r.width), phai: Math.round(innerWidth - r.right), trenNhat: Math.round(r.top), duoiHang: Math.round(document.querySelector('.ph-r1').getBoundingClientRect().bottom), moRong: n.getAttribute('aria-expanded'), nhom: [...b.querySelectorAll('[role="group"]')].map((g) => g.getAttribute('aria-label')),
      dong: [...b.querySelectorAll('[role="menuitem"]')].map((e) => [e.querySelector('.mt-t').textContent, Math.round(e.getBoundingClientRect().height), parseFloat(getComputedStyle(e.querySelector('.mt-t')).fontSize), e.querySelector('.mt-s') ? parseFloat(getComputedStyle(e.querySelector('.mt-s')).fontSize) : 0]),
      tenNhom: parseFloat(getComputedStyle(b.querySelector('.mt-grp')).fontSize), cham: !!b.querySelector('.mt-cham'), chamR: b.querySelector('.mt-cham') ? Math.round(b.querySelector('.mt-cham').getBoundingClientRect().width) : 0, bo: getComputedStyle(b).borderTopLeftRadius };
  });
  const M = T.viecMenu;
  if (M.rong !== 304 || M.phai !== 16 || M.moRong !== 'true') E('bảng "…" phải rộng 304px, cách mép phải 16px, aria-expanded=true: ' + JSON.stringify(M));
  if (M.nhom.join('|') !== 'Ứng dụng') E('tab Việc chỉ có nhóm "Ứng dụng": ' + M.nhom.join('|'));
  if (M.dong.map((d) => d[0]).join('|') !== 'Thư viện viết tắt|Sao lưu và cài đặt' || M.dong.some((d) => d[1] < 52 || d[2] !== 15 || (d[3] && d[3] !== 13))) E('dòng trong bảng "…" (tên 15px đậm, phụ 13px, cao ≥52px): ' + JSON.stringify(M.dong));
  if (M.tenNhom !== 12 || !M.cham || M.chamR !== 8 || M.bo !== '16px') E('tên nhóm 12px, chấm 8px "Nên sao lưu hôm nay", bo 16px: ' + JSON.stringify([M.tenNhom, M.cham, M.chamR, M.bo]));
  await chup(page, 'iphone-muc2-viec-menu' + sfx, true);
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  T.esc = { menu: await menuMo(), focusNut: await focusODauNut(), moRong: await nutBa.getAttribute('aria-expanded') };
  if (T.esc.menu || !T.esc.focusNut || T.esc.moRong !== 'false') E('Esc phải đóng bảng và trả focus về nút "…": ' + JSON.stringify(T.esc));
  await nutBa.click(); await page.locator('[role="menu"]').waitFor();
  await page.mouse.click(200, 700); await page.waitForTimeout(150);
  T.chamNgoai = { menu: await menuMo(), focusNut: await focusODauNut() };
  if (T.chamNgoai.menu || !T.chamNgoai.focusNut) E('chạm ngoài phải đóng bảng và trả focus về nút: ' + JSON.stringify(T.chamNgoai));
  await nutBa.click(); await page.locator('[role="menu"]').waitFor();
  await nutBa.click(); await page.waitForTimeout(150);
  T.bamLai = { menu: await menuMo(), focusNut: await focusODauNut() };
  if (T.bamLai.menu || !T.bamLai.focusNut) E('bấm lại "…" phải đóng bảng: ' + JSON.stringify(T.bamLai));
  await chonBangThem(page, 'Sao lưu và cài đặt');
  await page.getByRole('dialog', { name: 'Sao lưu và cài đặt' }).waitFor();
  T.chonDong = await menuMo();
  if (T.chonDong) E('chọn một dòng phải đóng bảng "…"');
  await page.keyboard.press('Escape'); await page.waitForTimeout(700);
  // "2 ngày": aria-pressed, bật/tắt, chạm giữ trạng thái
  const hai = page.locator('.ph-2ngay');
  await hai.tap(); await page.waitForTimeout(500);
  T.haiViec = { pressed: await hai.getAttribute('aria-pressed'), nen: await hai.evaluate((e) => getComputedStyle(e).backgroundColor), accent: await mauBien(page, '--accent'), dong: ((await page.locator('.ph-ngay').innerText()) || '').replace(/\s+/g, ' ').trim(), tienDo: ((await page.locator('.ph-tiendo').textContent()) || '').trim(), cuon: await cuonNgang(), chipTren: await dinh('.chips .chip') };
  if (T.haiViec.pressed !== 'true' || T.haiViec.nen !== T.haiViec.accent) E('"2 ngày" bật: aria-pressed=true, nền --accent: ' + JSON.stringify(T.haiViec));
  if (!/^Hôm qua \d{2}\/\d{2} và hôm nay[^·]*· Đã xong \d+\/\d+$/.test(T.haiViec.dong) && !/^Hôm qua .*… · Đã xong \d+\/\d+$/.test(T.haiViec.dong)) E('dòng ngày khi bật 2 ngày (cắt bằng … ở phần ngày, số tiến độ luôn thấy): ' + T.haiViec.dong);
  await chup(page, 'iphone-muc2-viec-2ngay' + sfx, true);
  await hai.tap(); await page.waitForTimeout(400);
  if ((await hai.getAttribute('aria-pressed')) !== 'false') E('chạm lại "2 ngày" phải tắt');
  // xem ngày khác: "Về hôm nay" 52px thay nút "2 ngày"
  await page.getByRole('button', { name: 'Mở lịch', exact: true }).tap();
  const hopL = page.getByRole('dialog', { name: 'Lịch công việc' });
  await hopL.waitFor(); await page.waitForTimeout(500);
  await hopL.getByRole('button', { name: /^Ngày 20 tháng 10\b/ }).tap();
  await page.waitForTimeout(900);
  T.ngayKhac = await page.evaluate(() => { const v = document.querySelector('.ph-vehn'); const r = v?.getBoundingClientRect(); return { co2ngay: document.querySelectorAll('.ph-2ngay').length, vehn: v ? [Math.round(r.height), Math.round(innerWidth - r.right), getComputedStyle(v).fontSize, v.textContent] : null, chip: Math.round(document.querySelector('.chips .chip').getBoundingClientRect().top * 10) / 10 }; });
  if (T.ngayKhac.co2ngay || !T.ngayKhac.vehn || T.ngayKhac.vehn[0] !== 52 || T.ngayKhac.vehn[1] !== 16 || T.ngayKhac.vehn[2] !== '15px' || T.ngayKhac.vehn[3] !== 'Về hôm nay') E('xem ngày khác: "Về hôm nay" cao 52px thay nút "2 ngày": ' + JSON.stringify(T.ngayKhac));
  await chup(page, 'iphone-muc2-viec-ngay-khac' + sfx, true);
  await page.locator('.ph-vehn').tap(); await page.waitForTimeout(500);
  // đang gõ việc mới: ô nhập 16px, hàng chip khu vẫn như cũ
  await page.locator('#ph-draft').tap(); await page.locator('#ph-draft').fill('Gọi xét nghiệm giường 3 lúc 14 giờ'); await page.waitForTimeout(400);
  T.viecGo = { oNhap: await page.locator('#ph-draft').evaluate((e) => getComputedStyle(e).fontSize), chipKhu: await dinh('.chips .chip'), cuon: await cuonNgang() };
  if (T.viecGo.oNhap !== '16px') E('ô gõ việc mới phải 16px: ' + T.viecGo.oNhap);
  await chup(page, 'iphone-muc2-viec-go' + sfx, true);
  await page.locator('#ph-draft').fill(''); await page.touchscreen.tap(60, 45); await page.waitForTimeout(500);

  // ----- Khám -----
  await page.getByRole('button', { name: 'Khám', exact: true }).tap(); await page.waitForTimeout(500);
  T.khamMenu0 = await nutBa.getAttribute('aria-label');
  if (!/^Thêm: lấy danh sách hôm qua, quản lý phòng, thư viện viết tắt, sao lưu và cài đặt/.test(T.khamMenu0)) E('nhãn nút "…" tab Khám: ' + T.khamMenu0);
  // "Lấy danh sách hôm qua" trong bảng "…": bấm 2 lần không trùng, báo bằng role="status"
  await chonBangThem(page, 'Lấy danh sách hôm qua', true);
  await page.waitForTimeout(400);
  const soBe1 = await page.locator('.pat-row').count();
  const bao1 = ((await page.locator('.ph-chep').textContent().catch(() => '')) || '').trim();
  await chonBangThem(page, 'Lấy danh sách hôm qua', true);
  await page.waitForTimeout(400);
  const soBe2 = await page.locator('.pat-row').count();
  T.layHomQua = { soBe1, soBe2, bao1, bao2: ((await page.locator('.ph-chep').textContent().catch(() => '')) || '').trim(), vaiTro: await page.locator('.ph-chep').getAttribute('role').catch(() => null) };
  if (soBe1 !== 3 || soBe2 !== 3 || T.layHomQua.bao1 !== 'Đã chép 3 bệnh nhân.' || T.layHomQua.bao2 !== 'Không có bệnh nhân mới để chép.' || T.layHomQua.vaiTro !== 'status') E('"Lấy danh sách hôm qua" từ bảng "…" (3 bé, bấm 2 lần không trùng): ' + JSON.stringify(T.layHomQua));
  await page.waitForTimeout(3300);
  if (await page.locator('.ph-chep').count()) E('câu "Đã chép…" phải tự mất sau 3 giây');
  T.khamChip = await dinh('.room-h');
  T.khamDong = ((await page.locator('.ph-ngay').innerText()) || '').replace(/\s+/g, ' ').trim();
  if (!/^[^,]+, \d{2}\/\d{2} · Đã khám \d+\/\d+$/.test(T.khamDong)) E('dòng ngày tab Khám: "' + T.khamDong + '"');
  await chup(page, 'iphone-muc2-kham-dong' + sfx, true);
  await nutBa.tap(); await page.locator('[role="menu"]').waitFor();
  T.khamMenu = await page.evaluate(() => { const b = document.querySelector('[role="menu"]'); return { nhom: [...b.querySelectorAll('[role="group"]')].map((g) => g.getAttribute('aria-label')), dong: [...b.querySelectorAll('[role="menuitem"]')].map((e) => [e.querySelector('.mt-t').textContent, e.querySelector('.mt-s')?.textContent || '', e.disabled, Math.round(e.getBoundingClientRect().height)]), cuon: document.documentElement.scrollWidth - innerWidth }; });
  if (T.khamMenu.nhom.join('|') !== 'Danh sách khám|Ứng dụng' || T.khamMenu.dong[0][0] !== 'Lấy danh sách hôm qua' || T.khamMenu.dong[0][1] !== 'Chép 3 bé, ghi chú và việc chưa xong.' || T.khamMenu.dong[1][0] !== 'Quản lý phòng' || T.khamMenu.dong[1][1] !== 'Đổi tên, thêm hoặc xoá phòng.' || T.khamMenu.dong.some((d) => d[3] < 52)) E('bảng "…" tab Khám: ' + JSON.stringify(T.khamMenu));
  await chup(page, 'iphone-muc2-kham-menu' + sfx, true);
  // Quản lý phòng: bật/tắt, tên đổi thành "Đóng quản lý phòng", thẻ RoomManager mở ở đầu danh sách
  await page.getByRole('menuitem', { name: /^Quản lý phòng/ }).tap(); await page.waitForTimeout(500);
  T.quanLyPhong = { the: await page.locator('section[aria-label="Quản lý phòng"]').count() };
  await nutBa.tap(); await page.locator('[role="menu"]').waitFor();
  T.quanLyPhong.ten = await page.locator('[role="menuitem"]').nth(1).locator('.mt-t').textContent();
  await page.getByRole('menuitem', { name: /^Đóng quản lý phòng/ }).tap(); await page.waitForTimeout(500);
  T.quanLyPhong.sauDong = await page.locator('section[aria-label="Quản lý phòng"]').count();
  if (T.quanLyPhong.the !== 1 || T.quanLyPhong.ten !== 'Đóng quản lý phòng' || T.quanLyPhong.sauDong !== 0) E('"Quản lý phòng" trong bảng "…" bật/tắt thẻ phòng: ' + JSON.stringify(T.quanLyPhong));
  // 2 ngày ở tab Khám: bảng "…" chỉ còn nhóm "Ứng dụng"
  await page.locator('.ph-2ngay').tap(); await page.waitForTimeout(600);
  T.kham2 = { pressed: await page.locator('.ph-2ngay').getAttribute('aria-pressed'), chip: await dinh('.chips .chip'), cuon: await cuonNgang(), dong: ((await page.locator('.ph-ngay').innerText()) || '').replace(/\s+/g, ' ').trim() };
  if (T.kham2.pressed !== 'true') E('"2 ngày" tab Khám không bật: ' + JSON.stringify(T.kham2));
  await chup(page, 'iphone-muc2-kham-2ngay' + sfx, true);
  await nutBa.tap(); await page.locator('[role="menu"]').waitFor();
  T.kham2.nhom = await page.locator('[role="group"]').evaluateAll((es) => es.map((e) => e.getAttribute('aria-label')));
  if (T.kham2.nhom.join('|') !== 'Ứng dụng') E('Khám 2 ngày: bảng "…" chỉ có nhóm "Ứng dụng": ' + T.kham2.nhom.join('|'));
  await page.keyboard.press('Escape'); await page.waitForTimeout(150);
  await page.locator('.ph-2ngay').tap(); await page.waitForTimeout(400);
  // Khám xem ngày trước: không có nút "2 ngày", bảng "…" chỉ còn nhóm "Ứng dụng", Lịch ở trạng thái .on
  await page.getByRole('button', { name: 'Lịch khám', exact: true }).tap();
  const hopK = page.getByRole('dialog', { name: 'Lịch khám' });
  await hopK.waitFor(); await page.waitForTimeout(500);
  await hopK.getByRole('button', { name: /^Ngày 20 tháng 10\b/ }).tap(); await page.waitForTimeout(900);
  T.khamNgayTruoc = { co2ngay: await page.locator('.ph-2ngay, .ph-vehn').count(), tienDo: await page.locator('.ph-tiendo').count(), lichOn: await page.locator('.ph-head .round-btn.on:not(.mt-btn)').count() };
  if (T.khamNgayTruoc.co2ngay || T.khamNgayTruoc.tienDo) E('Khám xem ngày trước: không có nút "2 ngày" và không ghi số tiến độ: ' + JSON.stringify(T.khamNgayTruoc));
  // không cuộn ngang ở 393 (đo cả lúc mở bảng) và 320
  T.cuon393 = await cuonNgang();
  await nutBa.tap(); await page.locator('[role="menu"]').waitFor();
  T.cuon393Menu = await cuonNgang();
  if (T.cuon393 > 0 || T.cuon393Menu > 0) E('cuộn ngang ở 393px: ' + T.cuon393 + ' / ' + T.cuon393Menu);
  await ctx.close();
  {
    const g = await moApp({ viewport: { width: 320, height: 700 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IPHONE_UA, colorScheme: dark ? 'dark' : 'light' });
    const nb = g.page.locator('button[aria-haspopup="menu"]');
    T.cuon320 = {};
    for (const tab of ['Việc', 'Khám']) {
      await g.page.getByRole('button', { name: tab, exact: true }).first().tap(); await g.page.waitForTimeout(400);
      for (const hn of [false, true]) {
        if (hn) { await g.page.locator('.ph-2ngay').tap(); await g.page.waitForTimeout(500); }
        await nb.tap(); await g.page.locator('[role="menu"]').waitFor();
        const o = await g.page.evaluate(() => { const r = document.querySelector('[role="menu"]').getBoundingClientRect(); const d = document.querySelector('.ph-ngay-chu'); return { cuon: document.documentElement.scrollWidth - innerWidth, bangRong: Math.round(r.width), bangPhai: Math.round(innerWidth - r.right), bangTrai: Math.round(r.left), ngayCat: d.scrollWidth > d.clientWidth, tienDo: !!document.querySelector('.ph-tiendo') && document.querySelector('.ph-tiendo').getBoundingClientRect().right <= innerWidth }; });
        T.cuon320[tab + (hn ? ' 2 ngày' : '')] = o;
        if (o.cuon > 0 || o.bangRong > 288 || o.bangTrai < 16 || !o.tienDo) E(`320px ${tab}${hn ? ' 2 ngày' : ''}: ` + JSON.stringify(o));
        await g.page.keyboard.press('Escape'); await g.page.waitForTimeout(120);
        if (hn) { await g.page.locator('.ph-2ngay').tap(); await g.page.waitForTimeout(300); }
      }
    }
    await g.ctx.close();
  }
}
await browser.close();
server.close();

// ---------- tổng hợp đo đạc ----------
for (const [ten, d] of Object.entries(ketQua.doDac)) {
  for (const x of d.vungChamNho) ketQua.loi.push(`${ten}: vùng chạm < 44px — ${x}`);
  for (const x of d.oNhapNho) {
    if (/mono/.test(x)) ketQua.luuY.push(`${ten}: ô nhập < 16px (ĐÃ BIẾT, chờ duyệt) — ${x}`);
    else ketQua.loi.push(`${ten}: ô nhập < 16px — ${x}`);
  }
  for (const x of d.nutKhacNho) ketQua.luuY.push(`${ten}: nút khác < 44px — ${x}`);
  for (const x of d.nutKhongTen || []) ketQua.loi.push(`${ten}: nút chỉ có biểu tượng mà thiếu aria-label — ${x}`);
}
ketQua.luuY = [...new Set(ketQua.luuY)];

// ---------- so với ảnh chuẩn ----------
ketQua.soVoiChuan = {};
if (LUU_CHUAN) {
  mkdirSync(CHUAN, { recursive: true });
  for (const a of ketQua.anh) copyFileSync(join(OUT, a), join(CHUAN, a));
  ketQua.soVoiChuan = 'đã lưu bộ ảnh này làm ảnh chuẩn';
} else if (!sharp) {
  ketQua.soVoiChuan = 'bỏ qua (không có thư viện sharp)';
} else {
  for (const a of ketQua.anh) {
    const c = join(CHUAN, a);
    if (!existsSync(c)) { ketQua.soVoiChuan[a] = 'chưa có ảnh chuẩn'; continue; }
    const [x, y] = await Promise.all([join(OUT, a), c].map((f) => sharp(f).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
    if (x.info.width !== y.info.width || x.info.height !== y.info.height) { ketQua.soVoiChuan[a] = 'khác kích thước'; continue; }
    let khac = 0;
    for (let i = 0; i < x.data.length; i += 4) {
      if (Math.abs(x.data[i] - y.data[i]) + Math.abs(x.data[i + 1] - y.data[i + 1]) + Math.abs(x.data[i + 2] - y.data[i + 2]) > 30) khac++;
    }
    const pct = (100 * khac) / (x.data.length / 4);
    ketQua.soVoiChuan[a] = pct.toFixed(2) + '% điểm ảnh khác' + (pct > 1 ? ' — CẦN XEM' : '');
  }
}

writeFileSync(join(OUT, 'ket-qua.json'), JSON.stringify(ketQua, null, 2));
console.log(`Ảnh: ${ketQua.anh.length} tấm trong ${OUT}`);
console.log('Thử chức năng:', JSON.stringify(ketQua.thuChucNang, null, 1));
console.log('So với ảnh chuẩn:', JSON.stringify(ketQua.soVoiChuan, null, 1));
if (ketQua.luuY.length) console.log('Lưu ý:\n  ' + ketQua.luuY.join('\n  '));
if (ketQua.loi.length) { console.log('LỖI:\n  ' + ketQua.loi.join('\n  ')); process.exit(1); }
console.log('ĐẠT — giao diện và chức năng thử đều ổn.');
