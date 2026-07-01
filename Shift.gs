/** v5: メニュー整理版に、空き時間抽出で作業予定を実シフト優先にする選択肢を追加。
 *  v6: 週次担当（週ごとの主担当・稼働メンバー）と、自動割当の予定無視キーワードを追加。 */

/** ===================== 定数設定 ===================== */

/** シフト列はユーザーごとに1列（予定列と同じ並び）。各シフト列は1人専用で複数人は入らない。
 *  シフト列数 = ユーザー数、先頭シフト列 = ユーザー数 + 2 列目。 */

/** 1日あたりの休憩時間（時間単位、予定時間の計算で差し引かれる） */
const BREAK_HOURS = 1;

/** 昼休み時間帯（HH:MM形式、自動シフトから除外） */
const LUNCH_START = '12:00';
const LUNCH_END = '13:00';

/** カレンダー予定の前後バッファ（分単位、自動シフトで予定の前後を避ける） */
const EVENT_BUFFER_MINUTES = 30;

/** 1人1日あたりの最大割当時間（自動シフト用） */
const MAX_HOURS_PER_DAY = 8;

/** 最小連続ブロック（スロット数。1スロット=15分。4=1時間） */
const MIN_BLOCK_SLOTS = 4;

/** 特定キーワード付き予定の前後をブロックする時間（分単位） */
const SPECIAL_EVENT_BUFFER_MINUTES = 60;

/** 設定シート 1・2行目の並び（左から）:
 *  A 開始日 / B 取得日数 / C 開始時刻 / D 終了時刻 / E 月の稼働日数 /
 *  F 予定時間計算用稼働日数 / G 月間目標 / H 1日上限 / I 1日下限 /
 *  J メイン担当1 / K メイン担当2 / L メイン担当外 / M 管理者メール / N シフト登録キーワード / O 前後1hブロックキーワード */

/** 予定時間計算用稼働日数（F列の目安計算に使用） */
const PLANNED_HOURS_DAYS_LABEL_CELL = 'F1';
const PLANNED_HOURS_DAYS_CELL = 'F2';

/** 月間目標 */
const MONTHLY_TARGET_LABEL_CELL = 'G1';
const MONTHLY_TARGET_CELL = 'G2';

/** 1日チーム合計の上限 */
const DAILY_TEAM_CAP_LABEL_CELL = 'H1';
const DAILY_TEAM_CAP_CELL = 'H2';

/** 1日チーム合計の下限（各日この時間まで引き上げる） */
const DAILY_MIN_LABEL_CELL = 'I1';
const DAILY_MIN_CELL = 'I2';

/** メイン担当1（最優先）/ メイン担当2（次点）/ メイン担当外（1・2が両方予定の時に充てる） */
const MAIN_USER1_LABEL_CELL = 'J1';
const MAIN_USER1_CELL = 'J2';
const MAIN_USER2_LABEL_CELL = 'K1';
const MAIN_USER2_CELL = 'K2';
const MAIN_USER3_LABEL_CELL = 'L1';
const MAIN_USER3_CELL = 'L2';

/** 管理者メール（自動シフト対象外） */
const ADMIN_EMAIL_LABEL_CELL = 'M1';
const ADMIN_EMAIL_CELL = 'M2';

/** シフト登録キーワード（予定タイトルに含まれると本人をその時間帯のシフトに登録） */
const SHIFT_KEYWORD_LABEL_CELL = 'N1';
const SHIFT_KEYWORD_CELL = 'N2';

/** 前後1時間ブロックキーワード（予定タイトルに含まれると、その本人の前後1時間を割当不可にする） */
const SPECIAL_BLOCK_KEYWORD_LABEL_CELL = 'O1';
const SPECIAL_BLOCK_KEYWORD_CELL = 'O2';

/** 除外日リスト用の別シート */
const EXCLUDED_DATES_SHEET_NAME = '除外日';

/** ===================== ユーザー行（5行目以降）の列番号 ===================== */
const USER_COL_NAME = 1;                  // A: 名前
const USER_COL_EMAIL = 2;                 // B: メール
const USER_COL_COLOR = 3;                 // C: 色
const USER_COL_PLANNED_PERSON_MONTH = 4;  // D: 予定人月
const USER_COL_PLANNED_HOURS = 5;         // E: 予定時間（手入力）
const USER_COL_PLANNED_HOURS_CALC = 6;    // F: 予定時間(目安)（人月から自動計算）
const USER_COL_START_TIME = 7;            // G: 開始時刻
const USER_COL_END_TIME = 8;              // H: 終了時刻
const USER_COL_TOTAL = 9;                 // I: 合計
const USER_COL_FIRST_DATE = 10;           // J以降: 各日付

/** 1日あたりに割り当てる担当者の最大人数（なるべくこの人数以内に収める） */
const MAX_PEOPLE_PER_DAY = 2;

/** 1日あたりに割り当てる担当者の最小人数（1人だけの日を作らない） */
const MIN_PEOPLE_PER_DAY = 2;

/**
 * 同じ時間帯（スロット）に入れる担当者の最大人数。
 * 「同じ時間帯に複数人（3人以上）を禁止」する場合は 2 にする。
 * ※カレンダー予定（シフト登録キーワード）から発生した重複は、この上限の対象外（本人の実予定なのでそのまま残す）。
 */
const MAX_SAME_TIME_PEOPLE = 2;

/** 日次最低時間（強調表示用、これを下回ると赤系で強調） */
const DAILY_MIN_HOURS_HIGHLIGHT = 10;

/** 空き時間 4パターンのメタ情報（ラベル/色/順序）。待機担当の区別は廃止し全シフト列を同等に扱う。 */
const FREE_TIME_TYPES = [
  { key: 'free_open',        label: 'シフト入れる / 予定なし', bg: '#f4cccc', fg: '#cc0000' },
  { key: 'on_shift',         label: 'シフト中 / 予定なし',     bg: '#d9ead3', fg: '#274e13' },
  { key: 'event_only',       label: '予定中 / シフトなし',     bg: '#eeeeee', fg: '#666666' },
  { key: 'shift_with_event', label: '⚠ シフト中 + 予定あり',  bg: '#b45f06', fg: '#ffffff' },
];
const FREE_TIME_TYPE_MAP = {};
FREE_TIME_TYPES.forEach(t => { FREE_TIME_TYPE_MAP[t.key] = t; });

/** 日付シートの行構成
 *  行1: 日付見出し
 *  行2: 列見出し1（時刻 / 名前 / シフト）
 *  行3: 列見出し2（予定）
 *  行4: 予定列側=日ごとの主担当チェックボックス（その日で一番長い人）/ シフト列側=ロック行
 *  行5以降: 時刻スロット（9:00〜17:45）
 */
const LOCK_ROW = 4;
const TIME_SLOT_START_ROW = 5;

/** 日付シートA1（タイトル行左端）に置く「シフト確定」チェックボックスの位置。
 *  ONの日は自動割当・シフト欄の初期化（全クリア）・カレンダー予定反映の対象から外す。 */
const CONFIRMED_CELL_ROW = 1;
const CONFIRMED_CELL_COL = 1;

/** ===================== メニュー ===================== */

function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu('シフト作成')
    // 毎回使う操作だけをトップに出す。
    .addItem('① カレンダー予定を反映', 'updateTeamCalendarSheets')
    .addItem('② シフトを自動作成（空き枠のみ）', 'autoAssignShiftsPreserve')
    .addItem('②-2 指定期間だけ組みなおす', 'autoAssignShiftsRange')
    .addItem('③ 集計を更新', 'updateSettingsTotalsOnly')
    .addSeparator()

    // 初回・たまに使う設定系はまとめる。
    .addSubMenu(ui.createMenu('初回セットアップ・設定')
      .addItem('設定シートを作成/初期化', 'createSettingsSheet')
      .addItem('使い方シートを更新', 'createDocsSheet')
      .addSeparator()
      .addItem('補助シートをまとめて作成/更新', 'initializeEnhancedShiftFeatures')
      .addItem('運用設定シートを作成/更新', 'createOperationSettingsSheet')
      .addItem('キーワードルールシートを作成/更新', 'createKeywordRulesSheet')
      .addItem('キーワードルールを設定へ反映', 'syncKeywordRulesToSettings')
      .addItem('ユーザー属性シートを作成/更新', 'createUserAttributesSheet')
      .addItem('ユーザー属性を設定へ反映', 'syncUserAttributesToSettings')
      .addSeparator()
      .addItem('週次担当シートを作成/更新', 'createWeeklyAssignmentSheet')
      .addSeparator()
      .addItem('テスト用シミュレーションシートを作成', 'createTestSimulationSheet'))

    // 確認・分析・補填は必要な時だけ開く。
    .addSubMenu(ui.createMenu('確認・分析・補填')
      .addItem('不足日レポートを作成', 'createShortageReport')
      .addItem('不足日だけ補填（安全）', 'fillShortageOnlySafely')
      .addItem('空き時間を抽出', 'extractFreeTimeShiftPriorityForWorkEvent'))

    // 破壊的操作・診断は管理メニューへ隔離する。
    .addSubMenu(ui.createMenu('管理・診断')
      .addItem('シフト欄を初期化（全クリア）', 'initializeShiftCellsOnly')
      .addItem('シフトを自動作成（全クリア）', 'autoAssignShiftsOverwrite')
      .addSeparator()
      .addItem('変更履歴シートを作成/更新', 'createShiftHistorySheet')
      .addSeparator()
      .addItem('設定チェック', 'validateSettings'))

    .addToUi();
}

function autoAssignShiftsPreserve() { autoAssignShifts(true); }
function autoAssignShiftsOverwrite() { autoAssignShifts(false); }

/**
 * メニュー: 指定期間だけシフトを組みなおす
 *  - 設定シート A2/B2 の対象期間のうち、入力した開始日〜終了日（両端含む）だけを再割り当てする
 *  - 範囲外の日は一切変更しない（既存シフトはそのまま）
 *  - 範囲内でも、ロック列・確定済みの日は保持/スキップされる
 *  - 範囲外の既存割当は月間目標の消化として扱い、範囲内で過剰配分しないようにする
 */
function autoAssignShiftsRange() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const setSheet = ss.getSheetByName('設定');
  const ui = SpreadsheetApp.getUi();

  if (!setSheet) {
    ui.alert('「設定」シートを作成してください。');
    return;
  }

  const startDate = new Date(setSheet.getRange('A2').getValue());
  const daysToFetch = Number(setSheet.getRange('B2').getValue());
  if (isNaN(startDate.getTime()) || !daysToFetch || daysToFetch <= 0) {
    ui.alert('設定シートの A2（開始日）と B2（取得日数）を確認してください。');
    return;
  }

  const periodStartStr = Utilities.formatDate(startDate, 'JST', 'yyyy-MM-dd');
  const periodEnd = new Date(startDate.getTime());
  periodEnd.setDate(startDate.getDate() + daysToFetch - 1);
  const periodEndStr = Utilities.formatDate(periodEnd, 'JST', 'yyyy-MM-dd');

  // 入力例は「対象期間の一部」を指定するイメージが伝わるように、
  // 期間の全体（両端）ではなく期間内側の日付を例として提示する。
  const exStart = new Date(startDate.getTime());
  exStart.setDate(startDate.getDate() + Math.floor((daysToFetch - 1) / 4));
  const exEnd = new Date(startDate.getTime());
  exEnd.setDate(startDate.getDate() + Math.floor((daysToFetch - 1) * 3 / 4));
  const exStartStr = Utilities.formatDate(exStart, 'JST', 'yyyy-MM-dd');
  const exEndStr = Utilities.formatDate(exEnd, 'JST', 'yyyy-MM-dd');

  const res1 = ui.prompt(
    '指定期間だけ組みなおす（1/2）',
    `対象期間 ${periodStartStr} 〜 ${periodEndStr} のうち、組みなおしたい範囲の「開始日」を入力してください。\n` +
    `（YYYY-MM-DD 形式・入力例: ${exStartStr}）`,
    ui.ButtonSet.OK_CANCEL
  );
  if (res1.getSelectedButton() !== ui.Button.OK) return;
  const rangeStart = parseInputDate_(res1.getResponseText());
  if (!rangeStart) {
    ui.alert('開始日の形式が正しくありません（YYYY-MM-DD で入力してください）。');
    return;
  }

  const res2 = ui.prompt(
    '指定期間だけ組みなおす（2/2）',
    `組みなおしたい範囲の「終了日」を入力してください（両端を含みます）。\n` +
    `対象期間: ${periodStartStr} 〜 ${periodEndStr}\n` +
    `（YYYY-MM-DD 形式・入力例: ${exEndStr}）`,
    ui.ButtonSet.OK_CANCEL
  );
  if (res2.getSelectedButton() !== ui.Button.OK) return;
  const rangeEnd = parseInputDate_(res2.getResponseText());
  if (!rangeEnd) {
    ui.alert('終了日の形式が正しくありません（YYYY-MM-DD で入力してください）。');
    return;
  }

  const rStartStr = Utilities.formatDate(rangeStart, 'JST', 'yyyy-MM-dd');
  const rEndStr = Utilities.formatDate(rangeEnd, 'JST', 'yyyy-MM-dd');
  if (rStartStr > rEndStr) {
    ui.alert('開始日が終了日より後になっています。入力し直してください。');
    return;
  }
  if (rEndStr < periodStartStr || rStartStr > periodEndStr) {
    ui.alert(`指定した期間が対象期間（${periodStartStr} 〜 ${periodEndStr}）と重なっていません。`);
    return;
  }

  const confirm = ui.alert(
    '確認',
    `${rStartStr} 〜 ${rEndStr} の期間だけシフトを組みなおします。\n` +
    'この期間の既存シフト（ロック列・確定済みの日を除く）は再割り当てされます。\n' +
    '期間外の日は変更しません。\n\n続行しますか？',
    ui.ButtonSet.OK_CANCEL
  );
  if (confirm !== ui.Button.OK) return;

  autoAssignShifts(false, { rangeStart: rangeStart, rangeEnd: rangeEnd, skipConfirm: true });
}

/**
 * 「YYYY-MM-DD」（区切りは - / . いずれも可）の文字列を Date に変換する。
 * 不正な日付・形式なら null を返す。
 */
function parseInputDate_(text) {
  const t = String(text || '').trim();
  const m = t.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(y, mo - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== mo - 1 || date.getDate() !== d) return null;
  return date;
}

/**
 * メニュー: シフト欄を初期化（全クリア）
 *  - 設定シート A2/B2 の対象期間の日付シートだけを対象にする
 *  - カレンダー予定列は触らない
 *  - シフト欄の値・色を初期状態に戻す
 *  - ロック行もOFFへ戻す
 */
function initializeShiftCellsOnly() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const setSheet = ss.getSheetByName('設定');
  const ui = SpreadsheetApp.getUi();

  if (!setSheet) {
    ui.alert('「設定」シートを作成してください。');
    return;
  }

  const startDateValue = setSheet.getRange('A2').getValue();
  const startDate = new Date(startDateValue);
  const daysToFetch = Number(setSheet.getRange('B2').getValue());
  const startTimeStr = setSheet.getRange('C2').getDisplayValue();
  const endTimeStr = setSheet.getRange('D2').getDisplayValue();

  if (isNaN(startDate.getTime()) || !daysToFetch || daysToFetch <= 0) {
    ui.alert('設定シートの A2（開始日）と B2（取得日数）を確認してください。');
    return;
  }

  const users = readUsers(setSheet);
  if (users.length === 0) {
    ui.alert('ユーザーが登録されていません。');
    return;
  }

  const timeSlots = generateTimeSlots(startTimeStr, endTimeStr);
  if (timeSlots.length === 0) {
    ui.alert('設定シートの C2（開始時刻）と D2（終了時刻）を確認してください。');
    return;
  }

  const res = ui.alert(
    '確認',
    '設定シート A2/B2 の対象期間にある日付シートの「シフト欄」を全クリアします。\n' +
    'カレンダー予定列は残します。ロック行もOFFへ戻します。\n\n続行しますか？',
    ui.ButtonSet.OK_CANCEL
  );
  if (res !== ui.Button.OK) return;

  const shiftCol1 = users.length + 2;
  const lockRule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  let clearedCount = 0;
  const missingSheets = [];
  const oldFormatSheets = [];
  const confirmedSheets = [];

  for (let d = 0; d < daysToFetch; d++) {
    const targetDate = new Date(startDate.getTime());
    targetDate.setDate(startDate.getDate() + d);
    const sheetName = Utilities.formatDate(targetDate, 'JST', 'yyyy-MM-dd');
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      missingSheets.push(sheetName);
      continue;
    }

    const a4 = sheet.getRange(LOCK_ROW, 1).getDisplayValue().trim();
    if (/^\d{1,2}:\d{2}$/.test(a4)) {
      oldFormatSheets.push(sheetName);
      continue;
    }

    if (isDayConfirmed_(sheet)) {
      confirmedSheets.push(sheetName);
      continue;
    }

    const shiftRange = sheet.getRange(TIME_SLOT_START_ROW, shiftCol1, timeSlots.length, users.length);
    shiftRange.clearContent();
    shiftRange.setBackground('#fff4e5');
    shiftRange.setFontColor('#000000');
    shiftRange.setFontWeight('normal');

    // ドロップダウンも初期状態へ戻す。
    users.forEach((user, idx) => {
      const colRange = sheet.getRange(TIME_SLOT_START_ROW, shiftCol1 + idx, timeSlots.length, 1);
      const rule = SpreadsheetApp.newDataValidation()
        .requireValueInList([user.name], true)
        .setAllowInvalid(true)
        .build();
      colRange.setDataValidation(rule);
    });

    const lockRange = sheet.getRange(LOCK_ROW, shiftCol1, 1, users.length);
    lockRange.setDataValidation(lockRule);
    lockRange.setValues([new Array(users.length).fill(false)]);
    lockRange.setBackground('#fce4d6');

    clearedCount++;
  }

  const dailySheetNames = ss.getSheets()
    .map(s => s.getName())
    .filter(name => /^\d{4}-\d{2}-\d{2}$/.test(name))
    .sort();
  updateSettingsTotals(setSheet, users, dailySheetNames, timeSlots);

  let msg = `${clearedCount}日分のシフト欄を初期化しました。`;
  if (missingSheets.length > 0) {
    msg += `\n\n日付シートなし: ${missingSheets.slice(0, 10).join(', ')}`;
    if (missingSheets.length > 10) msg += ` ...他 ${missingSheets.length - 10} 件`;
  }
  if (oldFormatSheets.length > 0) {
    msg += `\n\n旧形式のためスキップ: ${oldFormatSheets.slice(0, 10).join(', ')}`;
    if (oldFormatSheets.length > 10) msg += ` ...他 ${oldFormatSheets.length - 10} 件`;
    msg += '\n旧形式の日は、先に「最新のカレンダー予定を反映（シフト保持）」を実行してください。';
  }
  if (confirmedSheets.length > 0) {
    msg += `\n\n確定済みのためスキップ: ${confirmedSheets.slice(0, 10).join(', ')}`;
    if (confirmedSheets.length > 10) msg += ` ...他 ${confirmedSheets.length - 10} 件`;
    msg += '\n確定を解除するには、その日のシートA1のチェックを外してください。';
  }

  ui.alert('シフト欄を初期化しました', msg, ui.ButtonSet.OK);
}

/** ===================== 既存: カレンダー反映 ===================== */

function updateTeamCalendarSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const setSheet = ss.getSheetByName('設定');

  if (!setSheet) {
    Browser.msgBox('「設定」シートを作成してください。');
    return;
  }

  const startDate = new Date(setSheet.getRange('A2').getValue());
  const daysToFetch = setSheet.getRange('B2').getValue();
  const startTimeStr = setSheet.getRange('C2').getDisplayValue();
  const endTimeStr = setSheet.getRange('D2').getDisplayValue();

  const lastRow = setSheet.getLastRow();
  if (lastRow < 5) {
    Browser.msgBox('設定シートにユーザー情報を登録してください（5行目以降）。');
    return;
  }

  const users = readUsers(setSheet);
  applyRoleSettingsToUsers(users, setSheet);
  if (users.length === 0) {
    Browser.msgBox('設定シートにユーザー（メールアドレス）が登録されていません。');
    return;
  }

  const timeSlots = generateTimeSlots(startTimeStr, endTimeStr);
  const weeklyAssignmentCfg = readWeeklyAssignments_(setSheet, users);
  let confirmedSkipCount = 0;

  for (let d = 0; d < daysToFetch; d++) {
    let targetDate = new Date(startDate.getTime());
    targetDate.setDate(startDate.getDate() + d);
    let sheetName = Utilities.formatDate(targetDate, 'JST', 'yyyy-MM-dd');

    let sheet = ss.getSheetByName(sheetName);
    if (sheet && isDayConfirmed_(sheet)) {
      // 確定済みの日は、カレンダー再取得も含めて一切触らない。
      confirmedSkipCount++;
      continue;
    }

    const allUserEvents = users.map(user => fetchEvents(user.email, new Date(targetDate.getTime())));

    let savedShiftMap = null;

    if (sheet) {
      savedShiftMap = saveShiftData(sheet);
      clearSheet(sheet);
    } else {
      sheet = ss.insertSheet(sheetName);
    }

    setupLayout(sheet, users, timeSlots, targetDate);
    fillAllEvents(sheet, users, allUserEvents, timeSlots);
    addDailyTotalsRow(sheet, users, timeSlots);

    if (savedShiftMap) {
      restoreShiftData(sheet, users, timeSlots, savedShiftMap);
    }

    // カレンダー反映時点でも、日ごとの主担当フラグを表示する。
    const shiftCol1 = users.length + 2;
    const lockRowValues = sheet.getRange(LOCK_ROW, shiftCol1, 1, users.length).getValues()[0];
    const isLunchSlotForFlag = timeSlots.map(t => t >= getLunchStart_() && t < getLunchEnd_());
    const dayForFlag = {
      date: targetDate,
      dateStr: sheetName,
      sheet,
      userEvents: allUserEvents,
      lockedCols: lockRowValues.map(v => v === true),
    };
    applyWeeklyConfigToDay_(dayForFlag, weeklyAssignmentCfg, users);
    dayForFlag.busySlots = users.map((user, uIdx) =>
      countBusySlotsForDay(user, allUserEvents[uIdx], dayForFlag, timeSlots, isLunchSlotForFlag)
    );
    dayForFlag.mainLeadIdx = selectDailyMainLeadIdxWithWeek_(users, dayForFlag, d);
    writeDailyMainLeadFlag(dayForFlag, users);
  }

  const allDailySheetNames = ss.getSheets()
    .map(s => s.getName())
    .filter(name => /^\d{4}-\d{2}-\d{2}$/.test(name))
    .sort();
  updateSettingsTotals(setSheet, users, allDailySheetNames, timeSlots);

  let doneMsg = 'カレンダー情報を更新しました。';
  if (confirmedSkipCount > 0) {
    doneMsg += `\n確定済みのためスキップ: ${confirmedSkipCount}日`;
  }
  Browser.msgBox(doneMsg);
}

function updateSettingsTotalsOnly() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const setSheet = ss.getSheetByName('設定');
  if (!setSheet) {
    Browser.msgBox('「設定」シートを作成してください。');
    return;
  }

  const startTimeStr = setSheet.getRange('C2').getDisplayValue();
  const endTimeStr = setSheet.getRange('D2').getDisplayValue();
  const timeSlots = generateTimeSlots(startTimeStr, endTimeStr);

  const users = readUsers(setSheet);

  const dailySheetNames = ss.getSheets()
    .map(s => s.getName())
    .filter(name => /^\d{4}-\d{2}-\d{2}$/.test(name))
    .sort();

  if (dailySheetNames.length === 0) {
    Browser.msgBox('日付シート（yyyy-MM-dd 形式）が見つかりません。');
    return;
  }

  updateSettingsTotals(setSheet, users, dailySheetNames, timeSlots);
  Browser.msgBox('集計を更新しました。');
}

/** ===================== 空き時間抽出 ===================== */

/**
 * メニュー: 空き時間を抽出（人単位、4区分集計）
 *  各ユーザーの個人稼働時間帯（G列〜H列）内に限定して、シフト/予定の組み合わせを4区分で集計:
 *   1.「シフト入れる / 予定なし」(赤):   本人シフトなし + 予定なし → 追加できる
 *   2.「シフト中 / 予定なし」(緑):       本人がいずれかのシフト列に入っている + 予定なし
 *   3.「予定中 / シフトなし」(灰):       本人シフトなし + 予定あり
 *   4.「⚠ シフト中 + 予定あり」(茶):    シフト中 + 予定あり → ダブルブッキング(要確認)
 *  連続するスロットはマージして表示。除外日と昼休みは対象外。
 *  個人の稼働時間（G/H列）が未設定の場合は全時間帯が対象。
 */
function extractFreeTimeShiftPriorityForWorkEvent() {
  const cfg = getOperationConfig_();
  extractFreeTimeCore_({
    workEventShiftPriority: true,
    workEventShiftPriorityKeywords: cfg.freeTimeShiftPriorityKeywords,
    workEventShiftPriorityKeywordText: cfg.freeTimeShiftPriorityKeywordText,
    modeLabel: '実シフト優先（優先シフトキーワードを予定扱いしない）',
  });
}

function extractFreeTimeCore_(freeTimeOptions) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const setSheet = ss.getSheetByName('設定');
  const ui = SpreadsheetApp.getUi();

  if (!setSheet) {
    ui.alert('「設定」シートを作成してください。');
    return;
  }

  const startTimeStr = setSheet.getRange('C2').getDisplayValue();
  const endTimeStr = setSheet.getRange('D2').getDisplayValue();
  const timeSlots = generateTimeSlots(startTimeStr, endTimeStr);
  const numSlots = timeSlots.length;
  const isLunchSlot = timeSlots.map(t => t >= getLunchStart_() && t < getLunchEnd_());
  const freeTimeOpts = freeTimeOptions || {};
  const workEventShiftPriority = freeTimeOpts.workEventShiftPriority === true;
  const workEventShiftPriorityKeywords = (freeTimeOpts.workEventShiftPriorityKeywords && freeTimeOpts.workEventShiftPriorityKeywords.length > 0)
    ? freeTimeOpts.workEventShiftPriorityKeywords
    : parseKeywordList('【作業】鹿島_SES');
  const workEventShiftPriorityKeywordText = freeTimeOpts.workEventShiftPriorityKeywordText || '【作業】鹿島_SES';
  const freeTimeModeLabel = freeTimeOpts.modeLabel || (workEventShiftPriority ? '実シフト優先' : '通常');
  let shiftPriorityIgnoredSlotCount = 0;

  const users = readUsers(setSheet);
  if (users.length === 0) {
    ui.alert('ユーザーが登録されていません。');
    return;
  }

  const excludedDateSet = readExcludedDates(setSheet);

  const dailySheets = ss.getSheets()
    .filter(s => /^\d{4}-\d{2}-\d{2}$/.test(s.getName()))
    .sort((a, b) => a.getName().localeCompare(b.getName()));

  if (dailySheets.length === 0) {
    ui.alert('日付シート（yyyy-MM-dd 形式）が見つかりません。');
    return;
  }

  // recordsByUser[uIdx] = [{ date, startTime, endTime, type }]
  const recordsByUser = users.map(() => []);

  dailySheets.forEach(sheet => {
    const dateStr = sheet.getName();
    if (excludedDateSet.has(dateStr)) return;

    const shiftCol1 = users.length + 2;

    // シフト4列を取得
    let shifts;
    try {
      shifts = sheet.getRange(TIME_SLOT_START_ROW, shiftCol1, numSlots, users.length).getValues();
    } catch (e) {
      return;
    }

    // ユーザー予定列を取得（マージ範囲を考慮して値を伝播）
    const eventRange = sheet.getRange(TIME_SLOT_START_ROW, 2, numSlots, users.length);
    const events = eventRange.getValues();
    try {
      const merges = eventRange.getMergedRanges();
      merges.forEach(mr => {
        const r1 = mr.getRow() - TIME_SLOT_START_ROW;
        const c1 = mr.getColumn() - 2;
        const rN = mr.getNumRows();
        const cN = mr.getNumColumns();
        if (r1 < 0 || c1 < 0) return;
        const topVal = events[r1][c1];
        for (let r = 0; r < rN; r++) {
          for (let c = 0; c < cN; c++) {
            if (r1 + r < events.length && c1 + c < events[0].length) {
              events[r1 + r][c1 + c] = topVal;
            }
          }
        }
      });
    } catch (e) {}

    // 各ユーザーごとに連続スロット解析
    users.forEach((user, uIdx) => {
      const slotStates = new Array(numSlots).fill(null);
      for (let s = 0; s < numSlots; s++) {
        if (isLunchSlot[s]) continue;
        // 個人の稼働時間帯外はスキップ
        if (!isWithinUserHours(timeSlots[s], user)) continue;

        const eventText = events[s][uIdx] ? String(events[s][uIdx]).trim() : '';
        const originalHasEvent = eventText !== '';
        const ignoreEventForShiftPriority = originalHasEvent && workEventShiftPriority &&
          textMatchesKeywordList_(eventText, workEventShiftPriorityKeywords);
        const hasEvent = originalHasEvent && !ignoreEventForShiftPriority;
        const onShift = shifts[s].some(v => v === user.name);  // 本人がいずれかのシフト列に入っている
        if (ignoreEventForShiftPriority) shiftPriorityIgnoredSlotCount++;

        if (hasEvent) {
          slotStates[s] = onShift ? 'shift_with_event' : 'event_only';
        } else {
          slotStates[s] = onShift ? 'on_shift' : 'free_open';
        }
      }

      // 連続スロットをマージ
      let runStart = -1;
      let runType = null;
      for (let s = 0; s <= numSlots; s++) {
        const state = s < numSlots ? slotStates[s] : null;
        if (state !== runType) {
          if (runStart !== -1 && runType !== null) {
            recordsByUser[uIdx].push({
              date: dateStr,
              startTime: timeSlots[runStart],
              endTime: slotEndTime(timeSlots, s - 1),
              type: runType,
            });
          }
          runStart = state !== null ? s : -1;
          runType = state;
        }
      }
    });
  });

  // 結果を「空き時間」シートに出力
  const RESULT_SHEET_NAME = '空き時間';
  let resultSheet = ss.getSheetByName(RESULT_SHEET_NAME);
  if (resultSheet) {
    resultSheet.setFrozenRows(0);
    const maxRows = resultSheet.getMaxRows();
    const maxCols = resultSheet.getMaxColumns();
    const full = resultSheet.getRange(1, 1, maxRows, maxCols);
    full.breakApart();
    full.clearDataValidations();
    resultSheet.clear();
  } else {
    resultSheet = ss.insertSheet(RESULT_SHEET_NAME);
  }

  // ヘッダー
  resultSheet.getRange(1, 1, 1, 4).setValues([['担当者', '日付', '時間帯', '区分']])
    .setBackground('#1c4587').setFontColor('#ffffff').setFontWeight('bold')
    .setHorizontalAlignment('center');

  // 担当者順 → 日付・時刻順 で並べる
  const allRecords = [];
  recordsByUser.forEach((recs, uIdx) => {
    recs.forEach(r => {
      allRecords.push({ user: users[uIdx], userIdx: uIdx, record: r });
    });
  });

  if (allRecords.length === 0) {
    resultSheet.getRange(2, 1).setValue('対象期間に空き時間はありませんでした。')
      .setFontColor('#666666');
  } else {
    const rows = allRecords.map(item => {
      const r = item.record;
      const info = FREE_TIME_TYPE_MAP[r.type];
      const typeLabel = info ? info.label : r.type;
      return [item.user.name, r.date, `${r.startTime}〜${r.endTime}`, typeLabel];
    });
    const dataRange = resultSheet.getRange(2, 1, rows.length, 4);
    dataRange.setValues(rows);
    dataRange.setVerticalAlignment('middle');
    dataRange.setHorizontalAlignment('center');

    for (let i = 0; i < allRecords.length; i++) {
      const item = allRecords[i];
      const r = item.record;

      resultSheet.getRange(2 + i, 1)
        .setBackground(item.user.bgColor)
        .setFontColor(item.user.fontColor)
        .setFontWeight('bold');

      const info = FREE_TIME_TYPE_MAP[r.type];
      const typeCell = resultSheet.getRange(2 + i, 4);
      if (info) {
        typeCell.setBackground(info.bg).setFontColor(info.fg).setFontWeight('bold');
      }
    }
  }

  resultSheet.setColumnWidth(1, 110);
  resultSheet.setColumnWidth(2, 110);
  resultSheet.setColumnWidth(3, 130);
  resultSheet.setColumnWidth(4, 220);
  resultSheet.setFrozenRows(1);

  // 設定シートに集計テーブルを追記
  const dailySheetNames = dailySheets.map(s => s.getName());
  writeFreeTimeTablesToSettings(setSheet, users, recordsByUser, dailySheetNames, excludedDateSet);

  ss.setActiveSheet(resultSheet);

  // サマリー
  let msg = '「空き時間」シートに結果を出力しました。\n';
  msg += `抽出モード: ${freeTimeModeLabel}\n`;
  if (workEventShiftPriority) {
    msg += `実シフト優先キーワード: ${workEventShiftPriorityKeywordText}\n`;
    msg += `予定扱いから除外した作業予定: ${(shiftPriorityIgnoredSlotCount / 4).toFixed(2)}h（人×時間）\n`;
  }
  msg += '設定シートの下に4区分の集計テーブルを追記しました。\n\n';
  msg += '凡例: ①シフト入れる ②シフト中 ③予定中 ④⚠シフト+予定\n\n';
  const totals = new Array(FREE_TIME_TYPES.length).fill(0);
  recordsByUser.forEach((recs, uIdx) => {
    const hPerType = FREE_TIME_TYPES.map(t => {
      return recs.filter(r => r.type === t.key)
        .reduce((s, r) => s + diffHours(r.startTime, r.endTime), 0);
    });
    hPerType.forEach((h, i) => { totals[i] += h; });
    const parts = hPerType.map(h => h.toFixed(1) + 'h');
    msg += `  ${users[uIdx].name}: ${parts.join(' / ')}\n`;
  });
  msg += `\n■ 全体: ${totals.map(h => h.toFixed(2) + 'h').join(' / ')}`;

  ui.alert('空き時間を抽出しました', msg, ui.ButtonSet.OK);
}

/**
 * 設定シートに空き時間集計テーブルを7つ追記
 */
function writeFreeTimeTablesToSettings(setSheet, users, recordsByUser, dailySheetNames, excludedDateSet) {
  if (dailySheetNames.length === 0 || users.length === 0) return;

  const numUsers = users.length;
  const numDates = dailySheetNames.length;

  const totalsByType = {};
  FREE_TIME_TYPES.forEach(t => {
    totalsByType[t.key] = Array.from({ length: numUsers }, () => new Array(numDates).fill(0));
  });

  recordsByUser.forEach((recs, uIdx) => {
    recs.forEach(r => {
      const dateIdx = dailySheetNames.indexOf(r.date);
      if (dateIdx < 0) return;
      const totals = totalsByType[r.type];
      if (!totals) return;
      totals[uIdx][dateIdx] += diffHours(r.startTime, r.endTime);
    });
  });

  const lastUserRow = Math.max.apply(null, users.map(u => u.settingRow));
  const grandTotalRow = lastUserRow + 1;

  const prevFrozenCols = setSheet.getFrozenColumns();
  const prevFrozenRows = setSheet.getFrozenRows();
  if (prevFrozenCols > 0) setSheet.setFrozenColumns(0);

  try {
    const maxRows = setSheet.getMaxRows();
    const maxCols = setSheet.getMaxColumns();
    if (maxRows > grandTotalRow) {
      const clearRange = setSheet.getRange(grandTotalRow + 1, 1, maxRows - grandTotalRow, maxCols);
      try { clearRange.breakApart(); } catch (e) {}
      clearRange.clearContent();
      clearRange.clearFormat();
    }

    const tableSize = numUsers + 3;
    const gap = 1;
    let nextStart = grandTotalRow + 2;

    FREE_TIME_TYPES.forEach(t => {
      const totals = totalsByType[t.key];
      const hasAny = totals.some(row => row.some(v => v > 0));
      if (!hasAny) return;

      writeFreeTimeOneTable(setSheet, nextStart, t.label, t.bg,
                             users, dailySheetNames, excludedDateSet, totals);
      nextStart += tableSize + gap;
    });
  } finally {
    // 通常はタイトルを結合しないのでまたがないが、手動結合などへの保険として握りつぶす。
    try {
      if (prevFrozenCols > 0) setSheet.setFrozenColumns(prevFrozenCols);
    } catch (e) {
      try { setSheet.setFrozenColumns(0); } catch (e2) {}
    }
    try {
      if (prevFrozenRows > 0 && setSheet.getFrozenRows() !== prevFrozenRows) {
        setSheet.setFrozenRows(prevFrozenRows);
      }
    } catch (e) {}
  }
}

function writeFreeTimeOneTable(sheet, startRow, title, titleColor, users, dailySheetNames, excludedDateSet, totals) {
  const numUsers = users.length;
  const numDates = dailySheetNames.length;
  const totalCol = USER_COL_TOTAL;        // 9 (I) ★変更
  const firstDateCol = USER_COL_FIRST_DATE; // 10 (J) ★変更
  const lastDataCol = firstDateCol + numDates - 1;

  // タイトルは結合しない。設定シートは1列目を固定しているため、列をまたぐ結合があると
  // 固定列の復元時に「結合セルの一部だけを含む列は固定できない」例外になる。
  // 代わりにタイトル行全体へ背景色を敷き、ラベルは1列目に置く（右の空セルへ視覚的に伸びて帯に見える）。
  sheet.getRange(startRow, 1, 1, lastDataCol)
    .setBackground(titleColor)
    .setFontWeight('bold')
    .setVerticalAlignment('middle');
  sheet.getRange(startRow, 1)
    .setValue(title)
    .setFontWeight('bold')
    .setHorizontalAlignment('left')
    .setVerticalAlignment('middle');

  const headerRow = startRow + 1;
  sheet.getRange(headerRow, 1).setValue('名前')
    .setBackground('#444444').setFontColor('#ffffff').setFontWeight('bold')
    .setHorizontalAlignment('center');
  sheet.getRange(headerRow, totalCol).setValue('合計')
    .setBackground('#444444').setFontColor('#ffffff').setFontWeight('bold')
    .setHorizontalAlignment('center');
  dailySheetNames.forEach((name, idx) => {
    const isExcluded = excludedDateSet.has(name);
    sheet.getRange(headerRow, firstDateCol + idx).setValue(name)
      .setBackground(isExcluded ? '#777777' : '#444444')
      .setFontColor('#ffffff').setFontWeight('bold')
      .setHorizontalAlignment('center');
  });

  users.forEach((user, uIdx) => {
    const dataRow = headerRow + 1 + uIdx;
    sheet.getRange(dataRow, 1).setValue(user.name)
      .setBackground(user.bgColor).setFontColor(user.fontColor)
      .setFontWeight('bold').setHorizontalAlignment('center');

    let userTotalH = 0;
    dailySheetNames.forEach((dateName, dateIdx) => {
      const h = totals[uIdx][dateIdx];
      userTotalH += h;
      const cell = sheet.getRange(dataRow, firstDateCol + dateIdx);
      if (h > 0) {
        cell.setValue(h / 24).setNumberFormat('[h]:mm');
      }
      cell.setHorizontalAlignment('center');
    });
    sheet.getRange(dataRow, totalCol)
      .setValue(userTotalH / 24)
      .setNumberFormat('[h]:mm')
      .setBackground(user.bgColor).setFontColor(user.fontColor)
      .setFontWeight('bold').setHorizontalAlignment('center');
  });

  const teamRow = headerRow + 1 + numUsers;
  sheet.getRange(teamRow, 1, 1, totalCol - 1)
    .setBackground('#444444').setFontColor('#ffffff').setFontWeight('bold')
    .setHorizontalAlignment('center');
  sheet.getRange(teamRow, 2).setValue('合計');

  let grandTotalH = 0;
  dailySheetNames.forEach((dateName, dateIdx) => {
    let colSum = 0;
    for (let uIdx = 0; uIdx < numUsers; uIdx++) {
      colSum += totals[uIdx][dateIdx];
    }
    grandTotalH += colSum;
    const cell = sheet.getRange(teamRow, firstDateCol + dateIdx);
    if (colSum > 0) {
      cell.setValue(colSum / 24).setNumberFormat('[h]:mm');
    }
    cell.setBackground('#dddddd').setFontWeight('bold').setHorizontalAlignment('center');
  });
  sheet.getRange(teamRow, totalCol)
    .setValue(grandTotalH / 24)
    .setNumberFormat('[h]:mm')
    .setBackground('#1c4587').setFontColor('#ffffff')
    .setFontWeight('bold').setHorizontalAlignment('center');
}

function diffHours(startStr, endStr) {
  const [sh, sm] = startStr.split(':').map(Number);
  const [eh, em] = endStr.split(':').map(Number);
  return (eh * 60 + em - sh * 60 - sm) / 60;
}

/** ===================== 自動シフト割り当て ===================== */

function autoAssignShifts(preserveManual, options) {
  options = options || {};
  resetOperationConfigCache_();
  const dryRun = options.dryRun === true;
  const silent = options.silent === true;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const setSheet = ss.getSheetByName('設定');
  const ui = SpreadsheetApp.getUi();

  if (!setSheet) {
    ui.alert('「設定」シートを作成してください。');
    return;
  }

  if (!preserveManual && !dryRun && !options.skipConfirm) {
    const res = ui.alert(
      '確認',
      '既存のシフト（4列分）が全て削除され、自動で再割り当てされます。続行しますか？',
      ui.ButtonSet.OK_CANCEL
    );
    if (res !== ui.Button.OK) return;
  }

  const startDate = new Date(setSheet.getRange('A2').getValue());
  const daysToFetch = Number(setSheet.getRange('B2').getValue());
  const startTimeStr = setSheet.getRange('C2').getDisplayValue();
  const endTimeStr = setSheet.getRange('D2').getDisplayValue();

  const monthlyTargetHours = parseHoursValue(setSheet.getRange(MONTHLY_TARGET_CELL));
  if (monthlyTargetHours <= 0) {
    ui.alert(`${MONTHLY_TARGET_CELL}（月間目標時間）に値を入れてください。`);
    return;
  }
  const monthlyTargetSlots = Math.round(monthlyTargetHours * 4);

  setSheet.getRange(MONTHLY_TARGET_LABEL_CELL)
    .setValue('月間目標')
    .setBackground('#1c4587')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  setSheet.getRange(DAILY_TEAM_CAP_LABEL_CELL)
    .setValue('1日上限')
    .setBackground('#1c4587')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  const dailyCapHours = parseHoursValue(setSheet.getRange(DAILY_TEAM_CAP_CELL));
  const dailyCapSlots = dailyCapHours > 0 ? Math.round(dailyCapHours * 4) : Number.MAX_SAFE_INTEGER;

  setSheet.getRange(ADMIN_EMAIL_LABEL_CELL)
    .setValue('管理者メール')
    .setBackground('#666666')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  setSheet.getRange(SHIFT_KEYWORD_LABEL_CELL)
    .setValue('シフト登録キーワード')
    .setBackground('#38761d')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  setSheet.getRange(SPECIAL_BLOCK_KEYWORD_LABEL_CELL)
    .setValue('前後1hブロックキーワード')
    .setBackground('#990000')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  // シフト登録キーワード（カンマ区切りで複数可、空欄なら機能オフ）
  // 予定タイトルにいずれかが含まれていれば、その本人をその時間帯のシフトに登録する。
  const shiftKeywordRaw = String(setSheet.getRange(SHIFT_KEYWORD_CELL).getValue() || '');
  const shiftKeywords = parseKeywordList(shiftKeywordRaw);

  // 前後1時間ブロックキーワード（カンマ区切りで複数可、空欄なら機能オフ）
  // 予定タイトルにいずれかが含まれると、その本人は予定の前後1時間も自動割当不可にする。
  const specialBlockKeywordRaw = String(setSheet.getRange(SPECIAL_BLOCK_KEYWORD_CELL).getValue() || '');
  const specialBlockKeywords = parseKeywordList(specialBlockKeywordRaw);

  const adminEmailRaw = setSheet.getRange(ADMIN_EMAIL_CELL).getValue();
  const adminEmails = new Set();
  if (adminEmailRaw) {
    String(adminEmailRaw).split(/[,,;\s]+/).forEach(e => {
      const trimmed = e.trim().toLowerCase();
      if (trimmed) adminEmails.add(trimmed);
    });
  }

  const users = readUsers(setSheet);
  if (users.length === 0) {
    ui.alert('ユーザーが登録されていません。');
    return;
  }

  // メイン担当1/2ラベル＆値（各メール、カンマ区切りで複数可。1=最優先, 2=次点）
  setSheet.getRange(MAIN_USER1_LABEL_CELL)
    .setValue('メイン担当1')
    .setBackground('#1c4587').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
  setSheet.getRange(MAIN_USER2_LABEL_CELL)
    .setValue('メイン担当2')
    .setBackground('#3d6bb3').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
  setSheet.getRange(DAILY_MIN_LABEL_CELL)
    .setValue('1日下限')
    .setBackground('#7f6000').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');
  setSheet.getRange(MAIN_USER3_LABEL_CELL)
    .setValue('メイン担当外')
    .setBackground('#674ea7').setFontColor('#ffffff').setFontWeight('bold').setHorizontalAlignment('center');

  const parseEmails = (raw) => {
    const set = new Set();
    if (raw) String(raw).split(/[,,;\s]+/).forEach(e => {
      const t = e.trim().toLowerCase();
      if (t) set.add(t);
    });
    return set;
  };
  const main1Emails = parseEmails(setSheet.getRange(MAIN_USER1_CELL).getValue());
  const main2Emails = parseEmails(setSheet.getRange(MAIN_USER2_CELL).getValue());
  const main3Emails = parseEmails(setSheet.getRange(MAIN_USER3_CELL).getValue());

  // 1日下限（チーム合計の最低時間）→ スロット数
  const dailyMinHours = parseHoursValue(setSheet.getRange(DAILY_MIN_CELL));
  const dailyMinSlots = dailyMinHours > 0 ? Math.round(dailyMinHours * 4) : 0;

  // 各ユーザーの個人目標(E列)を取得。mainRank: 1=メイン担当1, 2=メイン担当2, 3=メイン担当外, 0=通常
  users.forEach(u => {
    u.targetSlots = Math.round(parseHoursValue(setSheet.getRange(u.settingRow, USER_COL_PLANNED_HOURS)) * 4);
    u.isAdmin = adminEmails.has(String(u.email).toLowerCase());
    const em = String(u.email).toLowerCase();
    u.mainRank = main1Emails.has(em) ? 1 : (main2Emails.has(em) ? 2 : (main3Emails.has(em) ? 3 : 0));
    u.isMain = u.mainRank > 0;
  });

  const timeSlots = generateTimeSlots(startTimeStr, endTimeStr);
  const isLunchSlot = timeSlots.map(t => t >= getLunchStart_() && t < getLunchEnd_());
  const numSlots = timeSlots.length;

  autoPopulateExcludedDates(setSheet, startDate, daysToFetch);
  const excludedDateSet = readExcludedDates(setSheet);

  // 指定期間だけ組みなおすモード（options.rangeStart / rangeEnd, 両端を含む）。
  // 範囲外の日は一切変更しないが、月間目標の残り計算のため既存割当は集計しておく。
  const rangeStartStr = options.rangeStart ? Utilities.formatDate(new Date(options.rangeStart), 'JST', 'yyyy-MM-dd') : null;
  const rangeEndStr = options.rangeEnd ? Utilities.formatDate(new Date(options.rangeEnd), 'JST', 'yyyy-MM-dd') : null;
  const isRangeMode = !!(rangeStartStr && rangeEndStr);
  const baselineTotalSlots = new Array(users.length).fill(0);

  const daysData = [];
  const warnings = [];
  let confirmedSkipCount = 0;

  for (let d = 0; d < daysToFetch; d++) {
    const targetDate = new Date(startDate.getTime());
    targetDate.setDate(startDate.getDate() + d);
    const dateStr = Utilities.formatDate(targetDate, 'JST', 'yyyy-MM-dd');

    // 範囲外の日は組みなおさない。既存シフトの本人名スロットだけ月間目標へ算入する。
    if (isRangeMode && (dateStr < rangeStartStr || dateStr > rangeEndStr)) {
      if (excludedDateSet.has(dateStr)) continue;
      const outSheet = ss.getSheetByName(dateStr);
      if (!outSheet) continue;
      const outA4 = outSheet.getRange(4, 1).getDisplayValue().trim();
      if (/^\d{1,2}:\d{2}$/.test(outA4)) continue; // 旧形式は読まない
      const outCol1 = users.length + 2;
      const outShifts = outSheet.getRange(TIME_SLOT_START_ROW, outCol1, numSlots, users.length).getValues();
      for (let s = 0; s < numSlots; s++) {
        for (let c = 0; c < users.length; c++) {
          const v = String(outShifts[s][c] || '').trim();
          if (v && v === String(users[c].name || '').trim()) baselineTotalSlots[c]++;
        }
      }
      continue;
    }

    if (excludedDateSet.has(dateStr)) continue;

    const sheet = ss.getSheetByName(dateStr);
    if (!sheet) {
      warnings.push(`${dateStr}: 日付シートがありません（先に「最新のカレンダー予定を反映」を実行してください）`);
      continue;
    }

    if (isDayConfirmed_(sheet)) {
      confirmedSkipCount++;
      continue;
    }

    const a4 = sheet.getRange(4, 1).getDisplayValue().trim();
    if (/^\d{1,2}:\d{2}$/.test(a4)) {
      warnings.push(`${dateStr}: 古いシート形式です。先に「最新のカレンダー予定を反映」を実行して新しい形式（ロック行付き）に変換してください`);
      continue;
    }

    const userEvents = users.map(u => fetchEvents(u.email, new Date(targetDate.getTime())));

    const shiftCol1 = users.length + 2;
    const existingShifts = sheet.getRange(TIME_SLOT_START_ROW, shiftCol1, numSlots, users.length).getValues();

    const lockRowValues = sheet.getRange(LOCK_ROW, shiftCol1, 1, users.length).getValues()[0];
    const lockedCols = lockRowValues.map(v => v === true);

    daysData.push({
      date: targetDate,
      dateStr,
      sheet,
      userEvents,
      existingShifts,
      lockedCols,
      specialBlockKeywords,
      assignment: null,
      availability: null,
    });
  }

  if (daysData.length === 0) {
    let msg = '処理対象の日がありません。';
    if (warnings.length > 0) {
      msg += '\n\n以下の警告が出ています:\n' + warnings.slice(0, 15).join('\n');
      if (warnings.length > 15) msg += `\n...他 ${warnings.length - 15} 件`;
      const oldFormatCount = warnings.filter(w => w.includes('古いシート形式')).length;
      if (oldFormatCount > 0) {
        msg += `\n\n→ メニューから「最新のカレンダー予定を反映」を実行してください。\n   ${oldFormatCount}日分のシートが新形式（ロック行付き）に変換されます。`;
      }
    }
    ui.alert(msg);
    return;
  }

  const userTotalSlots = new Array(users.length).fill(0);
  // 指定期間モードでは、範囲外の日の既存割当を月間累計の初期値として加える
  // （E目標・月間目標の残りが正しく計算され、範囲内で過剰に割り当てないようにする）。
  for (let i = 0; i < users.length; i++) userTotalSlots[i] += baselineTotalSlots[i];
  const userDailySlots = daysData.map(() => new Array(users.length).fill(0));

  // 週次担当（その週の主担当・稼働メンバー）を読み込む。
  const weeklyAssignmentCfg = readWeeklyAssignments_(setSheet, users);

  // メイン担当1/2は日ごとに分ける。週次担当で主担当が指定されていればそちらを優先する。
  daysData.forEach((day, dayIdx) => {
    applyWeeklyConfigToDay_(day, weeklyAssignmentCfg, users);
    day.busySlots = users.map((user, uIdx) =>
      countBusySlotsForDay(user, day.userEvents[uIdx], day, timeSlots, isLunchSlot)
    );
    day.mainLeadIdx = selectDailyMainLeadIdxWithWeek_(users, day, dayIdx);
    day.specialBlocked = computeSpecialBlockMatrix(users, day, timeSlots);
  });

  let keywordSlotCount = 0;            // シフト登録キーワードで埋めたスロット総数（人×スロット）
  let mainForcedCount = 0;             // メイン担当を全員予定重複枠に強制で入れたスロット数
  let strictBlockSkipCount = 0;        // 1時間連続にできず見送った候補スロット数（参考）
  let adjacentGapFillCount = 0;        // 1時間未満の穴を、前後の既存シフトへ吸収して埋めたスロット数

  daysData.forEach((day, dayIdx) => {
    day.availability = computeAvailabilityMatrix(users, day, timeSlots);
    day.assignment = [];
    for (let s = 0; s < numSlots; s++) {
      day.assignment.push(new Array(users.length).fill(''));
    }
    day.forcedCells = {}; // 'slot_col' => true（ロック列でも書き込むため記録）
    day.fixedCells = {};  // 'slot_col' => true（最後の飛び飛びまとめで動かしてはいけないセル：既存/手動保持・カレンダー予定由来）

    // ===== 既存/ロックシフトの保持（各列はその列の本人専用） =====
    for (let s = 0; s < numSlots; s++) {
      for (let c = 0; c < users.length; c++) {
        if (day.assignment[s][c]) continue;
        const val = String(day.existingShifts[s][c] || '').trim();
        if (!val) continue;
        if (val !== String(users[c].name || '').trim()) continue; // その列の本人名でなければ無視
        const shouldPreserve = day.lockedCols[c] || preserveManual;
        if (!shouldPreserve) continue;
        day.assignment[s][c] = users[c].name;
        day.fixedCells[s + '_' + c] = true; // 手動/既存シフトは最後のまとめでも動かさない
        userDailySlots[dayIdx][c]++;
        userTotalSlots[c]++;
      }
    }

    // ===== シフト登録キーワード：本人のみを「本人の列」に登録 =====
    // メンバー自身の予定タイトルにキーワードが含まれる時間帯は、その本人を
    // 自分のシフト列へ登録する（本人の予定・勤務時間帯は無視＝登録を優先）。
    if (shiftKeywords.length > 0) {
      for (let uIdx = 0; uIdx < users.length; uIdx++) {
        if (users[uIdx].isAdmin) continue; // 管理者は対象外
        if (isUserInactiveForDay_(day, uIdx)) continue; // 週次担当で非稼働の人は登録しない
        const selfSlots = computeKeywordSlots(day.userEvents[uIdx], timeSlots, shiftKeywords, isLunchSlot);
        selfSlots.forEach(s => {
          if (day.assignment[s][uIdx]) return;         // 既に本人の列に入っていればOK
          day.assignment[s][uIdx] = users[uIdx].name;
          day.forcedCells[s + '_' + uIdx] = true;
          day.fixedCells[s + '_' + uIdx] = true;       // カレンダー予定由来は最後のまとめでも動かさない
          userDailySlots[dayIdx][uIdx]++;
          userTotalSlots[uIdx]++;
          keywordSlotCount++;
        });
      }
    }
  });

  const maxDailySlotsAll = getMaxHoursPerDaySlots_();

  const forcedContiguousUserBlockLength = (day, uIdx, startIdx, endExclusive) => {
    let left = startIdx;
    while (left - 1 >= 0 && !isLunchSlot[left - 1] && day.assignment[left - 1][uIdx] === users[uIdx].name) left--;
    let right = endExclusive;
    while (right < numSlots && !isLunchSlot[right] && day.assignment[right][uIdx] === users[uIdx].name) right++;
    return right - left;
  };

  const rollbackForcedSlots = (day, dayIdx, uIdx, slots) => {
    slots.forEach(slotIdx => {
      if (day.assignment[slotIdx][uIdx] === users[uIdx].name) {
        day.assignment[slotIdx][uIdx] = '';
        delete day.forcedCells[slotIdx + '_' + uIdx];
        userDailySlots[dayIdx][uIdx]--;
        userTotalSlots[uIdx]--;
        mainForcedCount--;
      }
    });
  };

  const tryAssignForcedBlock = (day, dayIdx, uIdx, startSlot, endSlot) => {
    const touched = [];
    let j = startSlot;
    while (j < endSlot && !isLunchSlot[j]) {
      if (day.assignment[j][uIdx]) break;
      if (isSpecialBlockedSlot(day, uIdx, j)) break; // 特定予定の前後1時間は緊急強制でも入れない
      if (userDailySlots[dayIdx][uIdx] + 1 > maxDailySlotsAll) break;     // 8h/日は守る
      if (sumArray(userDailySlots[dayIdx]) + 1 > dailyCapSlots) break;    // 1日上限は守る

      day.assignment[j][uIdx] = users[uIdx].name;
      day.forcedCells[j + '_' + uIdx] = true;
      userDailySlots[dayIdx][uIdx]++;
      userTotalSlots[uIdx]++;
      mainForcedCount++;
      touched.push(j);
      j++;
    }
    if (touched.length === 0) return 0;

    const finalBlockLen = forcedContiguousUserBlockLength(day, uIdx, touched[0], touched[touched.length - 1] + 1);
    if (finalBlockLen < getMinBlockSlots_()) {
      rollbackForcedSlots(day, dayIdx, uIdx, touched);
      strictBlockSkipCount += touched.length;
      return 0;
    }
    return touched.length;
  };


  const countOtherAssignedInSlot = (day, uIdx, slotIdx) => {
    let otherOccupied = 0;
    for (let c = 0; c < users.length; c++) {
      if (c === uIdx) continue;
      if (day.assignment[slotIdx][c]) otherOccupied++;
    }
    return otherOccupied;
  };


  const getSameUserLeftShiftLength = (day, uIdx, startSlot) => {
    let len = 0;
    let p = startSlot - 1;
    while (p >= 0 && !isLunchSlot[p] && day.assignment[p][uIdx] === users[uIdx].name) {
      len++;
      p--;
    }
    return len;
  };

  const getSameUserRightShiftLength = (day, uIdx, endSlotExclusive) => {
    let len = 0;
    let p = endSlotExclusive;
    while (p < numSlots && !isLunchSlot[p] && day.assignment[p][uIdx] === users[uIdx].name) {
      len++;
      p++;
    }
    return len;
  };

  const getAdjacentShiftInfo = (day, uIdx, runStart, runEndExclusive) => {
    const leftLen = getSameUserLeftShiftLength(day, uIdx, runStart);
    const rightLen = getSameUserRightShiftLength(day, uIdx, runEndExclusive);
    const runLen = runEndExclusive - runStart;
    return {
      leftLen,
      rightLen,
      runLen,
      hasAdjacent: leftLen > 0 || rightLen > 0,
      bridgesBothSides: leftLen > 0 && rightLen > 0,
      finalLen: leftLen + runLen + rightLen,
    };
  };

  const compareAdjacentShiftFit = (day, dayIdx, runStart, runEndExclusive) => (a, b) => {
    const infoA = getAdjacentShiftInfo(day, a, runStart, runEndExclusive);
    const infoB = getAdjacentShiftInfo(day, b, runStart, runEndExclusive);
    const bridgeA = infoA.bridgesBothSides ? 0 : 1;
    const bridgeB = infoB.bridgesBothSides ? 0 : 1;
    if (bridgeA !== bridgeB) return bridgeA - bridgeB; // 両側をつなげられる人を優先
    const adjacentLenA = infoA.leftLen + infoA.rightLen;
    const adjacentLenB = infoB.leftLen + infoB.rightLen;
    if (adjacentLenA !== adjacentLenB) return adjacentLenB - adjacentLenA; // 既存シフトが長い人を優先
    const pkA = dailyMainPriorityKey(users, day, a);
    const pkB = dailyMainPriorityKey(users, day, b);
    if (pkA !== pkB) return pkA - pkB;
    const busyA = day.busySlots ? day.busySlots[a] : 0;
    const busyB = day.busySlots ? day.busySlots[b] : 0;
    if (isMain12(users[a]) && isMain12(users[b]) && busyA !== busyB) return busyA - busyB;
    const rA = users[a].targetSlots > 0 ? userTotalSlots[a] / users[a].targetSlots : Infinity;
    const rB = users[b].targetSlots > 0 ? userTotalSlots[b] / users[b].targetSlots : Infinity;
    if (rA !== rB) return rA - rB;
    return userDailySlots[dayIdx][a] - userDailySlots[dayIdx][b];
  };

  const getUncoveredRunEnd = (day, startSlot) => {
    let e = startSlot;
    while (e < numSlots && !isLunchSlot[e] && !day.assignment[e].some(v => v)) e++;
    return e;
  };

  const canAssignForcedGapToAdjacentShift = (day, dayIdx, uIdx, runStart, runEndExclusive, allBusyFlags, hardAvail) => {
    const info = getAdjacentShiftInfo(day, uIdx, runStart, runEndExclusive);
    if (!info.hasAdjacent) return false;
    if (info.finalLen < getMinBlockSlots_()) return false;

    let addCount = 0;
    for (let k = runStart; k < runEndExclusive; k++) {
      if (k < 0 || k >= numSlots || isLunchSlot[k]) return false;
      if (day.assignment[k].some(v => v)) return false;       // 穴だけを埋める。既にカバー済みの枠は増員しない。
      if (day.assignment[k][uIdx]) return false;
      if (isSpecialBlockedSlot(day, uIdx, k)) return false;   // 特定予定の前後1時間は緊急強制でも入れない

      // allBusy枠は予定重複を許す。そうでない隣接枠は通常どおり空きでなければならない。
      if (!allBusyFlags[k] && !hardAvail[uIdx][k]) return false;
      if (countOtherAssignedInSlot(day, uIdx, k) >= getMaxSameTimePeople_()) return false; // 同時刻の人数上限（3人以上禁止）
      if (slotHasForbiddenPartnerFor_(day, uIdx, k, users)) return false;                  // 同時禁止相手とは同席させない

      addCount++;
      if (userDailySlots[dayIdx][uIdx] + addCount > maxDailySlotsAll) return false;
      if (sumArray(userDailySlots[dayIdx]) + addCount > dailyCapSlots) return false;
    }
    return addCount > 0;
  };

  const tryAssignForcedGapToAdjacentShift = (day, dayIdx, uIdx, runStart, runEndExclusive, allBusyFlags, hardAvail) => {
    if (!canAssignForcedGapToAdjacentShift(day, dayIdx, uIdx, runStart, runEndExclusive, allBusyFlags, hardAvail)) return 0;

    let added = 0;
    for (let k = runStart; k < runEndExclusive; k++) {
      day.assignment[k][uIdx] = users[uIdx].name;
      day.forcedCells[k + '_' + uIdx] = true;
      userDailySlots[dayIdx][uIdx]++;
      userTotalSlots[uIdx]++;
      mainForcedCount++;
      adjacentGapFillCount++;
      added++;
    }
    return added;
  };

  /**
   * 全員予定で通常は誰も入れないスロットを、1時間以上の連続シフトになる形で強制配置する。
   * focusSlotを含む4スロットの候補を探し、allBusyのスロットだけ予定重複を許す。
   * これにより 9:15〜9:30 の朝会だけを15分で入れるのではなく、9:00〜10:00 のような連続ブロックにする。
   */
  const tryAssignForcedMinimumBlockContainingSlot = (day, dayIdx, uIdx, focusSlot, allBusyFlags, hardAvail) => {
    const minBlock = getMinBlockSlots_();
    const minStart = Math.max(0, focusSlot - minBlock + 1);
    const maxStart = Math.min(focusSlot, numSlots - minBlock);
    if (maxStart < minStart) return 0;

    const candidates = [];
    for (let start = minStart; start <= maxStart; start++) {
      let sameUserAlready = 0;
      let otherOccupiedSlots = 0;
      for (let k = start; k < start + minBlock; k++) {
        if (day.assignment[k][uIdx] === users[uIdx].name) sameUserAlready++;
        otherOccupiedSlots += countOtherAssignedInSlot(day, uIdx, k);
      }
      candidates.push({ start, sameUserAlready, otherOccupiedSlots });
    }
    candidates.sort((a, b) => {
      if (a.sameUserAlready !== b.sameUserAlready) return b.sameUserAlready - a.sameUserAlready;
      if (a.otherOccupiedSlots !== b.otherOccupiedSlots) return a.otherOccupiedSlots - b.otherOccupiedSlots;
      return a.start - b.start;
    });

    for (const cand of candidates) {
      const toAdd = [];
      let ok = true;

      for (let k = cand.start; k < cand.start + minBlock; k++) {
        if (k < 0 || k >= numSlots || isLunchSlot[k]) { ok = false; break; }

        if (day.assignment[k][uIdx] === users[uIdx].name) continue;
        if (day.assignment[k][uIdx]) { ok = false; break; }
        if (isSpecialBlockedSlot(day, uIdx, k)) { ok = false; break; }

        // allBusy枠だけ予定との重複を許す。隣接枠は通常どおり空きでなければならない。
        if (!allBusyFlags[k] && !hardAvail[uIdx][k]) { ok = false; break; }

        // 同時刻の人数上限（既定2＝3人以上を禁止）。
        if (countOtherAssignedInSlot(day, uIdx, k) >= getMaxSameTimePeople_()) { ok = false; break; }
        // 同時禁止相手（ユーザー属性シート）とは同席させない。
        if (slotHasForbiddenPartnerFor_(day, uIdx, k, users)) { ok = false; break; }

        const nextAddCount = toAdd.length + 1;
        if (userDailySlots[dayIdx][uIdx] + nextAddCount > maxDailySlotsAll) { ok = false; break; }
        if (sumArray(userDailySlots[dayIdx]) + nextAddCount > dailyCapSlots) { ok = false; break; }

        toAdd.push(k);
      }

      if (!ok || toAdd.length === 0) continue;

      toAdd.forEach(k => {
        day.assignment[k][uIdx] = users[uIdx].name;
        day.forcedCells[k + '_' + uIdx] = true;
        userDailySlots[dayIdx][uIdx]++;
        userTotalSlots[uIdx]++;
        mainForcedCount++;
      });
      return toAdd.length;
    }

    strictBlockSkipCount++;
    return 0;
  };

  // ===== 全員が予定で誰も入れない時間帯を強制カバー（緊急・予定と重複可） =====
  // メイン担当1/2は日ごとの主担当（予定が少ない方）を優先し、本人の時間指定予定と重なってでも入れる。
  // 終日予定の人は必ず除外。この緊急カバーのみE（予定時間）を超えうる。
  const forceIdxs = users.map((u, i) => i)
    .filter(i => !users[i].isAdmin && users[i].mainRank >= 1 && users[i].mainRank <= 3);
  if (forceIdxs.length > 0) {
    daysData.forEach((day, dayIdx) => {
      const hardAvail = computeAvailabilityMatrix(users, day, timeSlots, 0, false, true);
      day.mainAnchored = false;

      // 全員重複（誰も入れない）非昼休みスロットを検出
      const allBusy = new Array(numSlots).fill(false);
      let hasAnchor = false;
      for (let s = 0; s < numSlots; s++) {
        if (isLunchSlot[s] || day.assignment[s].some(v => v)) continue;
        let anyone = false;
        for (let u = 0; u < users.length; u++) {
          if (!users[u].isAdmin && hardAvail[u][s]) { anyone = true; break; }
        }
        if (!anyone) { allBusy[s] = true; hasAnchor = true; }
      }
      if (!hasAnchor) return;

      // 入れられる候補（終日予定・ロック・週次非稼働は除外）。メイン担当1/2を優先、外は最後の保険。
      const avail12 = forceIdxs.filter(i =>
        (users[i].mainRank === 1 || users[i].mainRank === 2) &&
        !day.lockedCols[i] && !isUserInactiveForDay_(day, i) &&
        !day.userEvents[i].some(ev => isAllDayEventSafe(ev)));
      const availBackup = forceIdxs.filter(i =>
        users[i].mainRank === 3 &&
        !day.lockedCols[i] && !isUserInactiveForDay_(day, i) &&
        !day.userEvents[i].some(ev => isAllDayEventSafe(ev)));
      if (avail12.length === 0 && availBackup.length === 0) return;
      day.mainAnchored = true;

      // 全員重複区間を収集
      const runs = [];
      {
        let s = 0;
        while (s < numSlots) {
          if (!allBusy[s]) { s++; continue; }
          let e = s;
          while (e < numSlots && allBusy[e]) e++;
          runs.push([s, e]);
          s = e;
        }
      }

      // 区間の「前後（直前/直後スロット）」にその人の予定がある＝隣接している人を優先
      const busyAt = (u, x) => (x >= 0 && x < numSlots && !isLunchSlot[x] && !hardAvail[u][x]);
      const adjacency = (u, s, e) => (busyAt(u, s - 1) ? 1 : 0) + (busyAt(u, e) ? 1 : 0);

      runs.forEach(([s, e]) => {
        // この区間用の候補順: メイン担当1/2は「その日の主担当 → 予定が少ない人 → 前後に予定がある人 → 実績少」で並べる
        const ordered = avail12.slice().sort((a, b) => {
          const leadA = day.mainLeadIdx === a ? 0 : 1;
          const leadB = day.mainLeadIdx === b ? 0 : 1;
          if (leadA !== leadB) return leadA - leadB;
          const busyA = day.busySlots ? day.busySlots[a] : 0;
          const busyB = day.busySlots ? day.busySlots[b] : 0;
          if (busyA !== busyB) return busyA - busyB;
          const adA = adjacency(a, s, e), adB = adjacency(b, s, e);
          if (adA !== adB) return adB - adA;                 // 前後に予定がある人を優先
          if (userTotalSlots[a] !== userTotalSlots[b]) return userTotalSlots[a] - userTotalSlots[b];
          return users[a].mainRank - users[b].mainRank;
        }).concat(availBackup.slice().sort((a, b) => userTotalSlots[a] - userTotalSlots[b]));

        // 1時間未満の全員予定穴は、単独の端数シフトにせず、前後に既存シフトがある人へ吸収する。
        // 吸収できない場合のみ、従来どおり1時間ブロック化を試す（緊急カバーのため）。
        if (e - s < getMinBlockSlots_()) {
          const adjacentOrdered = ordered.slice()
            .filter(c => canAssignForcedGapToAdjacentShift(day, dayIdx, c, s, e, allBusy, hardAvail))
            .sort(compareAdjacentShiftFit(day, dayIdx, s, e));
          let adjacentAssigned = 0;
          for (const c of adjacentOrdered) {
            adjacentAssigned = tryAssignForcedGapToAdjacentShift(day, dayIdx, c, s, e, allBusy, hardAvail);
            if (adjacentAssigned > 0) break;
          }
          if (adjacentAssigned > 0) return;
        }

        let cursor = s;
        while (cursor < e) {
          if (day.assignment[cursor].some(v => v)) { cursor++; continue; }
          let assigned = 0;

          // focusSlotを含む1時間以上の連続ブロックとして配置する。
          // 15分・30分だけの孤立した端数シフトは作らない。
          for (const c of ordered) {
            assigned = tryAssignForcedMinimumBlockContainingSlot(day, dayIdx, c, cursor, allBusy, hardAvail);
            if (assigned > 0) break;
          }

          cursor++;
        }
      });
    });
  }

  const strictnessLevels = buildStrictnessLevels_();

  const usageByLevel = strictnessLevels.map(() => 0);

  const applyAvailability = (level) => {
    daysData.forEach(day => {
      day.availability = computeAvailabilityMatrix(users, day, timeSlots, level.bufferMin, level.ignoreEvents, level.ignoreUserHours);
    });
  };

  // ===== 自動割当: 各人の予定時間(E)に向けて配分（E=ハード上限／メイン担当外は除外＝ソロにしない） =====
  const numWorkingDays = daysData.length;
  const preFillDaily = userDailySlots.map(d => sumArray(d));   // 既存/キーワード/強制配置済みのスロット数
  // 配分対象（管理者・メイン担当外を除く）の「E目標までの残り」を集計してクォータを決める
  const distTargetSum = users.reduce((acc, u, i) => {
    if (u.isAdmin || u.mainRank === 3 || u.targetSlots <= 0) return acc;
    return acc + Math.max(0, u.targetSlots - userTotalSlots[i]);
  }, 0);
  const perDayQuotaSlots = numWorkingDays > 0 ? Math.ceil(distTargetSum / numWorkingDays) : 0;

  let currentTotal = sumArray(userTotalSlots);

  for (let lv = 0; lv < strictnessLevels.length; lv++) {
    const level = strictnessLevels[lv];
    applyAvailability(level);
    const before = sumArray(userTotalSlots);

    daysData.forEach((day, dayIdx) => {
      const dayCap = Math.min(dailyCapSlots, preFillDaily[dayIdx] + perDayQuotaSlots);

      // メイン担当1/2は、日ごとの主担当（予定が少ない方）を優先。もう一方は同日の通常配分では後回し。
      const order = users.map((u, idx) => idx)
        .filter(idx => !users[idx].isAdmin && users[idx].mainRank !== 3)
        .sort((a, b) => {
          const pkA = dailyMainPriorityKey(users, day, a);
          const pkB = dailyMainPriorityKey(users, day, b);
          if (pkA !== pkB) return pkA - pkB;
          const busyA = day.busySlots ? day.busySlots[a] : 0;
          const busyB = day.busySlots ? day.busySlots[b] : 0;
          if (isMain12(users[a]) && isMain12(users[b]) && busyA !== busyB) return busyA - busyB;
          const rA = users[a].targetSlots > 0 ? userTotalSlots[a] / users[a].targetSlots : Infinity;
          const rB = users[b].targetSlots > 0 ? userTotalSlots[b] / users[b].targetSlots : Infinity;
          if (rA !== rB) return rA - rB;
          return userDailySlots[dayIdx][a] - userDailySlots[dayIdx][b];
        });

      for (let oi = 0; oi < order.length; oi++) {
        const uIdx = order[oi];
        if (day.lockedCols[uIdx]) continue;             // 本人の列がロック
        // メイン担当1/2は基本的に日を分ける。主担当が既に入っている日は、もう一方を通常配分では追加しない。
        if (isOtherMain12OnLeadDay(users, day, uIdx) && userDailySlots[dayIdx][day.mainLeadIdx] > 0) continue;
        // E目標に達している人は配分しない（E厳守）
        if (users[uIdx].targetSlots > 0 && userTotalSlots[uIdx] >= users[uIdx].targetSlots) continue;
        // 1日の担当は最大 getMaxPeoplePerDay_() 人。新規追加で上限を超えるならスキップ
        if (userDailySlots[dayIdx][uIdx] === 0) {
          let distinct = 0;
          for (let k = 0; k < users.length; k++) if (userDailySlots[dayIdx][k] > 0) distinct++;
          if (distinct >= getMaxPeoplePerDay_()) continue;
        }
        // 個人のE目標を上限として渡す（E厳守。未設定は無制限）
        fillUserShift(day, dayIdx, uIdx, users, timeSlots, isLunchSlot,
                      userTotalSlots, userDailySlots, users[uIdx].targetSlots, dayCap, level.minBlock);
      }
    });

    usageByLevel[lv] = sumArray(userTotalSlots) - before;
    currentTotal = sumArray(userTotalSlots);
  }

  // ===== 全時間帯カバー（強制）: 非昼休みの各スロットに最低1人を入れる =====
  // 稼働時間帯(C2〜D2)から昼休みを除いた全スロットを誰かが担当するようにする。
  // 予定にぶつかる時間帯はバッファを緩和し、それでも2人で埋まらない場合のみ3人目を許可。
  // 稼働時間帯(C2〜D2)から昼休みを除いた全スロットを誰かが担当するようにする。
  // 個人の稼働時間帯(G/H)よりシフトのカバーを優先：まず時間帯内→ダメなら時間帯を無視→最後に3人目。
  // ただし実カレンダー予定への二重登録はしない。
  const coverageLevels = [
    // 全時間帯カバーでも、1人あたり1時間以上の連続ブロックだけを作る。
    { bufferMin: 30, ignoreUserHours: false, allowExtra: false },
    { bufferMin: 15, ignoreUserHours: false, allowExtra: false },
    { bufferMin: 0,  ignoreUserHours: false, allowExtra: false },
    { bufferMin: 0,  ignoreUserHours: true,  allowExtra: false },  // 個人稼働時間帯を無視してでもカバー
    { bufferMin: 0,  ignoreUserHours: true,  allowExtra: true  },  // さらに1日2人の上限も超えてカバー
  ];
  const maxDailySlotsCov = getMaxHoursPerDaySlots_();

  const canCoverSlot = (day, dayIdx, uIdx, s, allowExtra) => {
    if (users[uIdx].isAdmin) return false;
    if (day.lockedCols[uIdx]) return false;            // 本人の列がロック
    if (!day.availability[uIdx][s]) return false;      // 個人稼働時間外 or 予定中
    if (isSpecialBlockedSlot(day, uIdx, s)) return false; // 特定予定の前後1時間は固定で除外
    if (day.assignment[s][uIdx]) return false;         // 既に本人の列に入っている
    // E厳守: 個人の予定時間(E)を超えない（E未設定=0は無制限）
    if (users[uIdx].targetSlots > 0 && userTotalSlots[uIdx] >= users[uIdx].targetSlots) return false;
    if (userDailySlots[dayIdx][uIdx] + 1 > maxDailySlotsCov) return false;  // 8h/日
    if (sumArray(userDailySlots[dayIdx]) + 1 > dailyCapSlots) return false; // チーム日上限
    if (!allowExtra && userDailySlots[dayIdx][uIdx] === 0) {
      let distinct = 0;
      for (let k = 0; k < users.length; k++) if (userDailySlots[dayIdx][k] > 0) distinct++;
      if (distinct >= getMaxPeoplePerDay_()) return false;
    }
    return true;
  };

  const contiguousUserBlockLength = (day, uIdx, startIdx, endExclusive) => {
    let left = startIdx;
    while (left - 1 >= 0 && !isLunchSlot[left - 1] && day.assignment[left - 1][uIdx] === users[uIdx].name) left--;
    let right = endExclusive;
    while (right < numSlots && !isLunchSlot[right] && day.assignment[right][uIdx] === users[uIdx].name) right++;
    return right - left;
  };

  const rollbackAssignedSlots = (day, dayIdx, uIdx, slots) => {
    slots.forEach(slotIdx => {
      if (day.assignment[slotIdx][uIdx] === users[uIdx].name) {
        day.assignment[slotIdx][uIdx] = '';
        userDailySlots[dayIdx][uIdx]--;
        userTotalSlots[uIdx]--;
      }
    });
  };

  const canAddCoverageCellForBlock = (day, dayIdx, uIdx, slotIdx, allowExtra, alreadyAdding) => {
    if (users[uIdx].isAdmin) return false;
    if (day.lockedCols[uIdx]) return false;
    if (slotIdx < 0 || slotIdx >= numSlots || isLunchSlot[slotIdx]) return false;

    if (day.assignment[slotIdx][uIdx] === users[uIdx].name) return true; // 既存の同一ユーザーブロックとして数える
    if (day.assignment[slotIdx][uIdx]) return false;
    if (!day.availability[uIdx][slotIdx]) return false;
    if (isSpecialBlockedSlot(day, uIdx, slotIdx)) return false;

    const nextAddCount = alreadyAdding + 1;
    if (users[uIdx].targetSlots > 0 && userTotalSlots[uIdx] + nextAddCount > users[uIdx].targetSlots) return false;
    if (userDailySlots[dayIdx][uIdx] + nextAddCount > maxDailySlotsCov) return false;
    if (sumArray(userDailySlots[dayIdx]) + nextAddCount > dailyCapSlots) return false;

    // 同時刻の人数上限（既定2＝3人以上を禁止）。カレンダー予定由来の重複は対象外。
    if (countOtherAssignedInSlot(day, uIdx, slotIdx) >= getMaxSameTimePeople_()) return false;
    // 同時禁止相手（ユーザー属性シート）とは同じ時間帯に同席させない。
    if (slotHasForbiddenPartnerFor_(day, uIdx, slotIdx, users)) return false;

    if (!allowExtra && userDailySlots[dayIdx][uIdx] === 0) {
      let distinct = 0;
      for (let k = 0; k < users.length; k++) if (userDailySlots[dayIdx][k] > 0) distinct++;
      if (distinct >= getMaxPeoplePerDay_()) return false;
    }
    return true;
  };

  const canAssignCoverageGapToAdjacentShift = (day, dayIdx, uIdx, runStart, runEndExclusive, allowExtra) => {
    const info = getAdjacentShiftInfo(day, uIdx, runStart, runEndExclusive);
    if (!info.hasAdjacent) return false;
    if (info.finalLen < getMinBlockSlots_()) return false;

    let addCount = 0;
    for (let k = runStart; k < runEndExclusive; k++) {
      if (k < 0 || k >= numSlots || isLunchSlot[k]) return false;
      if (day.assignment[k].some(v => v)) return false; // 穴だけを埋める。既にカバー済みの枠は増員しない。
      if (!canAddCoverageCellForBlock(day, dayIdx, uIdx, k, allowExtra, addCount)) return false;
      addCount++;
    }
    return addCount > 0;
  };

  const tryAssignCoverageGapToAdjacentShift = (day, dayIdx, uIdx, runStart, runEndExclusive, allowExtra) => {
    if (!canAssignCoverageGapToAdjacentShift(day, dayIdx, uIdx, runStart, runEndExclusive, allowExtra)) return 0;

    let added = 0;
    for (let k = runStart; k < runEndExclusive; k++) {
      day.assignment[k][uIdx] = users[uIdx].name;
      userDailySlots[dayIdx][uIdx]++;
      userTotalSlots[uIdx]++;
      adjacentGapFillCount++;
      added++;
    }
    return added;
  };

  /**
   * 未カバーslotを含む1時間以上の連続ブロックとして配置する。
   * 9:15〜9:30の朝会などで9:00台が分断されても、
   * 15分だけ入れるのではなく、9:00〜10:00を取れる人を選ぶ。
   */
  const tryAssignCoverageMinimumBlockContainingSlot = (day, dayIdx, uIdx, focusSlot, allowExtra) => {
    const minBlock = getMinBlockSlots_();
    const minStart = Math.max(0, focusSlot - minBlock + 1);
    const maxStart = Math.min(focusSlot, numSlots - minBlock);
    if (maxStart < minStart) return 0;

    const candidates = [];
    for (let start = minStart; start <= maxStart; start++) {
      let sameUserAlready = 0;
      let otherOccupiedSlots = 0;
      for (let k = start; k < start + minBlock; k++) {
        if (day.assignment[k][uIdx] === users[uIdx].name) sameUserAlready++;
        otherOccupiedSlots += countOtherAssignedInSlot(day, uIdx, k);
      }
      candidates.push({ start, sameUserAlready, otherOccupiedSlots });
    }
    candidates.sort((a, b) => {
      if (a.sameUserAlready !== b.sameUserAlready) return b.sameUserAlready - a.sameUserAlready;
      if (a.otherOccupiedSlots !== b.otherOccupiedSlots) return a.otherOccupiedSlots - b.otherOccupiedSlots;
      return a.start - b.start;
    });

    for (const cand of candidates) {
      const toAdd = [];
      let ok = true;
      for (let k = cand.start; k < cand.start + minBlock; k++) {
        if (!canAddCoverageCellForBlock(day, dayIdx, uIdx, k, allowExtra, toAdd.length)) {
          ok = false;
          break;
        }
        if (day.assignment[k][uIdx] !== users[uIdx].name) toAdd.push(k);
      }
      if (!ok || toAdd.length === 0) continue;

      toAdd.forEach(k => {
        day.assignment[k][uIdx] = users[uIdx].name;
        userDailySlots[dayIdx][uIdx]++;
        userTotalSlots[uIdx]++;
      });
      return toAdd.length;
    }

    strictBlockSkipCount++;
    return 0;
  };

  const tryAssignDailyMinBlock = (day, dayIdx, uIdx, startSlot, dailyMinSlots) => {
    const touched = [];
    const maxD = getMaxHoursPerDaySlots_();
    let j = startSlot;
    while (j < numSlots && (sumArray(userDailySlots[dayIdx]) < dailyMinSlots || touched.length < getMinBlockSlots_())) {
      if (isLunchSlot[j]) break;
      if (day.assignment[j][uIdx]) break;
      if (!day.availability[uIdx][j]) break;
      if (isSpecialBlockedSlot(day, uIdx, j)) break;
      if (userDailySlots[dayIdx][uIdx] + 1 > maxD) break;
      if (sumArray(userDailySlots[dayIdx]) + 1 > dailyCapSlots) break;
      if (users[uIdx].targetSlots > 0 && userTotalSlots[uIdx] >= users[uIdx].targetSlots) break;
      if (users[uIdx].mainRank === 3 && !day.assignment[j].some(v => v)) break;
      if (countOtherAssignedInSlot(day, uIdx, j) >= getMaxSameTimePeople_()) break; // 同時刻の人数上限（3人以上禁止）
      if (slotHasForbiddenPartnerFor_(day, uIdx, j, users)) break;                  // 同時禁止相手とは同席させない

      day.assignment[j][uIdx] = users[uIdx].name;
      userDailySlots[dayIdx][uIdx]++;
      userTotalSlots[uIdx]++;
      touched.push(j);
      j++;
    }
    if (touched.length === 0) return 0;

    const finalBlockLen = contiguousUserBlockLength(day, uIdx, touched[0], touched[touched.length - 1] + 1);
    if (finalBlockLen < getMinBlockSlots_()) {
      rollbackAssignedSlots(day, dayIdx, uIdx, touched);
      return 0;
    }
    return touched.length;
  };

  for (let ci = 0; ci < coverageLevels.length; ci++) {
    const clv = coverageLevels[ci];
    applyAvailability({ bufferMin: clv.bufferMin, ignoreEvents: false, ignoreUserHours: clv.ignoreUserHours });

    daysData.forEach((day, dayIdx) => {
      for (let s = 0; s < numSlots; s++) {
        if (isLunchSlot[s]) continue;
        if (day.assignment[s].some(v => v)) continue;   // 既にカバー済み

        const runStart = s;
        const runEnd = getUncoveredRunEnd(day, runStart);
        if (runEnd <= runStart) continue;

        // 1時間未満の穴は、新しい短時間シフトとして作らず、前後の既存シフトに吸収できる人だけで埋める。
        if (runEnd - runStart < getMinBlockSlots_()) {
          const adjacentCands = [];
          for (let uIdx = 0; uIdx < users.length; uIdx++) {
            if (canAssignCoverageGapToAdjacentShift(day, dayIdx, uIdx, runStart, runEnd, clv.allowExtra)) adjacentCands.push(uIdx);
          }
          adjacentCands.sort(compareAdjacentShiftFit(day, dayIdx, runStart, runEnd));
          let assigned = 0;
          for (const pick of adjacentCands) {
            assigned = tryAssignCoverageGapToAdjacentShift(day, dayIdx, pick, runStart, runEnd, clv.allowExtra);
            if (assigned > 0) break;
          }
          // 吸収できない短い穴は、単独端数も余分な1時間ブロックも作らず警告に回す。
          s = runEnd - 1;
          continue;
        }

        // 1時間以上の未カバー区間は、従来どおり1時間以上の連続ブロックで配置する。
        const cands = [];
        for (let uIdx = 0; uIdx < users.length; uIdx++) {
          if (canCoverSlot(day, dayIdx, uIdx, s, clv.allowExtra)) cands.push(uIdx);
        }
        if (cands.length === 0) continue;
        cands.sort((a, b) => {
          // 1人目（ソロ）優先: その日の主担当（メイン1/2の予定が少ない方）→その他→もう一方のメイン→メイン担当外
          const skA = dailyMainPriorityKey(users, day, a);
          const skB = dailyMainPriorityKey(users, day, b);
          if (skA !== skB) return skA - skB;
          const onA = userDailySlots[dayIdx][a] > 0 ? 0 : 1;
          const onB = userDailySlots[dayIdx][b] > 0 ? 0 : 1;
          if (onA !== onB) return onA - onB;               // 既に在席の人を優先（連続化）
          const busyA = day.busySlots ? day.busySlots[a] : 0;
          const busyB = day.busySlots ? day.busySlots[b] : 0;
          if (isMain12(users[a]) && isMain12(users[b]) && busyA !== busyB) return busyA - busyB;
          const rA = users[a].targetSlots > 0 ? userTotalSlots[a] / users[a].targetSlots : Infinity;
          const rB = users[b].targetSlots > 0 ? userTotalSlots[b] / users[b].targetSlots : Infinity;
          return rA - rB;
        });
        // 未カバーslotを含む1時間以上の連続ブロックで置ける人だけを採用する。
        for (const pick of cands) {
          const assigned = tryAssignCoverageMinimumBlockContainingSlot(day, dayIdx, pick, s, clv.allowExtra);
          if (assigned > 0) break;
        }
      }
    });

    // 全スロットがカバーできたか
    let allCovered = true;
    for (const day of daysData) {
      for (let s = 0; s < numSlots; s++) {
        if (isLunchSlot[s]) continue;
        if (!day.assignment[s].some(v => v)) { allCovered = false; break; }
      }
      if (!allCovered) break;
    }
    if (allCovered) break;
  }
  currentTotal = sumArray(userTotalSlots);

  // ===== 1日下限: 各日のチーム合計シフト時間を下限まで引き上げる（2人目はメイン担当外を優先） =====
  // カバー(最低1人)の上に、まだ下限に満たない日は人を重ねて下限に到達させる。
  // 2人目の増員はメイン担当外を最優先。E（予定時間）は超えない（E厳守）。予定への二重登録もしない。
  if (dailyMinSlots > 0) {
    applyAvailability({ bufferMin: 0, ignoreEvents: false, ignoreUserHours: true });
    daysData.forEach((day, dayIdx) => {
      // 2人目の優先: メイン担当外(rank3) → その他 → メイン担当1/2。同列は在席優先→達成率
      // メイン担当1/2まで使う必要がある場合は、その日の主担当（予定が少ない方）を先にする。
      const order = users.map((u, i) => i)
        .filter(i => !users[i].isAdmin)
        .sort((a, b) => {
          const skA = users[a].mainRank === 3 ? 0 : (users[a].mainRank === 0 ? 1 : 2);
          const skB = users[b].mainRank === 3 ? 0 : (users[b].mainRank === 0 ? 1 : 2);
          if (skA !== skB) return skA - skB;
          const leadA = day.mainLeadIdx === a ? 0 : 1;
          const leadB = day.mainLeadIdx === b ? 0 : 1;
          if (isMain12(users[a]) && isMain12(users[b]) && leadA !== leadB) return leadA - leadB;
          const onA = userDailySlots[dayIdx][a] > 0 ? 0 : 1;
          const onB = userDailySlots[dayIdx][b] > 0 ? 0 : 1;
          if (onA !== onB) return onA - onB;
          const rA = users[a].targetSlots > 0 ? userTotalSlots[a] / users[a].targetSlots : Infinity;
          const rB = users[b].targetSlots > 0 ? userTotalSlots[b] / users[b].targetSlots : Infinity;
          return rA - rB;
        });
      for (let oi = 0; oi < order.length; oi++) {
        if (sumArray(userDailySlots[dayIdx]) >= dailyMinSlots) break;
        const uIdx = order[oi];
        if (day.lockedCols[uIdx]) continue;
        // E厳守: 個人の予定時間(E)を超えない
        if (users[uIdx].targetSlots > 0 && userTotalSlots[uIdx] >= users[uIdx].targetSlots) continue;
        for (let s = 0; s < numSlots && sumArray(userDailySlots[dayIdx]) < dailyMinSlots; s++) {
          if (isLunchSlot[s]) continue;
          if (day.assignment[s][uIdx]) continue;        // 本人の列に既にある
          if (!day.availability[uIdx][s]) continue;     // 予定中（二重登録しない）
          if (isSpecialBlockedSlot(day, uIdx, s)) continue; // 特定予定の前後1時間は入れない
          tryAssignDailyMinBlock(day, dayIdx, uIdx, s, dailyMinSlots);
        }
      }
    });
    currentTotal = sumArray(userTotalSlots);
  }

  // ===== 最終フォールバック: 残った未割当て枠をメイン担当1/2で強制カバー =====
  // 方針: メイン担当1/2が「終日予定でなければ」、まだ未割当ての枠を
  //   前後（直前/直後）の自分のシフト・予定と連続する形で割り当てる。
  //   - 対象はメイン担当1/2のみ（管理者・ロック列・終日予定・週次非稼働の人は除外）
  //   - 前後に自分のシフト/予定があり連続できる人を最優先（端数でも連続として埋める）
  //   - 続いて その日の主担当 → 予定が少ない人 → 総量が少ない人 の順
  //   - 1時間ブロック縛りはこの最終手段では外す。8h/日・1日上限(H2)・同時間帯2人は維持。
  //   - 既定では予定と重複してでも埋める（E超過は ⚠ 表示）。重複させたくない場合は
  //     FINAL_FALLBACK_ALLOW_EVENT_OVERLAP を false にする（本人が実際に空いている枠だけ使う）。
  let finalFallbackCount = 0;
  {
    const FINAL_FALLBACK_ALLOW_EVENT_OVERLAP = getFinalFallbackAllowEventOverlap_();
    const fb12 = forceIdxs.filter(i => users[i].mainRank === 1 || users[i].mainRank === 2);
    if (fb12.length > 0) {
      daysData.forEach((day, dayIdx) => {
        // バッファ0・勤務時間無視。hardAvail[u][x]=false がその人の「予定中」スロット。
        const hardAvail = computeAvailabilityMatrix(users, day, timeSlots, 0, false, true);
        const eligible = fb12.filter(i =>
          !users[i].isAdmin &&
          !day.lockedCols[i] &&
          !isUserInactiveForDay_(day, i) &&
          !day.userEvents[i].some(ev => isAllDayEventSafe(ev))
        );
        if (eligible.length === 0) return;

        const busyAt = (u, x) => (x >= 0 && x < numSlots && !isLunchSlot[x] && !hardAvail[u][x]);
        const selfShiftAt = (u, x) => (x >= 0 && x < numSlots && !isLunchSlot[x] && day.assignment[x][u] === users[u].name);
        const contiguity = (u, runStart, runEndExclusive) => {
          const l = (selfShiftAt(u, runStart - 1) || busyAt(u, runStart - 1)) ? 1 : 0;
          const r = (selfShiftAt(u, runEndExclusive) || busyAt(u, runEndExclusive)) ? 1 : 0;
          return l + r;
        };

        const canForceCell = (uIdx, s) => {
          if (isLunchSlot[s]) return false;
          if (day.assignment[s][uIdx] === users[uIdx].name) return true;
          if (day.assignment[s][uIdx]) return false;
          if (isSpecialBlockedSlot(day, uIdx, s)) return false;                       // 特定予定±1hは最終手段でも厳守
          if (!FINAL_FALLBACK_ALLOW_EVENT_OVERLAP && !hardAvail[uIdx][s]) return false; // 予定重複を許さない設定時
          if (userDailySlots[dayIdx][uIdx] + 1 > maxDailySlotsCov) return false;        // 8h/日
          if (sumArray(userDailySlots[dayIdx]) + 1 > dailyCapSlots) return false;       // 1日上限(H2)
          if (countOtherAssignedInSlot(day, uIdx, s) >= getMaxSameTimePeople_()) return false; // 同時刻の人数上限（3人以上禁止）
          if (slotHasForbiddenPartnerFor_(day, uIdx, s, users)) return false;           // 同時禁止相手とは同席させない
          return true;
        };
        const placeCell = (uIdx, s) => {
          day.assignment[s][uIdx] = users[uIdx].name;
          day.forcedCells[s + '_' + uIdx] = true;
          userDailySlots[dayIdx][uIdx]++;
          userTotalSlots[uIdx]++;
          finalFallbackCount++;
        };

        let s = 0;
        while (s < numSlots) {
          if (isLunchSlot[s] || day.assignment[s].some(v => v)) { s++; continue; }
          const runStart = s;
          const runEnd = getUncoveredRunEnd(day, runStart);
          if (runEnd <= runStart) { s++; continue; }

          const ordered = eligible.slice().sort((a, b) => {
            const leadA = day.mainLeadIdx === a ? 0 : 1;
            const leadB = day.mainLeadIdx === b ? 0 : 1;
            if (leadA !== leadB) return leadA - leadB;                 // その日の主担当を優先
            const adjA = contiguity(a, runStart, runEnd);
            const adjB = contiguity(b, runStart, runEnd);
            if (adjA !== adjB) return adjB - adjA;                     // 前後の予定/シフトと連続する方を優先
            const busyA = day.busySlots ? day.busySlots[a] : 0;
            const busyB = day.busySlots ? day.busySlots[b] : 0;
            if (busyA !== busyB) return busyA - busyB;                 // 予定が少ない人
            if (userTotalSlots[a] !== userTotalSlots[b]) return userTotalSlots[a] - userTotalSlots[b];
            return users[a].mainRank - users[b].mainRank;
          });

          let filledHead = false;
          for (const uIdx of ordered) {
            let k = runStart;
            let placed = 0;
            while (k < runEnd && canForceCell(uIdx, k)) { placeCell(uIdx, k); placed++; k++; }
            if (placed > 0) { filledHead = true; break; }
          }
          // 先頭を埋めたら同位置から（残りを別candで継続）、誰も埋められなければ次スロットへ。
          s = filledHead ? runStart : runStart + 1;
        }
      });
      currentTotal = sumArray(userTotalSlots);
    }
  }

  // ===== 余り枠の最終割当（連続優先・全メンバー）★最後に実行 =====
  // ここまでのどの段階でも埋まらなかった「余った未割当ての連続区間」を、最後にまとめて割り当てる。
  //  ・1区間（連続した空き時間）は、できるだけ1人で連続して埋める（細切れにしない）。1人で無理なら
  //    左から最長で連続できる人を継ぎ足し、各人の担当が連続ブロックになるようにする。
  //  ・前後に自分の既存シフトがある人を優先し、その続きとして連続させる。
  //  ・対象は管理者・ロック列・終日予定・週次非稼働を除く全メンバー（メイン担当に限らない）。
  //  ・絶対に埋めるため、予定との重複・E（予定時間）超過・個人稼働時間帯(G/H)は無視する（最後の手段）。
  //    ただし「前後1hブロック(O2)」「8h/日」「1日上限(H2)」「同時刻2人まで」は維持する。
  let leftoverFillCount = 0;
  {
    const maxD = getMaxHoursPerDaySlots_();

    daysData.forEach((day, dayIdx) => {
      const eligible = users.map((u, i) => i).filter(i =>
        !users[i].isAdmin &&
        !day.lockedCols[i] &&
        !isUserInactiveForDay_(day, i) &&
        !day.userEvents[i].some(ev => isAllDayEventSafe(ev))
      );
      if (eligible.length === 0) return;

      const selfShiftAt = (u, x) =>
        (x >= 0 && x < numSlots && !isLunchSlot[x] && day.assignment[x][u] === users[u].name);

      // [from, to) の空き区間を uIdx が先頭から連続して何スロット埋められるか
      const canPlaceCount = (uIdx, from, to) => {
        let cnt = 0;
        for (let k = from; k < to; k++) {
          if (isLunchSlot[k]) break;
          if (day.assignment[k][uIdx] === users[uIdx].name) { cnt++; continue; }
          if (day.assignment[k].some(v => v)) break;                       // 穴だけを埋める
          if (isSpecialBlockedSlot(day, uIdx, k)) break;                   // 特定予定±1hは最後でも厳守
          if (userDailySlots[dayIdx][uIdx] + (cnt + 1) > maxD) break;      // 8h/日
          if (sumArray(userDailySlots[dayIdx]) + (cnt + 1) > dailyCapSlots) break; // 1日上限(H2)
          if (countOtherAssignedInSlot(day, uIdx, k) >= getMaxSameTimePeople_()) break; // 同時刻の人数上限（3人以上禁止）
          if (slotHasForbiddenPartnerFor_(day, uIdx, k, users)) break;      // 同時禁止相手とは同席させない
          cnt++;
        }
        return cnt;
      };

      const placeCount = (uIdx, from, count) => {
        for (let k = from; k < from + count; k++) {
          if (day.assignment[k][uIdx] === users[uIdx].name) continue;
          day.assignment[k][uIdx] = users[uIdx].name;
          day.forcedCells[k + '_' + uIdx] = true;
          userDailySlots[dayIdx][uIdx]++;
          userTotalSlots[uIdx]++;
          leftoverFillCount++;
        }
      };

      const cmp = (cursor) => (a, b) => {
        const adjA = selfShiftAt(a.uIdx, cursor - 1) ? 0 : 1;
        const adjB = selfShiftAt(b.uIdx, cursor - 1) ? 0 : 1;
        if (adjA !== adjB) return adjA - adjB;                  // 直前の自分のシフトと連続できる人を優先
        if (a.count !== b.count) return b.count - a.count;      // より長く連続で埋められる人
        const remA = users[a.uIdx].targetSlots > 0 ? users[a.uIdx].targetSlots - userTotalSlots[a.uIdx] : Infinity;
        const remB = users[b.uIdx].targetSlots > 0 ? users[b.uIdx].targetSlots - userTotalSlots[b.uIdx] : Infinity;
        if ((remA > 0) !== (remB > 0)) return (remB > 0) - (remA > 0); // E残がある人を優先（余り消化）
        if (userTotalSlots[a.uIdx] !== userTotalSlots[b.uIdx]) return userTotalSlots[a.uIdx] - userTotalSlots[b.uIdx];
        return a.uIdx - b.uIdx;
      };

      let s = 0;
      while (s < numSlots) {
        if (isLunchSlot[s] || day.assignment[s].some(v => v)) { s++; continue; }
        const runStart = s;
        const runEnd = getUncoveredRunEnd(day, runStart);
        const runLen = runEnd - runStart;
        if (runLen <= 0) { s++; continue; }

        // ① 区間全体を1人で連続して埋められる人がいれば丸ごと割り当て（最も連続）
        const whole = eligible
          .map(uIdx => ({ uIdx, count: canPlaceCount(uIdx, runStart, runEnd) }))
          .filter(c => c.count >= runLen)
          .sort((a, b) => {
            const adjA = (selfShiftAt(a.uIdx, runStart - 1) || selfShiftAt(a.uIdx, runEnd)) ? 0 : 1;
            const adjB = (selfShiftAt(b.uIdx, runStart - 1) || selfShiftAt(b.uIdx, runEnd)) ? 0 : 1;
            if (adjA !== adjB) return adjA - adjB;
            const remA = users[a.uIdx].targetSlots > 0 ? users[a.uIdx].targetSlots - userTotalSlots[a.uIdx] : Infinity;
            const remB = users[b.uIdx].targetSlots > 0 ? users[b.uIdx].targetSlots - userTotalSlots[b.uIdx] : Infinity;
            if ((remA > 0) !== (remB > 0)) return (remB > 0) - (remA > 0);
            if (userTotalSlots[a.uIdx] !== userTotalSlots[b.uIdx]) return userTotalSlots[a.uIdx] - userTotalSlots[b.uIdx];
            return a.uIdx - b.uIdx;
          });
        if (whole.length > 0) {
          placeCount(whole[0].uIdx, runStart, runLen);
          s = runEnd;
          continue;
        }

        // ② 1人で全部は無理 → 左から最長連続で継ぎ足し（各人の担当を連続ブロックに）
        let cursor = runStart;
        let guard = 0;
        while (cursor < runEnd && guard++ <= numSlots) {
          if (day.assignment[cursor].some(v => v)) { cursor++; continue; }
          const cands = eligible
            .map(uIdx => ({ uIdx, count: canPlaceCount(uIdx, cursor, runEnd) }))
            .filter(c => c.count > 0)
            .sort(cmp(cursor));
          if (cands.length === 0) { cursor++; continue; }
          placeCount(cands[0].uIdx, cursor, cands[0].count);
          cursor += cands[0].count;
        }
        s = runEnd;
      }
    });

    currentTotal = sumArray(userTotalSlots);
  }

  // ===== 日次ペア保証（1人だけの日を作らない） =====
  // ここまでの割当結果で「その日の担当者が1人だけ」の日が残っている場合、
  // 既にカバー済みの時間帯へ2人目を1時間以上の連続ブロックで追加する。
  //  ・2人目はメイン担当外(rank3) → その他 → メイン担当1/2 の順で優先する。
  //  ・まずE目標・月間目標(G2)の範囲内で追加し、無理な場合だけ最後の手段としてE/G2超過を許可する。
  //  ・前後1hブロック(O2)・終日予定・ロック列・管理者・8h/日・1日上限(H2)・同時刻2人まで は維持する。
  let dailyPairTopUpCount = 0;
  const dailyPairTopUpByLevel = [0, 0, 0, 0];
  {
    const maxD = getMaxHoursPerDaySlots_();

    const assignedUserIdxsForDay = (dayIdx) => {
      const idxs = [];
      for (let i = 0; i < users.length; i++) {
        if (!users[i].isAdmin && userDailySlots[dayIdx][i] > 0) idxs.push(i);
      }
      return idxs;
    };

    const remainingTeamRoom = () => Math.max(0, monthlyTargetSlots - sumArray(userTotalSlots));
    const remainingUserRoom = (uIdx) => users[uIdx].targetSlots > 0
      ? Math.max(0, users[uIdx].targetSlots - userTotalSlots[uIdx])
      : Number.MAX_SAFE_INTEGER;

    const pairLevels = [
      { label: 'E/G2内・予定なし・個人時間内', allowEventOverlap: false, ignoreUserHours: false, allowUserOverTarget: false, allowTeamOverTarget: false },
      { label: 'E/G2内・予定なし・個人時間帯無視', allowEventOverlap: false, ignoreUserHours: true,  allowUserOverTarget: false, allowTeamOverTarget: false },
      { label: 'E/G2内・予定重複あり・個人時間帯無視', allowEventOverlap: true,  ignoreUserHours: true,  allowUserOverTarget: false, allowTeamOverTarget: false },
      { label: '最終手段・E/G2超過あり', allowEventOverlap: true,  ignoreUserHours: true,  allowUserOverTarget: true,  allowTeamOverTarget: true  },
    ];

    const isSoloDay = (dayIdx) => assignedUserIdxsForDay(dayIdx).length === 1;

    const canPairCell = (day, dayIdx, uIdx, s, level, hardAvail, alreadyAdding) => {
      if (s < 0 || s >= numSlots || isLunchSlot[s]) return false;
      if (users[uIdx].isAdmin) return false;
      if (day.lockedCols[uIdx]) return false;
      if (day.userEvents[uIdx].some(ev => isAllDayEventSafe(ev))) return false;
      if (userDailySlots[dayIdx][uIdx] > 0) return false;                // 2人目として新規参加する人だけ
      if (!day.assignment[s].some(v => v)) return false;                 // 既に1人目がいる時間帯に重ねる
      if (day.assignment[s][uIdx]) return false;
      if (!hardAvail[uIdx][s]) return false;                             // 通常予定 or 個人時間帯（levelに応じて緩和）
      if (isSpecialBlockedSlot(day, uIdx, s)) return false;               // 特定予定±1hは最後でも厳守
      if (countOtherAssignedInSlot(day, uIdx, s) >= getMaxSameTimePeople_()) return false; // 同時刻の人数上限
      if (slotHasForbiddenPartnerFor_(day, uIdx, s, users)) return false; // 同時禁止相手とは同席させない

      const nextAdd = alreadyAdding + 1;
      if (!level.allowUserOverTarget && remainingUserRoom(uIdx) < nextAdd) return false;
      if (!level.allowTeamOverTarget && remainingTeamRoom() < nextAdd) return false;
      if (userDailySlots[dayIdx][uIdx] + nextAdd > maxD) return false;    // 8h/日
      if (sumArray(userDailySlots[dayIdx]) + nextAdd > dailyCapSlots) return false; // 1日上限(H2)
      return true;
    };

    const collectPairCandidatesForDay = (day, dayIdx, level, hardAvail) => {
      const current = assignedUserIdxsForDay(dayIdx);
      if (current.length !== 1) return [];
      const soloIdx = current[0];
      const candidates = [];

      users.forEach((user, uIdx) => {
        if (uIdx === soloIdx) return;
        if (users[uIdx].isAdmin || day.lockedCols[uIdx]) return;
        if (day.userEvents[uIdx].some(ev => isAllDayEventSafe(ev))) return;
        if (userDailySlots[dayIdx][uIdx] > 0) return;

        let s = 0;
        while (s < numSlots) {
          while (s < numSlots && !canPairCell(day, dayIdx, uIdx, s, level, hardAvail, 0)) s++;
          if (s >= numSlots) break;

          const runStart = s;
          let runLen = 0;
          while (s < numSlots && canPairCell(day, dayIdx, uIdx, s, level, hardAvail, runLen)) {
            runLen++;
            s++;
          }
          if (runLen < getMinBlockSlots_()) continue;

          const userRoom = level.allowUserOverTarget ? Number.MAX_SAFE_INTEGER : remainingUserRoom(uIdx);
          const teamRoom = level.allowTeamOverTarget ? Number.MAX_SAFE_INTEGER : remainingTeamRoom();
          const dailyRoom = Math.max(0, maxD - userDailySlots[dayIdx][uIdx]);
          const dayRoom = Math.max(0, dailyCapSlots - sumArray(userDailySlots[dayIdx]));
          const placeable = Math.min(getMinBlockSlots_(), runLen, userRoom, teamRoom, dailyRoom, dayRoom);
          if (placeable < getMinBlockSlots_()) continue;

          const roleScore = users[uIdx].mainRank === 3 ? 0 : (users[uIdx].mainRank === 0 ? 1 : 2);
          const leadScore = day.mainLeadIdx === uIdx ? 0 : 1;
          const ratio = users[uIdx].targetSlots > 0 ? userTotalSlots[uIdx] / users[uIdx].targetSlots : 0;
          const userNeed = users[uIdx].targetSlots > 0 ? remainingUserRoom(uIdx) : Number.MAX_SAFE_INTEGER;
          candidates.push({
            dayIdx,
            uIdx,
            start: runStart,
            count: getMinBlockSlots_(),
            runLen,
            roleScore,
            leadScore,
            ratio,
            userNeed,
          });
        }
      });

      candidates.sort((a, b) => {
        if (a.roleScore !== b.roleScore) return a.roleScore - b.roleScore;           // 2人目はメイン担当外を優先
        if (a.ratio !== b.ratio) return a.ratio - b.ratio;                           // 達成率が低い人
        if (a.userNeed !== b.userNeed) return b.userNeed - a.userNeed;               // E残が大きい人
        if (a.runLen !== b.runLen) return b.runLen - a.runLen;                       // 長く置ける余地
        if (isMain12(users[a.uIdx]) && isMain12(users[b.uIdx]) && a.leadScore !== b.leadScore) return a.leadScore - b.leadScore;
        return a.start - b.start;
      });
      return candidates;
    };

    const placePairCandidate = (cand) => {
      const day = daysData[cand.dayIdx];
      let added = 0;
      for (let k = cand.start; k < cand.start + cand.count; k++) {
        if (day.assignment[k][cand.uIdx]) break;
        day.assignment[k][cand.uIdx] = users[cand.uIdx].name;
        day.forcedCells[k + '_' + cand.uIdx] = true;
        userDailySlots[cand.dayIdx][cand.uIdx]++;
        userTotalSlots[cand.uIdx]++;
        dailyPairTopUpCount++;
        added++;
      }
      return added;
    };

    for (let lv = 0; lv < pairLevels.length; lv++) {
      const level = pairLevels[lv];
      const hardAvailByDay = daysData.map(day =>
        computeAvailabilityMatrix(users, day, timeSlots, 0, level.allowEventOverlap, level.ignoreUserHours)
      );

      let guard = 0;
      while (guard++ < daysData.length + users.length + 10) {
        const soloDayIdxs = daysData.map((_, dayIdx) => dayIdx).filter(dayIdx => isSoloDay(dayIdx));
        if (soloDayIdxs.length === 0) break;

        let placedAny = false;
        soloDayIdxs.forEach(dayIdx => {
          if (!isSoloDay(dayIdx)) return;
          const day = daysData[dayIdx];
          const candidates = collectPairCandidatesForDay(day, dayIdx, level, hardAvailByDay[dayIdx]);
          if (candidates.length === 0) return;
          const added = placePairCandidate(candidates[0]);
          if (added > 0) {
            dailyPairTopUpByLevel[lv] += added;
            placedAny = true;
          }
        });
        if (!placedAny) break;
      }
    }

    currentTotal = sumArray(userTotalSlots);
  }

  // ===== 月間目標不足の最終上乗せ（2人目枠・連続優先） =====
  // 全時間帯を最低1人でカバーできていても、月間目標(G2)に届かない場合がある。
  // その不足分は「既に誰かが入っている時間帯」に2人目として追加し、担当別E目標の残りを埋める。
  //  ・E目標が残っている人を優先し、原則Eは超えない。
  //  ・連続ブロックを優先し、既存の自分のシフトに隣接できる場合は端数も吸収する。
  //  ・まず予定なしで追加し、足りない場合だけ予定重複も許可する。
  //  ・前後1hブロック(O2)・終日予定・ロック列・管理者・週次非稼働・8h/日・1日上限(H2)・同時刻2人まで は維持する。
  let targetTopUpCount = 0;
  const targetTopUpByLevel = [0, 0, 0];
  {
    const maxD = getMaxHoursPerDaySlots_();
    const remainingTeamNeed = () => Math.max(0, monthlyTargetSlots - sumArray(userTotalSlots));
    const remainingUserNeed = (uIdx) => users[uIdx].targetSlots > 0
      ? Math.max(0, users[uIdx].targetSlots - userTotalSlots[uIdx])
      : 0;

    const topUpLevels = [
      { label: '予定なし・個人時間内', allowEventOverlap: false, ignoreUserHours: false },
      { label: '予定なし・個人時間帯無視', allowEventOverlap: false, ignoreUserHours: true },
      { label: '予定重複あり・個人時間帯無視', allowEventOverlap: true, ignoreUserHours: true },
    ];

    const isEligibleTopUpUser = (day, uIdx) =>
      !users[uIdx].isAdmin &&
      !day.lockedCols[uIdx] &&
      !isUserInactiveForDay_(day, uIdx) &&
      !day.userEvents[uIdx].some(ev => isAllDayEventSafe(ev)) &&
      remainingUserNeed(uIdx) > 0;

    const canTopUpCell = (day, dayIdx, uIdx, s, level, hardAvail, alreadyAdding) => {
      if (remainingTeamNeed() <= 0) return false;
      if (!isEligibleTopUpUser(day, uIdx)) return false;
      if (s < 0 || s >= numSlots || isLunchSlot[s]) return false;
      if (!day.assignment[s].some(v => v)) return false;                 // 2人目として上乗せする
      if (day.assignment[s][uIdx]) return false;                          // 本人列が空いていること
      if (isSpecialBlockedSlot(day, uIdx, s)) return false;               // 特定予定±1hは最後でも厳守
      if (!level.allowEventOverlap && !hardAvail[uIdx][s]) return false;  // 予定なし優先
      if (countOtherAssignedInSlot(day, uIdx, s) >= getMaxSameTimePeople_()) return false; // 同時刻の人数上限
      if (slotHasForbiddenPartnerFor_(day, uIdx, s, users)) return false; // 同時禁止相手とは同席させない

      const nextAdd = alreadyAdding + 1;
      if (remainingUserNeed(uIdx) < nextAdd) return false;                // 原則E目標は超えない
      if (remainingTeamNeed() < nextAdd) return false;                    // 月間目標を超えない
      if (userDailySlots[dayIdx][uIdx] + nextAdd > maxD) return false;    // 8h/日
      if (sumArray(userDailySlots[dayIdx]) + nextAdd > dailyCapSlots) return false; // 1日上限(H2)
      return true;
    };

    const collectTopUpCandidates = (level, hardAvailByDay) => {
      const candidates = [];
      const teamNeed = remainingTeamNeed();
      if (teamNeed <= 0) return candidates;

      daysData.forEach((day, dayIdx) => {
        const hardAvail = hardAvailByDay[dayIdx];
        const dayRoom = Math.max(0, dailyCapSlots - sumArray(userDailySlots[dayIdx]));
        if (dayRoom <= 0) return;

        users.forEach((user, uIdx) => {
          if (!isEligibleTopUpUser(day, uIdx)) return;
          const userNeed = remainingUserNeed(uIdx);
          const dailyRoom = Math.max(0, maxD - userDailySlots[dayIdx][uIdx]);
          const maxNeededHere = Math.min(teamNeed, userNeed, dayRoom, dailyRoom);
          if (maxNeededHere <= 0) return;

          let s = 0;
          while (s < numSlots) {
            while (s < numSlots && !canTopUpCell(day, dayIdx, uIdx, s, level, hardAvail, 0)) s++;
            if (s >= numSlots) break;

            const runStart = s;
            let runLen = 0;
            while (s < numSlots && runLen < maxNeededHere && canTopUpCell(day, dayIdx, uIdx, s, level, hardAvail, runLen)) {
              runLen++;
              s++;
            }
            if (runLen <= 0) { s++; continue; }

            const leftLen = getSameUserLeftShiftLength(day, uIdx, runStart);
            const rightLen = getSameUserRightShiftLength(day, uIdx, runStart + runLen);
            const adjacentLen = leftLen + rightLen;
            const canAttach = adjacentLen > 0;
            const minNeeded = canAttach || Math.min(teamNeed, userNeed) < getMinBlockSlots_() ? 1 : getMinBlockSlots_();
            const placeable = Math.min(runLen, teamNeed, userNeed, dayRoom, dailyRoom);

            if (placeable >= minNeeded) {
              const ratio = users[uIdx].targetSlots > 0 ? userTotalSlots[uIdx] / users[uIdx].targetSlots : Infinity;
              candidates.push({
                dayIdx,
                uIdx,
                start: runStart,
                count: placeable,
                runLen,
                canAttach,
                adjacentLen,
                ratio,
                userNeed,
                dayTotal: sumArray(userDailySlots[dayIdx]),
              });
            }
          }
        });
      });

      candidates.sort((a, b) => {
        if (a.canAttach !== b.canAttach) return (b.canAttach ? 1 : 0) - (a.canAttach ? 1 : 0); // 既存シフトへ連続吸収
        if (a.count !== b.count) return b.count - a.count;                                     // 長く連続で足せる
        if (a.userNeed !== b.userNeed) return b.userNeed - a.userNeed;                         // E残が大きい人
        if (a.ratio !== b.ratio) return a.ratio - b.ratio;                                     // 達成率が低い人
        if (a.adjacentLen !== b.adjacentLen) return b.adjacentLen - a.adjacentLen;
        if (a.dayTotal !== b.dayTotal) return a.dayTotal - b.dayTotal;
        return a.uIdx - b.uIdx;
      });
      return candidates;
    };

    const placeTopUp = (cand) => {
      const day = daysData[cand.dayIdx];
      let added = 0;
      for (let k = cand.start; k < cand.start + cand.count; k++) {
        if (remainingTeamNeed() <= 0 || remainingUserNeed(cand.uIdx) <= 0) break;
        if (day.assignment[k][cand.uIdx]) break;
        day.assignment[k][cand.uIdx] = users[cand.uIdx].name;
        day.forcedCells[k + '_' + cand.uIdx] = true;
        userDailySlots[cand.dayIdx][cand.uIdx]++;
        userTotalSlots[cand.uIdx]++;
        targetTopUpCount++;
        added++;
      }
      return added;
    };

    for (let lv = 0; lv < topUpLevels.length && remainingTeamNeed() > 0; lv++) {
      const level = topUpLevels[lv];
      const hardAvailByDay = daysData.map(day =>
        computeAvailabilityMatrix(users, day, timeSlots, 0, false, level.ignoreUserHours)
      );

      let guard = 0;
      while (remainingTeamNeed() > 0 && guard++ < 1000) {
        const candidates = collectTopUpCandidates(level, hardAvailByDay);
        if (candidates.length === 0) break;
        const added = placeTopUp(candidates[0]);
        if (added <= 0) break;
        targetTopUpByLevel[lv] += added;
      }
    }

    currentTotal = sumArray(userTotalSlots);
  }

  // ===== 週次担当で「この週は非稼働」のメンバーへ、強制カバー等で入った自動シフトを取り消す =====
  // ここまでの各「最後の手段」ブロックは isUserInactiveForDay_ で事前に除外しているため、
  // 通常はこのパスで何も取り消されない想定だが、見落としの保険として最後にもう一度確認する。
  // 既存シフト/ロック分（保持対象）はそのまま残す。
  daysData.forEach((day, dayIdx) => {
    if (!day.activeUserFlags) return;
    for (let c = 0; c < users.length; c++) {
      if (day.activeUserFlags[c] !== false) continue;
      const preserveExisting = day.lockedCols[c] || preserveManual;
      for (let s = 0; s < numSlots; s++) {
        if (day.assignment[s][c] !== users[c].name) continue;
        const wasExisting = String((day.existingShifts[s] && day.existingShifts[s][c]) || '').trim() === users[c].name;
        if (preserveExisting && wasExisting) continue;
        day.assignment[s][c] = '';
        delete day.forcedCells[s + '_' + c];
        userDailySlots[dayIdx][c]--;
        userTotalSlots[c]--;
      }
    }
  });
  currentTotal = sumArray(userTotalSlots);

  // ===== 単独禁止ユーザーが、実際に1人きりの時間帯を作らないようにする =====
  // 「ユーザー属性」シートで単独禁止が指定された人は、割り当てられた時間帯の間、必ずもう1人以上が
  // 同時に入っているようにする（日全体の人数ではなく、時間帯（スロット）単位でチェックする）。
  //  ・まずE/G2の範囲内でペア相手を追加できないか試す（予定なし→個人時間帯無視→予定重複あり）。
  //  ・それでも見つからない場合のみ、最終手段としてE/G2超過を許可してペア相手を追加する。
  //  ・それでも誰も追加できず、かつロック列でない場合は、本人をその時間帯から外す（警告に出す）。
  //  ・ロック列（手動固定）の場合は自動では外さず、警告のみ出す。
  let noSoloPairedCount = 0;
  let noSoloRemovedCount = 0;
  {
    const noSoloIdxSet = getNoSoloUserIdxSet_(users);
    if (noSoloIdxSet.size > 0) {
      const maxDNoSolo = getMaxHoursPerDaySlots_();
      const remainingTeamRoomNoSolo = () => Math.max(0, monthlyTargetSlots - sumArray(userTotalSlots));
      const remainingUserRoomNoSolo = (uIdx) => users[uIdx].targetSlots > 0
        ? Math.max(0, users[uIdx].targetSlots - userTotalSlots[uIdx])
        : Number.MAX_SAFE_INTEGER;

      const noSoloPartnerLevels = [
        { allowEventOverlap: false, ignoreUserHours: false, allowOverTarget: false },
        { allowEventOverlap: false, ignoreUserHours: true,  allowOverTarget: false },
        { allowEventOverlap: true,  ignoreUserHours: true,  allowOverTarget: false },
        { allowEventOverlap: true,  ignoreUserHours: true,  allowOverTarget: true  },
      ];

      // [runStart, runEnd) で soloIdx が「他の誰もいない」状態になっている連続区間を検出する。
      const findSoloRuns_ = (day, uIdx) => {
        const runs = [];
        let runStart = -1;
        for (let s = 0; s <= numSlots; s++) {
          const isSolo = s < numSlots &&
            day.assignment[s][uIdx] === users[uIdx].name &&
            !isLunchSlot[s] &&
            !day.assignment[s].some((v, c) => c !== uIdx && v);
          if (isSolo && runStart === -1) runStart = s;
          if ((!isSolo || s === numSlots) && runStart !== -1) {
            runs.push([runStart, s]);
            runStart = -1;
          }
        }
        return runs;
      };

      const canPartnerCellNoSolo_ = (day, dayIdx, uIdx, soloIdx, s, level, hardAvail, alreadyAdding) => {
        if (uIdx === soloIdx) return false;
        if (users[uIdx].isAdmin) return false;
        if (day.lockedCols[uIdx]) return false;
        if (isUserInactiveForDay_(day, uIdx)) return false;
        if (day.userEvents[uIdx].some(ev => isAllDayEventSafe(ev))) return false;
        if (day.assignment[s][uIdx]) return false;
        if (!hardAvail[uIdx][s]) return false;
        if (isSpecialBlockedSlot(day, uIdx, s)) return false;
        if (countOtherAssignedInSlot(day, uIdx, s) >= getMaxSameTimePeople_()) return false; // 同時刻の人数上限
        if (slotHasForbiddenPartnerFor_(day, uIdx, s, users)) return false; // 同時禁止相手とは同席させない

        const nextAdd = alreadyAdding + 1;
        if (!level.allowOverTarget && remainingUserRoomNoSolo(uIdx) < nextAdd) return false;
        if (!level.allowOverTarget && remainingTeamRoomNoSolo() < nextAdd) return false;
        if (userDailySlots[dayIdx][uIdx] + nextAdd > maxDNoSolo) return false;
        if (sumArray(userDailySlots[dayIdx]) + nextAdd > dailyCapSlots) return false;
        return true;
      };

      const tryPairRunNoSolo_ = (day, dayIdx, soloIdx, runStart, runEnd, level, hardAvail) => {
        // 区間全体を1人で連続して埋められる候補だけを対象にする（分断しない）。
        const candidates = users.map((u, i) => i).filter(i => {
          for (let k = runStart; k < runEnd; k++) {
            if (!canPartnerCellNoSolo_(day, dayIdx, i, soloIdx, k, level, hardAvail, k - runStart)) return false;
          }
          return true;
        });
        if (candidates.length === 0) return false;

        candidates.sort((a, b) => {
          const busyA = day.busySlots ? day.busySlots[a] : 0;
          const busyB = day.busySlots ? day.busySlots[b] : 0;
          if (busyA !== busyB) return busyA - busyB;
          const rA = users[a].targetSlots > 0 ? userTotalSlots[a] / users[a].targetSlots : Infinity;
          const rB = users[b].targetSlots > 0 ? userTotalSlots[b] / users[b].targetSlots : Infinity;
          return rA - rB;
        });

        const pick = candidates[0];
        for (let k = runStart; k < runEnd; k++) {
          day.assignment[k][pick] = users[pick].name;
          day.forcedCells[k + '_' + pick] = true;
          userDailySlots[dayIdx][pick]++;
          userTotalSlots[pick]++;
          noSoloPairedCount++;
        }
        return true;
      };

      daysData.forEach((day, dayIdx) => {
        noSoloIdxSet.forEach(soloIdx => {
          if (users[soloIdx].isAdmin) return;
          const runs = findSoloRuns_(day, soloIdx);
          if (runs.length === 0) return;

          runs.forEach(([runStart, runEnd]) => {
            // 前段の処理で状況が変わっている可能性があるため、実行直前に再確認する。
            let stillSolo = true;
            for (let k = runStart; k < runEnd; k++) {
              if (day.assignment[k][soloIdx] !== users[soloIdx].name || day.assignment[k].some((v, c) => c !== soloIdx && v)) {
                stillSolo = false;
                break;
              }
            }
            if (!stillSolo) return;

            let paired = false;
            for (let lv = 0; lv < noSoloPartnerLevels.length && !paired; lv++) {
              const level = noSoloPartnerLevels[lv];
              const hardAvail = computeAvailabilityMatrix(users, day, timeSlots, 0, level.allowEventOverlap, level.ignoreUserHours);
              paired = tryPairRunNoSolo_(day, dayIdx, soloIdx, runStart, runEnd, level, hardAvail);
            }

            if (paired) return;

            if (day.lockedCols[soloIdx]) {
              warnings.push(`${day.dateStr} ${timeSlots[runStart]}〜${slotEndTime(timeSlots, runEnd - 1)}: ${users[soloIdx].name}さんは単独禁止指定ですが、ロック列のため自動では外せませんでした。ペア相手を手動で追加してください`);
              return;
            }
            for (let k = runStart; k < runEnd; k++) {
              if (day.assignment[k][soloIdx] !== users[soloIdx].name) continue;
              day.assignment[k][soloIdx] = '';
              delete day.forcedCells[k + '_' + soloIdx];
              userDailySlots[dayIdx][soloIdx]--;
              userTotalSlots[soloIdx]--;
              noSoloRemovedCount++;
            }
            warnings.push(`${day.dateStr} ${timeSlots[runStart]}〜${slotEndTime(timeSlots, runEnd - 1)}: ${users[soloIdx].name}さんは単独禁止指定のため、ペア相手が見つからずこの時間帯から外しました（要確認）`);
          });
        });
      });

      currentTotal = sumArray(userTotalSlots);
    }
  }

  // ===== 絶対カバー: 未カバーの時間帯が無くなるまで数周する =====
  // 通常のカバー・最終手段でも埋まらない時間帯が残った場合、ここで何周かして必ず担当を入れる。
  // 早い周はチーム1日上限(H2)を守り、それでも埋まらない周からはH2超過を許可する。
  //  ・8h/日・終日予定・ロック列・管理者・週次非稼働・特定予定±1h・同時禁止相手・同時刻上限 は最後まで維持する。
  //  ・8h/日や全員予定などで物理的に埋められない枠だけは、この後の「未カバー」警告に残す。
  let guaranteedCoverCount = 0;
  {
    const maxD = getMaxHoursPerDaySlots_();
    const maxPasses = numSlots + 4;
    // 予定ベースの空き状況・対象者は各日固定なので、周回の外で一度だけ計算する。
    const hardAvailByDay = daysData.map(day => computeAvailabilityMatrix(users, day, timeSlots, 0, false, true));
    const eligibleByDay = daysData.map(day => users.map((u, i) => i).filter(i =>
      !users[i].isAdmin &&
      !day.lockedCols[i] &&
      !isUserInactiveForDay_(day, i) &&
      !day.userEvents[i].some(ev => isAllDayEventSafe(ev))
    ));

    for (let pass = 0; pass < maxPasses; pass++) {
      const allowOverDailyCap = pass >= 2; // 3周目以降はチーム1日上限(H2)を超過してよい
      let filledThisPass = false;
      let anyUncovered = false;

      daysData.forEach((day, dayIdx) => {
        const hardAvail = hardAvailByDay[dayIdx];
        const eligible = eligibleByDay[dayIdx];
        if (eligible.length === 0) return;
        const selfShiftAt = (u, x) => (x >= 0 && x < numSlots && !isLunchSlot[x] && day.assignment[x][u] === users[u].name);

        for (let s = 0; s < numSlots; s++) {
          if (isLunchSlot[s] || day.assignment[s].some(v => v)) continue;
          anyUncovered = true;
          const cands = eligible.filter(uIdx => {
            if (day.assignment[s][uIdx]) return false;
            if (!hardAvail[uIdx][s]) return false;                                        // 本人の実予定には重ねない（二重登録しない）
            if (isSpecialBlockedSlot(day, uIdx, s)) return false;                         // 特定予定±1hは厳守
            if (userDailySlots[dayIdx][uIdx] + 1 > maxD) return false;                    // 8h/日は維持
            if (!allowOverDailyCap && sumArray(userDailySlots[dayIdx]) + 1 > dailyCapSlots) return false;
            if (countOtherAssignedInSlot(day, uIdx, s) >= getMaxSameTimePeople_()) return false; // 空き枠なので実質0
            if (slotHasForbiddenPartnerFor_(day, uIdx, s, users)) return false;           // 同時禁止相手
            return true;
          });
          if (cands.length === 0) continue;
          cands.sort((a, b) => {
            const adjA = (selfShiftAt(a, s - 1) || selfShiftAt(a, s + 1)) ? 0 : 1;
            const adjB = (selfShiftAt(b, s - 1) || selfShiftAt(b, s + 1)) ? 0 : 1;
            if (adjA !== adjB) return adjA - adjB;                                          // 前後の自分のシフトと連続する人を優先
            if (userDailySlots[dayIdx][a] !== userDailySlots[dayIdx][b]) return userDailySlots[dayIdx][a] - userDailySlots[dayIdx][b];
            return userTotalSlots[a] - userTotalSlots[b];
          });
          const pick = cands[0];
          day.assignment[s][pick] = users[pick].name;
          day.forcedCells[s + '_' + pick] = true;
          userDailySlots[dayIdx][pick]++;
          userTotalSlots[pick]++;
          guaranteedCoverCount++;
          filledThisPass = true;
        }
      });

      if (!anyUncovered) break;
      if (!filledThisPass && allowOverDailyCap) break; // これ以上は8h/終日/ロック等の制約で埋められない
    }
    currentTotal = sumArray(userTotalSlots);
  }

  // ===== 主担当（その日で一番シフト時間が長い人）を決定する =====
  // 表示（4行目・予定側のチェックボックス）と、次の「飛び飛びまとめ」で動かさない対象の判定に使う。
  daysData.forEach((day, dayIdx) => {
    let leadIdx = -1;
    let leadSlots = -1;
    for (let i = 0; i < users.length; i++) {
      if (users[i].isAdmin) continue;
      const slots = userDailySlots[dayIdx][i] || 0;
      if (slots <= 0) continue;
      // 同数の場合は、内部の主担当優先(mainLeadIdx)→予定が少ない→index順 で決める。
      let better = slots > leadSlots;
      if (!better && slots === leadSlots && leadIdx >= 0) {
        const iIsLead = day.mainLeadIdx === i ? 0 : 1;
        const cIsLead = day.mainLeadIdx === leadIdx ? 0 : 1;
        if (iIsLead !== cIsLead) better = iIsLead < cIsLead;
        else {
          const bi = (day.busySlots && day.busySlots[i]) || 0;
          const bc = (day.busySlots && day.busySlots[leadIdx]) || 0;
          if (bi !== bc) better = bi < bc;
        }
      }
      if (better) { leadSlots = slots; leadIdx = i; }
    }
    day.mainDisplayIdx = leadIdx; // 担当者がいない日は -1
  });

  // ===== 飛び飛びシフトの最終まとめ（主担当以外・カバー人数は変えない入れ替え） =====
  // 各時間帯の合計人数（カバー）と各人の合計時間は一切変えずに、担当者を入れ替えて
  // 各人のシフトができるだけ連続ブロックになるように調整する。
  //  ・主担当（その日で一番長い人）・管理者・ロック列・カレンダー予定/手動で固定のセルは動かさない。
  //  ・入れ替え先は本人が実際に空いている時間のみ。特定予定±1h・同時禁止相手は維持。
  let defragSwapCount = 0;
  {
    const forbiddenMap = getForbiddenPartnersMap_(users);
    daysData.forEach((day, dayIdx) => {
      const leadIdx = day.mainDisplayIdx;
      // 入れ替え先は「本人が実際に空いていて、かつ本人の稼働時間帯(G/H)内」の時間のみ。
      const swapAvail = computeAvailabilityMatrix(users, day, timeSlots, 0, false, false);

      const movable = (uIdx) =>
        uIdx !== leadIdx && !users[uIdx].isAdmin && !day.lockedCols[uIdx];

      // uIdx を x に置けるか（入れ替え先として妥当か）
      const canOccupy = (uIdx, x) => {
        if (x < 0 || x >= numSlots || isLunchSlot[x]) return false;
        if (!swapAvail[uIdx][x]) return false;                 // 実際に空いている時間のみ
        if (isSpecialBlockedSlot(day, uIdx, x)) return false;  // 特定予定±1hは厳守
        return true;
      };
      // uIdx を x に置くと、x に残る他者と同時禁止に該当するか（excludeColは入れ替えで抜ける人）
      const forbidWith = (uIdx, x, excludeCol) => {
        const f = forbiddenMap[uIdx];
        if (!f || f.size === 0) return false;
        const row = day.assignment[x];
        for (let c = 0; c < row.length; c++) {
          if (c === uIdx || c === excludeCol) continue;
          if (row[c] && f.has(c)) return true;
        }
        return false;
      };
      // uIdx の連続ブロック数（昼休み・空きで途切れる）
      const blockCount = (uIdx) => {
        let cnt = 0, inBlock = false;
        for (let s = 0; s < numSlots; s++) {
          const on = !isLunchSlot[s] && day.assignment[s][uIdx] === users[uIdx].name;
          if (on && !inBlock) cnt++;
          inBlock = on;
        }
        return cnt;
      };
      const isFixed = (uIdx, s) => day.fixedCells[s + '_' + uIdx] === true;
      const onAt = (uIdx, s) => (s >= 0 && s < numSlots && !isLunchSlot[s] && day.assignment[s][uIdx] === users[uIdx].name);

      let improved = true;
      let guard = 0;
      const guardMax = numSlots * users.length * 4 + 50;
      while (improved && guard++ < guardMax) {
        improved = false;

        for (let a = 0; a < users.length && !improved; a++) {
          if (!movable(a)) continue;
          if (blockCount(a) <= 1) continue; // 既にまとまっている人は対象外

          // A のブロック境界スロット（ここを手放すとブロックが縮む/消える）
          const endpoints = [];
          for (let s = 0; s < numSlots; s++) {
            if (!onAt(a, s) || isFixed(a, s)) continue;
            if (!onAt(a, s - 1) || !onAt(a, s + 1)) endpoints.push(s);
          }
          // A のブロックに隣接する空き列スロット（ここに入るとブロックが延びる/繋がる）
          const extendSlots = [];
          for (let s = 0; s < numSlots; s++) {
            if (isLunchSlot[s] || onAt(a, s)) continue;
            if (onAt(a, s - 1) || onAt(a, s + 1)) extendSlots.push(s);
          }

          for (let ei = 0; ei < endpoints.length && !improved; ei++) {
            const s2 = endpoints[ei];
            for (let xi = 0; xi < extendSlots.length && !improved; xi++) {
              const s1 = extendSlots[xi];
              if (s1 === s2) continue;
              if (day.assignment[s1][a]) continue; // A は s1 に居ないこと
              // s1 にいる入れ替え相手 B を探す
              const row1 = day.assignment[s1];
              for (let b = 0; b < users.length && !improved; b++) {
                if (b === a || !row1[b]) continue;
                if (!movable(b)) continue;
                if (isFixed(b, s1)) continue;          // B の s1 が固定なら動かさない
                if (isFixed(a, s2)) continue;          // A の s2 が固定なら動かさない
                if (day.assignment[s2][b]) continue;   // B は s2 に居ないこと
                if (!canOccupy(a, s1) || !canOccupy(b, s2)) continue;
                if (forbidWith(a, s1, b) || forbidWith(b, s2, a)) continue;

                const before = blockCount(a) + blockCount(b);
                // 仮に入れ替え
                day.assignment[s1][a] = users[a].name; day.assignment[s1][b] = '';
                day.assignment[s2][b] = users[b].name; day.assignment[s2][a] = '';
                const after = blockCount(a) + blockCount(b);
                if (after < before) {
                  // forcedCells の付け替え（見た目・整合のため）
                  if (day.forcedCells[s2 + '_' + a]) { delete day.forcedCells[s2 + '_' + a]; day.forcedCells[s1 + '_' + a] = true; }
                  else day.forcedCells[s1 + '_' + a] = true;
                  if (day.forcedCells[s1 + '_' + b]) { delete day.forcedCells[s1 + '_' + b]; day.forcedCells[s2 + '_' + b] = true; }
                  else day.forcedCells[s2 + '_' + b] = true;
                  defragSwapCount++;
                  improved = true;
                } else {
                  // 巻き戻し
                  day.assignment[s1][a] = ''; day.assignment[s1][b] = users[b].name;
                  day.assignment[s2][b] = ''; day.assignment[s2][a] = users[a].name;
                }
              }
            }
          }
        }
      }
    });
    currentTotal = sumArray(userTotalSlots);
  }

  // ===== 短い孤立シフトの解消（最小連続ブロック未満の端数ブロックを延長 or 除外） =====
  // 前後に自分のシフトが無い、最小連続ブロック(既定60分)未満の「短い孤立シフト」を最終的に無くす。
  //  ・まず本人が実際に空いている前後スロットへ延長して、最小連続ブロック以上にできないか試す。
  //  ・延長できない場合は端数のため外す（警告に出す）。
  //  ・手動/既存/カレンダー予定由来の固定セル(fixedCells)・ロック列・管理者は対象外（実シフトは触らない）。
  //  ・昼休みで途切れて見えるだけの連続ブロックは1つのブロックとして扱い、誤って外さない。
  let shortBlockExtendedCount = 0;
  let shortBlockRemovedCount = 0;
  if (getRemoveShortIsolatedBlocks_()) {
    const minBlock = getMinBlockSlots_();
    if (minBlock > 1) {
      const maxDShort = getMaxHoursPerDaySlots_();
      daysData.forEach((day, dayIdx) => {
        // 延長先は「本人が実際に空いていて、かつ本人の稼働時間帯(G/H)内」の時間のみ。
        const extendAvail = computeAvailabilityMatrix(users, day, timeSlots, 0, false, false);

        // uIdx の連続ブロック（昼休みは途切れとみなさず橋渡しする）を列挙する。
        const buildBlocks = (uIdx) => {
          const blocks = [];
          let cur = null;
          for (let s = 0; s < numSlots; s++) {
            if (isLunchSlot[s]) continue; // 昼休みでは切らない
            if (day.assignment[s][uIdx] === users[uIdx].name) {
              if (!cur) cur = [];
              cur.push(s);
            } else if (cur) {
              blocks.push(cur);
              cur = null;
            }
          }
          if (cur) blocks.push(cur);
          return blocks;
        };

        const canExtendCell = (uIdx, x) => {
          if (x < 0 || x >= numSlots || isLunchSlot[x]) return false;
          if (day.assignment[x][uIdx]) return false;
          if (!extendAvail[uIdx][x]) return false;                                   // 本人の実予定・稼働時間外には延ばさない
          if (isSpecialBlockedSlot(day, uIdx, x)) return false;                      // 特定予定±1hは厳守
          if (userDailySlots[dayIdx][uIdx] + 1 > maxDShort) return false;            // 8h/日は維持
          if (countOtherAssignedInSlot(day, uIdx, x) >= getMaxSameTimePeople_()) return false; // 同時刻の人数上限
          if (slotHasForbiddenPartnerFor_(day, uIdx, x, users)) return false;        // 同時禁止相手
          return true;
        };
        const skipLunchRight = (from) => { let x = from + 1; while (x < numSlots && isLunchSlot[x]) x++; return x; };
        const skipLunchLeft = (from) => { let x = from - 1; while (x >= 0 && isLunchSlot[x]) x--; return x; };

        for (let uIdx = 0; uIdx < users.length; uIdx++) {
          if (users[uIdx].isAdmin) continue;
          if (day.lockedCols[uIdx]) continue;                // ロック列（手動固定）は触らない
          if (isUserInactiveForDay_(day, uIdx)) continue;

          buildBlocks(uIdx).forEach(block => {
            if (block.length >= minBlock) return;            // 十分な長さのブロックは対象外
            if (block.some(s => day.fixedCells[s + '_' + uIdx])) return; // 固定セルを含む実シフトは触らない

            // まず前後へ延長して最小連続ブロック以上にできないか試す。
            const added = [];
            let curLen = block.length;
            let lo = block[0];
            let hi = block[block.length - 1];
            let progress = true;
            while (curLen < minBlock && progress) {
              progress = false;
              const r = skipLunchRight(hi);
              if (r < numSlots && canExtendCell(uIdx, r)) {
                day.assignment[r][uIdx] = users[uIdx].name;
                day.forcedCells[r + '_' + uIdx] = true;
                userDailySlots[dayIdx][uIdx]++; userTotalSlots[uIdx]++;
                added.push(r); hi = r; curLen++; progress = true;
                if (curLen >= minBlock) break;
              }
              const l = skipLunchLeft(lo);
              if (l >= 0 && canExtendCell(uIdx, l)) {
                day.assignment[l][uIdx] = users[uIdx].name;
                day.forcedCells[l + '_' + uIdx] = true;
                userDailySlots[dayIdx][uIdx]++; userTotalSlots[uIdx]++;
                added.push(l); lo = l; curLen++; progress = true;
              }
            }

            if (curLen >= minBlock) {
              shortBlockExtendedCount += added.length;
              return;                                        // 延長成功。孤立ではなくなった。
            }

            // 延長できなかった → 追加分を巻き戻し、端数の孤立ブロックを外す。
            added.forEach(x => {
              day.assignment[x][uIdx] = '';
              delete day.forcedCells[x + '_' + uIdx];
              userDailySlots[dayIdx][uIdx]--; userTotalSlots[uIdx]--;
            });
            block.forEach(s => {
              day.assignment[s][uIdx] = '';
              delete day.forcedCells[s + '_' + uIdx];
              userDailySlots[dayIdx][uIdx]--; userTotalSlots[uIdx]--;
              shortBlockRemovedCount++;
            });
            warnings.push(`${day.dateStr} ${timeSlots[block[0]]}〜${slotEndTime(timeSlots, block[block.length - 1])}: ${users[uIdx].name}さんの${block.length * 15}分の短い孤立シフトを、最小連続ブロック(${minBlock * 15}分)未満で前後にも延長できないため外しました（要確認）`);
          });
        }
      });
      currentTotal = sumArray(userTotalSlots);
    }
  }

  // ===== 同時禁止相手が、それでも同じ時間帯に同席していないか最終確認する =====
  // 自動割当ではペアにしないが、両者とも実際のカレンダー予定（シフト登録キーワード）で
  // 同時刻に登録された場合や、既存/ロックのシフトが手動で重なっている場合は同席が起こりうる。
  // その場合は自動では解消できないため、警告として通知する。
  {
    const forbiddenMap = getForbiddenPartnersMap_(users);
    const hasAnyForbidden = forbiddenMap.some(set => set && set.size > 0);
    if (hasAnyForbidden) {
      daysData.forEach(day => {
        const openRuns = {}; // 'i_j' => runStartSlot
        const closeRun = (key, i, j, endSlotExclusive) => {
          const start = openRuns[key];
          delete openRuns[key];
          warnings.push(`${day.dateStr} ${timeSlots[start]}〜${slotEndTime(timeSlots, endSlotExclusive - 1)}: ${users[i].name}さんと${users[j].name}さんは同時禁止相手ですが、カレンダー予定または手動シフトのため同じ時間帯に同席しています（自動では解消できません。要手動調整）`);
        };
        for (let s = 0; s <= numSlots; s++) {
          const present = [];
          if (s < numSlots && !isLunchSlot[s]) {
            for (let c = 0; c < users.length; c++) {
              if (day.assignment[s][c]) present.push(c);
            }
          }
          const activePairs = {};
          for (let a = 0; a < present.length; a++) {
            for (let b = a + 1; b < present.length; b++) {
              const i = present[a], j = present[b];
              if (!forbiddenMap[i] || !forbiddenMap[i].has(j)) continue;
              const key = i + '_' + j;
              activePairs[key] = true;
              if (openRuns[key] === undefined) openRuns[key] = s;
            }
          }
          // このスロットで途切れたペアの区間を閉じる
          Object.keys(openRuns).forEach(key => {
            if (!activePairs[key]) {
              const [i, j] = key.split('_').map(Number);
              closeRun(key, i, j, s);
            }
          });
        }
      });
    }
  }

  // 日次ペア保証後にも1人だけの日が残っていないか最終確認する。
  // 月間目標不足の上乗せで後から2人目が入った日は、ここでは警告しない。
  daysData.forEach((day, dayIdx) => {
    const assignedIdxs = [];
    for (let i = 0; i < users.length; i++) {
      if (!users[i].isAdmin && userDailySlots[dayIdx][i] > 0) assignedIdxs.push(i);
    }
    if (assignedIdxs.length === 1) {
      const onlyIdx = assignedIdxs[0];
      warnings.push(`${day.dateStr}: 1日の担当者が${users[onlyIdx].name}さん1人だけです（2人目を追加できませんでした。終日予定・ロック・前後1hブロック・8h/日・1日上限(H2)・同時刻2人までのいずれかが原因の可能性があります）`);
    }
  });

  // 未カバー（誰も入れられなかった）時間帯を警告
  daysData.forEach(day => {
    let runStart = -1;
    for (let s = 0; s <= numSlots; s++) {
      const uncovered = s < numSlots && !isLunchSlot[s] && !day.assignment[s].some(v => v);
      if (uncovered && runStart === -1) runStart = s;
      if ((!uncovered || s === numSlots) && runStart !== -1) {
        warnings.push(`${day.dateStr} ${timeSlots[runStart]}〜${slotEndTime(timeSlots, s - 1)}: カバーできませんでした（短い穴を前後の既存シフトへ吸収できない、1時間以上の連続シフトとして置ける人がいない、予定時間(E)上限、予定/終日予定、前後1hブロック、または週次担当の稼働メンバー制限）`);
        runStart = -1;
      }
    }
  });

  if (dryRun) {
    return { daysData, users, timeSlots, warnings, dryRun: true };
  }

  const backupIdForAutoAssign = createShiftBackupNow_('自動割当前バックアップ', { silent: true });
  daysData.forEach(day => writeAssignmentsToSheet(day, users, timeSlots));
  appendAutoAssignChangeLog_(daysData, users, timeSlots, preserveManual, backupIdForAutoAssign);

  const allDailySheetNames = ss.getSheets()
    .map(s => s.getName())
    .filter(name => /^\d{4}-\d{2}-\d{2}$/.test(name))
    .sort();
  updateSettingsTotals(setSheet, users, allDailySheetNames, timeSlots);

  const teamTotalHours = currentTotal / 4;
  let msg = `自動割り当て完了\n`;
  msg += `チーム合計: ${teamTotalHours.toFixed(2)}h / 目標: ${monthlyTargetHours.toFixed(2)}h\n`;
  msg += `(達成率 ${(teamTotalHours / monthlyTargetHours * 100).toFixed(1)}%)\n\n`;
  if (shiftKeywords.length > 0) {
    msg += `シフト登録（キーワード「${shiftKeywords.join('」「')}」）: ${(keywordSlotCount / 4).toFixed(2)}h\n\n`;
  }
  if (specialBlockKeywords.length > 0) {
    msg += `前後1hブロック: 予定タイトルに「${specialBlockKeywords.join('」「')}」を含む予定の前後${getSpecialEventBufferMinutes_()}分は自動割当しません\n`;
  }
  if (perDayQuotaSlots > 0) {
    msg += `1日あたり配分目安: ${(perDayQuotaSlots / 4).toFixed(2)}h × ${numWorkingDays}日\n`;
  }
  if (mainForcedCount > 0) {
    msg += `全員予定の時間帯を強制カバー（メイン担当1/2のうち、その日の予定が少ない主担当を優先, 予定と重複・E超過あり）: ${(mainForcedCount / 4).toFixed(2)}h\n`;
  }
  if (finalFallbackCount > 0) {
    msg += `最終フォールバック（残った未割当てをメイン担当1/2で強制カバー: 前後の予定/シフトと連続する方を優先, 終日予定の人は除外, 予定重複・E超過あり）: ${(finalFallbackCount / 4).toFixed(2)}h\n`;
  }
  if (leftoverFillCount > 0) {
    msg += `余り枠の最終割当（全メンバーで連続優先カバー: 1区間はできるだけ1人で連続。予定重複・E超過・個人時間帯無視あり／前後1hブロック・8h・1日上限は維持）: ${(leftoverFillCount / 4).toFixed(2)}h\n`;
  }
  if (targetTopUpCount > 0) {
    const topUpDetails = targetTopUpByLevel
      .map((slots, idx) => slots > 0 ? `${['予定なし・個人時間内', '予定なし・個人時間帯無視', '予定重複あり・個人時間帯無視'][idx]} ${(slots / 4).toFixed(2)}h` : '')
      .filter(Boolean)
      .join(' / ');
    msg += `月間目標不足の最終上乗せ（2人目枠で連続優先。E目標内／前後1hブロック・8h・1日上限・同時刻2人まで維持）: ${(targetTopUpCount / 4).toFixed(2)}h`;
    if (topUpDetails) msg += `（${topUpDetails}）`;
    msg += `\n`;
  }
  if (dailyPairTopUpCount > 0) {
    const pairDetails = dailyPairTopUpByLevel
      .map((slots, idx) => slots > 0 ? `${['E/G2内・予定なし・個人時間内', 'E/G2内・予定なし・個人時間帯無視', 'E/G2内・予定重複あり・個人時間帯無視', '最終手段・E/G2超過あり'][idx]} ${(slots / 4).toFixed(2)}h` : '')
      .filter(Boolean)
      .join(' / ');
    msg += `1人日回避の最終ペア追加（担当者が1人だけの日に2人目を1時間以上追加。前後1hブロック・8h・1日上限・同時刻2人までは維持）: ${(dailyPairTopUpCount / 4).toFixed(2)}h`;
    if (pairDetails) msg += `（${pairDetails}）`;
    msg += `\n`;
  }
  if (currentTotal < monthlyTargetSlots) {
    msg += `月間目標まで残り: ${((monthlyTargetSlots - currentTotal) / 4).toFixed(2)}h（E残・8h/日・1日上限(H2)・終日予定・ロック・前後1hブロック・週次担当の稼働メンバー制限のいずれかで追加不可）\n`;
  } else if (currentTotal > monthlyTargetSlots) {
    msg += `月間目標超過: ${((currentTotal - monthlyTargetSlots) / 4).toFixed(2)}h（1人だけの日を避ける最終ペア追加を優先したため）\n`;
  }
  const mainLeadCounts = new Array(users.length).fill(0);
  daysData.forEach(day => {
    if (day.mainLeadIdx !== undefined && day.mainLeadIdx >= 0) mainLeadCounts[day.mainLeadIdx]++;
  });
  const mainLeadSummary = users
    .map((u, idx) => mainLeadCounts[idx] > 0 ? `${u.name}:${mainLeadCounts[idx]}日` : '')
    .filter(Boolean)
    .join(' / ');
  if (mainLeadSummary) {
    msg += `主担当の日分け（週次担当の指定があればそちらを優先、無ければメイン1/2のうち予定が少ない方）: ${mainLeadSummary}\n`;
  }
  if (dailyMinSlots > 0) {
    msg += `1日下限: ${(dailyMinSlots / 4).toFixed(2)}h（各日この時間まで引き上げ）\n`;
  }
  if (confirmedSkipCount > 0) {
    msg += `確定済みのためスキップ: ${confirmedSkipCount}日（A1にチェックが入っている日は自動割当の対象外）\n`;
  }
  if (noSoloPairedCount > 0) {
    msg += `単独禁止ユーザーへのペア追加: ${(noSoloPairedCount / 4).toFixed(2)}h\n`;
  }
  if (noSoloRemovedCount > 0) {
    msg += `単独禁止ユーザーを単独時間帯から除外: ${(noSoloRemovedCount / 4).toFixed(2)}h（要確認。詳細は警告欄）\n`;
  }
  if (adjacentGapFillCount > 0) {
    msg += `1時間未満の穴の前後シフト吸収: ${(adjacentGapFillCount / 4).toFixed(2)}h\n`;
  }
  if (guaranteedCoverCount > 0) {
    msg += `絶対カバー（未カバーの時間帯を数周して強制的に充填）: ${(guaranteedCoverCount / 4).toFixed(2)}h（8h/日は維持。埋めるためチーム1日上限H2を超えた場合あり）\n`;
  }
  if (defragSwapCount > 0) {
    msg += `飛び飛びシフトの最終まとめ（主担当以外・カバー人数と合計時間は維持したまま入れ替え）: ${defragSwapCount}回\n`;
  }
  if (shortBlockExtendedCount > 0) {
    msg += `短い孤立シフトを前後へ延長して解消: ${(shortBlockExtendedCount / 4).toFixed(2)}h\n`;
  }
  if (shortBlockRemovedCount > 0) {
    msg += `短い孤立シフトを除外（延長不可のため）: ${(shortBlockRemovedCount / 4).toFixed(2)}h（要確認。詳細は警告欄）\n`;
  }
  msg += `全時間帯カバー: 非昼休みの各時間帯に最低1人（埋まらない枠は8h/日・終日予定・ロック等が原因。警告に表示）\n`;
  msg += `主担当: その日で一番シフト時間が長い人を4行目・予定側のチェックボックスで自動チェック\n`;
  msg += `最小連続ブロック: ${(getMinBlockSlots_() / 4).toFixed(2)}h以上（自動配分・全時間帯カバー・1日下限）\n`;
  msg += `1日の担当者数: 原則${getMinPeoplePerDay_()}人以上 / 上限${getMaxPeoplePerDay_()}人（1人だけの日は2人目を追加。制約上不可なら警告）\n`;
  msg += `同時刻の担当者上限: ${getMaxSameTimePeople_()}人（${getMaxSameTimePeople_() + 1}人以上の同時被りを作らない。※カレンダー予定＝シフト登録キーワード由来の重複は対象外）\n`;
  {
    const fbMap = getForbiddenPartnersMap_(users);
    const fbCount = fbMap.reduce((acc, set) => acc + (set ? set.size : 0), 0) / 2; // 双方向なので2で割る
    if (fbCount > 0) msg += `同時禁止相手: ${fbCount}組を設定（同じ時間帯に一緒に割り当てない。詳細は「ユーザー属性」シート）\n`;
  }
  msg += `\n`;

  const usedLevels = strictnessLevels
    .map((lv, i) => ({ label: lv.label, h: usageByLevel[i] }))
    .filter(u => u.h > 0);
  if (usedLevels.length > 1) {
    msg += '緩和レベル別:\n';
    usedLevels.forEach(u => {
      msg += `  ${u.label}: +${(u.h / 4).toFixed(2)}h\n`;
    });
    msg += '\n';
  }

  msg += `担当別:\n`;
  users.forEach((u, idx) => {
    const h = userTotalSlots[idx] / 4;
    if (u.isAdmin) {
      msg += `  ${u.name}: 管理者（自動シフト対象外, 既存${h.toFixed(2)}h）\n`;
      return;
    }
    const targetH = u.targetSlots / 4;
    const ratio = targetH > 0 ? (h / targetH * 100).toFixed(1) : '-';
    const hoursRange = (u.startTime || u.endTime)
      ? ` [${u.startTime || '--:--'}〜${u.endTime || '--:--'}]`
      : '';
    const over = (targetH > 0 && h > targetH + 1e-9) ? ' ⚠E超過(緊急強制)' : '';
    msg += `  ${u.name}${hoursRange}: ${h.toFixed(2)}h / ${targetH.toFixed(2)}h (${ratio}%)${over}\n`;
  });
  if (warnings.length > 0) {
    msg += `\n警告 (${warnings.length}件):\n`;
    msg += warnings.slice(0, 15).join('\n');
    if (warnings.length > 15) msg += `\n...他 ${warnings.length - 15} 件`;
  }
  if (!silent) ui.alert(msg);
  return { daysData, users, timeSlots, warnings, dryRun: false, message: msg };
}

function computeAvailabilityMatrix(users, day, timeSlots, bufferMinutes, ignoreEvents, ignoreUserHours) {
  const bufMin = (bufferMinutes === undefined || bufferMinutes === null) ? getEventBufferMinutes_() : bufferMinutes;
  const normalBufferMs = bufMin * 60 * 1000;
  const specialBufferMs = getSpecialEventBufferMinutes_() * 60 * 1000;
  const specialKeywords = day.specialBlockKeywords || [];
  const assignIgnoreKeywords = getAssignIgnoreEventKeywords_();

  return users.map((u, uIdx) => {
    // 週次担当で「この週は非稼働」のメンバーは、その日は割当不可。
    if (isUserInactiveForDay_(day, uIdx)) return timeSlots.map(() => false);

    let events = day.userEvents[uIdx] || [];
    // 自動割当: 予定無視キーワードに一致する予定は「予定なし」として扱う（終日予定も無視）。
    if (assignIgnoreKeywords.length > 0) {
      events = events.filter(ev => !eventTitleMatchesKeywords(ev, assignIgnoreKeywords));
    }

    const hasAllDay = events.some(ev => isAllDayEventSafe(ev));
    if (hasAllDay) return timeSlots.map(() => false);

    const specialBlockedRanges = [];
    const normalBlockedRanges = [];

    events
      .filter(ev => !isAllDayEventSafe(ev))
      .forEach(ev => {
        const isSpecial = specialKeywords.length > 0 && eventTitleMatchesKeywords(ev, specialKeywords);
        const bufferMs = isSpecial ? Math.max(normalBufferMs, specialBufferMs) : normalBufferMs;
        const range = {
          start: ev.getStartTime().getTime() - bufferMs,
          end: ev.getEndTime().getTime() + bufferMs
        };
        if (isSpecial) specialBlockedRanges.push(range);
        else normalBlockedRanges.push(range);
      });

    const blockedRanges = ignoreEvents ? specialBlockedRanges : normalBlockedRanges.concat(specialBlockedRanges);

    return timeSlots.map(slotTime => {
      if (!ignoreUserHours && !isWithinUserHours(slotTime, u)) return false;

      const slotStart = parseSlotTime(day.date, slotTime).getTime();
      const slotEnd = slotStart + 15 * 60 * 1000;
      for (const r of blockedRanges) {
        if (slotStart < r.end && slotEnd > r.start) return false;
      }
      return true;
    });
  });
}

function parseKeywordList(raw) {
  const keywords = [];
  String(raw || '').split(/[,、，;；]+/).forEach(k => {
    const t = k.trim().toLowerCase();
    if (t) keywords.push(t);
  });
  return keywords;
}

function textMatchesKeywordList_(text, keywords) {
  if (!keywords || keywords.length === 0) return false;
  const lower = String(text || '').toLowerCase();
  if (!lower) return false;
  return keywords.some(kw => kw && lower.indexOf(kw) >= 0);
}

function eventTitleMatchesKeywords(ev, keywords) {
  if (!ev || !keywords || keywords.length === 0) return false;
  let title = '';
  try { title = String(ev.getTitle() || '').toLowerCase(); } catch (e) { title = ''; }
  if (!title) return false;
  return keywords.some(kw => kw && title.indexOf(kw) >= 0);
}

function computeSpecialBlockMatrix(users, day, timeSlots) {
  const keywords = day.specialBlockKeywords || [];
  const bufferMs = getSpecialEventBufferMinutes_() * 60 * 1000;
  return users.map((u, uIdx) => {
    const events = day.userEvents[uIdx] || [];
    const ranges = [];
    events.forEach(ev => {
      if (!eventTitleMatchesKeywords(ev, keywords)) return;
      if (isAllDayEventSafe(ev)) {
        ranges.push({ start: Number.NEGATIVE_INFINITY, end: Number.POSITIVE_INFINITY });
        return;
      }
      try {
        ranges.push({
          start: ev.getStartTime().getTime() - bufferMs,
          end: ev.getEndTime().getTime() + bufferMs,
        });
      } catch (e) {}
    });
    if (ranges.length === 0) return timeSlots.map(() => false);

    return timeSlots.map(slotTime => {
      const slotStart = parseSlotTime(day.date, slotTime).getTime();
      const slotEnd = slotStart + 15 * 60 * 1000;
      return ranges.some(r => slotStart < r.end && slotEnd > r.start);
    });
  });
}

function isSpecialBlockedSlot(day, uIdx, slotIdx) {
  return !!(day && day.specialBlocked && day.specialBlocked[uIdx] && day.specialBlocked[uIdx][slotIdx]);
}

function parseEmailSet(raw) {
  const set = new Set();
  if (!raw) return set;
  String(raw).split(/[,,;\s]+/).forEach(e => {
    const t = e.trim().toLowerCase();
    if (t) set.add(t);
  });
  return set;
}

function applyRoleSettingsToUsers(users, setSheet) {
  const adminEmails = parseEmailSet(setSheet.getRange(ADMIN_EMAIL_CELL).getValue());
  const main1Emails = parseEmailSet(setSheet.getRange(MAIN_USER1_CELL).getValue());
  const main2Emails = parseEmailSet(setSheet.getRange(MAIN_USER2_CELL).getValue());
  const main3Emails = parseEmailSet(setSheet.getRange(MAIN_USER3_CELL).getValue());

  users.forEach(u => {
    const em = String(u.email || '').toLowerCase();
    u.isAdmin = adminEmails.has(em);
    u.mainRank = main1Emails.has(em) ? 1 : (main2Emails.has(em) ? 2 : (main3Emails.has(em) ? 3 : 0));
    u.isMain = u.mainRank > 0;
  });
}

/** メイン担当1/2判定 */
function isMain12(user) {
  return user && (user.mainRank === 1 || user.mainRank === 2);
}

/**
 * その日の予定が埋まっている時間を15分スロット数で数える。
 * 昼休みと本人の稼働時間外は比較対象から外す。予定無視キーワードに一致する予定は除外する。
 */
function countBusySlotsForDay(user, events, day, timeSlots, isLunchSlot) {
  const assignIgnoreKeywords = getAssignIgnoreEventKeywords_();
  if (assignIgnoreKeywords.length > 0 && events && events.length > 0) {
    events = events.filter(ev => !eventTitleMatchesKeywords(ev, assignIgnoreKeywords));
  }
  const busy = new Array(timeSlots.length).fill(false);
  if (!events || events.length === 0) return 0;

  events.forEach(ev => {
    if (isAllDayEventSafe(ev)) {
      for (let s = 0; s < timeSlots.length; s++) {
        if (!isLunchSlot[s] && isWithinUserHours(timeSlots[s], user)) busy[s] = true;
      }
      return;
    }

    let startMs, endMs;
    try {
      startMs = ev.getStartTime().getTime();
      endMs = ev.getEndTime().getTime();
    } catch (e) {
      return;
    }

    for (let s = 0; s < timeSlots.length; s++) {
      if (isLunchSlot[s]) continue;
      if (!isWithinUserHours(timeSlots[s], user)) continue;

      const slotStart = parseSlotTime(day.date, timeSlots[s]).getTime();
      const slotEnd = slotStart + 15 * 60 * 1000;
      if (slotStart < endMs && slotEnd > startMs) busy[s] = true;
    }
  });

  return busy.filter(Boolean).length;
}

/**
 * メイン担当1/2のうち、その日の予定が少ない人を主担当にする。
 * 同じ予定量なら日付順で1/2を交互に優先し、同じランク内では表の上から順にする。
 * 週次担当で非稼働のメンバーは候補から除外する。
 */
function selectDailyMainLeadIdx(users, day, dayIdx) {
  const cands = users.map((u, idx) => idx)
    .filter(idx =>
      isMain12(users[idx]) &&
      !users[idx].isAdmin &&
      !day.lockedCols[idx] &&
      !isUserInactiveForDay_(day, idx) &&
      !day.userEvents[idx].some(ev => isAllDayEventSafe(ev))
    );

  if (cands.length === 0) return -1;

  const preferredRank = (dayIdx % 2 === 0) ? 1 : 2;
  cands.sort((a, b) => {
    const busyA = day.busySlots ? day.busySlots[a] : 0;
    const busyB = day.busySlots ? day.busySlots[b] : 0;
    if (busyA !== busyB) return busyA - busyB;

    const prefA = users[a].mainRank === preferredRank ? 0 : 1;
    const prefB = users[b].mainRank === preferredRank ? 0 : 1;
    if (prefA !== prefB) return prefA - prefB;

    return a - b;
  });
  return cands[0];
}

/**
 * 1人目/通常配分用の優先キー。
 * 0: その日の主担当（週次担当の主担当、または メイン1/2の予定が少ない方）
 * 1: 通常担当
 * 2: 主担当ではないメイン1/2（基本は別日に回す）
 * 3: メイン担当外
 */
function dailyMainPriorityKey(users, day, uIdx) {
  if (day && day.mainLeadIdx === uIdx) return 0;
  if (isMain12(users[uIdx])) return 2;
  if (users[uIdx].mainRank === 3) return 3;
  return 1;
}

function isOtherMain12OnLeadDay(users, day, uIdx) {
  // 週次担当でその週の主担当を明示している日は、メイン担当1/2の自動「日分け」を無効化する。
  if (day && day.weekLeadIdxOrder && day.weekLeadIdxOrder.length > 0) return false;
  return day && day.mainLeadIdx !== undefined && day.mainLeadIdx >= 0 &&
    isMain12(users[uIdx]) && uIdx !== day.mainLeadIdx;
}

function isWithinUserHours(slotTime, user) {
  if (user.startTime && slotTime < user.startTime) return false;
  if (user.endTime && slotTime >= user.endTime) return false;
  return true;
}

/**
 * あるメンバー本人の予定の中から、シフト登録キーワードに一致する予定が覆う
 * 時間帯（昼休みを除く）のスロット index を返す。
 * 終日予定が一致する場合はその日全体（昼休み除く）が対象。
 * @param {CalendarEvent[]} events 本人の予定配列
 * @param {string[]} keywords 小文字化済みキーワード配列（いずれか部分一致でヒット）
 * @return {number[]} 対象スロットの index 配列
 */
function computeKeywordSlots(events, timeSlots, keywords, isLunchSlot) {
  const result = [];
  if (!events || !keywords || keywords.length === 0) return result;
  const numSlots = timeSlots.length;
  const hit = new Array(numSlots).fill(false);

  events.forEach(ev => {
    let title = '';
    try { title = String(ev.getTitle() || ''); } catch (e) { title = ''; }
    const lower = title.toLowerCase();
    const matched = keywords.some(kw => kw && lower.indexOf(kw) >= 0);
    if (!matched) return;

    if (isAllDayEventSafe(ev)) {
      for (let s = 0; s < numSlots; s++) hit[s] = true;
      return;
    }

    let startStr, endStr;
    try {
      startStr = Utilities.formatDate(ev.getStartTime(), 'JST', 'HH:mm');
      endStr = Utilities.formatDate(ev.getEndTime(), 'JST', 'HH:mm');
    } catch (e) { return; }

    for (let s = 0; s < numSlots; s++) {
      const slotStart = timeSlots[s];
      const slotEnd = slotEndTime(timeSlots, s);
      // スロット [slotStart, slotEnd) と 予定 [startStr, endStr) が重なるか
      if (slotStart < endStr && slotEnd > startStr) hit[s] = true;
    }
  });

  for (let s = 0; s < numSlots; s++) {
    if (hit[s] && !isLunchSlot[s]) result.push(s);
  }
  return result;
}

/**
 * 指定ユーザー(uIdx)を、自分のシフト列（colIdx = uIdx）に1日分できるだけ埋める。
 * 本人が割当可能で空いている非昼休みスロットを minBlock 以上の連続ブロックで埋める。
 * 本人の月間目標(targetSlots)に達したら minBlock を満たした時点で停止。
 * @return {number} 埋めたスロット数
 */
function fillUserShift(day, dayIdx, uIdx, users, timeSlots, isLunchSlot,
                       userTotalSlots, userDailySlots, targetSlots, dailyCapSlots, minBlockSlots) {
  const numSlots = timeSlots.length;
  const maxDailySlots = getMaxHoursPerDaySlots_();
  const minBlock = minBlockSlots && minBlockSlots > 0 ? minBlockSlots : getMinBlockSlots_();
  const colIdx = uIdx;   // 各ユーザーは自分の列のみ
  let filled = 0;
  let s = 0;

  while (s < numSlots) {
    if (isLunchSlot[s] || day.assignment[s][colIdx]) { s++; continue; }
    if (targetSlots > 0 && userTotalSlots[uIdx] >= targetSlots) break;
    if (sumArray(userDailySlots[dayIdx]) + minBlock > dailyCapSlots) break;

    // 先頭 minBlock 分が連続で割当可能か確認
    let canStart = true;
    for (let k = 0; k < minBlock; k++) {
      const sk = s + k;
      if (sk >= numSlots || isLunchSlot[sk] || day.assignment[sk][colIdx] ||
          !canAssign(day, dayIdx, uIdx, sk, colIdx, users, isLunchSlot, userDailySlots, maxDailySlots, k)) {
        canStart = false; break;
      }
    }
    if (!canStart) { s++; continue; }

    // 連続して埋める
    let j = s;
    let blockCount = 0;
    while (j < numSlots) {
      if (isLunchSlot[j] || day.assignment[j][colIdx]) break;
      if (!canAssign(day, dayIdx, uIdx, j, colIdx, users, isLunchSlot, userDailySlots, maxDailySlots)) break;
      if (blockCount >= minBlock && targetSlots > 0 && userTotalSlots[uIdx] >= targetSlots) break;
      if (blockCount >= minBlock && sumArray(userDailySlots[dayIdx]) >= dailyCapSlots) break;

      day.assignment[j][colIdx] = users[uIdx].name;
      userDailySlots[dayIdx][uIdx]++;
      userTotalSlots[uIdx]++;
      filled++;
      blockCount++;
      j++;
    }
    s = j > s ? j : s + 1;
  }
  return filled;
}

function canAssign(day, dayIdx, uIdx, slotIdx, colIdx, users, isLunchSlot, userDailySlots, maxDailySlots, slotsAhead) {
  const ahead = slotsAhead || 0;
  if (users[uIdx].isAdmin) return false;
  if (!day.availability[uIdx][slotIdx]) return false;
  if (isSpecialBlockedSlot(day, uIdx, slotIdx)) return false;
  if (userDailySlots[dayIdx][uIdx] + 1 + ahead > maxDailySlots) return false;
  if (day.assignment[slotIdx][colIdx]) return false;

  // 1日の担当は最大 getMaxPeoplePerDay_() 人（なるべく）。
  // この人がまだその日に未割当なら、既に上限人数いる場合は追加しない。
  if (userDailySlots[dayIdx][uIdx] === 0) {
    let distinct = 0;
    for (let k = 0; k < userDailySlots[dayIdx].length; k++) {
      if (userDailySlots[dayIdx][k] > 0) distinct++;
    }
    if (distinct >= getMaxPeoplePerDay_()) return false;
  }

  // 同時禁止相手（ユーザー属性シート）がこのスロットに既にいる場合は入れない。
  if (slotHasForbiddenPartnerFor_(day, uIdx, slotIdx, users)) return false;

  let otherOccupied = 0;
  const name = users[uIdx].name;
  for (let c = 0; c < users.length; c++) {
    if (c === colIdx) continue;
    const v = day.assignment[slotIdx][c];
    if (!v) continue;
    if (v === name) return false;
    otherOccupied++;
  }
  // 同じ時間帯の人数上限（既定2＝3人以上を禁止）。カレンダー予定由来の重複はこの経路を通らないため対象外。
  if (otherOccupied >= getMaxSameTimePeople_()) return false;

  return true;
}

/**
 * 日付シートA1のチェックボックスで管理する「シフト確定」状態を読み取る。
 * シートが無い・値が取得できない場合は未確定(false)扱い。
 */
function isDayConfirmed_(sheet) {
  if (!sheet) return false;
  try {
    return sheet.getRange(CONFIRMED_CELL_ROW, CONFIRMED_CELL_COL).getValue() === true;
  } catch (e) {
    return false;
  }
}

/** A1の見た目を確定状態に合わせて更新する（確定=緑、未確定=タイトルバーと同じ青）。 */
function writeConfirmedCellStyle_(sheet, isConfirmed) {
  const cell = sheet.getRange(CONFIRMED_CELL_ROW, CONFIRMED_CELL_COL);
  if (isConfirmed) {
    cell.setBackground('#34a853').setFontColor('#ffffff');
  } else {
    cell.setBackground('#1c4587').setFontColor('#ffffff');
  }
}

/**
 * 日付シートの4行目（予定列側）に、その日の主担当をチェックボックスで表示する。
 * 主担当は「その日で一番シフト時間が長い人」を自動でチェックする（day.mainDisplayIdx）。
 * シフト列側の4行目はロックチェックボックスとして使うため触らない。
 */
function writeDailyMainLeadFlag(day, users) {
  if (!day || !day.sheet || !users || users.length === 0) return;

  const sheet = day.sheet;
  const flagRange = sheet.getRange(LOCK_ROW, 2, 1, users.length);

  flagRange.clearContent();
  flagRange.clearNote();
  flagRange.clearDataValidations();
  flagRange.setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  flagRange
    .setBackground('#f3f3f3')
    .setFontColor('#666666')
    .setFontWeight('normal')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  sheet.getRange(LOCK_ROW, 1)
    .setValue('主担当✓ / ロック')
    .setBackground('#fce4d6')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  // 主担当＝その日で一番シフト時間が長い人（day.mainDisplayIdx）。
  // 未計算の日は従来の内部主担当(mainLeadIdx)にフォールバックする。
  let leadIdx = (day.mainDisplayIdx !== undefined && day.mainDisplayIdx !== null) ? day.mainDisplayIdx : -1;
  if (leadIdx < 0) leadIdx = (day.mainLeadIdx !== undefined && day.mainLeadIdx !== null) ? day.mainLeadIdx : -1;

  const vals = new Array(users.length).fill(false);
  if (leadIdx >= 0 && leadIdx < users.length) vals[leadIdx] = true;
  flagRange.setValues([vals]);

  if (leadIdx < 0 || leadIdx >= users.length) {
    sheet.getRange(LOCK_ROW, 1).setNote('この日は主担当を設定できませんでした（担当者が割り当てられていません）。');
    return;
  }

  const lead = users[leadIdx];
  let note;
  if (day.assignment) {
    const leadSlots = day.assignment.reduce((acc, row) => acc + (row[leadIdx] === lead.name ? 1 : 0), 0);
    note = `この日の主担当です（その日で一番シフト時間が長い人を自動でチェック）。シフト時間: ${(leadSlots / 4).toFixed(2)}h`;
  } else {
    note = 'この日の主担当（暫定）です。まだシフト未割当のため、メイン担当1/2から仮選択しています。自動割当を実行すると、その日で一番シフト時間が長い人へ自動更新されます。';
  }

  sheet.getRange(LOCK_ROW, 2 + leadIdx)
    .setBackground(lead.bgColor)
    .setNote(note);
}

function writeAssignmentsToSheet(day, users, timeSlots) {
  const sheet = day.sheet;
  const numSlots = timeSlots.length;
  const shiftCol1 = users.length + 2;
  const lockedCols = day.lockedCols || new Array(users.length).fill(false);
  const forcedCells = day.forcedCells || {};

  writeDailyMainLeadFlag(day, users);

  for (let c = 0; c < users.length; c++) {
    if (lockedCols[c]) {
      // ロック列は通常は手動内容を保持（書き換えない）。
      // ただしシフト登録キーワードで配置したセルだけは個別に書き込む。
      for (let s = 0; s < numSlots; s++) {
        if (!forcedCells[s + '_' + c]) continue;
        const name = day.assignment[s][c];
        if (!name) continue;
        const user = users.find(u => u.name === name);
        const cell = sheet.getRange(TIME_SLOT_START_ROW + s, shiftCol1 + c);
        cell.setValue(name);
        if (user) {
          cell.setBackground(user.bgColor).setFontColor(user.fontColor);
        }
      }
      continue;
    }

    const colRange = sheet.getRange(TIME_SLOT_START_ROW, shiftCol1 + c, numSlots, 1);
    colRange.clearContent();
    colRange.setBackground('#fff4e5');
    colRange.setFontColor('#000000');

    const values = day.assignment.map(row => [row[c]]);
    colRange.setValues(values);

    for (let s = 0; s < numSlots; s++) {
      const name = day.assignment[s][c];
      if (!name) continue;
      const user = users.find(u => u.name === name);
      if (user) {
        sheet.getRange(TIME_SLOT_START_ROW + s, shiftCol1 + c)
          .setBackground(user.bgColor)
          .setFontColor(user.fontColor);
      }
    }
  }
}

function autoPopulateExcludedDates(setSheet, startDate, daysToFetch) {
  const ss = setSheet.getParent();
  let excSheet = ss.getSheetByName(EXCLUDED_DATES_SHEET_NAME);
  if (!excSheet) {
    excSheet = ss.insertSheet(EXCLUDED_DATES_SHEET_NAME);
    excSheet.setColumnWidth(1, 150);
  }

  const existing = readExcludedDates(setSheet);
  const merged = new Set(existing);

  let holidayDates = new Set();
  try {
    const cal = CalendarApp.getCalendarById('ja.japanese#holiday@group.v.calendar.google.com');
    if (cal) {
      const rangeEnd = new Date(startDate.getTime());
      rangeEnd.setDate(startDate.getDate() + Number(daysToFetch));
      const evs = cal.getEvents(startDate, rangeEnd);
      evs.forEach(ev => {
        holidayDates.add(Utilities.formatDate(ev.getStartTime(), 'JST', 'yyyy-MM-dd'));
      });
    }
  } catch (e) {}

  for (let d = 0; d < daysToFetch; d++) {
    const dt = new Date(startDate.getTime());
    dt.setDate(startDate.getDate() + d);
    const dateStr = Utilities.formatDate(dt, 'JST', 'yyyy-MM-dd');
    const dow = dt.getDay();
    if (dow === 0 || dow === 6) merged.add(dateStr);
    if (holidayDates.has(dateStr)) merged.add(dateStr);
  }

  const sorted = Array.from(merged).sort();

  excSheet.getRange(1, 1)
    .setValue('シフト除外日')
    .setBackground('#444444')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  excSheet.setFrozenRows(1);

  const lastRow = excSheet.getLastRow();
  if (lastRow >= 2) {
    excSheet.getRange(2, 1, lastRow - 1, 1).clearContent();
  }

  if (sorted.length > 0) {
    const values = sorted.map(d => [d]);
    excSheet.getRange(2, 1, sorted.length, 1)
      .setValues(values)
      .setHorizontalAlignment('center')
      .setNumberFormat('@');
  }
}

function readExcludedDates(setSheet) {
  const ss = setSheet.getParent();
  const excSheet = ss.getSheetByName(EXCLUDED_DATES_SHEET_NAME);
  const result = new Set();
  if (!excSheet) return result;

  const lastRow = excSheet.getLastRow();
  if (lastRow < 2) return result;

  const values = excSheet.getRange(2, 1, lastRow - 1, 1).getValues();

  for (const row of values) {
    const v = row[0];
    if (v === '' || v === null) continue;
    let dateStr = null;
    if (v instanceof Date) {
      dateStr = Utilities.formatDate(v, 'JST', 'yyyy-MM-dd');
    } else {
      const s = String(v).trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
        dateStr = s.substring(0, 10);
      } else {
        const d = new Date(s);
        if (!isNaN(d.getTime())) {
          dateStr = Utilities.formatDate(d, 'JST', 'yyyy-MM-dd');
        }
      }
    }
    if (dateStr) result.add(dateStr);
  }
  return result;
}

/** ===================== 設定シート集計 ===================== */

function updateSettingsTotals(setSheet, users, dailySheetNames, timeSlots) {
  const plannedHoursCol = USER_COL_PLANNED_HOURS;        // 5 (E) ★手入力
  const plannedCalcCol = USER_COL_PLANNED_HOURS_CALC;    // 6 (F) ★NEW: 人月からの目安
  const totalCol = USER_COL_TOTAL;                       // 9 (I)
  const firstDateCol = USER_COL_FIRST_DATE;              // 10 (J)

  const lastUserRow = users.length > 0
    ? Math.max.apply(null, users.map(u => u.settingRow))
    : 4;
  const grandTotalRow = lastUserRow + 1;

  // クリア範囲: 4行目〜grandTotalRow までの「totalCol(I)以降の合計＋日付列」と
  //             grandTotalRow の「totalColより前の全列」のみ。
  //             E列(手入力)とF列(目安)はクリアされないが、ユーザー行のF列は下で再設定される。
  if (grandTotalRow >= 4) {
    setSheet.getRange(4, totalCol, grandTotalRow - 3, 30).clear();
  }
  setSheet.getRange(grandTotalRow, 1, 1, totalCol - 1).clear();

  if (dailySheetNames.length === 0 || users.length === 0) return;

  // 行4 ヘッダー: F=予定時間(目安) も再設定（createSettingsSheet が走ってない場合に備えて）
  setSheet.getRange(4, plannedCalcCol)
    .setValue('予定時間(目安)')
    .setBackground('#444444')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  // 合計ヘッダー
  setSheet.getRange(4, totalCol)
    .setValue('合計')
    .setBackground('#444444')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  const excludedDateSet = readExcludedDates(setSheet);

  dailySheetNames.forEach((name, idx) => {
    const isExcluded = excludedDateSet.has(name);
    setSheet.getRange(4, firstDateCol + idx)
      .setValue(name)
      .setBackground(isExcluded ? '#777777' : '#444444')
      .setFontColor('#ffffff')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
  });

  const shiftCol1Letter = columnToLetter(users.length + 2);
  const shiftCol2Letter = columnToLetter(users.length + 1 + users.length);
  const firstTimeRow = TIME_SLOT_START_ROW;
  const lastTimeRow = timeSlots.length + TIME_SLOT_START_ROW - 1;

  // 予定時間(目安)は「全体の標準時間 C2(開始)・D2(終了)」を基準にし、
  // 予定人月(D, フルタイム比率) と 稼働日数(I2) で按分する。
  // 個人のG/H列は自動シフトの可否判定に使うのみで、目安計算には使わない
  // （G/H で縮めると比率Dと二重に減ってしまうため）。

  users.forEach(user => {
    const escapedUserName = String(user.name).replace(/"/g, '""');

    // F列: 予定時間(目安) = 予定人月 × 稼働日数 × (D2 - C2 - 休憩)
    const plannedCalcFormula = `=D${user.settingRow}*$F$2*MAX(0,$D$2-$C$2-${BREAK_HOURS}/24)`;
    setSheet.getRange(user.settingRow, plannedCalcCol)
      .setFormula(plannedCalcFormula)
      .setNumberFormat('[h]:mm')
      .setHorizontalAlignment('center')
      .setFontColor('#666666')   // 目安として薄いグレー
      .setFontStyle('italic');

    // E列: 予定時間 (手入力) - 書式と中央揃えのみ確保。値は触らない。
    setSheet.getRange(user.settingRow, plannedHoursCol)
      .setNumberFormat('[h]:mm')
      .setHorizontalAlignment('center');

    dailySheetNames.forEach((sheetName, dateIdx) => {
      const escapedSheetName = sheetName.replace(/'/g, "''");
      const formula = `=COUNTIF('${escapedSheetName}'!${shiftCol1Letter}${firstTimeRow}:${shiftCol2Letter}${lastTimeRow}, "${escapedUserName}") * 15 / 1440`;
      setSheet.getRange(user.settingRow, firstDateCol + dateIdx)
        .setFormula(formula)
        .setNumberFormat('[h]:mm')
        .setHorizontalAlignment('center');
    });

    const firstDateColLetter = columnToLetter(firstDateCol);
    const lastDateColLetter = columnToLetter(firstDateCol + dailySheetNames.length - 1);
    const totalFormula = `=SUM(${firstDateColLetter}${user.settingRow}:${lastDateColLetter}${user.settingRow})`;
    setSheet.getRange(user.settingRow, totalCol)
      .setFormula(totalFormula)
      .setNumberFormat('[h]:mm')
      .setBackground(user.bgColor)
      .setFontColor(user.fontColor)
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
  });

  // 合計行ヘッダー（1〜合計列の前まで黒塗り）
  setSheet.getRange(grandTotalRow, 1, 1, totalCol - 1)
    .setBackground('#444444')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setVerticalAlignment('middle')
    .setHorizontalAlignment('center');
  setSheet.getRange(grandTotalRow, 2).setValue('合計');

  // E列(予定時間 手入力)の合計
  const plannedHoursColLetter = columnToLetter(plannedHoursCol);
  const plannedTotalFormula = `=SUM(${plannedHoursColLetter}5:${plannedHoursColLetter}${lastUserRow})`;
  setSheet.getRange(grandTotalRow, plannedHoursCol)
    .setFormula(plannedTotalFormula)
    .setNumberFormat('[h]:mm')
    .setBackground('#1c4587')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  // F列(予定時間 目安)の合計
  const plannedCalcColLetter = columnToLetter(plannedCalcCol);
  const plannedCalcTotalFormula = `=SUM(${plannedCalcColLetter}5:${plannedCalcColLetter}${lastUserRow})`;
  setSheet.getRange(grandTotalRow, plannedCalcCol)
    .setFormula(plannedCalcTotalFormula)
    .setNumberFormat('[h]:mm')
    .setBackground('#5b6f8a')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setFontStyle('italic')
    .setHorizontalAlignment('center');

  // 各日付列の合計
  dailySheetNames.forEach((sheetName, dateIdx) => {
    const colLetter = columnToLetter(firstDateCol + dateIdx);
    const formula = `=SUM(${colLetter}5:${colLetter}${lastUserRow})`;
    setSheet.getRange(grandTotalRow, firstDateCol + dateIdx)
      .setFormula(formula)
      .setNumberFormat('[h]:mm')
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
  });

  const totalColLetter = columnToLetter(totalCol);
  const grandTotalFormula = `=SUM(${totalColLetter}5:${totalColLetter}${lastUserRow})`;
  setSheet.getRange(grandTotalRow, totalCol)
    .setFormula(grandTotalFormula)
    .setNumberFormat('[h]:mm')
    .setBackground('#1c4587')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');

  // ===== 10時間未満強調表示 =====
  SpreadsheetApp.flush();

  dailySheetNames.forEach((sheetName, dateIdx) => {
    const cell = setSheet.getRange(grandTotalRow, firstDateCol + dateIdx);
    if (excludedDateSet.has(sheetName)) {
      cell.setBackground('#cccccc').setFontColor('#666666');
    } else {
      const value = cell.getValue();
      const hours = (typeof value === 'number') ? value * 24 : 0;
      if (hours < getDailyMinHighlightHours_()) {
        cell.setBackground('#f4cccc').setFontColor('#cc0000');
      } else {
        cell.setBackground('#dddddd').setFontColor('#000000');
      }
    }
  });

  setSheet.setColumnWidth(totalCol, 90);
  for (let i = 0; i < dailySheetNames.length; i++) {
    setSheet.setColumnWidth(firstDateCol + i, 110);
  }
}

/** ===================== シート操作（日付シート側） ===================== */

function saveShiftData(sheet) {
  const lastCol = sheet.getLastColumn();
  const lastRow = sheet.getLastRow();
  if (lastRow < 1 || lastCol < 2) return { shifts: {}, locks: null };

  let actualShiftCount = 0;
  // 新形式は見出し2行目(行3)の「シフト」、旧形式は行2/行1の「シフト」を末尾から数える
  for (const headerRow of [3, 2, 1]) {
    if (headerRow > lastRow) continue;
    try {
      const headers = sheet.getRange(headerRow, 1, 1, lastCol).getValues()[0];
      let count = 0;
      for (let c = lastCol - 1; c >= 0; c--) {
        if (headers[c] === 'シフト' || /^シフト\d*$/.test(String(headers[c]))) count++;
        else break;
      }
      if (count > 0) {
        actualShiftCount = count;
        break;
      }
    } catch (e) {}
  }
  if (actualShiftCount === 0) return { shifts: {}, locks: null };

  const shiftCol1 = lastCol - actualShiftCount + 1;
  const timeDisplayValues = sheet.getRange(1, 1, lastRow, 1).getDisplayValues();
  const shiftValues = sheet.getRange(1, shiftCol1, lastRow, actualShiftCount).getValues();

  const shiftMap = {};
  for (let i = 0; i < timeDisplayValues.length; i++) {
    const time = normalizeTimeKey(timeDisplayValues[i][0]);
    if (time && /^\d{2}:\d{2}$/.test(time)) {
      shiftMap[time] = shiftValues[i].slice();
    }
  }

  let locks = null;
  for (let r = 1; r <= Math.min(lastRow, 10); r++) {
    const label = sheet.getRange(r, 1).getDisplayValue().trim();
    if (label === 'ロック' || label.indexOf('ロック') >= 0) {
      try {
        locks = sheet.getRange(r, shiftCol1, 1, actualShiftCount).getValues()[0];
      } catch (e) {}
      break;
    }
  }

  return { shifts: shiftMap, locks };
}

function clearSheet(sheet) {
  sheet.setFrozenRows(0);
  sheet.setFrozenColumns(0);
  const maxRows = sheet.getMaxRows();
  const maxCols = sheet.getMaxColumns();
  const fullRange = sheet.getRange(1, 1, maxRows, maxCols);
  fullRange.breakApart();
  fullRange.clearDataValidations();
  sheet.clear();
}

function restoreShiftData(sheet, users, timeSlots, savedData) {
  const shiftMap = (savedData && savedData.shifts !== undefined) ? savedData.shifts : (savedData || {});
  const locks = (savedData && savedData.locks !== undefined) ? savedData.locks : null;

  const nameToIdx = {};
  users.forEach((u, i) => { nameToIdx[String(u.name || '').trim()] = i; });
  const shiftCol1 = users.length + 2;

  // 旧形式（汎用列）からの移行や列の並び替えに強いよう、
  // 保存値の「名前」を見てその本人の列へ配置する（位置依存にしない）。
  const restoredValues = timeSlots.map(time => {
    const row = new Array(users.length).fill('');
    const timeKey = normalizeTimeKey(time);
    const saved = shiftMap[timeKey] || shiftMap[String(time).trim()];
    if (saved && saved.length) {
      saved.forEach(v => {
        const name = String(v || '').trim();
        if (name && nameToIdx[name] !== undefined) {
          row[nameToIdx[name]] = name;
        }
      });
    }
    return row;
  });

  sheet.getRange(TIME_SLOT_START_ROW, shiftCol1, timeSlots.length, users.length).setValues(restoredValues);

  for (let r = 0; r < restoredValues.length; r++) {
    for (let c = 0; c < users.length; c++) {
      const name = restoredValues[r][c];
      if (!name) continue;
      const matchedUser = users.find(u => u.name === name);
      if (matchedUser) {
        sheet.getRange(r + TIME_SLOT_START_ROW, shiftCol1 + c)
          .setBackground(matchedUser.bgColor)
          .setFontColor(matchedUser.fontColor);
      }
    }
  }

  if (Array.isArray(locks) && locks.length > 0) {
    const lockValues = new Array(users.length).fill(false);
    for (let c = 0; c < Math.min(locks.length, users.length); c++) {
      lockValues[c] = locks[c] === true;
    }
    sheet.getRange(LOCK_ROW, shiftCol1, 1, users.length).setValues([lockValues]);
  }
}

function setupLayout(sheet, users, timeSlots, targetDate) {
  const totalCols = users.length + 1 + users.length;

  const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
  const weekday = weekdays[targetDate.getDay()];
  const dateStr = Utilities.formatDate(targetDate, 'JST', 'yyyy年MM月dd日') + ` (${weekday})`;

  sheet.getRange(1, 1, 1, totalCols)
    .setBackground('#1c4587')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setVerticalAlignment('middle')
    .setHorizontalAlignment('center');

  // A1: シフト確定チェックボックス。ONの日は自動割当・全クリア・カレンダー予定反映の対象外になる。
  sheet.getRange(CONFIRMED_CELL_ROW, CONFIRMED_CELL_COL)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build())
    .setValue(false)
    .setNote('チェックを入れると、この日のシフトは「確定」扱いになります。確定日は自動割当・シフト欄の初期化（全クリア）・カレンダー予定反映の対象から外れます。');
  writeConfirmedCellStyle_(sheet, false);

  sheet.getRange(1, 2, 1, totalCols - 1).merge()
    .setValue(dateStr)
    .setFontSize(14);

  // 見出し行1: 時刻 / 各ユーザー（予定列）/ 各ユーザー（シフト列）— 予定列とシフト列は同じ並び
  let header1 = ['時刻'];
  users.forEach(u => header1.push(u.name));   // 予定列の見出し
  users.forEach(u => header1.push(u.name));   // シフト列の見出し（同じ順序）

  sheet.getRange(2, 1, 1, totalCols).setValues([header1]).setFontWeight('bold');
  sheet.getRange(2, 1).setBackground('#444444').setFontColor('#ffffff');
  users.forEach((user, idx) => {
    // 予定列の見出し
    sheet.getRange(2, idx + 2)
      .setBackground(user.bgColor)
      .setFontColor(user.fontColor);
    // シフト列の見出し（同じ色）
    sheet.getRange(2, users.length + 2 + idx)
      .setBackground(user.bgColor)
      .setFontColor(user.fontColor);
  });

  // 見出し行2: 予定列は「予定」、シフト列は「シフト」
  let header2 = [''];
  users.forEach(() => header2.push('予定'));
  users.forEach(() => header2.push('シフト'));
  sheet.getRange(3, 1, 1, totalCols).setValues([header2])
    .setBackground('#eeeeee').setFontWeight('bold');

  const shiftCol1 = users.length + 2;
  sheet.getRange(LOCK_ROW, 1).setValue('主担当✓ / ロック')
    .setBackground('#fce4d6').setFontWeight('bold').setHorizontalAlignment('center');
  if (users.length > 0) {
    // 予定側の4行目は「主担当」チェックボックス（自動割当でその日一番長い人が自動チェックされる）
    const leadRange = sheet.getRange(LOCK_ROW, 2, 1, users.length);
    leadRange.setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
    leadRange.setValues([new Array(users.length).fill(false)]);
    leadRange
      .setBackground('#f3f3f3')
      .setFontColor('#666666')
      .setFontWeight('normal')
      .setHorizontalAlignment('center');
  }
  const lockRange = sheet.getRange(LOCK_ROW, shiftCol1, 1, users.length);
  const lockRule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  lockRange.setDataValidation(lockRule);
  lockRange.setValues([new Array(users.length).fill(false)]);
  lockRange.setBackground('#fce4d6');

  const timeColumn = timeSlots.map(t => [t]);
  sheet.getRange(TIME_SLOT_START_ROW, 1, timeColumn.length, 1)
    .setValues(timeColumn).setBackground('#f3f3f3');

  const shiftRange = sheet.getRange(TIME_SLOT_START_ROW, shiftCol1, timeSlots.length, users.length);
  shiftRange.setBackground('#fff4e5');

  // 各シフト列はその本人だけを入力できるドロップダウン（同じ列に他人が入らない）。
  // setAllowInvalid(true): 手入力で他人名を入れると警告は出るが、復元など内部書き込みで例外にならない。
  users.forEach((user, idx) => {
    const colRange = sheet.getRange(TIME_SLOT_START_ROW, shiftCol1 + idx, timeSlots.length, 1);
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList([user.name], true)
      .setAllowInvalid(true)
      .build();
    colRange.setDataValidation(rule);
  });

  const allRange = sheet.getRange(1, 1, timeSlots.length + (TIME_SLOT_START_ROW - 1), totalCols);
  allRange.setWrap(true);
  allRange.setVerticalAlignment('middle');
  allRange.setHorizontalAlignment('center');

  for (let c = 1; c <= totalCols; c++) {
    sheet.setColumnWidth(c, 120);
  }

  sheet.setFrozenRows(LOCK_ROW);
  sheet.setFrozenColumns(1);
}

function addDailyTotalsRow(sheet, users, timeSlots) {
  const totalsRow = timeSlots.length + TIME_SLOT_START_ROW;

  sheet.getRange(totalsRow, 1)
    .setValue('合計時間')
    .setBackground('#444444')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  const shiftCol1 = users.length + 2;
  const shiftLastCol = users.length + 1 + users.length;
  const shiftCol1Letter = columnToLetter(shiftCol1);
  const shiftLastColLetter = columnToLetter(shiftLastCol);
  const firstTimeRow = TIME_SLOT_START_ROW;
  const lastTimeRow = timeSlots.length + TIME_SLOT_START_ROW - 1;
  const shiftRangeA1 = `${shiftCol1Letter}${firstTimeRow}:${shiftLastColLetter}${lastTimeRow}`;

  users.forEach((user, idx) => {
    const userCol = idx + 2;
    const escapedUserName = String(user.name).replace(/"/g, '""');
    const formula = `=COUNTIF(${shiftRangeA1}, "${escapedUserName}") * 15 / 1440`;
    sheet.getRange(totalsRow, userCol)
      .setFormula(formula)
      .setNumberFormat('[h]:mm')
      .setBackground(user.bgColor)
      .setFontColor(user.fontColor)
      .setFontWeight('bold')
      .setHorizontalAlignment('center');
  });

  const allTotalFormula = `=COUNTA(${shiftRangeA1}) * 15 / 1440`;
  sheet.getRange(totalsRow, shiftCol1)
    .setFormula(allTotalFormula)
    .setNumberFormat('[h]:mm')
    .setBackground('#fff4e5')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  if (users.length > 1) {
    sheet.getRange(totalsRow, shiftCol1 + 1, 1, users.length - 1)
      .setBackground('#fff4e5');
  }
}

function fillAllEvents(sheet, users, allUserEvents, timeSlots) {
  users.forEach((user, userIdx) => {
    const col = userIdx + 2;
    const events = allUserEvents[userIdx];

    const sortedEvents = events.slice().sort((a, b) => {
      const aAllDay = isAllDayEventSafe(a);
      const bAllDay = isAllDayEventSafe(b);
      if (aAllDay === bAllDay) return 0;
      return aAllDay ? 1 : -1;
    });

    const slotData = new Array(timeSlots.length).fill(null);

    sortedEvents.forEach(event => {
      if (isAllDayEventSafe(event)) {
        for (let i = 0; i < timeSlots.length; i++) {
          if (!slotData[i]) slotData[i] = event.getTitle();
        }
        return;
      }

      const startStr = Utilities.formatDate(event.getStartTime(), 'JST', 'HH:mm');
      const endStr = Utilities.formatDate(event.getEndTime(), 'JST', 'HH:mm');

      let startIdx = timeSlots.findIndex(t => t >= startStr);
      let endIdx = timeSlots.findIndex(t => t >= endStr);
      if (startIdx === -1) return;
      if (endIdx === -1) endIdx = timeSlots.length;

      for (let i = startIdx; i < endIdx; i++) {
        if (!slotData[i]) slotData[i] = event.getTitle();
      }
    });

    let i = 0;
    while (i < slotData.length) {
      if (slotData[i]) {
        const title = slotData[i];
        let j = i + 1;
        while (j < slotData.length && slotData[j] === title) j++;

        const rowCount = j - i;
        const range = sheet.getRange(i + TIME_SLOT_START_ROW, col, rowCount, 1);
        range.setValue(title)
          .setBackground(user.bgColor)
          .setFontColor(user.fontColor)
          .setVerticalAlignment('middle')
          .setHorizontalAlignment('center');
        if (rowCount > 1) range.merge();
        i = j;
      } else {
        i++;
      }
    }
  });
}

/** ===================== 既存: onEdit ===================== */

function onEdit(e) {
  const sheet = e.range.getSheet();
  const sheetName = sheet.getName();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(sheetName)) return;

  // A1: シフト確定チェックボックス。状態に合わせて見た目だけ更新する。
  if (e.range.getRow() === CONFIRMED_CELL_ROW && e.range.getColumn() === CONFIRMED_CELL_COL) {
    writeConfirmedCellStyle_(sheet, e.range.getValue() === true);
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const setSheet = ss.getSheetByName('設定');
  if (!setSheet) return;

  const lastRow = setSheet.getLastRow();
  if (lastRow < 5) return;

  const users = readUsers(setSheet);
  const userCount = users.length;
  const shiftCol1 = userCount + 2;
  const shiftLastCol = userCount + 1 + users.length;

  const col = e.range.getColumn();
  const row = e.range.getRow();

  if (col < shiftCol1 || col > shiftLastCol || row < TIME_SLOT_START_ROW) return;

  const timeAtRow = sheet.getRange(row, 1).getDisplayValue().trim();
  if (!/^\d{1,2}:\d{2}$/.test(timeAtRow)) return;

  const selectedName = e.range.getValue();

  if (selectedName === "" || selectedName === null) {
    e.range.setBackground('#fff4e5').setFontColor('#000000');
    return;
  }

  const matchedUser = users.find(u => u.name === selectedName);
  if (matchedUser) {
    e.range.setBackground(matchedUser.bgColor).setFontColor(matchedUser.fontColor);
  }
}

/** ===================== 補助関数 ===================== */

/**
 * 設定シートからユーザー一覧を読み込み
 *  - A: 名前, B: メール, C: 色, D: 予定人月, E: 予定時間(手入力)
 *  - F: 予定時間(目安/自動計算) ← 読み込み不要
 *  - G: 開始時刻, H: 終了時刻
 */
function readUsers(setSheet) {
  const lastRow = setSheet.getLastRow();
  if (lastRow < 5) return [];

  // A〜H列を読む（8列。G=開始時刻, H=終了時刻）
  const userRange = setSheet.getRange(5, 1, lastRow - 4, 8);
  const userValues = userRange.getValues();
  const userDisplayValues = userRange.getDisplayValues();
  const userBgColors = userRange.getBackgrounds();
  const userFontColors = userRange.getFontColors();

  return userValues.map((row, idx) => ({
    name: String(row[0] || '').trim(),
    email: String(row[1] || '').trim(),
    bgColor: userBgColors[idx][2] !== '#ffffff' ? userBgColors[idx][2] : '#d1eaff',
    fontColor: userFontColors[idx][2] || '#ffffff',
    settingRow: idx + 5,
    startTime: parseTimeCell(userDisplayValues[idx][6]),  // G列: 開始時刻 (index 6)
    endTime: parseTimeCell(userDisplayValues[idx][7]),    // H列: 終了時刻 (index 7)
  })).filter(u => u.name && u.email && /@/.test(String(u.email)));
}

function parseTimeCell(displayValue) {
  if (!displayValue && displayValue !== 0) return null;
  const s = String(displayValue).trim();
  if (!s) return null;
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (isNaN(h) || isNaN(min) || h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/**
 * 時刻キーを HH:mm に正規化する。
 * Google Sheets の表示形式によって 9:00 / 09:00 が混在すると、
 * カレンダー反映時のシフト復元で 9時台だけ一致しないため、保存・復元の両方で使う。
 */
function normalizeTimeKey(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) {
    return Utilities.formatDate(value, 'JST', 'HH:mm');
  }
  const s = String(value).trim();
  if (!s) return '';
  const m = s.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return s;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (isNaN(h) || isNaN(min)) return s;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function parseSlotTime(date, timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(date.getTime());
  d.setHours(h, m, 0, 0);
  return d;
}

function slotEndTime(timeSlots, slotIdx) {
  const t = timeSlots[slotIdx];
  const [h, m] = t.split(':').map(Number);
  const total = h * 60 + m + 15;
  const eh = Math.floor(total / 60);
  const em = total % 60;
  return `${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`;
}

/**
 * 指定月（year, monthIndex=0-11）の稼働日数（土日・日本の祝日を除く平日数）を返す。
 * 祝日は日本の祝日カレンダーから取得。取得できない場合は土日除外のみで数える。
 */
function countBusinessDays(year, monthIndex) {
  const monthStart = new Date(year, monthIndex, 1);
  const nextMonthStart = new Date(year, monthIndex + 1, 1);
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();

  const holidaySet = {};
  try {
    const cal = CalendarApp.getCalendarById('ja.japanese#holiday@group.v.calendar.google.com');
    if (cal) {
      const evs = cal.getEvents(monthStart, nextMonthStart);
      evs.forEach(ev => {
        try {
          const d = ev.getStartTime();
          holidaySet[Utilities.formatDate(d, 'JST', 'yyyy-MM-dd')] = true;
        } catch (e) {}
      });
    }
  } catch (e) {}

  let count = 0;
  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(year, monthIndex, d);
    const dow = date.getDay();
    if (dow === 0 || dow === 6) continue;  // 日曜・土曜を除外
    const key = Utilities.formatDate(date, 'JST', 'yyyy-MM-dd');
    if (holidaySet[key]) continue;          // 祝日を除外
    count++;
  }
  return count;
}

function parseHoursValue(cellOrVal) {
  if (cellOrVal && typeof cellOrVal.getValue === 'function') {
    let fmt = '';
    try { fmt = cellOrVal.getNumberFormat() || ''; } catch (e) {}
    const isTimeFmt = /(\[?h\]?[:.]mm|hh[:.]mm|h[:.]mm)/i.test(fmt);

    if (isTimeFmt) {
      let dv = '';
      try { dv = String(cellOrVal.getDisplayValue() || '').trim(); } catch (e) {}
      const m = dv.match(/^(-?\d+):(\d+)/);
      if (m) {
        const sign = m[1].startsWith('-') ? -1 : 1;
        return sign * (Math.abs(parseInt(m[1], 10)) + parseInt(m[2], 10) / 60);
      }
      const val = cellOrVal.getValue();
      if (typeof val === 'number') return val * 24;
      return 0;
    }

    const val = cellOrVal.getValue();
    if (typeof val === 'number') return val;
    if (val instanceof Date) return val.getHours() + val.getMinutes() / 60;
    if (val) {
      const m = String(val).match(/^(\d+):(\d+)$/);
      if (m) return parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
      const n = parseFloat(val);
      if (!isNaN(n)) return n;
    }
    return 0;
  }

  const val = cellOrVal;
  if (typeof val === 'number') return val * 24;
  if (val instanceof Date) {
    return val.getHours() + val.getMinutes() / 60;
  }
  if (val) {
    const m = String(val).match(/^(\d+):(\d+)$/);
    if (m) return parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
    const n = parseFloat(val);
    if (!isNaN(n)) return n;
  }
  return 0;
}

function sumArray(arr) {
  let s = 0;
  for (let i = 0; i < arr.length; i++) s += arr[i];
  return s;
}

function isAllDayEventSafe(event) {
  try { return event.isAllDayEvent(); } catch (e) { return false; }
}

function generateTimeSlots(startStr, endStr) {
  let slots = [];
  let current = new Date(`2000/01/01 ${startStr}`);
  const end = new Date(`2000/01/01 ${endStr}`);
  while (current < end) {
    slots.push(Utilities.formatDate(current, 'JST', 'HH:mm'));
    current.setMinutes(current.getMinutes() + 15);
  }
  return slots;
}

function fetchEvents(email, date) {
  try {
    const calendar = CalendarApp.getCalendarById(email);
    if (!calendar) return [];
    const start = new Date(date.setHours(0, 0, 0, 0));
    const end = new Date(date.setHours(23, 59, 59, 999));
    return calendar.getEvents(start, end).filter(ev => {
      try {
        return ev.getMyStatus() !== CalendarApp.GuestStatus.NO;
      } catch (e) {
        return true;
      }
    });
  } catch (e) { return []; }
}

function columnToLetter(col) {
  let letter = '';
  while (col > 0) {
    const mod = (col - 1) % 26;
    letter = String.fromCharCode(65 + mod) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

/** ===================== 設定シート初期化 ===================== */

function createSettingsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  let setSheet = ss.getSheetByName('設定');
  if (setSheet) {
    const res = ui.alert(
      '確認',
      '既存の「設定」シートを初期化します。\n入力済みのデータは全て消えます。\n（日付シートと「除外日」シートはこの操作では削除されません）\n\n続行しますか？',
      ui.ButtonSet.OK_CANCEL
    );
    if (res !== ui.Button.OK) return;

    setSheet.setFrozenRows(0);
    setSheet.setFrozenColumns(0);
    const maxRows = setSheet.getMaxRows();
    const maxCols = setSheet.getMaxColumns();
    const full = setSheet.getRange(1, 1, maxRows, maxCols);
    full.breakApart();
    full.clearDataValidations();
    setSheet.clear();
  } else {
    setSheet = ss.insertSheet('設定', 0);
  }

  // ===== 1行目: ラベル =====
  // 列構成: A=開始日, B=取得日数, C=開始時刻, D=終了時刻, E=月の稼働日数,
  //   A 開始日 / B 取得日数 / C 開始時刻 / D 終了時刻 / E 月の稼働日数 /
  //   F 予定時間計算用稼働日数 / G 月間目標 / H 1日上限 / I 1日下限 /
  //   J メイン担当1 / K メイン担当2 / L メイン担当外 / M 管理者メール / N シフト登録キーワード / O 前後1hブロックキーワード
  const headerLabels = [
    ['開始日', '取得日数', '開始時刻', '終了時刻', '月の稼働日数',
     '予定時間計算用稼働日数', '月間目標', '1日上限', '1日下限',
     'メイン担当1', 'メイン担当2', 'メイン担当外', '管理者メール', 'シフト登録キーワード', '前後1hブロックキーワード']
  ];
  setSheet.getRange(1, 1, 1, headerLabels[0].length)
    .setValues(headerLabels)
    .setBackground('#1c4587')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  // ===== 2行目: 値 =====
  const today = new Date();
  // 開始日 = 実行日の翌月初日
  const startDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const sY = startDate.getFullYear();
  const sM = startDate.getMonth();                 // 0-indexed（開始日の月）
  // 取得日数 = 開始日の月の日数
  const daysInStartMonth = new Date(sY, sM + 1, 0).getDate();
  // 月の稼働日数 = 土日祝を除いた日数
  const businessDays = countBusinessDays(sY, sM);

  setSheet.getRange('A2').setValue(startDate).setNumberFormat('yyyy/MM/dd'); // 開始日（翌月初日）
  setSheet.getRange('B2').setValue(daysInStartMonth);                       // 取得日数（その月の日数）
  setSheet.getRange('C2').setValue('09:00').setNumberFormat('h:mm');        // 開始時刻
  setSheet.getRange('D2').setValue('18:00').setNumberFormat('h:mm');        // 終了時刻
  setSheet.getRange('E2').setValue(businessDays);                          // 月の稼働日数（土日祝を除く）
  setSheet.getRange('F2').setValue(20);                                    // 予定時間計算用稼働日数（固定20）
  setSheet.getRange('G2').setValue(240 / 24).setNumberFormat('[h]:mm');     // 月間目標 240:00（固定）
  setSheet.getRange('H2').setValue(12 / 24).setNumberFormat('[h]:mm');      // 1日上限 12:00
  setSheet.getRange('I2').setValue(10 / 24).setNumberFormat('[h]:mm');      // 1日下限 10:00（固定）
  setSheet.getRange('J2').setValue(''); // メイン担当1（最優先・メール、カンマ区切りで複数可）
  setSheet.getRange('K2').setValue(''); // メイン担当2（次点・メール、カンマ区切りで複数可）
  setSheet.getRange('L2').setValue(''); // メイン担当外（メール、カンマ区切りで複数可）
  setSheet.getRange('M2').setValue(''); // 管理者メール
  setSheet.getRange('N2').setValue(''); // シフト登録キーワード（カンマ区切りで複数可）
  setSheet.getRange('O2').setValue(''); // 前後1hブロックキーワード（カンマ区切りで複数可）

  setSheet.getRange(2, 1, 1, headerLabels[0].length)
    .setBackground('#e8eef7')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');
  // ラベルのアクセント色: I=1日下限(茶), K=メイン担当2(青), L=メイン担当外(紫), N=キーワード(緑), O=前後1hブロック(赤)
  setSheet.getRange('I1').setBackground('#7f6000');
  setSheet.getRange('K1').setBackground('#3d6bb3');
  setSheet.getRange('L1').setBackground('#674ea7');
  setSheet.getRange('N1').setBackground('#38761d');
  setSheet.getRange('O1').setBackground('#990000');

  // ===== 4行目: ユーザー表ヘッダー =====
  const userTableHeaders = [
    ['名前', 'メールアドレス', '色（背景色 + 文字色）', '予定人月', '予定時間(手入力)',
     '予定時間(目安)', '開始時刻', '終了時刻', '合計']
  ];
  setSheet.getRange(4, 1, 1, userTableHeaders[0].length)
    .setValues(userTableHeaders)
    .setBackground('#444444')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setVerticalAlignment('middle');

  // ===== サンプルユーザー（3名分の空欄行＋色見本） =====
  const sampleColors = [
    { bg: '#d1eaff', fg: '#000000' },
    { bg: '#ffe1d6', fg: '#000000' },
    { bg: '#e0f4d6', fg: '#000000' },
  ];
  sampleColors.forEach((color, i) => {
    const row = 5 + i;
    setSheet.getRange(row, USER_COL_COLOR)
      .setValue('●●●')
      .setBackground(color.bg)
      .setFontColor(color.fg)
      .setHorizontalAlignment('center');
    setSheet.getRange(row, USER_COL_PLANNED_PERSON_MONTH)
      .setValue('')
      .setHorizontalAlignment('center');

    // E列: 予定時間 (手入力) - 書式だけ
    setSheet.getRange(row, USER_COL_PLANNED_HOURS)
      .setNumberFormat('[h]:mm')
      .setHorizontalAlignment('center')
      .setBackground('#fff8e1');  // 手入力欄であることを示す薄黄

    // F列: 予定時間(目安) = 予定人月 × 稼働日数(I2) × (D2 - C2 - 休憩)
    // 全体の標準時間 C2/D2 を基準にし、Dで按分する（個人G/H列は使わない）
    const plannedFormula = `=D${row}*$F$2*MAX(0,$D$2-$C$2-${BREAK_HOURS}/24)`;
    setSheet.getRange(row, USER_COL_PLANNED_HOURS_CALC)
      .setFormula(plannedFormula)
      .setNumberFormat('[h]:mm')
      .setHorizontalAlignment('center')
      .setFontColor('#666666')
      .setFontStyle('italic');

    // G列: 開始時刻
    setSheet.getRange(row, USER_COL_START_TIME)
      .setNumberFormat('h:mm')
      .setHorizontalAlignment('center');
    // H列: 終了時刻
    setSheet.getRange(row, USER_COL_END_TIME)
      .setNumberFormat('h:mm')
      .setHorizontalAlignment('center');
  });

  // ===== 列幅 =====
  const widths = {
    1: 90,    // A: 名前 / 開始日
    2: 220,   // B: メール / 取得日数
    3: 130,   // C: 色 / 開始時刻
    4: 80,    // D: 予定人月 / 終了時刻
    5: 90,    // E: 予定時間(手入力) / 月の稼働日数
    6: 90,    // F: 予定時間(目安) / (空)
    7: 90,    // G: 開始時刻 / 月間目標
    8: 90,    // H: 終了時刻 / 1日上限
    9: 110,   // I: 合計 / 予定時間計算用稼働日数
    10: 130,  // J: 第1日付列 / 管理者メール
    11: 200,  // K: 第2日付列 / シフト登録キーワード
    12: 200,  // L: 第3日付列 / メイン担当1
    13: 200,  // M: 第4日付列 / メイン担当2
    14: 90,   // N: 第5日付列 / 1日下限
    15: 240,  // O: 第6日付列 / 前後1hブロックキーワード
    16: 200,  // P: 第7日付列
  };
  Object.keys(widths).forEach(c => setSheet.setColumnWidth(Number(c), widths[c]));

  setSheet.setFrozenRows(2);
  setSheet.setFrozenColumns(1);

  // ===== 除外日シート =====
  let excSheet = ss.getSheetByName(EXCLUDED_DATES_SHEET_NAME);
  if (!excSheet) {
    excSheet = ss.insertSheet(EXCLUDED_DATES_SHEET_NAME);
  }
  excSheet.getRange(1, 1)
    .setValue('シフト除外日')
    .setBackground('#444444')
    .setFontColor('#ffffff')
    .setFontWeight('bold')
    .setHorizontalAlignment('center');
  excSheet.setColumnWidth(1, 150);
  excSheet.setFrozenRows(1);

  ss.setActiveSheet(setSheet);

  createDocsSheet();

  ui.alert(
    '初期化完了',
    '「設定」「除外日」「使い方」シートを作成しました。\n\n' +
    '★自動で設定した値（実行日基準。必要なら変更可）:\n' +
    '   開始日=翌月初日, 取得日数=その月の日数, 月の稼働日数=土日祝を除く平日数\n' +
    '   月間目標=240:00, 1日上限=12:00, 予定時間計算用稼働日数=20, 1日下限=10:00\n\n' +
    '★レイアウト:\n' +
    '   E列 = 予定時間（手入力）← 自動シフトはここを目標値として使う\n' +
    '   F列 = 予定時間(目安)（人月から自動計算）← 参考表示\n\n' +
    '次の手順:\n' +
    '1. 上部行の各値を確認/編集\n' +
    '   ・F2: 予定時間計算用稼働日数（F列の目安計算に使用）\n' +
    '   ・G2: 月間目標, H2: 1日上限, I2: 1日下限\n' +
    '   ・J2: メイン担当1（最優先）/ K2: メイン担当2（次点）/ L2: メイン担当外（1・2が両方予定の時に充てる）\n' +
    '   ・M2: 管理者メール（自動シフト対象外）\n' +
    '   ・N2: シフト登録キーワード（任意・カンマ区切りで複数可。予定タイトルに含まれると本人をその時間帯のシフトに登録）\n   ・O2: 前後1hブロックキーワード（任意・カンマ区切りで複数可。予定タイトルに含まれると本人の前後1時間を割当不可）\n' +
    '2. 5行目以降にユーザー情報を入力\n' +
    '   ・A: 名前, B: メール, C: 色, D: 予定人月\n' +
    '   ・E: 予定時間（手入力。F列の目安を参考に入力）\n' +
    '   ・G: 開始時刻, H: 終了時刻（空欄なら全日対象）\n' +
    '3. メニュー「最新のカレンダー予定を反映（シフト保持）」を実行\n' +
    '4. シフトを空にしたい場合だけ、メニュー「シフト欄を初期化（全クリア）」を実行\n' +
    '5. メニュー「シフトを自動入力（空き枠のみ）」を実行\n\n' +
    '※ 一部の期間だけ組みなおしたい場合は、メニュー「指定期間だけ組みなおす」で開始日〜終了日を指定してください（範囲外の日は変更されません）\n' +
    '※ 詳細ルールは「使い方」シートを参照してください\n' +
    '※ 週ごとの主担当・稼働メンバーを指定したい場合は「週次担当シートを作成/更新」も実行してください\n' +
    '※ 特定の予定を自動割当で無視したい場合は「運用設定シートを作成/更新」の「自動割当: 予定無視キーワード」を設定してください',
    ui.ButtonSet.OK
  );
}

/**
 * メニュー: 「使い方」シートを生成・更新
 */
function createDocsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = '使い方';
  let sh = ss.getSheetByName(sheetName);
  if (!sh) {
    sh = ss.insertSheet(sheetName);
  } else {
    sh.clear();
    sh.setFrozenRows(0);
  }

  const sections = [
    { type: 'title', text: 'シフト自動割当 設定ルール' },
    { type: 'meta', text: '更新日: ' + Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd') },
    { type: 'space' },

    { type: 'h1', text: '■ 設定シートのセル（上部・1〜2行目）' },
    { type: 'kv', k: 'A2: 開始日', v: 'シフトを生成する開始日（yyyy/MM/dd）。初期化時は「実行日の翌月初日」を自動設定' },
    { type: 'kv', k: 'B2: 取得日数', v: '開始日から何日分処理するか。初期化時は「開始日の月の日数」を自動設定' },
    { type: 'kv', k: 'C2: 開始時刻', v: '1日のシフト開始時刻（例: 9:00）' },
    { type: 'kv', k: 'D2: 終了時刻', v: '1日のシフト終了時刻（例: 18:00。この時刻自体は含まない）' },
    { type: 'kv', k: 'E2: 月の稼働日数', v: '参考値。初期化時は「土日祝を除く平日数」を自動設定（日本の祝日カレンダー使用）' },
    { type: 'kv', k: 'F2: 予定時間計算用稼働日数', v: 'ユーザーF列「予定時間(目安)」の計算で使う日数（初期化時は 20）' },
    { type: 'kv', k: 'G2: 月間目標', v: 'チーム全体の月間目標時間（[h]:mm 形式。初期化時は 240:00 を自動設定）' },
    { type: 'kv', k: 'H2: 1日上限', v: 'チーム全員の1日合計時間の上限（[h]:mm 形式、空欄で上限なし）' },
    { type: 'kv', k: 'I2: 1日下限', v: '各日のチーム合計の最低ライン（[h]:mm 形式、空欄/0でオフ）。初期化時は 10:00。カバー後この時間まで人を重ねて引き上げる' },
    { type: 'kv', k: 'J2: メイン担当1 / K2: メイン担当2', v: '任意・メール（複数可）。シフトに優先して入る。1が最優先、次に2' },
    { type: 'kv', k: 'L2: メイン担当外', v: '任意・メール（複数可）。メイン担当1・2が両方とも予定で入れない時に充てる担当。全員予定の枠はこの人を強制カバー' },
    { type: 'kv', k: 'M2: 管理者メール', v: '自動シフト対象外のメール（カンマ区切りで複数可）' },
    { type: 'kv', k: 'N2: シフト登録キーワード', v: '任意・カンマ区切りで複数可。自分の予定タイトルにいずれかが含まれる時間帯は、その本人をシフトに登録（空欄で機能オフ）' },
    { type: 'kv', k: 'O2: 前後1hブロックキーワード', v: '任意・カンマ区切りで複数可。予定タイトルにいずれかが含まれると、その本人は予定の前後1時間も自動割当不可（空欄で機能オフ）' },
    { type: 'space' },

    { type: 'h1', text: '■ ユーザー行（5行目以降）' },
    { type: 'kv', k: 'A: 名前', v: 'シフト表での表示名' },
    { type: 'kv', k: 'B: メールアドレス', v: 'Googleカレンダーから予定を取得するメール' },
    { type: 'kv', k: 'C: 色', v: 'この列の背景色を変えると、シフト表でその色が使われる（文字色も反映）' },
    { type: 'kv', k: 'D: 予定人月', v: 'その人の月の稼働比率（例: 0.5=半人月）' },
    { type: 'kv', k: 'E: 予定時間(手入力)', v: '【自動シフトはここを目標値として使う】手入力。F列の目安を参考に入力してください' },
    { type: 'kv', k: 'F: 予定時間(目安)', v: 'D × I2 ×（D2−C2−休憩）で自動計算。全体の標準時間(C2/D2)が基準。参考表示のみ（自動シフトは使わない）' },
    { type: 'kv', k: 'G: 開始時刻', v: '個人のシフト開始時刻（例: 10:00、空欄なら全日対象）' },
    { type: 'kv', k: 'H: 終了時刻', v: '個人のシフト終了時刻（例: 16:00、空欄なら全日対象）' },
    { type: 'kv', k: 'I: 合計', v: '全日付の実シフト時間合計（自動計算）' },
    { type: 'kv', k: 'J以降: 各日付', v: '各日のシフト時間（自動計算）' },
    { type: 'space' },

    { type: 'h1', text: '■ 週次担当（週ごとの主担当・稼働メンバー）★NEW' },
    { type: 'text', text: '「週次担当」シートに、週（暦の月曜始まり）ごとの「主担当」と「稼働メンバー」を登録できます。メニュー「初回セットアップ・設定 → 週次担当シートを作成/更新」で作成・更新します。' },
    { type: 'kv', k: '週開始日(月曜)', v: 'その週の月曜日。月曜以外を入れてもその週の月曜に丸めて扱う' },
    { type: 'kv', k: '主担当(その週)', v: 'その週に優先してシフトに入る人（1人目）。名前またはメールで指定。カンマ区切りで複数書くと、先頭から「その日に出られる人」を主担当にする' },
    { type: 'kv', k: '稼働メンバー(この週に入る人)', v: 'その週にシフトへ入れる人を限定する。ここに書いた人だけが自動割当の対象（空欄なら全員）' },
    { type: 'bullet', text: '稼働メンバーを限定すると、書いていない人はその週は自動で入らない（既存の手動シフト・ロックは残る）' },
    { type: 'bullet', text: '主担当は稼働メンバーに書き忘れても、その週は必ず稼働扱いになる' },
    { type: 'bullet', text: 'このシートに無い週は従来通り（メイン担当1/2のうち予定が少ない方を日ごとに自動選択）の動作になる' },
    { type: 'bullet', text: '週主担当を指定した週は、メイン担当1/2の自動「日分け」（主担当でない方を後回しにする動き）は働かない' },
    { type: 'bullet', text: '稼働メンバーで除外された人は、緊急の強制カバーや最終フォールバックでも割り当てない（最後まで非稼働を維持）' },
    { type: 'space' },

    { type: 'h1', text: '■ 自動割当: 予定無視キーワード ★NEW' },
    { type: 'text', text: '「運用設定」シートの「自動割当: 予定無視キーワード」に語句を入れると、予定タイトルにその語句が含まれる予定は、自動割当の判定上「予定なし」として扱われます（終日予定も無視）。カンマ区切りで複数可、空欄で機能オフ。' },
    { type: 'bullet', text: 'カレンダー上の予定列の表示自体は変わらない。あくまで自動割当（シフト作成）の判定だけが変わる' },
    { type: 'bullet', text: '主担当選び（予定が少ない人を優先する判定）やダブルブッキング判定でも、無視キーワードに一致する予定は予定として数えない' },
    { type: 'bullet', text: '「前後1hブロックキーワード(O2)」は別の独立した機能で、無視キーワードに一致してもブロックは維持される（安全側を優先）' },
    { type: 'space' },

    { type: 'h1', text: '■ 予定時間: 手入力(E) と 目安(F) の使い分け' },
    { type: 'text', text: 'E列は手入力、F列は自動計算の目安です。自動シフトはE列の値を「個人の月間目標時間」として使います。' },
    { type: 'bullet', text: 'E列が空欄(=0)の人は、自動シフトで「達成率」のソートが効かず、最優先候補にならない傾向になります' },
    { type: 'bullet', text: 'F列の目安を見つつ、E列に運用したい値を入力するのが基本' },
    { type: 'bullet', text: 'F列は D(人月=フルタイム比率)・I2(稼働日数)・C2/D2(全体の標準時間)から自動計算。個人のG/H列は使わない' },
    { type: 'bullet', text: '計算式: D × I2 ×（D2−C2−休憩1h）。例: D=1, I2=20, 9:00〜18:00 なら 8h×20=160:00' },
    { type: 'bullet', text: 'F列はイタリック・薄字で表示（目安であることを明示）' },
    { type: 'space' },

    { type: 'h1', text: '■ 担当者ごとの稼働時間帯' },
    { type: 'text', text: 'G列とH列に開始時刻・終了時刻を入力すると、その時間帯内でのみ自動シフトが組まれます。' },
    { type: 'bullet', text: '両方空欄: その人は全時間帯（C2〜D2）が対象' },
    { type: 'bullet', text: '開始のみ入力: 開始時刻以降のみ対象（終了は全体D2）' },
    { type: 'bullet', text: '終了のみ入力: 終了時刻以前のみ対象（開始は全体C2）' },
    { type: 'bullet', text: '両方入力: その時間帯内のみ対象（時短勤務などに対応）' },
    { type: 'bullet', text: '※ F列「予定時間(目安)」はG/H列に影響されません（目安は全体のC2/D2基準。Dの比率で時短を表現してください）' },
    { type: 'space' },

    { type: 'h1', text: '■ メイン担当1 / 2 / メイン担当外（J2 / K2 / L2）' },
    { type: 'text', text: 'J2=メイン担当1（最優先）、K2=メイン担当2（次点）、L2=メイン担当外。各セルはカンマ区切りで複数可。週次担当シートで主担当を指定した週は、そちらが優先されます。' },
    { type: 'bullet', text: '1人目（ソロ）の優先: 週次担当の主担当 → （無ければ）各日、メイン担当1/2のうち予定が埋まっている時間が少ない方 → その他の人 → もう一方のメイン担当' },
    { type: 'bullet', text: 'メイン担当外は「1人では基本入らない。2人目（ペア）として入る」担当。1人目には原則ならない' },
    { type: 'bullet', text: '2人目の増員（ペア／1日下限／1人日回避）ではメイン担当外を最優先で入れる' },
    { type: 'bullet', text: '他に誰も1人目に入れない時のみ、最終手段としてメイン担当外を1人で入れることがある' },
    { type: 'bullet', text: '全員が予定で誰も入れない時間帯は、メイン担当1/2のうち、その日の予定が少ない主担当を優先する。時間指定の予定と重なってでも入れる。終日予定の人は必ず除外' },
    { type: 'bullet', text: 'メイン担当1と2は基本的に日を分ける。各日、予定が埋まっている時間の長さを比較して少ない方を主担当にする。1も2も入れない時のみ最後の保険としてメイン担当外' },
    { type: 'bullet', text: '各日付シートの4行目（予定列側）は「主担当チェックボックス」。自動割当のたびに、その日で一番シフト時間が長い人へ自動でチェックが入る（下の「主担当（チェックボックス）」参照）。シフト列側の4行目は従来どおりロックチェックボックス' },
    { type: 'bullet', text: '全員予定の緊急強制カバーと、1人だけの日を避ける最終ペア追加では、予定時間(E)や月間目標(G2)を超える場合がある（結果ダイアログに表示）' },
    { type: 'space' },

    { type: 'h1', text: '■ 主担当（チェックボックス／その日で一番長い人）★NEW' },
    { type: 'text', text: '各日付シートの4行目・予定列側は「主担当」チェックボックスです。自動割当を実行すると、その日で一番シフト時間が長い人に自動でチェックが入ります（同時間なら内部の主担当→予定が少ない→並び順で決定）。' },
    { type: 'bullet', text: '表示は割当結果に連動。カレンダー反映だけの段階では、メイン担当1/2から仮選択して暫定チェックを付け、自動割当で正式に更新する' },
    { type: 'bullet', text: '内部の割当優先順位（メイン1/2の日分けなど）は従来どおり。チェックボックスは「結果として一番長い人」を表示するもの' },
    { type: 'space' },

    { type: 'h1', text: '■ 絶対カバー（埋まらない日を作らない・数周）★NEW' },
    { type: 'text', text: '通常のカバー・最終手段でも埋まらない時間帯が残った場合、最後に何周かして、実際に空いている担当者で全時間帯を強制的に充填します。' },
    { type: 'bullet', text: '早い周はチーム1日上限(H2)を守り、それでも埋まらない周からはH2を超過して埋める（結果ダイアログに時間を表示）' },
    { type: 'bullet', text: 'カバー最優先のため、予定時間(E)・月間目標(G2)を超える場合がある（従来の最終手段と同じ扱い）' },
    { type: 'bullet', text: '1人1日8時間・終日予定・ロック列・管理者・週次非稼働・特定予定±1h・同時禁止相手・同時刻の担当者上限 は最後まで維持する' },
    { type: 'bullet', text: '本人の実予定には重ねない（二重登録しない）。8時間到達や全員予定などで物理的に埋められない枠だけは、従来どおり警告に残す' },
    { type: 'space' },

    { type: 'h1', text: '■ 飛び飛びシフトの最終まとめ（主担当以外）★NEW' },
    { type: 'text', text: '割当の最後に、各時間帯の合計人数（カバー）と各人の合計時間を一切変えずに、担当者を入れ替えて各人のシフトができるだけ連続ブロックになるよう調整します。' },
    { type: 'bullet', text: '対象は主担当（その日で一番長い人）以外。主担当・管理者・ロック列・カレンダー予定/手動で固定のセルは動かさない' },
    { type: 'bullet', text: '入れ替え先は本人が実際に空いていて稼働時間帯(G/H)内の時間のみ。特定予定±1h・同時禁止相手も維持' },
    { type: 'bullet', text: 'カバー人数を変えない入れ替えのみのため、連続化できる範囲には限りがある（相手と交換できる場合だけまとまる）' },
    { type: 'space' },

    { type: 'h1', text: '■ 短い孤立シフトの解消 ★NEW' },
    { type: 'text', text: '割当の最後に、最小連続ブロック(既定60分)未満で前後に自分のシフトが無い「短い孤立シフト（例: 30分だけ1人ぽつんと）」を無くします。運用設定シート「短い孤立シフトを解消」がONのとき有効（既定ON。OFFで従来どおり残します）。' },
    { type: 'bullet', text: 'まず本人が実際に空いている前後の時間へ延長し、最小連続ブロック以上のまとまったシフトにできないか試す（8h/日・特定予定±1h・同時刻の担当者上限・同時禁止相手は維持）' },
    { type: 'bullet', text: '前後に延長できず最小連続ブロックに届かない端数は、短い孤立シフトとして外し、警告に出す（要確認）' },
    { type: 'bullet', text: '手動/既存/カレンダー予定由来で固定のセル・ロック列・管理者は対象外（実シフトは触らない）。昼休みで途切れて見えるだけの連続ブロックは1つとして扱い誤って外さない' },
    { type: 'space' },

    { type: 'h1', text: '■ 予定時間(E)の厳守' },
    { type: 'text', text: 'ユーザーE列「予定時間(手入力)」は各人の月間目標で、自動シフトの上限として厳守します（その人の割当合計がEを超えないように配分）。' },
    { type: 'bullet', text: 'Eとカバー(最低1人)・1日下限がぶつかった時はEを優先。Eを守るために埋まらない時間帯は警告に出ます' },
    { type: 'bullet', text: '例外は「全員が予定で誰も入れない時間帯」の緊急強制と、「1人だけの日」を避ける最終ペア追加。ここではEを超えうる' },
    { type: 'bullet', text: 'E未設定(0)の人は上限なし扱い（必要に応じて多めに入る）' },
    { type: 'space' },

    { type: 'h1', text: '■ 1日下限 / 1日上限（I2 / H2）' },
    { type: 'text', text: '各日のチーム合計シフト時間に下限(I2)と上限(H2)を設けられます。' },
    { type: 'bullet', text: '1日上限(H2): 1日のチーム合計はこの時間を超えない' },
    { type: 'bullet', text: '1日下限(I2): カバーの後、まだ下限に満たない日は2人目（メイン担当外を優先）を重ねて下限まで引き上げる' },
    { type: 'bullet', text: '1人日回避: 担当者が1人だけの日には、既にカバー済みの時間帯へ2人目を1時間以上追加する。まずE/G2内で試し、無理な場合だけ最終手段としてE/G2超過を許可' },
    { type: 'bullet', text: '下限の引き上げもE厳守・予定への二重登録なし。Eや予定の制約で下限に届かない場合は届く範囲まで' },
    { type: 'bullet', text: '空欄/0で下限オフ' },
    { type: 'space' },

    { type: 'h1', text: '■ 全時間帯カバー（E厳守の範囲で）' },
    { type: 'text', text: '稼働時間帯(C2〜D2)から昼休みを除いた全ての時間帯に、最低1人が入るように割り当てます。ただしE（予定時間）厳守を優先します。' },
    { type: 'bullet', text: '1人目は各日の主担当（週次担当の主担当、または メイン1/2のうち予定が少ない方）→その他→もう一方のメイン→（最終手段）メイン担当外の順。予定にぶつかる枠はバッファ(30→15→0分)や個人稼働時間帯(G/H)を緩和して空きを作る' },
    { type: 'bullet', text: '誰もE上限内で入れない時間帯は、無理にE超過させず空けて警告（E厳守）' },
    { type: 'bullet', text: '1人あたり1時間以上の連続ブロックを基本にする。朝会などで1時間未満の穴が出た場合は、単独の端数シフトにせず、前後に既存シフトがある人の連続枠へ吸収する' },
    { type: 'bullet', text: '全員が予定で誰も入れない時間帯のみ、メイン担当1/2のうち当日の主担当→もう一方→外の順で緊急強制（終日予定・週次非稼働は除外）' },
    { type: 'space' },

    { type: 'h1', text: '■ シフト登録キーワード（予定でシフト登録）' },
    { type: 'text', text: 'N2に文字列（カンマ区切りで複数可、例: 出勤,研修,イベント）を入れると、メンバー自身のカレンダー予定タイトルにいずれかが含まれる時間帯は、その本人をシフト列へ登録します。' },
    { type: 'bullet', text: '対象は「本人のみ」。各メンバーは自分の予定がヒットした時間帯だけ登録される（全員ではない）' },
    { type: 'bullet', text: 'カンマ区切りで複数キーワード可（、, ; などの区切りに対応）。キーワード内のスペースはそのまま使える' },
    { type: 'bullet', text: '部分一致・大文字小文字は区別しない（例「出勤」で「在宅出勤」もヒット）' },
    { type: 'bullet', text: '管理者(M2)・週次担当で非稼働の人は対象外' },
    { type: 'bullet', text: '通常はカレンダー予定があると「空き無し」で割当対象外だが、このキーワードに合う予定は逆に「シフト登録」になる（本人の予定・勤務時間帯G/Hを無視して登録）' },
    { type: 'bullet', text: '本人の列に登録する（各列は本人専用なので他人と競合しない）' },
    { type: 'bullet', text: '昼休み(12:00〜13:00)は対象外。終日予定がヒットした場合はその日全体（昼休み除く）が対象' },
    { type: 'bullet', text: '登録分も本人の合計・月間目標に算入される' },
    { type: 'bullet', text: 'N2を空欄にすると機能オフ' },
    { type: 'space' },

    { type: 'h1', text: '■ 前後1hブロックキーワード（予定前後の割当禁止）' },
    { type: 'text', text: 'O2に文字列（カンマ区切りで複数可、例: 面接,重要,移動）を入れると、本人のカレンダー予定タイトルにいずれかが含まれる予定について、その予定時間だけでなく前後1時間も自動割当不可になります。' },
    { type: 'bullet', text: '対象は予定を持つ本人のみ。他メンバーの割当には影響しません' },
    { type: 'bullet', text: '通常の予定バッファ30分より強く、緩和レベルでバッファを0分にしても、このキーワード付き予定だけは前後1時間を守ります' },
    { type: 'bullet', text: '部分一致・大文字小文字は区別しません。O2を空欄にすると機能オフ' },
    { type: 'bullet', text: '自動割当: 予定無視キーワードに一致してもこちらのブロックは維持されます（安全側を優先）' },
    { type: 'space' },

    { type: 'h1', text: '■ 除外日シート' },
    { type: 'text', text: 'シート名「除外日」のA2以降にyyyy-MM-dd形式で入力します。' },
    { type: 'text', text: 'スクリプト実行時に、対象期間の土日と日本の祝日が自動追加されます（手動分は保持されます）。' },
    { type: 'space' },

    { type: 'h1', text: '■ 10時間未満の強調表示' },
    { type: 'text', text: '設定シートの合計行（最下行）で、各日付の合計が10時間を下回っている日が赤系で強調されます。' },
    { type: 'bullet', text: '赤系の背景: 10時間未満（人員不足の可能性）' },
    { type: 'bullet', text: 'グレー背景: 除外日（土日・祝日など、対象外）' },
    { type: 'bullet', text: '通常背景: 10時間以上（OK）' },
    { type: 'space' },

    { type: 'h1', text: '■ 空き時間の抽出' },
    { type: 'text', text: 'メニュー「空き時間を抽出」を実行すると、各ユーザーの状況が「空き時間」シートに人単位で一覧表示され、設定シートの下にも4区分の集計テーブルが追記されます。' },
    { type: 'bullet', text: '実シフト優先が既定動作です。「【作業】鹿島_SES」など運用設定「空き時間抽出: 実シフト優先キーワード」に一致する予定だけを予定扱いから除外し、シフト欄の有無で「シフト中」または「シフト入れる」を判定します。' },
    { type: 'bullet', text: '優先したいシフトのキーワードは運用設定シートの「空き時間抽出: 実シフト優先キーワード」にカンマ区切りで登録できます。' },
    { type: 'bullet', text: 'これは「自動割当: 予定無視キーワード」とは別の設定です（空き時間抽出専用の表示切替）。' },
    { type: 'h2', text: '【4つの区分】' },
    { type: 'bullet', text: '①【シフト入れる / 予定なし】(赤): 本人シフトなし + 予定なし → 追加できる' },
    { type: 'bullet', text: '②【シフト中 / 予定なし】(緑): 本人がいずれかのシフト列に入っている + 予定なし' },
    { type: 'bullet', text: '③【予定中 / シフトなし】(灰): 本人シフトなし + 予定あり' },
    { type: 'bullet', text: '④【⚠ シフト中 + 予定あり】(茶): シフト中 + 予定あり → ダブルブッキング(要確認)' },
    { type: 'space' },

    { type: 'h1', text: '■ シフト列のロック機能' },
    { type: 'text', text: '各日付シートの4行目は、予定列側が「★主担当」表示、シフト列側がロック用チェックボックスです。シフト列側のチェックで各人のシフト列を「自動入力対象外」にできます。' },
    { type: 'bullet', text: 'チェックON: その列は自動シフト実行時に絶対に変更されない（手動シフトを保護）' },
    { type: 'bullet', text: 'チェックOFF（デフォルト）: 通常通り自動入力対象' },
    { type: 'bullet', text: 'ロック列の既存シフトは、どちらのモードでも個人時間・チーム合計に算入される' },
    { type: 'bullet', text: '「全クリア」モードでもロック列はクリアされない' },
    { type: 'space' },

    { type: 'h1', text: '■ シフト確定機能 ★NEW' },
    { type: 'text', text: '各日付シートのA1セルにチェックボックスがあります。ここにチェックを入れると、その日は「確定」扱いになります。' },
    { type: 'bullet', text: '確定日は自動シフト（空き枠のみ/全クリアどちらも）の対象から完全に外れる（触られない）' },
    { type: 'bullet', text: '確定日は「シフト欄を初期化（全クリア）」の対象からも外れる' },
    { type: 'bullet', text: '確定日は「最新のカレンダー予定を反映」でも一切触らない（カレンダーの再取得もしない）' },
    { type: 'bullet', text: 'チェックを外せば、その日はまた通常通り編集・自動シフトの対象に戻る' },
    { type: 'bullet', text: 'A1の背景色でも状態が分かる（未確定=青、確定=緑）' },
    { type: 'space' },

    { type: 'h1', text: '■ 自動シフトのルール' },
    { type: 'h2', text: '【シフト列の構成】' },
    { type: 'bullet', text: 'シフト列はユーザーごとに1列（予定列と同じ並び）。各列はその本人専用で、同じ列に複数人は入りません' },
    { type: 'bullet', text: '各シフト列の入力は本人のみ（ドロップダウンも本人だけ）。手動入力も本人の列に行います' },
    { type: 'h2', text: '【割り当ての考え方（優先順）】' },
    { type: 'bullet', text: '予定時間(E列)=各人の月間目標で、ハード上限（超えない＝E厳守）。E未設定(0)は上限なし扱い' },
    { type: 'bullet', text: '1人目（そのコマに最低1人）: 週次担当の主担当 →（無ければ）その日の主担当（メイン1/2のうち予定が少ない方）→ その他 → もう一方のメイン →（最終手段のみ）メイン担当外' },
    { type: 'bullet', text: '2人目（ペア／1日下限／1人日回避の増員）: メイン担当外を優先 → その他' },
    { type: 'bullet', text: '原則としてE上限を超える人は選ばない。Eとカバー/下限がぶつかったらE優先（埋まらなければ警告）。ただし全員予定の強制カバーと1人日回避の最終手段は例外' },
    { type: 'bullet', text: '全員が予定で誰も入れない時間帯のみ、当日の主担当→もう一方のメイン→外の順で強制（終日予定・週次非稼働の人は除外、予定と重複・Eを超える場合あり）' },
    { type: 'bullet', text: '「ユーザー属性」シートで単独禁止を指定した人は、割り当てられた時間帯に必ずもう1人以上が同時にいる状態にする（詳細は次のセクション）' },
    { type: 'h2', text: '【シフトの制約】' },
    { type: 'bullet', text: '1人1日最大8時間' },
    { type: 'bullet', text: '同じ時間帯の担当者は上限まで（既定は最大2人＝3人以上の被りを作らない）。上限は「運用設定」シートの「同時刻の担当者上限」で変更可。※カレンダー予定（シフト登録キーワード）から発生した重複はこの上限の対象外' },
    { type: 'bullet', text: '「ユーザー属性」シートの「同時禁止相手」に指定した相手同士は、同じ時間帯に一緒に割り当てない（詳細は専用セクション）' },
    { type: 'bullet', text: '1日の担当者は原則2人以上・最大2人。1人だけの日は2人目を1時間以上追加し、制約上不可なら警告' },
    { type: 'bullet', text: '予定の前後30分はバッファ（緩和段階で短縮あり）' },
    { type: 'bullet', text: '連続ブロックは1時間以上が基本。15分・30分の穴は、前後の既存シフトに吸収できる場合だけ埋める' },
    { type: 'bullet', text: '終日予定の人はその日完全休み' },
    { type: 'bullet', text: '管理者（J2）は自動シフトから除外（手動シフトはOK）' },
    { type: 'bullet', text: '週次担当で「稼働メンバー」を指定した週は、書かれていない人はその週の自動シフト対象外（緊急の強制カバーや最終手段でも入れない）' },
    { type: 'bullet', text: '確定（A1チェック）済みの日は自動シフトの対象外' },
    { type: 'bullet', text: '個人時刻帯（G/H列）の範囲外には絶対に割り当てない' },
    { type: 'bullet', text: '1日チーム合計はH2の上限を超えない' },
    { type: 'h2', text: '【段階的緩和】' },
    { type: 'bullet', text: 'Lv0: 標準（30分バッファ・1時間ブロック）' },
    { type: 'bullet', text: 'Lv1: 緩和1（15分バッファ・1時間ブロック）' },
    { type: 'bullet', text: 'Lv2: 緩和2（バッファなし・1時間ブロック）' },
    { type: 'bullet', text: '全時間帯カバーも1時間以上の連続ブロックを基本にする。1時間未満の穴は前後の既存シフトへ吸収し、吸収できない枠は警告に出る' },
    { type: 'bullet', text: '目標に達していなければ次の緩和レベルへ進む' },
    { type: 'space' },

    { type: 'h1', text: '■ 単独禁止（この人を1人きりにしない） ★NEW' },
    { type: 'text', text: '「ユーザー属性」シートの「単独禁止」列（チェックボックス）にチェックを入れた人は、割り当てられている時間帯に必ずもう1人以上が同時に入っている状態を保つように、自動シフトの最後に調整します。' },
    { type: 'bullet', text: '判定は時間帯（15分スロット）単位。日全体で2人いても、時間帯によってはどちらか1人しかいない状態は解消しようとする' },
    { type: 'bullet', text: 'まずE/G2の範囲内でペア相手を追加できないか試し、無理な場合だけ最終手段としてE/G2超過を許可してペアを追加する' },
    { type: 'bullet', text: 'ペア相手がどうしても見つからない場合、ロック列でなければ本人をその時間帯から自動的に外す（結果ダイアログと警告に明記）' },
    { type: 'bullet', text: 'ロック列（手動固定）の場合は自動では外さず、警告のみ表示するので手動で確認・調整する' },
    { type: 'space' },

    { type: 'h1', text: '■ 同時禁止相手（この人とこの人を一緒にしない） ★NEW' },
    { type: 'text', text: '「ユーザー属性」シートの「同時禁止相手」列に、同じ時間帯へ一緒に割り当てたくない相手を名前またはメールでカンマ区切りで指定します。自動割当では、指定した相手同士が同じ時間帯（15分スロット）に同席しないようにします。' },
    { type: 'bullet', text: '指定は双方向で有効（AにBを書けば、Bにも自動的にAが適用される）' },
    { type: 'bullet', text: 'メインの配分・カバー・ペア追加・1日下限・単独禁止のペアリング・緊急強制・最終手段のすべての割当段階でチェックする' },
    { type: 'bullet', text: 'ただし両者とも本人のカレンダー予定（シフト登録キーワード）で同時刻に登録された場合や、既存/ロックの手動シフトが重なっている場合は自動では解消できないため、警告として通知する' },
    { type: 'space' },

    { type: 'h1', text: '■ 同時刻の担当者上限（3人以上を禁止） ★NEW' },
    { type: 'text', text: '「運用設定」シートの「同時刻の担当者上限」で、同じ時間帯に入れる担当者の最大人数を設定します（既定=2）。2にすると3人以上の同時被りを作りません。' },
    { type: 'bullet', text: '自動割当のすべての段階（配分・カバー・ペア追加・1日下限・緊急強制・最終手段）でこの上限を守る' },
    { type: 'bullet', text: '※カレンダー予定（シフト登録キーワード）から発生した重複は本人の実予定なのでそのまま残し、この上限の対象外とする' },
    { type: 'space' },

    { type: 'h1', text: '■ メニュー' },
    { type: 'kv', k: '最新のカレンダー予定を反映（シフト保持）', v: 'カレンダーから予定取得→日付シート作成/更新。既存シフトは保持' },
    { type: 'kv', k: 'シフト欄を初期化（全クリア）', v: 'カレンダー予定は残し、対象期間の日付シートのシフト欄とロック状態だけを初期化' },
    { type: 'kv', k: '集計のみ更新', v: '設定シートの集計だけ再計算（10時間未満強調も更新、F列「予定時間(目安)」も再計算）' },
    { type: 'kv', k: 'シフトを自動入力（空き枠のみ）', v: '手動シフトを保護して空き枠だけ自動で埋める' },
    { type: 'kv', k: '指定期間だけ組みなおす', v: '入力した開始日〜終了日（両端含む）だけを再割当。範囲外の日は変更せず、範囲外の既存割当は月間目標の消化として扱う。ロック列・確定日は保持' },
    { type: 'kv', k: 'シフトを自動入力（全クリア）', v: '全シフトをクリアして自動再割当（確認ダイアログあり）' },
    { type: 'kv', k: '空き時間を抽出', v: '個人稼働時間内のシフト×予定を4区分で集計。運用設定「空き時間抽出: 実シフト優先キーワード」に一致する予定は予定扱いせず、シフト欄の有無を優先（実シフト優先が既定）' },
    { type: 'kv', k: '週次担当シートを作成/更新', v: '週ごとの主担当・稼働メンバーを入力するシートを作成。対象期間の週を自動で並べ、既存入力は保持' },
    { type: 'kv', k: '運用設定シートを作成/更新', v: '割当モードや予定無視キーワードなど運用パラメータをまとめて管理' },
    { type: 'kv', k: '設定シートを初期化', v: '設定/除外日/使い方シートを生成（確認ダイアログあり）' },
    { type: 'kv', k: '使い方シートを更新', v: 'このシートを再生成' },
    { type: 'space' },

    { type: 'h1', text: '■ 推奨ワークフロー' },
    { type: 'numbered', text: 'F2に予定時間計算用稼働日数、G2に月間目標、H2に1日上限、I2に1日下限、M2に管理者メール、N2にシフト登録キーワード(任意)、O2に前後1hブロックキーワード(任意)を設定' },
    { type: 'numbered', text: '5行目以降にユーザー情報を入力（名前/メール/色/予定人月、必要なら開始/終了時刻）' },
    { type: 'numbered', text: 'F列に表示される「予定時間(目安)」を確認し、E列に運用したい目標時間を手入力' },
    { type: 'numbered', text: '必要なら「週次担当シートを作成/更新」で週ごとの主担当・稼働メンバーを入力' },
    { type: 'numbered', text: '必要なら「運用設定シートを作成/更新」で「自動割当: 予定無視キーワード」などを設定' },
    { type: 'numbered', text: '「最新のカレンダー予定を反映（シフト保持）」を実行（日付シートが生成/更新される。既存シフトは保持）' },
    { type: 'numbered', text: 'シフトを一度空にしたい場合だけ「シフト欄を初期化（全クリア）」を実行' },
    { type: 'numbered', text: '「除外日」シートを確認し、必要なら任意日を追加' },
    { type: 'numbered', text: '「シフトを自動入力（空き枠のみ）」を実行' },
    { type: 'numbered', text: '結果メッセージで未割当や強制割当の有無を確認' },
    { type: 'numbered', text: '合計行の赤い日（10時間未満）があれば人員追加を検討' },
    { type: 'numbered', text: '気になる枠を手動で調整（ドロップダウンから選択）' },
  ];

  const rows = [];
  const formatOps = [];
  let lineNum = 0;
  let numberedCounter = 0;

  sections.forEach(sec => {
    if (sec.type === 'space') {
      rows.push(['', '']);
      lineNum++;
      return;
    }
    if (sec.type === 'title') {
      rows.push([sec.text, '']);
      formatOps.push({ row: lineNum + 1, op: 'title' });
      lineNum++;
      return;
    }
    if (sec.type === 'meta') {
      rows.push([sec.text, '']);
      formatOps.push({ row: lineNum + 1, op: 'meta' });
      lineNum++;
      return;
    }
    if (sec.type === 'h1') {
      numberedCounter = 0;
      rows.push([sec.text, '']);
      formatOps.push({ row: lineNum + 1, op: 'h1' });
      lineNum++;
      return;
    }
    if (sec.type === 'h2') {
      rows.push([sec.text, '']);
      formatOps.push({ row: lineNum + 1, op: 'h2' });
      lineNum++;
      return;
    }
    if (sec.type === 'kv') {
      rows.push([sec.k, sec.v]);
      formatOps.push({ row: lineNum + 1, op: 'kv' });
      lineNum++;
      return;
    }
    if (sec.type === 'text') {
      rows.push([sec.text, '']);
      formatOps.push({ row: lineNum + 1, op: 'text' });
      lineNum++;
      return;
    }
    if (sec.type === 'bullet') {
      rows.push(['  ・ ' + sec.text, '']);
      formatOps.push({ row: lineNum + 1, op: 'text' });
      lineNum++;
      return;
    }
    if (sec.type === 'numbered') {
      numberedCounter++;
      rows.push(['  ' + numberedCounter + '. ' + sec.text, '']);
      formatOps.push({ row: lineNum + 1, op: 'text' });
      lineNum++;
      return;
    }
  });

  if (rows.length > 0) {
    sh.getRange(1, 1, rows.length, 2).setValues(rows);
  }

  formatOps.forEach(op => {
    const range = sh.getRange(op.row, 1, 1, 2);
    if (op.op === 'title') {
      range.merge()
        .setBackground('#1c4587')
        .setFontColor('#ffffff')
        .setFontWeight('bold')
        .setFontSize(16)
        .setHorizontalAlignment('center')
        .setVerticalAlignment('middle');
      sh.setRowHeight(op.row, 36);
    } else if (op.op === 'meta') {
      range.merge()
        .setFontColor('#666666')
        .setFontSize(9)
        .setHorizontalAlignment('right');
    } else if (op.op === 'h1') {
      range.merge()
        .setBackground('#444444')
        .setFontColor('#ffffff')
        .setFontWeight('bold')
        .setFontSize(12)
        .setHorizontalAlignment('left');
    } else if (op.op === 'h2') {
      range.merge()
        .setBackground('#dddddd')
        .setFontWeight('bold')
        .setHorizontalAlignment('left');
    } else if (op.op === 'kv') {
      sh.getRange(op.row, 1).setFontWeight('bold').setVerticalAlignment('top');
      sh.getRange(op.row, 2).setWrap(true).setVerticalAlignment('top');
    } else if (op.op === 'text') {
      range.merge().setWrap(true).setVerticalAlignment('top');
    }
  });

  sh.setColumnWidth(1, 280);
  sh.setColumnWidth(2, 540);
  sh.setFrozenRows(1);
}

/** ===================== 改修機能 v2 ===================== */

const OPERATION_SETTINGS_SHEET_NAME = '運用設定';
const KEYWORD_RULES_SHEET_NAME = 'キーワードルール';
const USER_ATTRIBUTES_SHEET_NAME = 'ユーザー属性';
const SHIFT_HISTORY_SHEET_NAME = '変更履歴';
const SHIFT_BACKUP_SHEET_NAME = '__シフトバックアップ';
const SHORTAGE_REPORT_SHEET_NAME = '不足日レポート';
const VALIDATION_REPORT_SHEET_NAME = '設定チェック';
const SIMULATION_SHEET_NAME = 'テストシミュレーション';

let __SHIFT_EXTENSION_CONFIG_CACHE = null;
let __SHIFT_FORBIDDEN_PAIRS_CACHE = null;

function resetOperationConfigCache_() {
  __SHIFT_EXTENSION_CONFIG_CACHE = null;
  __SHIFT_FORBIDDEN_PAIRS_CACHE = null;
}

function initializeEnhancedShiftFeatures() {
  createOperationSettingsSheet();
  createKeywordRulesSheet();
  createUserAttributesSheet();
  createWeeklyAssignmentSheet();
  createShiftHistorySheet();
  validateSettings();
  SpreadsheetApp.getUi().alert('補助シートを作成/更新しました。');
}

function createOperationSettingsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(OPERATION_SETTINGS_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(OPERATION_SETTINGS_SHEET_NAME);

  const existing = {};
  try {
    if (sheet.getLastRow() >= 2) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getDisplayValues().forEach(row => {
        const key = String(row[0] || '').trim();
        if (key) existing[key] = row[1];
      });
    }
  } catch (e) {}

  const val = (key, def) => existing[key] !== undefined && existing[key] !== '' ? existing[key] : def;
  resetSimpleSheet_(sheet);

  const rows = [
    ['項目', '値', '説明'],
    ['割当モード', val('割当モード', '標準'), '安全優先 / 標準 / カバー優先 / 繁忙期 / 研修期'],
    ['昼休み開始', val('昼休み開始', LUNCH_START), 'HH:mm。自動割当・集計から除外する休憩開始時刻'],
    ['昼休み終了', val('昼休み終了', LUNCH_END), 'HH:mm。自動割当・集計から除外する休憩終了時刻'],
    ['予定前後バッファ分', val('予定前後バッファ分', EVENT_BUFFER_MINUTES), '通常予定の前後を何分避けるか'],
    ['特別予定バッファ分', val('特別予定バッファ分', SPECIAL_EVENT_BUFFER_MINUTES), 'キーワードブロック予定の前後を何分避けるか'],
    ['自動割当: 予定無視キーワード', val('自動割当: 予定無視キーワード', ''), 'カンマ区切りで複数可。予定タイトルにいずれかが含まれると、自動割当ではその予定を「予定なし」として扱い、その時間に割当可能にします（空欄でオフ）。前後1hブロックキーワード(O2)には優先されません'],
    ['1人1日最大時間', val('1人1日最大時間', MAX_HOURS_PER_DAY), '1人あたりの1日最大割当時間'],
    ['最小連続ブロック分', val('最小連続ブロック分', MIN_BLOCK_SLOTS * 15), '自動割当で作る最小連続時間。通常は60分'],
    ['1日担当者上限', val('1日担当者上限', MAX_PEOPLE_PER_DAY), '1日に新規参加させる担当者数の上限目安'],
    ['1日担当者下限', val('1日担当者下限', MIN_PEOPLE_PER_DAY), '1人だけの日を避けるための下限目安'],
    ['同時刻の担当者上限', val('同時刻の担当者上限', MAX_SAME_TIME_PEOPLE), '同じ時間帯に入れる担当者の最大人数。3人以上を禁止するなら2にする。※カレンダー予定(シフト登録キーワード)から発生した重複はこの上限の対象外'],
    ['不足強調時間', val('不足強調時間', DAILY_MIN_HOURS_HIGHLIGHT), '設定シート合計行や不足日レポートで不足判定する時間'],
    ['空き時間抽出: 実シフト優先キーワード', val('空き時間抽出: 実シフト優先キーワード', '【作業】鹿島_SES'), 'カンマ区切りで複数可。これらのキーワードを含む予定は、空き時間抽出で予定扱いせずシフト欄の有無を優先します（実シフト優先が既定動作）。例: 【作業】鹿島_SES'],
    ['最終フォールバック予定重複', val('最終フォールバック予定重複', 'ON'), 'ONなら最終手段で予定重複を許可。安全優先ではOFF推奨'],
    ['短い孤立シフトを解消', val('短い孤立シフトを解消', 'ON'), 'ONなら最小連続ブロック未満で前後に自分のシフトが無い「短い孤立シフト」を、前後へ延長するか（延長できなければ）外して警告します。OFFで従来どおり残します'],
  ];

  sheet.getRange(1, 1, rows.length, 3).setValues(rows);
  sheet.getRange(1, 1, 1, 3).setBackground('#1c4587').setFontColor('#ffffff').setFontWeight('bold');
  const rowIndexByKey = {};
  rows.forEach((row, idx) => { rowIndexByKey[row[0]] = idx + 1; });
  const setListValidation = (key, values) => {
    const row = rowIndexByKey[key];
    if (!row) return;
    sheet.getRange(row, 2).setDataValidation(SpreadsheetApp.newDataValidation()
      .requireValueInList(values, true).build());
  };
  setListValidation('割当モード', ['安全優先', '標準', 'カバー優先', '繁忙期', '研修期']);
  setListValidation('最終フォールバック予定重複', ['ON', 'OFF']);
  setListValidation('短い孤立シフトを解消', ['ON', 'OFF']);
  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 220);
  sheet.setColumnWidth(2, 220);
  sheet.setColumnWidth(3, 520);
  sheet.getRange(1, 1, rows.length, 3).setWrap(true).setVerticalAlignment('middle');
  resetOperationConfigCache_();
}

function getOperationConfig_() {
  if (__SHIFT_EXTENSION_CONFIG_CACHE) return __SHIFT_EXTENSION_CONFIG_CACHE;

  const defaults = {
    assignmentMode: '標準',
    lunchStart: LUNCH_START,
    lunchEnd: LUNCH_END,
    eventBufferMinutes: EVENT_BUFFER_MINUTES,
    specialEventBufferMinutes: SPECIAL_EVENT_BUFFER_MINUTES,
    assignIgnoreEventKeywordText: '',
    assignIgnoreEventKeywords: [],
    maxHoursPerDay: MAX_HOURS_PER_DAY,
    minBlockMinutes: MIN_BLOCK_SLOTS * 15,
    maxPeoplePerDay: MAX_PEOPLE_PER_DAY,
    minPeoplePerDay: MIN_PEOPLE_PER_DAY,
    maxSameTimePeople: MAX_SAME_TIME_PEOPLE,
    dailyMinHighlightHours: DAILY_MIN_HOURS_HIGHLIGHT,
    freeTimeShiftPriorityKeywordText: '【作業】鹿島_SES',
    freeTimeShiftPriorityKeywords: parseKeywordList('【作業】鹿島_SES'),
    finalFallbackAllowEventOverlap: true,
    removeShortIsolatedBlocks: true,
  };

  const cfg = Object.assign({}, defaults);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(OPERATION_SETTINGS_SHEET_NAME);
    if (!sheet) {
      __SHIFT_EXTENSION_CONFIG_CACHE = cfg;
      return cfg;
    }
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      __SHIFT_EXTENSION_CONFIG_CACHE = cfg;
      return cfg;
    }
    const values = sheet.getRange(2, 1, lastRow - 1, 2).getDisplayValues();
    const map = {};
    values.forEach(row => {
      const key = String(row[0] || '').trim();
      if (key) map[key] = String(row[1] || '').trim();
    });

    cfg.assignmentMode = map['割当モード'] || cfg.assignmentMode;
    cfg.lunchStart = parseTimeCell(map['昼休み開始']) || cfg.lunchStart;
    cfg.lunchEnd = parseTimeCell(map['昼休み終了']) || cfg.lunchEnd;
    cfg.eventBufferMinutes = numberOrDefault_(map['予定前後バッファ分'], cfg.eventBufferMinutes);
    cfg.specialEventBufferMinutes = numberOrDefault_(map['特別予定バッファ分'], cfg.specialEventBufferMinutes);
    cfg.assignIgnoreEventKeywordText = map['自動割当: 予定無視キーワード'] || cfg.assignIgnoreEventKeywordText;
    cfg.assignIgnoreEventKeywords = parseKeywordList(cfg.assignIgnoreEventKeywordText);
    cfg.maxHoursPerDay = numberOrDefault_(map['1人1日最大時間'], cfg.maxHoursPerDay);
    cfg.minBlockMinutes = numberOrDefault_(map['最小連続ブロック分'], cfg.minBlockMinutes);
    cfg.maxPeoplePerDay = numberOrDefault_(map['1日担当者上限'], cfg.maxPeoplePerDay);
    cfg.minPeoplePerDay = numberOrDefault_(map['1日担当者下限'], cfg.minPeoplePerDay);
    cfg.maxSameTimePeople = numberOrDefault_(map['同時刻の担当者上限'], cfg.maxSameTimePeople);
    cfg.dailyMinHighlightHours = numberOrDefault_(map['不足強調時間'], cfg.dailyMinHighlightHours);
    cfg.freeTimeShiftPriorityKeywordText = map['空き時間抽出: 実シフト優先キーワード'] || cfg.freeTimeShiftPriorityKeywordText;
    cfg.freeTimeShiftPriorityKeywords = parseKeywordList(cfg.freeTimeShiftPriorityKeywordText);
    if (cfg.freeTimeShiftPriorityKeywords.length === 0) {
      cfg.freeTimeShiftPriorityKeywordText = '【作業】鹿島_SES';
      cfg.freeTimeShiftPriorityKeywords = parseKeywordList(cfg.freeTimeShiftPriorityKeywordText);
    }
    cfg.finalFallbackAllowEventOverlap = boolOrDefault_(map['最終フォールバック予定重複'], cfg.finalFallbackAllowEventOverlap);
    cfg.removeShortIsolatedBlocks = boolOrDefault_(map['短い孤立シフトを解消'], cfg.removeShortIsolatedBlocks);

    if (cfg.assignmentMode === '安全優先') {
      cfg.finalFallbackAllowEventOverlap = false;
      cfg.eventBufferMinutes = Math.max(cfg.eventBufferMinutes, 30);
    } else if (cfg.assignmentMode === 'カバー優先') {
      cfg.eventBufferMinutes = Math.min(cfg.eventBufferMinutes, 15);
      cfg.finalFallbackAllowEventOverlap = true;
    } else if (cfg.assignmentMode === '繁忙期') {
      cfg.maxHoursPerDay = Math.max(cfg.maxHoursPerDay, 9);
      cfg.maxPeoplePerDay = Math.max(cfg.maxPeoplePerDay, 3);
      cfg.finalFallbackAllowEventOverlap = true;
    }
  } catch (e) {}

  __SHIFT_EXTENSION_CONFIG_CACHE = cfg;
  return cfg;
}

function numberOrDefault_(value, defaultValue) {
  if (value === null || value === undefined || String(value).trim() === '') return defaultValue;
  const n = Number(String(value).replace(/[時間分]/g, '').trim());
  return isNaN(n) ? defaultValue : n;
}

function boolOrDefault_(value, defaultValue) {
  if (value === null || value === undefined || String(value).trim() === '') return defaultValue;
  const s = String(value).trim().toLowerCase();
  if (['on', 'true', 'yes', '1', '可', '許可', 'する'].indexOf(s) >= 0) return true;
  if (['off', 'false', 'no', '0', '不可', 'しない'].indexOf(s) >= 0) return false;
  return defaultValue;
}

function getLunchStart_() { return getOperationConfig_().lunchStart; }
function getLunchEnd_() { return getOperationConfig_().lunchEnd; }
function getEventBufferMinutes_() { return Math.max(0, Math.round(getOperationConfig_().eventBufferMinutes)); }
function getSpecialEventBufferMinutes_() { return Math.max(0, Math.round(getOperationConfig_().specialEventBufferMinutes)); }
function getMaxHoursPerDay_() { return Math.max(0.25, getOperationConfig_().maxHoursPerDay); }
function getMaxHoursPerDaySlots_() { return Math.round(getMaxHoursPerDay_() * 4); }
function getMinBlockSlots_() { return Math.max(1, Math.round(getOperationConfig_().minBlockMinutes / 15)); }
function getMaxPeoplePerDay_() { return Math.max(1, Math.round(getOperationConfig_().maxPeoplePerDay)); }
function getMaxSameTimePeople_() { return Math.max(1, Math.round(getOperationConfig_().maxSameTimePeople)); }
function getMinPeoplePerDay_() { return Math.max(1, Math.round(getOperationConfig_().minPeoplePerDay)); }
function getDailyMinHighlightHours_() { return Math.max(0, getOperationConfig_().dailyMinHighlightHours); }
function getFinalFallbackAllowEventOverlap_() { return getOperationConfig_().finalFallbackAllowEventOverlap; }
function getRemoveShortIsolatedBlocks_() { return getOperationConfig_().removeShortIsolatedBlocks; }

function buildStrictnessLevels_() {
  const cfg = getOperationConfig_();
  const minBlock = getMinBlockSlots_();
  if (cfg.assignmentMode === '安全優先') {
    return [
      { bufferMin: Math.max(30, cfg.eventBufferMinutes), ignoreEvents: false, minBlock, label: '安全優先（予定重複なし・強めバッファ）' },
    ];
  }
  if (cfg.assignmentMode === 'カバー優先' || cfg.assignmentMode === '繁忙期') {
    const first = Math.max(0, cfg.eventBufferMinutes);
    return [
      { bufferMin: first, ignoreEvents: false, minBlock, label: `カバー優先（${first}分バッファ）` },
      { bufferMin: 0, ignoreEvents: false, minBlock, label: 'カバー優先（バッファなし）' },
    ];
  }
  return [
    { bufferMin: Math.max(0, cfg.eventBufferMinutes), ignoreEvents: false, minBlock, label: `標準（${Math.max(0, cfg.eventBufferMinutes)}分バッファ）` },
    { bufferMin: Math.min(15, Math.max(0, cfg.eventBufferMinutes)), ignoreEvents: false, minBlock, label: '緩和1（15分以下バッファ）' },
    { bufferMin: 0, ignoreEvents: false, minBlock, label: '緩和2（バッファなし）' },
  ];
}

function createKeywordRulesSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(KEYWORD_RULES_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(KEYWORD_RULES_SHEET_NAME);
  const hasExisting = sheet.getLastRow() >= 2 && String(sheet.getRange(1, 1).getValue()).trim() === '有効';
  const rows = [
    ['有効', 'キーワード', '動作', '前後バッファ分', '対象', '備考'],
    [true, '当番', '強制シフト', 0, '本人', '予定タイトルに含まれると本人をシフト登録'],
    [true, '面接', '割当不可', 60, '本人', '前後バッファ中は自動割当しない'],
    [false, '有休', '終日除外', 999, '本人', '現状は前後ブロックキーワードへ同期'],
    [false, '仮', '低優先', 0, '本人', '将来拡張用'],
  ];
  if (!hasExisting) {
    resetSimpleSheet_(sheet);
    sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  } else {
    sheet.getRange(1, 1, 1, rows[0].length).setValues([rows[0]]);
  }
  sheet.getRange(1, 1, 1, rows[0].length).setBackground('#38761d').setFontColor('#ffffff').setFontWeight('bold');
  const checkboxRule = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  sheet.getRange(2, 1, Math.max(100, rows.length - 1), 1).setDataValidation(checkboxRule);
  sheet.getRange(2, 3, Math.max(100, rows.length - 1), 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['強制シフト', '割当不可', '終日除外', '優先割当', '低優先', '重複許容'], true).build()
  );
  sheet.setFrozenRows(1);
  sheet.setColumnWidths(1, 6, 140);
  sheet.setColumnWidth(6, 360);
  sheet.getRange(1, 1, Math.max(100, rows.length), 6).setWrap(true).setVerticalAlignment('middle');
}

function readKeywordRules_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(KEYWORD_RULES_SHEET_NAME);
  const result = [];
  if (!sheet || sheet.getLastRow() < 2) return result;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, 6).getValues();
  values.forEach(row => {
    const enabled = row[0] === true || String(row[0]).toLowerCase() === 'true';
    const keyword = String(row[1] || '').trim();
    const action = String(row[2] || '').trim();
    if (!enabled || !keyword || !action) return;
    result.push({
      keyword,
      keywordLower: keyword.toLowerCase(),
      action,
      bufferMinutes: Number(row[3]) || 0,
      target: String(row[4] || '本人').trim(),
      note: String(row[5] || '').trim(),
    });
  });
  return result;
}

function syncKeywordRulesToSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const setSheet = ss.getSheetByName('設定');
  if (!setSheet) {
    SpreadsheetApp.getUi().alert('「設定」シートがありません。');
    return;
  }
  const rules = readKeywordRules_();
  const force = [];
  const block = [];
  rules.forEach(r => {
    if (r.action === '強制シフト') force.push(r.keyword);
    if (['割当不可', '終日除外'].indexOf(r.action) >= 0) block.push(r.keyword);
  });
  if (force.length > 0) setSheet.getRange(SHIFT_KEYWORD_CELL).setValue(uniqueStrings_(force).join(','));
  if (block.length > 0) setSheet.getRange(SPECIAL_BLOCK_KEYWORD_CELL).setValue(uniqueStrings_(block).join(','));
  SpreadsheetApp.getUi().alert(`キーワードルールを設定へ反映しました。\n強制シフト: ${force.length}件\n前後ブロック: ${block.length}件`);
}

function createUserAttributesSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const setSheet = ss.getSheetByName('設定');
  const users = setSheet ? readUsers(setSheet) : [];
  let sheet = ss.getSheetByName(USER_ATTRIBUTES_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(USER_ATTRIBUTES_SHEET_NAME);
  const hasExisting = sheet.getLastRow() >= 2 && String(sheet.getRange(1, 1).getValue()).trim() === '名前';

  const rows = [['名前', 'メール', '役割', '優先度', '補填対象', '単独禁止', '同時禁止相手', '備考']];
  users.forEach((u, idx) => rows.push([u.name, u.email, idx === 0 ? 'メイン担当1' : (idx === 1 ? 'メイン担当2' : '通常'), idx + 1, true, false, '', '']));
  if (rows.length === 1) rows.push(['', '', '通常', '', true, false, '', '']);

  if (!hasExisting) {
    resetSimpleSheet_(sheet);
    sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
  } else {
    // 既存シートのレイアウトが古い（スキル/1日上限/希望曜日/NG曜日 などの列が残っている、
    // または「同時禁止相手」列が無い）場合、ヘッダー名で対応付けして現行の8列レイアウトへ
    // 整列し直す。単に新ヘッダーを上書きすると、単独禁止などのデータが別の列に取り残されて
    // 無視されてしまうため、必ずデータごと移動させる。
    const lastCol = Math.max(sheet.getLastColumn(), rows[0].length);
    const lastRow = sheet.getLastRow();
    const curHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim());
    const dataRows = lastRow >= 2 ? sheet.getRange(2, 1, lastRow - 1, lastCol).getValues() : [];
    const srcIdx = (name) => curHeaders.indexOf(name);
    // ヘッダー名で値を取得（見つからなければ位置フォールバック→既定値）。
    const pick = (row, name, fallbackIdx, dflt) => {
      let i = srcIdx(name);
      if (i < 0) i = fallbackIdx;
      const v = (i >= 0 && i < row.length) ? row[i] : undefined;
      return (v === '' || v === undefined || v === null) ? dflt : v;
    };
    const migrated = dataRows.map(row => {
      const fillI = srcIdx('補填対象');
      const soloI = srcIdx('単独禁止');
      return [
        pick(row, '名前', 0, ''),
        pick(row, 'メール', 1, ''),
        pick(row, '役割', 2, '通常'),
        pick(row, '優先度', 3, ''),
        fillI >= 0 ? (row[fillI] !== false) : true,   // 補填対象（チェックボックス）
        soloI >= 0 ? (row[soloI] === true) : false,   // 単独禁止（チェックボックス）
        pick(row, '同時禁止相手', -1, ''),
        pick(row, '備考', -1, ''),
      ];
    }).filter(r => String(r[1] || '').trim() !== '' || String(r[0] || '').trim() !== '');
    // 古い列が残らないよう一度クリアしてから、整列済みデータで書き直す。
    resetSimpleSheet_(sheet);
    const out = [rows[0]].concat(migrated.length ? migrated : rows.slice(1));
    sheet.getRange(1, 1, out.length, rows[0].length).setValues(out);
  }
  sheet.getRange(1, 1, 1, rows[0].length).setBackground('#674ea7').setFontColor('#ffffff').setFontWeight('bold');
  sheet.getRange(2, 3, Math.max(100, rows.length - 1), 1).setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(['メイン担当1', 'メイン担当2', 'メイン担当外', 'バックアップ', '通常', '研修', '管理者'], true).build()
  );
  sheet.getRange(2, 5, Math.max(100, rows.length - 1), 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  sheet.getRange(2, 6, Math.max(100, rows.length - 1), 1).setDataValidation(SpreadsheetApp.newDataValidation().requireCheckbox().build());
  // 同時禁止相手(7列目)の入力ヘルプ
  sheet.getRange(1, 7).setNote('この人と同じ時間帯に一緒に割り当てたくない相手を、名前またはメールでカンマ区切りで入力します（例: 山田太郎, sato@example.com）。指定は双方向で有効です（片方に書けば両方に適用）。');
  sheet.setFrozenRows(1);
  sheet.setColumnWidths(1, 8, 130);
  sheet.setColumnWidth(7, 260);
  sheet.setColumnWidth(8, 300);
  sheet.getRange(1, 1, Math.max(100, rows.length), rows[0].length).setWrap(true).setVerticalAlignment('middle');
}

function readUserAttributes_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(USER_ATTRIBUTES_SHEET_NAME);
  const map = {};
  if (!sheet || sheet.getLastRow() < 2) return map;
  const lastCol = Math.max(8, sheet.getLastColumn());
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, lastCol).getValues();
  // 列はヘッダー名で特定する（旧レイアウトで列がずれていても正しい値を読む）。
  // ヘッダーが見つからない場合のみ現行レイアウトの既定位置にフォールバックする。
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim());
  const col = (name, fallback) => {
    const i = headers.indexOf(name);
    return i >= 0 ? i : fallback;
  };
  const nameCol = col('名前', 0);
  const emailCol = col('メール', 1);
  const roleCol = col('役割', 2);
  const priorityCol = col('優先度', 3);
  const fillCol = col('補填対象', 4);
  const noSoloCol = col('単独禁止', 5);
  const forbidCol = col('同時禁止相手', -1);
  const noteCol = col('備考', -1);
  values.forEach(row => {
    const email = String(row[emailCol] || '').trim().toLowerCase();
    if (!email) return;
    map[email] = {
      name: String(row[nameCol] || '').trim(),
      email,
      role: String(row[roleCol] || '通常').trim(),
      priority: Number(row[priorityCol]) || 999,
      fillEligible: row[fillCol] !== false,
      noSolo: row[noSoloCol] === true,
      forbiddenPartnersRaw: forbidCol >= 0 ? String(row[forbidCol] || '').trim() : '',
      note: noteCol >= 0 ? String(row[noteCol] || '').trim() : '',
    };
  });
  return map;
}

/**
 * 「ユーザー属性」シートの「同時禁止相手」列から、同じ時間帯に同席させない相手のindex集合を
 * ユーザーごとに構築する（双方向）。map[uIdx] = Set(禁止相手のuIdx)。
 */
function getForbiddenPartnersMap_(users) {
  if (__SHIFT_FORBIDDEN_PAIRS_CACHE) return __SHIFT_FORBIDDEN_PAIRS_CACHE;
  const map = users.map(() => new Set());
  try {
    const attrs = readUserAttributes_();
    users.forEach((u, uIdx) => {
      const attr = attrs[String(u.email || '').toLowerCase()];
      if (!attr || !attr.forbiddenPartnersRaw) return;
      const { idxs } = resolveUserRefs_(attr.forbiddenPartnersRaw, users);
      idxs.forEach(other => {
        if (other === uIdx) return;
        map[uIdx].add(other);
        map[other].add(uIdx); // 双方向
      });
    });
  } catch (e) {}
  __SHIFT_FORBIDDEN_PAIRS_CACHE = map;
  return map;
}

/**
 * スロット slotIdx に uIdx を入れると、既にそのスロットにいる誰かと「同時禁止相手」に
 * 該当してしまう場合に true を返す。
 */
function slotHasForbiddenPartnerFor_(day, uIdx, slotIdx, users) {
  const map = getForbiddenPartnersMap_(users);
  const forbidden = map[uIdx];
  if (!forbidden || forbidden.size === 0) return false;
  const row = day.assignment[slotIdx];
  for (let c = 0; c < row.length; c++) {
    if (c === uIdx) continue;
    if (row[c] && forbidden.has(c)) return true;
  }
  return false;
}

/** 「ユーザー属性」シートで単独禁止（「単独禁止」列=true）が指定されているユーザーのindex集合を返す。 */
function getNoSoloUserIdxSet_(users) {
  const attrs = readUserAttributes_();
  const set = new Set();
  users.forEach((u, idx) => {
    const attr = attrs[String(u.email || '').toLowerCase()];
    if (attr && attr.noSolo) set.add(idx);
  });
  return set;
}

function syncUserAttributesToSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const setSheet = ss.getSheetByName('設定');
  if (!setSheet) {
    SpreadsheetApp.getUi().alert('「設定」シートがありません。');
    return;
  }
  const attrs = readUserAttributes_();
  const main1 = [], main2 = [], main3 = [], admins = [];
  Object.keys(attrs).forEach(email => {
    const role = attrs[email].role;
    if (role === 'メイン担当1') main1.push(email);
    else if (role === 'メイン担当2') main2.push(email);
    else if (role === 'メイン担当外' || role === 'バックアップ') main3.push(email);
    else if (role === '管理者') admins.push(email);
  });
  setSheet.getRange(MAIN_USER1_CELL).setValue(main1.join(','));
  setSheet.getRange(MAIN_USER2_CELL).setValue(main2.join(','));
  setSheet.getRange(MAIN_USER3_CELL).setValue(main3.join(','));
  setSheet.getRange(ADMIN_EMAIL_CELL).setValue(admins.join(','));
  SpreadsheetApp.getUi().alert(`ユーザー属性を設定へ反映しました。\nメイン1: ${main1.length}\nメイン2: ${main2.length}\nメイン外/バックアップ: ${main3.length}\n管理者: ${admins.length}`);
}

function createShiftHistorySheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHIFT_HISTORY_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHIFT_HISTORY_SHEET_NAME);
  if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() === '') {
    sheet.getRange(1, 1, 1, 10).setValues([['実行日時', '実行者', '操作', '日付', '時刻', '担当者列', '変更前', '変更後', '備考', 'バックアップID']]);
  }
  sheet.getRange(1, 1, 1, 10).setBackground('#444444').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setFrozenRows(1);
  sheet.setColumnWidths(1, 10, 140);
  sheet.setColumnWidth(9, 320);
}

function appendAutoAssignChangeLog_(daysData, users, timeSlots, preserveManual, backupId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  createShiftHistorySheet();
  const sheet = ss.getSheetByName(SHIFT_HISTORY_SHEET_NAME);
  const now = new Date();
  const actor = getActiveUserEmailSafe_();
  const rows = [];
  daysData.forEach(day => {
    const oldValues = day.existingShifts || [];
    const newValues = day.assignment || [];
    for (let s = 0; s < timeSlots.length; s++) {
      for (let c = 0; c < users.length; c++) {
        const before = String((oldValues[s] && oldValues[s][c]) || '').trim();
        const after = String((newValues[s] && newValues[s][c]) || '').trim();
        if (before === after) continue;
        let note = preserveManual ? '空き枠のみ' : '全クリア再割当';
        if (day.lockedCols && day.lockedCols[c]) note += ' / ロック列';
        if (day.forcedCells && day.forcedCells[s + '_' + c]) note += ' / 強制またはキーワード割当';
        rows.push([now, actor, '自動割当', day.dateStr, timeSlots[s], users[c].name, before, after, note, backupId || '']);
      }
    }
  });
  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 10).setValues(rows);
  }
}

function createShiftBackupNow_(label, options) {
  options = options || {};
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const setSheet = ss.getSheetByName('設定');
  if (!setSheet) {
    if (!options.silent) SpreadsheetApp.getUi().alert('「設定」シートがありません。');
    return '';
  }
  const ctx = getScheduleContext_();
  if (!ctx.ok) {
    if (!options.silent) SpreadsheetApp.getUi().alert(ctx.message);
    return '';
  }
  let backupSheet = ss.getSheetByName(SHIFT_BACKUP_SHEET_NAME);
  if (!backupSheet) backupSheet = ss.insertSheet(SHIFT_BACKUP_SHEET_NAME);
  if (backupSheet.getLastRow() === 0 || backupSheet.getRange(1, 1).getValue() === '') {
    backupSheet.getRange(1, 1, 1, 9).setValues([['バックアップID', '作成日時', 'ラベル', '日付', 'スロット', '時刻', '担当者Index', '担当者', '値']]);
    backupSheet.hideSheet();
  }
  const backupId = Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd_HHmmss') + '_' + sanitizeForId_(label || 'backup');
  const createdAt = new Date();
  const rows = [];
  ctx.dailySheetNames.forEach(dateStr => {
    const sheet = ss.getSheetByName(dateStr);
    if (!sheet) return;
    const shiftCol1 = ctx.users.length + 2;
    let values;
    try {
      values = sheet.getRange(TIME_SLOT_START_ROW, shiftCol1, ctx.timeSlots.length, ctx.users.length).getValues();
    } catch (e) { return; }
    for (let s = 0; s < ctx.timeSlots.length; s++) {
      for (let c = 0; c < ctx.users.length; c++) {
        rows.push([backupId, createdAt, label || '', dateStr, s, ctx.timeSlots[s], c, ctx.users[c].name, values[s][c] || '']);
      }
    }
  });
  if (rows.length > 0) backupSheet.getRange(backupSheet.getLastRow() + 1, 1, rows.length, 9).setValues(rows);
  try { backupSheet.hideSheet(); } catch (e) {}
  return backupId;
}

function appendGenericHistory_(operation, dateStr, timeStr, userName, before, after, backupId) {
  createShiftHistorySheet();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHIFT_HISTORY_SHEET_NAME);
  sheet.appendRow([new Date(), getActiveUserEmailSafe_(), operation, dateStr, timeStr, userName, before, after, '', backupId || '']);
}

function createShortageReport() {
  const ctx = getScheduleContext_();
  if (!ctx.ok) {
    SpreadsheetApp.getUi().alert(ctx.message);
    return;
  }
  const rows = buildShortageRows_(ctx);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHORTAGE_REPORT_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHORTAGE_REPORT_SHEET_NAME);
  resetSimpleSheet_(sheet);

  const header = ['日付', '合計時間', '下限時間', '不足時間', '未カバー時間帯', '主な理由', '追加候補', 'ロック列', '備考'];
  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  sheet.getRange(1, 1, 1, header.length).setBackground('#990000').setFontColor('#ffffff').setFontWeight('bold');
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, header.length).setValues(rows);
    for (let i = 0; i < rows.length; i++) {
      const shortage = rows[i][3];
      if (shortage && shortage !== '0:00') sheet.getRange(2 + i, 1, 1, header.length).setBackground('#f4cccc');
    }
  } else {
    sheet.getRange(2, 1).setValue('不足日はありません。');
  }
  sheet.setFrozenRows(1);
  sheet.setColumnWidths(1, header.length, 130);
  sheet.setColumnWidth(5, 260);
  sheet.setColumnWidth(6, 280);
  sheet.setColumnWidth(7, 360);
  sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 1), header.length).setWrap(true).setVerticalAlignment('middle');
  SpreadsheetApp.getUi().alert(`不足日レポートを作成しました。\n不足日: ${rows.length}件`);
}

function buildShortageRows_(ctx) {
  const excluded = readExcludedDates(ctx.setSheet);
  const dailyMinHours = parseHoursValue(ctx.setSheet.getRange(DAILY_MIN_CELL)) || getDailyMinHighlightHours_();
  const dailyMinSlots = Math.round(dailyMinHours * 4);
  const adminEmails = parseEmailSet(ctx.setSheet.getRange(ADMIN_EMAIL_CELL).getValue());
  const attrs = readUserAttributes_();
  const weeklyCfg = ctx.weeklyCfg || readWeeklyAssignments_(ctx.setSheet, ctx.users);
  const rows = [];

  ctx.dailySheetNames.forEach(dateStr => {
    if (excluded.has(dateStr)) return;
    const sheet = ctx.ss.getSheetByName(dateStr);
    if (!sheet) {
      rows.push([dateStr, '0:00', formatHours_(dailyMinHours), formatHours_(dailyMinHours), '日付シートなし', 'カレンダー反映未実行', '', '', '']);
      return;
    }
    const shift = getShiftMatrix_(sheet, ctx.users, ctx.timeSlots);
    const totalSlots = countAssignedSlots_(shift);
    if (totalSlots >= dailyMinSlots) return;

    const uncovered = collectUncoveredRanges_(shift, ctx.timeSlots);
    const lockInfo = getLockInfo_(sheet, ctx.users);
    const date = new Date(dateStr + 'T00:00:00');
    const day = {
      date,
      dateStr,
      sheet,
      userEvents: ctx.users.map(u => fetchEvents(u.email, new Date(date.getTime()))),
      existingShifts: shift,
      lockedCols: lockInfo.lockedCols,
      specialBlockKeywords: parseKeywordList(ctx.setSheet.getRange(SPECIAL_BLOCK_KEYWORD_CELL).getValue()),
    };
    applyWeeklyConfigToDay_(day, weeklyCfg, ctx.users);
    day.specialBlocked = computeSpecialBlockMatrix(ctx.users, day, ctx.timeSlots);
    const availability = computeAvailabilityMatrix(ctx.users, day, ctx.timeSlots, 0, false, false);
    const candidates = [];
    ctx.users.forEach((u, idx) => {
      if (adminEmails.has(String(u.email).toLowerCase())) return;
      if (lockInfo.lockedCols[idx]) return;
      if (isUserInactiveForDay_(day, idx)) return;
      const attr = attrs[String(u.email).toLowerCase()];
      if (attr && attr.fillEligible === false) return;
      let freeSlots = 0;
      for (let s = 0; s < ctx.timeSlots.length; s++) {
        if (ctx.isLunchSlot[s]) continue;
        if (shift[s][idx]) continue;
        if (!availability[idx][s]) continue;
        freeSlots++;
      }
      if (freeSlots > 0) candidates.push({ name: u.name, hours: freeSlots / 4 });
    });
    candidates.sort((a, b) => b.hours - a.hours);

    const reason = [];
    if (lockInfo.lockedNames.length > 0) reason.push('ロック列あり');
    if (day.activeUserFlags) reason.push('週次担当の稼働メンバー制限あり');
    if (candidates.length === 0) reason.push('追加候補なし（予定/勤務時間/NG/終日予定の可能性）');
    if (uncovered.length > 0) reason.push('未カバー時間帯あり');
    rows.push([
      dateStr,
      formatHours_(totalSlots / 4),
      formatHours_(dailyMinSlots / 4),
      formatHours_((dailyMinSlots - totalSlots) / 4),
      uncovered.join('\n'),
      reason.join(' / ') || '下限未達',
      candidates.slice(0, 5).map(c => `${c.name}: ${c.hours.toFixed(2)}h`).join('\n'),
      lockInfo.lockedNames.join(', '),
      '',
    ]);
  });
  return rows;
}

function fillShortageOnlySafely() {
  const ui = SpreadsheetApp.getUi();
  const ctx = getScheduleContext_();
  if (!ctx.ok) {
    ui.alert(ctx.message);
    return;
  }
  const rows = buildShortageRows_(ctx);
  if (rows.length === 0) {
    ui.alert('不足日はありません。');
    return;
  }
  const res = ui.alert('確認', `${rows.length}件の不足日を、候補者の空き枠にだけ安全に補填します。既存シフト・ロック列は変更しません。続行しますか？`, ui.ButtonSet.OK_CANCEL);
  if (res !== ui.Button.OK) return;

  const backupId = createShiftBackupNow_('不足補填前バックアップ', { silent: true });
  const dailyMinHours = parseHoursValue(ctx.setSheet.getRange(DAILY_MIN_CELL)) || getDailyMinHighlightHours_();
  const dailyMinSlots = Math.round(dailyMinHours * 4);
  const adminEmails = parseEmailSet(ctx.setSheet.getRange(ADMIN_EMAIL_CELL).getValue());
  const attrs = readUserAttributes_();
  const weeklyCfg = readWeeklyAssignments_(ctx.setSheet, ctx.users);
  const specialBlockKeywords = parseKeywordList(ctx.setSheet.getRange(SPECIAL_BLOCK_KEYWORD_CELL).getValue());
  let filledSlots = 0;
  let filledDays = 0;

  rows.forEach(row => {
    const dateStr = row[0];
    const sheet = ctx.ss.getSheetByName(dateStr);
    if (!sheet) return;
    const shift = getShiftMatrix_(sheet, ctx.users, ctx.timeSlots);
    const lockInfo = getLockInfo_(sheet, ctx.users);
    const date = new Date(dateStr + 'T00:00:00');
    const day = {
      date,
      dateStr,
      sheet,
      userEvents: ctx.users.map(u => fetchEvents(u.email, new Date(date.getTime()))),
      existingShifts: shift,
      lockedCols: lockInfo.lockedCols,
      specialBlockKeywords,
    };
    applyWeeklyConfigToDay_(day, weeklyCfg, ctx.users);
    day.specialBlocked = computeSpecialBlockMatrix(ctx.users, day, ctx.timeSlots);
    const availability = computeAvailabilityMatrix(ctx.users, day, ctx.timeSlots, 0, false, false);

    let dayTotal = countAssignedSlots_(shift);
    if (dayTotal >= dailyMinSlots) return;

    const order = ctx.users.map((u, idx) => idx).filter(idx => {
      if (adminEmails.has(String(ctx.users[idx].email).toLowerCase())) return false;
      if (lockInfo.lockedCols[idx]) return false;
      if (isUserInactiveForDay_(day, idx)) return false;
      const attr = attrs[String(ctx.users[idx].email).toLowerCase()];
      if (attr && attr.fillEligible === false) return false;
      return true;
    }).sort((a, b) => {
      const attrA = attrs[String(ctx.users[a].email).toLowerCase()];
      const attrB = attrs[String(ctx.users[b].email).toLowerCase()];
      const pa = attrA ? attrA.priority : 999;
      const pb = attrB ? attrB.priority : 999;
      return pa - pb;
    });

    let changed = false;
    for (const uIdx of order) {
      if (dayTotal >= dailyMinSlots) break;
      for (let s = 0; s < ctx.timeSlots.length && dayTotal < dailyMinSlots; s++) {
        if (ctx.isLunchSlot[s]) continue;
        if (shift[s][uIdx]) continue;
        if (!availability[uIdx][s]) continue;
        if (isSpecialBlockedSlot(day, uIdx, s)) continue;
        let otherCount = 0;
        for (let c = 0; c < ctx.users.length; c++) if (shift[s][c]) otherCount++;
        if (otherCount >= 2) continue;
        shift[s][uIdx] = ctx.users[uIdx].name;
        dayTotal++;
        filledSlots++;
        changed = true;
      }
    }
    if (changed) {
      const shiftCol1 = ctx.users.length + 2;
      sheet.getRange(TIME_SLOT_START_ROW, shiftCol1, ctx.timeSlots.length, ctx.users.length).setValues(shift);
      styleShiftRange_(sheet, ctx.users, ctx.timeSlots, shift);
      filledDays++;
    }
  });

  if (filledSlots > 0) {
    updateSettingsTotals(ctx.setSheet, ctx.users, ctx.dailySheetNames, ctx.timeSlots);
    appendGenericHistory_('不足補填', '', '', '', '', `${filledDays}日 / ${(filledSlots / 4).toFixed(2)}h`, backupId);
  }
  ui.alert(`不足補填が完了しました。\n対象日: ${filledDays}日\n追加: ${(filledSlots / 4).toFixed(2)}h\n\n週次担当で非稼働のメンバーは対象外にしています。`);
}

function validateSettings() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const setSheet = ss.getSheetByName('設定');
  const issues = [];
  const warns = [];

  if (!setSheet) {
    SpreadsheetApp.getUi().alert('「設定」シートがありません。先に「設定シートを初期化」を実行してください。');
    return;
  }

  const startDateVal = setSheet.getRange('A2').getValue();
  if (!(startDateVal instanceof Date) || isNaN(new Date(startDateVal).getTime())) issues.push('A2（開始日）が日付として認識できません。');
  const daysToFetch = Number(setSheet.getRange('B2').getValue());
  if (!daysToFetch || daysToFetch <= 0) issues.push('B2（取得日数）が未設定、または0以下です。');
  const startTimeStr = setSheet.getRange('C2').getDisplayValue();
  const endTimeStr = setSheet.getRange('D2').getDisplayValue();
  if (!/^\d{1,2}:\d{2}$/.test(startTimeStr) || !/^\d{1,2}:\d{2}$/.test(endTimeStr)) {
    issues.push('C2（開始時刻）またはD2（終了時刻）の形式が不正です。');
  } else if (startTimeStr >= endTimeStr) {
    issues.push('C2（開始時刻）がD2（終了時刻）以降になっています。');
  }
  const monthlyTargetHours = parseHoursValue(setSheet.getRange(MONTHLY_TARGET_CELL));
  if (monthlyTargetHours <= 0) issues.push('G2（月間目標）が0以下です。');
  const dailyCapHours = parseHoursValue(setSheet.getRange(DAILY_TEAM_CAP_CELL));
  const dailyMinHours = parseHoursValue(setSheet.getRange(DAILY_MIN_CELL));
  if (dailyCapHours > 0 && dailyMinHours > dailyCapHours) issues.push('I2（1日下限）がH2（1日上限）を超えています。');

  const users = readUsers(setSheet);
  if (users.length === 0) {
    issues.push('5行目以降にユーザー（名前・メール）が登録されていません。');
  } else {
    const emailSeen = {};
    users.forEach(u => {
      const em = String(u.email).toLowerCase();
      if (emailSeen[em]) warns.push(`メールアドレス重複: ${u.email}（${emailSeen[em]} と ${u.name}）`);
      emailSeen[em] = u.name;
      if (u.startTime && u.endTime && u.startTime >= u.endTime) {
        warns.push(`${u.name}: G列（開始時刻）がH列（終了時刻）以降になっています。`);
      }
      const targetHours = parseHoursValue(setSheet.getRange(u.settingRow, USER_COL_PLANNED_HOURS));
      if (targetHours <= 0) warns.push(`${u.name}: E列（予定時間）が未設定です（上限なし扱いになります）。`);
    });
    const sumTarget = users.reduce((s, u) => s + parseHoursValue(setSheet.getRange(u.settingRow, USER_COL_PLANNED_HOURS)), 0);
    if (monthlyTargetHours > 0 && sumTarget > 0 && sumTarget < monthlyTargetHours * 0.8) {
      warns.push(`ユーザーE列合計(${sumTarget.toFixed(1)}h)が月間目標(${monthlyTargetHours.toFixed(1)}h)の80%未満です。目標達成が難しい可能性があります。`);
    }
  }

  const adminEmails = parseEmailSet(setSheet.getRange(ADMIN_EMAIL_CELL).getValue());
  const main1Emails = parseEmailSet(setSheet.getRange(MAIN_USER1_CELL).getValue());
  const main2Emails = parseEmailSet(setSheet.getRange(MAIN_USER2_CELL).getValue());
  const main3Emails = parseEmailSet(setSheet.getRange(MAIN_USER3_CELL).getValue());
  const userEmailSet = new Set(users.map(u => String(u.email).toLowerCase()));
  [['メイン担当1', main1Emails], ['メイン担当2', main2Emails], ['メイン担当外', main3Emails], ['管理者', adminEmails]].forEach(([label, set]) => {
    set.forEach(em => { if (!userEmailSet.has(em)) warns.push(`${label}に指定されたメール「${em}」がユーザー一覧にありません。`); });
  });
  main1Emails.forEach(em => { if (main2Emails.has(em)) warns.push(`「${em}」がメイン担当1と2の両方に指定されています。`); });
  if (main1Emails.size === 0 && main2Emails.size === 0) warns.push('メイン担当1・2が両方未設定です（全員予定時の緊急カバー・主担当表示が機能しません）。');

  // 週次担当シートのクロスチェック（任意・参考警告）
  try {
    const weeklySheet = ss.getSheetByName(WEEKLY_ASSIGNMENT_SHEET_NAME);
    if (weeklySheet && weeklySheet.getLastRow() >= 2) {
      const weeklyCfg = readWeeklyAssignments_(setSheet, users);
      let allInactiveWeeks = 0;
      Object.keys(weeklyCfg.byWeekStart || {}).forEach(key => {
        const w = weeklyCfg.byWeekStart[key];
        if (w.activeUserIdxSet && w.activeUserIdxSet.size === 0 && w.hasActiveRestriction) {
          allInactiveWeeks++;
        }
        if (w.unresolvedNames && w.unresolvedNames.length > 0) {
          warns.push(`週次担当シート「${w.weekLabel || key}」: 名前/メールを特定できない記載があります（${w.unresolvedNames.join(', ')}）。`);
        }
      });
      if (allInactiveWeeks > 0) warns.push(`週次担当シートで稼働メンバーが0人になっている週が${allInactiveWeeks}件あります（その週は誰も自動割当されません）。`);
    }
  } catch (e) {}

  const ui = SpreadsheetApp.getUi();
  let msg = '';
  if (issues.length === 0 && warns.length === 0) {
    msg = '設定に問題は見つかりませんでした。';
  } else {
    if (issues.length > 0) msg += `■ エラー (${issues.length}件・要修正)\n` + issues.map(s => '・' + s).join('\n') + '\n\n';
    if (warns.length > 0) msg += `■ 警告 (${warns.length}件・確認推奨)\n` + warns.map(s => '・' + s).join('\n');
  }
  writeValidationReport_(ss, issues, warns);
  ui.alert('設定チェック', msg, ui.ButtonSet.OK);
}

function writeValidationReport_(ss, issues, warns) {
  let sheet = ss.getSheetByName(VALIDATION_REPORT_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(VALIDATION_REPORT_SHEET_NAME);
  resetSimpleSheet_(sheet);
  sheet.getRange(1, 1, 1, 3).setValues([['設定チェック結果', '', Utilities.formatDate(new Date(), 'JST', 'yyyy-MM-dd HH:mm')]]);
  sheet.getRange(1, 1, 1, 3).setBackground('#1c4587').setFontColor('#ffffff').setFontWeight('bold');
  const rows = [['種別', '内容']];
  issues.forEach(s => rows.push(['エラー', s]));
  warns.forEach(s => rows.push(['警告', s]));
  if (rows.length === 1) rows.push(['OK', '問題は見つかりませんでした。']);
  sheet.getRange(3, 1, rows.length, 2).setValues(rows);
  sheet.getRange(3, 1, 1, 2).setBackground('#444444').setFontColor('#ffffff').setFontWeight('bold');
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === 'エラー') sheet.getRange(3 + i, 1, 1, 2).setBackground('#f4cccc');
    else if (rows[i][0] === '警告') sheet.getRange(3 + i, 1, 1, 2).setBackground('#fff2cc');
  }
  sheet.setColumnWidth(1, 90);
  sheet.setColumnWidth(2, 560);
  sheet.getRange(1, 1, sheet.getLastRow(), 2).setWrap(true).setVerticalAlignment('middle');
}

function createTestSimulationSheet() {
  const ctx = getScheduleContext_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SIMULATION_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SIMULATION_SHEET_NAME);
  resetSimpleSheet_(sheet);

  const rows = [
    ['テストシミュレーション', '', ''],
    ['作成日時', new Date(), ''],
    ['', '', ''],
    ['チェック項目', '結果', '詳細'],
  ];

  if (!ctx.ok) {
    rows.push(['基本設定', 'NG', ctx.message]);
  } else {
    rows.push(['基本設定', 'OK', `ユーザー${ctx.users.length}名 / 対象${ctx.dailySheetNames.length}日`]);
    const preview = autoAssignShifts(true, { dryRun: true, silent: true });
    if (preview && preview.warnings) {
      rows.push(['自動割当シミュレーション', preview.warnings.length === 0 ? 'OK' : '警告あり', `警告${preview.warnings.length}件`]);
    }
    const issues = [];
    const warns = [];
    try {
      validateSettingsCollectOnly_(issues, warns);
    } catch (e) {}
    rows.push(['設定チェック', issues.length === 0 ? 'OK' : 'NG', `エラー${issues.length}件 / 警告${warns.length}件`]);
  }

  sheet.getRange(1, 1, rows.length, 3).setValues(rows);
  sheet.getRange(1, 1, 1, 3).setBackground('#1c4587').setFontColor('#ffffff').setFontWeight('bold');
  sheet.getRange(4, 1, 1, 3).setBackground('#444444').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setColumnWidths(1, 3, 220);
  sheet.setColumnWidth(3, 420);
  sheet.getRange(1, 1, rows.length, 3).setWrap(true).setVerticalAlignment('middle');
  SpreadsheetApp.getUi().alert('テストシミュレーションを実行しました。');
}

function validateSettingsCollectOnly_(issues, warns) {
  // validateSettings() のロジックの軽量版。UI表示はしない。
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const setSheet = ss.getSheetByName('設定');
  if (!setSheet) { issues.push('設定シートなし'); return; }
  const users = readUsers(setSheet);
  if (users.length === 0) issues.push('ユーザー未登録');
  const monthlyTargetHours = parseHoursValue(setSheet.getRange(MONTHLY_TARGET_CELL));
  if (monthlyTargetHours <= 0) issues.push('月間目標未設定');
}

/** ===================== 共通ヘルパー(v2) ===================== */

function getScheduleContext_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const setSheet = ss.getSheetByName('設定');
  if (!setSheet) return { ok: false, message: '「設定」シートがありません。' };

  const users = readUsers(setSheet);
  if (users.length === 0) return { ok: false, message: 'ユーザーが登録されていません。' };
  applyRoleSettingsToUsers(users, setSheet);
  users.forEach(u => {
    u.targetSlots = Math.round(parseHoursValue(setSheet.getRange(u.settingRow, USER_COL_PLANNED_HOURS)) * 4);
  });

  const startTimeStr = setSheet.getRange('C2').getDisplayValue();
  const endTimeStr = setSheet.getRange('D2').getDisplayValue();
  const timeSlots = generateTimeSlots(startTimeStr, endTimeStr);
  if (timeSlots.length === 0) return { ok: false, message: 'C2（開始時刻）/D2（終了時刻）を確認してください。' };
  const isLunchSlot = timeSlots.map(t => t >= getLunchStart_() && t < getLunchEnd_());

  const dailySheetNames = ss.getSheets()
    .map(s => s.getName())
    .filter(name => /^\d{4}-\d{2}-\d{2}$/.test(name))
    .sort();

  const weeklyCfg = readWeeklyAssignments_(setSheet, users);

  return {
    ok: true,
    ss,
    setSheet,
    users,
    timeSlots,
    isLunchSlot,
    dailySheetNames,
    weeklyCfg,
  };
}

function resetSimpleSheet_(sheet) {
  sheet.setFrozenRows(0);
  sheet.setFrozenColumns(0);
  const maxRows = sheet.getMaxRows();
  const maxCols = sheet.getMaxColumns();
  const full = sheet.getRange(1, 1, maxRows, maxCols);
  try { full.breakApart(); } catch (e) {}
  try { full.clearDataValidations(); } catch (e) {}
  sheet.clear();
  try { sheet.showSheet(); } catch (e) {}
}

function getShiftMatrix_(sheet, users, timeSlots) {
  const shiftCol1 = users.length + 2;
  try {
    return sheet.getRange(TIME_SLOT_START_ROW, shiftCol1, timeSlots.length, users.length).getValues();
  } catch (e) {
    return timeSlots.map(() => new Array(users.length).fill(''));
  }
}

function countAssignedSlots_(shift) {
  let count = 0;
  shift.forEach(row => row.forEach(v => { if (v) count++; }));
  return count;
}

function collectUncoveredRanges_(shift, timeSlots) {
  const ranges = [];
  let runStart = -1;
  for (let s = 0; s <= shift.length; s++) {
    const uncovered = s < shift.length && !shift[s].some(v => v);
    if (uncovered && runStart === -1) runStart = s;
    if ((!uncovered || s === shift.length) && runStart !== -1) {
      ranges.push(`${timeSlots[runStart]}〜${slotEndTime(timeSlots, s - 1)}`);
      runStart = -1;
    }
  }
  return ranges;
}

function getLockInfo_(sheet, users) {
  const shiftCol1 = users.length + 2;
  let lockedCols = new Array(users.length).fill(false);
  try {
    const vals = sheet.getRange(LOCK_ROW, shiftCol1, 1, users.length).getValues()[0];
    lockedCols = vals.map(v => v === true);
  } catch (e) {}
  const lockedNames = users.filter((u, idx) => lockedCols[idx]).map(u => u.name);
  return { lockedCols, lockedNames };
}

function styleShiftRange_(sheet, users, timeSlots, shiftValues) {
  const shiftCol1 = users.length + 2;
  for (let s = 0; s < timeSlots.length; s++) {
    for (let c = 0; c < users.length; c++) {
      const cell = sheet.getRange(TIME_SLOT_START_ROW + s, shiftCol1 + c);
      const name = shiftValues[s][c];
      if (name) {
        const user = users.find(u => u.name === name);
        if (user) cell.setBackground(user.bgColor).setFontColor(user.fontColor);
      } else {
        cell.setBackground('#fff4e5').setFontColor('#000000');
      }
    }
  }
}

function getUserTotalSlotsFromSettings_(setSheet, user, dailySheetNames) {
  // 設定シートのI列（合計）を直接読まず、念のため独自に再計算したい場合のための予備関数。
  // 通常は updateSettingsTotals が生成する数式（I列）をそのまま信頼してよい。
  const ss = setSheet.getParent();
  let total = 0;
  dailySheetNames.forEach(dateStr => {
    const sheet = ss.getSheetByName(dateStr);
    if (!sheet) return;
    const lastCol = sheet.getLastColumn();
    const lastRow = sheet.getLastRow();
    if (lastRow < TIME_SLOT_START_ROW) return;
    try {
      const headerRow = sheet.getRange(3, 1, 1, lastCol).getValues()[0];
      let shiftCount = 0;
      for (let c = lastCol - 1; c >= 0; c--) {
        if (headerRow[c] === 'シフト') shiftCount++;
        else break;
      }
      if (shiftCount === 0) return;
      const shiftCol1 = lastCol - shiftCount + 1;
      const values = sheet.getRange(TIME_SLOT_START_ROW, shiftCol1, lastRow - TIME_SLOT_START_ROW + 1, shiftCount).getValues();
      values.forEach(row => row.forEach(v => { if (String(v).trim() === user.name) total++; }));
    } catch (e) {}
  });
  return total;
}

function countShiftEventConflicts_(users, dateStr, shift, timeSlots, isLunchSlot) {
  const conflicts = [];
  const date = new Date(dateStr + 'T00:00:00');
  users.forEach((user, uIdx) => {
    const events = fetchEvents(user.email, new Date(date.getTime()));
    if (!events || events.length === 0) return;
    for (let s = 0; s < timeSlots.length; s++) {
      if (isLunchSlot[s]) continue;
      if (!shift[s][uIdx]) continue;
      const slotStart = parseSlotTime(date, timeSlots[s]).getTime();
      const slotEnd = slotStart + 15 * 60 * 1000;
      const hit = events.find(ev => {
        if (isAllDayEventSafe(ev)) return true;
        let es, ee;
        try { es = ev.getStartTime().getTime(); ee = ev.getEndTime().getTime(); } catch (e) { return false; }
        return slotStart < ee && slotEnd > es;
      });
      if (hit) {
        let title = '';
        try { title = hit.getTitle(); } catch (e) {}
        conflicts.push({ user: user.name, time: timeSlots[s], title: title || '(無題の予定)' });
      }
    }
  });
  return conflicts;
}

function countSoloDays_(ctx) {
  let count = 0;
  ctx.dailySheetNames.forEach(dateStr => {
    const sheet = ctx.ss.getSheetByName(dateStr);
    if (!sheet) return;
    const shift = getShiftMatrix_(sheet, ctx.users, ctx.timeSlots);
    const assigned = new Set();
    shift.forEach(row => row.forEach((v, c) => { if (v) assigned.add(c); }));
    if (assigned.size === 1) count++;
  });
  return count;
}

function collectUserShiftBlocks_(shift, uIdx, timeSlots) {
  const blocks = [];
  let runStart = -1;
  for (let s = 0; s <= shift.length; s++) {
    const on = s < shift.length && !!shift[s][uIdx];
    if (on && runStart === -1) runStart = s;
    if ((!on || s === shift.length) && runStart !== -1) {
      blocks.push({
        startTime: timeSlots[runStart],
        endTime: slotEndTime(timeSlots, s - 1),
        lengthSlots: s - runStart,
      });
      runStart = -1;
    }
  }
  return blocks;
}

function getWeekStartMonday_(date) {
  const d = new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=日, 1=月, ..., 6=土
  const diff = dow === 0 ? -6 : (1 - dow); // 月曜まで戻す日数
  d.setDate(d.getDate() + diff);
  return d;
}

function formatHours_(hours) {
  const sign = hours < 0 ? '-' : '';
  const abs = Math.abs(hours);
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return `${sign}${h}:${String(m).padStart(2, '0')}`;
}

function sanitizeForId_(text) {
  return String(text || '').replace(/[^a-zA-Z0-9_\-ぁ-んァ-ヶ一-龠]/g, '_').slice(0, 40);
}

function uniqueStrings_(arr) {
  const seen = new Set();
  const result = [];
  arr.forEach(s => {
    const t = String(s || '').trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    result.push(t);
  });
  return result;
}

function getActiveUserEmailSafe_() {
  try {
    const email = Session.getActiveUser().getEmail();
    return email || '(不明)';
  } catch (e) {
    return '(不明)';
  }
}

/** ===================== 週次担当（週ごとの主担当・稼働メンバー） ===================== */

const WEEKLY_ASSIGNMENT_SHEET_NAME = '週次担当';

/** 自動割当: 予定無視キーワード（運用設定シートで設定。空欄なら機能オフ） */
function getAssignIgnoreEventKeywords_() {
  return getOperationConfig_().assignIgnoreEventKeywords;
}

/** 週次担当の「稼働メンバー」制限により、その日 uIdx が非稼働かどうか */
function isUserInactiveForDay_(day, uIdx) {
  if (!day || !day.activeUserFlags) return false;
  return day.activeUserFlags[uIdx] === false;
}

/**
 * カンマ等区切りの文字列から、名前またはメールでユーザーを特定する。
 * @return {{idxs: number[], unresolved: string[]}}
 */
function resolveUserRefs_(raw, users) {
  const idxs = [];
  const unresolved = [];
  if (!raw) return { idxs, unresolved };
  String(raw).split(/[,,、;；\s]+/).forEach(tok => {
    const t = tok.trim();
    if (!t) return;
    const tLower = t.toLowerCase();
    let idx = users.findIndex(u => String(u.email || '').toLowerCase() === tLower);
    if (idx < 0) idx = users.findIndex(u => String(u.name || '').trim() === t);
    if (idx >= 0) {
      if (idxs.indexOf(idx) < 0) idxs.push(idx);
    } else {
      unresolved.push(t);
    }
  });
  return { idxs, unresolved };
}

/**
 * 「週次担当」シートを読み込み、週開始日(月曜)ごとの設定を返す。
 * 各週: { weekLabel, weekStart, leadIdxs, activeUserIdxSet, hasActiveRestriction, unresolvedNames, note }
 *  - activeUserIdxSet が null は「稼働メンバー欄が空欄＝制限なし（全員対象）」を意味する。
 *  - 主担当に指定された人は、稼働メンバー欄への記載を忘れても自動的に稼働扱いに含める。
 */
function readWeeklyAssignments_(setSheet, users) {
  const result = { byWeekStart: {} };
  const ss = setSheet.getParent();
  const sheet = ss.getSheetByName(WEEKLY_ASSIGNMENT_SHEET_NAME);
  if (!sheet) return result;
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return result;

  const values = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
  values.forEach(row => {
    const weekLabel = String(row[0] || '').trim();
    const weekStartRaw = row[1];
    if (!weekStartRaw && weekStartRaw !== 0) return;

    let weekStartDate;
    if (weekStartRaw instanceof Date) {
      weekStartDate = getWeekStartMonday_(weekStartRaw);
    } else {
      const s = String(weekStartRaw).trim();
      if (!s) return;
      const parsed = new Date(s);
      if (isNaN(parsed.getTime())) return;
      weekStartDate = getWeekStartMonday_(parsed);
    }
    const key = Utilities.formatDate(weekStartDate, 'JST', 'yyyy-MM-dd');

    const leadRaw = String(row[2] || '').trim();
    const activeRaw = String(row[3] || '').trim();
    const note = String(row[4] || '').trim();

    const leadResolved = resolveUserRefs_(leadRaw, users);
    const activeResolved = resolveUserRefs_(activeRaw, users);

    const hasActiveRestriction = activeRaw !== '';
    let activeUserIdxSet = null;
    if (hasActiveRestriction) {
      activeUserIdxSet = new Set(activeResolved.idxs);
      // 主担当は稼働メンバーに書き忘れても、その週は必ず稼働扱いにする。
      leadResolved.idxs.forEach(i => activeUserIdxSet.add(i));
    }

    const unresolvedNames = uniqueStrings_(leadResolved.unresolved.concat(activeResolved.unresolved));

    result.byWeekStart[key] = {
      weekLabel: weekLabel || key,
      weekStart: weekStartDate,
      leadIdxs: leadResolved.idxs,
      activeUserIdxSet,
      hasActiveRestriction,
      unresolvedNames,
      note,
    };
  });

  return result;
}

/**
 * 週次担当の設定を1日分(day)に適用する。
 *  - day.activeUserFlags: その週に稼働メンバー制限がある場合のみ設定（true=稼働 / false=非稼働）
 *  - day.weekLeadIdxOrder: その週の主担当の優先順（先頭から、その日に出られる人を採用）
 */
function applyWeeklyConfigToDay_(day, weeklyCfg, users) {
  if (!day || !weeklyCfg || !weeklyCfg.byWeekStart) return;
  const monday = getWeekStartMonday_(day.date);
  const key = Utilities.formatDate(monday, 'JST', 'yyyy-MM-dd');
  const w = weeklyCfg.byWeekStart[key];
  if (!w) return;

  if (w.hasActiveRestriction && w.activeUserIdxSet) {
    day.activeUserFlags = users.map((u, idx) => w.activeUserIdxSet.has(idx));
  }
  if (w.leadIdxs && w.leadIdxs.length > 0) {
    day.weekLeadIdxOrder = w.leadIdxs.slice();
  }
}

/**
 * その日の主担当を選ぶ。週次担当シートで主担当が指定されていれば、
 * 先頭から「その日に出られる人（非稼働・ロック・終日予定・管理者でない）」を優先して採用する。
 * 該当者がいなければ、従来の selectDailyMainLeadIdx にフォールバックする。
 */
function selectDailyMainLeadIdxWithWeek_(users, day, dayIdx) {
  if (day && day.weekLeadIdxOrder && day.weekLeadIdxOrder.length > 0) {
    for (let i = 0; i < day.weekLeadIdxOrder.length; i++) {
      const idx = day.weekLeadIdxOrder[i];
      if (idx < 0 || idx >= users.length) continue;
      if (users[idx].isAdmin) continue;
      if (day.lockedCols && day.lockedCols[idx]) continue;
      if (isUserInactiveForDay_(day, idx)) continue;
      if (day.userEvents && day.userEvents[idx] && day.userEvents[idx].some(ev => isAllDayEventSafe(ev))) continue;
      return idx;
    }
    // 週次担当の主担当が全員その日入れない場合は、通常ロジックへフォールバックする。
  }
  return selectDailyMainLeadIdx(users, day, dayIdx);
}

/**
 * メニュー: 「週次担当」シートを作成/更新。
 * 設定シート A2(開始日)/B2(取得日数) の対象期間に含まれる週（月曜始まり）を自動的に並べる。
 * 既存の入力（主担当・稼働メンバー・備考・週ラベル）は、週開始日が一致する行に限り保持する。
 */
function createWeeklyAssignmentSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const setSheet = ss.getSheetByName('設定');
  const ui = SpreadsheetApp.getUi();
  if (!setSheet) {
    ui.alert('「設定」シートを作成してください。');
    return;
  }
  const users = readUsers(setSheet);
  if (users.length === 0) {
    ui.alert('ユーザーが登録されていません。');
    return;
  }

  const startDateValue = setSheet.getRange('A2').getValue();
  const startDate = new Date(startDateValue);
  const daysToFetch = Number(setSheet.getRange('B2').getValue());
  if (isNaN(startDate.getTime()) || !daysToFetch || daysToFetch <= 0) {
    ui.alert('設定シートの A2（開始日）と B2（取得日数）を確認してください。');
    return;
  }

  let sheet = ss.getSheetByName(WEEKLY_ASSIGNMENT_SHEET_NAME);
  const existingByKey = {};
  if (sheet && sheet.getLastRow() >= 2) {
    const lastCol = Math.max(5, sheet.getLastColumn());
    const existingValues = sheet.getRange(2, 1, sheet.getLastRow() - 1, lastCol).getValues();
    existingValues.forEach(row => {
      const weekStartRaw = row[1];
      if (!weekStartRaw) return;
      let d;
      if (weekStartRaw instanceof Date) {
        d = getWeekStartMonday_(weekStartRaw);
      } else {
        const parsed = new Date(String(weekStartRaw));
        if (isNaN(parsed.getTime())) return;
        d = getWeekStartMonday_(parsed);
      }
      const key = Utilities.formatDate(d, 'JST', 'yyyy-MM-dd');
      existingByKey[key] = row;
    });
  }
  if (!sheet) sheet = ss.insertSheet(WEEKLY_ASSIGNMENT_SHEET_NAME);

  // 対象期間に含まれる週(月曜始まり)を列挙する。
  const endDate = new Date(startDate.getTime());
  endDate.setDate(startDate.getDate() + daysToFetch - 1);
  const weekKeys = [];
  let cursor = getWeekStartMonday_(startDate);
  const lastMonday = getWeekStartMonday_(endDate);
  let guard = 0;
  while (cursor.getTime() <= lastMonday.getTime() && guard++ < 600) {
    weekKeys.push(Utilities.formatDate(cursor, 'JST', 'yyyy-MM-dd'));
    const next = new Date(cursor.getTime());
    next.setDate(next.getDate() + 7);
    cursor = next;
  }

  resetSimpleSheet_(sheet);
  const header = ['週ラベル', '週開始日(月曜)', '主担当(その週)', '稼働メンバー(この週に入る人)', '備考'];
  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  sheet.getRange(1, 1, 1, header.length).setBackground('#1c4587').setFontColor('#ffffff').setFontWeight('bold');

  const rows = weekKeys.map((key, idx) => {
    const existing = existingByKey[key];
    const d = new Date(key + 'T00:00:00');
    const label = (existing && String(existing[0] || '').trim()) ? existing[0] : `第${idx + 1}週`;
    const lead = existing ? existing[2] : '';
    const active = existing ? existing[3] : '';
    const note = existing ? existing[4] : '';
    return [label, d, lead, active, note];
  });

  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 5).setValues(rows);
    sheet.getRange(2, 2, rows.length, 1).setNumberFormat('yyyy/MM/dd (aaa)');
    sheet.getRange(2, 1, rows.length, 5).setVerticalAlignment('middle');
  }

  sheet.setFrozenRows(1);
  sheet.setColumnWidth(1, 100);
  sheet.setColumnWidth(2, 140);
  sheet.setColumnWidth(3, 220);
  sheet.setColumnWidth(4, 300);
  sheet.setColumnWidth(5, 240);

  const noteStartRow = rows.length + 3;
  sheet.getRange(noteStartRow, 1).setValue('【使い方】').setFontWeight('bold');
  const notes = [
    '・「主担当(その週)」「稼働メンバー(この週に入る人)」は名前またはメールをカンマ区切りで入力します。',
    '・主担当は先頭から「その日に出られる人」を優先して、その日の主担当にします。',
    '・稼働メンバーを入力した週は、書いていない人はその週は自動割当の対象外になります（緊急の強制カバーや最終手段でも入れません）。稼働メンバー欄が空欄の週は、従来通り全員が対象です。',
    '・主担当に指定した人は、稼働メンバー欄への記載を忘れてもその週は自動的に稼働扱いになります。',
    '・このシート（行）に無い週は、従来通りメイン担当1/2のうち予定が少ない方が日ごとに自動選択されます。',
    '・名前/メールが設定シートのユーザー一覧と一致しない場合、自動割当実行時や設定チェックで警告が出ます。',
  ];
  notes.forEach((n, i) => {
    const r = noteStartRow + 1 + i;
    sheet.getRange(r, 1, 1, 5).merge();
    sheet.getRange(r, 1).setValue(n).setFontColor('#666666').setWrap(true);
  });

  ui.alert(
    '週次担当シートを作成/更新しました',
    `対象週数: ${weekKeys.length}\n\n` +
    '「主担当(その週)」「稼働メンバー(この週に入る人)」の列に、名前またはメールをカンマ区切りで入力してください。\n' +
    '空欄の週は従来通りの自動選択になります。',
    ui.ButtonSet.OK
  );
}