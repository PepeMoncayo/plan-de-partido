// Proveedor de IA simulado: respuestas de plantilla con una espera artificial.
// No llama a ningún modelo. Misma forma de respuesta que tendrá un proveedor real.

const pick = (list, n = 3) => {
  const shuffled = [...list].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, n);
};

const wait = (ms = 900) => new Promise((r) => setTimeout(r, ms));

/* ─── Análisis de matchup táctico (mi formación vs rival) ─────── */
const analyzeMatchup = async ({ myFormation, rivalFormation }) => {
  await wait();

  const strengthsByMatchup = {
    '4-3-3_vs_4-4-2': [
      'Superioridad numérica en mediocampo con tres centrocampistas',
      'Extremos en 1v1 ante laterales sin cobertura interior',
      'Presión alta organizada sobre los dos mediocampistas rivales',
    ],
    '4-3-3_vs_4-2-3-1': [
      'MC central puede llegar entre líneas ante doble pivote rival',
      'Extremos generan amplitud que desequilibra la línea de 4',
      'Transiciones rápidas aprovechan el espacio entre pivotes y mediapuntas',
    ],
    '4-3-3_vs_5-3-2': [
      'Amplitud máxima con extremos sobre los carrileros rivales',
      'El mediocampo en triángulo crea superioridad frente al triple central',
      'Centros desde banda al área cuando los 5 defensas se juntan',
    ],
    '4-4-2_vs_4-3-3': [
      'Doble pivote cubre bien los espacios que dejan los extremos altos',
      'Dupla delantera presiona a los centrales rivales constantemente',
      'Continuidad de bandas con MC laterales que apoyan a los extremos',
    ],
    '4-2-3-1_vs_4-3-3': [
      'Doble pivote anula el mediocampista central rival',
      'Mediapunta libre entre líneas dificulta la defensa en bloque',
      'Punta de referencia fija a los dos centrales rivales',
    ],
    '5-3-2_vs_4-3-3': [
      'Carrileros atacan el espacio a la espalda de los extremos rivales',
      'Triple central absorbe los duelos aéreos y los envíos largos',
      'Contraataque potente con dos delanteros y tres MC que proyectan',
    ],
  };

  const weaknessesByRival = {
    '4-4-2': [
      'El espacio entre líneas es amplio y explotable para la mediapunta',
      'Los dos MCs tienen mucho terreno que cubrir en transiciones',
      'Laterales suben mucho y dejan espacio a la espalda',
    ],
    '4-3-3': [
      'Extremos sin balón dejan a sus laterales expuestos a repliegues tardíos',
      'El espacio entre el pivote y los centrales es vulnerable a pases filtrados',
      'Al perder el balón tardan en estructurarse defensivamente',
    ],
    '4-2-3-1': [
      'El mediapunta a veces crea desorden defensivo en repliegue',
      'Los pivotes tienen que cubrir mucho espacio si los laterales salen',
      'Centros laterales peligrosos pero sin segundo palo cubierto',
    ],
    '5-3-2': [
      'Solo dos delanteros pero el equipo ocupa poco espacio ofensivo',
      'MC central puede quedar aislado si los extremos del rival no bajan',
      'Poco juego de posesión, vulnerable a la presión en salida',
    ],
  };

  const recommendations = pick([
    `Aprovechar la superioridad generada por el ${myFormation} frente al ${rivalFormation}`,
    'Presión alta dirigida al carril donde el rival tiene menos cobertura',
    'Cambios de orientación rápidos para aislar al lateral menos dinámico',
    'Atacar el segundo palo en centros desde la banda más débil',
    'Transiciones rápidas en vertical tras recuperar el balón en campo propio',
    'Controlar el ritmo en los primeros 15 minutos para imponer el juego',
    'Liberar al extremo opuesto para llegadas al área sin marca',
    'Forzar la salida del portero con presión organizada sobre el central más lento',
    'Aprovechar la segunda jugada en ABP con llegadas de segunda línea',
  ], 4);

  const key = `${myFormation}_vs_${rivalFormation}`;
  const strengths = strengthsByMatchup[key] ?? pick([
    'Superioridad en la zona de máxima densidad rival',
    'Transiciones rápidas aprovechando su estructura ofensiva',
    'Amplitud con extremos que desorganiza su bloque defensivo',
    'Presión alta coordinada sobre el portero y centrales',
  ]);

  const weaknesses = weaknessesByRival[rivalFormation] ?? pick([
    'Lateral más lento en repliegue cuando sube',
    'Espacio entre líneas explotable con pases filtrados',
    'Desorganización defensiva tras pérdida en mediocampo',
    'Poca densidad en el carril central al defender centros',
  ]);

  return { strengths, weaknesses, recommendations, meta: { myFormation, rivalFormation } };
};

