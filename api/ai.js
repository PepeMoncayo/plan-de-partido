// Vercel Serverless Function · POST /api/ai
// Recibe { task, input }, pide a Claude el análisis y devuelve JSON con la misma
// forma que src/services/ai/mockProvider.js para que la UI no cambie.
// Requiere sesión de Supabase (Authorization: Bearer <access_token>).
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const MODEL = 'claude-opus-5-5';
const MAX_INPUT_CHARS = 60_000;

async function authenticate(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || !supabaseUrl || !supabaseAnon) return null;
  const supabase = createClient(supabaseUrl, supabaseAnon, { auth: { persistSession: false } });
  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : data.user;
}

const SYSTEM = `Eres el analista táctico del cuerpo técnico de un equipo de fútbol.
Respondes siempre en español de España, con lenguaje de entrenador: frases cortas, concretas y accionables
(una idea por punto, sin relleno ni introducciones). Basa el análisis en los datos que te den; si faltan datos,
razona a partir de lo típico de cada sistema y no inventes nombres, minutos ni estadísticas.`;

// Las restricciones de tamaño (minItems…) no se admiten en el esquema; se piden en la descripción.
const list = (min, max) => ({
  type: 'array',
  items: { type: 'string' },
  description: min === max ? `Exactamente ${min} elementos` : `Entre ${min} y ${max} puntos`,
});
const object = (properties) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

// Cada tarea: cómo convertir la entrada en instrucciones y qué forma debe tener la respuesta.
const TASKS = {
  analyzeMatchup: {
    prompt: ({ myFormation, rivalFormation }) =>
      `Nuestro sistema: ${myFormation}. Sistema del rival: ${rivalFormation}.
Analiza el enfrentamiento táctico: ventajas que nos da nuestro sistema frente al suyo (strengths),
debilidades estructurales de su sistema que podemos atacar (weaknesses) y recomendaciones concretas para el partido (recommendations).`,
    schema: object({ strengths: list(3, 4), weaknesses: list(3, 4), recommendations: list(3, 5) }),
    meta: ({ myFormation, rivalFormation }) => ({ meta: { myFormation, rivalFormation } }),
  },
  analyzePlayerPosition: {
    prompt: ({ playerName, positionLabel, formation, rivalFormation }) =>
      `Jugador: ${playerName}. Demarcación en el once: ${positionLabel}. Nuestro sistema: ${formation}.
Sistema del rival: ${rivalFormation || 'desconocido'}.
Define su rol para este partido: tareas con balón (withBall), tareas sin balón (withoutBall) y los duelos clave que va a tener (keyDuels).`,
    schema: object({ withBall: list(3, 4), withoutBall: list(3, 4), keyDuels: list(2, 3) }),
    meta: ({ playerName, positionLabel, formation, rivalFormation }) => ({ meta: { playerName, positionLabel, formation, rivalFormation } }),
  },
  analyzeOpponent: {
    prompt: ({ opponent, notes }) =>
      `Rival: ${opponent || 'sin nombre'}.
Notas del informe de scouting: ${notes || '(sin notas: haz un análisis genérico y dilo en las recomendaciones)'}.
Saca sus fortalezas (strengths), sus debilidades (weaknesses) y recomendaciones para nuestro plan de partido (recommendations).`,
    schema: object({ strengths: list(3, 4), weaknesses: list(3, 4), recommendations: list(3, 5) }),
    meta: ({ notes }) => ({ basedOn: notes || 'Informe rápido' }),
  },
  generateMatchPlan: {
    prompt: ({ opponent, style }) =>
      `Rival: ${opponent || 'sin nombre'}. Estilo que queremos: ${style || 'sin especificar'}.
Prepara el plan de partido: ideas ofensivas (offensive), ideas defensivas (defensive), el gatillo principal de presión (pressing, una frase)
y las claves del partido (keys).`,
    schema: object({ offensive: list(2, 4), defensive: list(2, 4), pressing: { type: 'string' }, keys: list(3, 4) }),
    meta: ({ opponent, style }) => ({ meta: { opponent, style } }),
  },
  suggestLineup: {
    prompt: ({ squad }) =>
      `Plantilla disponible (JSON): ${JSON.stringify(squad)}.
Propón un sistema (formation, p. ej. "4-3-3"), los 11 titulares por su nombre exacto (starters) y ajustes tácticos (adjustments).`,
    schema: object({ formation: { type: 'string' }, starters: list(11, 11), adjustments: list(2, 4) }),
    meta: () => ({}),
  },
  summarizeMatch: {
    prompt: ({ match }) =>
      `Datos del partido y eventos registrados (JSON): ${JSON.stringify(match)}.
Resume el partido en dos o tres frases (summary), los momentos clave con su minuto si lo hay (keyMoments)
y la valoración del rendimiento de nuestro equipo (performance). Usa solo lo que aparece en los eventos.`,
    schema: object({ summary: { type: 'string' }, keyMoments: list(2, 5), performance: list(2, 4) }),
    meta: () => ({}),
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });
  if (!(await authenticate(req))) return res.status(401).json({ error: 'Sesión no válida' });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(501).json({ error: 'Falta ANTHROPIC_API_KEY en el servidor' });

  const { task, input } = req.body || {};
  const def = TASKS[task];
  if (!def || !input || typeof input !== 'object') return res.status(400).json({ error: 'Petición no válida' });

  const prompt = def.prompt(input);
  if (prompt.length > MAX_INPUT_CHARS) return res.status(413).json({ error: 'Demasiados datos para analizar' });

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 8000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: def.schema } },
      system: SYSTEM,
      messages: [{ role: 'user', content: prompt }],
    });

    if (response.stop_reason === 'refusal') return res.status(422).json({ error: 'La IA no ha podido analizar esto' });
    if (response.stop_reason === 'max_tokens') return res.status(502).json({ error: 'La respuesta de la IA llegó cortada, inténtalo de nuevo' });

    const text = response.content.find((b) => b.type === 'text')?.text;
    return res.status(200).json({ ...JSON.parse(text), ...def.meta(input) });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return res.status(429).json({ error: 'Demasiadas peticiones a la IA, espera un momento' });
    if (e instanceof Anthropic.AuthenticationError) return res.status(500).json({ error: 'La clave de la IA no es válida' });
    if (e instanceof Anthropic.APIError) return res.status(502).json({ error: `Error de la IA (${e.status})` });
    console.error('[api/ai]', e);
    return res.status(500).json({ error: 'Error interno de la IA' });
  }
}
