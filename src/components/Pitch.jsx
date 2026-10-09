import clsx from 'clsx';

const LINE = 'rgba(255,255,255,0.5)';

export function PitchLines() {
  return (
    <svg viewBox="0 0 68 105" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
      <rect width="68" height="105" fill="#1e5c1e" />
      {[...Array(7)].map((_, i) => (
        <rect key={i} x="0" y={i * 15} width="68" height="7.5" fill="rgba(0,0,0,0.06)" />
      ))}
      <g fill="none" stroke={LINE} strokeWidth="0.5">
        <rect x="2" y="3" width="64" height="99" />
        <line x1="2" y1="52.5" x2="66" y2="52.5" />
        <circle cx="34" cy="52.5" r="9.15" />
        <rect x="13.84" y="3" width="40.32" height="16.5" />
        <rect x="24.84" y="3" width="18.32" height="5.5" />
        <path d="M 26 19.5 A 9.15 9.15 0 0 0 42 19.5" />
        <rect x="13.84" y="85.5" width="40.32" height="16.5" />
        <rect x="24.84" y="96.5" width="18.32" height="5.5" />
        <path d="M 26 85.5 A 9.15 9.15 0 0 1 42 85.5" />
      </g>
      <g fill={LINE}>
        <circle cx="34" cy="52.5" r="0.6" />
        <circle cx="34" cy="14" r="0.45" />
        <circle cx="34" cy="91" r="0.45" />
      </g>
    </svg>
  );
}

/** Campo vertical con capa superior para hijos posicionados en % (left/top). */
export default function Pitch({ children, className, onClick }) {
  return (
    <div
      className={clsx('relative mx-auto w-full overflow-hidden rounded-xl shadow-inner', className)}
      style={{ aspectRatio: '68 / 105' }}
      onClick={onClick}
    >
      <PitchLines />
      {children}
    </div>
  );
}

// Coordenadas de un clic en % relativas al campo
export function pitchCoords(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  return {
    x: Math.round(((e.clientX - rect.left) / rect.width) * 1000) / 10,
    y: Math.round(((e.clientY - rect.top) / rect.height) * 1000) / 10,
  };
}
