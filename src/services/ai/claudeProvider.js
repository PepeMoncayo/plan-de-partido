/*
 * Proveedor real (pendiente). La API key NUNCA va en el navegador ni en variables VITE_*.
 *
 * Para activarlo:
 *  1. Crear api/ai.js (función de Vercel) que:
 *     - verifique el JWT de Supabase (igual que api/clip.js),
 *     - reciba { task, input } y llame al modelo con ANTHROPIC_API_KEY (variable de servidor),
 *     - pida la respuesta en JSON con la MISMA forma que devuelve mockProvider para cada tarea.
 *  2. Poner VITE_AI_PROVIDER=claude.
 */
import { supabase } from '../../lib/supabase';

async function callServer(task, input) {
  const { data } = (await supabase?.auth.getSession()) ?? { data: {} };
  const token = data?.session?.access_token;
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ task, input }),
  });
  if (!res.ok) throw new Error(`IA no disponible (${res.status})`);
  return res.json();
}

export const claudeProvider = {
  analyzeMatchup: (input) => callServer('analyzeMatchup', input),
  analyzePlayerPosition: (input) => callServer('analyzePlayerPosition', input),
  analyzeOpponent: (input) => callServer('analyzeOpponent', input),
  generateMatchPlan: (input) => callServer('generateMatchPlan', input),
  suggestLineup: (input) => callServer('suggestLineup', input),
  summarizeMatch: (input) => callServer('summarizeMatch', input),
};
