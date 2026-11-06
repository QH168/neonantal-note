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
  ].map((p) => row({ examDate: '2026-10-20', done: true, ...p }))
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
const VUNG_CHAM = ['.chk', '.icon-btn', '.pri-btn', '.swipe-del', '.round-btn', '.seg button', '.pill-btn', '.chip', '.vt-chip', '.vt-undo'];
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
process.on('uncaughtException', (e) => {
  console.error('SCRIPT DỪNG GIỮA CHỪNG: ' + String(e?.message || e).split('\n')[0]);
  console.error('Lỗi đã gom được:\n  ' + (ketQua.loi.join('\n  ') || '(chưa có)'));
  console.error('Thử chức năng đã chạy:', JSON.stringify(ketQua.thuChucNang));
  process.exit(1);
});
const browser = await chromium.launch();

async function moApp(opts, { lanMo = true, init = null } = {}) {
  const ctx = await browser.newContext(opts);
  if (init) await ctx.addInitScript(init); // vd. visualViewport giả để thử thanh theo bàn phím (KHÔNG phải bàn phím thật)
  // Dòng nhắc cử chỉ chỉ hiện 3 lần mở đầu (v9.1): mặc định coi như đã mở nhiều lần để ảnh không có dòng nhắc;
  // truyền { lanMo: false } khi cần thử đúng 3 lần mở đầu.
  if (lanMo) await ctx.addInitScript(() => { try { localStorage.setItem('soLanMo', '9'); } catch { /* bỏ qua */ } });
  // đếm số lần máy "rung" (navigator.vibrate) để kiểm rung đúng một lần khi vừa qua mốc 1/3
  await ctx.addInitScript(() => { window.__rung = 0; try { Object.defineProperty(navigator, 'vibrate', { value: () => { window.__rung++; return true; }, configurable: true }); } catch { /* bỏ qua */ } });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  await page.clock.setFixedTime(NOW);
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
const moCaiDat = async (page) => {
  await page.getByRole('button', { name: /^Sao lưu và cài đặt/ }).click();
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
  await page.getByRole('button', { name: 'Thư viện viết tắt', exact: true }).click();
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
    T.nut = await page.locator('.ph-head .round-btn').evaluateAll((es) => es.map((e) => e.getAttribute('aria-label')));
    if (T.nut.length !== 3 || T.nut[0] !== 'Thư viện viết tắt' || !/^Sao lưu và cài đặt/.test(T.nut[1]) || T.nut[2] !== 'Mở lịch') ketQua.loi.push('Đầu trang không đúng 3 nút /a, đám mây, lịch: ' + T.nut.join(' | '));
    if (await page.locator('.vt-btn').evaluate((e) => /MỚI/i.test(e.parentElement.textContent))) ketQua.loi.push('Đầu trang có chữ "MỚI"');
    T.tienDo = ((await page.locator('.prog-text').textContent()) || '').trim();
    if (!/^Đã xong \d+\/\d+$/.test(T.tienDo)) ketQua.loi.push('Chữ tiến độ tab Việc: "' + T.tienDo + '"');
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

  const lay = page.getByRole('button', { name: /Lấy danh sách/ });
  await lay.click();
  await page.waitForTimeout(400);
  const lan1 = await page.locator('.pat-row').count();
  await lay.click();
  await page.waitForTimeout(400);
  const lan2 = await page.locator('.pat-row').count();
  const thongBao = await page.locator('.muted.xsmall').first().textContent();
  ketQua.thuChucNang.layDanhSachHomQua = { lan1, lan2, thongBao };
  if (lan1 !== 3) ketQua.loi.push(`"Lấy danh sách hôm qua" lần 1 chép ${lan1} bé (mong đợi 3)`);
  if (lan2 !== lan1) ketQua.loi.push(`"Lấy danh sách hôm qua" lần 2 bị chép trùng (${lan1} → ${lan2})`);
  const thuTu = await page.locator('.pat-code').allTextContents();
  ketQua.thuChucNang.thuTuSauKhiChep = thuTu.join(', ');
  if (thuTu.slice(0, 2).join() !== 'G01,G03') {
    ketQua.luuY.push(`Thứ tự bé sau khi chép (ĐÃ BIẾT, chờ duyệt): ${thuTu.join(', ')} — hôm qua là G01, G03`);
  }
  await chup(page, 'iphone-kham-sang', true);

  await page.locator('.pat-open', { hasText: 'G01' }).click();
  await page.getByRole('button', { name: 'Tính tuần tuổi' }).click();
  const calc = (await page.locator('.calc-box').textContent()) || '';
  ketQua.thuChucNang.tinhTuanTuoi = calc;
  if (!/77 ngày/.test(calc) || !/36w0d/.test(calc)) ketQua.loi.push('Tính tuần tuổi G01 (05/08, 25 tuần) không ra 77 ngày, 36w0d: ' + calc);
  if (/40\s*w/.test(calc)) ketQua.loi.push('Màn hình tính tuổi có hiện "đến 40w"');
  await chup(page, 'iphone-chi-tiet-be', true);
  {
    // v9.2: việc cần làm của bé — vuốt phải xong, vuốt trái xoá + Hoàn tác, chạm 2 lần mở bảng nhỏ chồng lên chi tiết bé
    // (thay phép kiểm kiểu C cũ: "vuốt trái → thẻ đứng yên, nút Xoá ở cuối dòng, không còn dấu ×")
    const cdp = await ctx.newCDPSession(page);
    const T = ketQua.thuChucNang.viecCuaBe = {};
    const them = async (ten) => { await page.getByPlaceholder('Thêm việc cần làm…').fill(ten); await page.getByRole('button', { name: 'Thêm', exact: true }).click(); await page.waitForTimeout(350); };
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

  await page.getByRole('button', { name: 'Tổng hợp', exact: true }).click();
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
    if (await hop.getByText(/Ngày làm việc/).count()) ketQua.loi.push('Bảng cài đặt có mục "Ngày làm việc" (thuộc đợt 9.6, chưa được thêm)');
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
    // tối: chi tiết việc của bé (bảng nhỏ chồng lên chi tiết bé); việc vừa vuốt phải thành xong
    const cdp = await ctx.newCDPSession(page);
    await page.locator('.pat-open', { hasText: 'G01' }).click();
    await page.getByRole('dialog', { name: 'Chi tiết bệnh nhân' }).waitFor();
    await page.waitForTimeout(500);
    const hang = page.locator('.sheet .swipe', { hasText: 'Đo bilirubin' });
    const rong = (await hang.boundingBox()).width;
    await vuotDong(page, cdp, hang, Math.round(rong / 3 + 30));
    // đang mở bảng: "chạm vùng trống" là chạm tiêu đề bảng (chạm nền ngoài sẽ đóng bảng)
    const tieuDe = await tamDiem(page.locator('.sheet .h2').first());
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
    await page.getByRole('button', { name: 'Thư viện viết tắt', exact: true }).click();
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
      const dam = await tamNut(page.getByRole('button', { name: /^Sao lưu và cài đặt/ }));
      await chamGiu(cdp, dam.x, dam.y, 100);
      await page.waitForTimeout(700);
      T.chamGiu.nutDau = await page.getByRole('dialog', { name: 'Sao lưu và cài đặt' }).count();
      if (T.chamGiu.nutDau !== 1) ketQua.loi.push('Chạm giữ 100ms vào nút đám mây khi ô bung, trống: không mở bảng');
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
  await page.getByRole('button', { name: 'Thư viện viết tắt', exact: true }).tap();
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
  await page.locator('.pat-open', { hasText: 'G01' }).click();
  await chup(page, 'pc-kham-sang', false);
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
  await ctx.close();
}
// PC: người đã có 'dark' hoặc 'light' lưu từ bản cũ giữ nguyên giao diện sau khi cập nhật, kể cả khi máy báo ngược lại
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
