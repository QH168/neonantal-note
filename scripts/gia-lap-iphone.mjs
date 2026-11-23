// GIẢ LẬP IPHONE + BÀN PHÍM GIẢ (phiếu 2026-11-22-bang-truot-ban-phim-iphone, mục giaLapIphone, phương án 1).
//
// ĐÂY LÀ MÔ PHỎNG, KHÔNG PHẢI IPHONE THẬT. Dùng lõi WebKit của Playwright (cùng họ với Safari) với hồ sơ thiết bị "iPhone 15"
// (viewport, deviceScaleFactor, isMobile, hasTouch, userAgent). WebKit trên Windows KHÔNG có bàn phím mềm của iOS, nên script
// tự làm "bàn phím giả": ghi đè window.visualViewport và, khi một ô nhập nhận con trỏ, bắt chước iOS Safari:
//   - visualViewport.height giảm (mặc định 336px), phát sự kiện resize;
//   - visualViewport.offsetTop tăng đủ để ô đang gõ không nằm dưới bàn phím (tính theo bố cục LÚC ĐÓ, như iOS), phát sự kiện scroll;
//   - window.scrollTo lệch lên bằng offsetTop (trang tạm cao hơn màn hình để cuộn được, như iOS).
// Khi ô nhập mất con trỏ (blur): chiều cao trở lại, nhưng offsetTop/scrollY CÓ THỂ còn lệch (--lech, mặc định 120px) — đây là
// trường hợp nghi gây lỗi "bảng không chạm đáy". Hai kiểu lệch:
//   --lech-kieu cuon  : offsetTop VÀ scrollY còn lệch; tự về 0 khi app gọi window.scrollTo(0,0)   (mặc định)
//   --lech-kieu ngoai : chỉ visualViewport.offsetTop còn giá trị cũ (Safari báo chậm / báo sai), scrollY = 0
// Những gì mô phỏng KHÔNG làm được: bàn phím thật, cách iOS dời phần tử position:fixed theo khung nhìn, quán tính vuốt, thanh địa chỉ.
// Vì vậy kết quả ở đây là bằng chứng gián tiếp; vẫn phải thử trên iPhone thật.
//
// Cách chạy (cần môi trường có Playwright, xem cong-cu/moi-truong.ps1; không thêm gì vào package.json của app):
//   npm run build
//   node scripts/gia-lap-iphone.mjs dist --ra C:\...\gia-lap\sau [--engine webkit|chromium] [--lech-kieu cuon|ngoai]
//                                   [--ban-phim 336] [--lech 120] [--nghiem]
//   --nghiem: thoát mã 1 nếu có phép đo không đạt (mặc định luôn mã 0 để chạy được trên bản cũ và xem số đo).
// Kết quả: <ra>/<engine>-<kieu>-*.png và <ra>/<engine>-<kieu>.json. Dữ liệu mẫu chỉ có mã giường G01, G02, G03.
//
// Kịch bản (tab Khám, ngày giả định 21/10/2026 08:00):
//   (a) mở chi tiết bé G01, chạm ô "Thêm việc cần làm…", bàn phím giả mở → chụp, cuộn danh sách trong bảng, kiểm ô đang gõ thấy được;
//   (b) đóng bàn phím (blur) → đo đáy .sheet so với đáy màn hình (phải chạm đáy, lệch ≤ 1px);
//   (c) mở chi tiết việc của bé chồng lên → đo như (b);
//   (d) mở rồi đóng bàn phím lần nữa, đóng bảng bé, mở "Tổng hợp y lệnh" → đo như (b).
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname, extname, normalize, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const pw = require('playwright');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const lay = (ten, mac) => { const i = args.indexOf(ten); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : mac; };
const CO_GIA_TRI = ['--ra', '--engine', '--lech-kieu', '--ban-phim', '--lech'];
const BUILD = resolve(ROOT, args.find((a, i) => !a.startsWith('--') && !CO_GIA_TRI.includes(args[i - 1])) || 'dist');
const RA = resolve(ROOT, lay('--ra', 'anh-gia-lap'));
const ENGINE = lay('--engine', 'webkit');
const KIEU = lay('--lech-kieu', 'cuon');
const BAN_PHIM = Number(lay('--ban-phim', '336'));
const LECH = Number(lay('--lech', '120'));
const NGHIEM = args.includes('--nghiem');
const NOW = new Date(2026, 9, 21, 8, 0, 0);

