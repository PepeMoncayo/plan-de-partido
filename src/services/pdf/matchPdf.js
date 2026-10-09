import { RIVAL_GROUPS, PHASES, EVENT_TYPES, normalizeAbp } from '../../data/constants';
import { FORMATIONS } from '../../data/formations';
import { newDoc, header, footer, sectionTitle, paragraph, loadImage, drawImageFit, drawPitch, hexToRgb, PAGE, BRAND, MUTED, DARK } from './common';
import { formatClock, formatDate } from '../../utils/time';
import { slug } from '../../utils/download';

const W = PAGE.w - PAGE.m * 2;

async function coverPage(doc, match) {
  const title = `${match.homeTeam} vs ${match.awayTeam}`;
  header(doc, 'Informe de partido', [match.competition, formatDate(match.date), match.venue].filter(Boolean).join(' · '));

  const [home, away] = await Promise.all([loadImage(match.homeShieldUrl), loadImage(match.awayShieldUrl)]);
  drawImageFit(doc, home, PAGE.w / 2 - 70, 24, 30, 30);
  drawImageFit(doc, away, PAGE.w / 2 + 40, 24, 30, 30);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(title, PAGE.w / 2, 62, { align: 'center' });
  if (match.score) {
    doc.setFontSize(14);
    doc.text(match.score, PAGE.w / 2, 70, { align: 'center' });
  }
  doc.setFont('helvetica', 'normal');

  sectionTitle(doc, `Informe rival · ${match.opponent || match.awayTeam}`, PAGE.m, 82);
  const buttons = match.rivalButtons || {};
  RIVAL_GROUPS.forEach((g, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = PAGE.m + col * (W / 3);
    const y = 92 + row * 14;
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(g.label.toUpperCase(), x, y);
    doc.setFontSize(11);
    doc.setTextColor(...(buttons[g.key] ? BRAND : MUTED));
    doc.text(buttons[g.key] || '—', x, y + 6);
  });
  doc.setTextColor(...DARK);

  let y = 126;
  if (match.rivalNotes) {
    sectionTitle(doc, 'Notas', PAGE.m, y);
    y = paragraph(doc, match.rivalNotes, PAGE.m, y + 6, W, { size: 10, maxLines: 10 });
  }
  const links = [
    ['Presentación', match.rivalSlideUrl],
    ['Vídeo', match.rivalVideoUrl],
    ['Enlace', match.rivalExtraUrl],
  ].filter(([, v]) => v);
  if (links.length) {
    doc.setFontSize(8);
    links.forEach(([k, v], i) => {
      doc.setTextColor(...MUTED);
      doc.text(`${k}:`, PAGE.m, y + 6 + i * 5);
      doc.setTextColor(37, 99, 235);
      doc.textWithLink(v.slice(0, 120), PAGE.m + 22, y + 6 + i * 5, { url: v });
    });
    doc.setTextColor(...DARK);
  }

  const ref = match.referee || {};
  if (ref.name) {
    sectionTitle(doc, 'Árbitro', PAGE.m, 178);
    paragraph(doc, [ref.name, ref.style, (ref.tendencies || []).join(' · ')].filter(Boolean).join(' — '), PAGE.m, 184, W, { maxLines: 3 });
  }
}

async function planPage(doc, match) {
  doc.addPage();
  header(doc, 'Plan de partido', `${match.homeTeam} vs ${match.awayTeam}`);
  const colW = W / 3 - 4;
  for (const [i, { key, label }] of PHASES.entries()) {
    const ph = match.phases?.[key] || {};
    const x = PAGE.m + i * (colW + 6);
    sectionTitle(doc, label, x, 28);
    const imgs = await Promise.all([loadImage(ph.img1), loadImage(ph.img2)]);
    drawImageFit(doc, imgs[0], x, 32, colW, 48);
    drawImageFit(doc, imgs[1], x, 84, colW, 48);
    paragraph(doc, ph.notes, x, 140, colW, { maxLines: 14 });
  }
}

function lineupPage(doc, match, players) {
  doc.addPage();
  header(doc, 'Alineación', `${match.formation || '4-3-3'}${match.rivalFormation ? ` vs ${match.rivalFormation}` : ''}`);
  const spots = FORMATIONS[match.formation] || FORMATIONS['4-3-3'];
  const byId = Object.fromEntries(players.map((p) => [p.id, p]));
  const lineup = match.lineup || {};
  const ph = 175;
  const pw = (ph * 68) / 105;
  const px = PAGE.m;
  const py = 24;
  drawPitch(doc, px, py, pw, ph);

  spots.forEach((s) => {
    const p = byId[lineup[s.id]];
    const cx = px + (s.x / 100) * pw;
    const cy = py + (s.y / 100) * ph;
    doc.setFillColor(...(p ? BRAND : [255, 255, 255]));
    doc.circle(cx, cy, 4, 'F');
    doc.setFontSize(7);
    doc.setTextColor(...(p ? [255, 255, 255] : MUTED));
    doc.text(p?.dorsal ? String(p.dorsal) : s.label, cx, cy + 1, { align: 'center' });
    if (p) {
      doc.setTextColor(255, 255, 255);
      doc.text(p.name.split(' ').slice(-1)[0], cx, cy + 8, { align: 'center' });
    }
  });
  doc.setTextColor(...DARK);

  const used = new Set(Object.values(lineup));
  const starters = spots.map((s) => byId[lineup[s.id]]).filter(Boolean);
  const bench = players.filter((p) => !used.has(p.id));
  const x = px + pw + 12;
  sectionTitle(doc, 'Titulares', x, 30);
  doc.setFontSize(10);
  starters.forEach((p, i) => doc.text(`${p.dorsal ?? '–'}  ${p.name}  (${p.position})`, x, 38 + i * 6));
  sectionTitle(doc, 'Suplentes', x + 90, 30);
  bench.slice(0, 22).forEach((p, i) => doc.text(`${p.dorsal ?? '–'}  ${p.name}  (${p.position})`, x + 90, 38 + i * 6));
}

