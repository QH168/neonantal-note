// Chạy bộ ca chuẩn lâm sàng do bác sĩ ghi trong doi-agent/ca-chuan-lam-sang.md.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { calcAge } from '../src/lib/clinical.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const md = readFileSync(join(ROOT, 'doi-agent/ca-chuan-lam-sang.md'), 'utf8');

const rows = md.split('\n')
  .filter((l) => /^\|\s*\d{1,2}\/\d{1,2}\/\d{4}\s*\|/.test(l))
  .map((l) => l.split('|').slice(1, -1).map((c) => c.trim()));

test('bảng ca chuẩn có ít nhất 6 ca', () => {
  assert.ok(rows.length >= 6, 'đọc được ' + rows.length + ' ca');
});

for (const [ngay, dob, ga, ngayTuoi, pma, ghiChu] of rows) {
  test(`ca chuẩn: tính ngày ${ngay}, sinh ${dob}, tuổi thai ${ga} (${ghiChu || ''})`, () => {
    const [d, m, y] = ngay.split('/').map(Number);
    const r = calcAge({ dob, ga }, new Date(y, m - 1, d, 9, 0));
    if (/^LỖI$/i.test(ngayTuoi) || /^LỖI$/i.test(pma)) {
      assert.ok(r.err, 'mong đợi app báo lỗi nhưng app tính ra ' + JSON.stringify(r));
      return;
    }
    assert.equal(r.err, undefined, 'app báo lỗi: ' + r.err);
    assert.equal(r.days, `${ngayTuoi} ngày`, 'ngày tuổi');
    assert.equal(r.pma, pma, 'tuổi thai hiệu chỉnh');
  });
}
