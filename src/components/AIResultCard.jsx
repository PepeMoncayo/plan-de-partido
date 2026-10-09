import { SparklesIcon } from '@heroicons/react/24/outline';
import { isSimulatedAI } from '../services/ai';

const LABELS = {
  strengths: 'Fortalezas',
  weaknesses: 'Debilidades',
  recommendations: 'Recomendaciones',
  withBall: 'Con balón',
  withoutBall: 'Sin balón',
  keyDuels: 'Duelos clave',
  offensive: 'Ofensivo',
  defensive: 'Defensivo',
  keys: 'Claves',
  adjustments: 'Ajustes',
  keyMoments: 'Momentos clave',
  performance: 'Rendimiento',
};

export default function AIResultCard({ title, loading, error, result }) {
  if (!loading && !error && !result) return null;
  return (
    <div className="card border-violet-200 bg-violet-50/50 p-4 dark:border-violet-900 dark:bg-violet-950/30">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-700 dark:text-violet-300">
        <SparklesIcon className="h-4 w-4" />
        {title}
        {isSimulatedAI && <span className="rounded bg-violet-200 px-1.5 py-0.5 text-[10px] uppercase dark:bg-violet-900">simulada</span>}
      </div>
      {loading && <p className="animate-pulse text-sm text-slate-500">Analizando…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {result && (
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(result)
            .filter(([k, v]) => LABELS[k] && Array.isArray(v))
            .map(([k, v]) => (
              <div key={k}>
                <h4 className="mb-1 text-xs font-semibold uppercase text-slate-500">{LABELS[k]}</h4>
                <ul className="list-disc space-y-0.5 pl-4 text-sm">
                  {v.map((item, i) => (
                    <li key={i}>{typeof item === 'string' ? item : item.name}</li>
                  ))}
                </ul>
              </div>
            ))}
          {result.summary && <p className="text-sm sm:col-span-2">{result.summary}</p>}
          {result.pressing && <p className="text-sm sm:col-span-2"><b>Presión:</b> {result.pressing}</p>}
        </div>
      )}
    </div>
  );
}
