import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, PencilSquareIcon, TrashIcon, CalendarIcon, MapPinIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useStore } from '../store/useStore';
import { MATCH_STATUSES, emptyAbp } from '../data/constants';
import { Modal, Field, AdminOnly, Empty } from '../components/ui';
import { ImageUpload } from '../components/media';
import { Shield } from './TeamsPage';
import { formatDate } from '../utils/time';

const STATUS_STYLE = {
  Planificado: 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  Jugado: 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300',
  Aplazado: 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

function TeamPicker({ side, match, setMatch, teams }) {
  const idKey = `${side}TeamId`;
  const nameKey = `${side}Team`;
  const shieldKey = `${side}ShieldUrl`;
  return (
    <div className="space-y-2">
      <Field label={side === 'home' ? 'Local' : 'Visitante'}>
        {teams.length > 0 && (
          <select
            className="input mb-2"
            value={match[idKey] || ''}
            onChange={(e) => {
              const t = teams.find((x) => x.id === e.target.value);
              setMatch({ ...match, [idKey]: t?.id || null, [nameKey]: t?.name || '', [shieldKey]: t?.shieldUrl || '' });
            }}
          >
            <option value="">— Escribir a mano —</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
        <input
          className="input"
          required
          value={match[nameKey] || ''}
          disabled={!!match[idKey]}
          onChange={(e) => setMatch({ ...match, [nameKey]: e.target.value })}
          placeholder="Nombre del equipo"
        />
      </Field>
      <ImageUpload
        value={match[shieldKey]}
        onChange={(v) => setMatch({ ...match, [shieldKey]: v })}
        folder="shields"
        maxSize={300}
        maxBytes={500 * 1024}
        className="h-24 w-24"
        label="Escudo"
      />
    </div>
  );
}

function MatchForm({ initial, onSubmit, onCancel }) {
  const teams = useStore((s) => s.teams);
  const [m, setM] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setM({ ...m, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        homeTeamId: m.homeTeamId || null,
        awayTeamId: m.awayTeamId || null,
        homeTeam: m.homeTeam.trim(),
        awayTeam: m.awayTeam.trim(),
        homeShieldUrl: m.homeShieldUrl || null,
        awayShieldUrl: m.awayShieldUrl || null,
        opponent: m.opponent?.trim() || m.awayTeam.trim(),
        date: m.date || null,
        competition: m.competition || 'Amistoso',
        venue: m.venue || null,
        status: m.status,
        score: m.score || null,
      });
    } catch {
      /* banner global */
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TeamPicker side="home" match={m} setMatch={setM} teams={teams} />
        <TeamPicker side="away" match={m} setMatch={setM} teams={teams} />
      </div>
      <Field label="Rival (para informes)">
        <select className="input" value={m.opponent || ''} onChange={set('opponent')}>
          <option value="">Visitante (por defecto)</option>
          {m.homeTeam && <option value={m.homeTeam}>{m.homeTeam}</option>}
          {m.awayTeam && <option value={m.awayTeam}>{m.awayTeam}</option>}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha"><input className="input" type="date" value={m.date || ''} onChange={set('date')} /></Field>
        <Field label="Competición"><input className="input" value={m.competition || ''} onChange={set('competition')} /></Field>
        <Field label="Campo"><input className="input" value={m.venue || ''} onChange={set('venue')} /></Field>
        <Field label="Estado">
          <select className="input" value={m.status} onChange={set('status')}>
            {MATCH_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Resultado"><input className="input" value={m.score || ''} onChange={set('score')} placeholder="2-1" /></Field>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </form>
  );
}

export function MatchHeader({ match, size = 'sm' }) {
  const big = size === 'lg';
  return (
    <div className="flex items-center justify-center gap-3">
      <div className="flex flex-1 items-center justify-end gap-2 text-right">
        <span className={clsx('font-semibold', big && 'text-xl')}>{match.homeTeam}</span>
        <Shield src={match.homeShieldUrl} className={big ? 'h-14 w-14' : 'h-9 w-9'} />
      </div>
      <span className={clsx('min-w-[3rem] text-center font-bold tabular-nums', big ? 'text-2xl' : 'text-lg')}>
        {match.score || 'vs'}
      </span>
      <div className="flex flex-1 items-center gap-2">
        <Shield src={match.awayShieldUrl} className={big ? 'h-14 w-14' : 'h-9 w-9'} />
        <span className={clsx('font-semibold', big && 'text-xl')}>{match.awayTeam}</span>
      </div>
    </div>
  );
}

const blankMatch = {
  homeTeamId: null, awayTeamId: null, homeTeam: '', awayTeam: '', homeShieldUrl: '', awayShieldUrl: '',
  opponent: '', date: '', competition: 'Amistoso', venue: '', status: 'Planificado', score: '',
};

export default function MatchesPage() {
  const { matches, addMatch, updateMatch, removeMatch } = useStore();
  const [form, setForm] = useState(null);

  async function onSubmit(data) {
    if (form.id) await updateMatch(form.id, data);
    else await addMatch({ ...data, abpData: emptyAbp() });
    setForm(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Partidos</h1>
        <AdminOnly>
          <button className="btn-primary ml-auto" onClick={() => setForm({ ...blankMatch })}>
            <PlusIcon className="h-4 w-4" /> Partido
          </button>
        </AdminOnly>
      </div>

      {matches.length === 0 && <Empty>No hay partidos todavía.</Empty>}

      <div className="grid gap-3 md:grid-cols-2">
        {matches.map((m) => (
          <div key={m.id} className="card p-4">
            <div className="mb-3 flex items-center gap-2 text-xs text-slate-500">
              <span className="font-medium uppercase">{m.competition}</span>
              <span className={clsx('rounded-full px-2 py-0.5', STATUS_STYLE[m.status])}>{m.status}</span>
              <AdminOnly>
                <span className="ml-auto flex gap-1">
                  <button className="btn-ghost p-1" onClick={() => setForm(m)} aria-label="Editar">
                    <PencilSquareIcon className="h-4 w-4" />
                  </button>
                  <button
                    className="btn-danger p-1"
                    aria-label="Eliminar"
                    onClick={() => confirm(`¿Eliminar el partido ${m.homeTeam} - ${m.awayTeam}?`) && removeMatch(m.id).catch(() => {})}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </span>
              </AdminOnly>
            </div>
            <MatchHeader match={m} />
            <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1"><CalendarIcon className="h-4 w-4" />{formatDate(m.date) || 'Sin fecha'}</span>
              {m.venue && <span className="flex items-center gap-1"><MapPinIcon className="h-4 w-4" />{m.venue}</span>}
              <Link to={`/matches/${m.id}`} className="btn-secondary ml-auto px-3 py-1 text-xs">Abrir</Link>
            </div>
          </div>
        ))}
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Editar partido' : 'Nuevo partido'} wide>
        {form && <MatchForm initial={form} onSubmit={onSubmit} onCancel={() => setForm(null)} />}
      </Modal>
    </div>
  );
}
