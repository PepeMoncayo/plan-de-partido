import { useState } from 'react';
import { normalizeAbp } from '../../data/constants';
import { Field, SaveBar, Tabs, useCanEdit } from '../../components/ui';
import { ImageUpload, VideoEmbed } from '../../components/media';
import { useMatchDraft } from './useMatchDraft';

const FIELDS = ['abpData'];
const normalize = (d) => ({ abpData: normalizeAbp(d.abpData || {}) });

function AbpCard({ title, card, onChange, folder, canEdit }) {
  return (
    <section className="card space-y-3 p-4">
      <h4 className="font-semibold">{title}</h4>
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2].map((n) => (
          <div key={n} className="space-y-2">
            <ImageUpload
              value={card[`img${n}`]}
              onChange={(v) => onChange({ [`img${n}`]: v })}
              folder={folder}
              disabled={!canEdit}
              className="aspect-video"
            />
            <textarea
              className="input min-h-[60px]"
              placeholder="Notas"
              value={card[`img${n}Notes`]}
              readOnly={!canEdit}
              onChange={(e) => onChange({ [`img${n}Notes`]: e.target.value })}
            />
            <Field label="Vídeo">
              <input
                className="input"
                type="url"
                value={card[`img${n}VideoUrl`]}
                disabled={!canEdit}
                onChange={(e) => onChange({ [`img${n}VideoUrl`]: e.target.value })}
              />
            </Field>
            <VideoEmbed url={card[`img${n}VideoUrl`]} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function ABP({ match }) {
  const canEdit = useCanEdit();
  const [side, setSide] = useState('ofensivo');
  const { draft, setDraft, dirty, saving, save, savedAt } = useMatchDraft(match, FIELDS, normalize);
  const abp = draft.abpData;
  const folder = `matches/${match.id}/abp`;

  const update = (path, patch) => {
    const next = structuredClone(abp);
    let target = next;
    for (const k of path.slice(0, -1)) target = target[k];
    const last = path[path.length - 1];
    target[last] = { ...target[last], ...patch };
    setDraft({ abpData: next });
  };

  const cards =
    side === 'ofensivo'
      ? [
          ...abp.ofensivo.corners.map((c, i) => ({ title: `Córner ${i + 1}`, path: ['ofensivo', 'corners', i], card: c })),
          ...abp.ofensivo.faltasLaterales.map((c, i) => ({ title: `Falta lateral ${i + 1}`, path: ['ofensivo', 'faltasLaterales', i], card: c })),
        ]
      : [
          { title: 'Córner', path: ['defensivo', 'corner'], card: abp.defensivo.corner },
          { title: 'Falta lateral', path: ['defensivo', 'faltaLateral'], card: abp.defensivo.faltaLateral },
          { title: 'Falta frontal', path: ['defensivo', 'faltaFrontal'], card: abp.defensivo.faltaFrontal },
        ];

  return (
    <div className="space-y-4">
      <Tabs
        tabs={[
          { id: 'ofensivo', label: 'Ofensivo' },
          { id: 'defensivo', label: 'Defensivo' },
        ]}
        active={side}
        onChange={setSide}
      />
      {cards.map((c) => (
        <AbpCard key={c.path.join('.')} title={c.title} card={c.card} folder={folder} canEdit={canEdit} onChange={(patch) => update(c.path, patch)} />
      ))}
      <SaveBar dirty={dirty} saving={saving} onSave={save} savedAt={savedAt} />
    </div>
  );
}
