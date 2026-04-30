const STORAGE_KEY = 'anubhuti-site-state';
const VISITOR_ID_KEY = 'anubhuti-visitor-id';

const todayIso = () => new Date().toISOString().slice(0, 10);
const tomorrowIso = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
};
const addDays = (isoDate, days) => {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const dateLabel = (isoDate) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(`${isoDate}T00:00:00`),
  );
const relativeDays = (isoDate) => {
  const current = new Date(`${todayIso()}T00:00:00`).getTime();
  const target = new Date(`${isoDate}T00:00:00`).getTime();
  return Math.ceil((target - current) / 86400000);
};
const safeId = (prefix) => {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return `${prefix}-${window.crypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}-${Math.random().toString(16).slice(2, 10)}`;
};
const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

/* truncated: rest of app.js copied from project root */