/* ─── Análisis de rol de jugador por posición y sistema ──────────── */
const analyzePlayerPosition = async ({ playerName, positionLabel, formation, rivalFormation }) => {
  await wait();

  const withBallByLabel = {
    POR: [
      'Iniciar la jugada con pase corto seguro al defensa más libre',
      'Utilizar el pase largo para superar la presión rival y llegar al espacio',
      'Participar activamente en la construcción saliendo al borde del área',
      'Dirigir el juego posicional siendo el eje de la salida de balón',
    ],
    DEF: [
      'Progresar con el balón conducido cuando el espacio lo permite',
      'Distribuir con criterio: corto al centrocampista o largo directo al delantero',
      'Desdoblar en profundidad por la banda para crear superioridad',
      'Combinar en pared con el extremo para llegar a la línea de fondo',
      'Incorporarse al mediocampo como apoyo cuando el equipo tiene el balón',
      'Cambiar el juego con pase interior cuando el carril está cerrado',
    ],
    CEN: [
      'Recibir entre líneas de espaldas y girar para atacar el espacio',
      'Conectar defensa y ataque con pases de progresión rápidos',
      'Llegar desde segunda línea al área en los centros desde la banda',
      'Buscar la recepción entre líneas de cara para encarar al defensor',
      'Asociarse en paredes y triángulos con los delanteros en campo rival',
      'Distribuir rápido al primer toque para no perder la ventaja posicional',
    ],
    DEL: [
      'Fijar a los defensas rivales para habilitar el juego de los centrocampistas',
      'Aprovechar la espalda de la defensa con el arranque en el momento del pase',
      'Encarar al defensor en 1v1 para generar el centro o el disparo',
      'Referenciar el juego aéreo en los centros y bajar el balón para los que llegan',
      'Asociarse en paredes con el centrocampista para llegar al disparo',
    ],
  };

  const withoutBallByLabel = {
    POR: [
      `Comandar el área y organizar la línea defensiva en el sistema ${formation}`,
      'Actuar como sweeper detrás de la línea cuando esta sube',
      'Cerrar rápido los ángulos en las finalizaciones 1v1',
      'Comunicar constantemente la posición de los delanteros al defensa central',
    ],
    DEF: [
      'Mantener la línea defensiva compacta sin adelantarse en exceso',
      'Replegar rápido cuando el equipo pierde el balón en ataque',
      'Cubrir el espacio interior cuando el compañero sale a presionar',
      `Defender en 1v1 al extremo rival dentro del ${formation}`,
      'Ganar los duelos aéreos en el área propia con agresividad y anticipación',
    ],
    CEN: [
      'Cubrir el espacio entre líneas bloqueando la recepción del mediapunta rival',
      'Acudir rápido al balón en la segunda jugada tras los despejes del defensa',
      'Bajar a acompañar la construcción cuando el equipo necesita un apoyo extra',
      `Participar en la presión organizada del bloque medio en el ${formation}`,
      'Cerrar las líneas de pase al pivote rival en el mediocampo',
    ],
    DEL: [
      `Iniciar el pressing desde arriba en el sistema ${formation} en cuanto el portero rival tenga el balón`,
      'Presionar al defensa más cercano para forzar el pase largo',
      'Replegar al espacio cuando el rival supera la primera presión',
      'Bloquear la salida del lateral para canalizar el juego rival al centro',
    ],
  };

  const keyDuelsByLabel = {
    POR: ['Duelos aéreos en el área al defender córners y faltas laterales', 'Salidas 1v1 ante el delantero que rompe la línea'],
    DEF: ['Duelo aéreo con el delantero rival', '1v1 en velocidad ante el arranque del delantero a la espalda', 'Duelo de velocidad en profundidad cuando desdobla'],
    CEN: ['Disputa de la segunda jugada en el mediocampo', '1v1 con el centrocampista rival en el eje central', 'Mano a mano con el pivote rival en la zona de creación'],
    DEL: ['Duelo aéreo con el defensa rival en cada balón largo', '1v1 de espalda con el defensa para girar y encarar', '1v1 en velocidad con el lateral rival'],
  };

  const withBall = pick(withBallByLabel[positionLabel] ?? [
    'Apoyar la posesión ofreciendo siempre un apoyo seguro al portador',
    'Progresar cuando el espacio lo permita y circular si no existe profundidad',
    'Buscar la asociación con los compañeros para superar las líneas rivales',
  ], 3);

  const withoutBall = pick(withoutBallByLabel[positionLabel] ?? [
    `Mantener la estructura del ${formation} sin perder la referencia posicional`,
    'Presionar coordinado con el compañero más cercano al perder el balón',
    'Cerrar los espacios interiores antes que los exteriores en el repliegue',
  ], 3);

  const keyDuels = keyDuelsByLabel[positionLabel] ?? [
    'Duelo físico con el rival directo en tu zona',
    'Anticipación en la disputa de segundas jugadas',
  ];

  return { withBall, withoutBall, keyDuels, meta: { playerName, positionLabel, formation, rivalFormation } };
};

