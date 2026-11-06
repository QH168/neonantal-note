import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TAGS, TAG_COLOR, laViecMoi, chuanHoaTags, batTatNhan, soSanhViec, sapViec, khuHienThi, boDemCham, themCham, chuanTenViec, khuDeChon, khuMacDinh, khiRoiOThemViec } from '../src/lib/viec.js';

test('TAGS và màu', () => {
  assert.deepEqual(TAGS, ['NV', 'BM', 'CK', 'HC', 'XN']);
  assert.deepEqual(TAG_COLOR, { NV: 1, BM: 2, CK: 3, HC: 4, XN: 5 });
});

test('laViecMoi: có mảng tags (kể cả rỗng) là việc mới', () => {
  assert.equal(laViecMoi({ tags: [] }), true);
  assert.equal(laViecMoi({ tags: ['NV'] }), true);
  assert.equal(laViecMoi({ urgency: 3 }), false);
  assert.equal(laViecMoi({ tags: 'NV' }), false);
  assert.equal(laViecMoi(null), false);
});

test('chuanHoaTags: lọc lạ, bỏ trùng, đúng thứ tự', () => {
  assert.deepEqual(chuanHoaTags(['XN', 'NV', 'XN', 'abc', 'CK']), ['NV', 'CK', 'XN']);
  assert.deepEqual(chuanHoaTags([]), []);
  assert.deepEqual(chuanHoaTags(undefined), []);
});

test('batTatNhan: bật, tắt, không đổi mảng gốc', () => {
  const g = ['NV', 'HC'];
  assert.deepEqual(batTatNhan(g, 'BM'), ['NV', 'BM', 'HC']);
  assert.deepEqual(batTatNhan(g, 'NV'), ['HC']);
  assert.deepEqual(g, ['NV', 'HC']);
  assert.deepEqual(batTatNhan([], 'XN'), ['XN']);
  assert.deepEqual(batTatNhan(['XN'], 'zzz'), ['XN']);
});

test('sapViec: chưa xong trước, rồi createdAt, rồi id; ổn định, không đổi gốc', () => {
  const l = [
    { id: 'd', done: true, createdAt: 1 },
    { id: 'b', createdAt: 5, urgency: 1 },
    { id: 'a', createdAt: 5, tags: ['NV'] },
    { id: 'c', createdAt: 2, urgency: 5 }
  ];
  const copy = JSON.stringify(l);
  assert.deepEqual(sapViec(l).map((t) => t.id), ['c', 'a', 'b', 'd']);
  assert.deepEqual(sapViec([...l].reverse()).map((t) => t.id), ['c', 'a', 'b', 'd']);
  assert.equal(JSON.stringify(l), copy);
  assert.ok(soSanhViec({ id: 'x', done: false }, { id: 'y', done: true }) < 0);
});

test('khuHienThi: khu cũ chỉ hiện khi còn việc chưa xoá', () => {
  const Z = ['NICU', 'CT'], L = ['BM'];
  assert.deepEqual(khuHienThi([], Z, L), ['NICU', 'CT']);
  assert.deepEqual(khuHienThi([{ zone: 'BM', deleted: true }], Z, L), ['NICU', 'CT']);
  assert.deepEqual(khuHienThi([{ zone: 'BM', done: true }], Z, L), ['NICU', 'CT', 'BM']);
  assert.deepEqual(khuHienThi([{ zone: 'CT' }], Z, L), ['NICU', 'CT']);
});

test('boDemCham: n lần chạm trong 1 giây', () => {
  assert.equal(boDemCham([100], 2), false);
  assert.equal(boDemCham([100, 900], 2), true);
  assert.equal(boDemCham([100, 1100], 2), true); // đúng 1000ms vẫn tính
  assert.equal(boDemCham([100, 1101], 2), false);
  assert.equal(boDemCham([0, 400, 800], 3), true);
  assert.equal(boDemCham([0, 400], 3), false);
  assert.equal(boDemCham([0, 900, 1500], 3), false);
  assert.equal(boDemCham([], 2), false);
});

