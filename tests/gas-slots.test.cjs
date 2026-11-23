// CalendarToSheet.gs と Shift.gs の時間枠の割り当てを、Apps Script の API をスタブにして node:vm で確かめる。
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

process.env.TZ = 'Asia/Tokyo';

// Utilities.formatDate の代わり（'JST' の yyyy・MM・dd・HH・mm だけ）。
function formatDate(date, tz, pattern) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'}).formatToParts(date).map(p => [p.type, p.value]));
  return pattern.replace('yyyy', parts.year).replace('MM', parts.month).replace('dd', parts.day).replace('HH', parts.hour).replace('mm', parts.minute);
}
function load(file) {
  const context = {console, Logger: {log() {}}, Utilities: {formatDate}, CalendarApp: {GuestStatus: {NO: 'NO'}}, SpreadsheetApp: {}, Session: {}, PropertiesService: {}, LockService: {}};
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context, {filename: file});
  return context;
}
const calendar = load('CalendarToSheet.gs');
const shift = load('Shift.gs');
const at = (day, time) => new Date(`${day}T${time}:00+09:00`);
const event = (title, start, end, day = '2026-11-24', endDay = day) => ({getTitle: () => title, isAllDayEvent: () => false, getStartTime: () => at(day, start), getEndTime: () => at(endDay, end)});
const target = new Date('2026-11-24T00:00:00+09:00');

test('CalendarToSheet: 刻みの境目からずれた予定も、かかる枠すべてに入る', () => {
  const slots = calendar.generateTimeSlots_('09:00', '11:00', 30);
  const row = events => [...calendar.buildSlotData_(events, slots, target, false, 30).slots];
  assert.deepEqual(row([event('短い打合せ', '09:05', '09:20')]), ['短い打合せ', '', '', '']);
  assert.deepEqual(row([event('ずれた会議', '09:10', '10:10')]), ['ずれた会議', 'ずれた会議', 'ずれた会議', '']);
  assert.deepEqual(row([event('境目どおり', '09:30', '10:30')]), ['', '境目どおり', '境目どおり', '']);
  // 最後の枠（10:30〜11:00）にかかる予定と、表示時間帯の外の予定
  assert.deepEqual(row([event('夕方前', '10:50', '11:40'), event('表示の外', '11:00', '12:00'), event('朝', '08:00', '09:01')]), ['朝', '', '', '夕方前']);
  // 先に入った予定が優先（これまでどおり）
  assert.deepEqual(row([event('A', '09:00', '09:40'), event('B', '09:20', '10:00')]), ['A', 'A', '', '']);
});

test('CalendarToSheet: 日をまたぐ予定は当日の部分だけ入る', () => {
  const slots = calendar.generateTimeSlots_('09:00', '11:00', 30);
  const row = events => [...calendar.buildSlotData_(events, slots, target, false, 30).slots];
  assert.deepEqual(row([event('前日から', '22:00', '09:45', '2026-11-23', '2026-11-24')]), ['前日から', '前日から', '', '']);
  assert.deepEqual(row([event('翌日まで', '10:15', '02:00', '2026-11-24', '2026-11-25')]), ['', '', '翌日まで', '翌日まで']);
  assert.deepEqual(row([event('夜間', '22:00', '02:00', '2026-11-24', '2026-11-25')]), ['', '', '', '']);
});

test('CalendarToSheet: 刻みを渡さなければ枠の間隔から求める', () => {
  const slots = calendar.generateTimeSlots_('09:00', '10:00', 30);
  assert.deepEqual([...calendar.buildSlotData_([event('X', '09:40', '09:50')], slots, target, false).slots], ['', 'X']);
});

test('Shift: 15 分刻みの境目からずれた予定も、かかる枠すべてに入る', () => {
  const slots = shift.generateTimeSlots('09:00', '10:00');
  assert.deepEqual([...slots], ['09:00', '09:15', '09:30', '09:45']);
  const range = (start, end, day = '2026-11-24', endDay = day) => ({...shift.shift_eventSlotRange_(at(day, start), at(endDay, end), target, slots)});
  assert.deepEqual(range('09:05', '09:20'), {from: 0, to: 2});
  assert.deepEqual(range('09:15', '09:30'), {from: 1, to: 2});
  assert.deepEqual(range('09:50', '11:00'), {from: 3, to: 4});
  assert.deepEqual(range('10:00', '11:00'), {from: 0, to: 0});
  assert.deepEqual(range('22:00', '09:10', '2026-11-23', '2026-11-24'), {from: 0, to: 1});
});
