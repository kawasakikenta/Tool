// Shift.gs の使い方シート・案内文に書いたメニュー名が、onOpen で作る実際のメニュー項目と一致することを確かめる。
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'Shift.gs'), 'utf8');
const onOpen = source.slice(source.indexOf('function onOpen()'), source.indexOf('.addToUi();'));
const menuItems = new Set([...onOpen.matchAll(/\.addItem\('([^']+)'/g)].map(m => m[1]));

test('onOpen のメニュー項目を読める', () => {
  assert.ok(menuItems.has('① カレンダー予定を反映'));
  assert.ok(menuItems.size >= 20);
});

test('使い方シートの「■ メニュー」の項目名は、実際のメニュー項目にある', () => {
  const start = source.indexOf("{ type: 'h1', text: '■ メニュー' }");
  const end = source.indexOf("{ type: 'h1', text: '■ 推奨ワークフロー' }", start);
  assert.ok(start > 0 && end > start);
  const names = [...source.slice(start, end).matchAll(/\{ type: 'kv', k: '([^']+)'/g)].map(m => m[1]);
  assert.ok(names.length >= 10);
  assert.deepEqual(names.filter(n => !menuItems.has(n)), []);
});

test('案内文と推奨ワークフローで「メニュー」として示す名前は、実際のメニュー項目にある', () => {
  const quoted = new Set();
  // 「…」を実行 / メニュー「…」 の形で示した名前。
  for (const m of source.matchAll(/(?:メニュー)?「([^「」]+)」(?:を実行|で開始日|も実行)/g)) quoted.add(m[1]);
  for (const m of source.matchAll(/メニュー「([^「」]+)」/g)) quoted.add(m[1]);
  assert.ok(quoted.size >= 5, [...quoted].join(' / '));
  // 「サブメニュー → 項目」の形は項目名で確かめる。
  assert.deepEqual([...quoted].filter(n => !menuItems.has(n.split(' → ').pop())), []);
});