test('themCham: bỏ mốc cũ, chạm chậm không cộng dồn', () => {
  let m = [];
  m = themCham(m, 0); m = themCham(m, 400);
  assert.equal(boDemCham(m, 2), true);
  assert.equal(boDemCham(m, 3), false);
  m = themCham(m, 800);
  assert.equal(boDemCham(m, 3), true);
  m = themCham([], 0); m = themCham(m, 2000);
  assert.deepEqual(m, [2000]);
  assert.equal(boDemCham(m, 2), false);
});

test('chuanTenViec: bỏ khoảng trắng 2 đầu, rỗng thì ra chuỗi rỗng', () => {
  assert.equal(chuanTenViec('  Siêu âm tim  '), 'Siêu âm tim');
  assert.equal(chuanTenViec('   '), '');
  assert.equal(chuanTenViec(undefined), '');
  assert.equal(chuanTenViec(null), '');
});

test('khuDeChon: giữ khu cũ (BM) để ô chọn khu không làm mất khu hiện tại', () => {
  const Z = ['NICU', 'CT'];
  assert.deepEqual(khuDeChon(Z, 'CT'), ['NICU', 'CT']);
  assert.deepEqual(khuDeChon(Z, 'BM'), ['NICU', 'CT', 'BM']);
  assert.deepEqual(khuDeChon(Z, undefined), ['NICU', 'CT']);
  assert.notEqual(khuDeChon(Z, 'CT'), Z); // trả mảng mới
});


// ---- Cử chỉ vuốt (src/lib/vuot.js) ----
import { NGUONG_NGANG, huongCuChi, duocVuot, doDich, quaMoc, nenHien, ketQuaKhiTha } from '../src/lib/vuot.js';

test('vuot: huongCuChi ngang / dọc / chưa rõ / chéo', () => {
  assert.equal(NGUONG_NGANG, 8);
  assert.equal(huongCuChi(8, 0), 'ngang');
  assert.equal(huongCuChi(-8, 3), 'ngang');
  assert.equal(huongCuChi(7, 0), 'chua');
  assert.equal(huongCuChi(0, 40), 'doc');          // cuộn dọc không tính vuốt
  assert.equal(huongCuChi(10, 30), 'doc');
  assert.equal(huongCuChi(0, 7), 'chua');
  assert.equal(huongCuChi(20, 20), 'ngang');       // chéo 45°: như SwipeRow cũ
  assert.equal(huongCuChi(20, 21), 'doc');
  assert.equal(huongCuChi(NaN, undefined), 'chua');
});

test('vuot: biên mốc 1/3 cả hai hướng (đúng mốc là qua)', () => {
  assert.equal(quaMoc(100, 300), true);
  assert.equal(quaMoc(-100, 300), true);
  assert.equal(quaMoc(99.9, 300), false);
  assert.equal(quaMoc(-99.9, 300), false);
  assert.equal(ketQuaKhiTha(100, 300), 'xong');
  assert.equal(ketQuaKhiTha(-100, 300), 'xoa');
  assert.equal(quaMoc(100, 300.0000001), false);
  assert.equal(quaMoc(1, 3), true);                // 1/3 không dính sai số số thực
  assert.equal(quaMoc(33, 99), true);
});

test('vuot: thả trước mốc thì về', () => {
  assert.equal(ketQuaKhiTha(99, 300), 've');
  assert.equal(ketQuaKhiTha(-99, 300), 've');
  assert.equal(ketQuaKhiTha(0, 300), 've');
});

test('vuot: vuốt dọc/chéo nhẹ chưa tới mốc không ra kết quả', () => {
  // cuộn dọc: dx nhỏ, nên không bao giờ nhận là vuốt
  assert.equal(huongCuChi(5, 120), 'doc');
  assert.equal(ketQuaKhiTha(5, 300), 've');
  // chéo: dx tới mốc nhưng dy lớn hơn thì là cuộn dọc
  assert.equal(huongCuChi(100, 150), 'doc');
});

