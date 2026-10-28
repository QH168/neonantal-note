// Kiểm bản đồ dự án (doi-agent/BAN_DO.md) còn khớp với mã thật — chống "hồ sơ cũ".
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const banDo = readFileSync(join(ROOT, 'doi-agent/BAN_DO.md'), 'utf8');
const duongDan = [...banDo.matchAll(/`([^`\s]+)`/g)].map((m) => m[1])
  .filter((p) => /^(src|tests|scripts|doi-agent)\/|^(index\.html|vite\.config\.js|package\.json)$/.test(p));

test('mọi file ghi trên bản đồ đều có thật', () => {
  const thieu = duongDan.filter((p) => !p.includes('*') && !p.includes('<') && !existsSync(join(ROOT, p)));
  assert.deepEqual(thieu, [], 'bản đồ ghi file không còn tồn tại: ' + thieu.join(', '));
});

test('mọi file trong src/ đều có tên trên bản đồ', () => {
  const src = readdirSync(join(ROOT, 'src'), { recursive: true })
    .map((f) => 'src/' + String(f).replaceAll('\\', '/'))
    .filter((f) => /\.(js|jsx|css)$/.test(f));
  const vang = src.filter((f) => !duongDan.includes(f));
  assert.deepEqual(vang, [], 'file chưa có trên bản đồ (agent Ghi chép cần bổ sung): ' + vang.join(', '));
});

test('mọi thẻ tính năng và file agent đều có thật', () => {
  for (const d of ['the-tinh-nang', 'agents']) {
    assert.ok(existsSync(join(ROOT, 'doi-agent', d)), d);
  }
  for (const a of ['dieu-phoi', 'thuat-toan', 'kiem-thu', 'giao-dien', 'du-lieu', 'ghi-chep']) {
    assert.ok(existsSync(join(ROOT, 'doi-agent/agents', a + '.md')), 'thiếu agent ' + a);
  }
});
