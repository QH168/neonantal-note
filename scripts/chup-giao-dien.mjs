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
  return { vungChamNho: nho, nutKhacNho: [...new Set(khac)], oNhapNho: [...new Set(oNhap)] };
}, VUNG_CHAM);

// ---------- chạy ----------
const ketQua = { ngayGiaDinh: NOW.toString(), anh: [], loi: [], luuY: [], doDac: {}, thuChucNang: {} };
const browser = await chromium.launch();

async function moApp(opts) {
  const ctx = await browser.newContext(opts);
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  const page = await ctx.newPage();
  await page.clock.setFixedTime(NOW);
  page.on('pageerror', (e) => ketQua.loi.push('Lỗi chạy trang: ' + e.message));
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
  await page.waitForTimeout(250);
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
const tamDiem = async (loc) => { const b = await loc.boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2, b }; };
// Kiểu C: thẻ đứng yên + nút Xoá nằm TRONG khung thẻ + viền thẻ đỏ. Trả về số đo để ghi vào kết quả.
const mauP1 = (loc) => loc.evaluate((e) => {
  const d = document.createElement('i');
  d.style.color = 'var(--p1)';
  e.parentElement.appendChild(d);
  const c = getComputedStyle(d).color;
  d.remove();
  return c;
});
async function kiemKieuC(page, dong, T, ten, truoc) {
  const body = dong.locator('.swipe-body');
  const sau = await body.boundingBox();
  const nut = await dong.locator('.swipe-del').boundingBox();
  const vien = await body.evaluate((e) => getComputedStyle(e).borderTopColor);
  const p1 = await mauP1(body);
  T[ten] = {
    dich: { dx: +(sau.x - truoc.x).toFixed(1), dRong: +(sau.width - truoc.width).toFixed(1) },
    nutTrongThe: !!nut && nut.x >= sau.x - 0.5 && nut.x + nut.width <= sau.x + sau.width + 0.5 && nut.y >= sau.y - 0.5 && nut.y + nut.height <= sau.y + sau.height + 0.5,
    nutCao: nut ? Math.round(nut.height) : 0,
    vienDo: vien === p1
  };
  const r = T[ten];
  if (Math.abs(r.dich.dx) > 0.5 || Math.abs(r.dich.dRong) > 0.5) ketQua.loi.push(`${ten}: thẻ bị dịch chuyển khi vuốt (${JSON.stringify(r.dich)})`);
  if (!r.nutTrongThe) ketQua.loi.push(`${ten}: nút Xoá không nằm trong khung thẻ`);
  if (r.nutCao < 44) ketQua.loi.push(`${ten}: nút Xoá cao ${r.nutCao}px (< 44)`);
  if (!r.vienDo) ketQua.loi.push(`${ten}: viền thẻ không đỏ (${vien} khác ${p1})`);
}
// đọc thẳng dòng trong IndexedDB (để kiểm dữ liệu thật đã lưu)
const docViec = (page, text) => page.evaluate(async (tx) => {
  const db = await new Promise((res) => { const r = indexedDB.open('ghichu-sosinh'); r.onsuccess = () => res(r.result); });
  const all = await new Promise((res) => { const r = db.transaction('tasks').objectStore('tasks').getAll(); r.onsuccess = () => res(r.result); });
  db.close();
  return all.filter((t) => t.text === tx).map((t) => ({ zone: t.zone, tags: t.tags, urgency: t.urgency, note: t.note, deleted: t.deleted }));
}, text);
const sangToi = async (page) => {
  const b = page.getByRole('button', { name: /Chuyển sang giao diện/ });
  await b.click();
};


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
  if (!/Đã thay \/kmdm/.test(T.thongBaoThay)) ketQua.loi.push('Viết tắt: thiếu thông báo "Đã thay /kmdm"');
  await chup(page, tien + '-viet-tat-hoan-tac', true);
  await page.getByRole('button', { name: 'Hoàn tác', exact: true }).click();
  T.sauHoanTac = await o.inputValue();
  if (T.sauHoanTac !== 'Xem lại /kmdm ') ketQua.loi.push('Viết tắt: Hoàn tác ra "' + T.sauHoanTac + '"');
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
  await xoa();
  await o.blur();
}
// mở thư viện bằng nút "/a", thử thêm / trùng / tìm / sửa / xoá
async function thuThuVien(page, T, tien, cdp) {
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
  // sửa bằng bút chì
  await hop.getByRole('button', { name: 'Sửa /hcn' }).click();
  await hop.getByLabel('Đổi thành').fill('Hội chẩn ngoại khoa nhi');
  await hop.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await page.waitForTimeout(300);
  T.sauSua = (await hop.locator('.vt-item-wrap', { hasText: '/hcn' }).textContent()) || '';
  if (!/ngoại khoa nhi/.test(T.sauSua)) ketQua.loi.push('Thư viện: sửa không lưu — ' + T.sauSua);
  // xoá
  const dong = hop.locator('.vt-item-wrap', { hasText: '/hcn' });
  if (cdp) {
    const truoc = await dong.locator('.swipe-body').boundingBox();
    const c = await tamDiem(dong.locator('.vt-v'));
    await vuotNgang(cdp, c.b.x + c.b.width - 6, c.b.x + c.b.width - 150, c.y);
    await page.waitForTimeout(300);
    await kiemKieuC(page, dong, T, 'xoaKieuC_thuVien', truoc);
    await chup(page, tien + '-thu-vien-xoa', true);
  } else {
    await dong.hover();
    await page.waitForTimeout(250);
    await chup(page, tien + '-thu-vien-re-chuot', true);
  }
  await dong.getByRole('button', { name: 'Xoá viết tắt: /hcn' }).click();
  await page.waitForTimeout(300);
  T.sauXoa = await dem();
  if (T.sauXoa !== 13) ketQua.loi.push('Thư viện: xoá /hcn mà còn ' + T.sauXoa + ' mục');
  await hop.getByRole('button', { name: 'Đóng thư viện', exact: true }).click();
  await page.waitForTimeout(250);
}

