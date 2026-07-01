/**
 * ============================================================================
 *  CalendarToSheet.gs
 *  Googleカレンダーの予定を取得して、スプレッドシートに反映する機能だけを
 *  Shift.gs から切り出した単独スクリプト。
 *
 *  対応している設定（すべて「カレンダー設定」シートで指定）:
 *    - 取得結果の貼り付け先（シート名・開始セル）
 *    - 出力の向き（縦向き / 横向き）
 *    - 取得期間（開始日〜終了日）
 *    - 取得時間帯（開始時刻・終了時刻・時間刻み）
 *    - 取得対象のカレンダー（名前・メールアドレス・色）
 *
 *  使い方:
 *    1) スプレッドシートに本ファイルを追加
 *    2) メニュー「カレンダー取得」→「① 設定シートを作成」を実行
 *    3) 「カレンダー設定」シートに貼り付け先・向き・期間・対象を入力
 *    4) メニュー「カレンダー取得」→「② 予定を取得して反映」を実行
 * ============================================================================
 */

/** 設定シート名 */
const CTS_CONFIG_SHEET = 'カレンダー設定';
/** 設定シートのユーザー一覧が始まる行（1始まり） */
const CTS_USER_START_ROW = 12;
/** 既定の予定セル背景色（設定で色未指定のユーザーに使う） */
const CTS_DEFAULT_BG = '#d1eaff';
const CTS_DEFAULT_FONT = '#000000';

/** ===================== メニュー ===================== */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('カレンダー取得')
    .addItem('① 設定シートを作成', 'createCalendarConfigSheet')
    .addSeparator()
    .addItem('② 予定を取得して反映', 'extractCalendarToSheet')
    .addToUi();
}

/** ===================== 設定シート作成 ===================== */

function createCalendarConfigSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  let sheet = ss.getSheetByName(CTS_CONFIG_SHEET);
  if (sheet) {
    const res = ui.alert(
      '確認',
      `既存の「${CTS_CONFIG_SHEET}」シートを初期化します。\n入力済みの内容は消えます。\n\n続行しますか？`,
      ui.ButtonSet.OK_CANCEL
    );
    if (res !== ui.Button.OK) return;
    sheet.clear();
    sheet.getRange(1, 1, sheet.getMaxRows(), sheet.getMaxColumns()).clearDataValidations();
  } else {
    sheet = ss.insertSheet(CTS_CONFIG_SHEET, 0);
  }

  // ---- 基本設定（キー・値の2列） ----
  const today = new Date();
  const todayStr = Utilities.formatDate(today, 'JST', 'yyyy-MM-dd');
  const weekLater = new Date(today.getTime());
  weekLater.setDate(today.getDate() + 6);
  const weekLaterStr = Utilities.formatDate(weekLater, 'JST', 'yyyy-MM-dd');

  const settings = [
    ['カレンダー取得 設定', ''],
    ['貼り付け先シート名', 'カレンダー出力'],
    ['貼り付け開始セル', 'A1'],
    ['向き（縦 / 横）', '縦'],
    ['期間開始日', todayStr],
    ['期間終了日', weekLaterStr],
    ['開始時刻', '09:00'],
    ['終了時刻', '18:00'],
    ['時間刻み（分）', 15],
  ];
  sheet.getRange(1, 1, settings.length, 2).setValues(settings);

  // タイトル行の装飾
  sheet.getRange(1, 1, 1, 2).merge()
    .setBackground('#1c4587').setFontColor('#ffffff')
    .setFontWeight('bold').setFontSize(13)
    .setHorizontalAlignment('center');

  // キー列の装飾
  sheet.getRange(2, 1, settings.length - 1, 1)
    .setBackground('#eeeeee').setFontWeight('bold');

  // 向きはプルダウンに
  sheet.getRange(4, 2).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['縦', '横'], true).build()
  );

  // 補足メモ
  sheet.getRange(2, 3).setValue('例: カレンダー出力').setFontColor('#999999');
  sheet.getRange(3, 3).setValue('例: A1 / C3 など').setFontColor('#999999');
  sheet.getRange(4, 3).setValue('縦=時刻を行方向 / 横=時刻を列方向').setFontColor('#999999');
  sheet.getRange(5, 3).setValue('yyyy-MM-dd 形式').setFontColor('#999999');
  sheet.getRange(6, 3).setValue('yyyy-MM-dd 形式（開始日以降）').setFontColor('#999999');
  sheet.getRange(9, 3).setValue('例: 15 / 30 / 60').setFontColor('#999999');

  // ---- ユーザー（対象カレンダー）一覧 ----
  const headerRow = CTS_USER_START_ROW - 1;
  sheet.getRange(headerRow, 1, 1, 3)
    .setValues([['名前', 'メールアドレス', '色（このセルの背景色を使用）']])
    .setBackground('#444444').setFontColor('#ffffff').setFontWeight('bold');

  // サンプル行
  const sample = [
    ['山田太郎', 'taro@example.com', ''],
    ['佐藤花子', 'hanako@example.com', ''],
  ];
  sheet.getRange(CTS_USER_START_ROW, 1, sample.length, 3).setValues(sample);
  sheet.getRange(CTS_USER_START_ROW, 3).setBackground('#d1eaff');
  sheet.getRange(CTS_USER_START_ROW + 1, 3).setBackground('#ffe0b2');

  sheet.getRange(headerRow, 1, 1, 3).setNote(
    '取得したいカレンダーを1行に1つずつ入力します。\n' +
    '・名前: 出力の見出しに使う表示名\n' +
    '・メールアドレス: 予定を取得するGoogleカレンダーのメール\n' +
    '・色: C列のセル背景色が、その人の予定セルの色になります'
  );

  sheet.setColumnWidth(1, 140);
  sheet.setColumnWidth(2, 240);
  sheet.setColumnWidth(3, 220);

  ss.setActiveSheet(sheet);
  ui.alert(
    '設定シートを作成しました',
    `「${CTS_CONFIG_SHEET}」シートに、貼り付け先・向き・期間・対象カレンダーを入力してから、\n` +
    'メニュー「カレンダー取得」→「② 予定を取得して反映」を実行してください。',
    ui.ButtonSet.OK
  );
}

