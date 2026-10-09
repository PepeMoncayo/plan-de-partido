export function parseVideoUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\.|^m\./, '');
    if (host === 'youtu.be') return { provider: 'youtube', id: u.pathname.slice(1) };
    if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (u.searchParams.get('v')) return { provider: 'youtube', id: u.searchParams.get('v') };
      const m = u.pathname.match(/\/(embed|shorts|live)\/([^/?]+)/);
      if (m) return { provider: 'youtube', id: m[2] };
    }
    if (host === 'vimeo.com' || host === 'player.vimeo.com') {
      const m = u.pathname.match(/(\d{6,})/);
      if (m) return { provider: 'vimeo', id: m[1] };
    }
  } catch {
    /* URL inválida */
  }
  return null;
}

export function embedUrl(url) {
  const v = parseVideoUrl(url);
  if (!v) return null;
  return v.provider === 'youtube'
    ? `https://www.youtube-nocookie.com/embed/${v.id}`
    : `https://player.vimeo.com/video/${v.id}`;
}

// Google Slides / Drive → URL embebible
export function googleEmbedUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname === 'docs.google.com' && u.pathname.includes('/presentation/')) {
      return url.replace(/\/(edit|view|pub)([?#].*)?$/, '/embed');
    }
    if (u.hostname === 'docs.google.com' || u.hostname === 'drive.google.com') {
      return url.replace(/\/(edit|view)([?#].*)?$/, '/preview');
    }
  } catch {
    return null;
  }
  return null;
}
