/**
 * Aircraft Status Squadron 602 — Google Sheet backend
 *
 * Web app that the page (index.html) calls to load and save the status board.
 * Data lives in the spreadsheet below:
 *   STATUS   current board, one row per defect (rewritten on every SAVE)
 *   HISTORY  one row per SAVE with the full board as JSON (last 500 kept)
 * Other sheets in the file (e.g. Sheet1) are never touched.
 *
 * Script Properties (Project Settings > Script Properties):
 *   ACCESS_KEY  passcode the page must send to read or write. Leave unset only for testing.
 */

var SHEET_ID = '1anv2r5lFThD2buHkA0QtoBH5zH300Nyl9KXi33S3-ec';
var STATUS_SHEET = 'STATUS';
var HISTORY_SHEET = 'HISTORY';
var HISTORY_KEEP = 500;
var DISPLAY_TZ = 'Asia/Bangkok';

var HEADERS = ['อากาศยาน', 'สถานภาพ', 'วันที่ตรวจพบ', 'รายการข้อขัดข้อง', 'ฝ่ายที่รับผิดชอบ',
  'การดำเนินการ', 'MEL Category', 'วันที่เริ่มต้น', 'วันครบกำหนด', 'หมายเหตุ'];
var FIELDS = ['found', 'defect', 'dept', 'action', 'mel', 'start', 'due', 'note'];
var DATE_COLS = [3, 8, 9];                                   // 1-based
var COL_WIDTHS_PX = [116, 114, 110, 257, 105, 333, 64, 110, 110, 215];

var DEPT_COLOR = { 'ฝ่ายการช่าง': '#d7ebfa', 'ฝ่ายสื่อสาร': '#fbdfe9' };
var STATUS_COLOR = { 'FMC': '#17803d', 'PMC': '#c2610c' };   // others red
var RED = '#c81e1e';

/* ---------- entry points ---------- */

function doGet() {
  // Health check only; data is never returned over GET.
  return json_({ ok: true, service: 'ac-status-602' });
}

function doPost(e) {
  var p;
  try { p = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad_request' }); }
  try {
    if (!authorized_(p.key)) return json_({ ok: false, error: 'unauthorized' });
    if (p.action === 'load') return json_(load_());
    if (p.action === 'save') return json_(save_(p));
    return json_({ ok: false, error: 'unknown_action' });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server_error', message: String(err) });
  }
}

/* ---------- load ---------- */

function load_() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName(STATUS_SHEET);
  var tz = ss.getSpreadsheetTimeZone();
  var fleet = [], byName = {};
  if (sh && sh.getLastRow() >= 2) {
    var values = sh.getRange(2, 1, sh.getLastRow() - 1, HEADERS.length).getValues();
    var cur = null;
    values.forEach(function (r) {
      var name = text_(r[0], tz);
      if (name) {
        cur = byName[name];
        if (!cur) { cur = byName[name] = { name: name, status: text_(r[1], tz), rows: [] }; fleet.push(cur); }
      }
      if (!cur) return;                        // rows before the first aircraft name
      var mel = text_(r[6], tz).toUpperCase();
      cur.rows.push({
        found: iso_(r[2], tz), defect: text_(r[3], tz), dept: text_(r[4], tz), action: text_(r[5], tz),
        mel: /^[ABCD]$/.test(mel) ? mel : '', start: iso_(r[7], tz), due: iso_(r[8], tz), note: text_(r[9], tz)
      });
    });
  }
  return { ok: true, fleet: fleet, savedAt: savedAt_() };
}

/* ---------- save ---------- */