/** ===================== メイン処理 ===================== */

function extractCalendarToSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const cfg = readCalendarConfig_(ss);
  if (cfg.error) {
    ui.alert('設定エラー', cfg.error, ui.ButtonSet.OK);
    return;
  }

  const timeSlots = generateTimeSlots_(cfg.startTime, cfg.endTime, cfg.stepMinutes);
  if (timeSlots.length === 0) {
    ui.alert('設定エラー', '開始時刻・終了時刻・時間刻みを確認してください（時間帯が空です）。', ui.ButtonSet.OK);
    return;
  }

  // 貼り付け先シートを用意
  let outSheet = ss.getSheetByName(cfg.destSheetName);
  if (!outSheet) outSheet = ss.insertSheet(cfg.destSheetName);

  // 各日 × 各ユーザーの予定を取得
  const days = eachDate_(cfg.startDate, cfg.endDate);
  const dayData = days.map(date => ({
    date: date,
    userSlots: cfg.users.map(u => buildSlotData_(fetchEvents_(u.email, date), timeSlots, date)),
  }));

  // 出力
  const written = cfg.orientation === '横'
    ? writeHorizontal_(outSheet, cfg, timeSlots, dayData)
    : writeVertical_(outSheet, cfg, timeSlots, dayData);

  ss.setActiveSheet(outSheet);
  ui.alert(
    '完了',
    `カレンダーの予定を反映しました。\n` +
    `・貼り付け先: ${cfg.destSheetName} / ${cfg.destCellA1}\n` +
    `・向き: ${cfg.orientation}向き\n` +
    `・期間: ${fmtDate_(cfg.startDate)} 〜 ${fmtDate_(cfg.endDate)}（${days.length}日）\n` +
    `・対象: ${cfg.users.length}名\n` +
    `・出力範囲: ${written.rows}行 × ${written.cols}列`,
    ui.ButtonSet.OK
  );
}

/** ===================== 設定読み込み ===================== */

