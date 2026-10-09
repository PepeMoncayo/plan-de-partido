import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import YouTubePlayer from 'youtube-player';
import VimeoPlayer from '@vimeo/player';
import { parseVideoUrl } from '../utils/video';

/**
 * Reproductor YouTube/Vimeo con API común:
 *   ref.current.getCurrentTime() → Promise<number>
 *   ref.current.seekTo(seconds)
 */
const VideoPlayer = forwardRef(function VideoPlayer({ url, onTime }, ref) {
  const host = useRef(null);
  const player = useRef(null);
  const [error, setError] = useState('');
  const video = parseVideoUrl(url);
  const key = video ? `${video.provider}:${video.id}` : '';

  useImperativeHandle(ref, () => ({
    async getCurrentTime() {
      if (!player.current) return 0;
      return (await player.current.getCurrentTime()) || 0;
    },
    async seekTo(seconds) {
      if (!player.current) return;
      if (video?.provider === 'youtube') {
        await player.current.seekTo(seconds, true);
        await player.current.playVideo();
      } else {
        await player.current.setCurrentTime(seconds);
        await player.current.play().catch(() => {});
      }
    },
  }));

  useEffect(() => {
    if (!video || !host.current) return;
    setError('');
    const mount = document.createElement('div');
    mount.className = 'h-full w-full';
    host.current.replaceChildren(mount);
    let interval;

    if (video.provider === 'youtube') {
      const yt = YouTubePlayer(mount, {
        videoId: video.id,
        width: '100%',
        height: '100%',
        playerVars: { rel: 0, modestbranding: 1 },
      });
      player.current = yt;
      // La API de YouTube no emite timeupdate: se consulta periódicamente
      interval = setInterval(async () => {
        try {
          onTime?.(await yt.getCurrentTime());
        } catch {
          /* aún cargando */
        }
      }, 500);
      yt.on('error', () => setError('No se pudo cargar el vídeo de YouTube'));
    } else {
      const vm = new VimeoPlayer(mount, { id: Number(video.id), responsive: true });
      player.current = vm;
      vm.on('timeupdate', (d) => onTime?.(d.seconds));
      vm.on('error', () => setError('No se pudo cargar el vídeo de Vimeo'));
    }

    return () => {
      clearInterval(interval);
      const p = player.current;
      player.current = null;
      try {
        p?.destroy();
      } catch {
        /* ya destruido */
      }
    };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!video) {
    return (
      <div className="grid aspect-video place-items-center rounded-xl bg-slate-200 text-sm text-slate-500 dark:bg-slate-800">
        {url ? 'URL no reconocida: usa un enlace de YouTube o Vimeo' : 'Añade la URL del vídeo del partido'}
      </div>
    );
  }
  return (
    <div>
      <div ref={host} className="aspect-video overflow-hidden rounded-xl bg-black [&_iframe]:h-full [&_iframe]:w-full" />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
});

export default VideoPlayer;
