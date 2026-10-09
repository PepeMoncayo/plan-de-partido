// "m:ss" | "h:mm:ss" → segundos
export function parseClock(str) {
  if (str === null || str === undefined || str === '') return null;
  if (typeof str === 'number') return str;
  const parts = String(str).trim().split(':').map(Number);
  if (parts.some(Number.isNaN)) return null;
  return parts.reduce((acc, n) => acc * 60 + n, 0);
}

export function formatClock(seconds) {
  if (seconds === null || seconds === undefined || Number.isNaN(seconds)) return '';
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}

// Minuto de partido a partir del tiempo de vídeo y los inicios de cada parte
export function matchMinute(videoTime, halfTimes = {}) {
  const start1 = parseClock(halfTimes.start1);
  const start2 = parseClock(halfTimes.start2);
  if (start2 !== null && videoTime >= start2) {
    return 45 + Math.floor((videoTime - start2) / 60) + 1;
  }
  if (start1 !== null && videoTime >= start1) {
    return Math.floor((videoTime - start1) / 60) + 1;
  }
  return Math.floor(videoTime / 60) + 1;
}

export const formatDate = (iso) =>
  iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }) : '';
