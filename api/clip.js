// Vercel Serverless Function · POST /api/clip
// Recorta un fragmento de un vídeo de YouTube o Vimeo y lo devuelve como MP4.
// Requiere sesión de Supabase (Authorization: Bearer <access_token>).
import { createClient } from '@supabase/supabase-js';
import ytdl from '@distube/ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { createReadStream, promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';

ffmpeg.setFfmpegPath(ffmpegPath);

const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be']);
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

async function authenticate(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || !supabaseUrl || !supabaseAnon) return null;
  const supabase = createClient(supabaseUrl, supabaseAnon, { auth: { persistSession: false } });
  const { data, error } = await supabase.auth.getUser(token);
  return error ? null : data.user;
}

function classify(videoUrl) {
  let u;
  try {
    u = new URL(videoUrl);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:') return null;
  if (YOUTUBE_HOSTS.has(u.hostname)) return { provider: 'youtube', url: u.toString() };
  if (VIMEO_HOSTS.has(u.hostname)) {
    const id = u.pathname.match(/(\d{6,})/)?.[1];
    return id ? { provider: 'vimeo', id } : null;
  }
  return null;
}

async function resolveSource(src) {
  if (src.provider === 'youtube') {
    const info = await ytdl.getInfo(src.url);
    const format = ytdl.chooseFormat(info.formats, { quality: 'highest', filter: 'audioandvideo' });
    return format.url;
  }
  // Vimeo: necesita un token con permiso de descarga (plan Pro o superior)
  const token = process.env.VIMEO_ACCESS_TOKEN;
  if (!token) throw Object.assign(new Error('Falta VIMEO_ACCESS_TOKEN en el servidor'), { status: 501 });
  const r = await fetch(`https://api.vimeo.com/videos/${src.id}?fields=download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!r.ok) throw Object.assign(new Error('Vimeo no permite descargar este vídeo'), { status: 502 });
  const { download = [] } = await r.json();
  const best = download.filter((d) => d.link).sort((a, b) => (b.width || 0) - (a.width || 0))[0];
  if (!best) throw Object.assign(new Error('El vídeo de Vimeo no tiene descargas disponibles'), { status: 502 });
  return best.link;
}

function cut(input, start, duration, output) {
  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .seekInput(start)
      .duration(duration)
      .outputOptions(['-c copy', '-movflags +faststart'])
      .format('mp4')
      .on('end', resolve)
      .on('error', reject)
      .save(output);
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const user = await authenticate(req);
  if (!user) return res.status(401).json({ error: 'No autenticado' });

  const { videoUrl, start, duration } = req.body || {};
  const src = classify(videoUrl);
  if (!src) return res.status(400).json({ error: 'Solo se admiten URLs https de YouTube o Vimeo' });

  const s = Number(start);
  const d = Number(duration);
  if (!Number.isFinite(s) || s < 0 || s > 6 * 3600) return res.status(400).json({ error: 'Inicio no válido' });
  const dur = Math.min(120, Math.max(1, Number.isFinite(d) ? d : 16));

  const out = join(tmpdir(), `clip-${randomUUID()}.mp4`);
  try {
    const input = await resolveSource(src);
    await cut(input, s, dur, out);
    const { size } = await fs.stat(out);
    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', size);
    res.setHeader('Content-Disposition', 'attachment; filename="clip.mp4"');
    await new Promise((resolve, reject) => {
      createReadStream(out).on('error', reject).on('end', resolve).pipe(res);
    });
  } catch (e) {
    console.error('[clip]', e);
    if (!res.headersSent) res.status(e.status || 500).json({ error: e.status ? e.message : 'No se pudo generar el clip' });
  } finally {
    fs.unlink(out).catch(() => {});
  }
}
