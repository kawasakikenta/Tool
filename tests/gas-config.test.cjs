// CalendarToSheet.gs の設定シート（作成と読み取り）を、Apps Script の API をスタブにして node:vm で確かめる。
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

process.env.TZ = 'Asia/Tokyo';

function formatDate(date, tz, pattern) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(date).map(p => [p.type, p.value]));
  return pattern.replace('yyyy', parts.year).replace('MM', parts.month).replace('dd', parts.day).replace('HH', parts.hour).replace('mm', parts.minute);
}

// セルの値と背景色だけを持つシート。書式の設定（setFontWeight など）は受け流す。
class FakeSheet {
  constructor(name) { this.name = name; this.values = new Map(); this.backgrounds = new Map(); }
  key(r, c) { return `${r},${c}`; }
  getLastRow() { let last = 0; for (const [k, v] of this.values) if (v !== '') last = Math.max(last, Number(k.split(',')[0])); return last; }
  getMaxRows() { return 1000; }
  getMaxColumns() { return 26; }
  clear() { this.values.clear(); this.backgrounds.clear(); }
  setColumnWidth() {}
  getRange(row, col, rows = 1, cols = 1) {
    const sheet = this;
    const cells = (fn) => Array.from({length: rows}, (_, i) => Array.from({length: cols}, (_, j) => fn(row + i, col + j)));
    const range = {
      setValues(v) { v.forEach((line, i) => line.forEach((x, j) => sheet.values.set(sheet.key(row + i, col + j), x))); return chain; },
      setValue(x) { sheet.values.set(sheet.key(row, col), x); return chain; },
      getValues() { return cells((r, c) => sheet.values.get(sheet.key(r, c)) ?? ''); },
      getDisplayValue() { return String(sheet.values.get(sheet.key(row, col)) ?? ''); },
      getBackgrounds() { return cells((r, c) => sheet.backgrounds.get(sheet.key(r, c)) ?? '#ffffff'); },
      getFontColors() { return cells(() => '#000000'); },
      setBackground(color) { cells((r, c) => sheet.backgrounds.set(sheet.key(r, c), color)); return chain; },
    };
    const chain = new Proxy(range, {get: (target, prop) => prop in target ? target[prop] : () => chain});
    return chain;
  }
}

function load() {
  const sheets = new Map();
  const ss = {
    getSheetByName: name => sheets.get(name) ?? null,
    insertSheet: name => { const s = new FakeSheet(name); sheets.set(name, s); return s; },
    setActiveSheet() {},
  };
  const alerts = [];
  const ui = {Button: {OK: 'OK'}, ButtonSet: {OK: 'OK', OK_CANCEL: 'OK_CANCEL'}, alert: (...args) => { alerts.push(args); return 'OK'; }};
  const builder = new Proxy({}, {get: () => () => builder});
  const context = {
    console, Logger: {log() {}}, Utilities: {formatDate}, CalendarApp: {GuestStatus: {NO: 'NO'}},
    SpreadsheetApp: {getActiveSpreadsheet: () => ss, getUi: () => ui, newDataValidation: () => builder},
    Session: {}, PropertiesService: {}, LockService: {},
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'CalendarToSheet.gs'), 'utf8'), context, {filename: 'CalendarToSheet.gs'});
  return {context, ss, sheets, alerts};
}

test('CalendarToSheet: 作成した設定シートで「1シートにまとめる」を選べ、対象カレンダーは見出しの次の行から読む', () => {
  const {context, ss, sheets} = load();
  context.createCalendarConfigSheet();
  const sheet = sheets.get('カレンダー設定');
  const cell = (r, c) => sheet.values.get(`${r},${c}`);
  // 出力方法の行は見出しに上書きされない。
  assert.match(cell(11, 1), /^出力方法/);
  assert.equal(cell(11, 2), '日付ごとに分ける');
  assert.deepEqual([cell(12, 1), cell(12, 2)], ['名前', 'メールアドレス']);
  assert.deepEqual([cell(13, 1), cell(14, 1)], ['山田太郎', '佐藤花子']);
  let cfg = context.readCalendarConfig_(ss);
  assert.equal(cfg.error, undefined);
  assert.equal(cfg.splitByDay, true);
  assert.equal(cfg.legacyLayout, false);
  assert.deepEqual(cfg.users.map(u => [u.name, u.email, u.bgColor]), [['山田太郎', 'taro@example.com', '#d1eaff'], ['佐藤花子', 'hanako@example.com', '#ffe0b2']]);
  sheet.values.set('11,2', '1シートにまとめる');
  cfg = context.readCalendarConfig_(ss);
  assert.equal(cfg.splitByDay, false);
  assert.equal(cfg.users.length, 2);
});

test('CalendarToSheet: 以前の版で作った設定シート（11 行目が見出し）は 12 行目から読み、日付ごとに分ける', () => {
  const {context, ss, alerts} = load();
  const sheet = ss.insertSheet('カレンダー設定');
  const rows = [
    ['カレンダー取得 設定', ''], ['貼り付け先シート名', 'カレンダー出力'], ['貼り付け開始セル', 'A1'], ['向き（縦 / 横）', '縦'],
    ['期間開始日', '2026-11-24'], ['期間終了日', '2026-11-25'], ['開始時刻', '09:00'], ['終了時刻', '10:00'], ['時間刻み（分）', 30],
    ['終日予定を別枠で取得（する / しない）', 'しない'],
    ['名前', 'メールアドレス', '色（このセルの背景色を使用）'],
    ['山田太郎', 'taro@example.com', ''],
    ['佐藤花子', 'hanako@example.com', ''],
  ];
  rows.forEach((row, i) => row.forEach((v, j) => sheet.values.set(`${i + 1},${j + 1}`, v)));
  const cfg = context.readCalendarConfig_(ss);
  assert.equal(cfg.error, undefined);
  assert.equal(cfg.splitByDay, true);
  assert.equal(cfg.legacyLayout, true);
  assert.deepEqual(cfg.users.map(u => u.name), ['山田太郎', '佐藤花子']);
  // 取得して反映すると、完了ダイアログで作り直しを案内する。
  context.CalendarApp.getCalendarById = () => ({getEvents: () => []});
  context.extractCalendarToSheet();
  const done = alerts.at(-1);
  assert.equal(done[0], '完了');
  assert.match(done[1], /出力方法の行がありません/);
  assert.match(done[1], /・対象: 2名/);
});