if (!existsSync(join(BUILD, 'index.html'))) { console.error('Không thấy bản dựng tại ' + BUILD + ' (chạy `npm run build` trước).'); process.exit(2); }
mkdirSync(RA, { recursive: true });
const tien = `${ENGINE}-${KIEU}`;

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

// ---------- bàn phím giả (chạy trong trang, trước mọi mã của app) ----------
function banPhimGia(cfg) {
  const vv = new EventTarget();
  Object.assign(vv, { width: window.innerWidth, height: window.innerHeight, offsetTop: 0, offsetLeft: 0, pageTop: 0, pageLeft: 0, scale: 1 });
  Object.defineProperty(window, 'visualViewport', { value: vv, configurable: true });
  const st = { mo: false, nhatKy: [] };
  window.__kb = st;
  const phat = () => { vv.dispatchEvent(new Event('resize')); vv.dispatchEvent(new Event('scroll')); };
  const laO = (e) => !!e && e.matches && e.matches('input:not([type=checkbox]):not([type=radio]):not([type=file]):not([type=button]):not([type=submit]),textarea,[contenteditable=true]');
  const tamDem = () => {
    let s = document.getElementById('kb-gia-dem');
    if (!s) { s = document.createElement('div'); s.id = 'kb-gia-dem'; s.style.cssText = 'position:absolute;top:0;left:0;width:1px;pointer-events:none;visibility:hidden'; document.body.appendChild(s); }
    s.style.height = (window.innerHeight + cfg.kb) + 'px'; // trang cao hơn màn hình để cuộn được, như iOS khi bàn phím mở
  };
  const mo = (el) => {
    const H = window.innerHeight;
    const r = el.getBoundingClientRect(); // bố cục LÚC ĐÓ (chưa co theo bàn phím), iOS tính cuộn từ đây
    const can = r.bottom + 16 - (H - cfg.kb);
    const ot = can > 0 ? Math.min(cfg.kb, Math.ceil(can)) : 0;
    st.mo = true;
    tamDem();
    vv.height = H - cfg.kb;
    vv.offsetTop = ot;
    try { window.scrollTo(0, ot); } catch { /* bỏ qua */ }
    st.nhatKy.push({ viec: 'mo', ot, cao: vv.height, scrollY: window.scrollY });
    phat();
  };
  const dong = () => {
    const H = window.innerHeight;
    st.mo = false;
    vv.height = H;
    if (cfg.kieu === 'cuon') { try { window.scrollTo(0, cfg.lech); } catch { /* bỏ qua */ } vv.offsetTop = cfg.lech; }
    else { vv.offsetTop = cfg.lech; }
    st.nhatKy.push({ viec: 'dong', offsetTop: vv.offsetTop, scrollY: window.scrollY });
    phat();
  };
  document.addEventListener('focusin', (e) => { if (laO(e.target)) { if (!st.mo) mo(e.target); else { st.nhatKy.push({ viec: 'doi-o' }); } } }, true);
  document.addEventListener('focusout', () => { setTimeout(() => { if (st.mo && !laO(document.activeElement)) dong(); }, 60); }, true);
  setInterval(() => { if (st.mo && !laO(document.activeElement)) dong(); }, 120); // ô bị gỡ khỏi trang khi bảng đóng
  // trang về đỉnh (do app gọi scrollTo): kiểu "cuon" thì offsetTop đi theo scrollY như khung nhìn thật
  window.addEventListener('scroll', () => { if (!st.mo && cfg.kieu === 'cuon' && vv.offsetTop !== window.scrollY) { vv.offsetTop = window.scrollY; phat(); } });
}

