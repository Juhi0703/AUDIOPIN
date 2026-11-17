/* Results log: every answer becomes a row, kept in localStorage and exported as CSV for analysis. */

const COLUMNS = ['time', 'participant', 'layout', 'mode', 'trial', 'step', 'key', 'code',
                 'target', 'chosen', 'correct', 'wrapped', 'replays', 'repeats', 'ms', 'cues', 'delay_ms'];
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

function toCsv() {
  const quote = v => {
    const s = v === undefined || v === null ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [COLUMNS.join(',')].concat(log.map(r => COLUMNS.map(c => quote(r[c])).join(','))).join('\n');
}

function renderLog() {
  $('logCount').textContent = log.length;
  const esc = v => String(v ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  const cols = COLUMNS.slice(1);                       // the table skips the timestamp to stay narrow
  $('logView').innerHTML = '<table><tr>' + cols.map(c => `<th>${c}</th>`).join('') + '</tr>' +
    log.slice(-10).reverse().map(r => '<tr>' + cols.map(c => `<td>${esc(r[c])}</td>`).join('') + '</tr>').join('') +
    '</table>';
  if (!$('csvText').hidden) $('csvText').value = toCsv();
}

// File name carries the participant and date, e.g. audiopin-P03-2026-11-17.csv
function csvName() {
  const id = $('pid').value.trim().replace(/[^A-Za-z0-9_-]/g, '') || 'unknown';
  return `audiopin-${id}-${new Date().toISOString().slice(0, 10)}.csv`;
}
const csvFile = () => new File([toCsv()], csvName(), { type: 'text/csv' });

function downloadCsv() {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(csvFile());
  link.download = csvName();
  document.body.appendChild(link);
  link.click();
  link.remove();
}
$('dl').onclick = downloadCsv;

// Phones: send the CSV straight to WhatsApp, Drive, Gmail, Nearby Share... (Web Share API, where supported).
function canShareCsv() {
  try { return !!(navigator.canShare && navigator.canShare({ files: [csvFile()] })); } catch (e) { return false; }
}
// Messages about saving the CSV appear both in the status line and next to the buttons.
const csvSay = text => { say(text); $('csvNote').textContent = text; };

// Always visible. Where the browser cannot share files (laptops, Firefox, links opened inside
// WhatsApp/Instagram), it downloads the file instead and says where to find it.
$('shareCsv').onclick = async () => {
  if (!log.length) return csvSay('The log is empty — nothing to share yet.');
  if (!canShareCsv()) {
    downloadCsv();
    return csvSay(`This browser can't share files, so ${csvName()} was downloaded instead. ` +
               'Send it from Downloads (iPhone: Files app → Downloads), or open this page in Chrome/Safari to share directly.');
  }
  try {
    await navigator.share({ files: [csvFile()], title: csvName(), text: 'AudioPIN study log' });
    csvSay(`Shared ${csvName()}.`);
  } catch (e) {
    if (e.name === 'AbortError') return;          // the user closed the share sheet
    downloadCsv();
    csvSay(`Sharing failed, so ${csvName()} was downloaded instead.`);
  }
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
