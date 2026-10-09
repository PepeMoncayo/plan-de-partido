import { useMemo, useState } from 'react';
import { PlusIcon, TrashIcon, PencilSquareIcon, DocumentArrowDownIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { useStore } from '../store/useStore';
import { POSITIONS, RATING_GROUPS, DEFAULT_RATINGS } from '../data/constants';
import { Modal, Field, AdminOnly, useCanEdit, Empty } from '../components/ui';
import { Avatar, ImageUpload, VideoEmbed } from '../components/media';

const avg = (obj = {}) => {
  const v = Object.values(obj).filter((n) => typeof n === 'number');
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : 0;
};

function FitnessBar({ value }) {
  const color = value >= 85 ? 'bg-green-500' : value >= 70 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700">
      <div className={`h-1.5 rounded-full ${color}`} style={{ width: `${value ?? 0}%` }} />
    </div>
  );
}

function PlayerCard({ player, onOpen }) {
  return (
    <button onClick={onOpen} className="card flex w-full items-center gap-3 p-3 text-left transition hover:border-brand/40 hover:shadow-md">
      <Avatar src={player.photoUrl} name={player.name} className="h-14 w-14 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          {player.dorsal && <span className="text-xs font-bold text-brand">{player.dorsal}</span>}
          <span className="truncate font-medium">{player.name}</span>
        </div>
        <div className="mb-1 text-xs text-slate-500">{player.age ? `${player.age} años` : '—'} · Forma {player.fitness ?? '—'}%</div>
        <FitnessBar value={player.fitness} />
      </div>
    </button>
  );
}