// ---------- dữ liệu mẫu (chỉ mã giường giả) ----------
const seed = (page) => page.evaluate(async () => {
  const open = () => new Promise((res, rej) => { const r = indexedDB.open('ghichu-sosinh'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const db = await open();
  const all = (s) => new Promise((res) => { const r = db.transaction(s).objectStore(s).getAll(); r.onsuccess = () => res(r.result); });
  const rooms = (await all('rooms')).sort((a, b) => a.order - b.order);
  const t0 = Date.now();
  let n = 0;
  const row = (x) => ({ deleted: false, createdAt: t0 + n, updatedAt: t0 + (n++), deviceId: 'mau', ...x, id: 'mau-' + n });
  const be = [
    { roomId: rooms[0].id, code: 'G01', dob: '0508', ga: '25', wt: '1850', note: 'Theo dõi vàng da' },
    { roomId: rooms[0].id, code: 'G02', dob: '2009', ga: '320', wt: '2100', note: '' },
    { roomId: rooms[1].id, code: 'G03', dob: '0410', ga: '390', wt: '3200', note: '' }
  ].map((p, i) => row({ examDate: '2026-10-21', done: false, ...p, createdAt: new Date(2026, 9, 21, 7, 30, 0).getTime() + i }));
  const viec = ['Đo bilirubin', 'Cân bé', 'Tăng sữa 5 ml/cữ', 'Xem lại khí máu', 'Hội chẩn ngoại', 'Chụp X-quang phổi', 'Gọi người nhà', 'Cập nhật cân nặng', 'Siêu âm tim', 'Rút sonde dạ dày']
    .map((text, i) => row({ patientId: be[0].id, text, done: i === 1, order: i + 1 }));
  const tx = db.transaction(['exam_patients', 'patient_todos'], 'readwrite');
  be.forEach((r) => tx.objectStore('exam_patients').put(r));
  viec.forEach((r) => tx.objectStore('patient_todos').put(r));
  await new Promise((res) => { tx.oncomplete = res; });
  db.close();
});

// ---------- đo (chạy trong trang) ----------
const DO = () => {
  const H = window.innerHeight, vv = window.visualViewport;
  const lam = (r) => (r ? { top: Math.round(r.top), bottom: Math.round(r.bottom), height: Math.round(r.height) } : null);
  const bang = [...document.querySelectorAll('.sheet')];
  const tren = bang[bang.length - 1] || null;
  const rs = tren?.getBoundingClientRect() || null;
  const a = document.activeElement;
  const coO = a && a !== document.body && /^(INPUT|TEXTAREA)$/.test(a.tagName);
  const ra = coO ? a.getBoundingClientRect() : null;
  const nhinTop = vv.offsetTop, nhinDay = vv.offsetTop + vv.height;
  let oThay = null;
  if (ra && rs) { // ô nằm trong phần giao của (khung bảng) và (vùng thấy của visualViewport)
    const t = Math.max(rs.top, nhinTop), b = Math.min(rs.bottom, nhinDay);
    oThay = ra.top >= t - 1 && ra.bottom <= b + 1;
  }
  return {
    innerH: H, vvCao: Math.round(vv.height), vvOffsetTop: Math.round(vv.offsetTop), scrollY: Math.round(window.scrollY),
    soBang: bang.length, bang: lam(rs), nhinTop: Math.round(nhinTop), nhinDay: Math.round(nhinDay),
    lechDayMan: rs ? Math.round(rs.bottom - H) : null, // dương = bảng thò xuống dưới đáy màn hình, âm = hở đáy
    lechDayNhin: rs ? Math.round(rs.bottom - nhinDay) : null,
    khoangHoTren: rs ? Math.round(rs.top) : null,
    wrapKb: tren ? tren.closest('.sheet-wrap').classList.contains('kb') : null,
    wrapTop: tren ? tren.closest('.sheet-wrap').style.top : null, wrapCao: tren ? tren.closest('.sheet-wrap').style.height : null,
    cuonBang: tren ? { scrollTop: Math.round(tren.scrollTop), scrollHeight: tren.scrollHeight, clientHeight: tren.clientHeight } : null,
    bodyPos: getComputedStyle(document.body).position,
    oDangGo: ra ? { id: a.id || a.getAttribute('placeholder') || a.tagName, top: Math.round(ra.top), bottom: Math.round(ra.bottom), thayDuoc: oThay } : null,
    kb: window.__kb ? { mo: window.__kb.mo, nhatKy: window.__kb.nhatKy.slice(-3) } : null
  };
};
// tô vùng ngoài khung nhìn để ảnh đọc được: ngoài [offsetTop, offsetTop+cao] làm tối, ghi chú bàn phím giả
const VE = ({ chu }) => {
  const vv = window.visualViewport, H = window.innerHeight;
  const mk = (css, txt) => { const d = document.createElement('div'); d.className = 'kb-gia-ve'; d.style.cssText = 'position:fixed;left:0;right:0;z-index:9999;pointer-events:none;color:#fff;font:12px sans-serif;display:flex;align-items:center;justify-content:center;text-align:center;' + css; d.textContent = txt || ''; document.body.appendChild(d); };
  if (vv.offsetTop > 0) mk(`top:0;height:${vv.offsetTop}px;background:rgba(0,0,0,.55)`, 'ngoài khung nhìn (iOS đã cuộn đi)');
  const day = vv.offsetTop + vv.height;
  if (day < H - 1) mk(`top:${day}px;height:${H - day}px;background:rgba(120,130,140,.92)`, 'BÀN PHÍM GIẢ (mô phỏng)');
  mk('top:0;height:20px;background:rgba(200,0,0,.8)', chu);
};
const GO_VE = () => document.querySelectorAll('.kb-gia-ve').forEach((e) => e.remove());

// ---------- chạy ----------
const loai = ENGINE === 'chromium' ? pw.chromium : pw.webkit;
const hoSo = { ...pw.devices['iPhone 15'] };
delete hoSo.defaultBrowserType;
const browser = await loai.launch();
const ctx = await browser.newContext(hoSo);
await ctx.addInitScript(banPhimGia, { kb: BAN_PHIM, lech: LECH, kieu: KIEU });
await ctx.addInitScript(() => { try { localStorage.setItem('soLanMo', '9'); } catch { /* bỏ qua */ } });
await ctx.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
const page = await ctx.newPage();
const loi = [];
page.on('pageerror', (e) => loi.push('Lỗi chạy trang: ' + e.message));
await page.clock.setFixedTime(NOW);
await page.goto(URL);
await page.waitForSelector('.phone-app');
await page.waitForTimeout(500);
await seed(page);
await page.reload();
await page.waitForSelector('.phone-app');
await page.waitForTimeout(400);

const KQ = { engine: ENGINE, hoSo: 'iPhone 15', viewport: hoSo.viewport, lechKieu: KIEU, banPhim: BAN_PHIM, lech: LECH, build: BUILD,
  luuY: 'MÔ PHỎNG bằng visualViewport giả, KHÔNG phải iPhone thật; WebKit di động không có bánh xe chuột/cử chỉ chạm giả nên cú cuộn trên WebKit là cuộn bằng mã (không kiểm được chuỗi cuộn sang trang); với chromium dùng cử chỉ chạm CDP thật.',
  cacBuoc: {}, thatBai: [], loi };
const chup = async (ten, chu) => {
  await page.evaluate(VE, { chu });
  await page.screenshot({ path: join(RA, `${tien}-${ten}.png`) });
  await page.evaluate(GO_VE);
};
const nghi = (ms = 700) => page.waitForTimeout(ms);
const hong = (buoc, dk, msg) => { if (!dk) KQ.thatBai.push(`${buoc}: ${msg}`); };
const doDay = (buoc, d) => hong(buoc, d.bang && Math.abs(d.lechDayMan) <= 1, `đáy bảng lệch ${d.lechDayMan}px so với đáy màn hình (cần ≤ 1), hở trên ${d.khoangHoTren}px, wrap top="${d.wrapTop}" cao="${d.wrapCao}"`);
const chamOViec = async () => {
  const o = page.getByPlaceholder('Thêm việc cần làm…');
  await o.scrollIntoViewIfNeeded();
  await o.tap();
  await page.waitForTimeout(200);
  if (!(await page.evaluate(() => document.activeElement?.getAttribute('placeholder') === 'Thêm việc cần làm…'))) await o.focus();
  await nghi(700);
};
const vuotCDP = async (x, y1, y2) => { // chỉ chromium
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y1 }] });
  for (let i = 1; i <= 10; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + i, y: y1 + ((y2 - y1) * i) / 10 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
  await page.waitForTimeout(250);
  await page.locator('.sheet-be .be-viec-h').first().tap(); // đệm: Chromium headless nuốt cú chạm đầu sau lần vuốt CDP
  await page.waitForTimeout(250);
};