test('vuot: việc đã xong vuốt phải chỉ nhúc nhích, luôn về', () => {
  const o = { daXong: true };
  assert.equal(ketQuaKhiTha(250, 300, o), 've');
  assert.equal(ketQuaKhiTha(300, 300, o), 've');
  assert.equal(quaMoc(250, 300, o), false);
  assert.equal(nenHien(250, o), null);
  assert.ok(doDich(250, 300, o) > 0 && doDich(250, 300, o) <= 16);
  assert.ok(doDich(10, 300, o) < 10);              // có lực cản
  assert.equal(doDich(1000, 300, o), 16);
});

test('vuot: vuốt trái trên việc đã xong vẫn xoá được', () => {
  const o = { daXong: true };
  assert.equal(ketQuaKhiTha(-100, 300, o), 'xoa');
  assert.equal(ketQuaKhiTha(-99, 300, o), 've');
  assert.equal(doDich(-80, 300, o), -80);
  assert.equal(nenHien(-80, o), 'xoa');
});

test('vuot: duocPhai=false (thư viện viết tắt) chỉ vuốt trái', () => {
  const o = { duocPhai: false };
  assert.equal(duocVuot(50, o), false);
  assert.equal(duocVuot(-50, o), true);
  assert.equal(ketQuaKhiTha(200, 300, o), 've');
  assert.equal(doDich(200, 300, o), 0);
  assert.equal(nenHien(200, o), null);
  assert.equal(ketQuaKhiTha(-200, 300, o), 'xoa');
  assert.equal(nenHien(100, {}), 'xong');
});

test('vuot: độ dịch bám ngón tay và giới hạn trong chiều rộng', () => {
  assert.equal(doDich(50, 300), 50);
  assert.equal(doDich(-50, 300), -50);
  assert.equal(doDich(500, 300), 300);
  assert.equal(doDich(-500, 300), -300);
});

test('vuot: chiều rộng 0 hoặc không hợp lệ không lỗi, luôn về', () => {
  for (const r of [0, -5, NaN, undefined, null, Infinity]) {
    assert.equal(ketQuaKhiTha(100, r), 've');
    assert.equal(ketQuaKhiTha(-100, r), 've');
    assert.equal(quaMoc(100, r), false);
    assert.equal(doDich(100, r), 0);
  }
  assert.equal(ketQuaKhiTha(NaN, 300), 've');
  assert.equal(doDich(NaN, 300), 0);
});

test('vuot: luật sắp xếp không đổi (chưa xong trước, rồi theo thứ tự thêm)', () => {
  const a = { id: 1, done: true, createdAt: 1 };
  const b = { id: 2, done: false, createdAt: 2 };
  const c = { id: 3, done: false, createdAt: 3 };
  assert.deepEqual(sapViec([a, b, c]).map((x) => x.id), [2, 3, 1]);
});
import { gioXong } from '../src/lib/viec.js';

test('gioXong: "hh:mm" theo giờ máy; việc cũ chưa có doneAt thì rỗng (chỉ ghi "Đã xong")', () => {
  assert.equal(gioXong(new Date(2026, 9, 21, 9, 42).getTime()), '09:42');
  assert.equal(gioXong(new Date(2026, 9, 21, 0, 5).getTime()), '00:05');
  assert.equal(gioXong(new Date(2026, 9, 21, 23, 59).getTime()), '23:59');
  for (const v of [undefined, null, 0, NaN, 'x', -5]) assert.equal(gioXong(v), '');
});

test('khuMacDinh: chip là một khu thì lấy khu đó; Tất cả hoặc khu cũ thì về khu đầu', () => {
  const Z = ['NICU', 'CT', 'KAN', 'HP'];
  assert.equal(khuMacDinh('KAN', Z), 'KAN');
  assert.equal(khuMacDinh('all', Z), 'NICU');
  assert.equal(khuMacDinh('BM', Z), 'NICU'); // khu cũ không có ở chip thêm mới
});

test('khiRoiOThemViec: ô còn chữ thì vẫn bung và giữ khu, nhãn', () => {
  const Z = ['NICU', 'CT', 'KAN'];
  const r = khiRoiOThemViec({ chu: 'Siêu âm tim', khuLoc: 'all', khuHienTai: 'KAN', nhanHienTai: ['NV', 'XN'] }, Z);
  assert.deepEqual(r, { thuLai: false, khu: 'KAN', nhan: ['NV', 'XN'] });
});

