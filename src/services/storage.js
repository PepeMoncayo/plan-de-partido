// Imágenes en el bucket privado "media". En la BD se guarda una referencia "storage:<ruta>"
// y al mostrarla se pide una URL firmada (caché en memoria). También se aceptan URLs http(s).
import { supabase } from '../lib/supabase';

const BUCKET = 'media';
const PREFIX = 'storage:';
const SIGNED_TTL = 60 * 60; // 1 h
const cache = new Map();

export const isStorageRef = (v) => typeof v === 'string' && v.startsWith(PREFIX);

// Redimensiona en un canvas (máx. maxSize px) y devuelve un Blob JPEG/PNG
export function compressImage(file, maxSize = 400, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo comprimir'))), type, quality);
    };
    img.onerror = () => reject(new Error('Imagen no válida'));
    img.src = url;
  });
}

export const fileToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });

/**
 * Sube una imagen y devuelve la referencia a guardar en la BD.
 * En modo demo (sin Supabase) devuelve un dataURL que solo vive en memoria.
 */
export async function uploadImage(file, folder, { maxSize = 1200, maxBytes = 5 * 1024 * 1024, demo = false } = {}) {
  if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) throw new Error('Formato no admitido (usa PNG, JPG, WebP o GIF)');
  const blob = await compressImage(file, maxSize);
  if (blob.size > maxBytes) throw new Error(`La imagen supera ${Math.round(maxBytes / 1024)} KB`);
  if (demo || !supabase) return fileToDataUrl(blob);

  const ext = blob.type === 'image/png' ? 'png' : 'jpg';
  const path = `${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, { contentType: blob.type });
  if (error) throw error;
  return `${PREFIX}${path}`;
}

export async function resolveImage(ref) {
  if (!ref) return '';
  if (!isStorageRef(ref)) return ref;
  const hit = cache.get(ref);
  if (hit && hit.expires > Date.now()) return hit.url;
  if (!supabase) return '';
  const path = ref.slice(PREFIX.length);
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
  if (error) return '';
  cache.set(ref, { url: data.signedUrl, expires: Date.now() + (SIGNED_TTL - 60) * 1000 });
  return data.signedUrl;
}

// Para jsPDF: cualquier referencia → dataURL
export async function imageToDataUrl(ref) {
  if (!ref) return null;
  if (ref.startsWith('data:')) return ref;
  try {
    const url = await resolveImage(ref);
    if (!url) return null;
    const res = await fetch(url);
    if (!res.ok) return null;
    return await fileToDataUrl(await res.blob());
  } catch {
    return null;
  }
}

export async function removeImage(ref) {
  if (!isStorageRef(ref) || !supabase) return;
  await supabase.storage.from(BUCKET).remove([ref.slice(PREFIX.length)]);
}
