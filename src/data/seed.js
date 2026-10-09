// Datos de ejemplo ficticios: modo demo (en memoria) y botón "Cargar plantilla de ejemplo".
// No contienen credenciales de ningún tipo.
import { DEFAULT_RATINGS, emptyAbp } from './constants';

const squad = [
  ['POR', 1, 'Unai Etxeberria', 24],
  ['POR', 13, 'Jon Arrieta', 21],
  ['DEF', 2, 'Ander Goikoetxea', 23],
  ['DEF', 3, 'Mikel Zubiaurre', 25],
  ['DEF', 4, 'Iñigo Larrinaga', 27],
  ['DEF', 5, 'Asier Olabarria', 22],
  ['DEF', 15, 'Gorka Ibarra', 20],
  ['DEF', 22, 'Xabier Agirre', 26],
  ['CEN', 6, 'Oier Mendizabal', 24],
  ['CEN', 8, 'Beñat Uriarte', 23],
  ['CEN', 10, 'Julen Etxebarria', 21],
  ['CEN', 14, 'Aitor Lekue', 28],
  ['CEN', 16, 'Ibai Garitano', 19],
  ['CEN', 18, 'Peio Arana', 22],
  ['DEL', 7, 'Iker Bilbao', 23],
  ['DEL', 9, 'Ekain Urrutia', 25],
  ['DEL', 11, 'Markel Sarasola', 20],
  ['DEL', 19, 'Eneko Azpeitia', 22],
];

export const seedPlayers = squad.map(([position, dorsal, name, age], i) => ({
  id: `demo-p${i + 1}`,
  name,
  position,
  dorsal,
  age,
  birthDate: null,
  height: 170 + ((i * 7) % 22),
  weight: 65 + ((i * 5) % 20),
  fitness: 75 + ((i * 3) % 23),
  photoUrl: '',
  teamId: 'demo-t1',
  videoUrl: '',
  descripcion: '',
  conBalon: { ...DEFAULT_RATINGS[position].conBalon },
  sinBalon: { ...DEFAULT_RATINGS[position].sinBalon },
  condicional: { ...DEFAULT_RATINGS[position].condicional },
}));

export const seedTeams = [
  { id: 'demo-t1', name: 'Mi Equipo', shieldUrl: '' },
  { id: 'demo-t2', name: 'CD Rival Norte', shieldUrl: '' },
  { id: 'demo-t3', name: 'UD Costa', shieldUrl: '' },
];

const baseMatch = {
  homeShieldUrl: '',
  awayShieldUrl: '',
  score: '',
  rivalButtons: {},
  rivalNotes: '',
  rivalSlideUrl: '',
  rivalVideoUrl: '',
  rivalExtraUrl: '',
  formation: '4-3-3',
  rivalFormation: '4-4-2',
  lineup: {},
  phases: {},
  abpData: emptyAbp(),
  videoUrl: '',
  halfTimes: {},
};

export const seedMatches = [
  {
    ...baseMatch,
    id: 'demo-m1',
    homeTeamId: 'demo-t1',
    awayTeamId: 'demo-t2',
    homeTeam: 'Mi Equipo',
    awayTeam: 'CD Rival Norte',
    opponent: 'CD Rival Norte',
    date: '2026-10-18',
    competition: 'Liga',
    venue: 'Campo Municipal',
    status: 'Planificado',
    referee: {
      name: 'Árbitro Ejemplo',
      style: 'Permisivo, dialoga con jugadores',
      tendencies: ['Tolera contacto leve', 'Añade poco tiempo extra'],
    },
    rivalButtons: { salida: 'En corto', presion: 'Alta', bloque: 'Medio' },
    rivalNotes: 'Equipo valiente con balón. Sufren a la espalda de los laterales.',
    lineup: {
      GK: 'demo-p1', RB: 'demo-p3', CB1: 'demo-p4', CB2: 'demo-p5', LB: 'demo-p6',
      RM: 'demo-p9', CM: 'demo-p10', LM: 'demo-p11', RW: 'demo-p15', ST: 'demo-p16', LW: 'demo-p17',
    },
  },
  {
    ...baseMatch,
    id: 'demo-m2',
    homeTeamId: 'demo-t3',
    awayTeamId: 'demo-t1',
    homeTeam: 'UD Costa',
    awayTeam: 'Mi Equipo',
    opponent: 'UD Costa',
    date: '2026-10-25',
    competition: 'Liga',
    venue: 'Estadio de la Costa',
    status: 'Planificado',
    referee: {},
  },
];

export const seedEvents = [
  { id: 'demo-e1', matchId: 'demo-m1', type: 'ocasion', minute: 8, videoTime: 480, note: 'Recuperación alta y disparo', playerId: 'demo-p15', playerName: 'Iker Bilbao', fieldX: 70, fieldY: 20 },
  { id: 'demo-e2', matchId: 'demo-m1', type: 'gol', minute: 29, videoTime: 1740, note: 'Remate tras centro desde la derecha', playerId: 'demo-p16', playerName: 'Ekain Urrutia', fieldX: 52, fieldY: 10 },
  { id: 'demo-e3', matchId: 'demo-m1', type: 'duelo', minute: 52, videoTime: 3300, note: 'Duelo aéreo ganado', playerId: 'demo-p4', playerName: 'Mikel Zubiaurre', fieldX: 45, fieldY: 80 },
];