function readCalendarConfig_(ss) {
  const sheet = ss.getSheetByName(CTS_CONFIG_SHEET);
  if (!sheet) {
    return { error: `「${CTS_CONFIG_SHEET}」シートがありません。先に「① 設定シートを作成」を実行してください。` };
  }

  const get = (row) => sheet.getRange(row, 2).getDisplayValue().trim();

  const destSheetName = get(2);
  const destCellA1 = (get(3) || 'A1').toUpperCase();
  const orientationRaw = get(4) || '縦';
  const startDate = parseDateCell_(get(5));
  const endDate = parseDateCell_(get(6));
  const startTime = parseTimeStr_(get(7)) || '09:00';
  const endTime = parseTimeStr_(get(8)) || '18:00';
  const stepMinutes = parseInt(get(9), 10) || 15;

  if (!destSheetName) return { error: '「貼り付け先シート名」を入力してください。' };
  const cell = parseA1_(destCellA1);
  if (!cell) return { error: `「貼り付け開始セル」が不正です: ${destCellA1}（例: A1）` };
  if (!startDate) return { error: '「期間開始日」を yyyy-MM-dd 形式で入力してください。' };
  if (!endDate) return { error: '「期間終了日」を yyyy-MM-dd 形式で入力してください。' };
  if (endDate.getTime() < startDate.getTime()) {
    return { error: '「期間終了日」は「期間開始日」以降にしてください。' };
  }
  const orientation = /横|よこ|horizontal/i.test(orientationRaw) ? '横' : '縦';

  // ユーザー一覧
  const users = readCalendarUsers_(sheet);
  if (users.length === 0) {
    return { error: `取得対象のカレンダーが未登録です（${CTS_USER_START_ROW}行目以降に名前とメールを入力）。` };
  }

  return {
    destSheetName, destCellA1,
    destRow: cell.row, destCol: cell.col,
    orientation, startDate, endDate,
    startTime, endTime, stepMinutes,
    users,
  };
}

function readCalendarUsers_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < CTS_USER_START_ROW) return [];
  const n = lastRow - CTS_USER_START_ROW + 1;
  const range = sheet.getRange(CTS_USER_START_ROW, 1, n, 3);
  const values = range.getValues();
  const bgs = range.getBackgrounds();
  const fonts = range.getFontColors();

  return values.map((row, i) => {
    const bg = bgs[i][2];
    return {
      name: String(row[0] || '').trim(),
      email: String(row[1] || '').trim(),
      bgColor: (bg && bg !== '#ffffff') ? bg : CTS_DEFAULT_BG,
      fontColor: fonts[i][2] || CTS_DEFAULT_FONT,
    };
  }).filter(u => u.name && u.email && /@/.test(u.email));
}

/** ===================== カレンダー取得 ===================== */

/** 指定日(その日の00:00〜23:59)の予定を取得。参加拒否した予定は除外。 */
function fetchEvents_(email, date) {
  try {
    const calendar = CalendarApp.getCalendarById(email);
    if (!calendar) return [];
    const start = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
    const end = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
    return calendar.getEvents(start, end).filter(ev => {
      try {
        return ev.getMyStatus() !== CalendarApp.GuestStatus.NO;
      } catch (e) {
        return true;
      }
    });
  } catch (e) {
    return [];
  }
}

/** 予定配列を時間スロット配列（各スロットの予定タイトル or ''）に変換 */
function buildSlotData_(events, timeSlots, date) {
  // 終日予定は後ろにして、時間指定の予定を優先的に埋める
  const sorted = events.slice().sort((a, b) => {
    const aAll = isAllDayEventSafe_(a);
    const bAll = isAllDayEventSafe_(b);
    if (aAll === bAll) return 0;
    return aAll ? 1 : -1;
  });

  const slotData = new Array(timeSlots.length).fill('');

  sorted.forEach(event => {
    let title;
    try { title = event.getTitle(); } catch (e) { title = '(予定)'; }
    if (!title) title = '(予定)';

    if (isAllDayEventSafe_(event)) {
      for (let i = 0; i < timeSlots.length; i++) {
        if (!slotData[i]) slotData[i] = title;
      }
      return;
    }

    let startStr, endStr;
    try {
      startStr = Utilities.formatDate(event.getStartTime(), 'JST', 'HH:mm');
      endStr = Utilities.formatDate(event.getEndTime(), 'JST', 'HH:mm');
    } catch (e) {
      return;
    }

    let startIdx = timeSlots.findIndex(t => t >= startStr);
    let endIdx = timeSlots.findIndex(t => t >= endStr);
    if (startIdx === -1) return;              // 表示時間帯より後の予定
    if (endIdx === -1) endIdx = timeSlots.length; // 表示時間帯の終わりまで続く

    for (let i = startIdx; i < endIdx; i++) {
      if (!slotData[i]) slotData[i] = title;
    }
  });

  return slotData;
}

/** ===================== 出力（縦向き） =====================
 *  時刻を行方向、ユーザーを列方向に配置。複数日は縦に積む。
 *  1日ブロック:
 *    [日付 タイトル行]
 *    [時刻 | User1 | User2 | ...]  ← 見出し
 *    [09:00 | 予定 | ...]          ← スロット
 */
