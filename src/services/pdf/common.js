import { jsPDF } from 'jspdf';
import { imageToDataUrl } from '../storage';

export const BRAND = [200, 16, 46];
export const DARK = [30, 41, 59];
export const MUTED = [100, 116, 139];
export const PAGE = { w: 297, h: 210, m: 12 }; // A4 horizontal (mm)

export function newDoc() {
  return new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
}

export function header(doc, title, subtitle = '') {
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, PAGE.w, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(title, PAGE.m, 12);
  if (subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(subtitle, PAGE.w - PAGE.m, 12, { align: 'right' });
  }
  doc.setTextColor(...DARK);
}

export function footer(doc) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`Plan de Partido · ${new Date().toLocaleDateString('es-ES')}`, PAGE.m, PAGE.h - 5);
    doc.text(`${i} / ${n}`, PAGE.w - PAGE.m, PAGE.h - 5, { align: 'right' });
  }
}

export function sectionTitle(doc, text, x, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...BRAND);
  doc.text(text, x, y);
  doc.setTextColor(...DARK);
  doc.setFont('helvetica', 'normal');
}

// Texto con salto de línea; devuelve la y final
export function paragraph(doc, text, x, y, width, { size = 9, maxLines = 40 } = {}) {
  if (!text) return y;
  doc.setFontSize(size);
  const lines = doc.splitTextToSize(String(text), width).slice(0, maxLines);
  doc.text(lines, x, y);
  return y + lines.length * size * 0.42 + 1;
}

export async function loadImage(ref) {
  const dataUrl = await imageToDataUrl(ref);
  if (!dataUrl) return null;
  const size = await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => resolve(null);
    img.src = dataUrl;
  });
  if (!size) return null;
  const format = dataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
  return { dataUrl, format, ...size };
}

// Dibuja una imagen encajada (contain) en la caja
export function drawImageFit(doc, img, x, y, w, h) {
  if (!img) return;
  const ratio = Math.min(w / img.w, h / img.h);
  const dw = img.w * ratio;
  const dh = img.h * ratio;
  try {
    doc.addImage(img.dataUrl, img.format, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  } catch {
    /* formato no soportado por jsPDF (p. ej. SVG/WebP) */
  }
}

export function drawPitch(doc, x, y, w, h) {
  doc.setFillColor(30, 92, 30);
  doc.rect(x, y, w, h, 'F');
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.3);
  const sx = w / 68;
  const sy = h / 105;
  const R = (rx, ry, rw, rh) => doc.rect(x + rx * sx, y + ry * sy, rw * sx, rh * sy);
  R(2, 3, 64, 99);
  doc.line(x + 2 * sx, y + 52.5 * sy, x + 66 * sx, y + 52.5 * sy);
  doc.circle(x + 34 * sx, y + 52.5 * sy, 9.15 * sx);
  R(13.84, 3, 40.32, 16.5);
  R(24.84, 3, 18.32, 5.5);
  R(13.84, 85.5, 40.32, 16.5);
  R(24.84, 96.5, 18.32, 5.5);
}

export function drawRadar(doc, cx, cy, r, values, labels, color) {
  const n = labels.length;
  const angle = (i) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i, f) => [cx + Math.cos(angle(i)) * r * f, cy + Math.sin(angle(i)) * r * f];
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  [0.25, 0.5, 0.75, 1].forEach((f) => {
    for (let i = 0; i < n; i++) doc.line(...pt(i, f), ...pt((i + 1) % n, f));
  });
  for (let i = 0; i < n; i++) doc.line(cx, cy, ...pt(i, 1));
  doc.setDrawColor(...color);
  doc.setLineWidth(0.6);
  for (let i = 0; i < n; i++) doc.line(...pt(i, (values[i] || 0) / 100), ...pt((i + 1) % n, (values[(i + 1) % n] || 0) / 100));
  doc.setFontSize(7);
  doc.setTextColor(...MUTED);
  for (let i = 0; i < n; i++) {
    const [lx, ly] = pt(i, 1.22);
    doc.text(`${labels[i]} ${values[i] ?? 0}`, lx, ly, { align: 'center' });
  }
  doc.setTextColor(...DARK);
}

export const hexToRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
