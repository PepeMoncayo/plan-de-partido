import { useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  PencilSquareIcon, TrashIcon, FilmIcon, ArrowDownTrayIcon, ClockIcon, SparklesIcon,
} from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { useStore } from '../../store/useStore';
import { EVENT_TYPES } from '../../data/constants';
import VideoPlayer from '../../components/VideoPlayer';
import Pitch, { pitchCoords } from '../../components/Pitch';
import { Modal, Field, Tabs, useCanEdit, AdminOnly, Empty } from '../../components/ui';
import AIResultCard from '../../components/AIResultCard';
import { summarizeMatch } from '../../services/ai';
import { useAI } from '../../services/ai/useAI';
import { downloadClip } from '../../services/videoClip';
import { formatClock, parseClock, matchMinute } from '../../utils/time';
import { downloadText, slug } from '../../utils/download';

const typeOf = (id) => EVENT_TYPES.find((t) => t.id === id) ?? EVENT_TYPES[3];
const HALF_FIELDS = [
  ['start1', 'Inicio 1ª'],
  ['end1', 'Fin 1ª'],
  ['start2', 'Inicio 2ª'],
  ['end2', 'Fin 2ª'],
];

function EventForm({ initial, players, onSubmit, onCancel }) {
  const [ev, setEv] = useState(initial);
  const [clock, setClock] = useState(formatClock(initial.videoTime));
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const p = players.find((x) => x.id === ev.playerId);
        onSubmit({
          ...ev,
          videoTime: parseClock(clock) ?? ev.videoTime,
          playerName: p?.name ?? null,
          minute: ev.minute === '' || ev.minute == null ? null : Number(ev.minute),
        });
      }}
    >
      <div className="grid grid-cols-3 gap-3">
        <Field label="Tipo">
          <select className="input" value={ev.type} onChange={(e) => setEv({ ...ev, type: e.target.value })}>
            {EVENT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Minuto">
          <input className="input" type="number" min="0" max="130" value={ev.minute ?? ''} onChange={(e) => setEv({ ...ev, minute: e.target.value })} />
        </Field>
        <Field label="Tiempo vídeo">
          <input className="input tabular-nums" placeholder="m:ss" value={clock} onChange={(e) => setClock(e.target.value)} />
        </Field>
      </div>
      <Field label="Jugador">
        <select className="input" value={ev.playerId || ''} onChange={(e) => setEv({ ...ev, playerId: e.target.value || null })}>
          <option value="">— Ninguno —</option>
          {players.map((p) => <option key={p.id} value={p.id}>{p.dorsal ? `${p.dorsal}. ` : ''}{p.name}</option>)}
        </select>
      </Field>
      <Field label="Nota">
        <textarea className="input min-h-[70px]" value={ev.note || ''} onChange={(e) => setEv({ ...ev, note: e.target.value })} />
      </Field>
      <div>
        <span className="label">Posición en el campo (opcional · pulsa para marcar)</span>
        <div className="flex items-start gap-3">
          <div className="w-40">
            <Pitch className="cursor-crosshair" onClick={(e) => { const { x, y } = pitchCoords(e); setEv({ ...ev, fieldX: x, fieldY: y }); }}>
              {ev.fieldX != null && (
                <span
                  className="pointer-events-none absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
                  style={{ left: `${ev.fieldX}%`, top: `${ev.fieldY}%`, background: typeOf(ev.type).color }}
                />
              )}
            </Pitch>
          </div>
          {ev.fieldX != null && (
            <button type="button" className="btn-ghost text-xs" onClick={() => setEv({ ...ev, fieldX: null, fieldY: null })}>Quitar posición</button>
          )}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn-primary">Guardar</button>
      </div>
    </form>
  );
}