function writeVertical_(sheet, cfg, timeSlots, dayData) {
  const users = cfg.users;
  const totalCols = 1 + users.length;
  let curRow = cfg.destRow;
  const baseCol = cfg.destCol;

  clearOutputArea_(sheet, cfg, timeSlots, dayData);

  dayData.forEach((day, dayIdx) => {
    if (dayIdx > 0) curRow += 1; // 日ごとに1行あける

    // 日付タイトル行
    sheet.getRange(curRow, baseCol, 1, totalCols).merge()
      .setValue(dateTitle_(day.date))
      .setBackground('#1c4587').setFontColor('#ffffff')
      .setFontWeight('bold').setHorizontalAlignment('center');
    curRow++;

    // 見出し行
    const header = ['時刻'].concat(users.map(u => u.name));
    sheet.getRange(curRow, baseCol, 1, totalCols).setValues([header])
      .setFontWeight('bold').setHorizontalAlignment('center');
    sheet.getRange(curRow, baseCol).setBackground('#444444').setFontColor('#ffffff');
    users.forEach((u, i) => {
      sheet.getRange(curRow, baseCol + 1 + i).setBackground(u.bgColor).setFontColor(u.fontColor);
    });
    const headerRow = curRow;
    curRow++;

    // 本体（時刻列 + 予定）
    const body = timeSlots.map((t, r) => {
      const line = [t];
      users.forEach((u, c) => line.push(day.userSlots[c][r]));
      return line;
    });
    sheet.getRange(curRow, baseCol, timeSlots.length, totalCols).setValues(body);
    sheet.getRange(curRow, baseCol, timeSlots.length, 1).setBackground('#f3f3f3'); // 時刻列

    // 予定セルの色付け＆縦方向の連結
    users.forEach((u, c) => {
      const col = baseCol + 1 + c;
      mergeAndColorRuns_(sheet, day.userSlots[c], u, /*vertical=*/true, curRow, col);
    });

    curRow += timeSlots.length;

    // ブロック全体の体裁
    const blockRows = curRow - headerRow + 1;
    const block = sheet.getRange(headerRow - 1, baseCol, blockRows, totalCols);
    block.setVerticalAlignment('middle').setHorizontalAlignment('center').setWrap(true);
  });

  for (let c = 0; c < totalCols; c++) sheet.setColumnWidth(baseCol + c, 120);
  return { rows: curRow - cfg.destRow, cols: totalCols };
}

/** ===================== 出力（横向き） =====================
 *  時刻を列方向、ユーザーを行方向に配置。複数日は縦に積む。
 *  1日ブロック:
 *    [日付 タイトル行]
 *    [氏名＼時刻 | 09:00 | 09:15 | ...]  ← 見出し
 *    [User1 | 予定 | ...]                ← ユーザー行
 */
function writeHorizontal_(sheet, cfg, timeSlots, dayData) {
  const users = cfg.users;
  const totalCols = 1 + timeSlots.length;
  let curRow = cfg.destRow;
  const baseCol = cfg.destCol;

  clearOutputArea_(sheet, cfg, timeSlots, dayData);

  dayData.forEach((day, dayIdx) => {
    if (dayIdx > 0) curRow += 1;

    // 日付タイトル行
    sheet.getRange(curRow, baseCol, 1, totalCols).merge()
      .setValue(dateTitle_(day.date))
      .setBackground('#1c4587').setFontColor('#ffffff')
      .setFontWeight('bold').setHorizontalAlignment('center');
    curRow++;

    // 見出し行（時刻を横に並べる）
    const header = ['氏名＼時刻'].concat(timeSlots);
    sheet.getRange(curRow, baseCol, 1, totalCols).setValues([header])
      .setFontWeight('bold').setHorizontalAlignment('center')
      .setBackground('#444444').setFontColor('#ffffff');
    const headerRow = curRow;
    curRow++;

    // ユーザーごとに1行
    users.forEach((u, uIdx) => {
      const line = [u.name].concat(day.userSlots[uIdx]);
      sheet.getRange(curRow, baseCol, 1, totalCols).setValues([line]);
      // 氏名セル
      sheet.getRange(curRow, baseCol).setBackground(u.bgColor).setFontColor(u.fontColor).setFontWeight('bold');
      // 予定セルの色付け＆横方向の連結
      mergeAndColorRuns_(sheet, day.userSlots[uIdx], u, /*vertical=*/false, curRow, baseCol + 1);
      curRow++;
    });

    const blockRows = curRow - headerRow;
    const block = sheet.getRange(headerRow, baseCol, blockRows, totalCols);
    block.setVerticalAlignment('middle').setHorizontalAlignment('center').setWrap(true);
  });

  sheet.setColumnWidth(baseCol, 120);
  for (let c = 1; c < totalCols; c++) sheet.setColumnWidth(baseCol + c, 70);
  return { rows: curRow - cfg.destRow, cols: totalCols };
}

