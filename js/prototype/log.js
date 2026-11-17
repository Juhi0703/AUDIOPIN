/* Results log: every answer becomes a row, kept in localStorage and exported as CSV for analysis. */

const LOG_STORE = 'audiopin-log';
let log = [];

function addLog(row) {
  log.push({
    time: new Date().toISOString(),
    participant: $('pid').value.trim(),
    layout,
    delay_ms: Math.round(outputDelayMs()),
    ...row,
    ms: row.ms === undefined ? '' : Math.round(row.ms)
  });
  try { localStorage.setItem(LOG_STORE, JSON.stringify(log)); } catch (e) {} // survives a reload; the CSV is the real backup
  renderLog();
}

function loadLog() {
  try { log = JSON.parse(localStorage.getItem(LOG_STORE)) || []; } catch (e) { log = []; }
  trialNo = log.reduce((max, r) => Math.max(max, Number(r.trial) || 0), 0);
}

const toCsv = () => rowsToCsv(log);              // columns and quoting: js/common/csv-export.js

function renderLog() {
  $('logCount').textContent = log.length;
  const esc = v => String(v ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const cols = LOG_COLUMNS.slice(1);                       // the table skips the timestamp to stay narrow
  $('logView').innerHTML = '<table><tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr>' +
    log.slice(-10).reverse().map(r => '<tr>' + cols.map(c => `<td>${esc(r[c])}</td>`).join('') + '</tr>').join('') +
    '</table>';
  if (!$('csvText').hidden) $('csvText').value = toCsv();
}

// File name carries the participant and date, e.g. audiopin-P03-2026-11-17.csv
const csvName = () => csvFileName('audiopin', $('pid').value);
const csvFile = () => csvFileOf(log, csvName());
const downloadCsv = () => downloadFile(csvFile());
$('dl').onclick = downloadCsv;

// Messages about saving the CSV appear both in the status line and next to the buttons.
const csvSay = text => { if (text) { say(text); $('csvNote').textContent = text; } };

// Always visible; falls back to a download where the browser cannot share files.
$('shareCsv').onclick = async () => {
  if (!log.length) return csvSay('The log is empty — nothing to share yet.');
  csvSay(await shareOrDownload(csvFile()));
};

$('showCsv').onclick = () => {
  const box = $('csvText');
  box.hidden = !box.hidden;
  box.value = toCsv();
  if (!box.hidden) box.select();
};

let wipeArmed = false;   // clearing needs two taps within 4 s
$('wipe').onclick = () => {
  if (!wipeArmed) {
    wipeArmed = true;
    $('wipe').textContent = `Tap again to delete ${log.length} rows`;
    setTimeout(() => { wipeArmed = false; $('wipe').textContent = 'Clear log'; }, 4000);
    return;
  }
  wipeArmed = false;
  $('wipe').textContent = 'Clear log';
  log = [];
  try { localStorage.removeItem(LOG_STORE); } catch (e) {}
  renderLog();
};