function EventsChart({ events }) {
  const byType = EVENT_TYPES.map((t) => ({ name: t.label, total: events.filter((e) => e.type === t.id).length, fill: t.color }));
  const slots = ['0-15', '16-30', '31-45', '46-60', '61-75', '76-90', '90+'];
  const slotOf = (m) => (m == null ? null : m > 90 ? 6 : Math.min(5, Math.floor((Math.max(1, m) - 1) / 15)));
  const bySlot = slots.map((s, i) => {
    const row = { slot: s };
    EVENT_TYPES.forEach((t) => { row[t.label] = events.filter((e) => e.type === t.id && slotOf(e.minute) === i).length; });
    return row;
  });
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="card h-72 p-4">
        <h4 className="mb-2 text-sm font-semibold">Por tipo</h4>
        <ResponsiveContainer height="90%">
          <BarChart data={byType}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="name" fontSize={12} />
            <YAxis allowDecimals={false} fontSize={12} />
            <Tooltip />
            <Bar dataKey="total" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="card h-72 p-4">
        <h4 className="mb-2 text-sm font-semibold">Por tramo de 15 minutos</h4>
        <ResponsiveContainer height="90%">
          <BarChart data={bySlot}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="slot" fontSize={12} />
            <YAxis allowDecimals={false} fontSize={12} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {EVENT_TYPES.map((t) => <Bar key={t.id} dataKey={t.label} stackId="a" fill={t.color} />)}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default function Eventos({ match }) {
  const canEdit = useCanEdit();
  const { players, events: allEvents, addEvent, updateEvent, removeEvent, updateMatch, isDemo } = useStore();
  const events = allEvents[match.id] || [];
  const playerRef = useRef(null);
  const [now, setNow] = useState(0);
  const [urlInput, setUrlInput] = useState(match.videoUrl || '');
  const [half, setHalf] = useState(match.halfTimes || {});
  const [form, setForm] = useState(null);
  const [view, setView] = useState('lista');
  const [filterType, setFilterType] = useState('');
  const [filterPlayer, setFilterPlayer] = useState('');
  const [clipBusy, setClipBusy] = useState(null);
  const ai = useAI(summarizeMatch);

  // Jugadores de la alineación primero; si no hay alineación, toda la plantilla
  const lineupIds = new Set(Object.values(match.lineup || {}));
  const eventPlayers = lineupIds.size ? [...players.filter((p) => lineupIds.has(p.id)), ...players.filter((p) => !lineupIds.has(p.id))] : players;

  const filtered = useMemo(
    () => events.filter((e) => (!filterType || e.type === filterType) && (!filterPlayer || e.playerId === filterPlayer)),
    [events, filterType, filterPlayer]
  );

  async function saveHalf(next) {
    setHalf(next);
    if (canEdit) await updateMatch(match.id, { halfTimes: next }).catch(() => {});
  }

  async function captureHalf(key) {
    const t = await playerRef.current?.getCurrentTime();
    saveHalf({ ...half, [key]: formatClock(t) });
  }

  async function startEvent(type) {
    const t = (await playerRef.current?.getCurrentTime()) ?? now;
    setForm({ type, videoTime: Math.round(t * 10) / 10, minute: matchMinute(t, half), note: '', playerId: null, fieldX: null, fieldY: null });
  }

  async function submitEvent(ev) {
    const { id, matchId, createdAt, updatedAt, ...data } = ev;
    try {
      if (id) await updateEvent(match.id, id, data);
      else await addEvent(match.id, data);
      setForm(null);
    } catch {
      /* banner global */
    }
  }

  async function clip(ev) {
    setClipBusy(ev.id);
    try {
      await downloadClip({
        videoUrl: match.videoUrl,
        videoTime: ev.videoTime,
        filename: `${typeOf(ev.type).label.toLowerCase()}_${ev.minute ?? 0}min.mp4`,
      });
    } catch (e) {
      useStore.setState({ error: e.message });
    } finally {
      setClipBusy(null);
    }
  }

  const base = slug(`${match.homeTeam}-${match.awayTeam}-${match.date || ''}`) || 'eventos';
  function exportCSV() {
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [
      ['minuto', 'tiempo_video', 'tipo', 'jugador', 'nota', 'x', 'y'],
      ...events.map((e) => [e.minute, formatClock(e.videoTime), typeOf(e.type).label, e.playerName, e.note, e.fieldX, e.fieldY]),
    ];
    downloadText('﻿' + rows.map((r) => r.map(esc).join(';')).join('\n'), `${base}.csv`, 'text/csv;charset=utf-8');
  }
  function exportJSON() {
    const data = events.map(({ id, type, minute, videoTime, note, playerId, playerName, fieldX, fieldY }) => ({ id, type, minute, videoTime, note, playerId, playerName, fieldX, fieldY }));
    downloadText(JSON.stringify({ match: { id: match.id, homeTeam: match.homeTeam, awayTeam: match.awayTeam, date: match.date, videoUrl: match.videoUrl, halfTimes: half }, events: data }, null, 2), `${base}.json`, 'application/json');
  }

  return (
    <div className="space-y-4">
      <AdminOnly>
        <div className="card flex flex-wrap items-end gap-2 p-4">
          <Field label="Vídeo del partido (YouTube / Vimeo)" className="min-w-[16rem] flex-1">
            <input className="input" type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" />
          </Field>
          <button className="btn-primary" disabled={urlInput === (match.videoUrl || '')} onClick={() => updateMatch(match.id, { videoUrl: urlInput || null }).catch(() => {})}>
            Guardar vídeo
          </button>
        </div>
      </AdminOnly>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-3">
          <VideoPlayer ref={playerRef} url={match.videoUrl} onTime={setNow} />
          <AdminOnly>
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex items-center gap-1 text-sm tabular-nums text-slate-500">
                <ClockIcon className="h-4 w-4" /> {formatClock(now)} · min {matchMinute(now, half)}'
              </span>
              <span className="ml-auto" />
              {EVENT_TYPES.map((t) => (
                <button
                  key={t.id}
                  disabled={!match.videoUrl}
                  onClick={() => startEvent(t.id)}
                  className="btn text-white shadow"
                  style={{ background: t.color }}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </AdminOnly>
        </div>

        <div className="card space-y-3 p-4">
          <h3 className="font-semibold">Tiempos del partido</h3>
          <p className="text-xs text-slate-500">Marca cuándo empieza cada parte en el vídeo para calcular el minuto real de cada evento.</p>
          {HALF_FIELDS.map(([k, label]) => (
            <div key={k} className="flex items-center gap-2">
              <span className="w-20 text-sm">{label}</span>
              <input
                className="input w-24 tabular-nums"
                placeholder="m:ss"
                value={half[k] || ''}
                disabled={!canEdit}
                onChange={(e) => setHalf({ ...half, [k]: e.target.value })}
                onBlur={() => JSON.stringify(half) !== JSON.stringify(match.halfTimes || {}) && saveHalf(half)}
              />
              <AdminOnly>
                <button className="btn-secondary px-2 py-1 text-xs" disabled={!match.videoUrl} onClick={() => captureHalf(k)}>
                  Capturar
                </button>
              </AdminOnly>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Tabs tabs={[{ id: 'lista', label: `Lista (${events.length})` }, { id: 'campo', label: 'Campo' }, { id: 'graficas', label: 'Gráficas' }]} active={view} onChange={setView} className="flex-1" />
        <select className="input w-auto" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Todos los tipos</option>
          {EVENT_TYPES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <select className="input w-auto" value={filterPlayer} onChange={(e) => setFilterPlayer(e.target.value)}>
          <option value="">Todos los jugadores</option>
          {players.filter((p) => events.some((e) => e.playerId === p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button className="btn-secondary" onClick={exportCSV} disabled={!events.length}><ArrowDownTrayIcon className="h-4 w-4" /> CSV</button>
        <button className="btn-secondary" onClick={exportJSON} disabled={!events.length}><ArrowDownTrayIcon className="h-4 w-4" /> JSON</button>
        <button className="btn-secondary text-violet-700 dark:text-violet-300" disabled={ai.loading} onClick={() => ai.run({ match: { ...match, events } })}>
          <SparklesIcon className="h-4 w-4" /> Resumen IA
        </button>
      </div>

      <AIResultCard title="Resumen del partido" {...ai} />

      {view === 'lista' &&
        (filtered.length === 0 ? (
          <Empty>{events.length ? 'Ningún evento coincide con el filtro.' : 'Aún no hay eventos. Reproduce el vídeo y pulsa un botón de evento.'}</Empty>
        ) : (
          <div className="card divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((e) => {
              const t = typeOf(e.type);
              return (
                <div key={e.id} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-10 text-right font-semibold tabular-nums">{e.minute != null ? `${e.minute}'` : '—'}</span>
                  <button
                    className="rounded bg-slate-100 px-2 py-0.5 text-xs tabular-nums text-slate-600 hover:bg-brand hover:text-white dark:bg-slate-800 dark:text-slate-300"
                    onClick={() => playerRef.current?.seekTo(e.videoTime)}
                    title="Ir a este momento"
                  >
                    {formatClock(e.videoTime)}
                  </button>
                  <span className="rounded-full px-2 py-0.5 text-xs font-medium text-white" style={{ background: t.color }}>{t.label}</span>
                  <div className="min-w-0 flex-1 text-sm">
                    {e.playerName && <b className="mr-2">{e.playerName}</b>}
                    <span className="text-slate-600 dark:text-slate-300">{e.note}</span>
                  </div>
                  <button
                    className="btn-ghost p-1.5"
                    title={isDemo ? 'No disponible en modo demo' : 'Descargar clip (±8 s)'}
                    disabled={clipBusy === e.id || isDemo || !match.videoUrl}
                    onClick={() => clip(e)}
                  >
                    <FilmIcon className={clsx('h-4 w-4', clipBusy === e.id && 'animate-pulse')} />
                  </button>
                  <AdminOnly>
                    <button className="btn-ghost p-1.5" onClick={() => setForm(e)} aria-label="Editar"><PencilSquareIcon className="h-4 w-4" /></button>
                    <button className="btn-danger p-1.5" aria-label="Eliminar" onClick={() => confirm('¿Eliminar este evento?') && removeEvent(match.id, e.id).catch(() => {})}>
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </AdminOnly>
                </div>
              );
            })}
          </div>
        ))}

      {view === 'campo' && (
        <div className="card flex flex-col items-center gap-3 p-4 sm:flex-row sm:items-start">
          <Pitch className="max-w-sm">
            {filtered.filter((e) => e.fieldX != null).map((e) => (
              <button
                key={e.id}
                className="absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow hover:scale-150"
                style={{ left: `${e.fieldX}%`, top: `${e.fieldY}%`, background: typeOf(e.type).color }}
                title={`${e.minute ?? ''}' ${typeOf(e.type).label} ${e.playerName || ''} ${e.note || ''}`}
                onClick={() => playerRef.current?.seekTo(e.videoTime)}
              />
            ))}
          </Pitch>
          <div className="space-y-1 text-sm">
            {EVENT_TYPES.map((t) => (
              <div key={t.id} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ background: t.color }} /> {t.label}
              </div>
            ))}
            <p className="pt-2 text-xs text-slate-500">Pulsa un punto para ir a ese momento del vídeo.</p>
          </div>
        </div>
      )}

      {view === 'graficas' && <EventsChart events={filtered} />}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Editar evento' : `Nuevo evento · ${form ? typeOf(form.type).label : ''}`}>
        {form && <EventForm initial={form} players={eventPlayers} onSubmit={submitEvent} onCancel={() => setForm(null)} />}
      </Modal>
    </div>
  );
}
