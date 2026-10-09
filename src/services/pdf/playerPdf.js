import { RATING_GROUPS, POSITIONS } from '../../data/constants';
import { newDoc, header, footer, sectionTitle, paragraph, loadImage, drawImageFit, drawRadar, hexToRgb, PAGE, MUTED, DARK } from './common';
import { slug } from '../../utils/download';

export async function generatePlayerPDF(player) {
  const doc = newDoc();
  header(doc, player.name, POSITIONS.find((p) => p.id === player.position)?.label || '');

  const photo = await loadImage(player.photoUrl);
  if (photo) drawImageFit(doc, photo, PAGE.m, 26, 50, 60);
  else {
    doc.setDrawColor(...MUTED);
    doc.rect(PAGE.m, 26, 50, 60);
  }

  const x = PAGE.m + 58;
  sectionTitle(doc, 'Datos', x, 30);
  doc.setFontSize(10);
  const rows = [
    ['Dorsal', player.dorsal],
    ['Edad', player.age],
    ['Nacimiento', player.birthDate],
    ['Altura', player.height && `${player.height} cm`],
    ['Peso', player.weight && `${player.weight} kg`],
  ];
  rows.forEach(([k, v], i) => {
    doc.setTextColor(...MUTED);
    doc.text(k, x, 38 + i * 6);
    doc.setTextColor(...DARK);
    doc.text(String(v ?? '—'), x + 28, 38 + i * 6);
  });

  sectionTitle(doc, 'Estado de forma', x + 80, 30);
  const fit = player.fitness ?? 0;
  doc.setFillColor(226, 232, 240);
  doc.rect(x + 80, 34, 100, 5, 'F');
  doc.setFillColor(...(fit >= 85 ? [22, 163, 74] : fit >= 70 ? [245, 158, 11] : [220, 38, 38]));
  doc.rect(x + 80, 34, fit, 5, 'F');
  doc.setFontSize(10);
  doc.text(`${fit}%`, x + 184, 38);

  if (player.descripcion) {
    sectionTitle(doc, 'Descripción', x + 80, 50);
    paragraph(doc, player.descripcion, x + 80, 56, 130, { maxLines: 7 });
  }

  // Radares + barras
  const top = 100;
  RATING_GROUPS.forEach((g, gi) => {
    const cx = PAGE.m + 45 + gi * 92;
    const values = g.fields.map(([k]) => player[g.key]?.[k] ?? 0);
    sectionTitle(doc, g.label, cx - 40, top);
    drawRadar(doc, cx, top + 30, 20, values, g.fields.map(([, l]) => l.split(' ')[0]), hexToRgb(g.color));
    g.fields.forEach(([, label], i) => {
      const y = top + 64 + i * 6.5;
      doc.setFontSize(8);
      doc.text(label, cx - 40, y);
      doc.setFillColor(226, 232, 240);
      doc.rect(cx - 6, y - 3, 40, 3.5, 'F');
      doc.setFillColor(...hexToRgb(g.color));
      doc.rect(cx - 6, y - 3, (40 * values[i]) / 100, 3.5, 'F');
      doc.text(String(values[i]), cx + 37, y);
    });
  });

  footer(doc);
  doc.save(`jugador-${slug(player.name)}.pdf`);
}