function RatingRadar({ group, values, onChange, readOnly }) {
  const data = group.fields.map(([k, label]) => ({ k, label, value: values?.[k] ?? 0 }));
  return (
    <div className="card p-3">
      <div className="mb-1 flex items-center justify-between">
        <h4 className="text-sm font-semibold" style={{ color: group.color }}>{group.label}</h4>
        <span className="text-xs text-slate-500">Media {avg(values)}</span>
      </div>
      <div className="h-48">
        <ResponsiveContainer>
          <RadarChart data={data} outerRadius="70%">
            <PolarGrid />
            <PolarAngleAxis dataKey="label" tick={{ fontSize: 10 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar dataKey="value" stroke={group.color} fill={group.color} fillOpacity={0.35} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      {!readOnly && (
        <div className="mt-2 space-y-1">
          {data.map((d) => (
            <label key={d.k} className="flex items-center gap-2 text-xs">
              <span className="w-28 shrink-0">{d.label}</span>
              <input
                type="range"
                min="0"
                max="100"
                value={d.value}
                onChange={(e) => onChange({ ...values, [d.k]: Number(e.target.value) })}
                className="flex-1 accent-brand"
              />
              <span className="w-7 text-right tabular-nums">{d.value}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function PlayerView({ player, onEdit, onClose }) {
  const canEdit = useCanEdit();
  const updatePlayer = useStore((s) => s.updatePlayer);
  const [ratings, setRatings] = useState({
    conBalon: player.conBalon,
    sinBalon: player.sinBalon,
    condicional: player.condicional,
  });
  const [saving, setSaving] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const dirty = JSON.stringify(ratings) !== JSON.stringify({ conBalon: player.conBalon, sinBalon: player.sinBalon, condicional: player.condicional });

  async function save() {
    setSaving(true);
    try {
      await updatePlayer(player.id, ratings);
    } finally {
      setSaving(false);
    }
  }

  async function pdf() {
    setPdfBusy(true);
    try {
      const { generatePlayerPDF } = await import('../services/pdf/playerPdf');
      await generatePlayerPDF({ ...player, ...ratings });
    } finally {
      setPdfBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row">
        <Avatar src={player.photoUrl} name={player.name} className="h-32 w-32 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-1 text-sm">
          <div className="text-xl font-semibold">
            {player.dorsal && <span className="mr-2 text-brand">{player.dorsal}</span>}
            {player.name}
          </div>
          <div className="text-slate-500">{POSITIONS.find((p) => p.id === player.position)?.label}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-2 sm:grid-cols-3">
            <span>Edad: <b>{player.age ?? '—'}</b></span>
            <span>Nacimiento: <b>{player.birthDate ?? '—'}</b></span>
            <span>Altura: <b>{player.height ? `${player.height} cm` : '—'}</b></span>
            <span>Peso: <b>{player.weight ? `${player.weight} kg` : '—'}</b></span>
            <span>Forma: <b>{player.fitness ?? '—'}%</b></span>
          </div>
          {player.descripcion && <p className="whitespace-pre-line pt-2 text-slate-600 dark:text-slate-300">{player.descripcion}</p>}
        </div>
        <div className="flex flex-row gap-2 sm:flex-col">
          <button className="btn-secondary" onClick={pdf} disabled={pdfBusy}>
            <DocumentArrowDownIcon className="h-4 w-4" /> {pdfBusy ? 'Generando…' : 'PDF'}
          </button>
          <AdminOnly>
            <button className="btn-secondary" onClick={onEdit}>
              <PencilSquareIcon className="h-4 w-4" /> Editar
            </button>
          </AdminOnly>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {RATING_GROUPS.map((g) => (
          <RatingRadar
            key={g.key}
            group={g}
            values={ratings[g.key]}
            readOnly={!canEdit}
            onChange={(v) => setRatings((r) => ({ ...r, [g.key]: v }))}
          />
        ))}
      </div>

      {player.videoUrl && <VideoEmbed url={player.videoUrl} />}

      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={onClose}>Cerrar</button>
        <AdminOnly>
          <button className="btn-primary" onClick={save} disabled={!dirty || saving}>
            {saving ? 'Guardando…' : 'Guardar valoraciones'}
          </button>
        </AdminOnly>
      </div>
    </div>
  );
}

function PlayerForm({ initial, onSubmit, onCancel }) {
  const [p, setP] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setP({ ...p, [k]: e.target.type === 'number' ? (e.target.value === '' ? null : Number(e.target.value)) : e.target.value || null });

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ ...p, name: p.name?.trim() });
    } catch {
      /* el error se muestra en el banner global */
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex gap-4">
        <ImageUpload
          value={p.photoUrl}
          onChange={(photoUrl) => setP({ ...p, photoUrl })}
          folder="players"
          maxSize={400}
          className="h-32 w-32 shrink-0"
          label="Foto"
        />
        <div className="grid flex-1 grid-cols-2 gap-3">
          <Field label="Nombre" className="col-span-2">
            <input className="input" required value={p.name || ''} onChange={set('name')} />
          </Field>
          <Field label="Posición">
            <select
              className="input"
              value={p.position}
              onChange={(e) => {
                const position = e.target.value;
                setP(p.id ? { ...p, position } : { ...p, position, ...structuredClone(DEFAULT_RATINGS[position]) });
              }}
            >
              {POSITIONS.map((x) => (
                <option key={x.id} value={x.id}>{x.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Dorsal">
            <input className="input" type="number" min="1" max="99" value={p.dorsal ?? ''} onChange={set('dorsal')} />
          </Field>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Edad"><input className="input" type="number" min="10" max="60" value={p.age ?? ''} onChange={set('age')} /></Field>
        <Field label="Nacimiento"><input className="input" type="date" value={p.birthDate ?? ''} onChange={set('birthDate')} /></Field>
        <Field label="Altura (cm)"><input className="input" type="number" min="100" max="250" value={p.height ?? ''} onChange={set('height')} /></Field>
        <Field label="Peso (kg)"><input className="input" type="number" min="30" max="200" value={p.weight ?? ''} onChange={set('weight')} /></Field>
      </div>
      <Field label={`Estado de forma: ${p.fitness ?? 80}%`}>
        <input type="range" min="0" max="100" className="w-full accent-brand" value={p.fitness ?? 80} onChange={(e) => setP({ ...p, fitness: Number(e.target.value) })} />
      </Field>
      <Field label="Vídeo (YouTube / Vimeo)">
        <input className="input" type="url" value={p.videoUrl || ''} onChange={set('videoUrl')} placeholder="https://…" />
      </Field>
      <Field label="Descripción">
        <textarea className="input min-h-[80px]" value={p.descripcion || ''} onChange={set('descripcion')} />
      </Field>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </form>
  );
}

export default function PlayersPage() {
  const { players, loading, addPlayer, updatePlayer, removePlayer, loadSamplePlayers, newPlayerDefaults } = useStore();
  const [viewId, setViewId] = useState(null);
  const [form, setForm] = useState(null); // { mode: 'new' | 'edit', player }
  const [query, setQuery] = useState('');

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? players.filter((p) => p.name.toLowerCase().includes(q)) : players;
    return POSITIONS.map((pos) => ({ ...pos, players: list.filter((p) => p.position === pos.id) }));
  }, [players, query]);

  const viewing = players.find((p) => p.id === viewId);

  async function onSubmit(p) {
    if (form.mode === 'new') await addPlayer(p);
    else {
      const { id, createdAt, updatedAt, ...patch } = p;
      await updatePlayer(id, patch);
    }
    setForm(null);
  }

  async function onLoadSample() {
    if (!confirm('Esto BORRA todos los jugadores actuales y carga la plantilla de ejemplo. ¿Continuar?')) return;
    await loadSamplePlayers().catch(() => {});
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">Plantilla</h1>
        <span className="text-sm text-slate-500">{players.length} jugadores</span>
        <input className="input ml-auto w-48" placeholder="Buscar…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <AdminOnly>
          <button className="btn-secondary" onClick={onLoadSample}>
            <ArrowPathIcon className="h-4 w-4" /> Plantilla de ejemplo
          </button>
          <button className="btn-primary" onClick={() => setForm({ mode: 'new', player: newPlayerDefaults() })}>
            <PlusIcon className="h-4 w-4" /> Jugador
          </button>
        </AdminOnly>
      </div>

      {loading && <p className="text-sm text-slate-500">Cargando…</p>}
      {!loading && players.length === 0 && <Empty>No hay jugadores todavía.</Empty>}

      {grouped.map(
        (g) =>
          g.players.length > 0 && (
            <section key={g.id}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                {g.label} <span className="font-normal">({g.players.length})</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {g.players.map((p) => (
                  <div key={p.id} className="group relative">
                    <PlayerCard player={p} onOpen={() => setViewId(p.id)} />
                    <AdminOnly>
                      <button
                        className="btn-danger absolute right-2 top-2 hidden p-1 group-hover:flex"
                        aria-label="Eliminar jugador"
                        onClick={() => confirm(`¿Eliminar a ${p.name}?`) && removePlayer(p.id).catch(() => {})}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </AdminOnly>
                  </div>
                ))}
              </div>
            </section>
          )
      )}

      <Modal open={!!viewing} onClose={() => setViewId(null)} title="Ficha de jugador" wide>
        {viewing && (
          <PlayerView
            key={viewing.id + viewing.updatedAt}
            player={viewing}
            onClose={() => setViewId(null)}
            onEdit={() => {
              setForm({ mode: 'edit', player: viewing });
              setViewId(null);
            }}
          />
        )}
      </Modal>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.mode === 'new' ? 'Nuevo jugador' : 'Editar jugador'}>
        {form && <PlayerForm initial={form.player} onSubmit={onSubmit} onCancel={() => setForm(null)} />}
      </Modal>
    </div>
  );
}
