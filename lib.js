(function (global) {
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  function localDateStr(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  function todayStr() {
    return localDateStr(new Date());
  }

  function formatDate(str) {
    const d = new Date(str + 'T00:00:00');
    return d.toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' });
  }

  function formatDateLabel(str) {
    if (str === todayStr()) return 'Сьогодні';
    const y = new Date();
    y.setDate(y.getDate() - 1);
    if (str === localDateStr(y)) return 'Вчора';
    return new Date(str + 'T00:00:00').toLocaleDateString('uk-UA', { weekday: 'short', day: 'numeric', month: 'short' });
  }

  function toWeight(raw) {
    const s = String(raw ?? '').trim().replace(',', '.');
    const n = Number(s);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.round(n * 10) / 10;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[c]));
  }

  function isValidDateEntry(p) {
    return !!(p && typeof p === 'object' && Object.keys(p).length > 0);
  }

  function computeWeightDiffs(sorted) {
    return sorted.map((w, i) => {
      if (i >= sorted.length - 1) return null;
      return Math.round((w.weight - sorted[i + 1].weight) * 10) / 10;
    });
  }

  const lib = {
    DATE_RE,
    localDateStr,
    todayStr,
    formatDate,
    formatDateLabel,
    toWeight,
    escapeHtml,
    isValidDateEntry,
    computeWeightDiffs
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = lib;
  } else {
    global.GymLib = lib;
  }
})(globalThis);