const analyzeOpponent = async ({ opponent, notes = '' }) => {
  await wait();
  return {
    strengths: pick([
      'Salida limpia con centrales muy abiertos',
      'Extremos encaran y generan 1v1 constantes',
      'Laterales profundos que centran temprano',
      'Bloque medio organizado, pocos espacios interiores',
      'Buen juego aéreo ofensivo en ABP',
    ]),
    weaknesses: pick([
      'Sufren a la espalda de laterales',
      'Portero arriesga en salida corta',
      'Poca densidad tras pérdida',
      'Central zurdo lento girando',
      'Desorden al defender centros laterales',
    ]),
    recommendations: pick([
      'Presión alta dirigida al central zurdo',
      'Cerrar líneas de pase interior y forzar juego exterior',
      'Atacar segundo palo con extremo opuesto',
      'Transitar rápido tras robo en campo rival',
      'Liberar al mediapunta entre líneas para recibir de cara',
    ], 4),
    basedOn: notes || 'Informe rápido',
  };
};

const generateMatchPlan = async ({ opponent, style }) => {
  await wait();
  return {
    offensive: pick([
      'Buscar triángulos en banda izquierda para progresar',
      'Cambios de orientación rápidos para aislar al extremo',
      'Llegadas de segunda línea del mediapunta',
      'Centros tensos al área chica buscando desajuste',
    ], 2),
    defensive: pick([
      'Bloque medio + presión tras pase atrás al portero',
      'Basculación agresiva cerrando carril central',
      'Salto del interior al pivote rival en conducción',
    ], 2),
    pressing: pick([
      'Gatillo: pase del central al lateral',
      'Gatillo: control orientado hacia banda',
      'Gatillo: devolución al portero',
    ], 1)[0],
    keys: pick([
      'Vigilar segunda jugada en ABP',
      'Evitar duelos aislados de centrales con su 9',
      'Minimizar faltas laterales',
      'Controlar ritmo los primeros 15 minutos',
    ], 3),
    meta: { opponent, style },
  };
};

const suggestLineup = async ({ squad }) => {
  await wait();
  const xi = squad.slice(0, 11);
  return {
    formation: '4-2-3-1',
    starters: xi,
    adjustments: pick([
      'Lateral derecho más bajo para balance',
      'Extremo opuesto atacando segundo palo',
      'Pivot diestro salta a presionar; izquierdo ancla',
      'Laterales alternan altura para no quedar expuestos',
    ], 3),
  };
};

const summarizeMatch = async ({ match }) => {
  await wait();
  return {
    summary: `Partido de ${match.opponent} marcado por ${pick([
      'transiciones rápidas',
      'duelos aéreos constantes',
      'alto ritmo en ambas áreas',
      'posesiones largas y paciencia',
    ], 1)[0]}.`,
    keyMoments: pick([
      'Gol tempranero que condiciona el plan rival',
      'Parada decisiva en el minuto 78',
      'VAR anula gol por fuera de juego',
      'Serie de tres córners consecutivos genera peligro',
    ], 3),
    performance: pick([
      'Equipo sólido sin balón, faltó eficacia arriba',
      'Gran nivel de la línea defensiva en duelos',
      'Centrocampistas dominaron la segunda jugada',
      'Falta de precisión en último pase',
    ], 2),
  };
};

export const mockProvider = {
  analyzeMatchup,
  analyzePlayerPosition,
  analyzeOpponent,
  generateMatchPlan,
  suggestLineup,
  summarizeMatch,
};
