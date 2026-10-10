// Proveedor real: llama a api/ai.js (función de Vercel), que es quien tiene la
// ANTHROPIC_API_KEY. La clave NUNCA va en el navegador ni en variables VITE_*.
// Se activa con VITE_AI_PROVIDER=claude.
import { supabase } from '../../lib/supabase';

async function callServer(task, input) {
  const { data } = (await supabase?.auth.getSession()) ?? { data: {} };
  const token = data?.session?.access_token;
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ task, input }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `IA no disponible (${res.status})`);
  return body;
}

export const claudeProvider = {
  analyzeMatchup: (input) => callServer('analyzeMatchup', input),
  analyzePlayerPosition: (input) => callServer('analyzePlayerPosition', input),
  analyzeOpponent: (input) => callServer('analyzeOpponent', input),
  generateMatchPlan: (input) => callServer('generateMatchPlan', input),
  suggestLineup: (input) => callServer('suggestLineup', input),
  summarizeMatch: (input) => callServer('summarizeMatch', input),
};