function save_(p) {
  if (!Array.isArray(p.fleet)) return { ok: false, error: 'bad_request' };
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var current = savedAt_();
    if (current && Number(p.base) !== current) return { ok: false, error: 'conflict', savedAt: current };

    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sh = ss.getSheetByName(STATUS_SHEET) || ss.insertSheet(STATUS_SHEET);
    var rows = [], bg = [], fc = [], fw = [], blocks = [];

    p.fleet.forEach(function (a) {
      if (!a || !a.name) return;
      var first = rows.length;
      var list = Array.isArray(a.rows) && a.rows.length ? a.rows : [{}];
      list.forEach(function (x) {
        x = x || {};
        rows.push([cell_(a.name), cell_(a.status), date_(x.found), cell_(x.defect), cell_(x.dept),
          cell_(x.action), cell_(x.mel), date_(x.start), date_(x.due), cell_(x.note)]);
        var tint = DEPT_COLOR[x.dept] || null, nd = /no\s*dispatch/i.test(x.note || '');
        var stColor = a.status ? (STATUS_COLOR[a.status] || RED) : '#000000';
        bg.push(HEADERS.map(function (_, i) { return i >= 3 ? tint : null; }));
        fc.push(HEADERS.map(function (_, i) { return i === 1 ? stColor : (i === 9 && nd ? RED : '#000000'); }));
        fw.push(HEADERS.map(function (_, i) { return i <= 1 || (i === 9 && nd) ? 'bold' : 'normal'; }));
      });
      blocks.push(first);
    });

    sh.clear();
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
      .setFontWeight('bold').setFontColor('#ffffff').setBackground('#1f3f6e')
      .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true);
    sh.setFrozenRows(1);
    COL_WIDTHS_PX.forEach(function (w, i) { sh.setColumnWidth(i + 1, w); });

    if (rows.length) {
      var range = sh.getRange(2, 1, rows.length, HEADERS.length);
      range.setNumberFormat('@');
      DATE_COLS.forEach(function (c) { sh.getRange(2, c, rows.length, 1).setNumberFormat('dd/mm/yyyy'); });
      range.setValues(rows).setBackgrounds(bg).setFontColors(fc).setFontWeights(fw)
        .setWrap(true).setVerticalAlignment('top')
        .setBorder(true, true, true, true, true, true, '#9aa3af', SpreadsheetApp.BorderStyle.SOLID);
      var thick = SpreadsheetApp.BorderStyle.SOLID_THICK;
      blocks.forEach(function (first) {
        sh.getRange(2 + first, 1, 1, HEADERS.length).setBorder(true, null, null, null, null, null, '#000000', thick);
      });
      sh.getRange(1 + rows.length, 1, 1, HEADERS.length).setBorder(null, null, true, null, null, null, '#000000', thick);
    }

    var now = Date.now();
    PropertiesService.getScriptProperties().setProperty('SAVED_AT', String(now));
    history_(ss, now, p.fleet);
    return { ok: true, savedAt: now };
  } finally {
    lock.releaseLock();
  }
}

function history_(ss, now, fleet) {
  var sh = ss.getSheetByName(HISTORY_SHEET);
  if (!sh) {
    sh = ss.insertSheet(HISTORY_SHEET);
    sh.getRange(1, 1, 1, 2).setValues([['เวลาบันทึก (เวลาไทย)', 'ข้อมูลทั้งตาราง (JSON)']]).setFontWeight('bold');
    sh.setFrozenRows(1);
    sh.setColumnWidth(1, 170);
  }
  var data = JSON.stringify(fleet);
  if (data.length > 49000) data = '(ข้อมูลยาวเกินกว่าจะเก็บในหนึ่งช่อง)';
  sh.appendRow([Utilities.formatDate(new Date(now), DISPLAY_TZ, 'yyyy-MM-dd HH:mm:ss'), data]);
  var extra = sh.getLastRow() - 1 - HISTORY_KEEP;
  if (extra > 0) sh.deleteRows(2, extra);
}

/* ---------- helpers ---------- */

function authorized_(key) {
  var want = PropertiesService.getScriptProperties().getProperty('ACCESS_KEY');
  return !want || String(key || '') === want;
}

function savedAt_() {
  return Number(PropertiesService.getScriptProperties().getProperty('SAVED_AT') || 0) || null;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// Text written to the sheet; a leading = + - @ is escaped so it is never run as a formula.
function cell_(v) {
  var s = v == null ? '' : String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

// yyyy-mm-dd -> sheet date serial (independent of the spreadsheet's time zone)
function date_(iso) {
  var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return '';
  return (Date.UTC(+m[1], +m[2] - 1, +m[3]) - Date.UTC(1899, 11, 30)) / 864e5;
}

function iso_(v, tz) {
  if (v instanceof Date) return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  if (typeof v === 'number' && v > 0) return new Date(Date.UTC(1899, 11, 30) + v * 864e5).toISOString().slice(0, 10);
  var s = String(v || '').trim(), m;
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s))) return m[1] + '-' + pad_(m[2]) + '-' + pad_(m[3]);
  if ((m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) return m[3] + '-' + pad_(m[2]) + '-' + pad_(m[1]);
  return '';
}

function text_(v, tz) {
  if (v instanceof Date) return Utilities.formatDate(v, tz, 'dd/MM/yyyy');
  return v == null ? '' : String(v).trim();
}

function pad_(n) { n = String(n); return n.length < 2 ? '0' + n : n; }
