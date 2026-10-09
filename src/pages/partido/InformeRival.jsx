import clsx from 'clsx';
import { SparklesIcon } from '@heroicons/react/24/outline';
import { RIVAL_GROUPS } from '../../data/constants';
import { Field, SaveBar, useCanEdit } from '../../components/ui';
import { VideoEmbed, GoogleEmbed } from '../../components/media';
import AIResultCard from '../../components/AIResultCard';
import { analyzeOpponent } from '../../services/ai';
import { useAI } from '../../services/ai/useAI';
import { useMatchDraft } from './useMatchDraft';

const FIELDS = ['rivalButtons', 'rivalNotes', 'rivalSlideUrl', 'rivalVideoUrl', 'rivalExtraUrl'];

export default function InformeRival({ match }) {
  const canEdit = useCanEdit();
  const { draft, setDraft, dirty, saving, save, savedAt } = useMatchDraft(match, FIELDS);
  const ai = useAI(analyzeOpponent);
  const buttons = draft.rivalButtons || {};
  const set = (k) => (e) => setDraft({ ...draft, [k]: e.target.value });

  function toggle(group, option) {
    if (!canEdit) return;
    const next = { ...buttons };
    if (next[group] === option) delete next[group];
    else next[group] = option;
    setDraft({ ...draft, rivalButtons: next });
  }

  function runAI() {
    const summary = RIVAL_GROUPS.filter((g) => buttons[g.key]).map((g) => `${g.label}: ${buttons[g.key]}`).join('; ');
    ai.run({ opponent: match.opponent || match.awayTeam, notes: [summary, draft.rivalNotes].filter(Boolean).join('. ') });
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        <div className="mb-3 flex items-center">
          <h3 className="font-semibold">Comportamiento de {match.opponent || match.awayTeam}</h3>
          <button className="btn-secondary ml-auto text-violet-700 dark:text-violet-300" onClick={runAI} disabled={ai.loading}>
            <SparklesIcon className="h-4 w-4" /> Analizar rival
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {RIVAL_GROUPS.map((g) => (
            <div key={g.key}>
              <span className="label">{g.label}</span>
              <div className="flex flex-wrap gap-2">
                {g.options.map((o) => (
                  <button
                    key={o}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => toggle(g.key, o)}
                    className={clsx(
                      'chip',
                      buttons[g.key] === o
                        ? 'border-brand bg-brand text-white'
                        : 'border-slate-300 hover:border-brand/50 dark:border-slate-700',
                      !canEdit && 'cursor-default'
                    )}
                  >
                    {o}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <AIResultCard title="Análisis del rival" {...ai} />

      <div className="card p-4">
        <Field label="Notas del informe">
          <textarea
            className="input min-h-[120px]"
            value={draft.rivalNotes || ''}
            onChange={set('rivalNotes')}
            readOnly={!canEdit}
            placeholder="Observaciones sobre el rival…"
          />
        </Field>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card space-y-3 p-4">
          <Field label="Presentación (Google Slides)">
            <input className="input" type="url" value={draft.rivalSlideUrl || ''} onChange={set('rivalSlideUrl')} disabled={!canEdit} placeholder="https://docs.google.com/presentation/…" />
          </Field>
          <GoogleEmbed url={draft.rivalSlideUrl} />
        </div>
        <div className="card space-y-3 p-4">
          <Field label="Vídeo del rival (YouTube / Vimeo)">
            <input className="input" type="url" value={draft.rivalVideoUrl || ''} onChange={set('rivalVideoUrl')} disabled={!canEdit} placeholder="https://vimeo.com/…" />
          </Field>
          <VideoEmbed url={draft.rivalVideoUrl} />
        </div>
      </div>

      <div className="card p-4">
        <Field label="Enlace extra">
          <input className="input" type="url" value={draft.rivalExtraUrl || ''} onChange={set('rivalExtraUrl')} disabled={!canEdit} placeholder="https://…" />
        </Field>
        {draft.rivalExtraUrl && /^https?:\/\//.test(draft.rivalExtraUrl) && (
          <a href={draft.rivalExtraUrl} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-sm text-brand underline">
            Abrir enlace
          </a>
        )}
      </div>

      <SaveBar dirty={dirty} saving={saving} onSave={save} savedAt={savedAt} />
    </div>
  );
}