// (a)
await page.getByRole('button', { name: 'Khám', exact: true }).tap();
await page.waitForTimeout(400);
await page.locator('.swipe', { has: page.locator('.pat-code', { hasText: /^G01$/ }) }).locator('.pat-open').tap();
await page.locator('.sheet-be').waitFor();
await nghi(700);
await chamOViec();
{
  const a1 = await page.evaluate(DO);
  KQ.cacBuoc.a_banPhimMo = a1;
  await chup('a1-ban-phim-mo', 'a) bàn phím giả mở, bảng chi tiết bé');
  hong('a', a1.kb?.mo, 'bàn phím giả không mở (ô không nhận con trỏ)');
  hong('a', a1.oDangGo?.thayDuoc, `ô đang gõ không nằm trong vùng thấy (ô ${a1.oDangGo?.top}–${a1.oDangGo?.bottom}, bảng ${a1.bang?.top}–${a1.bang?.bottom}, khung nhìn ${a1.nhinTop}–${a1.nhinDay})`);
  hong('a', a1.bang && a1.bang.top >= a1.nhinTop - 1 && a1.bang.bottom <= a1.nhinDay + 1, `bảng ra ngoài khung nhìn (bảng ${a1.bang?.top}–${a1.bang?.bottom}, khung nhìn ${a1.nhinTop}–${a1.nhinDay})`);
  // cuộn danh sách trong bảng: một cú vuốt/lăn lên rồi xuống; đo scrollTop của bảng và độ lệch của trang
  const b = a1.bang;
  const x = 196, y = Math.round(Math.max(a1.nhinTop, b.top) + (Math.min(b.bottom, a1.nhinDay) - Math.max(a1.nhinTop, b.top)) / 2);
  const truoc = await page.evaluate(DO);
  if (ENGINE === 'chromium') await vuotCDP(x, y + 120, y - 120); else await page.evaluate(() => { const s = [...document.querySelectorAll('.sheet')].pop(); s.scrollTop += 240; }); // WebKit di động không có bánh xe/cử chỉ chạm giả: cuộn bằng mã (chỉ kiểm cuộn được), chưa kiểm được chuỗi cuộn sang trang
  await nghi(500);
  const sau = await page.evaluate(DO);
  const cuon = { scrollTopTruoc: truoc.cuonBang.scrollTop, scrollTopSau: sau.cuonBang.scrollTop, scrollHeight: sau.cuonBang.scrollHeight, clientHeight: sau.cuonBang.clientHeight,
    scrollYTruoc: truoc.scrollY, scrollYSau: sau.scrollY, offsetTopTruoc: truoc.vvOffsetTop, offsetTopSau: sau.vvOffsetTop };
  KQ.cacBuoc.a_cuonDanhSach = cuon;
  const coTheCuon = cuon.scrollHeight > cuon.clientHeight + 4;
  hong('a-cuon', !coTheCuon || cuon.scrollTopSau !== cuon.scrollTopTruoc, `cuộn danh sách không làm bảng cuộn (scrollTop ${cuon.scrollTopTruoc} -> ${cuon.scrollTopSau})`);
  hong('a-cuon', cuon.scrollYSau === cuon.scrollYTruoc && cuon.offsetTopSau === cuon.offsetTopTruoc, `cú cuộn đi vào TRANG phía sau (scrollY ${cuon.scrollYTruoc} -> ${cuon.scrollYSau}, offsetTop ${cuon.offsetTopTruoc} -> ${cuon.offsetTopSau})`);
  await chup('a2-sau-cuon', 'a) sau khi cuộn danh sách');
  KQ.cacBuoc.a_sauCuon = sau;
}
// (b)
await page.evaluate(() => document.activeElement?.blur());
await nghi(900);
{
  const b = await page.evaluate(DO);
  KQ.cacBuoc.b_banPhimDong = b;
  await chup('b-sau-khi-dong-ban-phim', 'b) bàn phím giả vừa đóng (offsetTop còn lệch)');
  doDay('b', b);
}
// (c) chi tiết việc của bé chồng lên (chạm 2 lần vào dòng việc)
{
  const dong = page.locator('.todo-main', { hasText: 'Tăng sữa' });
  await dong.scrollIntoViewIfNeeded();
  const bb = await dong.boundingBox();
  for (let i = 0; i < 2; i++) { await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await page.waitForTimeout(120); }
  await page.locator('.sheet-todo').waitFor({ timeout: 4000 }).catch(() => loi.push('(c) không mở được chi tiết việc của bé'));
  await nghi(800);
  const c = await page.evaluate(DO);
  KQ.cacBuoc.c_chiTietViecChong = c;
  await chup('c-chi-tiet-viec-chong', 'c) chi tiết việc của bé mở chồng lên');
  hong('c', c.soBang >= 2, 'không có bảng chồng');
  doDay('c', c);
  await page.locator('.sheet-todo').getByRole('button', { name: 'Đóng', exact: true }).tap().catch(() => {});
  await nghi(700);
}
// (d) bàn phím vừa đóng rồi mở Tổng hợp y lệnh
{
  await chamOViec();
  await page.evaluate(() => document.activeElement?.blur());
  await nghi(700);
  await page.getByRole('button', { name: 'Đóng chi tiết', exact: true }).tap();
  await nghi(800);
  await page.getByRole('button', { name: 'Tổng hợp y lệnh', exact: true }).tap();
  await page.getByRole('dialog', { name: 'Tổng hợp y lệnh' }).waitFor({ timeout: 4000 }).catch(() => loi.push('(d) không mở được Tổng hợp y lệnh'));
  await nghi(800);
  const d = await page.evaluate(DO);
  KQ.cacBuoc.d_tongHopSauBanPhim = d;
  await chup('d-tong-hop-y-lenh', 'd) Tổng hợp y lệnh sau khi bàn phím vừa đóng');
  doDay('d', d);
}
KQ.ketLuan = KQ.thatBai.length ? 'KHÔNG ĐẠT (' + KQ.thatBai.length + ' phép đo)' : 'ĐẠT';
writeFileSync(join(RA, tien + '.json'), JSON.stringify(KQ, null, 2));
console.log(`[${tien}] ${KQ.ketLuan}`);
for (const t of KQ.thatBai) console.log('  - ' + t);
for (const l of loi) console.log('  ! ' + l);
for (const [k, v] of Object.entries(KQ.cacBuoc)) console.log(`  ${k}: ` + JSON.stringify(v.lechDayMan !== undefined ? { lechDayMan: v.lechDayMan, hoTren: v.khoangHoTren, vvOffsetTop: v.vvOffsetTop, scrollY: v.scrollY, wrapTop: v.wrapTop, wrapCao: v.wrapCao, oDangGo: v.oDangGo } : v));
await browser.close();
server.close();
process.exit(NGHIEM && KQ.thatBai.length ? 1 : 0);
