import { useEffect, useRef, useState } from 'react';
import { PhotoIcon, TrashIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { resolveImage, uploadImage } from '../services/storage';
import { embedUrl, googleEmbedUrl } from '../utils/video';
import { useStore } from '../store/useStore';

export function useResolvedImage(ref) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    let alive = true;
    resolveImage(ref).then((u) => alive && setUrl(u));
    return () => {
      alive = false;
    };
  }, [ref]);
  return url;
}

export function StorageImage({ src, alt = '', className, fallback = null }) {
  const url = useResolvedImage(src);
  if (!url) return fallback;
  return <img src={url} alt={alt} className={className} loading="lazy" />;
}

export function Avatar({ src, name, className }) {
  const initials = (name || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <StorageImage
      src={src}
      alt={name}
      className={clsx('object-cover', className)}
      fallback={
        <div className={clsx('grid place-items-center bg-slate-200 font-semibold text-slate-500 dark:bg-slate-700 dark:text-slate-300', className)}>
          {initials}
        </div>
      }
    />
  );
}

/** Selector de imagen que sube a Storage y devuelve la referencia por onChange. */
export function ImageUpload({ value, onChange, folder, disabled, maxSize = 1200, maxBytes, className, label = 'Subir imagen' }) {
  const input = useRef(null);
  const isDemo = useStore((s) => s.isDemo);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setErr('');
    try {
      onChange(await uploadImage(file, folder, { maxSize, maxBytes, demo: isDemo }));
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={clsx('relative', className)}>
      {value ? (
        <StorageImage src={value} className="h-full w-full rounded-lg object-contain" />
      ) : (
        <div className="grid h-full min-h-[8rem] w-full place-items-center rounded-lg border border-dashed border-slate-300 text-slate-400 dark:border-slate-700">
          <PhotoIcon className="h-8 w-8" />
        </div>
      )}
      {!disabled && (
        <div className="absolute bottom-2 right-2 flex gap-1">
          <button type="button" className="btn-secondary px-2 py-1 text-xs" onClick={() => input.current?.click()} disabled={busy}>
            {busy ? 'Subiendo…' : label}
          </button>
          {value && (
            <button type="button" className="btn-secondary px-2 py-1 text-xs text-red-600" onClick={() => onChange('')} aria-label="Quitar imagen">
              <TrashIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      )}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={onFile} />
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}

export function VideoEmbed({ url, className }) {
  const src = embedUrl(url);
  if (!src) return url ? <p className="text-xs text-slate-500">URL de vídeo no reconocida (YouTube o Vimeo).</p> : null;
  return (
    <div className={clsx('aspect-video overflow-hidden rounded-lg bg-black', className)}>
      <iframe src={src} title="Vídeo" className="h-full w-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
    </div>
  );
}

export function GoogleEmbed({ url, className }) {
  const src = googleEmbedUrl(url);
  if (!src) return url ? <p className="text-xs text-slate-500">Solo se pueden incrustar enlaces de Google Slides / Drive.</p> : null;
  return (
    <div className={clsx('aspect-video overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800', className)}>
      <iframe src={src} title="Documento" className="h-full w-full" allowFullScreen />
    </div>
  );
}
