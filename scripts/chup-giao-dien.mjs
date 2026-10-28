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
const VUNG_CHAM = ['.chk', '.icon-btn', '.pri-btn', '.tag-zone', '.swipe-del', '.round-btn', '.seg button', '.pill-btn', '.chip'];
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
const sangToi = async (page) => {
  const b = page.getByRole('button', { name: /Chuyển sang giao diện/ });
  await b.click();
};

// iPhone 15
{
  const { ctx, page } = await moApp({
    viewport: { width: 393, height: 852 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
  });
  await chup(page, 'iphone-viec-sang', true);

  // --- thử: vuốt trái, chạm 2 lần (ghi chú), chạm 3 lần (nhãn), thêm việc có nhãn ---
  {
    const cdp = await ctx.newCDPSession(page);
    const T = ketQua.thuChucNang.viecV8 = {};
    const dong = (ten) => page.locator('.swipe', { hasText: ten });
    const A = dong('Hội chẩn dinh dưỡng giường 7');
    const B = dong('Gọi đăng ký giường mới');
    const mo = () => page.locator('.swipe.reveal').count();
    // vuốt trái dòng A
    let c = await tamDiem(A.locator('.task-main'));
    await vuotNgang(cdp, c.b.x + c.b.width - 10, c.b.x + c.b.width - 160, c.y);
    await page.waitForTimeout(300);
    T.vuotMoDong1 = await mo();
    const nutXoa = await A.locator('.swipe-del').boundingBox();
    T.nutXoaRong = Math.round(nutXoa.width);
    if (T.vuotMoDong1 !== 1) ketQua.loi.push('Vuốt trái không mở dòng (số dòng mở = ' + T.vuotMoDong1 + ')');
    if (!(await A.locator('.swipe-del').getAttribute('aria-label') || '').startsWith('Xoá việc: Hội chẩn')) ketQua.loi.push('Nút xoá thiếu aria-label "Xoá việc: <tên>"');
    await chup(page, 'iphone-viec-vuot', true);
    // vuốt dòng B → chỉ một dòng mở
    c = await tamDiem(B.locator('.task-main'));
    await vuotNgang(cdp, c.b.x + c.b.width - 10, c.b.x + c.b.width - 160, c.y);
    await page.waitForTimeout(300);
    T.vuotMoDong2 = await mo();
    if (T.vuotMoDong2 !== 1) ketQua.loi.push('Mở dòng thứ hai mà dòng đầu chưa đóng (số dòng mở = ' + T.vuotMoDong2 + ')');
    // chạm chỗ khác → trả về
    await page.touchscreen.tap(200, 60);
    await page.waitForTimeout(300);
    T.chamNgoaiDong = await mo();
    if (T.chamNgoaiDong !== 0) ketQua.loi.push('Chạm chỗ khác không trả dòng về');
    const soDong = await page.locator('.swipe').count();
    T.khongXoaKhiVuot = soDong;

    // chạm 1 lần vào thân dòng: chưa mở ghi chú; chạm lần 2: mở
    const D = dong('Báo kết quả CRP');
    c = await tamDiem(D.locator('.task-main'));
    await page.touchscreen.tap(c.x, c.y);
    await page.waitForTimeout(150);
    T.ghiChuSau1Lan = await page.getByRole('dialog', { name: 'Ghi chú' }).count();
    await page.touchscreen.tap(c.x, c.y);
    await page.waitForTimeout(300);
    T.ghiChuSau2Lan = await page.getByRole('dialog', { name: 'Ghi chú' }).count();
    if (T.ghiChuSau1Lan !== 0) ketQua.loi.push('Chạm 1 lần đã mở ghi chú');
    if (T.ghiChuSau2Lan !== 1) ketQua.loi.push('Chạm 2 lần không mở ghi chú');
    const ta = page.getByRole('textbox', { name: 'Nội dung ghi chú' });
    T.ghiChuCoSan = await ta.inputValue();
    await chup(page, 'iphone-ghi-chu', true);
    await ta.fill(T.ghiChuCoSan + ' Cập nhật 9 giờ.');
    await page.waitForTimeout(700); // tự lưu 0,4 giây
    await page.getByRole('button', { name: 'Xong', exact: true }).click();
    await page.waitForTimeout(300);
    T.ghiChuHienDuoiTen = await D.locator('.task-note').textContent();
    if (!/Cập nhật 9 giờ/.test(T.ghiChuHienDuoiTen || '')) ketQua.loi.push('Ghi chú vừa gõ không hiện dưới tên việc');

    // cụm nhãn: chạm 2 lần không mở, 3 lần mở
    const E = dong('Gọi đăng ký giường mới');
    const vung = E.locator('.tag-zone');
    c = await tamDiem(vung);
    await page.touchscreen.tap(c.x, c.y);
    await page.touchscreen.tap(c.x, c.y);
    await page.waitForTimeout(150);
    T.nhanSau2Lan = await page.getByRole('dialog', { name: 'Nhãn của việc' }).count();
    await page.touchscreen.tap(c.x, c.y);
    await page.waitForTimeout(300);
    T.nhanSau3Lan = await page.getByRole('dialog', { name: 'Nhãn của việc' }).count();
    if (T.nhanSau2Lan !== 0) ketQua.loi.push('Chạm 2 lần vào cụm nhãn đã mở bảng nhãn');
    if (T.nhanSau3Lan !== 1) ketQua.loi.push('Chạm 3 lần vào cụm nhãn không mở bảng nhãn');
    await page.getByRole('button', { name: /^HC/ }).click();
    await page.getByRole('button', { name: /^CK/ }).click();
    await page.waitForTimeout(300);
    T.nhanSauKhiChon = await vung.locator('.tag-dot').allTextContents();
    if (T.nhanSauKhiChon.join() !== 'CK,HC') ketQua.loi.push('Chọn nhãn CK, HC trong bảng nhãn nhưng dòng hiện: ' + T.nhanSauKhiChon.join());
    await chup(page, 'iphone-bang-nhan', true);
    await page.getByRole('button', { name: 'Xong', exact: true }).click();
    await page.waitForTimeout(250);

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
    const cu = dong('Cập nhật cân nặng').locator('.icon-btn');
    const truocChu = await cu.textContent();
    await cu.click();
    await page.waitForTimeout(250);
    T.vongMucCu = truocChu + ' -> ' + (await cu.textContent());
    if (truocChu === (await cu.textContent())) ketQua.loi.push('Chạm chấm mức của việc cũ không đổi vòng');
    // khu BM cũ vẫn có chip và nhóm
    T.chipBM = await page.locator('.chip', { hasText: /^BM/ }).count();
    if (!T.chipBM) ketQua.loi.push("Việc cũ ở khu 'BM' mà không thấy chip BM");
    await page.evaluate(() => document.querySelector('.ph-main').scrollTo(0, 0));
    await cdp.detach();
  }

  await page.getByRole('button', { name: 'Khám', exact: true }).click();
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
    // vuốt trái việc cần làm của bé: lộ nút xoá, không còn dấu ×
    const cdp = await ctx.newCDPSession(page);
    const hang = page.locator('.sheet .swipe').first();
    const c = await tamDiem(hang.locator('.todo-text'));
    await vuotNgang(cdp, c.b.x + c.b.width - 6, c.b.x + c.b.width - 150, c.y);
    await page.waitForTimeout(300);
    const mo = await page.locator('.sheet .swipe.reveal').count();
    const x = await page.locator('.sheet .todo-row .icon-btn').count();
    ketQua.thuChucNang.vuotViecCuaBe = { dongMo: mo, nutXLai: x };
    if (mo !== 1) ketQua.loi.push('Vuốt trái việc của bé không lộ nút xoá');
    if (x !== 0) ketQua.loi.push('Việc của bé còn nút ×');
    await chup(page, 'iphone-chi-tiet-vuot', true);
    await cdp.detach();
  }
  await page.getByRole('button', { name: 'Đóng chi tiết', exact: true }).click();

  await page.getByRole('button', { name: 'Tổng hợp', exact: true }).click();
  const tongHop = await page.locator('textarea.mono').inputValue();
  ketQua.thuChucNang.tongHop = tongHop.split('\n').slice(0, 6).join(' | ');
  if (!/Tiếp tục y lệnh cũ/.test(tongHop)) ketQua.loi.push('Tổng hợp y lệnh thiếu "Tiếp tục y lệnh cũ" cho bé không có việc mới');
  await chup(page, 'iphone-tong-hop', true);
  await page.getByRole('button', { name: 'Đóng tổng hợp', exact: true }).click();

  await sangToi(page);
  await chup(page, 'iphone-kham-toi', false);
  await page.getByRole('button', { name: 'Việc', exact: true }).click();
  await chup(page, 'iphone-viec-toi', true);
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
    ketQua.thuChucNang.pcThungRac = { hienKhiRe: await nut.evaluate((e) => getComputedStyle(e).opacity), rong: Math.round((await nut.boundingBox()).width) };
    if (ketQua.thuChucNang.pcThungRac.hienKhiRe !== '1') ketQua.loi.push('PC: rê chuột vào dòng không hiện thùng rác');
    await chup(page, 'pc-viec-re-chuot', false);
    await hang.locator('.task-main').dblclick();
    await page.waitForTimeout(300);
    const mo = await page.getByRole('dialog', { name: 'Ghi chú' }).count();
    ketQua.thuChucNang.pcNhapDupGhiChu = mo;
    if (mo !== 1) ketQua.loi.push('PC: nhấp đúp vào dòng không mở ghi chú');
    await chup(page, 'pc-ghi-chu', false);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
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
