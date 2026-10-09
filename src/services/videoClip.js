import { supabase } from '../lib/supabase';
import { downloadBlob } from '../utils/download';

const API = import.meta.env.VITE_API_URL || '';

export async function downloadClip({ videoUrl, videoTime, filename, before = 8, after = 8 }) {
  const { data } = (await supabase?.auth.getSession()) ?? { data: {} };
  const token = data?.session?.access_token;
  if (!token) throw new Error('Inicia sesión para descargar clips (no disponible en modo demo).');

  const start = Math.max(0, Math.floor(videoTime - before));
  const res = await fetch(`${API}/api/clip`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ videoUrl, start, duration: before + after }),
  });
  if (!res.ok) {
    const msg = await res.json().catch(() => ({}));
    throw new Error(msg.error || `Error ${res.status} al generar el clip`);
  }
  downloadBlob(await res.blob(), filename);
}
