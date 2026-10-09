export const POSITIONS = [
  { id: 'POR', label: 'Porteros' },
  { id: 'DEF', label: 'Defensas' },
  { id: 'CEN', label: 'Centrocampistas' },
  { id: 'DEL', label: 'Delanteros' },
];

export const RATING_GROUPS = [
  {
    key: 'conBalon',
    label: 'Con balón',
    color: '#c8102e',
    fields: [
      ['paseCorto', 'Pase corto'],
      ['regate', 'Regate'],
      ['control', 'Control'],
      ['visionJuego', 'Visión de juego'],
      ['disparo', 'Disparo'],
    ],
  },
  {
    key: 'sinBalon',
    label: 'Sin balón',
    color: '#2563eb',
    fields: [
      ['presion', 'Presión'],
      ['anticipacion', 'Anticipación'],
      ['marcaje', 'Marcaje'],
      ['posicionamiento', 'Posicionamiento'],
      ['recuperacion', 'Recuperación'],
    ],
  },
  {
    key: 'condicional',
    label: 'Condicional',
    color: '#16a34a',
    fields: [
      ['velocidad', 'Velocidad'],
      ['resistencia', 'Resistencia'],
      ['fuerza', 'Fuerza'],
      ['salto', 'Salto'],
      ['agilidad', 'Agilidad'],
    ],
  },
];

export const DEFAULT_RATINGS = {
  POR: {
    conBalon: { paseCorto: 60, regate: 25, control: 55, visionJuego: 65, disparo: 30 },
    sinBalon: { presion: 45, anticipacion: 80, marcaje: 55, posicionamiento: 85, recuperacion: 50 },
    condicional: { velocidad: 55, resistencia: 60, fuerza: 70, salto: 85, agilidad: 80 },
  },
  DEF: {
    conBalon: { paseCorto: 68, regate: 48, control: 64, visionJuego: 64, disparo: 48 },
    sinBalon: { presion: 74, anticipacion: 78, marcaje: 80, posicionamiento: 80, recuperacion: 75 },
    condicional: { velocidad: 70, resistencia: 75, fuerza: 80, salto: 78, agilidad: 68 },
  },
  CEN: {
    conBalon: { paseCorto: 78, regate: 72, control: 78, visionJuego: 80, disparo: 68 },
    sinBalon: { presion: 75, anticipacion: 75, marcaje: 64, posicionamiento: 78, recuperacion: 75 },
    condicional: { velocidad: 72, resistencia: 85, fuerza: 68, salto: 65, agilidad: 78 },
  },
  DEL: {
    conBalon: { paseCorto: 68, regate: 74, control: 76, visionJuego: 70, disparo: 85 },
    sinBalon: { presion: 78, anticipacion: 76, marcaje: 50, posicionamiento: 80, recuperacion: 64 },
    condicional: { velocidad: 84, resistencia: 74, fuerza: 72, salto: 74, agilidad: 82 },
  },
};

export const RIVAL_GROUPS = [
  { key: 'salida', label: 'Salida de balón', options: ['En corto', 'En largo', 'Mixto'] },
  { key: 'presion', label: 'Presión', options: ['Alta', 'Media', 'Baja'] },
  { key: 'bloque', label: 'Bloque', options: ['Alto', 'Medio', 'Bajo'] },
  { key: 'lineaDefensiva', label: 'Línea defensiva', options: ['Alta', 'Media', 'Baja'] },
  { key: 'transOfensiva', label: 'Transición ofensiva', options: ['Directa', 'Posesión'] },
  { key: 'transDefensiva', label: 'Transición defensiva', options: ['Presión inmediata', 'Repliegue'] },
];

export const PHASES = [
  { key: 'ataque', label: 'Ataque' },
  { key: 'defensa', label: 'Defensa' },
  { key: 'transiciones', label: 'Transiciones' },
];

export const EVENT_TYPES = [
  { id: 'gol', label: 'Gol', color: '#16a34a', emoji: '⚽' },
  { id: 'ocasion', label: 'Ocasión', color: '#f59e0b', emoji: '🎯' },
  { id: 'duelo', label: 'Duelo', color: '#2563eb', emoji: '⚔️' },
  { id: 'nota', label: 'Nota', color: '#64748b', emoji: '📝' },
];

export const MATCH_STATUSES = ['Planificado', 'Jugado', 'Aplazado'];

export const emptyAbpCard = () => ({
  img1: '', img1Notes: '', img1VideoUrl: '',
  img2: '', img2Notes: '', img2VideoUrl: '',
});

export const emptyAbp = () => ({
  ofensivo: {
    corners: Array.from({ length: 4 }, emptyAbpCard),
    faltasLaterales: Array.from({ length: 2 }, emptyAbpCard),
  },
  defensivo: {
    corner: emptyAbpCard(),
    faltaLateral: emptyAbpCard(),
    faltaFrontal: emptyAbpCard(),
  },
});

// Rellena huecos para que partidos antiguos o incompletos no rompan la UI
export const normalizeAbp = (abp = {}) => {
  const base = emptyAbp();
  const fill = (card) => ({ ...emptyAbpCard(), ...(card || {}) });
  return {
    ofensivo: {
      corners: base.ofensivo.corners.map((_, i) => fill(abp.ofensivo?.corners?.[i])),
      faltasLaterales: base.ofensivo.faltasLaterales.map((_, i) => fill(abp.ofensivo?.faltasLaterales?.[i])),
    },
    defensivo: {
      corner: fill(abp.defensivo?.corner),
      faltaLateral: fill(abp.defensivo?.faltaLateral),
      faltaFrontal: fill(abp.defensivo?.faltaFrontal),
    },
  };
};
