import { useMemo, useState } from 'react';
import clsx from 'clsx';
import { SparklesIcon, XMarkIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { useStore } from '../../store/useStore';
import { FORMATIONS, FORMATION_NAMES } from '../../data/formations';
import { POSITIONS } from '../../data/constants';
import Pitch from '../../components/Pitch';
import { Avatar } from '../../components/media';
import { Modal, SaveBar, useCanEdit, Field } from '../../components/ui';
import AIResultCard from '../../components/AIResultCard';
import { analyzeMatchup, analyzePlayerPosition } from '../../services/ai';
import { useAI } from '../../services/ai/useAI';
import { useMatchDraft } from './useMatchDraft';

const FIELDS = ['formation', 'rivalFormation', 'lineup'];
const normalize = (d) => ({ formation: d.formation || '4-3-3', rivalFormation: d.rivalFormation || '', lineup: d.lineup || {} });
const shortName = (name = '') => name.split(' ').slice(-1)[0];
const DND_TYPE = 'application/x-lineup';

function PlayerPicker({ open, onClose, players, usedIds, onPick, preferred }) {
  const [q, setQ] = useState('');
  const list = players.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase()));
  const ordered = [...POSITIONS].sort((a, b) => (a.id === preferred ? -1 : b.id === preferred ? 1 : 0));
  return (
    <Modal open={open} onClose={onClose} title="Elegir jugador">
      <div className="relative mb-3">
        <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input className="input pl-9" autoFocus placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="max-h-[60vh] space-y-3 overflow-y-auto">
        {ordered.map((pos) => {
          const group = list.filter((p) => p.position === pos.id);
          if (!group.length) return null;
          return (
            <div key={pos.id}>
              <h4 className="label">{pos.label}</h4>
              <div className="grid grid-cols-2 gap-2">
                {group.map((p) => {
                  const used = usedIds.has(p.id);
                  return (
                    <button
                      key={p.id}
                      disabled={used}
                      onClick={() => onPick(p.id)}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 text-left text-sm hover:border-brand disabled:opacity-40 dark:border-slate-700"
                    >
                      <Avatar src={p.photoUrl} name={p.name} className="h-8 w-8 rounded-full" />
                      <span className="truncate">{p.dorsal ? `${p.dorsal}. ` : ''}{p.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

export default function Alineacion({ match }) {
  const canEdit = useCanEdit();
  const players = useStore((s) => s.players);
  const { draft, setDraft, dirty, saving, save, savedAt } = useMatchDraft(match, FIELDS, normalize);
  const [pickerSpot, setPickerSpot] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [selectedSpot, setSelectedSpot] = useState(null);
  const matchupAI = useAI(analyzeMatchup);
  const playerAI = useAI(analyzePlayerPosition);

  const spots = FORMATIONS[draft.formation] ?? FORMATIONS['4-3-3'];
  const rivalSpots = draft.rivalFormation ? FORMATIONS[draft.rivalFormation] : null;
  const byId = useMemo(() => Object.fromEntries(players.map((p) => [p.id, p])), [players]);

  // Solo cuentan los puestos de la formación actual
  const lineup = useMemo(
    () => Object.fromEntries(spots.filter((s) => draft.lineup[s.id] && byId[draft.lineup[s.id]]).map((s) => [s.id, draft.lineup[s.id]])),
    [spots, draft.lineup, byId]
  );
  const usedIds = new Set(Object.values(lineup));
  const bench = players.filter((p) => !usedIds.has(p.id));

  const setLineup = (next) => setDraft({ ...draft, lineup: next });

  function place(spotId, playerId) {
    const next = { ...lineup };
    const fromSpot = Object.keys(next).find((k) => next[k] === playerId);
    const displaced = next[spotId];
    if (fromSpot) {
      if (displaced) next[fromSpot] = displaced;
      else delete next[fromSpot];
    }
    next[spotId] = playerId;
    setLineup(next);
  }

  function clearSpot(spotId) {
    const next = { ...lineup };
    delete next[spotId];
    setLineup(next);
  }

  // ─── Drag & drop (HTML5) ───
  const onDragStart = (playerId) => (e) => {
    e.dataTransfer.setData(DND_TYPE, playerId);
    e.dataTransfer.setData('text/plain', playerId);
    e.dataTransfer.effectAllowed = 'move';
  };
  const readDrag = (e) => e.dataTransfer.getData(DND_TYPE) || e.dataTransfer.getData('text/plain');
  const allowDrop = (key) => (e) => {
    if (!canEdit) return;
    e.preventDefault();
    setDragOver(key);
  };

  function onSpotClick(spot) {
    const pid = lineup[spot.id];
    if (!pid) {
      if (canEdit) setPickerSpot(spot);
      return;
    }
    setSelectedSpot(spot.id);
    playerAI.run({
      playerName: byId[pid].name,
      positionLabel: spot.label,
      formation: draft.formation,
      rivalFormation: draft.rivalFormation,
    });
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-3 p-4">
        <Field label="Nuestra formación">
          <select className="input" value={draft.formation} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, formation: e.target.value })}>
            {FORMATION_NAMES.map((f) => <option key={f}>{f}</option>)}
          </select>
        </Field>
        <Field label="Formación rival">
          <select className="input" value={draft.rivalFormation} disabled={!canEdit} onChange={(e) => setDraft({ ...draft, rivalFormation: e.target.value })}>
            <option value="">— Ocultar —</option>
            {FORMATION_NAMES.map((f) => <option key={f}>{f}</option>)}
          </select>
        </Field>
        <button
          className="btn-secondary text-violet-700 dark:text-violet-300"
          disabled={!draft.rivalFormation || matchupAI.loading}
          title={!draft.rivalFormation ? 'Elige la formación rival' : ''}
          onClick={() => matchupAI.run({ myFormation: draft.formation, rivalFormation: draft.rivalFormation })}
        >
          <SparklesIcon className="h-4 w-4" /> Analizar IA
        </button>
        <span className="ml-auto text-sm text-slate-500">{Object.keys(lineup).length}/11 titulares</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
        <Pitch className="max-w-[420px]">
          {rivalSpots?.map((s) => (
            <div
              key={`r-${s.id}`}
              className="absolute grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/70 bg-sky-500/70 text-[8px] font-bold text-white"
              style={{ left: `${100 - s.x}%`, top: `${(100 - s.y) / 2}%` }}
              title={`Rival ${s.id}`}
            >
              {s.label[0]}
            </div>
          ))}
          {spots.map((s) => {
            const p = byId[lineup[s.id]];
            const isOver = dragOver === s.id;
            return (
              <div
                key={s.id}
                className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                style={{ left: `${s.x}%`, top: `${rivalSpots ? 50 + s.y / 2 : s.y}%` }}
                onDragOver={allowDrop(s.id)}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(null);
                  const pid = readDrag(e);
                  if (canEdit && pid && byId[pid]) place(s.id, pid);
                }}
              >
                <button
                  type="button"
                  draggable={canEdit && !!p}
                  onDragStart={p ? onDragStart(p.id) : undefined}
                  onClick={() => onSpotClick(s)}
                  className={clsx(
                    'relative grid h-10 w-10 place-items-center overflow-hidden rounded-full border-2 text-[10px] font-bold shadow transition sm:h-12 sm:w-12',
                    p ? 'border-white bg-brand text-white' : 'border-dashed border-white/70 bg-white/10 text-white/80',
                    isOver && 'scale-110 border-amber-300 ring-4 ring-amber-300/50',
                    selectedSpot === s.id && p && 'ring-4 ring-violet-400'
                  )}
                  aria-label={p ? `${s.id}: ${p.name}` : `Puesto ${s.id} vacío`}
                >
                  {p ? (p.photoUrl ? <Avatar src={p.photoUrl} name={p.name} className="h-full w-full" /> : p.dorsal ?? shortName(p.name).slice(0, 3)) : s.label}
                </button>
                {p && (
                  <span className="mt-0.5 max-w-[5rem] truncate rounded bg-black/60 px-1 text-[10px] text-white">{shortName(p.name)}</span>
                )}
                {p && canEdit && (
                  <button
                    type="button"
                    onClick={() => clearSpot(s.id)}
                    className="absolute -right-1 -top-1 hidden h-4 w-4 place-items-center rounded-full bg-black/70 text-white group-hover:grid"
                    aria-label="Quitar"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                )}
              </div>
            );
          })}
        </Pitch>

        <div className="space-y-4">
          <AIResultCard title={`Análisis ${draft.formation} vs ${draft.rivalFormation || '—'}`} {...matchupAI} />
          <AIResultCard
            title={selectedSpot && lineup[selectedSpot] ? `Rol de ${byId[lineup[selectedSpot]]?.name}` : 'Rol del jugador'}
            {...playerAI}
          />

          <div
            className={clsx('card p-4 transition', dragOver === 'bench' && 'ring-2 ring-amber-300')}
            onDragOver={allowDrop('bench')}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(null);
              const pid = readDrag(e);
              const spot = Object.keys(lineup).find((k) => lineup[k] === pid);
              if (canEdit && spot) clearSpot(spot);
            }}
          >
            <h3 className="mb-1 font-semibold">Disponibles ({bench.length})</h3>
            {canEdit && <p className="mb-3 text-xs text-slate-500">Arrastra jugadores al campo, entre puestos o de vuelta aquí. También puedes pulsar un puesto vacío.</p>}
            {POSITIONS.map((pos) => {
              const group = bench.filter((p) => p.position === pos.id);
              if (!group.length) return null;
              return (
                <div key={pos.id} className="mb-3">
                  <h4 className="label">{pos.label}</h4>
                  <div className="flex flex-wrap gap-2">
                    {group.map((p) => (
                      <div
                        key={p.id}
                        draggable={canEdit}
                        onDragStart={onDragStart(p.id)}
                        className={clsx(
                          'flex items-center gap-1.5 rounded-full border border-slate-200 py-0.5 pl-0.5 pr-2.5 text-sm dark:border-slate-700',
                          canEdit && 'cursor-grab active:cursor-grabbing'
                        )}
                      >
                        <Avatar src={p.photoUrl} name={p.name} className="h-6 w-6 rounded-full text-[9px]" />
                        {p.dorsal && <b className="text-brand">{p.dorsal}</b>}
                        {p.name}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <PlayerPicker
        open={!!pickerSpot}
        onClose={() => setPickerSpot(null)}
        players={players}
        usedIds={usedIds}
        preferred={pickerSpot?.label}
        onPick={(pid) => {
          place(pickerSpot.id, pid);
          setPickerSpot(null);
        }}
      />

      <SaveBar dirty={dirty} saving={saving} onSave={save} savedAt={savedAt} />
    </div>
  );
}
