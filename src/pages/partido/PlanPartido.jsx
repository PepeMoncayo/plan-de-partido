import { PHASES } from '../../data/constants';
import { Field, SaveBar, useCanEdit } from '../../components/ui';
import { ImageUpload, VideoEmbed, GoogleEmbed } from '../../components/media';
import { useMatchDraft } from './useMatchDraft';

const FIELDS = ['phases'];
const emptyPhase = { notes: '', video: '', img1: '', img2: '', doc: '' };
const normalize = (d) => ({
  phases: Object.fromEntries(PHASES.map((p) => [p.key, { ...emptyPhase, ...(d.phases?.[p.key] || {}) }])),
});

export default function PlanPartido({ match }) {
  const canEdit = useCanEdit();
  const { draft, setDraft, dirty, saving, save, savedAt } = useMatchDraft(match, FIELDS, normalize);
  const setPhase = (key, patch) =>
    setDraft({ ...draft, phases: { ...draft.phases, [key]: { ...draft.phases[key], ...patch } } });

  return (
    <div className="space-y-4">
      {PHASES.map(({ key, label }) => {
        const ph = draft.phases[key];
        return (
          <section key={key} className="card space-y-4 p-4">
            <h3 className="text-lg font-semibold">{label}</h3>
            <Field label="Notas">
              <textarea
                className="input min-h-[100px]"
                value={ph.notes}
                readOnly={!canEdit}
                onChange={(e) => setPhase(key, { notes: e.target.value })}
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              {['img1', 'img2'].map((k) => (
                <ImageUpload
                  key={k}
                  value={ph[k]}
                  onChange={(v) => setPhase(key, { [k]: v })}
                  folder={`matches/${match.id}/plan`}
                  disabled={!canEdit}
                  className="aspect-video"
                />
              ))}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Field label="Vídeo (YouTube / Vimeo)">
                  <input className="input" type="url" value={ph.video} disabled={!canEdit} onChange={(e) => setPhase(key, { video: e.target.value })} />
                </Field>
                <VideoEmbed url={ph.video} />
              </div>
              <div className="space-y-2">
                <Field label="Documento (Google Drive / Slides)">
                  <input className="input" type="url" value={ph.doc} disabled={!canEdit} onChange={(e) => setPhase(key, { doc: e.target.value })} />
                </Field>
                <GoogleEmbed url={ph.doc} />
              </div>
            </div>
          </section>
        );
      })}
      <SaveBar dirty={dirty} saving={saving} onSave={save} savedAt={savedAt} />
    </div>
  );
}