async function abpPages(doc, match) {
  const abp = normalizeAbp(match.abpData || {});
  const sections = [
    {
      title: 'ABP ofensivo',
      cards: [
        ...abp.ofensivo.corners.map((c, i) => [`Córner ${i + 1}`, c]),
        ...abp.ofensivo.faltasLaterales.map((c, i) => [`Falta lateral ${i + 1}`, c]),
      ],
    },
    {
      title: 'ABP defensivo',
      cards: [
        ['Córner', abp.defensivo.corner],
        ['Falta lateral', abp.defensivo.faltaLateral],
        ['Falta frontal', abp.defensivo.faltaFrontal],
      ],
    },
  ];
  const hasContent = (c) => c.img1 || c.img2 || c.img1Notes || c.img2Notes;

  for (const sec of sections) {
    const cards = sec.cards.filter(([, c]) => hasContent(c));
    if (!cards.length) continue;
    // 3 tarjetas por página, cada una con sus 2 imágenes
    for (let i = 0; i < cards.length; i += 3) {
      doc.addPage();
      header(doc, sec.title, `${match.homeTeam} vs ${match.awayTeam}`);
      const colW = W / 3 - 4;
      for (const [j, [title, c]] of cards.slice(i, i + 3).entries()) {
        const x = PAGE.m + j * (colW + 6);
        sectionTitle(doc, title, x, 28);
        const imgs = await Promise.all([loadImage(c.img1), loadImage(c.img2)]);
        drawImageFit(doc, imgs[0], x, 32, colW, 45);
        let y = paragraph(doc, c.img1Notes, x, 82, colW, { size: 8, maxLines: 5 });
        drawImageFit(doc, imgs[1], x, Math.max(y + 2, 104), colW, 45);
        paragraph(doc, c.img2Notes, x, Math.max(y + 2, 104) + 50, colW, { size: 8, maxLines: 5 });
      }
    }
  }
}

function eventsPage(doc, match, events) {
  if (!events.length) return;
  doc.addPage();
  header(doc, 'Eventos', `${events.length} eventos`);

  // Resumen por tipo
  sectionTitle(doc, 'Por tipo', PAGE.m, 28);
  EVENT_TYPES.forEach((t, i) => {
    const n = events.filter((e) => e.type === t.id).length;
    doc.setFillColor(...hexToRgb(t.color));
    doc.rect(PAGE.m + i * 40, 32, 4, 4, 'F');
    doc.setFontSize(10);
    doc.text(`${t.label}: ${n}`, PAGE.m + 6 + i * 40, 35.5);
  });

  // Por jugador
  const byPlayer = {};
  events.forEach((e) => e.playerName && (byPlayer[e.playerName] = (byPlayer[e.playerName] || 0) + 1));
  const top = Object.entries(byPlayer).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (top.length) {
    sectionTitle(doc, 'Por jugador', PAGE.m + 175, 28);
    doc.setFontSize(9);
    top.forEach(([name, n], i) => doc.text(`${name}: ${n}`, PAGE.m + 175 + (i % 2) * 50, 35 + Math.floor(i / 2) * 5));
  }

  // Tabla
  let y = 60;
  const cols = [
    ['Min', 14],
    ['Vídeo', 20],
    ['Tipo', 22],
    ['Jugador', 50],
    ['Nota', W - 106],
  ];
  const drawHead = () => {
    doc.setFillColor(241, 245, 249);
    doc.rect(PAGE.m, y - 5, W, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    let x = PAGE.m + 1;
    cols.forEach(([h, w]) => {
      doc.text(h, x, y);
      x += w;
    });
    doc.setFont('helvetica', 'normal');
    y += 7;
  };
  drawHead();
  events.forEach((e) => {
    const note = doc.splitTextToSize(e.note || '', cols[4][1] - 2).slice(0, 2);
    if (y + note.length * 4 > PAGE.h - 12) {
      doc.addPage();
      header(doc, 'Eventos (cont.)');
      y = 28;
      drawHead();
    }
    const t = EVENT_TYPES.find((x) => x.id === e.type);
    let x = PAGE.m + 1;
    doc.setFontSize(9);
    [e.minute != null ? `${e.minute}'` : '—', formatClock(e.videoTime), t?.label || e.type, e.playerName || '—'].forEach((v, i) => {
      if (i === 2 && t) doc.setTextColor(...hexToRgb(t.color));
      doc.text(String(v), x, y);
      doc.setTextColor(...DARK);
      x += cols[i][1];
    });
    doc.text(note, x, y);
    y += Math.max(1, note.length) * 4 + 2;
  });
}

export async function generateMatchPDF({ match, players, events }) {
  const doc = newDoc();
  await coverPage(doc, match);
  await planPage(doc, match);
  lineupPage(doc, match, players);
  await abpPages(doc, match);
  eventsPage(doc, match, [...events].sort((a, b) => (a.videoTime ?? 0) - (b.videoTime ?? 0)));
  footer(doc);
  doc.save(`partido-${slug(`${match.homeTeam}-${match.awayTeam}-${match.date || ''}`)}.pdf`);
}