/**
 * 連続する同じ予定タイトルのセルをまとめて背景色を付け、連結する。
 * slotData: スロットごとのタイトル配列
 * vertical=true なら (startRow..) 方向、false なら (startCol..) 方向に並ぶ。
 */
function mergeAndColorRuns_(sheet, slotData, user, vertical, startRow, startCol) {
  let i = 0;
  while (i < slotData.length) {
    if (!slotData[i]) { i++; continue; }
    let j = i + 1;
    while (j < slotData.length && slotData[j] === slotData[i]) j++;
    const runLen = j - i;

    const range = vertical
      ? sheet.getRange(startRow + i, startCol, runLen, 1)
      : sheet.getRange(startRow, startCol + i, 1, runLen);

    range.setBackground(user.bgColor).setFontColor(user.fontColor);
    if (runLen > 1) range.merge();
    i = j;
  }
}

/** 出力予定範囲をあらかじめクリア（前回の残りを消す） */
function clearOutputArea_(sheet, cfg, timeSlots, dayData) {
  const days = dayData.length;
  let rows, cols;
  if (cfg.orientation === '横') {
    // 日付行 + 見出し行 + ユーザー行、を日数分。日間に空行1
    const perDay = 2 + cfg.users.length;
    rows = perDay * days + (days - 1);
    cols = 1 + timeSlots.length;
  } else {
    const perDay = 2 + timeSlots.length; // 日付行 + 見出し行 + スロット
    rows = perDay * days + (days - 1);
    cols = 1 + cfg.users.length;
  }
  const maxRows = sheet.getMaxRows() - cfg.destRow + 1;
  const maxCols = sheet.getMaxColumns() - cfg.destCol + 1;
  const clrRows = Math.max(1, Math.min(rows + 2, maxRows));
  const clrCols = Math.max(1, Math.min(cols, maxCols));
  const range = sheet.getRange(cfg.destRow, cfg.destCol, clrRows, clrCols);
  range.breakApart();
  range.clear();
}

/** ===================== 補助関数 ===================== */

function isAllDayEventSafe_(event) {
  try { return event.isAllDayEvent(); } catch (e) { return false; }
}

/** 'HH:mm' スロットを開始〜終了・刻み(分)で生成 */
function generateTimeSlots_(startStr, endStr, stepMinutes) {
  const step = (stepMinutes && stepMinutes > 0) ? stepMinutes : 15;
  const [sh, sm] = startStr.split(':').map(Number);
  const [eh, em] = endStr.split(':').map(Number);
  let cur = sh * 60 + sm;
  const end = eh * 60 + em;
  const slots = [];
  while (cur < end) {
    const h = Math.floor(cur / 60);
    const m = cur % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    cur += step;
  }
  return slots;
}

/** 開始日〜終了日（両端含む）の Date 配列 */
function eachDate_(startDate, endDate) {
  const days = [];
  let d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const last = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  while (d.getTime() <= last.getTime()) {
    days.push(new Date(d.getTime()));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function dateTitle_(date) {
  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  return Utilities.formatDate(date, 'JST', 'yyyy年MM月dd日') + ` (${weekdays[date.getDay()]})`;
}

function fmtDate_(date) {
  return Utilities.formatDate(date, 'JST', 'yyyy-MM-dd');
}

/** 'yyyy-MM-dd' / 'yyyy/MM/dd' などをローカル日付(0時)に */
function parseDateCell_(str) {
  if (!str) return null;
  const s = String(str).trim();
  const m = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (m) {
    return new Date(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10));
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return null;
}

/** 時刻文字列を HH:mm に正規化（不正なら null） */
function parseTimeStr_(str) {
  if (!str && str !== 0) return null;
  const s = String(str).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (isNaN(h) || isNaN(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** 'A1' 形式を {row, col}(1始まり) に。不正なら null */
function parseA1_(a1) {
  const m = String(a1).trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!m) return null;
  let col = 0;
  for (let i = 0; i < m[1].length; i++) {
    col = col * 26 + (m[1].charCodeAt(i) - 64);
  }
  const row = parseInt(m[2], 10);
  if (col < 1 || row < 1) return null;
  return { row, col };
}
