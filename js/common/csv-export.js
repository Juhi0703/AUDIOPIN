/* CSV export shared by both pages: the same columns, file naming, download and share-with-fallback.
   One column set means analysis/study_analysis.py reads logs from either app. */

const LOG_COLUMNS = ['time', 'participant', 'layout', 'mode', 'trial', 'step', 'key', 'code',
                     'target', 'chosen', 'correct', 'wrapped', 'replays', 'repeats', 'ms', 'cues', 'delay_ms'];

function rowsToCsv(rows) {
  const quote = v => {
    const s = v === undefined || v === null ? '' : String(v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  return [LOG_COLUMNS.join(',')].concat(rows.map(r => LOG_COLUMNS.map(c => quote(r[c])).join(','))).join('\n');
}

// e.g. audiopin-P03-2026-11-17.csv or audiopin-lock-P03-2026-11-17.csv
function csvFileName(prefix, id) {
  const clean = String(id || '').trim().replace(/[^A-Za-z0-9_-]/g, '') || 'unknown';
  return `${prefix}-${clean}-${new Date().toISOString().slice(0, 10)}.csv`;
}

const csvFileOf = (rows, name) => new File([rowsToCsv(rows)], name, { type: 'text/csv' });

function downloadFile(file) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(file);
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function canShareFile(file) {
  try { return !!(navigator.canShare && navigator.canShare({ files: [file] })); } catch (e) { return false; }
}

// Phones: the share sheet (WhatsApp, Drive, Gmail, Nearby Share...). Where the browser cannot share
// files (laptops, Firefox, links opened inside WhatsApp/Instagram) the file is downloaded instead.
// Returns a message for the user, or '' if they closed the share sheet.
async function shareOrDownload(file) {
  if (!canShareFile(file)) {
    downloadFile(file);
    return `This browser can't share files, so ${file.name} was downloaded instead. ` +
           'Send it from Downloads (iPhone: Files app → Downloads), or open this page in Chrome/Safari to share directly.';
  }
  try {
    await navigator.share({ files: [file], title: file.name, text: 'AudioPIN study log' });
    return `Shared ${file.name}.`;
  } catch (e) {
    if (e.name === 'AbortError') return '';
    downloadFile(file);
    return `Sharing failed, so ${file.name} was downloaded instead.`;
  }
}
