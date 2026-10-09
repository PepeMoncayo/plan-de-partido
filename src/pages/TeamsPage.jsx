import { useState } from 'react';
import { PlusIcon, PencilSquareIcon, TrashIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useStore } from '../store/useStore';
import { Modal, Field, AdminOnly, Empty } from '../components/ui';
import { StorageImage, ImageUpload } from '../components/media';

function TeamForm({ initial, onSubmit, onCancel }) {
  const [t, setT] = useState(initial);
  const [saving, setSaving] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({ name: t.name.trim(), shieldUrl: t.shieldUrl || null });
    } catch {
      /* banner global */
    } finally {
      setSaving(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <Field label="Nombre">
        <input className="input" required value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} />
      </Field>
      <span className="label">Escudo (máx. 500 KB)</span>
      <ImageUpload
        value={t.shieldUrl}
        onChange={(shieldUrl) => setT({ ...t, shieldUrl })}
        folder="shields"
        maxSize={300}
        maxBytes={500 * 1024}
        className="h-32 w-32"
        label="Escudo"
      />
      <div className="flex justify-end gap-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>Cancelar</button>
        <button className="btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar'}</button>
      </div>
    </form>
  );
}

export function Shield({ src, className = 'h-10 w-10' }) {
  return (
    <StorageImage
      src={src}
      className={`${className} object-contain`}
      fallback={<ShieldCheckIcon className={`${className} text-slate-300 dark:text-slate-600`} />}
    />
  );
}

export default function TeamsPage() {
  const { teams, addTeam, updateTeam, removeTeam } = useStore();
  const [form, setForm] = useState(null);

  async function onSubmit(data) {
    if (form.id) await updateTeam(form.id, data);
    else await addTeam(data);
    setForm(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold">Equipos</h1>
        <AdminOnly>
          <button className="btn-primary ml-auto" onClick={() => setForm({ name: '', shieldUrl: '' })}>
            <PlusIcon className="h-4 w-4" /> Equipo
          </button>
        </AdminOnly>
      </div>

      {teams.length === 0 && <Empty>No hay equipos todavía.</Empty>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((t) => (
          <div key={t.id} className="card flex items-center gap-3 p-4">
            <Shield src={t.shieldUrl} className="h-12 w-12" />
            <span className="flex-1 font-medium">{t.name}</span>
            <AdminOnly>
              <button className="btn-ghost p-1.5" onClick={() => setForm(t)} aria-label="Editar">
                <PencilSquareIcon className="h-4 w-4" />
              </button>
              <button
                className="btn-danger p-1.5"
                aria-label="Eliminar"
                onClick={() => confirm(`¿Eliminar ${t.name}?`) && removeTeam(t.id).catch(() => {})}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </AdminOnly>
          </div>
        ))}
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? 'Editar equipo' : 'Nuevo equipo'}>
        {form && <TeamForm initial={form} onSubmit={onSubmit} onCancel={() => setForm(null)} />}
      </Modal>
    </div>
  );
}