// iPhone 15
{
  const { ctx, page } = await moApp({
    viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
  });
  await chup(page, 'iphone-viec-sang', true);

  // --- thử: nút xoá kiểu C, chi tiết việc (chạm 2 lần), việc cũ gắn nhãn, thêm việc có nhãn ---
  {
    const cdp = await ctx.newCDPSession(page);
    const T = ketQua.thuChucNang.viecV82 = {};
    const dong = (ten) => page.locator('.swipe', { hasText: ten });
    const A = dong('Hội chẩn dinh dưỡng giường 7');
    const B = dong('Gọi đăng ký giường mới');
    const mo = () => page.locator('.swipe.armed').count();
    // vuốt trái dòng A: thẻ đứng yên, nút Xoá trong thẻ, viền đỏ, nhãn được thay bằng nút
    const truocA = await A.locator('.swipe-body').boundingBox();
    let c = await tamDiem(A.locator('.task-main'));
    await vuotNgang(cdp, c.b.x + c.b.width - 10, c.b.x + c.b.width - 160, c.y);
    await page.waitForTimeout(300);
    T.vuotMoDong1 = await mo();
    if (T.vuotMoDong1 !== 1) ketQua.loi.push('Vuốt trái không đưa dòng vào trạng thái xoá (số dòng = ' + T.vuotMoDong1 + ')');
    if (!(await A.locator('.swipe-del').getAttribute('aria-label') || '').startsWith('Xoá việc: Hội chẩn')) ketQua.loi.push('Nút xoá thiếu aria-label "Xoá việc: <tên>"');
    await kiemKieuC(page, A, T, 'xoaKieuC_viec', truocA);
    T.nhanAn = !(await A.locator('.tag-dot').first().isVisible());
    if (!T.nhanAn) ketQua.loi.push('Đang xoá mà cụm nhãn vẫn hiện (phải được thay bằng nút Xoá)');
    T.chuNut = (await A.locator('.swipe-del').textContent() || '').trim();
    if (T.chuNut !== 'Xoá') ketQua.loi.push('Nút xoá không ghi "Xoá": ' + T.chuNut);
    await chup(page, 'iphone-viec-xoa', true);
    // vuốt dòng B (không nhãn) → chỉ một dòng ở trạng thái xoá, nút ở cuối dòng
    const truocB = await B.locator('.swipe-body').boundingBox();
    c = await tamDiem(B.locator('.task-main'));
    await vuotNgang(cdp, c.b.x + c.b.width - 10, c.b.x + c.b.width - 160, c.y);
    await page.waitForTimeout(300);
    T.vuotMoDong2 = await mo();
    if (T.vuotMoDong2 !== 1) ketQua.loi.push('Mở dòng thứ hai mà dòng đầu chưa trả về (số dòng = ' + T.vuotMoDong2 + ')');
    await kiemKieuC(page, B, T, 'xoaKieuC_viecKhongNhan', truocB);
    // vuốt phải → trả về
    c = await tamDiem(B.locator('.task-main'));
    await vuotNgang(cdp, c.b.x + 20, c.b.x + 180, c.y);
    await page.waitForTimeout(300);
    T.vuotPhaiTraVe = await mo();
    if (T.vuotPhaiTraVe !== 0) ketQua.loi.push('Vuốt phải không trả dòng về');
    // chạm chỗ khác → trả về
    c = await tamDiem(A.locator('.task-main'));
    await vuotNgang(cdp, c.b.x + c.b.width - 10, c.b.x + c.b.width - 160, c.y);
    await page.waitForTimeout(250);
    await page.touchscreen.tap(60, 45);
    await page.waitForTimeout(300);
    T.chamNgoaiDong = await mo();
    if (T.chamNgoaiDong !== 0) ketQua.loi.push('Chạm chỗ khác không trả dòng về');
    T.nhanHienLai = await A.locator('.tag-dot').first().isVisible();
    if (!T.nhanHienLai) ketQua.loi.push('Trả dòng về mà cụm nhãn không hiện lại');

    // chạm 1 lần vào thân dòng: chưa mở; chạm lần 2: mở bảng chi tiết (không có chữ "Sửa việc", "Tự lưu")
    const D = dong('Báo kết quả CRP');
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
    if (hb.height < 0.45 * 852 || hb.height > 0.6 * 852) ketQua.loi.push('Bảng chi tiết việc cao ' + T.chiTietCao + ' (mong đợi 45–60%)');
    const chuBang = (await bang.textContent()) || '';
    if (/Sửa việc/.test(chuBang)) ketQua.loi.push('Bảng chi tiết còn chữ "Sửa việc"');
    if (/Tự lưu/.test(chuBang)) ketQua.loi.push('Bảng chi tiết còn chữ "Tự lưu"');
    const nhanTrongBang = await bang.getByRole('button', { name: /^Nhãn / }).count();
    if (nhanTrongBang !== 5) ketQua.loi.push('Bảng chi tiết có ' + nhanTrongBang + ' nút nhãn (mong đợi 5)');
    // ghi chú là khung lớn nhất
    const ghiChuCao = (await bang.locator('textarea').boundingBox()).height;
    T.ghiChuCao = Math.round(ghiChuCao);
    if (ghiChuCao < 0.35 * hb.height) ketQua.loi.push('Khung ghi chú nhỏ (' + T.ghiChuCao + 'px)');
    const ta = bang.getByRole('textbox', { name: 'Ghi chú' });
    T.ghiChuCoSan = await ta.inputValue();
    await chup(page, 'iphone-chi-tiet-viec', true);
    // sửa ghi chú, tên, khu, nhãn — tất cả tự lưu
    await ta.fill(T.ghiChuCoSan + ' Cập nhật 9 giờ.');
    const oTen = bang.getByRole('textbox', { name: 'Nội dung việc' });
    T.tenCu = await oTen.inputValue();
    await oTen.fill('Báo CRP mới cho bác sĩ trực');
    await bang.getByLabel('Khu vực').selectOption('HP');
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
    await bang.getByRole('button', { name: 'Xong', exact: true }).click();
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
    await page.touchscreen.tap(c.x, c.y);
    await page.touchscreen.tap(c.x, c.y);
    const bang2 = page.getByRole('dialog', { name: 'Chi tiết việc' });
    await bang2.waitFor();
    T.nhanBatKhiViecCu = await bang2.locator('[aria-pressed="true"]').count();
    if (T.nhanBatKhiViecCu !== 0) ketQua.loi.push('Việc cũ mở chi tiết mà đã có nhãn bật');
    await bang2.getByRole('button', { name: 'Xong', exact: true }).click();
    await page.waitForTimeout(300);
    await cu.scrollIntoViewIfNeeded();
    T.viecCuKhongBatGi = await cu.locator('.icon-btn .pri').count();
    if (T.viecCuKhongBatGi !== 1) ketQua.loi.push('Việc cũ không bật nhãn mà mất chấm số');
    c = await tamDiem(cu.locator('.task-main'));
    await page.touchscreen.tap(c.x, c.y);
    await page.touchscreen.tap(c.x, c.y);
    await bang2.waitFor();
    await bang2.getByRole('button', { name: 'Nhãn HC', exact: true }).click();
    await page.waitForTimeout(300);
    await bang2.getByRole('button', { name: 'Xong', exact: true }).click();
    await page.waitForTimeout(300);
    T.viecCuSauKhiGanNhan = { chamSo: await cu.locator('.icon-btn .pri').count(), nhan: await cu.locator('.tag-dot').allTextContents(), duLieu: await docViec(page, 'Siêu âm tim') };
    if (T.viecCuSauKhiGanNhan.chamSo !== 0 || T.viecCuSauKhiGanNhan.nhan.join() !== 'HC') ketQua.loi.push('Việc cũ gắn nhãn HC mà dòng hiện: ' + JSON.stringify(T.viecCuSauKhiGanNhan));
    if (T.viecCuSauKhiGanNhan.duLieu[0]?.urgency !== 2) ketQua.loi.push('Việc cũ gắn nhãn: urgency không còn giữ trong dữ liệu');

    // thêm việc mới với 2 nhãn; giữ lựa chọn sau khi thêm
    const truoc = await page.locator('.swipe').count();
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
    // xoá: vuốt trái rồi chạm nút Xoá → mất dòng
    const V = dong('Việc thử có hai nhãn');
    await V.scrollIntoViewIfNeeded();
    const dem0 = await page.locator('.swipe').count();
    c = await tamDiem(V.locator('.task-main'));
    await vuotNgang(cdp, c.b.x + c.b.width - 10, c.b.x + c.b.width - 160, c.y);
    await page.waitForTimeout(300);
    await page.waitForTimeout(500);
    await V.locator('.swipe-del').tap();
    await page.waitForTimeout(400);
    T.xoaBangNut = { truoc: dem0, sau: await page.locator('.swipe').count(), conDong: await dong('Việc thử có hai nhãn').count() };
    if (T.xoaBangNut.conDong !== 0 || T.xoaBangNut.sau !== dem0 - 1) ketQua.loi.push('Chạm nút Xoá mà dòng không mất: ' + JSON.stringify(T.xoaBangNut));
    // xoá từ bảng chi tiết: "Xoá việc" xoá rồi đóng bảng
    await page.getByLabel('Nội dung công việc').fill('Việc thử xoá trong bảng');
    await page.getByRole('button', { name: 'Thêm việc', exact: true }).click();
    await page.waitForTimeout(400);
    const W = dong('Việc thử xoá trong bảng');
    await W.scrollIntoViewIfNeeded();
    c = await tamDiem(W.locator('.task-main'));
    await page.touchscreen.tap(c.x, c.y);
    await page.touchscreen.tap(c.x, c.y);
    await page.getByRole('dialog', { name: 'Chi tiết việc' }).waitFor();
    await page.getByRole('button', { name: 'Xoá việc', exact: true }).click();
    await page.waitForTimeout(400);
    T.xoaTuBang = { bangDong: (await page.getByRole('dialog', { name: 'Chi tiết việc' }).count()) === 0, conDong: await dong('Việc thử xoá trong bảng').count(), duLieu: (await docViec(page, 'Việc thử xoá trong bảng'))[0]?.deleted };
    if (!T.xoaTuBang.bangDong || T.xoaTuBang.conDong !== 0 || T.xoaTuBang.duLieu !== true) ketQua.loi.push('Nút "Xoá việc" trong bảng chi tiết chưa đúng: ' + JSON.stringify(T.xoaTuBang));
    // khu BM cũ vẫn có chip và nhóm
    T.chipBM = await page.locator('.chip', { hasText: /^BM/ }).count();
    if (!T.chipBM) ketQua.loi.push("Việc cũ ở khu 'BM' mà không thấy chip BM");
    // việc ở khu cũ BM: ô chọn khu vẫn có BM
    const bm = dong('Việc cũ ở khu BM');
    await bm.scrollIntoViewIfNeeded();
    c = await tamDiem(bm.locator('.task-main'));
    await page.touchscreen.tap(c.x, c.y);
    await page.touchscreen.tap(c.x, c.y);
    const bang3 = page.getByRole('dialog', { name: 'Chi tiết việc' });
    await bang3.waitFor();
    T.khuTrongBangViecBM = await bang3.getByLabel('Khu vực').inputValue();
    if (T.khuTrongBangViecBM !== 'BM') ketQua.loi.push('Việc ở khu BM mở chi tiết mà ô khu hiện "' + T.khuTrongBangViecBM + '"');
    await bang3.getByRole('button', { name: 'Xong', exact: true }).click();
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
    const cg = await tamDiem(dg);
    await page.touchscreen.tap(cg.x, cg.y);
    await page.touchscreen.tap(cg.x, cg.y);
    const ta = page.locator('#ghichu-viec');
    await ta.waitFor();
    await ta.click();
    await page.keyboard.type('Gửi /cay ');
    T.ghiChuViec = await ta.inputValue();
    if (T.ghiChuViec !== 'Gửi Cấy máu ') ketQua.loi.push('Viết tắt: khung ghi chú việc ra "' + T.ghiChuViec + '"');
    await page.waitForTimeout(600);
    await page.getByRole('button', { name: 'Xong', exact: true }).click();
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
    // vuốt trái việc cần làm của bé: thẻ đứng yên, nút Xoá ở cuối dòng, không còn dấu ×
    const cdp = await ctx.newCDPSession(page);
    const hang = page.locator('.sheet .swipe').first();
    const truoc = await hang.locator('.swipe-body').boundingBox();
    const c = await tamDiem(hang.locator('.todo-text'));
    await vuotNgang(cdp, c.b.x + c.b.width - 6, c.b.x + c.b.width - 150, c.y);
    await page.waitForTimeout(300);
    const mo = await page.locator('.sheet .swipe.armed').count();
    const x = await page.locator('.sheet .todo-row .icon-btn').count();
    const T = ketQua.thuChucNang.vuotViecCuaBe = { dongMo: mo, nutXLai: x };
    if (mo !== 1) ketQua.loi.push('Vuốt trái việc của bé không đưa dòng vào trạng thái xoá');
    if (x !== 0) ketQua.loi.push('Việc của bé còn nút ×');
    await kiemKieuC(page, hang, T, 'xoaKieuC_viecCuaBe', truoc);
    await chup(page, 'iphone-chi-tiet-be-xoa', true);
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
  await page.getByRole('button', { name: 'Đóng chi tiết', exact: true }).click();

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
  await page.getByRole('button', { name: 'Đóng tổng hợp', exact: true }).click();

  await sangToi(page);
  await chup(page, 'iphone-kham-toi', false);
  await page.getByRole('button', { name: 'Việc', exact: true }).click();
  await chup(page, 'iphone-viec-toi', true);
  {
    // tối: nút xoá kiểu C và bảng chi tiết việc
    const cdp = await ctx.newCDPSession(page);
    const T = ketQua.thuChucNang.viecToi = {};
    const A = page.locator('.swipe', { hasText: 'Hội chẩn dinh dưỡng giường 7' });
    await A.scrollIntoViewIfNeeded();
    const truoc = await A.locator('.swipe-body').boundingBox();
    let c = await tamDiem(A.locator('.task-main'));
    await vuotNgang(cdp, c.b.x + c.b.width - 10, c.b.x + c.b.width - 160, c.y);
    await page.waitForTimeout(300);
    await kiemKieuC(page, A, T, 'xoaKieuC_toi', truoc);
    await chup(page, 'iphone-viec-xoa-toi', true);
    await page.touchscreen.tap(60, 45);
    await page.waitForTimeout(250);
    c = await tamDiem(A.locator('.task-main'));
    await page.touchscreen.tap(c.x, c.y);
    await page.touchscreen.tap(c.x, c.y);
    await page.getByRole('dialog', { name: 'Chi tiết việc' }).waitFor();
    await chup(page, 'iphone-chi-tiet-viec-toi', true);
    await page.getByRole('button', { name: 'Xong', exact: true }).click();
    await page.waitForTimeout(250);
    await cdp.detach();
  }
  {
    const o = page.getByLabel('Nội dung công việc');
    await o.click();
    await page.keyboard.type('Xem lại /km');
    await chup(page, 'iphone-goi-y-toi', true);
    await page.keyboard.type('dm ');
    await chup(page, 'iphone-viet-tat-hoan-tac-toi', true);
    await o.fill('');
    await o.blur();
    await page.getByRole('button', { name: 'Thư viện viết tắt', exact: true }).click();
    await page.getByRole('dialog', { name: 'Thư viện viết tắt' }).waitFor();
    await chup(page, 'iphone-thu-vien-toi', true);
    await page.getByRole('button', { name: 'Đóng thư viện', exact: true }).click();
  }
  await ctx.close();
}

// PC
{
  const { ctx, page } = await moApp({ viewport: { width: 1440, height: 900 } });
  await chup(page, 'pc-viec-sang', false);
  {
    const hang = page.locator('.swipe', { hasText: 'Báo kết quả CRP' });
    await hang.hover();
    await page.waitForTimeout(300);
    const nut = hang.locator('.swipe-del');
    const hn = await nut.boundingBox();
    const vungNhan = await hang.locator('.tag-zone').boundingBox();
    const T = ketQua.thuChucNang.pcReChuot = {
      nutRong: Math.round(hn?.width || 0), nutCao: Math.round(hn?.height || 0),
      nhanVanHien: await hang.locator('.tag-dot').first().isVisible(),
      nutNamCanhNhan: !!hn && !!vungNhan && hn.x >= vungNhan.x + vungNhan.width - 1 && Math.abs((hn.y + hn.height / 2) - (vungNhan.y + vungNhan.height / 2)) < 10,
      vienDo: await hang.locator('.swipe-del-face').evaluate((e) => getComputedStyle(e).borderTopColor) === (await mauP1(hang.locator('.swipe-body')))
    };
    if (!hn || hn.width < 44) ketQua.loi.push('PC: rê chuột vào dòng không hiện nút Xoá');
    if (hn && hn.height < 44) ketQua.loi.push('PC: vùng chạm nút Xoá cao ' + T.nutCao + 'px (< 44)');
    if (!T.nhanVanHien) ketQua.loi.push('PC: rê chuột làm ẩn cụm nhãn');
    if (!T.nutNamCanhNhan) ketQua.loi.push('PC: nút Xoá không nằm cạnh cụm nhãn');
    if (!T.vienDo) ketQua.loi.push('PC: nút Xoá không có viền đỏ');
    await chup(page, 'pc-viec-re-chuot', false);
    await hang.locator('.task-main').dblclick();
    await page.waitForTimeout(300);
    const mo = await page.getByRole('dialog', { name: 'Chi tiết việc' }).count();
    ketQua.thuChucNang.pcNhapDupChiTiet = mo;
    if (mo !== 1) ketQua.loi.push('PC: nhấp đúp vào dòng không mở chi tiết việc');
    await chup(page, 'pc-chi-tiet-viec', false);
    await page.keyboard.press('Escape');
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