test('khiRoiOThemViec: ô trống thì thu lại, nhãn về trống, khu về theo chip đang lọc', () => {
  const Z = ['NICU', 'CT', 'KAN'];
  assert.deepEqual(khiRoiOThemViec({ chu: '', khuLoc: 'CT', khuHienTai: 'KAN', nhanHienTai: ['HC'] }, Z), { thuLai: true, khu: 'CT', nhan: [] });
  assert.deepEqual(khiRoiOThemViec({ chu: '', khuLoc: 'all', khuHienTai: 'KAN', nhanHienTai: ['HC'] }, Z), { thuLai: true, khu: 'NICU', nhan: [] });
  assert.deepEqual(khiRoiOThemViec({ chu: '', khuLoc: 'BM', khuHienTai: 'KAN', nhanHienTai: [] }, Z), { thuLai: true, khu: 'NICU', nhan: [] });
});

test('khiRoiOThemViec: chỉ có khoảng trắng tính là trống; không đổi mảng nhãn gốc', () => {
  const Z = ['NICU', 'CT'];
  const nhan = ['BM'];
  const r = khiRoiOThemViec({ chu: '   ', khuLoc: 'CT', khuHienTai: 'NICU', nhanHienTai: nhan }, Z);
  assert.equal(r.thuLai, true);
  assert.deepEqual(nhan, ['BM']);
  assert.notEqual(r.nhan, nhan);
});
// ---- Cử chỉ vuốt: duocTrai (dòng bé ở tab Khám chỉ vuốt phải) ----
test('vuot: duocTrai=false, vuốt trái vô hiệu ở mọi hàm', () => {
  const o = { duocTrai: false };
  assert.equal(duocVuot(-50, o), false);
  assert.equal(doDich(-50, 300, o), 0);
  assert.equal(quaMoc(-200, 300, o), false);
  assert.equal(nenHien(-50, o), null);
  assert.equal(ketQuaKhiTha(-200, 300, o), 've');
  assert.equal(ketQuaKhiTha(-300, 300, o), 've');
});

test('vuot: duocTrai=false, vuốt phải vẫn như thường', () => {
  const o = { duocTrai: false };
  assert.equal(duocVuot(50, o), true);
  assert.equal(doDich(50, 300, o), 50);
  assert.equal(quaMoc(100, 300, o), true);
  assert.equal(quaMoc(99, 300, o), false);
  assert.equal(nenHien(50, o), 'xong');
  assert.equal(ketQuaKhiTha(100, 300, o), 'xong');
  assert.equal(ketQuaKhiTha(99, 300, o), 've');
});

test('vuot: duocTrai=false + daXong, vuốt phải chỉ nhúc nhích, luôn về', () => {
  const o = { duocTrai: false, daXong: true };
  assert.equal(doDich(40, 300, o), 10);
  assert.equal(doDich(400, 300, o), 16);
  assert.equal(quaMoc(250, 300, o), false);
  assert.equal(nenHien(40, o), null);
  assert.equal(ketQuaKhiTha(250, 300, o), 've');
  assert.equal(ketQuaKhiTha(-250, 300, o), 've');
  assert.equal(doDich(-250, 300, o), 0);
  assert.equal(duocVuot(-1, o), false);
});

test('vuot: không truyền duocTrai thì vuốt trái như cũ', () => {
  assert.equal(duocVuot(-50), true);
  assert.equal(doDich(-50, 300), -50);
  assert.equal(doDich(-500, 300), -300);
  assert.equal(quaMoc(-100, 300), true);
  assert.equal(nenHien(-50), 'xoa');
  assert.equal(ketQuaKhiTha(-100, 300), 'xoa');
  assert.equal(ketQuaKhiTha(-100, 300, { daXong: true }), 'xoa');
  assert.equal(ketQuaKhiTha(-100, 300, { duocTrai: true }), 'xoa');
  assert.equal(duocVuot(-50, { duocPhai: false }), true);
});